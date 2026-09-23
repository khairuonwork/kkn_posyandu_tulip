/**
 * Perhitungan z-score dengan metode LMS WHO.
 *
 * Port dari `app/Support/Antropometri/ZScore.php`.
 *
 * @see docs/rujukan/antropometri.md bagian 2
 * @see docs/adr/0002-metode-z-score-who-lms.md
 */

import type { Indeks, JenisKelamin } from './indeks.ts';
import { SIFAT } from './indeks.ts';
import type { Lms, TabelStandar } from './tabel-standar.ts';

/**
 * Ambang praktis untuk "L sama dengan nol". Perbandingan kesamaan langsung
 * pada bilangan pecahan tidak dapat diandalkan.
 */
const EPSILON_L = 1e-7;

/** Z = ((X/M)^L − 1) / (L·S), atau ln(X/M)/S ketika L mendekati nol. */
export function dariLms(lms: Lms, nilai: number): number | null {
    if (lms.m <= 0 || lms.s <= 0) {
        return null;
    }

    if (Math.abs(lms.l) < EPSILON_L) {
        return Math.log(nilai / lms.m) / lms.s;
    }

    return ((nilai / lms.m) ** lms.l - 1) / (lms.l * lms.s);
}

/** Nilai ukur yang setara dengan z-score tertentu pada kurva ini. */
export function nilaiPadaZ(lms: Lms, z: number): number {
    if (Math.abs(lms.l) < EPSILON_L) {
        return lms.m * Math.exp(lms.s * z);
    }

    return lms.m * (1 + lms.l * lms.s * z) ** (1 / lms.l);
}

/**
 * Ekstrapolasi linear WHO di luar ±3 SD.
 *
 * Distribusi LMS menjadi tidak stabil di ekor, justru pada rentang tempat kasus
 * gizi buruk dan obesitas berada. Karena itu koreksi ini tidak boleh
 * disederhanakan.
 *
 * @see docs/rujukan/antropometri.md bagian 2.2
 */
function koreksiEkstrem(lms: Lms, nilai: number, z: number): number {
    if (z > 3) {
        const sd3 = nilaiPadaZ(lms, 3);
        const sd2 = nilaiPadaZ(lms, 2);

        return sd3 === sd2 ? z : 3 + (nilai - sd3) / (sd3 - sd2);
    }

    const sd3 = nilaiPadaZ(lms, -3);
    const sd2 = nilaiPadaZ(lms, -2);

    return sd2 === sd3 ? z : -3 + (nilai - sd3) / (sd2 - sd3);
}

/**
 * Mengembalikan null bila baris standar tidak tersedia atau nilai ukur tidak
 * masuk akal. Status gizi yang salah lebih berbahaya daripada yang kosong.
 */
export function hitungZ(
    tabel: TabelStandar,
    indeks: Indeks,
    jk: JenisKelamin,
    kunci: number,
    nilai: number,
): number | null {
    if (nilai <= 0) {
        return null;
    }

    const lms = tabel.cari(indeks, jk, kunci);

    if (lms === null) {
        return null;
    }

    const z = dariLms(lms, nilai);

    if (z === null) {
        return null;
    }

    if (SIFAT[indeks].pakaiKoreksiEkstrem && Math.abs(z) > 3) {
        return koreksiEkstrem(lms, nilai, z);
    }

    return z;
}
