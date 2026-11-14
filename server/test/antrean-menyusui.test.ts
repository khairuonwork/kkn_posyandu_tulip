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
    // Urutan nilai akhir: menyusui, ASI, ikut KB, jenis KB.
    assert.deepEqual(insert.values.slice(-4), [true, false, null, null]);
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
    assert.deepEqual(insert?.values.slice(-4), [null, null, null, null]);
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

test('check-in menyimpan status KB ibu dan jenis KB yang diketik kader', async () => {
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
            body: JSON.stringify({ periodeId: 2, sasaranId: 7, tanggal: '2026-11-09', ikutKb: true, jenisKb: '  Suntik 3 bulan ' }),
        });
        assert.equal(res.status, 201);
    });
    const insert = log.find(q => q.text.includes('INSERT INTO antrean_layanan'));
    assert.match(insert!.text, /ikut_kb, jenis_kb/);
    assert.deepEqual(insert!.values.slice(-2), [true, 'Suntik 3 bulan']);
});

test('jenis KB dibuang bila ibu tidak ber-KB, dan check-in ulang memperbarui jawaban KB', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('FROM sasaran s')) return [{ id: 7, rt: '01' }];
        if (q.text.includes('SELECT status FROM antrean_layanan')) return [{ status: 'waiting' }];
        if (q.text.includes('WHERE q.id=$1')) return [baris];
        return [];
    });
    const pengguna: PenggunaAktif = { id: 3, peran: 'kader', rt: null, aktif: true, superAdmin: true };
    await jalankan(pool, pengguna, async base => {
        const res = await fetch(base + '/antrean', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ periodeId: 2, sasaranId: 7, tanggal: '2026-11-09', ikutKb: false, jenisKb: 'Pil' }),
        });
        assert.equal(res.status, 201);
    });
    const ubah = log.find(q => q.text.includes('ikut_kb=CASE'));
    assert.ok(ubah, 'jawaban KB pada antrean yang sudah ada harus diperbarui');
    assert.deepEqual(ubah.values.slice(-3), [true, false, null]);
});

test('riwayat catatan per bulan menandai asal catatan dan melewati bulan kosong', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('LEFT JOIN LATERAL')) return [
            { periode: '2026-11', tanggal: '2026-11-09', catatan: 'Bawa KIA', masihMenyusui: true, asiEksklusif: null,
                ikutKb: true, jenisKb: 'Implan', catatanKhusus: 'Batuk pilek', catatanUkur: null, catatanKms: '2T, rujuk bidan', kmsPetugasNama: 'Kader B' },
            { periode: '2026-10', tanggal: '2026-10-12', catatan: ' ', masihMenyusui: null, asiEksklusif: null,
                ikutKb: null, jenisKb: null, catatanKhusus: null, catatanUkur: null, catatanKms: null, kmsPetugasNama: null },
            { periode: '2026-09', tanggal: '2026-09-14', catatan: null, masihMenyusui: null, asiEksklusif: null,
                ikutKb: null, jenisKb: null, catatanKhusus: null, catatanUkur: null, catatanKms: 'Gizi kurang', kmsPetugasNama: null },
        ];
        return [];
    });
    const pengguna: PenggunaAktif = { id: 4, peran: 'kms', rt: null, aktif: true, superAdmin: false, posyanduIds: [1] };
    let body: { items: Array<Record<string, any>> } = { items: [] };
    await jalankan(pool, pengguna, async base => {
        const res = await fetch(base + '/antrean/riwayat-catatan/42');
        assert.equal(res.status, 200);
        body = await res.json() as typeof body;
    });
    assert.deepEqual(body.items.map(i => i.periode), ['2026-11', '2026-09']);
    assert.deepEqual(body.items[0].pendaftaran, { catatan: 'Bawa KIA', masihMenyusui: true, asiEksklusif: null, ikutKb: true, jenisKb: 'Implan' });
    assert.deepEqual(body.items[0].pengukuran, { catatanKhusus: 'Batuk pilek', catatan: null });
    assert.deepEqual(body.items[0].kms, { catatan: '2T, rujuk bidan', petugasNama: 'Kader B' });
    assert.deepEqual(log[0].values, [42, false, [1]]);
});
