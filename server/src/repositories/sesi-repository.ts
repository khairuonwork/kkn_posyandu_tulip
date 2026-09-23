/**
 * Akses tabel `sesi`.
 *
 * `cariAktif` memeriksa `p.aktif` di dalam SQL, pada **setiap** permintaan.
 * Itu bukan kelalaian yang bisa dioptimalkan dengan cache: inilah alasan sesi
 * disimpan di basis data. Saat Admin menonaktifkan sebuah akun di layar
 * Pengaturan, akses yang sedang berjalan harus mati seketika, bukan bertahan
 * sampai sesinya kedaluwarsa dua belas jam kemudian.
 */

import type { Pool } from 'pg';

import type { Peran, PenggunaAktif } from '../auth/peran.ts';

type BarisSesi = {
    id: number;
    peran: Peran;
    rt: string | null;
    aktif: boolean;
};

export async function simpan(
    pool: Pool,
    ringkasan: string,
    penggunaId: number,
    kedaluwarsa: Date,
): Promise<void> {
    await pool.query(
        'INSERT INTO sesi (ringkasan, pengguna_id, kedaluwarsa) VALUES ($1, $2, $3)',
        [ringkasan, penggunaId, kedaluwarsa],
    );
}

/** Null bila sesi tidak ada, sudah kedaluwarsa, atau akunnya dinonaktifkan. */
export async function cariAktif(pool: Pool, ringkasan: string): Promise<PenggunaAktif | null> {
    const { rows } = await pool.query<BarisSesi>(
        `SELECT p.id, p.peran, p.aktif, w.rt
         FROM sesi s
         JOIN pengguna p ON p.id = s.pengguna_id
         LEFT JOIN wilayah_rt w ON w.id = p.wilayah_rt_id
         WHERE s.ringkasan = $1
           AND s.kedaluwarsa > now()
           AND p.aktif`,
        [ringkasan],
    );

    if (rows.length === 0) {
        return null;
    }

    const b = rows[0];

    return { id: b.id, peran: b.peran, rt: b.rt, aktif: b.aktif };
}

export async function hapus(pool: Pool, ringkasan: string): Promise<void> {
    await pool.query('DELETE FROM sesi WHERE ringkasan = $1', [ringkasan]);
}

/** Dipakai saat kata sandi diganti atau akun dinonaktifkan. */
export async function hapusMilikPengguna(pool: Pool, penggunaId: number): Promise<void> {
    await pool.query('DELETE FROM sesi WHERE pengguna_id = $1', [penggunaId]);
}

/**
 * Sesi mati tidak pernah menghalangi apa pun — `cariAktif` sudah menyaringnya.
 * Ini hanya supaya tabelnya tidak tumbuh selamanya.
 */
export async function sapuMati(pool: Pool): Promise<number> {
    const { rowCount } = await pool.query('DELETE FROM sesi WHERE kedaluwarsa <= now()');

    return rowCount ?? 0;
}
