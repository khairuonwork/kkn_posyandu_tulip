/**
 * Aturan isian akun untuk endpoint Pengguna dan peran.
 *
 * Murni, tanpa basis data — sama seperti aturan lain di folder ini. Yang butuh
 * basis data (nama pengguna unik, RT yang ada, admin aktif terakhir) diperiksa
 * di `services/pengguna-service.ts`.
 */

import type { Peran } from './peran.ts';
import { SEMUA_PERAN } from './peran.ts';

/** Sama dengan batas di `db/buat-pengguna.ts` dan `db/ganti-sandi.ts`. */
export const SANDI_MINIMAL = 8;

/**
 * Sama dengan CHECK `pengguna_username_sah` di migrasi 006. Diperiksa di sini
 * lebih dulu supaya pesannya menyebut aturannya, bukan nama constraint.
 */
export const POLA_USERNAME = /^[a-z0-9._-]{3,32}$/;

export const ATURAN_USERNAME =
    'Nama pengguna 3–32 karakter tanpa spasi: huruf, angka, titik, garis bawah, atau tanda hubung. Contoh: kader01.';

export type IsianAkun = {
    nama: string;
    username: string;
    peran: Peran;
    /** Hanya bermakna untuk kader; selain kader selalu null. */
    rt: string | null;
    aktif: boolean;
};

export type HasilBacaAkun = { isian: IsianAkun; kataSandi: string | null } | { galat: string };

/**
 * Membaca badan permintaan menjadi isian yang bersih.
 *
 * Tanpa `lama`, seluruh kolom wajib dikirim, termasuk kata sandi awal. Dengan
 * `lama`, kolom yang tidak dikirim mempertahankan nilai lamanya, dan kata
 * sandi kosong berarti tidak diganti.
 */
export function bacaIsianAkun(badan: unknown, lama?: IsianAkun): HasilBacaAkun {
    const b = typeof badan === 'object' && badan !== null ? (badan as Record<string, unknown>) : {};
    const teks = (kunci: string) =>
        typeof b[kunci] === 'string' ? (b[kunci] as string).trim() : undefined;

    const nama = teks('nama') ?? lama?.nama ?? '';
    // Huruf kecil dipaksakan, bukan ditolak: "Kader01" dari papan ketik tablet
    // yang otomatis berhuruf besar tetap berarti kader01.
    const username = (teks('username') ?? lama?.username ?? '').toLowerCase();
    const peran = typeof b.peran === 'string' ? b.peran : lama?.peran;
    const aktif = typeof b.aktif === 'boolean' ? b.aktif : (lama?.aktif ?? true);
    const rt = 'rt' in b ? (teks('rt') || null) : (lama?.rt ?? null);
    const kataSandi =
        typeof b.kataSandi === 'string' && b.kataSandi !== '' ? b.kataSandi : null;

    if (nama === '' || username === '') {
        return { galat: 'Nama lengkap dan nama pengguna harus diisi.' };
    }

    if (nama.length > 120) {
        return { galat: 'Nama lengkap terlalu panjang, maksimal 120 huruf.' };
    }

    if (!POLA_USERNAME.test(username)) {
        return { galat: ATURAN_USERNAME };
    }

    if (peran === undefined || !SEMUA_PERAN.includes(peran as Peran)) {
        return { galat: 'Peran harus kader, bidan, admin, atau KMS.' };
    }

    // Aturan yang sama dengan CHECK di basis data, diperiksa lebih awal supaya
    // pesannya menyebut sebabnya, bukan nama constraint.
    if (peran === 'kader' && rt === null) {
        return { galat: 'Kader wajib punya RT binaan.' };
    }

    if (lama === undefined && kataSandi === null) {
        return { galat: 'Kata sandi awal wajib diisi.' };
    }

    if (kataSandi !== null && kataSandi.length < SANDI_MINIMAL) {
        return { galat: `Kata sandi minimal ${SANDI_MINIMAL} karakter.` };
    }

    return {
        isian: {
            nama,
            username,
            peran: peran as Peran,
            // Bidan dan admin melihat seluruh RW; RT binaan tidak berarti apa-apa.
            rt: peran === 'kader' ? rt : null,
            aktif,
        },
        kataSandi,
    };
}
