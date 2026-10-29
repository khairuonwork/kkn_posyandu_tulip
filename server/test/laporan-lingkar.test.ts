import assert from 'node:assert/strict';
import test from 'node:test';
import { teruskanLingkar } from '../src/services/laporan-lingkar.ts';
import { buatBarisLaporan } from '../src/services/laporan-perhitungan.ts';
import { tabelDariBerkas } from '../src/antropometri/sumber-standar.ts';
import type { BarisLaporan } from '../src/repositories/laporan-repository.ts';
import { workbookLaporan } from '../src/services/laporan-export.ts';

function row(bulan: string, lilaCm: number | null = null, likaCm: number | null = null, anakId = 1): BarisLaporan {
    return { anakId, nama:'UJI', nik:null,namaOrtu:null,tglLahir:'2025-01-10',jk:'L',rt:'01',periodeId:bulan,
        tanggalUkur:bulan+'-10',umurHari:600,bbKg:10,tinggiCm:80,lilaCm,likaCm,ntobRaw:'T',statusKehadiran:'hadir',jenisUkur:'PB',penilaian:{} };
}

test('September berlaku Oktober-November, Desember wajib ukur ulang; sumber tidak dimutasi', () => {
    const source=[row('2026-09',15,45),row('2026-10'),row('2026-11'),row('2026-12')];
    const before=JSON.stringify(source);
    const result=teruskanLingkar(source);
    assert.deepEqual(result.map(r=>[r.lilaCm,r.likaCm]),[[15,45],[15,45],[15,45],[null,null]]);
    assert.equal(result[2].sumberLingkar.lilaCm,'2026-09-10');
    assert.deepEqual(result[3].perluUkurLingkar,['lilaCm','likaCm']);
    assert.equal(JSON.stringify(source),before);
});

test('nilai baru didahulukan per indeks, melewati tahun, tanpa mengambil data anak lain atau masa depan', () => {
    const source=[row('2027-02'),row('2026-12',15,45),row('2027-01',16),row('2027-01',22,55,2),row('2027-03')];
    const result=teruskanLingkar(source);
    assert.deepEqual([result[0].lilaCm,result[0].likaCm],[16,45]);
    assert.deepEqual([result[4].lilaCm,result[4].likaCm],[16,null]);
    assert.deepEqual(teruskanLingkar([row('2026-09'),row('2026-10',15,45)])[0].lilaCm,null);
});

test('nilai bawaan tidak memperpanjang masa berlaku dan bukan hasil ukur saat tidak hadir', () => {
    const result=teruskanLingkar([row('2026-09',15,45),{...row('2026-10',20,50),statusKehadiran:'tidak_hadir'},row('2026-11'),row('2026-12')]);
    assert.equal(result[2].lilaCm,15);
    assert.equal(result[3].lilaCm,null);
});

test('Excel Oktober memuat cm September, z-score umur Oktober, sumber nilai dan peringatan Desember', async () => {
    const result=buatBarisLaporan([row('2026-09',15,45),row('2026-10'),row('2026-11'),row('2026-12')],tabelDariBerkas());
    assert.notEqual(result[0].penilaian['WHO-2006'].LILA_U.z,result[1].penilaian['WHO-2006'].LILA_U.z);
    const book=await workbookLaporan({periode:'2026-10',standar:[],bulanan:[result[1]],riwayat2T:[]});
    const sheet=book.getWorksheet('Rekap Z Score')!;
    assert.equal(sheet.getCell('H7').value,15);
    assert.equal(sheet.getCell('I7').value,45);
    assert.match(String(sheet.getCell('H7').note),/2026-09-10/);
    assert.equal(typeof sheet.getCell('AA7').value,'number');
    assert.equal(typeof sheet.getCell('AE7').value,'number');
    const december=await workbookLaporan({periode:'2026-12',standar:[],bulanan:[result[3]],riwayat2T:[]});
    assert.equal(december.getWorksheet('Rekap Z Score')!.getCell('H7').value,'Perlu pengukuran ulang');
});
