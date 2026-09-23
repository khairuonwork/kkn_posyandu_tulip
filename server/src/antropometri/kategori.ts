/**
 * Pemetaan z-score menjadi kategori status gizi menurut PMK No. 2 Tahun 2020.
 *
 * Port dari `app/Support/Antropometri/Kategori.php`.
 *
 * Metode perhitungannya WHO LMS, tetapi ambang pembacaannya tetap Permenkes —
 * keduanya memang memakai ambang yang sama, sehingga label pada laporan cocok
 * dengan yang diharapkan Puskesmas.
 *
 * @see docs/rujukan/antropometri.md bagian 4
 */

import type { Indeks } from './indeks.ts';

function beratMenurutUmur(z: number): string {
    if (z < -3) return 'Berat badan sangat kurang';
    if (z < -2) return 'Berat badan kurang';
    if (z <= 1) return 'Berat badan normal';

    return 'Risiko berat badan lebih';
}

function tinggiMenurutUmur(z: number): string {
    if (z < -3) return 'Sangat pendek';
    if (z < -2) return 'Pendek';
    if (z <= 3) return 'Normal';

    return 'Tinggi';
}

function beratMenurutTinggi(z: number): string {
    if (z < -3) return 'Gizi buruk';
    if (z < -2) return 'Gizi kurang';
    if (z <= 1) return 'Gizi baik';
    if (z <= 2) return 'Berisiko gizi lebih';
    if (z <= 3) return 'Gizi lebih';

    return 'Obesitas';
}

function lingkarKepala(z: number): string {
    if (z < -2) return 'Mikrosefali';
    if (z <= 2) return 'Normal';

    return 'Makrosefali';
}

/**
 * Mengembalikan null untuk LILA/U: PMK 2/2020 menyediakan tabel standarnya,
 * tetapi label kategorinya belum dikonfirmasi pemilik program (OI-04).
 * Menebak label pada indeks gizi akut bukan pilihan yang aman.
 */
export function kategoriDari(indeks: Indeks, z: number): string | null {
    switch (indeks) {
        case 'BB_U':
            return beratMenurutUmur(z);
        case 'TB_U':
            return tinggiMenurutUmur(z);
        case 'BB_TB':
        case 'IMT_U':
            return beratMenurutTinggi(z);
        case 'LIKA_U':
            return lingkarKepala(z);
        case 'LILA_U':
            return null;
    }
}

/** Kategori yang menuntut tindak lanjut, dipakai Beranda dan daftar rujukan. */
export const PERLU_TINDAK_LANJUT: readonly string[] = [
    'Berat badan sangat kurang',
    'Berat badan kurang',
    'Sangat pendek',
    'Pendek',
    'Gizi buruk',
    'Gizi kurang',
    'Obesitas',
];
