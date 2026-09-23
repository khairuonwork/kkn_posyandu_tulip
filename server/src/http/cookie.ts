/**
 * Cookie sesi.
 *
 * Express punya `res.cookie()` bawaan untuk menulis, tetapi tidak punya
 * pengurai untuk membaca. Menambah `cookie-parser` demi satu cookie yang
 * isinya base64url — tanpa titik koma, koma, spasi, maupun tanda kutip —
 * berarti satu dependensi untuk sepuluh baris.
 */

import type { CookieOptions, Response } from 'express';

import { UMUR_SESI_MS } from '../auth/sesi.ts';

export const NAMA_COOKIE_SESI = 'sesi';

function opsi(): CookieOptions {
    return {
        httpOnly: true,
        // `lax`, bukan `strict`: `strict` membuat sesi tidak terbawa saat
        // pengguna tiba dari tautan luar, dan Portal tidak punya aksi berbahaya
        // yang dapat dipicu lintas situs lewat navigasi biasa.
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    };
}

export function pasangCookieSesi(res: Response, token: string): void {
    res.cookie(NAMA_COOKIE_SESI, token, { ...opsi(), maxAge: UMUR_SESI_MS });
}

export function hapusCookieSesi(res: Response): void {
    res.clearCookie(NAMA_COOKIE_SESI, opsi());
}

/**
 * Nilai satu cookie dari header mentah, atau null.
 *
 * Tidak mengurai bentuk berkutip maupun nilai yang memuat pemisah — token
 * sesi ini base64url, jadi keduanya tidak mungkin muncul.
 */
export function bacaCookie(header: string | undefined, nama: string): string | null {
    if (header === undefined || header === '') {
        return null;
    }

    for (const bagian of header.split(';')) {
        const pisah = bagian.indexOf('=');

        if (pisah === -1) {
            continue;
        }

        if (bagian.slice(0, pisah).trim() === nama) {
            return bagian.slice(pisah + 1).trim();
        }
    }

    return null;
}
