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

    const maksimum = Number(process.env.DB_POOL_MAX ?? 3);
    if (!Number.isSafeInteger(maksimum) || maksimum < 1 || maksimum > 50) {
        throw new Error('DB_POOL_MAX harus berupa bilangan bulat antara 1 dan 50.');
    }
    // Sisakan kapasitas Supabase untuk server lain dan pekerjaan administrasi.
    pool = new pg.Pool({
        connectionString: url,
        max: maksimum,
        connectionTimeoutMillis: 10_000,
        application_name: 'simpatik',
    });

    return pool;
}

export async function tutupPool(): Promise<void> {
    if (pool !== null) {
        await pool.end();
        pool = null;
    }
}
