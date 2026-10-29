import assert from 'node:assert/strict';
import test from 'node:test';
import {
    periodeGrafikBersambung,
    warnaGarisSd,
} from '../src/lib/grafik-acuan.ts';
import { kategoriDariZ, kesimpulanZScore } from '../src/lib/kategori.ts';

test('garis mengikuti periode berurutan dan tetap putus bila satu bulan tidak diukur', () => {
    assert.equal(periodeGrafikBersambung('2026-07', '2026-08'), true);
    assert.equal(periodeGrafikBersambung('2026-08', '2026-09'), true);
    assert.equal(periodeGrafikBersambung('2026-12', '2027-01'), true);
    assert.equal(periodeGrafikBersambung('2026-07', '2026-09'), false);
    assert.equal(periodeGrafikBersambung('2026-09', '2026-08'), false);
    assert.equal(periodeGrafikBersambung('2026-13', '2027-01'), false);
});

test('label mengikuti indeks, termasuk tinggi normal di +2 dan pendek di bawah -3', () => {
    assert.equal(kesimpulanZScore(kategoriDariZ('TB_U', 2), 2), 'Normal');
    assert.equal(kesimpulanZScore(kategoriDariZ('TB_U', -3.2), -3.2), 'Pendek');
    assert.equal(kesimpulanZScore(kategoriDariZ('TB_U', 3.01), 3.01), 'Tinggi');
    assert.equal(
        kesimpulanZScore(kategoriDariZ('BB_U', -2.39), -2.39),
        'BB Kurang',
    );
    assert.equal(
        kesimpulanZScore(kategoriDariZ('BB_TB', -1.75), -1.75),
        'Gizi Baik',
    );
    assert.equal(
        kesimpulanZScore(kategoriDariZ('BB_TB', 1.5), 1.5),
        'Risiko Gizi Lebih',
    );
    assert.equal(kategoriDariZ('TB_U', -3.2), 'Sangat pendek');
    assert.equal(kesimpulanZScore(null, 0), 'Belum dinilai');
});

test('kedua sisi kurva KIA merah pada 2 SD dan hitam pada 3 SD', () => {
    for (const z of [-2, 2]) {
        assert.equal(warnaGarisSd(z), '#C52F39');
    }

    for (const z of [-3, 3]) {
        assert.equal(warnaGarisSd(z), '#16211C');
    }

    assert.equal(warnaGarisSd(1), warnaGarisSd(-1));
    assert.equal(warnaGarisSd(0), '#167044');
});
