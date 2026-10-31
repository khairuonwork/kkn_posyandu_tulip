/**
 * Akses tabel `sesi`.
 *
 * `cariAktif` memeriksa `p.aktif` di dalam SQL, pada **setiap** permintaan.
 * Itu bukan kelalaian yang bisa dioptimalkan dengan cache: inilah alasan sesi
 * disimpan di basis data. Saat Admin menonaktifkan sebuah akun di layar
 * Pengaturan, akses yang sedang berjalan harus mati seketika, bukan bertahan
 * sampai sesinya kedaluwarsa dua belas jam kemudian.
 */

import type { Pool, PoolClient } from 'pg';

import type { Peran, PenggunaAktif } from '../auth/peran.ts';
import { fiturPelatihan } from '../services/pelatihan.ts';

type BarisSesi = {
    id: number;
    peran: Peran;
    rt: string | null;
    aktif: boolean;
    posyanduIds: number[];
    superAdmin: boolean;
};

export async function simpan(
    pool: Pool,
    ringkasan: string,
    penggunaId: number,
    kedaluwarsa: Date,
): Promise<void> {
    await pool.query(
        fiturPelatihan()
            ? `INSERT INTO sesi (ringkasan,pengguna_id,kedaluwarsa,pelatihan_id)
               VALUES($1,$2,$3,(SELECT id FROM public.pelatihan_sesi WHERE selesai_pada IS NULL))`
            : 'INSERT INTO sesi (ringkasan, pengguna_id, kedaluwarsa) VALUES ($1, $2, $3)',
        [ringkasan, penggunaId, kedaluwarsa],
    );
}

/** Null bila sesi tidak ada, sudah kedaluwarsa, atau akunnya dinonaktifkan. */
export async function cariAktif(pool: Pool, ringkasan: string): Promise<PenggunaAktif | null> {
    const { rows } = await pool.query<BarisSesi>(
        `SELECT p.id, p.peran, p.aktif, w.rt, p.super_admin AS "superAdmin",
                coalesce(array_agg(up.posyandu_id::int) FILTER (WHERE up.posyandu_id IS NOT NULL), '{}') AS "posyanduIds"
         FROM sesi s
         JOIN pengguna p ON p.id = s.pengguna_id
         LEFT JOIN wilayah_rt w ON w.id = p.wilayah_rt_id
         LEFT JOIN pengguna_posyandu up ON up.pengguna_id = p.id
         WHERE s.ringkasan = $1
           AND s.kedaluwarsa > now()
           AND p.aktif
           ${fiturPelatihan() ? 'AND s.pelatihan_id IS NOT DISTINCT FROM (SELECT id FROM public.pelatihan_sesi WHERE selesai_pada IS NULL)' : ''}
           AND (p.super_admin OR EXISTS (
               SELECT 1 FROM pengguna_posyandu cakupan WHERE cakupan.pengguna_id=p.id
           ))
         GROUP BY p.id, w.rt`,
        [ringkasan],
    );

    if (rows.length === 0) {
        return null;
    }

    const b = rows[0];

    return { id: b.id, peran: b.peran, rt: b.rt, aktif: b.aktif, posyanduIds: b.posyanduIds, superAdmin: b.superAdmin };
}

export async function hapus(pool: Pool, ringkasan: string): Promise<void> {
    await pool.query('DELETE FROM sesi WHERE ringkasan = $1', [ringkasan]);
}

/** Dipakai saat kata sandi diganti atau akun dinonaktifkan. */
export async function hapusMilikPengguna(pool: Pool, penggunaId: number): Promise<void> {
    await pool.query('DELETE FROM sesi WHERE pengguna_id = $1', [penggunaId]);
}

/**
 * Seperti `hapusMilikPengguna`, tetapi satu sesi boleh dipertahankan: sesi
 * admin yang sedang mengganti kata sandinya sendiri. Tanpa pengecualian itu ia
 * terlempar keluar di tengah pekerjaan. Dijalankan di dalam transaksi yang sama
 * dengan perubahannya, supaya tidak ada jeda ketika sandi sudah berganti
 * sementara sesi lamanya masih hidup.
 */
export async function hapusMilikPenggunaKecuali(
    db: PoolClient,
    penggunaId: number,
    pertahankan: string | null,
): Promise<void> {
    await db.query('DELETE FROM sesi WHERE pengguna_id = $1 AND ringkasan IS DISTINCT FROM $2', [
        penggunaId,
        pertahankan,
    ]);
}

/**
 * Sesi mati tidak pernah menghalangi apa pun — `cariAktif` sudah menyaringnya.
 * Ini hanya supaya tabelnya tidak tumbuh selamanya.
 */
export async function sapuMati(pool: Pool): Promise<number> {
    const { rowCount } = await pool.query('DELETE FROM sesi WHERE kedaluwarsa <= now()');

    return rowCount ?? 0;
}
