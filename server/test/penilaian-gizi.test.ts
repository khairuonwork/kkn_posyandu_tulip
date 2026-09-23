/**
 * Aturan di sekitar perhitungan: umur, koreksi posisi ukur, batas umur LILA,
 * penandaan nilai tidak wajar, dan pembulatan.
 *
 * Diport dari bagian PenilaianGiziService pada
 * `tests/Feature/Antropometri/ZScoreTest.php`. Di sana tiap kasus menuntut
 * basis data karena masukannya model Eloquent; di sini masukannya objek biasa,
 * jadi seluruh aturan diuji tanpa basis data sama sekali.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { JenisUkur } from '../src/antropometri/indeks.ts';
import type { PengukuranMasukan } from '../src/antropometri/penilaian-gizi.ts';
import { bulatkan, hitungPenilaian, umurBulanPada } from '../src/antropometri/penilaian-gizi.ts';
import { tabelDariBerkas } from '../src/antropometri/sumber-standar.ts';

const tabel = tabelDariBerkas();

const TANGGAL_UKUR = '2026-06-13';

/** Pengukuran dengan anak yang berumur tepat sekian bulan pada tanggal ukurnya. */
function pengukuranUntuk(
    umurBulan: number,
    isi: Partial<Omit<PengukuranMasukan, 'tglLahir' | 'tanggalUkur'>> = {},
): PengukuranMasukan {
    const bulanTotal = 2026 * 12 + (6 - 1) - umurBulan;
    const tahun = Math.floor(bulanTotal / 12);
    const bulan = (bulanTotal % 12) + 1;

    return {
        tglLahir: `${tahun}-${String(bulan).padStart(2, '0')}-13`,
        tanggalUkur: TANGGAL_UKUR,
        jk: 'L',
        bbKg: null,
        tinggiCm: null,
        jenisUkur: null,
        lilaCm: null,
        likaCm: null,
        ...isi,
    };
}

describe('umur', () => {
    test('dihitung sebagai bulan penuh dari selisih kalender', () => {
        assert.equal(umurBulanPada('2026-01-20', '2026-06-13'), 4);
        assert.equal(umurBulanPada('2026-01-20', '2026-06-20'), 5);
        assert.equal(umurBulanPada('2026-01-20', '2027-01-19'), 11);
    });

    test('nol pada hari lahir, dan tidak pernah negatif karena zona waktu', () => {
        assert.equal(umurBulanPada('2026-06-13', '2026-06-13'), 0);
        assert.equal(umurBulanPada('2026-06-13', '2026-06-12'), -1);
    });

    test('pembantu uji menghasilkan umur yang diminta', () => {
        for (const umur of [0, 4, 6, 23, 24, 30, 59, 60]) {
            const p = pengukuranUntuk(umur);

            assert.equal(umurBulanPada(p.tglLahir, p.tanggalUkur), umur, `umur ${umur}`);
        }
    });
});

describe('pembulatan gaya PHP', () => {
    test('setengah dibulatkan menjauhi nol, bukan ke arah plus tak hingga', () => {
        // Math.round bawaan memberi -2.222 untuk kasus kedua.
        assert.equal(bulatkan(2.2225, 3), 2.223);
        assert.equal(bulatkan(-2.2225, 3), -2.223);
        assert.equal(bulatkan(2.5, 0), 3);
        assert.equal(bulatkan(-2.5, 0), -3);
    });

    test('galat representasi biner tidak menggeser hasil', () => {
        // 1.005 * 100 menghasilkan 100.49999999999999 pada aritmetika biner.
        assert.equal(bulatkan(1.005, 2), 1.01);
        assert.equal(bulatkan(-1.005, 2), -1.01);
    });
});

describe('penilaian gizi', () => {
    test('menghitung enam indeks untuk pengukuran lengkap', () => {
        const hasil = hitungPenilaian(
            tabel,
            pengukuranUntuk(24, { bbKg: 11.5, tinggiCm: 86.0, lilaCm: 15.0, likaCm: 47.0 }),
        );

        assert.equal(hasil.length, 6);

        const per = new Map(hasil.map((h) => [h.indeks, h]));

        assert.notEqual(per.get('TB_U')?.kategori, null);
        // OI-04: label LILA/U belum dikonfirmasi pemilik program.
        assert.equal(per.get('LILA_U')?.kategori, null);
        assert.notEqual(per.get('LILA_U')?.zScore, undefined);
    });

    test('urutan hasil mengikuti urutan indeks yang dipakai PHP', () => {
        const hasil = hitungPenilaian(
            tabel,
            pengukuranUntuk(24, { bbKg: 11.5, tinggiCm: 86.0, lilaCm: 15.0, likaCm: 47.0 }),
        );

        assert.deepEqual(
            hasil.map((h) => h.indeks),
            ['BB_U', 'TB_U', 'BB_TB', 'IMT_U', 'LILA_U', 'LIKA_U'],
        );
    });

    test('melewati LILA/U untuk anak di bawah enam bulan', () => {
        const hasil = hitungPenilaian(
            tabel,
            pengukuranUntuk(4, { bbKg: 7.0, tinggiCm: 60.0, lilaCm: 16.0, likaCm: 43.0 }),
        );
        const indeks = hasil.map((h) => h.indeks);

        assert.ok(!indeks.includes('LILA_U'));
        assert.ok(indeks.includes('LIKA_U'));
    });

    test('LILA/U ikut dihitung tepat pada umur enam bulan', () => {
        const hasil = hitungPenilaian(
            tabel,
            pengukuranUntuk(6, { bbKg: 7.5, tinggiCm: 65.0, lilaCm: 14.0 }),
        );

        assert.ok(hasil.some((h) => h.indeks === 'LILA_U'));
    });

    test('mengoreksi tinggi badan ketika posisi ukur tidak lazim untuk umurnya', () => {
        // Anak 30 bulan diukur telentang: tinggi tabel harus 0,7 cm lebih kecil.
        const telentang = hitungPenilaian(
            tabel,
            pengukuranUntuk(30, { bbKg: 12.0, tinggiCm: 90.0, jenisUkur: 'PB' as JenisUkur }),
        ).find((h) => h.indeks === 'BB_TB');

        const berdiri = hitungPenilaian(
            tabel,
            pengukuranUntuk(30, { bbKg: 12.0, tinggiCm: 89.3, jenisUkur: 'TB' as JenisUkur }),
        ).find((h) => h.indeks === 'BB_TB');

        assert.ok(telentang !== undefined && berdiri !== undefined);
        assert.ok(Math.abs(telentang.zScore - berdiri.zScore) < 0.001);
        assert.equal(
            telentang.catatanPerhitungan?.konversi_tinggi,
            'diukur PB pada umur 30 bulan, dikoreksi -0.7 cm',
        );
    });

    test('koreksi berlawanan arah untuk bayi yang diukur berdiri', () => {
        const hasil = hitungPenilaian(
            tabel,
            pengukuranUntuk(12, { bbKg: 9.0, tinggiCm: 74.0, jenisUkur: 'TB' as JenisUkur }),
        ).find((h) => h.indeks === 'TB_U');

        assert.equal(
            hasil?.catatanPerhitungan?.konversi_tinggi,
            'diukur TB pada umur 12 bulan, dikoreksi +0.7 cm',
        );
    });

    test('catatan koreksi hanya menempel pada indeks yang memakai tinggi', () => {
        const hasil = hitungPenilaian(
            tabel,
            pengukuranUntuk(30, {
                bbKg: 12.0,
                tinggiCm: 90.0,
                likaCm: 48.0,
                jenisUkur: 'PB' as JenisUkur,
            }),
        );
        const per = new Map(hasil.map((h) => [h.indeks, h]));

        assert.notEqual(per.get('BB_TB')?.catatanPerhitungan, null);
        assert.notEqual(per.get('TB_U')?.catatanPerhitungan, null);
        assert.notEqual(per.get('IMT_U')?.catatanPerhitungan, null);
        assert.equal(per.get('BB_U')?.catatanPerhitungan, null);
        assert.equal(per.get('LIKA_U')?.catatanPerhitungan, null);
    });

    test('mencatat ketika posisi ukur hanya diasumsikan dari umur', () => {
        const hasil = hitungPenilaian(
            tabel,
            pengukuranUntuk(30, { bbKg: 12.0, tinggiCm: 90.0, jenisUkur: null }),
        ).find((h) => h.indeks === 'TB_U');

        assert.deepEqual(hasil?.catatanPerhitungan, { jenis_ukur: 'diasumsikan dari umur' });
    });

    test('tidak menghasilkan penilaian ketika nilai ukur kosong', () => {
        assert.deepEqual(hitungPenilaian(tabel, pengukuranUntuk(24)), []);
    });

    test('tidak menghasilkan penilaian untuk umur negatif', () => {
        const pengukuran: PengukuranMasukan = {
            ...pengukuranUntuk(0, { bbKg: 3.3 }),
            tglLahir: '2026-07-01',
        };

        assert.deepEqual(hitungPenilaian(tabel, pengukuran), []);
    });

    test('menandai nilai yang tidak wajar tanpa membuangnya', () => {
        // Berat 1,5 kg pada umur 24 bulan: jauh di luar rentang biologis.
        const hasil = hitungPenilaian(
            tabel,
            pengukuranUntuk(24, { bbKg: 1.5, tinggiCm: 86.0 }),
        ).find((h) => h.indeks === 'BB_U');

        assert.equal(hasil?.tidakWajar, true);
        assert.notEqual(hasil?.zScore, null);
    });

    test('nilai gizi buruk yang nyata tidak ikut ditandai tidak wajar', () => {
        // -3,5 SD adalah gizi buruk sungguhan, bukan salah input.
        const hasil = hitungPenilaian(
            tabel,
            pengukuranUntuk(24, { bbKg: 8.0, tinggiCm: 86.0 }),
        ).find((h) => h.indeks === 'BB_U');

        assert.equal(hasil?.tidakWajar, false);
        assert.equal(hasil?.kategori, 'Berat badan sangat kurang');
    });

    test('z-score disimpan dengan tiga desimal', () => {
        const hasil = hitungPenilaian(tabel, pengukuranUntuk(24, { bbKg: 11.5, tinggiCm: 86.0 }));

        for (const h of hasil) {
            assert.equal(bulatkan(h.zScore, 3), h.zScore, `${h.indeks} lebih dari tiga desimal`);
        }
    });

    test('IMT dihitung, tidak pernah diminta sebagai masukan', () => {
        const hasil = hitungPenilaian(tabel, pengukuranUntuk(24, { bbKg: 11.5, tinggiCm: 86.0 }));
        const per = new Map(hasil.map((h) => [h.indeks, h]));

        // IMT = 11,5 / 0,86² = 15,549…
        assert.notEqual(per.get('IMT_U'), undefined);
        assert.equal(per.get('BB_TB')?.kategori, per.get('IMT_U')?.kategori);
    });
});
