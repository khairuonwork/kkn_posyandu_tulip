/**
 * Salinan z-score di peramban, diuji terhadap acuan yang sama dengan server.
 *
 * `src/lib/z-score.ts` adalah implementasi **kedua** rumus gizi di repo ini.
 * Duplikasinya disengaja: pratinjau di editor Data Balita harus berubah saat
 * kader mengetik, dan perjalanan ke server pada tiap ketukan papan tombol
 * bukan pilihan. Yang tidak disengaja adalah salinan itu tidak pernah diikat
 * ke apa pun — dan ia sempat menyimpang.
 *
 * Berkas ini menggantikan `src/lib/z-score.check.ts`, swauji lama yang sudah
 * rusak sejak pemindahan berkas (jalurnya masih menunjuk `database/data/` dan
 * `resources/js/` era Laravel) dan tidak pernah dipanggil skrip npm mana pun.
 * Seluruh pemeriksaannya dipindahkan ke sini apa adanya.
 *
 * Memakai `node:test` bawaan Node, bukan kerangka uji baru — sama seperti
 * `server/test/`.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { kategoriDariZ } from '../src/lib/kategori.ts';
import type { BarisLms } from '../src/lib/z-score.ts';
import {
    cariLms,
    dariLms,
    hitungZ,
    nilaiPadaZ,
    susunTabel,
} from '../src/lib/z-score.ts';
import type { Indeks, JenisKelamin } from '../src/types/posyandu.ts';

const AKAR = join(import.meta.dirname, '..', '..');

/*
    Tabel standar dan berkas acuan dibaca dari `server/`, bukan disalin ke
    sini. Dua salinan 906 baris parameter WHO adalah dua angka gizi yang bisa
    berbeda diam-diam, dan dua salinan acuan membuat pengujian ini kehilangan
    seluruh maknanya. Impor lintas paket ini sudah berpreseden: `demo/store.ts`
    membaca berkas standar yang sama.
*/
const sumber = JSON.parse(
    readFileSync(join(AKAR, 'server', 'db', 'data', 'who-lms.json'), 'utf8'),
) as { baris: BarisLms[] };

const tabel = susunTabel(sumber.baris);

function dekat(a: number, b: number, toleransi = 1e-9): boolean {
    return Math.abs(a - b) < toleransi;
}

describe('kesetaraan dengan mesin server', () => {
    type Kasus = {
        indeks: Indeks;
        jk: JenisKelamin;
        kunci: number;
        nilai: number;
        z: number | null;
        kategori: string | null;
    };

    // Berkas yang sama yang membuktikan mesin server setara implementasi PHP
    // lama. Mengikatkan salinan peramban ke acuan itu berarti ketiganya —
    // PHP, server, dan peramban — menjawab angka yang sama.
    const acuan = JSON.parse(
        readFileSync(join(AKAR, 'server', 'test', 'acuan-php.json'), 'utf8'),
    ) as { kasus: Kasus[] };

    test('2.076 kasus acuan: z-score identik dalam 1e-9', () => {
        let selisihTerbesar = 0;
        let kasusTerburuk: Kasus | null = null;
        const beda: string[] = [];

        for (const k of acuan.kasus) {
            const z = hitungZ(tabel, k.indeks, k.jk, k.kunci, k.nilai);

            if (k.z === null || z === null) {
                if (k.z !== z) {
                    beda.push(
                        `${k.indeks}/${k.jk} kunci ${k.kunci} nilai ${k.nilai}: acuan ${k.z}, client ${z}`,
                    );
                }

                continue;
            }

            const selisih = Math.abs(z - k.z);

            if (selisih > selisihTerbesar) {
                selisihTerbesar = selisih;
                kasusTerburuk = k;
            }
        }

        assert.equal(
            beda.length,
            0,
            `kasus yang salah ada-tidaknya:\n${beda.slice(0, 10).join('\n')}`,
        );
        assert.ok(
            selisihTerbesar < 1e-9,
            `selisih terbesar ${selisihTerbesar.toExponential(3)} pada ${JSON.stringify(kasusTerburuk)}`,
        );

        console.log(
            `    selisih z terbesar: ${selisihTerbesar.toExponential(3)} atas ${acuan.kasus.length} kasus`,
        );
    });

    test('kategori status gizi identik pada seluruh kasus acuan', () => {
        const beda: string[] = [];

        for (const k of acuan.kasus) {
            const z = hitungZ(tabel, k.indeks, k.jk, k.kunci, k.nilai);
            const kategori = z === null ? null : kategoriDariZ(k.indeks, z);

            if (kategori !== k.kategori) {
                beda.push(
                    `${k.indeks}/${k.jk} kunci ${k.kunci} nilai ${k.nilai}: acuan "${k.kategori}", client "${kategori}"`,
                );
            }
        }

        assert.equal(
            beda.length,
            0,
            `kategori berbeda:\n${beda.slice(0, 10).join('\n')}`,
        );
    });
});

describe('regresi: kunci dibandingkan pada satu desimal', () => {
    // Penyimpangan yang ditemukan saat menutup migrasi. Client dulu
    // membandingkan pecahan mentah, sehingga tinggi 70,04 cm diinterpolasi 8%
    // ke arah baris 70,5 — sementara server memakai baris 70,0 apa adanya.
    // Pratinjau yang dilihat kader karena itu berbeda dari angka yang
    // akhirnya tersimpan.
    test('tinggi 70,04 cm memakai baris 70,0, bukan interpolasi', () => {
        const baris70 = cariLms(tabel, 'BB_TB', 'P', 70);
        const hampir70 = cariLms(tabel, 'BB_TB', 'P', 70.04);

        assert.notEqual(baris70, null);
        assert.deepEqual(hampir70, baris70);
    });

    test('tinggi 70,3 cm tetap diinterpolasi', () => {
        const baris70 = cariLms(tabel, 'BB_TB', 'P', 70);
        const baris705 = cariLms(tabel, 'BB_TB', 'P', 70.5);
        const antara = cariLms(tabel, 'BB_TB', 'P', 70.3);

        assert.notEqual(antara, null);
        assert.ok(antara!.m > baris70!.m);
        assert.ok(antara!.m < baris705!.m);
    });
});

describe('tabel dan rumus', () => {
    test('berat sama dengan median memberi z nol', () => {
        const lms = cariLms(tabel, 'BB_U', 'L', 0);

        assert.notEqual(lms, null);
        assert.ok(dekat(dariLms(lms!, lms!.m) ?? NaN, 0));
    });

    test('nilaiPadaZ adalah kebalikan dariLms', () => {
        const lms = cariLms(tabel, 'TB_U', 'P', 24);
        assert.notEqual(lms, null);

        for (const z of [-3, -2, -1, 0, 1, 2, 3]) {
            assert.ok(
                dekat(dariLms(lms!, nilaiPadaZ(lms!, z)) ?? NaN, z, 1e-8),
                `tidak kembali ke z = ${z}`,
            );
        }
    });

    test('umur memakai bulan penuh, tidak diinterpolasi', () => {
        const umur12 = cariLms(tabel, 'BB_U', 'L', 12);
        const umur12Koma7 = cariLms(tabel, 'BB_U', 'L', 12.7);

        assert.notEqual(umur12, null);
        assert.equal(umur12Koma7?.m, umur12?.m);
    });

    test('panjang 70,25 cm berada tepat di tengah 70,0 dan 70,5', () => {
        const p70 = cariLms(tabel, 'BB_TB', 'P', 70);
        const p705 = cariLms(tabel, 'BB_TB', 'P', 70.5);
        const p7025 = cariLms(tabel, 'BB_TB', 'P', 70.25);

        assert.notEqual(p7025, null);
        assert.ok(dekat(p7025!.m, (p70!.m + p705!.m) / 2, 1e-12));
    });

    test('di luar rentang tabel hasilnya kosong, tidak diekstrapolasi', () => {
        assert.equal(cariLms(tabel, 'BB_TB', 'P', 200), null);
        assert.equal(cariLms(tabel, 'BB_U', 'L', 200), null);
    });

    test('koreksi ekstrem WHO berlaku pada BB/TB di luar +3 SD', () => {
        const lms = cariLms(tabel, 'BB_TB', 'L', 90);
        assert.notEqual(lms, null);

        const beratDi4Sd = nilaiPadaZ(lms!, 4);
        const mentah = dariLms(lms!, beratDi4Sd) ?? NaN;
        const dikoreksi = hitungZ(tabel, 'BB_TB', 'L', 90, beratDi4Sd) ?? NaN;

        assert.ok(!dekat(mentah, dikoreksi, 1e-6), 'seharusnya dikoreksi');
        assert.ok(dikoreksi > 3, 'hasil koreksi tetap di atas +3 SD');
    });

    test('TB/U tidak dikoreksi di luar ±3 SD', () => {
        const lms = cariLms(tabel, 'TB_U', 'L', 30);
        assert.notEqual(lms, null);

        const tinggiDi4Sd = nilaiPadaZ(lms!, 4);

        assert.ok(
            dekat(hitungZ(tabel, 'TB_U', 'L', 30, tinggiDi4Sd) ?? NaN, 4, 1e-8),
        );
    });

    test('nilai ukur mustahil tidak menghasilkan angka', () => {
        assert.equal(hitungZ(tabel, 'BB_U', 'L', 12, 0), null);
        assert.equal(hitungZ(tabel, 'BB_U', 'L', 12, -3), null);
        assert.equal(hitungZ(tabel, 'BB_U', 'L', 12, NaN), null);
        assert.equal(hitungZ(tabel, 'BB_U', 'L', NaN, 9), null);
        assert.equal(hitungZ(tabel, 'BB_U', 'L', 12, Infinity), null);
    });

    test('berat di bawah median memberi z negatif', () => {
        const lms = cariLms(tabel, 'BB_U', 'P', 24);
        assert.notEqual(lms, null);

        assert.ok((hitungZ(tabel, 'BB_U', 'P', 24, lms!.m * 0.8) ?? 0) < 0);
    });
});

/** Ambang PMK 2/2020, diperiksa tepat di titik batasnya. */
const AMBANG: [Indeks, number, string | null][] = [
    ['BB_U', -3.01, 'Berat badan sangat kurang'],
    ['BB_U', -3, 'Berat badan kurang'],
    ['BB_U', -2, 'Berat badan normal'],
    ['BB_U', 1, 'Berat badan normal'],
    ['BB_U', 1.01, 'Risiko berat badan lebih'],
    ['TB_U', -3.01, 'Sangat pendek'],
    ['TB_U', -2.5, 'Pendek'],
    ['TB_U', 3, 'Normal'],
    ['TB_U', 3.01, 'Tinggi'],
    ['BB_TB', -3.01, 'Gizi buruk'],
    ['BB_TB', -2.5, 'Gizi kurang'],
    ['BB_TB', 0, 'Gizi baik'],
    ['BB_TB', 1.5, 'Berisiko gizi lebih'],
    ['BB_TB', 2.5, 'Gizi lebih'],
    ['BB_TB', 3.01, 'Obesitas'],
    ['LIKA_U', -2.01, 'Mikrosefali'],
    ['LIKA_U', 0, 'Normal'],
    ['LIKA_U', 2.01, 'Makrosefali'],
    ['LILA_U', 0, null],
];

describe('ambang kategori', () => {
    for (const [indeks, z, harap] of AMBANG) {
        test(`${indeks} pada z ${z} adalah ${harap ?? 'tanpa label'}`, () => {
            assert.equal(kategoriDariZ(indeks, z), harap);
        });
    }
});

describe('label dikenali status-gizi-badge', () => {
    // Tanpa pemeriksaan ini, satu label yang berubah ejaan akan diam-diam
    // jatuh ke nada netral: chip abu bertuliskan "Gizi buruk".
    const badge = readFileSync(
        join(AKAR, 'client', 'src', 'components', 'status-gizi-badge.tsx'),
        'utf8',
    );
    const dikenal = new Set(
        [
            ...badge.matchAll(
                /^ {4}'?([A-Za-z/ ]+?)'?: '(?:merah|oranye|hijau|biru|netral)'/gm,
            ),
        ].map((m) => m[1]),
    );

    test('daftar nada di badge terbaca', () => {
        assert.ok(dikenal.size > 10, `hanya ${dikenal.size} nada terbaca`);
    });

    for (const label of new Set(
        AMBANG.map(([, , harap]) => harap).filter((h) => h !== null),
    )) {
        test(`nada untuk "${label}" dikenal`, () => {
            assert.ok(dikenal.has(label));
        });
    }
});
