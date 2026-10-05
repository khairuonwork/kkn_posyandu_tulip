/**
 * REST v1 untuk Lembar Hasil.
 *
 * POST /api/v1/lembar          — petugas membuat tautan (wajib masuk)
 * GET  /api/v1/lembar/:token   — orang tua membaca hasilnya (tanpa masuk)
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { Pool } from 'pg';

import { wajibBoleh } from './middleware.ts';
import { bacaLembar, buatTautan, GalatLembar } from '../services/lembar-service.ts';

function jawabGalat(galat: unknown, res: Response): void {
    if (galat instanceof GalatLembar) {
        res.status(galat.status).json({ galat: galat.message });

        return;
    }

    throw galat;
}

export function ruteLembar(pool: Pool): Router {
    const rute = Router();

    rute.post('/lembar', wajibBoleh('lihat-kms'), async (req, res, next) => {
        try {
            const badan = (req.body ?? {}) as Record<string, unknown>;

            res.status(201).json(
                await buatTautan(pool, req.pengguna!, badan.anakId, badan.periodeId),
            );
        } catch (galat) {
            try { jawabGalat(galat, res); } catch (takTerduga) { next(takTerduga); }
        }
    });

    rute.get('/lembar/:token', async (req, res, next) => {
        // Data kesehatan anak: jangan disimpan cache, jangan diindeks, dan
        // jangan bocor lewat header Referer ke tautan lain.
        res.set({
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
            'X-Robots-Tag': 'noindex, nofollow',
        });

        const token = req.params.token;

        if (typeof token !== 'string' || token.length > 400) {
            res.status(404).json({ galat: 'Tautan tidak sah.' });

            return;
        }

        try {
            res.json(await bacaLembar(pool, token));
        } catch (galat) {
            try { jawabGalat(galat, res); } catch (takTerduga) { next(takTerduga); }
        }
    });

    return rute;
}
