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
import { boleh } from '../auth/peran.ts';
import { dariToken } from '../services/auth-service.ts';
import { bacaCookie, NAMA_COOKIE_SESI } from './cookie.ts';

export function sesiMiddleware(pool: Pool): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction) => {
        const token = bacaCookie(req.headers.cookie, NAMA_COOKIE_SESI);

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
export function wajibBoleh(aksi: Aksi): RequestHandler {
    return (req, res, next) => {
        if (req.pengguna === undefined) {
            res.status(401).json({ galat: 'Belum masuk' });

            return;
        }

        if (!boleh(req.pengguna.peran, aksi)) {
            res.status(403).json({ galat: 'Tidak berhak' });

            return;
        }

        next();
    };
}

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
