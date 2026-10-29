/** Uji HTTP sintetis; hanya berjalan dengan TEST_DATABASE_URL lokal khusus uji. */
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { buatApp } from '../src/http/app.ts';
import { payloadUji, siapkanSinkronisasiDb } from './helpers/sinkronisasi-db.ts';

if (!process.env.TEST_DATABASE_URL) throw new Error('Atur TEST_DATABASE_URL ke database lokal simpatik_sync_test.');
const laporan = [];
for (const max of [1,3,5]) {
    const db = await siapkanSinkronisasiDb(max);
    const server = buatApp(db.pool).listen(0,'127.0.0.1');
    await new Promise<void>(resolve=>server.once('listening',resolve));
    const alamat = server.address();
    assert.ok(alamat && typeof alamat !== 'string');
    const akar = `http://127.0.0.1:${alamat.port}/api/v1`;
    try {
        let skenario = 0;
        for (const jumlah of [5,15,30,50]) {
            skenario++;
            const peserta=Array.from({length:jumlah},(_,i)=>({g:db.grup[Math.floor(i/5)],anakIndex:i%5}));
            const waktu: number[]=[];
            let gagal=0;
            const panggil=async (path:string,token:string,payload?:unknown) => {
                const mulai=performance.now();
                try {
                    const respons=await fetch(akar+path,{method:payload?'POST':'GET',headers:{Authorization:`Bearer ${token}`,...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
                    const badan=await respons.json() as {pengukuran?:{id:number}};
                    assert.equal(respons.status,payload?201:200,JSON.stringify(badan));
                    if(payload) assert.ok(badan.pengukuran?.id);
                } catch (galat) { gagal++; console.error(String(galat)); }
                waktu.push(performance.now()-mulai);
            };
            const nilai = (anak:number) => ({...payloadUji(anak),bb_kg:12+skenario/10});
            const mulai=performance.now();
            // Pengiriman baru, lalu relai kiriman anak pertama oleh lima perangkat dalam grup.
            await Promise.all(peserta.map(p=>panggil('/pengukuran',p.g.token,nilai(p.g.anak[p.anakIndex]))));
            const auditSebelum=Number((await db.pool.query('SELECT count(*) AS n FROM audit')).rows[0].n);
            await Promise.all(peserta.map(p=>panggil('/pengukuran',p.g.token,nilai(p.g.anak[0]))));
            const auditSesudah=Number((await db.pool.query('SELECT count(*) AS n FROM audit')).rows[0].n);
            assert.equal(auditSesudah,auditSebelum,'Relai identik tidak boleh menambah audit');
            await Promise.all(peserta.map(async p=>{
                await panggil('/kesehatan',p.g.token);
                await panggil('/sinkronisasi',p.g.token);
                await panggil(`/antrean?periodeId=${p.g.periodeId}&tanggal=2026-10-10`,p.g.token);
            }));
            waktu.sort((a,b)=>a-b);
            assert.equal(gagal,0);
            laporan.push({pool:max,perangkat:jumlah,kelompok:jumlah/5,permintaan:waktu.length,error:gagal,
                durasiMs:Math.round(performance.now()-mulai),p50Ms:Math.round(waktu[Math.floor(waktu.length*.5)]),
                p95Ms:Math.round(waktu[Math.ceil(waktu.length*.95)-1]),auditRelai:auditSesudah-auditSebelum});
            console.log(JSON.stringify(laporan.at(-1)));
        }
        const rencana=await db.pool.query(`EXPLAIN (FORMAT JSON) SELECT id FROM periode
            WHERE posyandu_id=$1 AND bulan=10 AND tahun=2026`,[db.grup[0].pengguna.posyanduIds![0]]);
        console.log('RENCANA_PERIODE',JSON.stringify(rencana.rows));
    } finally {
        await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
        await db.tutup();
    }
}
console.log('HASIL_BEBAN',JSON.stringify(laporan));
