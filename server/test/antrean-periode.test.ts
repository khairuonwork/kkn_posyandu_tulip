import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import type { Pool } from 'pg';
import { ruteAntrean } from '../src/http/antrean-controller.ts';

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
        req.pengguna = { id: 1, peran: 'kms', rt: null, aktif: true };
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
        assert.deepEqual(calls, [[2026, 10], [28, '2026-10-09', null]]);
        calls.length = 0;
        assert.equal((await fetch(`${url}?periodeId=28&tanggal=2026-10-09`)).status, 200);
        assert.deepEqual(calls, [[28, '2026-10-09', null]]);
        assert.equal((await fetch(`${url}?periodeId=2026-13&tanggal=2026-10-09`)).status, 400);
        assert.equal((await fetch(`${url}?periodeId=2026-11&tanggal=2026-10-09`)).status, 404);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});
