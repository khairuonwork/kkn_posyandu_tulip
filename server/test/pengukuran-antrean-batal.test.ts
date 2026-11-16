import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PoolClient } from 'pg';
import { upsertPengukuran } from '../src/repositories/anak-repository.ts';
import type { PenggunaAktif } from '../src/auth/peran.ts';

type Query = { text: string; values: unknown[] };
const admin: PenggunaAktif = { id: 309, peran: 'admin', rt: null, aktif: true, superAdmin: true };

/** Klien tiruan: antrean anak ini sudah ada tetapi berstatus batal. */
function klien(statusAntrean: string | null) {
    const log: Query[] = [];
    const db = {
        query: async (text: string, values: unknown[] = []) => {
            log.push({ text, values });
            if (text.includes('FROM anak a')) return { rows: [{ id: 199, posyandu_id: 1 }] };
            if (text.includes('SELECT id FROM periode WHERE posyandu_id')) return { rows: [{ id: 2 }] };
            if (text.includes('FROM sasaran s')) return { rows: [{ status: 'tidak_hadir', catatan: '', sesiDitutupPada: '2026-11-14T10:00:00Z' }] };
            if (text.includes('INSERT INTO pengukuran')) return { rows: [{ id: 900 }] };
            if (text.includes('SELECT id FROM sasaran WHERE periode_id')) return { rows: [{ id: 77 }] };
            if (text.includes('SELECT id, status FROM antrean_layanan')) {
                return { rows: statusAntrean ? [{ id: 'antrean_20261114_77', status: statusAntrean }] : [] };
            }
            if (text.includes('generate_series')) return { rows: [{ nomor: 4 }] };
            if (text.includes('coalesce(max(urutan),0)::int AS urutan')) return { rows: [{ urutan: 70 }] };
            return { rows: [] };
        },
    };
    return { db: db as unknown as PoolClient, log };
}

const data = {
    idPengukuran: 'ukur_3277032512230001_202611', anakId: 199, nik: '3277032512230001',
    tanggalUkur: '2026-11-14', bbKg: 14, tinggiCm: 92, jenisUkur: 'TB' as const,
    lilaCm: 19, likaCm: 50, ntob: 'N', statusKehadiran: 'hadir' as const, catatanKhusus: null,
};

test('pengukuran mengaktifkan antrean batal dengan nomor kosong, bukan nomor lama yang bisa bentrok', async () => {
    const { db, log } = klien('cancelled');
    const hasil = await upsertPengukuran(db, admin, data);
    assert.equal(hasil?.susulan, true, 'anak tidak hadir setelah sesi ditutup dicatat sebagai susulan');
    const aktifkan = log.find(q => q.text.includes("SET status='kms_review', nomor=$3"));
    assert.ok(aktifkan, 'antrean batal harus mendapat nomor baru');
    assert.equal(aktifkan.values[2], 4);
    const kunci = log.findIndex(q => q.text.includes('pg_advisory_xact_lock($1::integer, $2::integer)'));
    const nomor = log.findIndex(q => q.text.includes('generate_series'));
    assert.ok(kunci >= 0 && kunci < nomor, 'nomor dihitung di bawah kunci hari yang sama dengan check-in');
});

test('pengukuran tanpa antrean membuat antrean dengan nomor kosong terkecil', async () => {
    const { db, log } = klien(null);
    await upsertPengukuran(db, admin, data);
    const insert = log.find(q => q.text.includes('INSERT INTO antrean_layanan'));
    assert.ok(insert);
    assert.deepEqual(insert.values.slice(4, 6), [4, 71]);
});
