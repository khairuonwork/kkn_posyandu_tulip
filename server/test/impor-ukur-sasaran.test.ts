import assert from 'node:assert/strict';
import test from 'node:test';
import type { PoolClient } from 'pg';
import { simpanUkurSasaran } from '../src/services/impor-ukur-sasaran.ts';
import { tabelDariBerkas } from '../src/antropometri/sumber-standar.ts';
import type { BarisSasaranExcel, SheetSasaran } from '../src/services/sasaran-excel.ts';

const identitas = [{ id: 1, nik: '3277000000000001', nama: 'ANAK UJI', tglLahir: '2025-01-01', jk: 'L', rt: '01' }];
const sumber: BarisSasaranExcel = { barisAsal: 8, nik: identitas[0].nik, eppgbm: null, nama: 'ANAK UJI',
    tglLahir: '2025-01-01', jk: 'L', namaOrtu: 'IBU', nikOrtu: null, rt: '01', anakKe: 1,
    bbLahirKg: null, bbLahirMentah: null, pbLahirCm: null, bukuKia: true, imd: false,
    statusAwal: 'menunggu', masalah: [], identitasDuplikat: false,
    pengukuran: { tanggalUkur: '2026-07-12', bbKg: 10, tinggiCm: 78, lilaCm: 15, likaCm: 45, ntob: 'N' } };
const sheet = (baris: BarisSasaranExcel[]) => ({ periode: '2026-07', sheet: 'JULI 2026', baris }) as SheetSasaran;

test('hasil impor menyimpan nilai dan penilaian WHO; mengulang impor tidak menimpa hasil lama', async () => {
    for (const sudahAda of [false, true]) {
        const calls: { sql: string; values: unknown[] }[] = [];
        const db = { query: async (sql: string, values: unknown[]) => {
            calls.push({ sql, values });
            return { rows: sql.includes('INSERT INTO pengukuran') && !sudahAda ? [{ id: 99 }] : [] };
        } } as unknown as PoolClient;
        const hasil = await simpanUkurSasaran(db, sheet([sumber]), 7, identitas, tabelDariBerkas(), 'sumber.xlsx');
        assert.equal(hasil.tersimpan, sudahAda ? 0 : 1);
        assert.equal(hasil.sudahAda, sudahAda ? 1 : 0);
        assert.match(calls[0].sql, /ON CONFLICT\(anak_id,periode_id\) DO NOTHING/);
        assert.deepEqual(calls[0].values.slice(0, 9), [1, 7, '2026-07-12', 10, 78, 'PB', 15, 45, 'N']);
        assert.equal(calls.some(c => c.sql.includes('UPDATE sasaran')), !sudahAda);
        assert.equal(calls.some(c => c.sql.includes('INSERT INTO penilaian_gizi')), !sudahAda);
    }
});

test('tanggal beda bulan, identitas NIK salah nama, sebelum lahir, dan duplikat tidak menulis pengukuran', async () => {
    const db = { query: () => { throw new Error('Tidak boleh menulis'); } } as unknown as PoolClient;
    for (const baris of [
        [{ ...sumber, nama: 'ANAK LAIN' }],
        [{ ...sumber, pengukuran: { ...sumber.pengukuran!, tanggalUkur: '2026-08-12' } }],
        [{ ...sumber, tglLahir: '2026-07-20' }],
        [sumber, { ...sumber, barisAsal: 9 }],
    ]) {
        const hasil = await simpanUkurSasaran(db, sheet(baris), 7, identitas, tabelDariBerkas(), 'sumber.xlsx');
        assert.equal(hasil.tersimpan, 0);
        assert(hasil.ditahan.length > 0);
    }
});
