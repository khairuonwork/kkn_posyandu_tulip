/**
 * Pesan hasil penimbangan untuk orang tua: nomor baku, tautan wa.me, dan isi
 * pesan. Baris tanpa nilai harus hilang, dan tidak ada data identitas di teks.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    kalimatKesimpulan,
    namaDepan,
    nomorBaku,
    nomorTampil,
    susunPesan,
    tautanWa,
} from '../src/lib/pesan-wa.ts';
import type { Pengukuran } from '../src/types/posyandu.ts';

const ukur = (isi: Partial<Pengukuran>): Pengukuran => ({
    anakId: 1,
    periodeId: '2026-09',
    tanggalUkur: '2026-09-17',
    umurBulan: 30,
    bbKg: 10.9,
    tinggiCm: 88.7,
    lilaCm: null,
    likaCm: null,
    ntob: null,
    statusKehadiran: 'hadir',
    catatanUkur: null,
    penilaian: {
        BB_U: { z: -1.4, kategori: 'Berat badan normal', tidakWajar: false },
        TB_U: { z: -0.8, kategori: 'Normal', tidakWajar: false },
        BB_TB: { z: -0.5, kategori: 'Gizi baik', tidakWajar: false },
    },
    ...isi,
});

const bahan = (isi: Partial<Parameters<typeof susunPesan>[0]> = {}) => ({
    nama: 'Nayla Putri Ramadhani',
    umurBulan: 30,
    terbaru: ukur({}),
    duaBulanLalu: ukur({ umurBulan: 28, bbKg: 10.6 }),
    kesimpulan: 'sesuai' as const,
    lembaga: 'Posyandu Tulip RW 18',
    ...isi,
});

describe('nomor WhatsApp', () => {
    test('semua bentuk penulisan menjadi 62…', () => {
        for (const mentah of [
            '0831-8444-7563',
            '+62 831-8444-7563',
            '62831 8444 7563',
            '831 8444 7563',
        ]) {
            assert.equal(nomorBaku(mentah), '6283184447563');
        }
    });

    test('bukan nomor seluler Indonesia menghasilkan null', () => {
        assert.equal(nomorBaku(null), null);
        assert.equal(nomorBaku(''), null);
        assert.equal(nomorBaku('12345'), null);
        assert.equal(nomorBaku('021 5551 234'), null);
    });

    test('tampilan dan tautan', () => {
        assert.equal(nomorTampil('6283184447563'), '+62 831-8444-7563');
        assert.equal(
            tautanWa('6283184447563', 'Halo\nIbu'),
            'https://wa.me/6283184447563?text=Halo%0AIbu',
        );
    });
});

describe('susunPesan', () => {
    test('nama depan: huruf kapital semua dari arsip menjadi Judul', () => {
        assert.equal(namaDepan('ADITAMA ABQARY SYAHREZA'), 'Aditama');
        assert.equal(namaDepan('Nayla Putri'), 'Nayla');
        assert.equal(namaDepan('  rafa '), 'rafa');
        assert.match(
            susunPesan(bahan({ nama: 'ADITAMA ABQARY' })),
            /dari Aditama,/,
        );
    });

    test('memakai nama depan, tanpa NIK, dan menutup dengan lembaga', () => {
        const pesan = susunPesan(bahan());

        assert.match(pesan, /^Yth\. Ibu\/Bapak dari Nayla,\n/);
        assert.doesNotMatch(pesan, /Putri|Ramadhani|NIK/);
        assert.match(pesan, /Posyandu Tulip RW 18$/);
    });

    test('memuat angka, kategori tanpa kode, dan selisih 2 bulan', () => {
        const pesan = susunPesan(bahan());

        assert.match(pesan, /• Berat badan 10,9 kg: normal/);
        assert.match(pesan, /• Tinggi badan 88,7 cm: normal/);
        assert.match(pesan, /• Status gizi: gizi baik/);
        assert.match(pesan, /• Berat badan naik 0,3 kg dibanding 2 bulan lalu/);
    });

    test('baris tanpa nilai hilang, bukan tercetak sebagai tanda pisah', () => {
        const pesan = susunPesan(
            bahan({
                duaBulanLalu: undefined,
                terbaru: ukur({ tinggiCm: null }),
            }),
        );

        assert.doesNotMatch(pesan, /Lingkar|Tinggi|dibanding|—/);
    });

    test('di bawah 24 bulan memakai panjang badan', () => {
        const pesan = susunPesan(bahan({ umurBulan: 10 }));

        assert.match(pesan, /• Panjang badan 88,7 cm: normal/);
    });

    test('tiga kesimpulan menyebut nama depan dan tidak memakai kata sehat', () => {
        const judul = (kesimpulan: 'sesuai' | 'dipantau' | 'diperiksa') =>
            susunPesan(bahan({ kesimpulan })).match(/\n\*(.+)\*\n/)?.[1];

        assert.equal(judul('sesuai'), 'Pertumbuhan Nayla baik.');
        assert.equal(
            judul('dipantau'),
            'Pertumbuhan Nayla perlu diperhatikan.',
        );
        assert.equal(
            judul('diperiksa'),
            'Sebaiknya Nayla diperiksa ke puskesmas.',
        );

        for (const k of ['sesuai', 'dipantau', 'diperiksa'] as const) {
            assert.doesNotMatch(susunPesan(bahan({ kesimpulan: k })), /sehat/i);
        }
    });

    test('anjuran di pesan sama dengan anjuran di layar', () => {
        for (const k of ['sesuai', 'dipantau', 'diperiksa'] as const) {
            const { anjuran } = kalimatKesimpulan(k, 'Nayla Putri');

            assert.ok(susunPesan(bahan({ kesimpulan: k })).includes(anjuran));
        }

        assert.match(
            kalimatKesimpulan('diperiksa', 'Nayla Putri').anjuran,
            /bawa Nayla ke puskesmas/,
        );
    });

    test('LILA dan LIKA muncul bila ada, LILA tanpa kategori', () => {
        const pesan = susunPesan(
            bahan({
                terbaru: ukur({
                    lilaCm: 15.2,
                    likaCm: 49,
                    penilaian: {
                        LILA_U: { z: 0.5, kategori: null, tidakWajar: false },
                        LIKA_U: {
                            z: -0.3,
                            kategori: 'Normal',
                            tidakWajar: false,
                        },
                    },
                }),
            }),
        );

        assert.match(pesan, /• Lingkar lengan atas 15,2 cm$/m);
        assert.match(pesan, /• Lingkar kepala 49,0 cm: normal/);
    });
});
