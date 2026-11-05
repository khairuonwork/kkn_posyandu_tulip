import assert from 'node:assert/strict';
import test from 'node:test';
import { validasiProfilKeluarga } from '../src/services/profil-keluarga.ts';

test('Jenis KB dinormalisasi, dapat dikosongkan, dan tidak menebak boolean lama', () => {
    assert.equal(validasiProfilKeluarga({ jenisKb: '  KB   ayah: Vasektomi ' }, 'Orang tua').jenisKb, 'KB ayah: Vasektomi');
    assert.equal(validasiProfilKeluarga({ jenisKb: '  ' }, '').jenisKb, null);
    assert.equal(validasiProfilKeluarga({ jenisKb: null }, '').jenisKb, null);
    assert.equal(validasiProfilKeluarga({ kbIbu: true }, 'Ibu').jenisKb, undefined);
    assert.doesNotThrow(() => validasiProfilKeluarga({ jenisKb: 'a'.repeat(100) }, 'Ortu'));
    for (const jenisKb of [true, 123, {}, 'a'.repeat(101)])
        assert.throws(() => validasiProfilKeluarga({ jenisKb }, 'Ortu'), /Jenis KB/);
    assert.throws(() => validasiProfilKeluarga({ jenisKb: 'IUD' }, ''), /orang tua/);
});

test('kelompok Desil hanya menerima 6-10 tanpa angka tertentu', () => {
    assert.equal(validasiProfilKeluarga({ desilKelompok: '6-10', desil: null }, '').desilKelompok, '6-10');
    assert.throws(() => validasiProfilKeluarga({ desilKelompok: '7-10' }, ''), /Desil/);
    assert.throws(() => validasiProfilKeluarga({ desilKelompok: '6-10', desil: 6 }, ''), /Desil/);
});

test('kategori G/NG tanpa nomor desil valid; kategori yang bertentangan ditolak', () => {
    for (const gng of ['G', 'NG'] as const)
        assert.equal(validasiProfilKeluarga({ gng, desil: null, desilKelompok: null }, '').gng, gng);
    for (const gng of ['', 'g', 1, true, {}])
        assert.throws(() => validasiProfilKeluarga({ gng }, ''), /Status ekonomi/);
    for (const data of [{ desil: 5, gng: 'G' }, { desil: 4, gng: 'NG' }, { desilKelompok: '6-10', gng: 'G' }])
        assert.throws(() => validasiProfilKeluarga(data, ''), /bertentangan/);
});
