import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { buatApp } from '../src/http/app.ts';

test('WebView tablet dapat mengirim header perangkat saat login; origin web lain tetap dibatasi', async () => {
    const pool = {
        query() { throw new Error('Preflight tidak boleh mengakses database'); },
    } as unknown as Pool;
    const server = buatApp(pool).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/masuk`;
    try {
        const requested = ['content-type', 'ngrok-skip-browser-warning', 'x-simpatik-device-id'];
        const response = await fetch(url, {
            method: 'OPTIONS',
            headers: {
                Origin: 'null',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': requested.join(', '),
            },
        });
        assert.equal(response.status, 204);
        assert.equal(response.headers.get('access-control-allow-origin'), 'null');
        const allowed = (response.headers.get('access-control-allow-headers') ?? '')
            .toLowerCase().split(',').map(value => value.trim());
        for (const header of requested) assert.ok(allowed.includes(header), `${header} ditolak`);
        assert.ok((response.headers.get('access-control-allow-methods') ?? '').includes('POST'));

        const untrusted = await fetch(url, {
            method: 'OPTIONS',
            headers: { Origin: 'https://contoh.invalid', 'Access-Control-Request-Method': 'POST' },
        });
        assert.equal(untrusted.headers.get('access-control-allow-origin'), null);
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
});
