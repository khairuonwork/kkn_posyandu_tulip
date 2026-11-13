import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import express from 'express';
import { ruteAplikasi } from '../src/http/aplikasi-controller.ts';
import { terbitkanRilis } from '../src/services/rilis-aplikasi.ts';
import type { PenggunaAktif } from '../src/auth/peran.ts';

async function jalankan(folder: string, pengguna: PenggunaAktif | undefined, fn: (base: string) => Promise<void>) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.pengguna = pengguna; next(); });
    app.use('/api/v1', ruteAplikasi(folder));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    try { await fn(`http://127.0.0.1:${address.port}/api/v1`); } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    }
}

function folderUji() {
    const folder = mkdtempSync(path.join(os.tmpdir(), 'rilis-apk-'));
    const isi = Buffer.from('PK\u0003\u0004 apk uji');
    writeFileSync(path.join(folder, 'SIMPATIK-1.14.0-36.apk'), isi);
    writeFileSync(path.join(folder, 'rahasia.apk'), 'bukan rilis');
    return { folder, sha: createHash('sha256').update(isi).digest('hex'), ukuran: isi.length };
}

test('tanpa rilis, versi menjawab 404', async () => {
    const folder = mkdtempSync(path.join(os.tmpdir(), 'rilis-kosong-'));
    try {
        await jalankan(folder, undefined, async base => {
            assert.equal((await fetch(base + '/aplikasi/versi')).status, 404);
        });
    } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('rilis terbit memberi versi, checksum, dan unduhan publik hanya untuk berkas aktif', async () => {
    const { folder, sha, ukuran } = folderUji();
    try {
        await terbitkanRilis(folder, { versionCode: 36, versionName: '1.14.0', minVersionCode: 34, berkas: 'SIMPATIK-1.14.0-36.apk', catatan: 'Uji' });
        await jalankan(folder, undefined, async base => {
            const versi = await (await fetch(base + '/aplikasi/versi')).json() as Record<string, unknown>;
            assert.equal(versi.versionCode, 36);
            assert.equal(versi.minVersionCode, 34);
            assert.equal(versi.sha256, sha);
            assert.equal(versi.ukuran, ukuran);
            assert.equal(versi.unduh, '/aplikasi/unduh/SIMPATIK-1.14.0-36.apk');
            const unduh = await fetch(base + String(versi.unduh));
            assert.equal(unduh.status, 200);
            assert.equal(unduh.headers.get('content-type'), 'application/vnd.android.package-archive');
            assert.equal(createHash('sha256').update(Buffer.from(await unduh.arrayBuffer())).digest('hex'), sha);
            assert.equal((await fetch(base + '/aplikasi/unduh/rahasia.apk')).status, 404);
            assert.equal((await fetch(base + '/aplikasi/unduh/..%2Fmanifest.json')).status, 404);
        });
    } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('rilis menolak versionCode turun dan berkas yang tidak ada', async () => {
    const { folder } = folderUji();
    try {
        await terbitkanRilis(folder, { versionCode: 36, versionName: '1.14.0', berkas: 'SIMPATIK-1.14.0-36.apk' });
        await assert.rejects(terbitkanRilis(folder, { versionCode: 35, versionName: '1.13.9', berkas: 'SIMPATIK-1.14.0-36.apk' }), /lebih rendah/);
        await assert.rejects(terbitkanRilis(folder, { versionCode: 37, versionName: '1.15', berkas: 'tidak-ada.apk' }), /tidak ada/);
        await assert.rejects(terbitkanRilis(folder, { versionCode: 37, versionName: '1.15', berkas: '../luar.apk' }), /tidak valid/);
    } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('POST rilis hanya untuk superadmin', async () => {
    const { folder } = folderUji();
    const body = JSON.stringify({ versionCode: 36, versionName: '1.14.0', berkas: 'SIMPATIK-1.14.0-36.apk', minVersionCode: 30 });
    const kirim = (base: string) => fetch(base + '/aplikasi/rilis', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    try {
        await jalankan(folder, undefined, async base => assert.equal((await kirim(base)).status, 401));
        await jalankan(folder, { id: 1, peran: 'admin', rt: null, aktif: true, superAdmin: false }, async base => assert.equal((await kirim(base)).status, 403));
        await jalankan(folder, { id: 1, peran: 'admin', rt: null, aktif: true, superAdmin: true }, async base => {
            const res = await kirim(base);
            assert.equal(res.status, 201);
            assert.equal(((await res.json()) as { rilis: { minVersionCode: number } }).rilis.minVersionCode, 30);
        });
    } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('daftar server publik hanya memuat alamat HTTPS /api/v1 yang valid', async () => {
    const { daftarServerPublik } = await import('../src/http/aplikasi-controller.ts');
    assert.deepEqual(daftarServerPublik({ SERVER_PUBLIK: ' https://a.example/api/v1/ ,http://b.example/api/v1,https://a.example/api/v1,javascript:x,https://c.example/api/v1' }),
        ['https://a.example/api/v1', 'https://c.example/api/v1']);
    assert.deepEqual(daftarServerPublik({}), []);
    const folder = mkdtempSync(path.join(os.tmpdir(), 'rilis-server-'));
    try {
        const app = express();
        app.use('/api/v1', ruteAplikasi(folder, ['https://kembar.example/api/v1']));
        const server = app.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const address = server.address();
        assert.ok(address && typeof address !== 'string');
        try {
            const body = await (await fetch(`http://127.0.0.1:${address.port}/api/v1/aplikasi/server`)).json() as { server: string[] };
            assert.deepEqual(body.server, ['https://kembar.example/api/v1']);
        } finally {
            server.closeAllConnections();
            await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
        }
    } finally { rmSync(folder, { recursive: true, force: true }); }
});
