import { Router } from 'express';
import type { Pool } from 'pg';
import { wajibBoleh, wajibMasuk } from './middleware.ts';
import { bacaHeartbeat, daftarPerangkat, simpanHeartbeat } from '../services/perangkat-service.ts';

export function rutePerangkat(pool: Pool): Router {
    const rute = Router();
    rute.post('/heartbeat', wajibMasuk, async (req, res, next) => {
        const data = bacaHeartbeat(req.body);
        if (!data) { res.status(400).json({ galat: 'Identitas atau laporan perangkat tidak valid.' }); return; }
        try {
            const tersimpan = await simpanHeartbeat(pool, req.pengguna!, req.ip || req.socket.remoteAddress || '', data);
            if (!tersimpan) {
                res.status(409).json({ galat: 'Akun operasional harus terikat ke satu Posyandu.' });
                return;
            }
            res.set('Cache-Control', 'no-store');
            res.json({ ok: true, status: 'terhubung', waktuServer: new Date().toISOString() });
        } catch (galat) { next(galat); }
    });
    rute.get('/perangkat-terhubung', wajibBoleh('lihat-anak'), async (req, res, next) => {
        try {
            res.set('Cache-Control', 'no-store');
            res.json(await daftarPerangkat(pool, req.pengguna!));
        } catch (galat) { next(galat); }
    });
    return rute;
}
