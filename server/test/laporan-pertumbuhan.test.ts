import assert from 'node:assert/strict';
import test from 'node:test';
import { hitungPertumbuhan, type TitikPertumbuhan } from '../src/services/laporan-pertumbuhan-bulanan.ts';

const prev:TitikPertumbuhan={anakId:1,periodeId:'2026-12',umurBulan:12,bbKg:10,zBbU:0.2,hadir:true};
const current:TitikPertumbuhan={...prev,periodeId:'2027-01',umurBulan:13,bbKg:10.2};
test('perbandingan lintas tahun dan ambang KBM memakai umur bulan pada pengukuran terkait',()=>{
    assert.deepEqual(hitungPertumbuhan(current,prev),{kenaikanGram:200,kbmGram:200,nt:'N'});
    assert.equal(hitungPertumbuhan({...current,umurBulan:12},prev).nt,'T');
    assert.equal(hitungPertumbuhan({...current,zBbU:-0.1},prev).nt,'T');
});
test('ketidakhadiran, anak berbeda, atau berat kosong tidak menjadi pembanding',()=>{
    for(const invalid of [{...prev,hadir:false},{...prev,anakId:2},{...prev,bbKg:null}]) {
        assert.deepEqual(hitungPertumbuhan(current,invalid),{kenaikanGram:null,kbmGram:null,nt:null});
    }
});
