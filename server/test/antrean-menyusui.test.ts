import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import type { Pool } from 'pg';
import { ruteAntrean } from '../src/http/antrean-controller.ts';
import type { PenggunaAktif } from '../src/auth/peran.ts';

type Query = { text: string; values: unknown[] };

/** Pool tiruan: mencatat SQL tanpa database, cukup untuk memeriksa nilai yang diteruskan. */
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

async function jalankan(pool: Pool, pengguna: PenggunaAktif, fn: (base: string) => Promise<void>) {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.pengguna = pengguna; next(); });
    app.use(ruteAntrean(pool));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    try {
        await fn(`http://127.0.0.1:${address.port}`);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    }
}

const baris = { id: 'antrean_20261109_7', status: 'waiting' };

test('check-in menyimpan jawaban menyusui dan ASI eksklusif dari pendaftaran', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('FROM sasaran s')) return [{ id: 7, rt: '01' }];
        if (q.text.includes('generate_series')) return [{ nomor: 1 }];
        if (q.text.includes('coalesce(max(urutan)')) return [{ urutan: 0 }];
        if (q.text.includes('WHERE q.id=$1')) return [baris];
        return [];
    });
    const pengguna: PenggunaAktif = { id: 3, peran: 'kader', rt: null, aktif: true, superAdmin: true };
    await jalankan(pool, pengguna, async base => {
        const res = await fetch(base + '/antrean', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ periodeId: 2, sasaranId: 7, tanggal: '2026-11-09', catatan: null, masihMenyusui: true, asiEksklusif: false }),
        });
        assert.equal(res.status, 201);
    });
    const insert = log.find(q => q.text.includes('INSERT INTO antrean_layanan'));
    assert.ok(insert, 'check-in baru harus membuat baris antrean');
    assert.match(insert.text, /masih_menyusui, asi_eksklusif/);
    assert.deepEqual(insert.values.slice(-2), [true, false]);
});

test('check-in APK lama tanpa field menyusui tetap diterima dan menyimpan NULL', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('FROM sasaran s')) return [{ id: 7, rt: '01' }];
        if (q.text.includes('generate_series')) return [{ nomor: 3 }];
        if (q.text.includes('coalesce(max(urutan)')) return [{ urutan: 2 }];
        if (q.text.includes('WHERE q.id=$1')) return [baris];
        return [];
    });
    const pengguna: PenggunaAktif = { id: 3, peran: 'kader', rt: null, aktif: true, superAdmin: true };
    await jalankan(pool, pengguna, async base => {
        const res = await fetch(base + '/antrean', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ periodeId: 2, sasaranId: 7, tanggal: '2026-11-09', catatan: 'bawa KIA', masihMenyusui: 'YA' }),
        });
        assert.equal(res.status, 201);
    });
    const insert = log.find(q => q.text.includes('INSERT INTO antrean_layanan'));
    assert.deepEqual(insert?.values.slice(-2), [null, null]);
    assert.equal(log.some(q => q.text.includes('SET masih_menyusui=')), false);
});

test('konfirmasi KMS meneruskan catatan khusus ke pengukuran periode yang sama', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes("SET status='done'")) return [{ id: baris.id, sasaranId: 7, periodeId: 2 }];
        if (q.text.includes('WHERE q.id=$1')) return [{ ...baris, status: 'done' }];
        return [];
    });
    const pengguna: PenggunaAktif = { id: 4, peran: 'kms', rt: null, aktif: true, superAdmin: false, posyanduIds: [1] };
    await jalankan(pool, pengguna, async base => {
        const res = await fetch(base + `/antrean/${baris.id}/konfirmasi-kms`, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ catatanKms: '  2T, anak demam  ' }),
        });
        assert.equal(res.status, 200);
    });
    const simpan = log.find(q => q.text.includes('SET catatan_kms=$3'));
    assert.ok(simpan, 'catatan KMS harus disimpan');
    assert.deepEqual(simpan.values, [7, 2, '2T, anak demam']);
});

test('konfirmasi KMS tanpa catatan tidak menimpa catatan yang sudah ada', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes("SET status='done'")) return [{ id: baris.id, sasaranId: 7, periodeId: 2 }];
        if (q.text.includes('WHERE q.id=$1')) return [{ ...baris, status: 'done' }];
        return [];
    });
    const pengguna: PenggunaAktif = { id: 4, peran: 'kms', rt: null, aktif: true, superAdmin: false, posyanduIds: [1] };
    await jalankan(pool, pengguna, async base => {
        const res = await fetch(base + `/antrean/${baris.id}/konfirmasi-kms`, {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
        });
        assert.equal(res.status, 200);
    });
    assert.equal(log.some(q => q.text.includes('SET catatan_kms')), false);
});
