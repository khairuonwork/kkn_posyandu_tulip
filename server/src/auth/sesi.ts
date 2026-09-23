/**
 * Token sesi.
 *
 * Sesi disimpan di basis data, bukan di dalam token. Alasannya satu dan
 * menentukan: sesi harus bisa **dicabut seketika**. Ketika seorang kader
 * dinonaktifkan Admin di layar Pengaturan, akses yang sedang berjalan harus
 * langsung mati — token yang memuat klaimnya sendiri tidak bisa melakukan itu
 * tanpa daftar cabutan, yang ujungnya tetap basis data.
 *
 * Yang dikirim ke peramban adalah token acak; yang disimpan hanya
 * ringkasannya. Salinan basis data yang bocor karena itu tidak berisi satu pun
 * sesi yang bisa dipakai.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const PANJANG_TOKEN = 32;

/**
 * Umur sesi.
 *
 * 12 jam, bukan berminggu-minggu: Portal dipakai di laptop yang berpindah
 * tangan antar kader pada satu hari kegiatan, dan sesi yang hidup sampai pekan
 * depan berarti siapa pun yang membuka laptop itu masuk sebagai orang terakhir
 * yang memakainya.
 */
export const UMUR_SESI_MS = 12 * 60 * 60 * 1000;

export type SesiBaru = {
    /** Dikirim ke peramban. Tidak pernah disimpan. */
    token: string;
    /** Disimpan di basis data. Tidak pernah dikirim. */
    ringkasan: string;
    kedaluwarsa: Date;
};

export function buatSesi(sekarang: Date = new Date()): SesiBaru {
    const token = randomBytes(PANJANG_TOKEN).toString('base64url');

    return {
        token,
        ringkasan: ringkasanToken(token),
        kedaluwarsa: new Date(sekarang.getTime() + UMUR_SESI_MS),
    };
}

/**
 * SHA-256, bukan scrypt.
 *
 * Token sudah 256 bit acak, jadi tidak ada yang bisa ditebak dengan kamus —
 * yang dibutuhkan hanya peringkas satu arah yang cepat. Memakai scrypt di sini
 * berarti membayar 33 MB memori pada **setiap permintaan**.
 */
export function ringkasanToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

export function sudahKedaluwarsa(kedaluwarsa: Date, sekarang: Date = new Date()): boolean {
    return kedaluwarsa.getTime() <= sekarang.getTime();
}

/**
 * Perbandingan ringkasan dengan waktu tetap.
 *
 * Pencarian sesi memang lewat indeks basis data, tetapi tiap perbandingan yang
 * dilakukan di sini tetap dibuat tidak bocor waktu — biayanya nol dan
 * kebiasaannya yang penting.
 */
export function ringkasanCocok(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');

    if (bufA.length !== bufB.length || bufA.length === 0) {
        return false;
    }

    return timingSafeEqual(bufA, bufB);
}
