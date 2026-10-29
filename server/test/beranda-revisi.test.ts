import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';
import { beranda } from '../src/services/beranda-service.ts';
import type { BarisUkurBeranda } from '../src/repositories/beranda-repository.ts';

const pengguna={id:1,peran:'admin' as const,rt:null,aktif:true,superAdmin:false,posyanduIds:[1]};
test('filter RT menyaring KPI N/T, tiga distribusi, perhatian, dan semua bulan tren', async () => {
    const source:BarisUkurBeranda[]=[
        {anakId:1,periodeId:'2026-09',nama:'UJI 1',tglLahir:'2025-01-01',rt:'01',tanggalUkur:'2026-09-12',statusKehadiran:'hadir',ntob:'T',
            bbTb:{z:-1,kategori:'Gizi baik'},bbU:{z:-2.5,kategori:'Berat badan kurang'},tbU:{z:-3.2,kategori:'Sangat pendek'}},
        {anakId:2,periodeId:'2026-09',nama:'UJI 2',tglLahir:'2025-01-01',rt:'02',tanggalUkur:'2026-09-12',statusKehadiran:'hadir',ntob:'N',
            bbTb:{z:0,kategori:'Gizi baik'},bbU:{z:0,kategori:'Berat badan normal'},tbU:{z:0,kategori:'Normal'}},
    ];
    const pool={query:async(sql:string,params:unknown[])=>{
        assert(params.includes(false),'otorisasi tidak boleh hilang');
        if(sql.includes('LEFT JOIN cakupan_hari_h'))return{rows:[]};
        if(sql.includes('SELECT DISTINCT rt'))return{rows:[{rt:'01'},{rt:'02'},{rt:'03'}]};
        if(sql.includes('AS "adaPengukuran"'))return{rows:[{id:'2026-09',tanggalKegiatan:'2026-09-12',adaPengukuran:true}]};
        if(sql.includes('AS jumlah')){assert.equal(params[4],'01');return{rows:[{periodeId:'2026-09',jumlah:1}]};}
        return{rows:source};
    }} as unknown as Pool;
    const hasil=(await beranda(pool,pengguna,'2026-09','01'))!;
    assert.deepEqual(hasil.ringkasan,{sasaran:1,ditimbang:1,naik:0,tidakNaik:1,tanggalUkur:'2026-09-12'});
    assert.equal(hasil.statusGizi.giziBaik,1);
    assert.equal(hasil.statusBbU.find(p=>p.label==='BB Kurang')!.jumlah,1);
    assert.equal(hasil.statusTbU.find(p=>p.label==='Pendek')!.jumlah,1);
    assert.equal(hasil.trenGizi.at(-1)!.bbKurang,1);
    assert.equal(hasil.trenGizi.at(-1)!.pendek,1);
    assert.equal(hasil.perluPerhatian.length,1);
    assert.deepEqual(hasil.wilayahRt,['01','02','03']);
});
