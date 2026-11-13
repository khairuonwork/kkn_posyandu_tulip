import assert from 'node:assert/strict';
import test from 'node:test';
import { warnaGarisSd } from '../src/lib/grafik-acuan.ts';
import {
    PILIHAN_DESIL,
    pilihanDesil,
    labelDesil,
    perubahanDesil,
} from '../src/lib/profil-keluarga.ts';

test('pilihan desil mengelompokkan data lama tanpa mengubah nilainya', () => {
    assert.equal(PILIHAN_DESIL.length, 9);

    for (let desil = 6; desil <= 10; desil++) {
        const data = { desil };
        assert.equal(pilihanDesil(data), '6-10');
        assert.equal(data.desil, desil);
    }

    assert.equal(pilihanDesil({ desilKelompok: '6-10' }), '6-10');
    assert.match(labelDesil('6-10'), /NG/);
    assert.match(labelDesil('4'), /G \(Gakin\)/);
    assert.equal(labelDesil(''), 'Belum tercatat');
    assert.deepEqual(perubahanDesil('6-10'), {
        desil: null,
        desilKelompok: '6-10',
    });
    assert.deepEqual(perubahanDesil('5'), { desil: 5, desilKelompok: null });
    assert.deepEqual(perubahanDesil(''), { desil: null, desilKelompok: null });
});

test('garis SD simetris dan batas ±2 merah', () => {
    assert.equal(warnaGarisSd(-2), '#C52F39');
    assert.equal(warnaGarisSd(2), '#C52F39');

    for (const z of [1, 2, 3]) {
        assert.equal(warnaGarisSd(-z), warnaGarisSd(z));
    }
});

test('kategori ekonomi tanpa desil tetap dapat diisi dan tidak menebak angkanya', () => {
    for (const gng of ['G', 'NG'] as const) {
        assert.equal(pilihanDesil({ gng }), gng);
        assert.match(labelDesil(gng), /desil belum diketahui/);
        assert.deepEqual(perubahanDesil(gng), {
            desil: null,
            desilKelompok: null,
            gng,
        });
    }

    assert.equal(pilihanDesil({ desil: 3, gng: 'G' }), '3');
    assert.equal(pilihanDesil({ gng: null }), '');
});
