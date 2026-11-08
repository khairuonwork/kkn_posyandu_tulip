import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import express from 'express';
import type { Pool } from 'pg';
import { ruteAntrean } from '../src/http/antrean-controller.ts';
import type { PenggunaAktif } from '../src/auth/peran.ts';

type Query = { text: string; values: unknown[] };

function poolTiruan(jawab: (q: Query) => unknown[]) {
    const log: Query[] = [];
    const klien = {
        query: async (text: string, values: unknown[] = []) => {
            const q = { text, values };
            log.push(q);
            return { rows: jawab(q) };
        },
        release: () => {},
    };
    return { pool: { connect: async () => klien, query: klien.query } as unknown as Pool, log };
}

async function kirim(pool: Pool, method: string, path: string, body: unknown) {
    const pengguna: PenggunaAktif = { id: 3, peran: 'kader', rt: null, aktif: true, superAdmin: true };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.pengguna = pengguna; next(); });
    app.use(ruteAntrean(pool));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    try {
        const res = await fetch(`http://127.0.0.1:${address.port}${path}`, {
            method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
        });
        return res.status;
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    }
}

const baris = { id: 'antrean_20261109_7', status: 'waiting' };

test('check-in baru memakai nomor kosong terkecil, bukan max(nomor)+1', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('FROM sasaran s')) return [{ id: 7, rt: '01' }];
        if (q.text.includes('generate_series')) return [{ nomor: 3 }];
        if (q.text.includes('coalesce(max(urutan)')) return [{ urutan: 8 }];
        if (q.text.includes('WHERE q.id=$1')) return [baris];
        return [];
    });
    assert.equal(await kirim(pool, 'POST', '/antrean', { periodeId: 2, sasaranId: 7, tanggal: '2026-11-09' }), 201);
    const nomor = log.find(q => q.text.includes('generate_series'));
    assert.ok(nomor, 'nomor dihitung dari nomor yang belum dipegang');
    assert.match(nomor.text, /status<>'cancelled'/);
    const insert = log.find(q => q.text.includes('INSERT INTO antrean_layanan'));
    assert.equal(insert?.values[4], 3, 'nomor A03 yang dibatalkan dipakai lagi');
    assert.equal(insert?.values[5], 9, 'urutan panggil tetap mengikuti waktu datang');
});

test('check-in ulang anak yang batal mendapat nomor kosong baru', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('FROM sasaran s')) return [{ id: 7, rt: '01' }];
        if (q.text.includes('SELECT status FROM antrean_layanan')) return [{ status: 'cancelled' }];
        if (q.text.includes('generate_series')) return [{ nomor: 2 }];
        if (q.text.includes('coalesce(max(urutan)')) return [{ urutan: 5 }];
        if (q.text.includes('WHERE q.id=$1')) return [baris];
        return [];
    });
    assert.equal(await kirim(pool, 'POST', '/antrean', { periodeId: 2, sasaranId: 7, tanggal: '2026-11-09' }), 201);
    const update = log.find(q => q.text.includes("SET status='waiting'"));
    assert.match(update!.text, /nomor=\$5/);
    assert.equal(update!.values[4], 2);
});

test('PATCH mengaktifkan antrean batal mengambil kunci hari dan nomor kosong', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('SELECT periode_id AS "periodeId"')) return [{ periodeId: 2, tanggal: '2026-11-09', status: 'cancelled' }];
        if (q.text.includes('FOR UPDATE OF q')) return [{ periodeId: 2, tanggal: '2026-11-09', rt: '01', status: 'cancelled' }];
        if (q.text.includes('generate_series')) return [{ nomor: 4 }];
        if (q.text.includes('coalesce(max(urutan)')) return [{ urutan: 6 }];
        if (q.text.includes('RETURNING q.id')) return [{ id: baris.id }];
        if (q.text.includes('WHERE q.id=$1')) return [baris];
        return [];
    });
    assert.equal(await kirim(pool, 'PATCH', `/antrean/${baris.id}`, { status: 'waiting' }), 200);
    const kunci = log.findIndex(q => q.text.includes('pg_advisory_xact_lock'));
    const kunciBaris = log.findIndex(q => q.text.includes('FOR UPDATE OF q'));
    assert.ok(kunci >= 0 && kunci < kunciBaris, 'kunci hari diambil sebelum mengunci baris');
    const update = log.find(q => q.text.includes('RETURNING q.id'));
    assert.equal(update!.values[5], 4);
});

test('PATCH biasa tidak mengubah nomor', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('SELECT periode_id AS "periodeId"')) return [{ periodeId: 2, tanggal: '2026-11-09', status: 'waiting' }];
        if (q.text.includes('FOR UPDATE OF q')) return [{ periodeId: 2, tanggal: '2026-11-09', rt: '01', status: 'waiting' }];
        if (q.text.includes('RETURNING q.id')) return [{ id: baris.id }];
        if (q.text.includes('WHERE q.id=$1')) return [baris];
        return [];
    });
    assert.equal(await kirim(pool, 'PATCH', `/antrean/${baris.id}`, { status: 'cancelled' }), 200);
    assert.equal(log.some(q => q.text.includes('generate_series')), false);
    assert.equal(log.find(q => q.text.includes('RETURNING q.id'))!.values[5], null);
});

test('migrasi 031 hanya mewajibkan nomor unik untuk antrean yang tidak batal', () => {
    const sql = readFileSync(new URL('../db/migrations/031_nomor_antrean_dapat_dipakai_ulang.sql', import.meta.url), 'utf8');
    assert.match(sql, /UNIQUE \(periode_id, tanggal, nomor\)/);
    assert.match(sql, /WHERE status <> ''cancelled''/);
    assert.match(sql, /current_schema\(\)/);
    assert.match(sql, /pelatihan_sesi/);
});
