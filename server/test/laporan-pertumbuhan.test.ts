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

test('riwayat detail memakai N/T hitungan, bukan huruf sumber (kasus Okt 17,40 -> Nov 17,20 kg)', async () => {
    const { ntRiwayat } = await import('../src/services/laporan-pertumbuhan-bulanan.ts');
    const ukur = (periodeId: string, bbKg: number | null, ntob: string | null, z = 0, statusKehadiran = 'hadir') =>
        ({ periodeId, tanggalUkur: `${periodeId}-12`, bbKg, statusKehadiran, ntob, penilaian: { BB_U: { z } } });
    const umur = (tanggal: string) => Number(tanggal.slice(5, 7)) + 40; // umur > 12 bulan: KBM 200 g
    const hasil = ntRiwayat(1, umur, [
        ukur('2026-11', 17.2, 'N'),            // turun 200 g dari Okt
        ukur('2026-10', 17.4, 'N'),            // turun 500 g dari Sep
        ukur('2026-09', 17.9, 'T'),            // naik cukup: +300 g >= KBM 200 g
        ukur('2026-08', 17.6, null),           // tetap
        ukur('2026-07', 17.6, 'N'),            // naik kecil: +100 g < KBM
        ukur('2026-06', 17.5, 'O'),            // tanpa pembanding: huruf sumber
    ]).map((p) => p.ntob);
    assert.deepEqual(hasil, ['T', 'T', 'N', 'T', 'T', 'O']);
});

test('bulan bolong atau tidak hadir tidak dibandingkan; huruf sumber tetap tampil', async () => {
    const { ntRiwayat } = await import('../src/services/laporan-pertumbuhan-bulanan.ts');
    const ukur = (periodeId: string, bbKg: number, ntob: string | null, statusKehadiran = 'hadir') =>
        ({ periodeId, tanggalUkur: `${periodeId}-12`, bbKg, statusKehadiran, ntob, penilaian: {} });
    const hasil = ntRiwayat(1, () => 30, [
        ukur('2026-11', 12, 'B'), ukur('2026-09', 11, null), ukur('2026-08', 10, 'N', 'tidak_hadir'),
    ]).map((p) => p.ntob);
    assert.deepEqual(hasil, ['B', null, 'N']);
});
