/**
 * Rute autentikasi.
 *
 * Controller hanya membaca permintaan dan menyusun jawaban. Keputusan ada di
 * `services/auth-service.ts`, aturannya di `auth/`.
 */

import { Router } from 'express';
import type { Pool } from 'pg';

import { GalatMasuk, keluar, masuk } from '../services/auth-service.ts';
import { catatBerhasil, catatGagal, sisaTahanan } from './batas-masuk.ts';
import { bacaCookie, hapusCookieSesi, NAMA_COOKIE_SESI, pasangCookieSesi } from './cookie.ts';
import { wajibMasuk } from './middleware.ts';

function alamat(ip: string | undefined): string {
    return ip ?? 'tidak-diketahui';
}

export function ruteAuth(pool: Pool): Router {
    const rute = Router();

    rute.post('/masuk', (req, res, next) => {
        const email = typeof req.body?.email === 'string' ? req.body.email : '';
        const kataSandi = typeof req.body?.kataSandi === 'string' ? req.body.kataSandi : '';

        if (email === '' || kataSandi === '') {
            res.status(400).json({ galat: 'Email dan kata sandi wajib diisi' });

            return;
        }

        const ip = alamat(req.ip);
        const tahan = sisaTahanan(email, ip);

        if (tahan > 0) {
            res.set('Retry-After', String(tahan))
                .status(429)
                .json({ galat: `Terlalu banyak percobaan. Coba lagi dalam ${tahan} detik.` });

            return;
        }

        masuk(pool, email, kataSandi)
            .then((hasil) => {
                catatBerhasil(email, ip);
                pasangCookieSesi(res, hasil.token);

                res.json({ pengguna: hasil.pengguna });
            })
            .catch((galat: unknown) => {
                if (!(galat instanceof GalatMasuk)) {
                    next(galat);

                    return;
                }

                // Akun nonaktif ikut dihitung sebagai kegagalan: tanpa itu,
                // akun yang dinonaktifkan menjadi sasaran tebakan tanpa batas.
                catatGagal(email, ip);

                res.status(401).json({ galat: galat.message });
            });
    });

    rute.post('/keluar', (req, res, next) => {
        const token = bacaCookie(req.headers.cookie, NAMA_COOKIE_SESI);

        // Cookie selalu dihapus, bahkan bila sesinya sudah tidak ada. Keluar
        // yang gagal karena "sudah keluar" hanya membingungkan.
        hapusCookieSesi(res);

        if (token === null || token === '') {
            res.status(204).end();

            return;
        }

        keluar(pool, token)
            .then(() => res.status(204).end())
            .catch(next);
    });

    rute.get('/saya', wajibMasuk, (req, res) => {
        res.json({ pengguna: req.pengguna });
    });

    return rute;
}
