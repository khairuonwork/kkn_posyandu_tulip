import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { buatApp } from '../src/http/app.ts';
import { bacaHeartbeat, daftarPerangkat, statusPerangkat } from '../src/services/perangkat-service.ts';

test('laporan perangkat menolak identitas/angka rusak dan menerima klien Android lama', () => {
    assert.equal(bacaHeartbeat(null), null);
    assert.equal(bacaHeartbeat({deviceId:'x'}), null);
    assert.equal(bacaHeartbeat({deviceId:'uji-123',baterai:101}), null);
    assert.equal(bacaHeartbeat({deviceId:'uji-123',antreanTertunda:-1}), null);
    assert.equal(bacaHeartbeat({deviceId:'uji-123',jenisPerangkat:'rw-lain'}), null);
    assert.equal(bacaHeartbeat({deviceId:'uji-123'})?.jenisPerangkat, 'android');
});
test('status melewati online, siaga dan offline tanpa menghapus catatan', () => {
    const awal = Date.parse('2026-10-21T00:00:00Z');
    assert.equal(statusPerangkat(new Date(awal).toISOString(), true, awal+45000).status, 'online');
    assert.equal(statusPerangkat(new Date(awal).toISOString(), true, awal+46000).status, 'idle');
    assert.equal(statusPerangkat(new Date(awal).toISOString(), true, awal+121000).status, 'offline');
    assert.equal(statusPerangkat(new Date(awal).toISOString(), false, awal).status, 'offline');
});

describe('status perangkat HTTP dan isolasi Posyandu', {skip:!process.env.DATABASE_URL}, () => {
    const skema = 'uji_perangkat_' + randomUUID().replaceAll('-','');
    let induk: pg.Pool, pool: pg.Pool, server: Server, akar: string;
    let posA: number, posB: number, kaderA: {id:number;token:string}, kaderB: {id:number;token:string};
    let adminA: {id:number;token:string}, superAdmin: {id:number;token:string};
    const jalankan = async () => {
        server = buatApp(pool).listen(0,'127.0.0.1');
        await new Promise<void>(r => server.once('listening',r));
        const addr=server.address(); assert.ok(addr&&typeof addr==='object');
        akar='http://127.0.0.1:'+addr.port;
    };
    const tutup = () => new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));
    before(async () => {
        induk = new pg.Pool({connectionString:process.env.DATABASE_URL});
        await induk.query(`CREATE SCHEMA ${skema}`);
        pool = new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${skema}`});
        const folder=new URL('../db/migrations/',import.meta.url);
        for(const nama of readdirSync(folder).filter(n=>n.endsWith('.sql')).sort()) {
            await pool.query(readFileSync(new URL(nama,folder),'utf8'));
        }
        posA=Number((await pool.query(`INSERT INTO posyandu(nama,slug,rw) VALUES('Posyandu Uji A','uji-a','18') RETURNING id`)).rows[0].id);
        posB=Number((await pool.query(`INSERT INTO posyandu(nama,slug,rw) VALUES('Posyandu Uji B','uji-b','19') RETURNING id`)).rows[0].id);
        async function akun(username:string,peran:string,pos:number|null,global=false) {
            const rt=pos===null?null:(await pool.query(`INSERT INTO wilayah_rt(posyandu_id,rt,rw) VALUES($1,$2,$3) ON CONFLICT(posyandu_id,rt,rw) DO UPDATE SET rt=EXCLUDED.rt RETURNING id`,[pos,'01',pos===posA?'18':'19'])).rows[0].id;
            const id=Number((await pool.query(`INSERT INTO pengguna(nama,username,kata_sandi_hash,peran,wilayah_rt_id,super_admin) VALUES($1,$1,'fixture-tidak-dipakai',$2,$3,$4) RETURNING id`,[username,peran,peran==='kader'?rt:null,global])).rows[0].id);
            if(pos!==null)await pool.query('INSERT INTO pengguna_posyandu(pengguna_id,posyandu_id) VALUES($1,$2)',[id,pos]);
            const token=randomUUID();
            await pool.query(`INSERT INTO sesi(ringkasan,pengguna_id,kedaluwarsa) VALUES($1,$2,now()+interval '1 hour')`,[createHash('sha256').update(token).digest('hex'),id]);
            return{id,token};
        }
        kaderA=await akun('uji.kader-a','kader',posA);
        kaderB=await akun('uji.kader-b','kader',posB);
        adminA=await akun('uji.admin-a','admin',posA);
        superAdmin=await akun('uji.global','admin',null,true);
        await jalankan();
    });
    after(async () => {
        if(server)await tutup();
        await pool?.end();
        if(induk){
            assert.match(skema,/^uji_perangkat_[a-f0-9]{32}$/);
            await induk.query(`DROP SCHEMA ${skema} CASCADE`);
            await induk.end();
        }
    });
    const kirim=(akun:{token:string},body:unknown)=>fetch(akar+'/api/v1/heartbeat',{method:'POST',headers:{Authorization:'Bearer '+akun.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const baca=async(akun:{token:string},query='')=>{
        const r=await fetch(akar+'/api/v1/perangkat-terhubung'+query,{headers:{Authorization:'Bearer '+akun.token}});
        assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
        return await r.json() as Awaited<ReturnType<typeof daftarPerangkat>>;
    };
    test('tanpa sesi, laporan dan daftar tidak dapat diakses',async()=>{
        assert.equal((await fetch(akar+'/api/v1/perangkat-terhubung')).status,401);
        assert.equal((await fetch(akar+'/api/v1/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
    });
    test('RW berasal dari sesi; klaim RW dan pengguna lain pada badan diabaikan',async()=>{
        const r=await kirim(kaderA,{deviceId:'tablet-yang-sama',namaPerangkat:'Android A',posyanduId:posB,penggunaId:kaderB.id,superAdmin:true});
        assert.equal(r.status,200);
        const rows=(await baca(kaderA)).daftarTablet;
        assert.equal(rows.length,1);assert.equal(rows[0].posyanduId,posA);assert.equal(rows[0].penggunaId,kaderA.id);
    });
    test('dua RW memakai ID klien sama tetap terpisah; admin biasa tidak lintas RW',async()=>{
        assert.equal((await kirim(kaderB,{deviceId:'tablet-yang-sama',namaPerangkat:'Android B'})).status,200);
        const a=await baca(adminA,'?superAdmin=true&posyanduId='+posB);
        assert.equal(a.daftarTablet.length,1);assert.equal(a.daftarTablet[0].namaPerangkat,'Android A');
        assert.equal(a.cakupan.semuaPosyandu,false);
        const b=await baca(kaderB);assert.equal(b.daftarTablet.length,1);assert.equal(b.daftarTablet[0].namaPerangkat,'Android B');
        const semua=await baca(superAdmin);assert.equal(semua.daftarTablet.length,2);assert.equal(semua.cakupan.semuaPosyandu,true);
    });
    test('heartbeat berulang memperbarui satu catatan dan mengembalikan perangkat offline menjadi online',async()=>{
        await pool.query(`UPDATE perangkat_posyandu SET terakhir_aktif=now()-interval '3 minutes' WHERE pengguna_id=$1`,[kaderA.id]);
        const offline=await baca(kaderA);assert.equal(offline.daftarTablet[0].status,'offline');
        assert.equal((await kirim(kaderA,{deviceId:'tablet-yang-sama',namaPerangkat:'Android A',antreanTertunda:3,modeKoneksi:'online'})).status,200);
        const aktif=await baca(kaderA);assert.equal(aktif.daftarTablet.length,1);assert.equal(aktif.daftarTablet[0].status,'online');assert.equal(aktif.daftarTablet[0].antreanTertunda,3);
    });
    test('catatan offline bertahan setelah aplikasi server dibuat ulang',async()=>{
        await pool.query(`UPDATE perangkat_posyandu SET terakhir_aktif=now()-interval '3 minutes' WHERE pengguna_id=$1`,[kaderB.id]);
        await tutup();await jalankan();
        const b=await baca(kaderB);assert.equal(b.daftarTablet.length,1);assert.equal(b.daftarTablet[0].status,'offline');
    });
    test('perangkat superadmin tanpa RW hanya terlihat pada cakupan global',async()=>{
        assert.equal((await kirim(superAdmin,{deviceId:'web-uji-global',namaPerangkat:'Browser Uji',jenisPerangkat:'web'})).status,200);
        const semua=await baca(superAdmin);assert.equal(semua.daftarTablet.length,3);
        const global=semua.daftarTablet.find(p=>p.deviceId==='web-uji-global');
        assert.ok(global);assert.equal(global.posyanduId,null);
        assert.equal((await baca(kaderA)).daftarTablet.length,1);
    });
});
