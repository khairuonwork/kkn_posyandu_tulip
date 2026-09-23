/**
 * Menjalankan berkas SQL di db/migrations menurut urutan namanya.
 *
 * Tiap berkas berjalan di dalam satu transaksi dan dicatat di tabel `migrasi`,
 * sehingga menjalankan ulang perintah ini tidak mengulang yang sudah masuk.
 *
 * Tanpa pustaka migrasi: yang dibutuhkan hanya "jalankan berkas yang belum
 * pernah dijalankan", dan itu muat di satu berkas. Bila nanti perlu rollback
 * per langkah atau migrasi bercabang, barulah pustaka sepadan harganya.
 *
 *     node --env-file=.env db/migrate.ts
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { dapatkanPool, tutupPool } from '../src/db/pool.ts';

const DIREKTORI = join(import.meta.dirname, 'migrations');

async function jalankan(): Promise<void> {
    const pool = dapatkanPool();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS migrasi (
            nama        text PRIMARY KEY,
            dijalankan  timestamptz NOT NULL DEFAULT now()
        )
    `);

    const sudah = new Set(
        (await pool.query<{ nama: string }>('SELECT nama FROM migrasi')).rows.map((r) => r.nama),
    );

    const berkas = readdirSync(DIREKTORI)
        .filter((f) => f.endsWith('.sql'))
        .sort();

    let dijalankan = 0;

    for (const nama of berkas) {
        if (sudah.has(nama)) {
            continue;
        }

        const sql = readFileSync(join(DIREKTORI, nama), 'utf8');
        const klien = await pool.connect();

        try {
            await klien.query('BEGIN');
            await klien.query(sql);
            await klien.query('INSERT INTO migrasi (nama) VALUES ($1)', [nama]);
            await klien.query('COMMIT');

            console.log(`  dijalankan  ${nama}`);
            dijalankan++;
        } catch (galat) {
            await klien.query('ROLLBACK');
            throw new Error(`Migrasi ${nama} gagal: ${(galat as Error).message}`, { cause: galat });
        } finally {
            klien.release();
        }
    }

    console.log(
        dijalankan === 0
            ? `Tidak ada migrasi baru; ${sudah.size} sudah terpasang.`
            : `${dijalankan} migrasi dijalankan.`,
    );
}

try {
    await jalankan();
} finally {
    await tutupPool();
}
