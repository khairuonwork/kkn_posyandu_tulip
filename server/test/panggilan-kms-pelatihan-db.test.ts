import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { siapkanSinkronisasiDb } from './helpers/sinkronisasi-db.ts';

test('migrasi meja KMS menyesuaikan sesi pelatihan yang sudah aktif', { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const db = await siapkanSinkronisasiDb();
    const id = randomUUID();
    const skema = `latihan_${id.replaceAll('-', '')}`;
    try {
        await db.pool.query(`CREATE SCHEMA "${skema}"`);
        await db.pool.query(`CREATE TABLE "${skema}".antrean_layanan (id text PRIMARY KEY, periode_id integer, tanggal date, status text)`);
        await db.pool.query(`CREATE TABLE "${skema}".pengguna_posyandu (id integer)`);
        await db.pool.query('INSERT INTO pelatihan_sesi(id, skema, periode_id, dibuat_oleh, jumlah_sasaran) VALUES ($1,$2,$3,$4,1)', [id, skema, db.grup[0].periodeId, db.grup[0].pengguna.id]);
        const sql = readFileSync(new URL('../db/migrations/034_panggilan_kms_pelatihan.sql', import.meta.url), 'utf8');
        await db.pool.query(sql);
        await db.pool.query(sql);
        const columns = await db.pool.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2', [skema, 'antrean_layanan']);
        assert.ok(columns.rows.some(row => row.column_name === 'meja_kms'));
        assert.ok(columns.rows.some(row => row.column_name === 'tiba_kms'));
        await db.pool.query(`INSERT INTO "${skema}".antrean_layanan (id, periode_id, tanggal, status, meja_kms) VALUES ('q',1,'2026-10-10','waiting',1)`);
        await db.pool.query(`INSERT INTO "${skema}".panggilan_kms (antrean_id, nomor, meja) VALUES ('q',1,1)`);
        await assert.rejects(db.pool.query(`INSERT INTO "${skema}".antrean_layanan (id, periode_id, tanggal, status, meja_kms) VALUES ('q2',1,'2026-10-10','waiting',1)`));
    } finally {
        await db.pool.query(`DROP SCHEMA IF EXISTS "${skema}" CASCADE`);
        await db.tutup();
    }
});
