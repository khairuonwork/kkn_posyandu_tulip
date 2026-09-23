/**
 * Akses tabel `pengguna`.
 *
 * Di sinilah `wilayah_rt.rt` (teks, mis. `'01'`) menjadi `PenggunaAktif.rt` —
 * lewat satu JOIN, bukan query kedua. Tanpa itu, tiap pemeriksaan izin akan
 * menembak basis data dua kali.
 */

import type { Pool } from 'pg';

import type { Peran } from '../auth/peran.ts';

export type PenggunaUntukMasuk = {
    id: number;
    nama: string;
    email: string;
    kataSandiHash: string;
    peran: Peran;
    rt: string | null;
    aktif: boolean;
};

type BarisPengguna = {
    id: number;
    nama: string;
    email: string;
    kata_sandi_hash: string;
    peran: Peran;
    rt: string | null;
    aktif: boolean;
};

const KOLOM = `
    p.id, p.nama, p.email, p.kata_sandi_hash, p.peran, p.aktif, w.rt
    FROM pengguna p
    LEFT JOIN wilayah_rt w ON w.id = p.wilayah_rt_id
`;

function keBentuk(baris: BarisPengguna): PenggunaUntukMasuk {
    return {
        id: baris.id,
        nama: baris.nama,
        email: baris.email,
        kataSandiHash: baris.kata_sandi_hash,
        peran: baris.peran,
        rt: baris.rt,
        aktif: baris.aktif,
    };
}

/**
 * Akun nonaktif tetap dikembalikan, bukan disaring di sini.
 *
 * Yang memutuskan penolakan adalah service, setelah kata sandi diverifikasi.
 * Menyaringnya di query membuat akun nonaktif gagal lebih cepat daripada kata
 * sandi salah, dan selisih waktu itu memberi tahu penebak bahwa akunnya ada.
 */
export async function cariUntukMasuk(
    pool: Pool,
    email: string,
): Promise<PenggunaUntukMasuk | null> {
    const { rows } = await pool.query<BarisPengguna>(
        `SELECT ${KOLOM} WHERE lower(p.email) = lower($1)`,
        [email],
    );

    return rows.length === 0 ? null : keBentuk(rows[0]);
}

export async function catatMasuk(pool: Pool, id: number): Promise<void> {
    await pool.query('UPDATE pengguna SET terakhir_masuk = now() WHERE id = $1', [id]);
}

/** Dipakai saat parameter hashing dinaikkan; lihat `perluHashUlang()`. */
export async function perbaruiHash(pool: Pool, id: number, hash: string): Promise<void> {
    await pool.query('UPDATE pengguna SET kata_sandi_hash = $2 WHERE id = $1', [id, hash]);
}
