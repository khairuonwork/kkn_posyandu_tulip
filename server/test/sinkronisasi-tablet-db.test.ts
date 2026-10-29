import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { Server } from 'node:http';
import { buatApp } from '../src/http/app.ts';
import { simpanPengukuran, sinkronisasi } from '../src/services/anak-service.ts';
import { payloadUji, siapkanSinkronisasiDb } from './helpers/sinkronisasi-db.ts';

describe('sinkronisasi APK lama pada PostgreSQL lokal terisolasi', {skip:!process.env.TEST_DATABASE_URL}, () => {
    let db: Awaited<ReturnType<typeof siapkanSinkronisasiDb>>;
    let server: Server;
    let akar: string;
    before(async () => {
        db = await siapkanSinkronisasiDb();
        server = buatApp(db.pool).listen(0, '127.0.0.1');
        await new Promise<void>(resolve => server.once('listening', resolve));
        const alamat = server.address();
        assert.ok(alamat && typeof alamat !== 'string');
        akar = `http://127.0.0.1:${alamat.port}/api/v1`;
    });
    after(async () => {
        if (server) await new Promise<void>((resolve, reject) => server.close(e=>e?reject(e):resolve()));
        await db?.tutup();
    });
    const audit = async () => Number((await db.pool.query('SELECT count(*) AS n FROM audit')).rows[0].n);

    test('lima pengirim serentak menyimpan satu pengukuran; pengiriman ulang tidak menulis audit atau hasil gizi', async () => {
        const g = db.grup[0];
        const payload = payloadUji(g.anak[0]);
        const hasil = await Promise.all(Array.from({length:5},()=>simpanPengukuran(db.pool,g.pengguna,payload)));
        assert.equal(new Set(hasil.map(h=>h.id)).size,1);
        const id = hasil[0].id;
        const sebelum = (await db.pool.query('SELECT * FROM pengukuran WHERE id=$1',[id])).rows[0];
        const gizi = (await db.pool.query('SELECT * FROM penilaian_gizi WHERE pengukuran_id=$1 ORDER BY indeks',[id])).rows;
        assert.ok(gizi.length > 0);
        const jumlahAudit = await audit();
        const kirimUlang = await fetch(akar+'/pengukuran', {method:'POST',headers:{Authorization:`Bearer ${g.token}`,'Content-Type':'application/json'},body:JSON.stringify({...payload,bb_kg:12})});
        assert.equal(kirimUlang.status,201);
        assert.deepEqual(await kirimUlang.json(),{pengukuran:hasil[0]});
        assert.equal(await audit(),jumlahAudit);
        assert.deepEqual((await db.pool.query('SELECT * FROM pengukuran WHERE id=$1',[id])).rows[0],sebelum);
        assert.deepEqual((await db.pool.query('SELECT * FROM penilaian_gizi WHERE pengukuran_id=$1 ORDER BY indeks',[id])).rows,gizi);
    });
    test('koreksi dengan ID sama tetap disimpan; kegagalan penilaian membatalkan seluruh koreksi', async () => {
        const g=db.grup[0], payload=payloadUji(g.anak[0]);
        const hasil=await simpanPengukuran(db.pool,g.pengguna,{...payload,bb_kg:13});
        assert.equal((await db.pool.query('SELECT bb_kg FROM pengukuran WHERE id=$1',[hasil.id])).rows[0].bb_kg,13);
        const jumlahAudit=await audit();
        await db.pool.query("CREATE FUNCTION tolak_gizi_uji() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'gizi uji gagal'; END $$");
        await db.pool.query('CREATE TRIGGER tolak_gizi_uji BEFORE INSERT OR UPDATE ON penilaian_gizi FOR EACH ROW EXECUTE FUNCTION tolak_gizi_uji()');
        try { await assert.rejects(simpanPengukuran(db.pool,g.pengguna,{...payload,bb_kg:14}),/gizi uji gagal/); }
        finally { await db.pool.query('DROP TRIGGER tolak_gizi_uji ON penilaian_gizi'); }
        assert.equal((await db.pool.query('SELECT bb_kg FROM pengukuran WHERE id=$1',[hasil.id])).rows[0].bb_kg,13);
        assert.equal(await audit(),jumlahAudit);
    });
    test('cakupan Posyandu tidak bisa dilewati melalui ID anak atau ID pengukuran', async () => {
        const a=db.grup[0], b=db.grup[1];
        await assert.rejects(simpanPengukuran(db.pool,b.pengguna,payloadUji(a.anak[0])),{status:404});
        await assert.rejects(simpanPengukuran(db.pool,b.pengguna,payloadUji(b.anak[0],`ukur-uji-${a.anak[0]}`)),{status:400});
        const paket=await sinkronisasi(db.pool,b.pengguna);
        assert.ok(paket.masterAnak.every(r=>b.anak.includes(r.id_anak)));
        assert.equal(paket.masterAnak.length,5);
    });
    test('relai dengan ID berbeda tidak membuat catatan ganda; pengosongan nilai membersihkan gizi versi aktif saja', async () => {
        const g=db.grup[1];
        const payload=payloadUji(g.anak[1]);
        const pertama=await simpanPengukuran(db.pool,g.pengguna,payload);
        const n=await audit();
        const relai=await simpanPengukuran(db.pool,g.pengguna,{...payload,id_pengukuran:'id-relai-lain'});
        assert.equal(relai.id,pertama.id);
        assert.equal(await audit(),n);
        await db.pool.query("INSERT INTO penilaian_gizi(pengukuran_id,standar_versi,indeks,dihitung_pada) VALUES($1,'versi-arsip','BB_U',now())",[pertama.id]);
        await simpanPengukuran(db.pool,g.pengguna,{...payload,bb_kg:null,panjang_tinggi_cm:null,lila:null,lika:null,status_kehadiran:'Tidak Hadir'});
        const gizi=(await db.pool.query('SELECT standar_versi FROM penilaian_gizi WHERE pengukuran_id=$1',[pertama.id])).rows;
        assert.deepEqual(gizi,[{standar_versi:'versi-arsip'}]);
    });
    test('anak berbeda bisa membuat periode yang sama secara bersamaan', async () => {
        const g=db.grup[2];
        await Promise.all(g.anak.map(id=>simpanPengukuran(db.pool,g.pengguna,{...payloadUji(id),tanggal_ukur:'2026-09-10'})));
        assert.equal((await db.pool.query('SELECT count(*)::int AS n FROM periode WHERE posyandu_id=$1 AND bulan=9 AND tahun=2026',[g.pengguna.posyanduIds![0]])).rows[0].n,1);
    });
    test('pengukuran susulan tetap tidak hadir pada sasaran dan konfirmasinya stabil saat dikirim ulang', async () => {
        const g=db.grup[3];
        await db.pool.query('UPDATE periode SET sesi_ditutup_pada=now() WHERE id=$1',[g.periodeId]);
        await db.pool.query("UPDATE sasaran SET status='tidak_hadir' WHERE periode_id=$1",[g.periodeId]);
        const hasil=await simpanPengukuran(db.pool,g.pengguna,payloadUji(g.anak[0]));
        assert.equal(hasil.susulan,true);
        const n=await audit();
        assert.deepEqual(await simpanPengukuran(db.pool,g.pengguna,payloadUji(g.anak[0])),hasil);
        assert.equal(await audit(),n);
        assert.equal((await db.pool.query('SELECT status FROM sasaran WHERE periode_id=$1 AND anak_id=$2',[g.periodeId,g.anak[0]])).rows[0].status,'tidak_hadir');
    });
});
