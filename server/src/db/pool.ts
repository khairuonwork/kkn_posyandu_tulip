/**
 * Sambungan PostgreSQL.
 *
 * Satu pool untuk seluruh proses. `DATABASE_URL` dibaca dari lingkungan; tidak
 * ada nilai bawaan yang menunjuk basis data sungguhan, supaya perintah yang
 * dijalankan tanpa konfigurasi berhenti dengan pesan jelas alih-alih menulis ke
 * tempat yang tidak disengaja.
 */

import pg from 'pg';

/**
 * `numeric` dikembalikan sebagai string oleh driver, karena tidak semuanya muat
 * di bilangan pecahan JavaScript. Kolom numerik di skema ini semuanya muat —
 * yang terpanjang lima desimal — dan seluruh mesin gizi bekerja dengan angka,
 * jadi konversinya dilakukan sekali di sini, bukan tersebar di tiap query.
 */
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);
pg.types.setTypeParser(pg.types.builtins.INT8, Number);

let pool: pg.Pool | null = null;

export function dapatkanPool(): pg.Pool {
    if (pool !== null) {
        return pool;
    }

    const url = process.env.DATABASE_URL;

    if (url === undefined || url === '') {
        throw new Error('DATABASE_URL belum diatur. Salin .env.example menjadi .env.');
    }

    pool = new pg.Pool({ connectionString: url });

    return pool;
}

export async function tutupPool(): Promise<void> {
    if (pool !== null) {
        await pool.end();
        pool = null;
    }
}
