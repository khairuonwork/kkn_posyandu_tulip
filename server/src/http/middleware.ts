/**
 * Penjaga di tingkat permintaan.
 *
 * Tiga lapis yang sengaja dipisah:
 *   `sesiMiddleware` mengenali — tidak pernah menolak
 *   `wajibMasuk`     menolak yang belum masuk
 *   `wajibBoleh`     menolak yang tidak berhak
 *
 * Pemisahan itu penting: rute yang terbuka tidak perlu tahu apa-apa soal sesi,
 * dan rute yang tertutup tidak bisa lupa memeriksanya.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Pool } from 'pg';

import type { Aksi } from '../auth/peran.ts';
import { boleh, kaderWebBolehLihat } from '../auth/peran.ts';
import { dariToken } from '../services/auth-service.ts';
import { bacaCookie, NAMA_COOKIE_SESI } from './cookie.ts';

/** Cookie untuk Portal, Bearer token untuk aplikasi tablet. */
export function tokenPermintaan(req: Request): string | null {
    const authorization = req.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
        const token = authorization.slice('Bearer '.length).trim();

        return token === '' ? null : token;
    }

    return bacaCookie(req.headers.cookie, NAMA_COOKIE_SESI);
}

export function sesiMiddleware(pool: Pool): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
        const token = tokenPermintaan(req);

        if (token === null || token === '') {
            next();

            return;
        }

        // Satu query berindeks per permintaan, tanpa cache. Itulah yang membuat
        // penonaktifan akun berlaku seketika.
        dariToken(pool, token)
            .then((pengguna) => {
                if (pengguna !== null) {
                    req.pengguna = pengguna;
                }

                next();
            })
            .catch(next);
    };
}

export const wajibMasuk: RequestHandler = (req, res, next) => {
    if (req.pengguna === undefined) {
        res.status(401).json({ galat: 'Belum masuk' });

        return;
    }

    next();
};

/**
 * Penegakan sungguhan matriks izin.
 *
 * UI juga menyembunyikan tombol yang tidak boleh dipakai, tetapi itu
 * kenyamanan — bukan pengamanan. Yang mengikat adalah baris ini.
 */
export function wajibBoleh(aksi: Aksi | readonly Aksi[]): RequestHandler {
    return (req, res, next) => {
        if (req.pengguna === undefined) {
            res.status(401).json({ galat: 'Belum masuk' });

            return;
        }

        const daftarAksi = Array.isArray(aksi) ? aksi : [aksi];
        const diizinkan = daftarAksi.some(a => boleh(req.pengguna!.peran, a, req.pengguna!.superAdmin));

        if (!diizinkan) {
            res.status(403).json({ galat: 'Tidak berhak' });

            return;
        }

        next();
    };
}

/** Portal web memakai cookie; aplikasi tablet memakai token Bearer. */
function lewatPortal(req: Request): boolean {
    return !req.headers.authorization?.startsWith('Bearer ');
}

/**
 * Data balita di web: kader hanya dengan centang izin dari admin. Tablet tetap
 * memakai `wajibBoleh` saja, karena kader di lapangan butuh daftar sasaran.
 */
export const wajibLihatDataWeb: RequestHandler = (req, res, next) => {
    if (req.pengguna !== undefined && lewatPortal(req) && !kaderWebBolehLihat(req.pengguna)) {
        res.status(403).json({ galat: 'Akun ini belum diberi izin melihat data balita.' });

        return;
    }

    next();
};

/** Di web kader hanya melihat; Laporan dan perubahan data balita bukan untuknya. */
export const tolakKaderWeb: RequestHandler = (req, res, next) => {
    if (req.pengguna?.peran === 'kader' && lewatPortal(req)) {
        res.status(403).json({ galat: 'Akun kader di web hanya dapat melihat data.' });

        return;
    }

    next();
};

/**
 * Permintaan yang mengubah data wajib berbadan JSON.
 *
 * Berpasangan dengan `SameSite=Lax`: formulir lintas situs hanya dapat
 * mengirim `application/x-www-form-urlencoded`, `multipart/form-data`, atau
 * `text/plain`, sehingga menolak selain JSON menutup jalur CSRF yang tersisa
 * tanpa perlu token tersendiri.
 */
export const wajibJson: RequestHandler = (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        next();

        return;
    }

    if (!req.is('application/json')) {
        res.status(415).json({ galat: 'Wajib application/json' });

        return;
    }

    next();
};
