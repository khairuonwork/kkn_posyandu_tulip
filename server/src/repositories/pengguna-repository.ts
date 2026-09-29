/**
 * Akses tabel `pengguna`.
 *
 * Di sinilah `wilayah_rt.rt` (teks, mis. `'01'`) menjadi `PenggunaAktif.rt` —
 * lewat satu JOIN, bukan query kedua. Tanpa itu, tiap pemeriksaan izin akan
 * menembak basis data dua kali.
 */

import type { Pool, PoolClient } from 'pg';

import type { IsianAkun } from '../auth/akun.ts';
import type { Peran } from '../auth/peran.ts';
import { dalamTransaksi } from '../db/transaksi.ts';

/** Pool untuk baca biasa, klien transaksi untuk perubahan yang diaudit. */
type Kueri = Pool | PoolClient;

/** Bentuk akun yang boleh keluar dari server: tanpa hash kata sandi. */
export type PenggunaPublik = {
    id: number;
    nama: string;
    username: string;
    peran: Peran;
    rt: string | null;
    aktif: boolean;
};

const KOLOM_PUBLIK = `
    p.id, p.nama, p.username, p.peran, p.aktif, w.rt
    FROM pengguna p
    LEFT JOIN wilayah_rt w ON w.id = p.wilayah_rt_id
`;

export async function daftar(db: Kueri): Promise<PenggunaPublik[]> {
    const { rows } = await db.query<PenggunaPublik>(`SELECT ${KOLOM_PUBLIK} ORDER BY p.id`);

    return rows;
}

export async function ambil(db: Kueri, id: number): Promise<PenggunaPublik | null> {
    const { rows } = await db.query<PenggunaPublik>(`SELECT ${KOLOM_PUBLIK} WHERE p.id = $1`, [
        id,
    ]);

    return rows[0] ?? null;
}

/**
 * Akun yang akan diubah, dikunci sampai transaksinya selesai. `OF p`: sisi
 * `wilayah_rt` pada LEFT JOIN boleh kosong dan tidak dapat dikunci.
 */
export async function cariUntukUbah(db: PoolClient, id: number): Promise<PenggunaPublik | null> {
    const { rows } = await db.query<PenggunaPublik>(
        `SELECT ${KOLOM_PUBLIK} WHERE p.id = $1 FOR UPDATE OF p`,
        [id],
    );

    return rows[0] ?? null;
}

/**
 * Id seluruh admin aktif, dikunci berurutan menurut id.
 *
 * Dua admin yang saling menurunkan pada saat bersamaan tanpa kunci ini sama-sama
 * melihat "masih ada satu admin lain", lalu keduanya berhasil — dan tidak ada
 * admin yang tersisa. Urutan kunci yang tetap mencegah keduanya saling menunggu.
 */
export async function kunciAdminAktif(db: PoolClient): Promise<number[]> {
    const { rows } = await db.query<{ id: number }>(
        `SELECT id FROM pengguna WHERE peran = 'admin' AND aktif ORDER BY id FOR UPDATE`,
    );

    return rows.map((r) => r.id);
}

export async function usernameDipakai(
    db: Kueri,
    username: string,
    kecualiId = 0,
): Promise<boolean> {
    const { rowCount } = await db.query(
        'SELECT 1 FROM pengguna WHERE lower(username) = lower($1) AND id <> $2',
        [username, kecualiId],
    );

    return (rowCount ?? 0) > 0;
}

/**
 * ponytail: RT dicari menurut teksnya saja, sama seperti `db/buat-pengguna.ts`.
 * Cukup selama Portal melayani satu Posyandu; bila kelak lebih dari satu,
 * layar harus mengirim id `wilayah_rt`, bukan teks RT.
 */
export async function cariRtId(db: Kueri, rt: string): Promise<number | null> {
    const { rows } = await db.query<{ id: number }>(
        'SELECT id FROM wilayah_rt WHERE rt = $1 ORDER BY id LIMIT 1',
        [rt],
    );

    return rows[0]?.id ?? null;
}

/** Pilihan RT binaan untuk akun kader. */
export async function daftarRt(db: Kueri): Promise<string[]> {
    const { rows } = await db.query<{ rt: string }>(
        'SELECT DISTINCT rt FROM wilayah_rt ORDER BY rt',
    );

    return rows.map((r) => r.rt);
}

export async function sisipkan(
    db: PoolClient,
    isian: IsianAkun,
    hash: string,
    wilayahRtId: number | null,
): Promise<number> {
    const { rows } = await db.query<{ id: number }>(
        `INSERT INTO pengguna (nama, username, kata_sandi_hash, peran, wilayah_rt_id, aktif)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [isian.nama, isian.username, hash, isian.peran, wilayahRtId, isian.aktif],
    );

    return rows[0].id;
}

/** `hash` null berarti kata sandinya tidak diganti. */
export async function perbarui(
    db: PoolClient,
    id: number,
    isian: IsianAkun,
    wilayahRtId: number | null,
    hash: string | null,
): Promise<void> {
    await db.query(
        `UPDATE pengguna
            SET nama = $2, username = $3, peran = $4, wilayah_rt_id = $5, aktif = $6,
                kata_sandi_hash = COALESCE($7, kata_sandi_hash)
          WHERE id = $1`,
        [id, isian.nama, isian.username, isian.peran, wilayahRtId, isian.aktif, hash],
    );
}

export type PenggunaUntukMasuk = {
    id: number;
    nama: string;
    username: string;
    kataSandiHash: string;
    peran: Peran;
    rt: string | null;
    aktif: boolean;
};

type BarisPengguna = {
    id: number;
    nama: string;
    username: string;
    kata_sandi_hash: string;
    peran: Peran;
    rt: string | null;
    aktif: boolean;
};

const KOLOM = `
    p.id, p.nama, p.username, p.kata_sandi_hash, p.peran, p.aktif, w.rt
    FROM pengguna p
    LEFT JOIN wilayah_rt w ON w.id = p.wilayah_rt_id
`;

function keBentuk(baris: BarisPengguna): PenggunaUntukMasuk {
    return {
        id: baris.id,
        nama: baris.nama,
        username: baris.username,
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
    username: string,
): Promise<PenggunaUntukMasuk | null> {
    const { rows } = await pool.query<BarisPengguna>(
        `SELECT ${KOLOM} WHERE lower(p.username) = lower($1)`,
        [username],
    );

    return rows.length === 0 ? null : keBentuk(rows[0]);
}

export async function catatMasuk(pool: Pool, id: number): Promise<void> {
    await dalamTransaksi(pool, { pengguna: id, sumber: 'autentikasi' }, async (klien) => {
        await klien.query('UPDATE pengguna SET terakhir_masuk = now() WHERE id = $1', [id]);
    });
}

/** Dipakai saat parameter hashing dinaikkan; lihat `perluHashUlang()`. */
export async function perbaruiHash(pool: Pool, id: number, hash: string): Promise<void> {
    await dalamTransaksi(pool, { pengguna: id, sumber: 'autentikasi' }, async (klien) => {
        await klien.query('UPDATE pengguna SET kata_sandi_hash = $2 WHERE id = $1', [id, hash]);
    });
}
