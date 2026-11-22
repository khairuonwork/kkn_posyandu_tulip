/**
 * Hitungan pembatas masuk bertahan melewati restart server (tabel
 * `percobaan_masuk`). Berjalan di skema sementara yang dihapus lagi.
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import pg from 'pg';

import {
    BEBAS_GAGAL,
    kosongkanBatas,
    mulaiPercobaan,
    muatBatas,
    tungguSimpan,
} from '../src/http/batas-masuk.ts';

const adaDb = process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== '';

test(
    'hitungan tetap berlaku setelah restart, dan baris kedaluwarsa dibuang',
    { skip: adaDb ? false : 'DATABASE_URL tidak diatur — lihat server/.env.example' },
    async () => {
        const skema = 'uji_batas_masuk_' + randomUUID().replaceAll('-', '');
        const induk = new pg.Pool({ connectionString: process.env.DATABASE_URL });
        await induk.query(`CREATE SCHEMA ${skema}`);
        const pool = new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            options: `-c search_path=${skema}`,
        });

        try {
            await pool.query(
                readFileSync(new URL('../db/migrations/039_percobaan_masuk.sql', import.meta.url), 'utf8'),
            );
            await pool.query(
                `INSERT INTO percobaan_masuk VALUES ('akun|lama', 3, now() - interval '2 days', now() - interval '1 day')`,
            );

            await muatBatas(pool);
            assert.equal((await pool.query(`SELECT 1 FROM percobaan_masuk WHERE kunci = 'akun|lama'`)).rowCount, 0);

            const sekarang = Date.now();

            for (let i = 0; i < BEBAS_GAGAL; i += 1) {
                assert.equal(mulaiPercobaan('kader01', '203.0.113.5', null, sekarang).boleh, true);
            }

            await tungguSimpan();

            const { rows } = await pool.query<{ gagal: number }>(
                `SELECT gagal FROM percobaan_masuk WHERE kunci = 'akun|kader01'`,
            );
            assert.equal(rows[0]?.gagal, BEBAS_GAGAL);

            // Proses lama berhenti: hitungan di memori hilang, tabelnya tetap.
            kosongkanBatas();
            await muatBatas(pool);

            assert.equal(mulaiPercobaan('kader01', '198.51.100.1', null, sekarang + 1000).boleh, false);
        } finally {
            await tungguSimpan();
            await pool.end();
            assert.match(skema, /^uji_batas_masuk_[a-f0-9]{32}$/);
            await induk.query(`DROP SCHEMA ${skema} CASCADE`);
            await induk.end();
        }
    },
);
