/**
 * Rute autentikasi.
 *
 * Controller hanya membaca permintaan dan menyusun jawaban. Keputusan ada di
 * `services/auth-service.ts`, aturannya di `auth/`.
 */

import { Router } from 'express';
import type { Pool } from 'pg';

import * as penggunaRepo from '../repositories/pengguna-repository.ts';
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
        // Dirapikan di sini: papan ketik tablet kerap menambah spasi di ujung.
        const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
        const kataSandi = typeof req.body?.kataSandi === 'string' ? req.body.kataSandi : '';

        if (username === '' || kataSandi === '') {
            res.status(400).json({ galat: 'Nama pengguna dan kata sandi wajib diisi' });

            return;
        }

        const ip = alamat(req.ip);
        const tahan = sisaTahanan(username, ip);

        if (tahan > 0) {
            res.set('Retry-After', String(tahan))
                .status(429)
                .json({ galat: `Terlalu banyak percobaan. Coba lagi dalam ${tahan} detik.` });

            return;
        }

        masuk(pool, username, kataSandi)
            .then((hasil) => {
                catatBerhasil(username, ip);
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
                catatGagal(username, ip);

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

    // Nama dan nama pengguna untuk kartu akun di sidebar. Dibaca di sini, bukan
    // di middleware sesi: setiap permintaan lain cukup tahu peran dan RT-nya.
    rute.get('/saya', wajibMasuk, async (req, res) => {
        const akun = req.pengguna && (await penggunaRepo.ambil(pool, req.pengguna.id));

        if (!akun) {
            res.status(401).json({ galat: 'Sesi tidak berlaku' });

            return;
        }

        res.json({ pengguna: { ...req.pengguna, nama: akun.nama, username: akun.username } });
    });

    return rute;
}
