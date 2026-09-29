/**
 * Rute kelola akun, seluruhnya khusus admin (`kelola-akun`).
 *
 *     GET   /api/pengguna        daftar akun dan pilihan RT binaan
 *     POST  /api/pengguna        akun baru, dengan kata sandi awal
 *     PATCH /api/pengguna/:id    ubah akun; kata sandi kosong berarti tetap
 *
 * Tidak ada DELETE: akun dinonaktifkan, bukan dihapus, supaya jejak audit
 * tetap menyebut nama pelakunya.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Pool } from 'pg';

import { ringkasanToken } from '../auth/sesi.ts';
import { daftarAkun, GalatAkun, tambahAkun, ubahAkun } from '../services/pengguna-service.ts';
import { bacaCookie, NAMA_COOKIE_SESI } from './cookie.ts';
import { wajibBoleh } from './middleware.ts';

/** `wajibBoleh` sudah memastikan permintaan ini milik pengguna yang masuk. */
function pelaku(req: Request): number {
    if (req.pengguna === undefined) {
        throw new Error('Rute kelola akun dipanggil tanpa wajibBoleh.');
    }

    return req.pengguna.id;
}

/** Galat aturan diteruskan apa adanya; selebihnya ke penangan galat umum. */
function jawabGalat(galat: unknown, res: Response): void {
    if (!(galat instanceof GalatAkun)) {
        throw galat;
    }

    res.status(galat.status).json({ galat: galat.message });
}

export function rutePengguna(pool: Pool): Router {
    const rute = Router();
    const khususAdmin = wajibBoleh('kelola-akun');

    rute.get('/pengguna', khususAdmin, async (_req, res) => {
        res.json(await daftarAkun(pool));
    });

    rute.post('/pengguna', khususAdmin, async (req, res) => {
        try {
            res.status(201).json({ pengguna: await tambahAkun(pool, pelaku(req), req.body) });
        } catch (galat) {
            jawabGalat(galat, res);
        }
    });

    rute.patch('/pengguna/:id', khususAdmin, async (req, res) => {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            res.status(404).json({ galat: 'Pengguna tidak ditemukan.' });

            return;
        }

        const token = bacaCookie(req.headers.cookie, NAMA_COOKIE_SESI);

        try {
            res.json({
                pengguna: await ubahAkun(
                    pool,
                    pelaku(req),
                    id,
                    req.body,
                    token === null || token === '' ? null : ringkasanToken(token),
                ),
            });
        } catch (galat) {
            jawabGalat(galat, res);
        }
    });

    return rute;
}
