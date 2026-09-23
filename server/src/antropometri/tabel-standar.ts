/**
 * Tabel standar LMS WHO dan pencariannya.
 *
 * Port dari `app/Support/Antropometri/Lms.php` dan `StandarLmsRepository.php`.
 *
 * Perbedaan susunan yang disengaja: di PHP, pencarian dan interpolasi tinggal
 * di dalam repository yang membaca basis data. Di sini keduanya dipisah —
 * `TabelStandar` murni dan tidak tahu apa-apa soal Postgres, sedangkan
 * `StandarLmsRepository` hanya bertugas memuat barisnya. Pemisahan itu bukan
 * selera: interpolasi adalah bagian paling rawan dari seluruh mesin, dan
 * mengujinya tidak boleh menuntut basis data yang menyala.
 *
 * @see docs/rujukan/antropometri.md bagian 3 dan 6
 */

import type { Indeks, JenisKelamin } from './indeks.ts';
import { SIFAT } from './indeks.ts';

/** Tiga parameter distribusi rujukan WHO untuk satu titik pada satu kurva. */
export type Lms = {
    readonly l: number;
    readonly m: number;
    readonly s: number;
};

/**
 * Interpolasi linear antara dua baris standar.
 *
 * Dipakai untuk indeks berkunci panjang/tinggi badan, yang tabelnya berlangkah
 * 0,5 cm sementara nilai ukur bisa jatuh di antaranya.
 */
export function interpolasiLms(bawah: Lms, atas: Lms, bobot: number): Lms {
    return {
        l: bawah.l + (atas.l - bawah.l) * bobot,
        m: bawah.m + (atas.m - bawah.m) * bobot,
        s: bawah.s + (atas.s - bawah.s) * bobot,
    };
}

export type BarisStandar = {
    indeks: Indeks;
    jk: JenisKelamin;
    kunci: number;
    l: number;
    m: number;
    s: number;
};

/**
 * Kunci peta berupa teks berformat tetap.
 *
 * Alasannya sama seperti di PHP: bilangan pecahan tidak dapat diandalkan
 * sebagai kunci, sehingga 12 dan 12.0 harus menjadi teks yang sama.
 */
function kunciKe(kunci: number): string {
    return kunci.toFixed(1);
}

type Kurva = {
    /** Kunci teks -> parameter. */
    baris: Map<string, Lms>;
    /** Kunci numerik, menaik. Dipakai mencari dua baris pengapit. */
    menaik: number[];
};

export class TabelStandar {
    readonly versi: string;

    readonly jumlahBaris: number;

    private readonly kurva: Map<string, Kurva>;

    constructor(baris: readonly BarisStandar[], versi: string) {
        this.versi = versi;
        this.jumlahBaris = baris.length;
        this.kurva = new Map();

        for (const b of baris) {
            const nama = `${b.indeks}|${b.jk}`;
            let kurva = this.kurva.get(nama);

            if (kurva === undefined) {
                kurva = { baris: new Map(), menaik: [] };
                this.kurva.set(nama, kurva);
            }

            kurva.baris.set(kunciKe(b.kunci), { l: b.l, m: b.m, s: b.s });
        }

        // Diurutkan di sini, bukan diandalkan dari urutan masukan. Di PHP urutan
        // menaik datang dari `ORDER BY kunci`; menyalin ketergantungan itu ke
        // sini berarti hasil pencarian bergantung pada urutan baris di basis
        // data, dan itu hal yang tidak perlu dipertaruhkan.
        for (const kurva of this.kurva.values()) {
            kurva.menaik = [...kurva.baris.keys()].map(Number).sort((a, b) => a - b);
        }
    }

    /**
     * Cari parameter LMS untuk satu titik kurva.
     *
     * Indeks berkunci umur memakai bulan penuh dan tidak diinterpolasi — tabel
     * WHO memang per bulan penuh. Indeks berkunci panjang/tinggi diinterpolasi
     * linear.
     *
     * Mengembalikan null bila kunci di luar rentang tabel; nilai tidak pernah
     * diekstrapolasi.
     */
    cari(indeks: Indeks, jk: JenisKelamin, kunci: number): Lms | null {
        const kurva = this.kurva.get(`${indeks}|${jk}`);

        if (kurva === undefined || kurva.menaik.length === 0) {
            return null;
        }

        if (SIFAT[indeks].kunciAdalahUmur) {
            // Dipotong ke bilangan bulat, bukan dibulatkan: umur 12,9 bulan
            // tetap bulan ke-12. Sama seperti `(float) (int) $kunci` di PHP.
            return kurva.baris.get(kunciKe(Math.trunc(kunci))) ?? null;
        }

        return this.interpolasi(kurva, kunci);
    }

    private interpolasi(kurva: Kurva, kunci: number): Lms | null {
        const tepat = kurva.baris.get(kunciKe(kunci));

        if (tepat !== undefined) {
            return tepat;
        }

        const { menaik } = kurva;
        const min = menaik[0];
        const max = menaik[menaik.length - 1];

        if (kunci < min || kunci > max) {
            return null;
        }

        let bawah = min;
        for (const tersedia of menaik) {
            if (tersedia > kunci) {
                break;
            }
            bawah = tersedia;
        }

        let atas = bawah;
        for (const tersedia of menaik) {
            if (tersedia > bawah) {
                atas = tersedia;
                break;
            }
        }

        const barisBawah = kurva.baris.get(kunciKe(bawah));

        if (barisBawah === undefined) {
            return null;
        }

        if (atas === bawah) {
            return barisBawah;
        }

        const barisAtas = kurva.baris.get(kunciKe(atas));

        if (barisAtas === undefined) {
            return barisBawah;
        }

        return interpolasiLms(barisBawah, barisAtas, (kunci - bawah) / (atas - bawah));
    }
}
