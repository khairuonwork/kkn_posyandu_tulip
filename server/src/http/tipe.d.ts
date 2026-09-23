import type { PenggunaAktif } from '../auth/peran.ts';

/**
 * `req.pengguna` diisi `sesiMiddleware` bila cookie sesinya sah.
 *
 * `undefined` berarti belum masuk — bukan berarti ditolak. Penolakan adalah
 * urusan `wajibMasuk` dan `wajibBoleh`, supaya rute yang memang terbuka tidak
 * perlu tahu apa-apa soal sesi.
 */
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            pengguna?: PenggunaAktif;
        }
    }
}

export {};
