import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';
import { beranda, sebaranLaporan } from '../src/services/beranda-service.ts';
import type { BarisBertanda } from '../src/services/laporan-perhitungan.ts';

const pengguna={id:1,peran:'admin' as const,rt:null,aktif:true,superAdmin:false,posyanduIds:[1]};
const ukur=(anakId:number,periodeId:string,rt:string,bbKg:number,statusSasaran:string|null)=>({
    anakId,periodeId,nama:`UJI ${anakId}`,tglLahir:'2025-01-01',rt,tanggalUkur:`${periodeId}-12`,statusKehadiran:'hadir',
    jk:'L',nik:null,namaOrtu:null,umurHari:600,bbKg,tinggiCm:null,lilaCm:null,likaCm:null,ntobRaw:null,jenisUkur:null,
    statusSasaran,penilaian:{},
});

test('Beranda memakai hitungan laporan, aturan sasaran F1, filter RT, dan tanda perlu dicek', async () => {
    // LMS sederhana: z = (BB/10 - 1) / 0,1.
    const lms=Array.from({length:61},(_,kunci)=>({indeks:'BB_U',jk:'L',kunci,l:1,m:10,s:0.1}));
    const pool={query:async(sql:string,params:unknown[])=>{
        if(sql.includes('FROM standar_lms')) return {rows:lms};
        assert(params.includes(false),'otorisasi tidak boleh hilang');
        if(sql.includes('FROM riwayat_2t_arsip')) return {rows:[]};
        if(sql.includes('AS "ntobRaw"')) return {rows:[
            ukur(1,'2026-08','01',10,'selesai'),
            ukur(1,'2026-09','01',7.4,'selesai'),  // BB kurang, turun: T
            ukur(2,'2026-09','02',10,'selesai'),   // RT lain
            ukur(3,'2026-09','01',10,null),        // tidak ada di daftar sasaran
            ukur(4,'2026-09','01',3,'menunggu'),   // z -7: tidak wajar, tetap dihitung
        ]};
        if(sql.includes('LEFT JOIN cakupan_hari_h'))return{rows:[]};
        if(sql.includes('SELECT DISTINCT rt'))return{rows:[{rt:'01'},{rt:'02'},{rt:'03'}]};
        if(sql.includes('AS "adaPengukuran"'))return{rows:[{id:'2026-09',tanggalKegiatan:'2026-09-12',adaPengukuran:true}]};
        if(sql.includes('AS jumlah')){assert.equal(params[4],'01');return{rows:[{periodeId:'2026-08',jumlah:1},{periodeId:'2026-09',jumlah:2}]};}
        return{rows:[]};
    }} as unknown as Pool;
    const hasil=(await beranda(pool,pengguna,'2026-09','01'))!;
    assert.deepEqual(hasil.ringkasan,{sasaran:2,ditimbang:2,naik:0,tidakNaik:1,tanggalUkur:'2026-09-12'});
    assert.deepEqual(hasil.diLuarHitungan,[{anakId:3,nama:'UJI 3',rt:'01',alasan:'Tidak ada di daftar sasaran'}]);
    assert.deepEqual(hasil.perluDicek,[{anakId:4,nama:'UJI 4',rt:'01',indeks:['BB/U']}]);
    assert.equal(hasil.statusBbU.find(p=>p.label==='BB Kurang')!.who,1);
    assert.equal(hasil.statusBbU.find(p=>p.label==='BB Sangat Kurang')!.who,1);
    assert.equal(hasil.trenGizi.at(-1)!.bbKurang,2);
    assert.equal(hasil.trenGizi.at(-1)!.ditimbang,2);
    assert.equal(hasil.cakupanEnamBulan.at(-1)!.ditimbang,2);
    assert.equal(hasil.perluPerhatian.length,2);
    assert.deepEqual(hasil.wilayahRt,['01','02','03']);
});

test('perbandingan standar menghitung kategori berbeda dan hasil yang belum dinilai', () => {
    const rows = [
        { penilaian: { 'PERMENKES-2-2020': { TB_U: {kategori:'Pendek'}, BB_U:{kategori:'Berat badan kurang'} }, 'WHO-2006': { TB_U: {kategori:'Normal'} } } },
        { penilaian: { 'PERMENKES-2-2020': { TB_U: {kategori:'Sangat pendek'} }, 'WHO-2006': { TB_U: {kategori:'Sangat pendek'}, BB_U:{kategori:'Berat badan normal'} } } },
        { penilaian: {} },
    ] as unknown as BarisBertanda[];
    const tinggi = sebaranLaporan(rows, 'TB_U');
    assert.deepEqual(tinggi.find(p => p.label === 'Pendek'), {label:'Pendek',permenkes:1,who:0});
    assert.deepEqual(tinggi.find(p => p.label === 'Sangat pendek'), {label:'Sangat pendek',permenkes:1,who:1});
    assert.deepEqual(tinggi.find(p => p.label === 'Belum dinilai'), {label:'Belum dinilai',permenkes:1,who:1});
    assert.deepEqual(sebaranLaporan(rows, 'BB_U').find(p => p.label === 'Belum dinilai'), {label:'Belum dinilai',permenkes:2,who:2});
});
