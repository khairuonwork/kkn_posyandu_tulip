import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import type { Pool } from 'pg';

import { ringkasanToken } from '../src/auth/sesi.ts';
import { buatApp } from '../src/http/app.ts';

test('daftar dan PDF SOP memakai hak akses sesi yang sama', async () => {
    const izin = {
        kader: ['kader-pendaftaran', 'kader-pencatatan'],
        bidan: ['kader-pendaftaran', 'kader-pencatatan'],
        kms: ['kms'],
        admin: ['kader-pendaftaran', 'kader-pencatatan', 'kms', 'admin'],
    };
    const sesi = new Map(Object.keys(izin).map((peran) => [ringkasanToken(peran), peran]));
    const pool = {
        async query(sql: string, [ringkasan]: [string]) {
            assert.match(sql, /FROM sesi s/);
            const peran = sesi.get(ringkasan);
            return {
                rows: peran === undefined
                    ? []
                    : [{ id: 1, peran, aktif: true, rt: null, posyanduIds: [1], superAdmin: false }],
            };
        },
    } as unknown as Pool;
    const server = buatApp(pool).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sop`;

    try {
        assert.equal((await fetch(url)).status, 401);
        assert.equal((await fetch(url + '/admin')).status, 401);
        for (const [peran, bolehBuka] of Object.entries(izin)) {
            const ambil = (path: string) => fetch(url + path, {
                headers: { Cookie: `sesi=${peran}` },
            });
            const daftar = await ambil('');
            assert.equal(daftar.status, 200);
            const dokumen = await daftar.json() as { id: string; android: boolean }[];
            assert.deepEqual(dokumen.map(({ id }) => id), bolehBuka);
            assert.ok(dokumen.every(({ id, android }) => android === id.startsWith('kader-')));
            assert.equal((await ambil('/tidak-ada')).status, 404);

            for (const id of izin.admin) {
                const pdf = await ambil('/' + id);
                assert.equal(pdf.status, bolehBuka.includes(id) ? 200 : 403, `${peran} / ${id}`);
                if (pdf.ok) {
                    assert.equal(pdf.headers.get('content-type'), 'application/pdf');
                    assert.match(pdf.headers.get('content-disposition') ?? '', /^inline/);
                    assert.equal(pdf.headers.get('cache-control'), 'private, no-store');
                    assert.deepEqual(
                        Buffer.from(await pdf.arrayBuffer()),
                        await readFile(new URL(`../sop/${id}.pdf`, import.meta.url)),
                    );
                }
            }
        }
    } finally {
        await new Promise<void>((resolve, reject) => {
            server.close((error) => error ? reject(error) : resolve());
        });
    }
});
