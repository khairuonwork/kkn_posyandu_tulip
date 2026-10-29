import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';
import { jumlahHariH, ubahHariH } from '../src/services/cakupan-hari-h.ts';
import type { BarisHariH } from '../src/repositories/beranda-repository.ts';

const user={id:1,peran:'bidan' as const,aktif:true,rt:null,posyanduIds:[1]};
const rows:BarisHariH[]=[
    {periodeId:'2026-10',periodeDbId:10,wilayahRtId:1,rt:'01',posyandu:'Tulip',tanggalHariH:'2026-10-10',hadirHariH:30,sumber:'manual',sasaran:60},
    {periodeId:'2026-10',periodeDbId:10,wilayahRtId:2,rt:'02',posyandu:'Tulip',tanggalHariH:'2026-10-10',hadirHariH:15,sumber:'antrean',sasaran:31},
];
function poolFor(data=rows) {
    const calls:{sql:string;values:unknown[]}[]=[];
    const client={query:async(sql:string,values:unknown[]=[])=>{calls.push({sql,values});return{rows:[]};},release:()=>{}};
    return {calls,pool:{query:async()=>({rows:data}),connect:async()=>client} as unknown as Pool};
}

test('Real D/S 45/91 menjumlahkan hadir hari H, mendukung filter RT, tidak memakai D setelah sweeping',()=>{
    assert.equal(jumlahHariH(rows,null),45);
    assert.equal(jumlahHariH(rows,'02'),15);
    assert.equal(rows.reduce((n,r)=>n+r.sasaran,0),91);
    assert.equal(jumlahHariH(rows,'03'),null);
});
test('nol terkonfirmasi berbeda dari data tidak tersedia atau belum lengkap',()=>{
    assert.equal(jumlahHariH(rows.map(r=>({...r,hadirHariH:0})),null),0);
    assert.equal(jumlahHariH([rows[0],{...rows[1],hadirHariH:null}],null),null);
    assert.equal(jumlahHariH([],null),null);
});
test('rekap per RT disimpan dengan tanggal hari H asli, dan kosong menghapus override tanpa mengubah pengukuran',async()=>{
    const {pool,calls}=poolFor();
    await ubahHariH(pool,user,{periode:'2026-10',items:[{periodeDbId:10,wilayahRtId:1,tanggalHariH:'2026-10-10',hadirHariH:0},{periodeDbId:10,wilayahRtId:2,tanggalHariH:null,hadirHariH:null}]});
    const insert=calls.find(r=>r.sql.includes('INSERT INTO cakupan_hari_h'))!;
    assert.deepEqual(insert.values,[10,1,false,[1],'2026-10-10',0,1]);
    assert(calls.some(r=>r.sql.includes('DELETE FROM cakupan_hari_h')));
    assert(calls.some(r=>r.sql==='COMMIT'));
    assert(!calls.some(r=>/UPDATE pengukuran|INSERT INTO pengukuran/.test(r.sql)));
});
test('menolak kader, RT di luar wilayah, tanggal berbeda periode, jumlah pecahan/negatif, dan RT duplikat sebelum transaksi',async()=>{
    const body={periode:'2026-10',items:[{periodeDbId:10,wilayahRtId:1,tanggalHariH:'2026-10-10',hadirHariH:45}]};
    const {pool,calls}=poolFor();
    await assert.rejects(ubahHariH(pool,{...user,peran:'kader'},body),/Hanya Bidan atau Admin/);
    for(const patch of [{wilayahRtId:99},{tanggalHariH:'2026-11-10'},{tanggalHariH:'2026-10-32'},{hadirHariH:-1},{hadirHariH:1.5},{hadirHariH:'45'}])
        await assert.rejects(ubahHariH(pool,user,{...body,items:[{...body.items[0],...patch}]}));
    await assert.rejects(ubahHariH(pool,user,{...body,items:[body.items[0],body.items[0]]}),/berulang/);
    await assert.rejects(ubahHariH(pool,user,{...body,items:[body.items[0],{...body.items[0],wilayahRtId:2,tanggalHariH:'2026-10-11'}]}),/Tanggal hari H harus sama/);
    assert.equal(calls.length,0);
});
