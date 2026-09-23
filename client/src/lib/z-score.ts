/**
 * Z-score LMS WHO di sisi peramban.
 *
 * Cermin dari `App\Support\Antropometri\ZScore` dan `StandarLmsRepository`,
 * dipakai satu tempat saja: pratinjau langsung di editor baris Data Anak, yang
 * harus memperbarui angka saat kader mengetik dan karena itu tidak bisa
 * menunggu perjalanan ke server.
 *
 * **Server tetap yang berwenang.** Saat disimpan, `PenilaianGiziService` yang
 * menghitung ulang dan nilainya itulah yang tersimpan. Yang di sini hanya
 * ditampilkan.
 *
 * Koreksi ekstrem WHO di luar ±3 SD ikut disalin, tidak disederhanakan: justru
 * di ekor itulah gizi buruk dan obesitas berada, sehingga pratinjau tanpa
 * koreksi akan meleset tepat pada rentang yang menentukan tindakan.
 *
 * @see docs/rujukan/antropometri.md bagian 2
 */

import type { Indeks, JenisKelamin } from '@/types/posyandu';

export type BarisLms = {
    indeks: Indeks;
    jk: JenisKelamin;
    /** Umur dalam bulan penuh, atau panjang/tinggi dalam cm. */
    kunci: number;
    l: number;
    m: number;
    s: number;
};

/** Ambang praktis untuk "L sama dengan nol"; pecahan tidak dibandingkan persis. */
const EPSILON_L = 1e-7;

/** Indeks berkunci umur — tabel WHO-nya per bulan penuh, tidak diinterpolasi. */
const KUNCI_UMUR: Record<Indeks, boolean> = {
    BB_U: true,
    TB_U: true,
    BB_TB: false,
    IMT_U: true,
    LILA_U: true,
    LIKA_U: true,
};

/** Indeks berbasis berat memakai koreksi ekstrem; TB/U tidak. */
const KOREKSI_EKSTREM: Record<Indeks, boolean> = {
    BB_U: true,
    TB_U: false,
    BB_TB: true,
    IMT_U: true,
    LILA_U: true,
    LIKA_U: false,
};

type Lms = { l: number; m: number; s: number };

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

/** Nilai ukur yang setara dengan satu z-score pada kurva ini. */
export function nilaiPadaZ(lms: Lms, z: number): number {
    if (Math.abs(lms.l) < EPSILON_L) {
        return lms.m * Math.exp(lms.s * z);
    }

    return lms.m * (1 + lms.l * lms.s * z) ** (1 / lms.l);
}

/** Ekstrapolasi linear WHO di luar ±3 SD, tempat distribusi LMS goyah. */
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
 * Kunci "INDEKS|JK" -> baris terurut menaik. Disusun sekali per tabel; daftar
 * 906 baris tidak layak dipindai ulang setiap ketukan papan tombol.
 */
export type TabelLms = Map<string, BarisLms[]>;

export function susunTabel(baris: BarisLms[]): TabelLms {
    const tabel: TabelLms = new Map();

    for (const b of baris) {
        const kunci = `${b.indeks}|${b.jk}`;
        const daftar = tabel.get(kunci);

        if (daftar === undefined) {
            tabel.set(kunci, [b]);
        } else {
            daftar.push(b);
        }
    }

    for (const daftar of tabel.values()) {
        daftar.sort((a, b) => a.kunci - b.kunci);
    }

    return tabel;
}

/**
 * Kunci dibandingkan pada satu desimal, bukan sebagai pecahan mentah.
 *
 * Ini menyalin `kunciKe()` di `server/src/antropometri/tabel-standar.ts`, yang
 * sendirinya port setia dari `number_format($kunci, 1)` pada implementasi PHP.
 * Tanpa pembulatan ini, tinggi 70,04 cm diinterpolasi 8% ke arah baris 70,5 di
 * peramban sementara server memakai baris 70,0 apa adanya — pratinjau yang
 * dilihat kader berbeda dari angka yang akhirnya tersimpan.
 */
function kunciKe(kunci: number): string {
    return kunci.toFixed(1);
}

/**
 * Parameter LMS untuk satu titik kurva.
 *
 * Indeks berkunci umur dibulatkan ke bulan penuh; indeks berkunci panjang atau
 * tinggi diinterpolasi linear karena tabelnya berlangkah 0,5 cm. Di luar
 * rentang tabel hasilnya null — nilai tidak pernah diekstrapolasi.
 */
export function cariLms(
    tabel: TabelLms,
    indeks: Indeks,
    jk: JenisKelamin,
    kunci: number,
): Lms | null {
    const daftar = tabel.get(`${indeks}|${jk}`);

    if (daftar === undefined || daftar.length === 0) {
        return null;
    }

    if (KUNCI_UMUR[indeks]) {
        const bulan = kunciKe(Math.trunc(kunci));

        return daftar.find((b) => kunciKe(b.kunci) === bulan) ?? null;
    }

    // Kecocokan tepat diperiksa pada satu desimal lebih dulu, sebelum rentang
    // dan interpolasi — urutan yang sama dengan server.
    const tepat = daftar.find((b) => kunciKe(b.kunci) === kunciKe(kunci));

    if (tepat !== undefined) {
        return tepat;
    }

    if (kunci < daftar[0].kunci || kunci > daftar[daftar.length - 1].kunci) {
        return null;
    }

    let atas = daftar.findIndex((b) => b.kunci >= kunci);

    if (daftar[atas].kunci === kunci) {
        return daftar[atas];
    }

    if (atas === 0) {
        atas = 1;
    }

    const a = daftar[atas - 1];
    const b = daftar[atas];
    const bobot = (kunci - a.kunci) / (b.kunci - a.kunci);

    return {
        l: a.l + (b.l - a.l) * bobot,
        m: a.m + (b.m - a.m) * bobot,
        s: a.s + (b.s - a.s) * bobot,
    };
}

/**
 * Z-score satu indeks, atau null bila baris standar tidak ada atau nilai
 * ukurnya tidak masuk akal. Status gizi yang salah lebih berbahaya daripada
 * yang kosong.
 */
export function hitungZ(
    tabel: TabelLms,
    indeks: Indeks,
    jk: JenisKelamin,
    kunci: number,
    nilai: number,
): number | null {
    if (!Number.isFinite(nilai) || nilai <= 0 || !Number.isFinite(kunci)) {
        return null;
    }

    const lms = cariLms(tabel, indeks, jk, kunci);

    if (lms === null) {
        return null;
    }

    const z = dariLms(lms, nilai);

    if (z === null || !Number.isFinite(z)) {
        return null;
    }

    if (KOREKSI_EKSTREM[indeks] && Math.abs(z) > 3) {
        return koreksiEkstrem(lms, nilai, z);
    }

    return z;
}
