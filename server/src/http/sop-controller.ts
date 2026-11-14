import { Router } from 'express';
import { fileURLToPath } from 'node:url';

import type { Peran } from '../auth/peran.ts';
import { wajibMasuk } from './middleware.ts';

const dokumenSop: { id: string; judul: string; android: boolean; peran: Peran[] }[] = [
    { id: 'kader-pendaftaran', judul: 'SOP Kader Pendaftaran', android: true, peran: ['kader', 'bidan', 'admin'] },
    { id: 'kader-pencatatan', judul: 'SOP Kader Pencatatan', android: true, peran: ['kader', 'bidan', 'admin'] },
    { id: 'kms', judul: 'SOP KMS', android: false, peran: ['kms', 'admin'] },
    { id: 'admin', judul: 'SOP Admin Posyandu', android: false, peran: ['admin'] },
];

const folderSop = fileURLToPath(new URL('../../sop/', import.meta.url));

export function ruteSop(): Router {
    const router = Router();

    router.use((_req, res, next) => {
        res.set('Cache-Control', 'private, no-store');
        next();
    });
    router.use(wajibMasuk);

    router.get('/', (req, res) => {
        const peran = req.pengguna!.peran;
        res.json(dokumenSop
            .filter((sop) => sop.peran.includes(peran))
            .map(({ id, judul, android }) => ({ id, judul, android })));
    });

    router.get('/:id', (req, res) => {
        const sop = dokumenSop.find(({ id }) => id === req.params.id);
        if (sop === undefined) {
            res.status(404).json({ galat: 'SOP tidak ditemukan' });
            return;
        }
        if (!sop.peran.includes(req.pengguna!.peran)) {
            res.status(403).json({ galat: 'Tidak berhak membuka SOP ini' });
            return;
        }

        const nama = `${sop.id}.pdf`;
        res.set('Content-Disposition', `inline; filename="${nama}"`);
        res.sendFile(nama, { root: folderSop, cacheControl: false });
    });

    return router;
}
