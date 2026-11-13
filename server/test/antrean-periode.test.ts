import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import type { Pool } from 'pg';
import { ruteAntrean } from '../src/http/antrean-controller.ts';
import type { PenggunaAktif } from '../src/auth/peran.ts';

test('konfirmasi KMS menolak peran lain pada seluruh jalur penyelesaian', async () => {
    let pengguna: PenggunaAktif = {id: 1, peran: 'admin', rt: null, aktif: true, superAdmin: false};
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.pengguna = pengguna; next(); });
    app.use(ruteAntrean({} as Pool));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    try {
        for (const peran of ['kader', 'bidan', 'admin'] as const) {
            pengguna = {...pengguna, peran, superAdmin: false};
            for (const path of ['/antrean/salah/konfirmasi-kms', '/antrean/konfirmasi-semua-kms']) {
                const res = await fetch(base + path, {method:'POST',headers:{'content-type':'application/json'},body:'{}'});
                assert.equal(res.status, 403, `${peran} ${path}`);
            }
            const patch = await fetch(base + '/antrean/salah', {method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'done'})});
            assert.equal(patch.status, 403, `${peran} PATCH done`);
        }
        for (const p of [{peran:'kms' as const,superAdmin:false},{peran:'admin' as const,superAdmin:true}]) {
            pengguna = {...pengguna,...p};
            const res = await fetch(base + '/antrean/salah/konfirmasi-kms', {method:'POST',headers:{'content-type':'application/json'},body:'{}'});
            assert.equal(res.status, 400, `${p.peran} melewati otorisasi`);
        }
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});

test('KMS menerima periode portal dan mempertahankan ID tablet', async () => {
    const calls: unknown[][] = [];
    const pool = {
        async query(sql: string, values: unknown[]) {
            calls.push(values);
            if (sql.startsWith('SELECT id FROM periode')) {
                return { rows: values[1] === 10 ? [{ id: 28 }] : [] };
            }
            return { rows: [{ id: 'antrean_20261009_1', status: 'kms_review' }] };
        },
    } as unknown as Pool;
    const app = express();
    app.use((req, _res, next) => {
        req.pengguna = { id: 1, peran: 'kms', rt: null, aktif: true, posyanduIds: [7], superAdmin: false };
        next();
    });
    app.use(ruteAntrean(pool));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const url = `http://127.0.0.1:${address.port}/antrean`;
    try {
        const portal = await fetch(`${url}?periodeId=2026-10&tanggal=2026-10-09`);
        assert.equal(portal.status, 200);
        const body = await portal.json() as { items: { status: string }[] };
        assert.equal(body.items[0].status, 'kms_review');
        // Query berikutnya menghitung prioritas KMS; periode dan daftar tetap dua query pertama.
        assert.deepEqual(calls.slice(0, 2), [[2026, 10, false, [7]], [28, '2026-10-09', false, [7]]]);
        calls.length = 0;
        assert.equal((await fetch(`${url}?periodeId=28&tanggal=2026-10-09`)).status, 200);
        assert.deepEqual(calls.slice(0, 1), [[28, '2026-10-09', false, [7]]]);
        assert.equal((await fetch(`${url}?periodeId=2026-13&tanggal=2026-10-09`)).status, 400);
        assert.equal((await fetch(`${url}?periodeId=2026-11&tanggal=2026-10-09`)).status, 404);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});
