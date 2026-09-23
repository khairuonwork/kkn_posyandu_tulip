/**
 * Server HTTP.
 *
 *     npm run dev     — pengembangan, memuat ulang saat berkas berubah
 *     npm run mulai   — menjalankan apa adanya
 *
 * `buatApp` dipisah dari `listen` supaya pengujian dapat menyalakan server di
 * porta acak tanpa pustaka uji HTTP tambahan.
 */

import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import type { Pool } from 'pg';

import { ruteAuth } from './auth-controller.ts';
import { sesiMiddleware, wajibJson } from './middleware.ts';

export function buatApp(pool: Pool): Express {
    const app = express();

    // Di balik proxy Vite saat pengembangan, dan kemungkinan di balik proxy
    // lain saat produksi. Tanpa ini `req.ip` selalu alamat proxy-nya, dan
    // pembatas percobaan masuk kehilangan artinya.
    app.set('trust proxy', 'loopback');
    app.disable('x-powered-by');

    app.use(express.json({ limit: '100kb' }));
    app.use(wajibJson);
    app.use(sesiMiddleware(pool));

    app.use('/api', ruteAuth(pool));

    app.use('/api', (_req: Request, res: Response) => {
        res.status(404).json({ galat: 'Rute tidak ada' });
    });

    // Galat tak terduga tidak boleh bocor ke pemanggil: pesan pustaka basis
    // data kerap memuat potongan query beserta nilainya.
    app.use((galat: Error, _req: Request, res: Response, _next: NextFunction) => {
        console.error(galat);

        if (!res.headersSent) {
            res.status(500).json({ galat: 'Terjadi kesalahan di server' });
        }
    });

    return app;
}

/**
 * 4321, bukan 3000.
 *
 * Port 3000 adalah port pengembangan paling ramai di mesin mana pun, dan pada
 * Windows tabrakannya tidak berbunyi: proses kedua tetap dapat mengikat port
 * yang sama, mengaku siap, lalu permintaan mendarat di aplikasi yang lain.
 * Gejalanya jauh dari sebabnya — jawaban yang tidak dikenali, dari server yang
 * tidak pernah kita tulis.
 *
 * Diikat ke 127.0.0.1 saja: server pengembangan tidak perlu terjangkau dari
 * jaringan sekitar.
 */
const PORTA_BAWAAN = 4321;
const ALAMAT = '127.0.0.1';

if (import.meta.filename === process.argv[1]) {
    const { dapatkanPool } = await import('../db/pool.ts');
    const porta = Number(process.env.PORT ?? PORTA_BAWAAN);
    const server = buatApp(dapatkanPool()).listen(porta, ALAMAT, () => {
        console.log(`Server siap di http://${ALAMAT}:${porta}`);
    });

    server.on('error', (galat: NodeJS.ErrnoException) => {
        if (galat.code === 'EADDRINUSE') {
            console.error(
                `Porta ${porta} sudah dipakai proses lain. Setel PORT di server/.env ke porta lain.`,
            );
            process.exit(1);
        }

        throw galat;
    });
}
