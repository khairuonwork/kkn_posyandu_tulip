/**
 * Acceptance test port mesin antropometri.
 *
 * Syarat terima ADR-0006: hasil TypeScript harus sama dengan implementasi PHP
 * yang sudah diterima, bukan sekadar "mendekati angka Excel". `acuan-php.json`
 * dihasilkan dengan menjalankan kelas PHP aslinya — bukan tiruannya — atas
 * 2.076 kombinasi indeks, jenis kelamin, kunci tabel, dan nilai ukur.
 *
 * Ambang 1e-9, tiga kali lebih ketat daripada 1e-6 yang diminta ADR. Selisih
 * yang tersisa hanyalah galat pembulatan pustaka matematika; selisih algoritma
 * tidak akan sekecil itu.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import type { Indeks, JenisKelamin } from '../src/antropometri/indeks.ts';
import { SEMUA_INDEKS, SEMUA_JENIS_KELAMIN, SIFAT } from '../src/antropometri/indeks.ts';
import { kategoriDari } from '../src/antropometri/kategori.ts';
import { bacaBerkasStandar, tabelDariBerkas } from '../src/antropometri/sumber-standar.ts';
import { TabelStandar } from '../src/antropometri/tabel-standar.ts';
import { dariLms, hitungZ, nilaiPadaZ } from '../src/antropometri/z-score.ts';

const tabel = tabelDariBerkas();

const AMBANG = 1e-9;

type KasusAcuan = {
    indeks: Indeks;
    jk: JenisKelamin;
    kunci: number;
    nilai: number;
    z: number | null;
    kategori: string | null;
};

const acuan = JSON.parse(
    readFileSync(join(import.meta.dirname, 'acuan-php.json'), 'utf8'),
) as { jumlah: number; versi_standar: string; kasus: KasusAcuan[] };

describe('kesetaraan dengan implementasi PHP', () => {
    test('2.076 kasus acuan: z-score identik dalam 1e-9', () => {
        let selisihTerbesar = 0;
        let kasusTerburuk: KasusAcuan | null = null;
        const beda: string[] = [];

        for (const k of acuan.kasus) {
            const z = hitungZ(tabel, k.indeks, k.jk, k.kunci, k.nilai);

            if (k.z === null || z === null) {
                // Ketiadaan hasil harus sama-sama tiada. "Di luar rentang tabel"
                // yang berubah menjadi angka adalah kegagalan paling berbahaya:
                // ia memunculkan status gizi yang tidak punya dasar.
                if (k.z !== z) {
                    beda.push(`${k.indeks}/${k.jk} kunci ${k.kunci} nilai ${k.nilai}: PHP ${k.z}, TS ${z}`);
                }

                continue;
            }

            const selisih = Math.abs(z - k.z);

            if (selisih > selisihTerbesar) {
                selisihTerbesar = selisih;
                kasusTerburuk = k;
            }
        }

        assert.equal(beda.length, 0, `kasus yang salah ada-tidaknya:\n${beda.slice(0, 10).join('\n')}`);
        assert.ok(
            selisihTerbesar < AMBANG,
            `selisih terbesar ${selisihTerbesar.toExponential(3)} pada ${JSON.stringify(kasusTerburuk)}`,
        );

        console.log(`    selisih z terbesar: ${selisihTerbesar.toExponential(3)} atas ${acuan.kasus.length} kasus`);
    });

    test('kategori status gizi identik pada seluruh kasus acuan', () => {
        const beda: string[] = [];

        for (const k of acuan.kasus) {
            const z = hitungZ(tabel, k.indeks, k.jk, k.kunci, k.nilai);
            const kategori = z === null ? null : kategoriDari(k.indeks, z);

            if (kategori !== k.kategori) {
                beda.push(`${k.indeks}/${k.jk} kunci ${k.kunci} nilai ${k.nilai}: PHP "${k.kategori}", TS "${kategori}"`);
            }
        }

        assert.equal(beda.length, 0, `kategori berbeda:\n${beda.slice(0, 10).join('\n')}`);
    });

    test('kasus acuan benar-benar menguji jalur ekstrapolasi WHO', () => {
        // Tanpa pemeriksaan ini, acuan bisa saja seluruhnya berada di rentang
        // tengah — lulus tanpa pernah menyentuh bagian yang paling rawan.
        const ekstrem = acuan.kasus.filter((k) => k.z !== null && Math.abs(k.z) > 3);
        const kosong = acuan.kasus.filter((k) => k.z === null);

        assert.ok(ekstrem.length > 500, `hanya ${ekstrem.length} kasus di luar ±3 SD`);
        assert.ok(kosong.length > 0, 'tidak ada kasus di luar rentang tabel');
    });
});

describe('tabel standar', () => {
    test('memuat 906 baris untuk enam indeks', () => {
        assert.equal(tabel.jumlahBaris, 906);
        assert.equal(tabel.versi, 'WHO-2006');
    });

    test('kedua belas kurva tersedia', () => {
        for (const indeks of SEMUA_INDEKS) {
            for (const jk of SEMUA_JENIS_KELAMIN) {
                const kunci = indeks === 'BB_TB' ? 50 : SIFAT[indeks].umurMinimum + 10;

                assert.notEqual(
                    tabel.cari(indeks, jk, kunci),
                    null,
                    `${indeks} ${jk} seharusnya tersedia`,
                );
            }
        }
    });

    test('nilai median menghasilkan z nol pada seluruh 906 baris', () => {
        // Invarian yang tidak butuh acuan: pada X = M, rumus LMS harus memberi 0.
        const { baris } = bacaBerkasStandar();
        let terbesar = 0;

        for (const b of baris) {
            const z = dariLms({ l: b.l, m: b.m, s: b.s }, b.m);

            assert.notEqual(z, null);
            terbesar = Math.max(terbesar, Math.abs(z as number));
        }

        assert.ok(terbesar < 1e-12, `z pada median menyimpang sampai ${terbesar}`);
    });

    test('menginterpolasi antar baris untuk kunci panjang badan', () => {
        const bawah = hitungZ(tabel, 'BB_TB', 'L', 67.0, 8.0) as number;
        const tengah = hitungZ(tabel, 'BB_TB', 'L', 67.3, 8.0) as number;
        const atas = hitungZ(tabel, 'BB_TB', 'L', 67.5, 8.0) as number;

        assert.ok(tengah < bawah);
        assert.ok(tengah > atas);
    });

    test('tidak menginterpolasi umur, memakai bulan penuh', () => {
        assert.equal(
            hitungZ(tabel, 'BB_U', 'L', 12.0, 9.0),
            hitungZ(tabel, 'BB_U', 'L', 12.9, 9.0),
        );
    });

    test('mengembalikan null di luar rentang tabel', () => {
        assert.equal(hitungZ(tabel, 'BB_TB', 'L', 44.0, 2.5), null);
        assert.equal(hitungZ(tabel, 'BB_TB', 'L', 121.0, 25.0), null);
        assert.equal(hitungZ(tabel, 'BB_U', 'L', 61.0, 18.0), null);
        assert.equal(hitungZ(tabel, 'BB_U', 'L', 12.0, 0.0), null);
    });

    test('urutan baris masukan tidak mempengaruhi hasil interpolasi', () => {
        // Di PHP urutan menaik datang dari ORDER BY. Di sini diurutkan sendiri,
        // jadi hasilnya harus sama meski barisnya diacak.
        const { baris, versi } = bacaBerkasStandar();
        const diacak = [...baris].reverse();
        const lain = new TabelStandar(diacak, versi);

        assert.deepEqual(lain.cari('BB_TB', 'P', 61.4), tabel.cari('BB_TB', 'P', 61.4));
        assert.deepEqual(lain.cari('BB_U', 'L', 32), tabel.cari('BB_U', 'L', 32));
    });
});

describe('rumus', () => {
    test('memakai rumus logaritmik ketika L sama dengan nol', () => {
        const z = dariLms({ l: 0, m: 10, s: 0.1 }, 12) as number;

        assert.ok(Math.abs(z - Math.log(1.2) / 0.1) < 1e-9);
    });

    test('nilaiPadaZ adalah kebalikan dari dariLms', () => {
        const lms = { l: -0.3521, m: 8.0, s: 0.082 };
        const nilai = nilaiPadaZ(lms, -2);

        assert.ok(Math.abs((dariLms(lms, nilai) as number) + 2) < 1e-9);
    });

    test('menerapkan koreksi WHO di luar +3 SD pada indeks berbasis berat', () => {
        // Baris ekstrem dari master Juni 2026: BB/TB laki-laki, TB 107,5 cm,
        // BB 24,7 kg. Spreadsheet memakai LMS polos dan menghasilkan 3,8189.
        const lms = tabel.cari('BB_TB', 'L', 107.5);
        assert.notEqual(lms, null);

        const polos = dariLms(lms!, 24.7) as number;
        const z = hitungZ(tabel, 'BB_TB', 'L', 107.5, 24.7) as number;

        // LMS polos memang menghasilkan angka spreadsheet.
        assert.ok(Math.abs(polos - 3.8189) < 0.0001, `LMS polos ${polos}`);

        // Koreksinya MENAIKKAN, bukan menurunkan.
        //
        // Test PHP lama (tests/Feature/Antropometri/ZScoreTest.php) menuntut
        // `z < 3.8189` dengan alasan "nilai terkoreksi harus lebih kecil".
        // Arah itu keliru, dan bukan hanya pada baris ini: di ekor atas, jarak
        // antar SD pada kurva LMS melebar lebih cepat daripada linear, sehingga
        // ekstrapolasi WHO — yang memakai jarak +2 SD ke +3 SD sebagai satuan
        // tetap — memberi angka lebih besar. Di sini 24,7 kg berada 1,865 kg di
        // atas garis +3 SD, sementara satu SD di sana selebar 2,029 kg, jadi
        // z = 3 + 1,865/2,029 = 3,9195.
        assert.ok(z > polos, `koreksi seharusnya menaikkan: polos ${polos}, terkoreksi ${z}`);
        assert.ok(Math.abs(z - 3.919484139717788) < 1e-9);
        assert.equal(kategoriDari('BB_TB', z), 'Obesitas');
    });

    test('tidak menerapkan koreksi pada TB/U yang berdistribusi normal', () => {
        const lms = tabel.cari('TB_U', 'L', 24);
        assert.notEqual(lms, null);

        const nilai = nilaiPadaZ(lms!, -4);
        const z = hitungZ(tabel, 'TB_U', 'L', 24, nilai) as number;

        assert.ok(Math.abs(z + 4) < 1e-6);
    });
});

describe('kecocokan dengan master Z-Score Juni 2026', () => {
    // Dataset asli dari tests/Feature/Antropometri/ZScoreTest.php, diport utuh.
    // Nilai harapan berasal dari kolom WHO-LMS berkas milik Posyandu Tulip.
    const dataset: [Indeks, JenisKelamin, number, number, number][] = [
        ['BB_U', 'L', 4, 7, -0.0029],
        ['BB_U', 'P', 4, 7.77, 1.5335],
        ['BB_U', 'L', 32, 10.5, -2.2248],
        ['TB_U', 'L', 4, 60, -1.8676],
        ['TB_U', 'P', 4, 65, 1.3445],
        ['TB_U', 'L', 32, 83, -2.9544],
        ['BB_TB', 'L', 60, 7, 1.8162],
        // Baris `['BB_TB', 'P', 61.4, 6.24, 0.1993]` dari dataset PHP sengaja
        // tidak diikutkan di sini — lihat uji D-02 di bawah.
        ['BB_TB', 'L', 83, 10.5, -0.6152],
        ['IMT_U', 'L', 4, 19.4444, 1.4865],
        ['IMT_U', 'P', 4, 16.5519, -0.0778],
        ['IMT_U', 'L', 32, 15.2417, -0.4006],
        ['LILA_U', 'L', 7, 16, 1.4292],
        ['LILA_U', 'P', 9, 17.5, 2.5692],
        ['LILA_U', 'L', 32, 15, -0.4814],
        ['LIKA_U', 'L', 4, 43, 1.146],
        ['LIKA_U', 'P', 4, 41, 0.3305],
        ['LIKA_U', 'L', 32, 48, -0.8028],
    ];

    for (const [indeks, jk, kunci, nilai, harapan] of dataset) {
        test(`${indeks} ${jk} kunci ${kunci} nilai ${nilai}`, () => {
            const z = hitungZ(tabel, indeks, jk, kunci, nilai);

            assert.notEqual(z, null);
            assert.ok(
                Math.abs((z as number) - harapan) < 0.01,
                `z ${z} menyimpang dari harapan ${harapan}`,
            );
        });
    }

    test('D-02: BB/TB pada tinggi antar baris — interpolasi versus pembulatan ke bawah', () => {
        // Satu-satunya baris dataset PHP yang tidak dapat dipenuhi, dan
        // sebabnya bukan perhitungan melainkan keputusan yang belum diambil.
        //
        // Master Excel mencatat 0,1993 untuk anak setinggi 61,4 cm. Angka itu
        // persis nilai pada baris 61,0 — VLOOKUP tanpa interpolasi, seperti
        // yang sudah ditandai D-02 di docs/riwayat/catatan-tahap-demo.md. Aplikasi
        // menginterpolasi dan memberi 0,0241.
        //
        // Keduanya diperiksa di sini supaya keputusan yang tertunda itu terlihat
        // di dalam test, bukan tersembunyi sebagai satu baris merah. Saat D-02
        // dijawab, salah satu assert di bawah yang berubah menjadi acuan.
        const pembulatanKeBawah = hitungZ(tabel, 'BB_TB', 'P', 61.0, 6.24) as number;
        const interpolasi = hitungZ(tabel, 'BB_TB', 'P', 61.4, 6.24) as number;

        assert.ok(
            Math.abs(pembulatanKeBawah - 0.1993) < 0.01,
            `baris 61,0 seharusnya angka Excel, dapat ${pembulatanKeBawah}`,
        );
        assert.ok(Math.abs(interpolasi - 0.02408233612052835) < 1e-9);

        // Selisihnya kecil, tetapi cukup memindahkan anak yang tepat di ambang.
        assert.ok(Math.abs(interpolasi - pembulatanKeBawah) > 0.17);
    });
});
