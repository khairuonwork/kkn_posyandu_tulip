import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import type { Pool } from 'pg';
import { hitungPrioritas, type RiwayatUkur } from '../src/services/prioritas-kms.ts';
import { ruteAntrean } from '../src/http/antrean-controller.ts';
import type { PenggunaAktif } from '../src/auth/peran.ts';

const ukur = (anakId: number, periodeId: string, bbKg: number, kategori: string[] = []): RiwayatUkur => ({
    anakId, periodeId, tglLahir: '2025-01-15', tanggalUkur: `${periodeId}-15`, bbKg, zBbU: -1, hadir: true, kategori,
});

test('2T+ didahulukan, makin banyak T makin tinggi, lalu gizi berat, lalu 1T', () => {
    const riwayat = [
        // Anak 1: tiga bulan berturut tidak naik -> 2T pada November (Sep->Okt T, Okt->Nov T).
        ukur(1, '2026-09', 8.0), ukur(1, '2026-10', 8.0), ukur(1, '2026-11', 8.0),
        // Anak 2: naik normal, gizi buruk bulan ini.
        ukur(2, '2026-10', 8.0), ukur(2, '2026-11', 8.5, ['Gizi buruk']),
        // Anak 3: hanya 1T bulan ini.
        ukur(3, '2026-10', 8.0), ukur(3, '2026-11', 8.05),
        // Anak 4: normal.
        ukur(4, '2026-10', 8.0), ukur(4, '2026-11', 8.5),
    ];
    const p = hitungPrioritas('2026-11', riwayat);
    assert.equal(p.get(1)?.jumlahT, 2);
    assert.deepEqual(p.get(1)?.alasan, ['2T']);
    assert.deepEqual(p.get(2)?.alasan, ['Gizi buruk']);
    assert.deepEqual(p.get(3)?.alasan, ['1T']);
    assert.equal(p.get(4)?.skor, 0);
    const urut = [1, 2, 3, 4].sort((a, b) => p.get(b)!.skor - p.get(a)!.skor);
    assert.deepEqual(urut, [1, 2, 3, 4]);
});

test('arsip 2T Puskesmas ikut dihitung dan bulan bolong tidak menjadi T', () => {
    const p = hitungPrioritas('2026-11', [ukur(5, '2026-11', 9.0)], [
        { anakId: 5, periodeLaporan: '2026-11', periodeRiwayat: '2026-10', jumlahT: 3, umurBulan: 21, bbKg: 9.0, zBbU: -2.1 },
    ]);
    assert.equal(p.get(5)?.jumlahT, 3);
    const bolong = hitungPrioritas('2026-11', [ukur(6, '2026-08', 8.0), ukur(6, '2026-11', 8.0)]);
    assert.equal(bolong.get(6)?.jumlahT, 0);
});

type Query = { text: string; values: unknown[] };
function poolTiruan(jawab: (q: Query) => unknown[]) {
    const log: Query[] = [];
    const klien = { query: async (text: string, values: unknown[] = []) => { log.push({ text, values }); return { rows: jawab({ text, values }) }; }, release: () => {} };
    return { pool: { connect: async () => klien, query: klien.query } as unknown as Pool, log };
}
async function kirim(pool: Pool, pengguna: PenggunaAktif, path: string, body: unknown = {}) {
    const app = express(); app.use(express.json());
    app.use((req, _res, next) => { req.pengguna = pengguna; next(); });
    app.use(ruteAntrean(pool));
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    try {
        const res = await fetch(`http://127.0.0.1:${address.port}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        return { status: res.status, body: await res.json() as Record<string, unknown> };
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    }
}
const kms: PenggunaAktif = { id: 7, peran: 'kms', rt: null, aktif: true, superAdmin: false, posyanduIds: [1] };
const id = 'antrean_20261113_9';

test('panggil anak yang sedang diperiksa petugas lain ditolak dengan nama petugas', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('FOR UPDATE OF q')) return [{ periodeId: 2, tanggal: '2026-11-13', petugas: 8 }];
        if (q.text.includes('WHERE q.id=$1')) return [{ id, nama: 'Anak', kmsPetugasNama: 'Kader B' }];
        return [];
    });
    const res = await kirim(pool, kms, `/antrean/${id}/panggil-kms`);
    assert.equal(res.status, 409);
    assert.match(String(res.body.galat), /Kader B/);
    assert.equal(log.some(q => q.text.includes('SET kms_petugas_id=$2')), false);
});

test('panggil berikutnya memilih skor tertinggi dan tidak memberi dua anak sekaligus', async () => {
    const terpilih: unknown[] = [];
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('FOR SHARE OF u, up, p')) return [{ meja: 1 }];
        if (q.text.includes('UPDATE antrean_layanan q SET')) { terpilih.push(q.values[0]); return [{ nomor: 2 }]; }
        if (q.text.includes('FROM periode WHERE id=$1 AND sesi_ditutup_pada')) return [{ '?column?': 1 }];
        if (q.text.includes('kms_petugas_id=$3')) return [];
        if (q.text.includes('q.kms_petugas_id IS NULL')) return [
            { id: 'antrean_20261113_1', anakId: 1, urutan: 1 },
            { id: 'antrean_20261113_2', anakId: 2, urutan: 2 },
        ];
        if (q.text.includes("to_char(make_date(tahun, bulan, 1), 'YYYY-MM') AS periode")) return [{ periode: '2026-11' }];
        if (q.text.includes('FROM pengukuran p')) return [
            { anakId: 2, periodeId: '2026-09', tglLahir: '2025-01-15', tanggalUkur: '2026-09-15', bbKg: 8, zBbU: -1, hadir: true, kategori: [] },
            { anakId: 2, periodeId: '2026-10', tglLahir: '2025-01-15', tanggalUkur: '2026-10-15', bbKg: 8, zBbU: -1, hadir: true, kategori: [] },
            { anakId: 2, periodeId: '2026-11', tglLahir: '2025-01-15', tanggalUkur: '2026-11-15', bbKg: 8, zBbU: -1, hadir: true, kategori: [] },
        ];
        if (q.text.includes('WHERE q.id=$1')) return [{ id: terpilih[0], nama: 'Anak 2T' }];
        return [];
    });
    const res = await kirim(pool, kms, '/antrean/panggil-kms-berikutnya', { periodeId: 2, tanggal: '2026-11-13' });
    assert.equal(res.status, 200);
    assert.deepEqual(terpilih, ['antrean_20261113_2'], 'anak 2T didahulukan walau datang belakangan');
    assert.ok(log.some(q => q.text.includes('pg_advisory_xact_lock')), 'pemilihan dikunci per hari layanan');
});

test('konfirmasi selesai ditolak bila anak dipegang petugas lain', async () => {
    const { pool, log } = poolTiruan(q => {
        if (q.text.includes('SELECT kms_petugas_id::int AS petugas FROM antrean_layanan WHERE id=$1 FOR UPDATE')) return [{ petugas: 8 }];
        return [];
    });
    const res = await kirim(pool, kms, `/antrean/${id}/konfirmasi-kms`);
    assert.equal(res.status, 409);
    assert.equal(log.some(q => q.text.includes("SET status='done'")), false);
});
