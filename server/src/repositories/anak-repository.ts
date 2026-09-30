/**
 * Query baca untuk sumber daya anak milik REST API Portal.
 *
 * Batas RT selalu menjadi bagian query. Controller tidak boleh menjadi satu-
 * satunya tempat penyaringannya, karena rute baru mudah lupa menambah filter.
 */

import type { Pool, PoolClient } from 'pg';

import type { PenggunaAktif } from '../auth/peran.ts';
import { rtYangBolehDilihat } from '../auth/peran.ts';

export type AnakRingkas = {
    id: number;
    nik: string | null;
    nama: string;
    tglLahir: string;
    jk: 'L' | 'P';
    rt: string | null;
    status: string;
    pengukuranTerakhir: string | null;
};

export type AnakDetail = AnakRingkas & {
    namaOrtu: string | null;
    nikOrtu: string | null;
    anakKe: number | null;
    bbLahirKg: number | null;
    pbLahirCm: number | null;
    bukuKia: boolean;
    imd: boolean;
};

export type PengukuranRingkas = {
    id: number;
    tanggalUkur: string;
    bbKg: number | null;
    tinggiCm: number | null;
    jenisUkur: 'PB' | 'TB' | null;
    lilaCm: number | null;
    likaCm: number | null;
    statusKehadiran: string;
    sumber: string;
    catatan: string | null;
};

export type AnakLapangan = {
    nik: string;
    nama: string;
    tglLahir: string;
    jk: 'L' | 'P';
    namaOrtu: string;
    rt: string;
};

export type PengukuranLapangan = {
    idPengukuran: string;
    nik: string;
    tanggalUkur: string;
    bbKg: number | null;
    tinggiCm: number | null;
    jenisUkur: 'PB' | 'TB';
    lilaCm: number | null;
    likaCm: number | null;
    ntob: string | null;
    statusKehadiran: 'hadir' | 'tidak_hadir' | 'pindah' | 'tidak_dapat_diukur';
};

type Halaman = { halaman: number; ukuran: number };

const KOLOM_RINGKAS = `
    a.id,
    a.nik,
    a.nama,
    to_char(a.tgl_lahir, 'YYYY-MM-DD') AS "tglLahir",
    a.jk,
    w.rt,
    a.status,
    max(p.updated_at) AS "pengukuranTerakhir"
`;

function batasRt(pengguna: PenggunaAktif): string | null {
    return rtYangBolehDilihat(pengguna);
}

export async function daftar(
    pool: Pool,
    pengguna: PenggunaAktif,
    cari: string,
    { halaman, ukuran }: Halaman,
): Promise<{ items: AnakRingkas[]; total: number }> {
    const rt = batasRt(pengguna);
    const pola = `%${cari.toLocaleLowerCase('id-ID')}%`;
    const dasar = `
        FROM anak a
        LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
        LEFT JOIN pengukuran p ON p.anak_id = a.id
        WHERE a.deleted_at IS NULL
          AND ($1::text IS NULL OR w.rt = $1)
          AND ($2 = '' OR a.nama_baku LIKE $3 OR a.nik LIKE $2)
    `;
    const offset = (halaman - 1) * ukuran;

    const [data, hitung] = await Promise.all([
        pool.query<AnakRingkas>(
            `SELECT ${KOLOM_RINGKAS} ${dasar}
             GROUP BY a.id, w.rt
             ORDER BY a.nama_baku, a.id
             LIMIT $4 OFFSET $5`,
            [rt, cari, pola, ukuran, offset],
        ),
        pool.query<{ total: number }>(
            `SELECT count(*)::int AS total
             FROM anak a
             LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
             WHERE a.deleted_at IS NULL
               AND ($1::text IS NULL OR w.rt = $1)
               AND ($2 = '' OR a.nama_baku LIKE $3 OR a.nik LIKE $2)`,
            [rt, cari, pola],
        ),
    ]);

    return { items: data.rows, total: hitung.rows[0]?.total ?? 0 };
}

export async function ambil(
    pool: Pool,
    pengguna: PenggunaAktif,
    id: number,
): Promise<AnakDetail | null> {
    const rt = batasRt(pengguna);
    const { rows } = await pool.query<AnakDetail>(
        `SELECT a.id, a.nik, a.nama,
                to_char(a.tgl_lahir, 'YYYY-MM-DD') AS "tglLahir",
                a.jk, w.rt, a.status,
                max(p.updated_at) AS "pengukuranTerakhir",
                o.nama AS "namaOrtu", o.nik AS "nikOrtu", a.anak_ke AS "anakKe",
                a.bb_lahir_kg::float8 AS "bbLahirKg", a.pb_lahir_cm::float8 AS "pbLahirCm",
                a.buku_kia AS "bukuKia", a.imd
           FROM anak a
           LEFT JOIN orang_tua o ON o.id = a.orang_tua_id
           LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
           LEFT JOIN pengukuran p ON p.anak_id = a.id
          WHERE a.id = $1
            AND a.deleted_at IS NULL
            AND ($2::text IS NULL OR w.rt = $2)
          GROUP BY a.id, w.rt, o.id`,
        [id, rt],
    );

    return rows[0] ?? null;
}

export async function daftarPengukuran(
    pool: Pool,
    pengguna: PenggunaAktif,
    anakId: number,
): Promise<PengukuranRingkas[] | null> {
    // Cek sumber daya lebih dulu dengan penyaring yang sama. Nilai null sengaja
    // menyatukan "tidak ada" dan "bukan RT Anda" menjadi 404.
    if ((await ambil(pool, pengguna, anakId)) === null) {
        return null;
    }

    const { rows } = await pool.query<PengukuranRingkas>(
        `SELECT p.id,
                to_char(p.tanggal_ukur, 'YYYY-MM-DD') AS "tanggalUkur",
                p.bb_kg::float8 AS "bbKg", p.tinggi_cm::float8 AS "tinggiCm",
                p.jenis_ukur AS "jenisUkur", p.lila_cm::float8 AS "lilaCm",
                p.lika_cm::float8 AS "likaCm", p.status_kehadiran AS "statusKehadiran",
                p.sumber, p.catatan
           FROM pengukuran p
          WHERE p.anak_id = $1
          ORDER BY p.tanggal_ukur DESC, p.id DESC`,
        [anakId],
    );

    return rows;
}

export async function upsertAnak(
    db: PoolClient,
    data: AnakLapangan,
): Promise<{ id: number; nik: string }> {
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [data.nik]);

    const wilayah = await db.query<{ id: number }>(
        'SELECT id FROM wilayah_rt WHERE rt = $1 ORDER BY id LIMIT 1',
        [data.rt],
    );
    if (wilayah.rows[0] === undefined) {
        throw new Error(`RT ${data.rt} belum tersedia.`);
    }

    const lama = await db.query<{ id: number; orang_tua_id: number | null }>(
        'SELECT id, orang_tua_id FROM anak WHERE nik = $1 AND deleted_at IS NULL FOR UPDATE',
        [data.nik],
    );
    let orangTuaId = lama.rows[0]?.orang_tua_id ?? null;

    if (orangTuaId === null) {
        const orangTua = await db.query<{ id: number }>(
            'INSERT INTO orang_tua (nama) VALUES ($1) RETURNING id',
            [data.namaOrtu],
        );
        orangTuaId = orangTua.rows[0].id;
    } else {
        await db.query('UPDATE orang_tua SET nama = $2 WHERE id = $1', [orangTuaId, data.namaOrtu]);
    }

    const namaBaku = data.nama.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
    if (lama.rows[0] === undefined) {
        const baru = await db.query<{ id: number }>(
            `INSERT INTO anak
                 (nik, orang_tua_id, wilayah_rt_id, nama, nama_baku, tgl_lahir, jk)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [data.nik, orangTuaId, wilayah.rows[0].id, data.nama, namaBaku, data.tglLahir, data.jk],
        );

        return { id: baru.rows[0].id, nik: data.nik };
    }

    await db.query(
        `UPDATE anak
            SET orang_tua_id = $2, wilayah_rt_id = $3, nama = $4,
                nama_baku = $5, tgl_lahir = $6, jk = $7
          WHERE id = $1`,
        [lama.rows[0].id, orangTuaId, wilayah.rows[0].id, data.nama, namaBaku, data.tglLahir, data.jk],
    );

    return { id: lama.rows[0].id, nik: data.nik };
}

export async function upsertPengukuran(
    db: PoolClient,
    pengguna: PenggunaAktif,
    data: PengukuranLapangan,
): Promise<number | null> {
    const rt = batasRt(pengguna);
    const anak = await db.query<{ id: number; posyandu_id: number }>(
        `SELECT a.id, w.posyandu_id
           FROM anak a
           JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
          WHERE a.nik = $1 AND a.deleted_at IS NULL
            AND ($2::text IS NULL OR w.rt = $2)`,
        [data.nik, rt],
    );
    if (anak.rows[0] === undefined) {
        return null;
    }

    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `${data.nik}:${data.tanggalUkur.slice(0, 7)}`,
    ]);
    const tanggal = new Date(`${data.tanggalUkur}T00:00:00Z`);
    const periode = await db.query<{ id: number }>(
        `INSERT INTO periode (posyandu_id, bulan, tahun, tanggal_kegiatan)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (posyandu_id, bulan, tahun) DO UPDATE
             SET tanggal_kegiatan = coalesce(periode.tanggal_kegiatan, EXCLUDED.tanggal_kegiatan)
         RETURNING id`,
        [anak.rows[0].posyandu_id, tanggal.getUTCMonth() + 1, tanggal.getUTCFullYear(), data.tanggalUkur],
    );

    const lama = await db.query<{ id: number }>(
        `SELECT id FROM pengukuran
          WHERE id_sumber = $1 OR (anak_id = $2 AND periode_id = $3)
          ORDER BY (id_sumber = $1) DESC LIMIT 1 FOR UPDATE`,
        [data.idPengukuran, anak.rows[0].id, periode.rows[0].id],
    );
    const nilai = [
        periode.rows[0].id, pengguna.id, data.tanggalUkur, data.bbKg, data.tinggiCm,
        data.jenisUkur, data.lilaCm, data.likaCm, data.ntob, data.statusKehadiran,
        data.idPengukuran,
    ];

    if (lama.rows[0] === undefined) {
        const baru = await db.query<{ id: number }>(
            `INSERT INTO pengukuran
                 (anak_id, periode_id, dicatat_oleh, tanggal_ukur, bb_kg, tinggi_cm,
                  jenis_ukur, lila_cm, lika_cm, ntob_raw, status_kehadiran, sumber, id_sumber)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'tablet', $12)
             RETURNING id`,
            [anak.rows[0].id, ...nilai],
        );

        return baru.rows[0].id;
    }

    await db.query(
        `UPDATE pengukuran SET periode_id=$2, dicatat_oleh=$3, tanggal_ukur=$4,
                bb_kg=$5, tinggi_cm=$6, jenis_ukur=$7, lila_cm=$8, lika_cm=$9,
                ntob_raw=$10, status_kehadiran=$11, sumber='tablet', id_sumber=$12
          WHERE id=$1`,
        [lama.rows[0].id, ...nilai],
    );

    return lama.rows[0].id;
}

/** Bentuk kompatibel dengan cache offline tablet versi 1.8. */
export async function paketSinkronisasi(pool: Pool, pengguna: PenggunaAktif) {
    const rt = batasRt(pengguna);
    const anak = await pool.query(
        `SELECT a.id AS id_anak, a.nik,
                'ANAK-' || lpad(a.id::text, 8, '0') AS kode_kartu,
                a.nama AS nama_anak, to_char(a.tgl_lahir, 'YYYY-MM-DD') AS tgl_lahir,
                a.jk, o.nama AS nama_ortu, o.nik AS nik_ortu, w.rt,
                a.anak_ke, a.bb_lahir_kg::text AS bb_lahir,
                a.pb_lahir_cm::text AS pb_lahir, a.buku_kia, a.imd,
                EXISTS (SELECT 1 FROM layanan l WHERE l.anak_id=a.id AND l.jenis='imunisasi') AS imunisasi_lengkap
           FROM anak a
           LEFT JOIN orang_tua o ON o.id=a.orang_tua_id
           LEFT JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
          WHERE a.deleted_at IS NULL AND ($1::text IS NULL OR w.rt=$1)
          ORDER BY a.nama_baku, a.id`,
        [rt],
    );
    const pengukuran = await pool.query(
        `SELECT coalesce(p.id_sumber, 'ukur_db_' || p.id::text) AS id_pengukuran,
                a.nik, to_char(p.tanggal_ukur, 'YYYY-MM-DD') AS tanggal_ukur,
                p.bb_kg::text, p.tinggi_cm::text AS panjang_tinggi_cm,
                CASE p.jenis_ukur WHEN 'TB' THEN 'Berdiri' ELSE 'Terlentang' END AS jenis_ukur,
                p.lila_cm::text AS lila, p.lika_cm::text AS lika, p.ntob_raw AS ntob,
                CASE p.status_kehadiran WHEN 'hadir' THEN 'Hadir'
                     WHEN 'tidak_hadir' THEN 'Tidak Hadir' WHEN 'pindah' THEN 'Pindah'
                     ELSE 'Tidak Dapat Diukur' END AS status_kehadiran
           FROM pengukuran p
           JOIN anak a ON a.id=p.anak_id
           LEFT JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
          WHERE a.deleted_at IS NULL AND ($1::text IS NULL OR w.rt=$1)
          ORDER BY p.tanggal_ukur, p.id`,
        [rt],
    );

    return { anak: anak.rows, pengukuran: pengukuran.rows, waktuServer: new Date().toISOString() };
}
