/**
 * REST v1 untuk sumber daya anak Portal.
 *
 * GET /api/v1/anak
 * GET /api/v1/anak/:id
 * GET /api/v1/anak/:id/pengukuran
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { Pool } from 'pg';

import { wajibBoleh } from './middleware.ts';
import { daftar, GalatAnak, ambil, riwayat, simpanAnak, simpanPengukuran, sinkronisasi } from '../services/anak-service.ts';

function idDari(teks: string | string[] | undefined): number | null {
    if (typeof teks !== 'string') {
        return null;
    }

    const id = Number(teks);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function jawabGalat(galat: unknown, res: Response): void {
    if (galat instanceof GalatAnak) {
        res.status(galat.status).json({ galat: galat.message });

        return;
    }

    throw galat;
}

export function ruteAnak(pool: Pool): Router {
    const rute = Router();

    rute.get('/anak', wajibBoleh('lihat-anak'), async (req, res, next) => {
        try {
            const query = {
                cari: typeof req.query.cari === 'string' ? req.query.cari : undefined,
                halaman: typeof req.query.halaman === 'string' ? req.query.halaman : undefined,
                ukuran: typeof req.query.ukuran === 'string' ? req.query.ukuran : undefined,
            };
            res.json(await daftar(pool, req.pengguna!, query));
        } catch (galat) {
            try {
                jawabGalat(galat, res);
            } catch (takTerduga) {
                next(takTerduga);
            }
        }
    });

    rute.post('/anak', wajibBoleh('daftar-anak-lapangan'), async (req, res, next) => {
        try {
            res.status(201).json({ anak: await simpanAnak(pool, req.pengguna!, req.body) });
        } catch (galat) {
            try { jawabGalat(galat, res); } catch (takTerduga) { next(takTerduga); }
        }
    });

    rute.post('/pengukuran', wajibBoleh('catat-pengukuran-lapangan'), async (req, res, next) => {
        try {
            res.status(201).json({ pengukuran: await simpanPengukuran(pool, req.pengguna!, req.body) });
        } catch (galat) {
            try { jawabGalat(galat, res); } catch (takTerduga) { next(takTerduga); }
        }
    });

    rute.get('/sinkronisasi', wajibBoleh('lihat-anak'), async (req, res, next) => {
        try {
            res.json(await sinkronisasi(pool, req.pengguna!));
        } catch (galat) {
            next(galat);
        }
    });

    rute.get('/anak/:id', wajibBoleh('lihat-anak'), async (req, res, next) => {
        const id = idDari(req.params.id);
        if (id === null) {
            res.status(404).json({ galat: 'Anak tidak ditemukan.' });
            return;
        }

        try {
            res.json({ anak: await ambil(pool, req.pengguna!, id) });
        } catch (galat) {
            try {
                jawabGalat(galat, res);
            } catch (takTerduga) {
                next(takTerduga);
            }
        }
    });

    rute.get('/anak/:id/pengukuran', wajibBoleh('lihat-kms'), async (req, res, next) => {
        const id = idDari(req.params.id);
        if (id === null) {
            res.status(404).json({ galat: 'Anak tidak ditemukan.' });
            return;
        }

        try {
            res.json(await riwayat(pool, req.pengguna!, id));
        } catch (galat) {
            try {
                jawabGalat(galat, res);
            } catch (takTerduga) {
                next(takTerduga);
            }
        }
    });

    return rute;
}
