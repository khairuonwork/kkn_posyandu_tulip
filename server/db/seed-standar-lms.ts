/**
 * Mengisi tabel `standar_lms` dari database/data/who-lms.json.
 *
 * Port dari `database/seeders/StandarLmsSeeder.php`. Berkas JSON adalah sumber
 * kebenaran yang ikut di-commit; berkas Excel asalnya berada di luar repo dan
 * bukan dependensi runtime.
 *
 * Bersifat idempotent: dijalankan dua kali tidak menggandakan baris.
 *
 *     node --env-file=.env db/seed-standar-lms.ts
 *
 * @see database/data/extract-who-lms.py
 * @see docs/rujukan/antropometri.md bagian 5
 */

import { bacaBerkasStandar } from '../src/antropometri/sumber-standar.ts';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';

async function jalankan(): Promise<void> {
    const { versi, baris } = bacaBerkasStandar();
    const pool = dapatkanPool();

    // Satu perintah untuk seluruh 906 baris: nilainya dibongkar dari enam larik
    // sejajar, bukan dari 906 pasang placeholder.
    const hasil = await pool.query(
        `
        INSERT INTO standar_lms (versi, indeks, jk, kunci, l, m, s)
        SELECT $1, * FROM unnest(
            $2::varchar[], $3::char[], $4::numeric[],
            $5::numeric[], $6::numeric[], $7::numeric[]
        )
        ON CONFLICT ON CONSTRAINT standar_lms_unik
        DO UPDATE SET l = EXCLUDED.l, m = EXCLUDED.m, s = EXCLUDED.s
        `,
        [
            versi,
            baris.map((b) => b.indeks),
            baris.map((b) => b.jk),
            baris.map((b) => b.kunci),
            baris.map((b) => b.l),
            baris.map((b) => b.m),
            baris.map((b) => b.s),
        ],
    );

    const { rows } = await pool.query<{ jumlah: number }>(
        'SELECT count(*)::int AS jumlah FROM standar_lms WHERE versi = $1',
        [versi],
    );

    console.log(`${hasil.rowCount} baris standar ${versi} disimpan; total kini ${rows[0].jumlah}.`);

    if (rows[0].jumlah !== baris.length) {
        throw new Error(
            `Jumlah baris tidak cocok: berkas ${baris.length}, basis data ${rows[0].jumlah}.`,
        );
    }
}

try {
    await jalankan();
} finally {
    await tutupPool();
}
