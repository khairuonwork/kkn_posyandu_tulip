/**
 * Swauji z-score.ts terhadap tabel WHO yang sesungguhnya.
 *
 *     node --experimental-strip-types resources/js/lib/z-score.check.ts
 *
 * Tanpa kerangka uji dan tanpa dependensi baru: berkas ini tidak diimpor
 * siapa pun, jadi ia tidak ikut ke dalam bundel. Pasangan PHP-nya,
 * tests/Feature/Antropometri/ZScoreTest.php, yang memegang golden master
 * terhadap berkas Z-Score Juni 2026; yang di sini memastikan salinan
 * peramban tidak menyimpang dari rumus yang sama.
 */

import { readFileSync } from 'node:fs';
import { kategoriDariZ } from './kategori.ts';
import {
    cariLms,
    dariLms,
    hitungZ,
    nilaiPadaZ,
    susunTabel,
} from './z-score.ts';
import type { BarisLms } from './z-score.ts';

const sumber = JSON.parse(
    readFileSync('database/data/who-lms.json', 'utf8'),
) as { baris: BarisLms[] };

const tabel = susunTabel(sumber.baris);

let gagal = 0;

function cek(nama: string, benar: boolean): void {
    if (!benar) {
        gagal += 1;
        console.error(`  GAGAL  ${nama}`);
    } else {
        console.log(`  ok     ${nama}`);
    }
}

function dekat(a: number, b: number, toleransi = 1e-9): boolean {
    return Math.abs(a - b) < toleransi;
}

// 1. Median tabel adalah z = 0, menurut definisi.
const bbu0 = cariLms(tabel, 'BB_U', 'L', 0);
cek('baris BB/U laki-laki umur 0 ada', bbu0 !== null);
cek(
    'berat sama dengan M memberi z = 0',
    bbu0 !== null && dekat(dariLms(bbu0, bbu0.m) ?? NaN, 0),
);

// 2. nilaiPadaZ adalah kebalikan dariLms, termasuk pada cabang logaritma L≈0.
for (const z of [-3, -2, -1, 0, 1, 2, 3]) {
    const lms = cariLms(tabel, 'TB_U', 'P', 24);
    cek(
        `nilaiPadaZ lalu dariLms kembali ke z = ${z}`,
        lms !== null && dekat(dariLms(lms, nilaiPadaZ(lms, z)) ?? NaN, z, 1e-8),
    );
}

// 3. Indeks berkunci umur memakai bulan penuh, tidak diinterpolasi.
const umur12 = cariLms(tabel, 'BB_U', 'L', 12);
const umur12Koma7 = cariLms(tabel, 'BB_U', 'L', 12.7);
cek(
    'umur 12,7 bulan memakai baris umur 12, bukan interpolasi',
    umur12 !== null && umur12Koma7 !== null && umur12.m === umur12Koma7.m,
);

// 4. Indeks berkunci panjang diinterpolasi linear di antara langkah 0,5 cm.
const p70 = cariLms(tabel, 'BB_TB', 'P', 70);
const p705 = cariLms(tabel, 'BB_TB', 'P', 70.5);
const p7025 = cariLms(tabel, 'BB_TB', 'P', 70.25);
cek(
    'panjang 70,25 cm berada tepat di tengah 70,0 dan 70,5',
    p70 !== null &&
        p705 !== null &&
        p7025 !== null &&
        dekat(p7025.m, (p70.m + p705.m) / 2, 1e-12),
);

// 5. Di luar rentang tabel hasilnya kosong, tidak pernah diekstrapolasi.
cek(
    'panjang 200 cm di luar tabel BB/TB',
    cariLms(tabel, 'BB_TB', 'P', 200) === null,
);
cek(
    'umur 200 bulan di luar tabel BB/U',
    cariLms(tabel, 'BB_U', 'L', 200) === null,
);

// 6. Koreksi ekstrem WHO berlaku pada indeks berbasis berat, tidak pada TB/U.
const bbtb = cariLms(tabel, 'BB_TB', 'L', 90);

if (bbtb !== null) {
    const beratDi4Sd = nilaiPadaZ(bbtb, 4);
    const mentah = dariLms(bbtb, beratDi4Sd) ?? NaN;
    const dikoreksi = hitungZ(tabel, 'BB_TB', 'L', 90, beratDi4Sd) ?? NaN;

    cek('BB/TB di atas +3 SD dikoreksi', !dekat(mentah, dikoreksi, 1e-6));
    cek('hasil koreksi tetap di atas +3 SD', dikoreksi > 3);
}

const tbu = cariLms(tabel, 'TB_U', 'L', 30);

if (tbu !== null) {
    const tinggiDi4Sd = nilaiPadaZ(tbu, 4);

    cek(
        'TB/U tidak dikoreksi di luar ±3 SD',
        dekat(hitungZ(tabel, 'TB_U', 'L', 30, tinggiDi4Sd) ?? NaN, 4, 1e-8),
    );
}

// 7. Nilai ukur mustahil tidak menghasilkan angka.
cek(
    'berat nol tidak menghasilkan z',
    hitungZ(tabel, 'BB_U', 'L', 12, 0) === null,
);
cek(
    'berat negatif tidak menghasilkan z',
    hitungZ(tabel, 'BB_U', 'L', 12, -3) === null,
);

// 8. Arah tandanya benar: di bawah median memberi z negatif.
const bbu24 = cariLms(tabel, 'BB_U', 'P', 24);
cek(
    'berat di bawah median memberi z negatif',
    bbu24 !== null && (hitungZ(tabel, 'BB_U', 'P', 24, bbu24.m * 0.8) ?? 0) < 0,
);

// 9. Ambang kategori PMK 2/2020, tepat di titik batasnya.
const ambang: [Parameters<typeof kategoriDariZ>[0], number, string | null][] = [
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

for (const [indeks, z, harap] of ambang) {
    cek(
        `${indeks} pada z ${z} adalah ${harap ?? 'tanpa label'}`,
        kategoriDariZ(indeks, z) === harap,
    );
}

// 10. Setiap label yang bisa keluar harus dikenali status-gizi-badge.tsx.
//     Tanpa cek ini, satu label yang berubah ejaan akan diam-diam jatuh ke nada
//     netral: chip abu bertuliskan "Gizi buruk".
const badge = readFileSync(
    'resources/js/components/status-gizi-badge.tsx',
    'utf8',
);
const dikenal = new Set(
    [
        ...badge.matchAll(
            /^ {4}'?([A-Za-z/ ]+?)'?: '(?:merah|oranye|hijau|biru|netral)'/gm,
        ),
    ].map((m) => m[1]),
);

cek('daftar nada di badge terbaca', dikenal.size > 10);

for (const [indeks, , harap] of ambang) {
    if (harap !== null) {
        cek(
            `nada untuk "${harap}" (${indeks}) dikenal badge`,
            dikenal.has(harap),
        );
    }
}

console.log(gagal === 0 ? '\nSemua lulus.' : `\n${gagal} gagal.`);
// exitCode, bukan process.exit: keluar paksa di Windows memicu assert libuv.
process.exitCode = gagal === 0 ? 0 : 1;
