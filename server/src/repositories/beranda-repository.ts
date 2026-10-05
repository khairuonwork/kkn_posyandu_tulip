import type { Pool } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { rtYangBolehDilihat } from "../auth/peran.ts";

type PeriodeDb = {
    id: string;
    tanggalKegiatan: string | null;
    adaPengukuran: boolean;
};

export type BarisUkurBeranda = {
    anakId: number;
    periodeId: string;
    nama: string;
    tglLahir: string;
    rt: string | null;
    tanggalUkur: string;
    statusKehadiran: string;
    ntob: string | null;
    bbTb: { z: number; kategori: string | null } | null;
    tbU: { z: number; kategori: string | null } | null;
    bbU: { z: number; kategori: string | null } | null;
};

/** Periode dan data selalu dibatasi RT di query, bukan disaring di browser. */
export async function daftarPeriode(pool: Pool, pengguna: PenggunaAktif): Promise<PeriodeDb[]> {
    const rt = rtYangBolehDilihat(pengguna);
    const { rows } = await pool.query<PeriodeDb>(
        `SELECT to_char(make_date(pe.tahun, pe.bulan, 1), 'YYYY-MM') AS id,
                to_char(coalesce(pe.tanggal_kegiatan,
                    max(p.tanggal_ukur) FILTER (WHERE $1::text IS NULL OR w.rt = $1)),
                    'YYYY-MM-DD') AS "tanggalKegiatan",
                count(p.id) FILTER (WHERE $1::text IS NULL OR w.rt = $1) > 0 AS "adaPengukuran"
           FROM periode pe
           LEFT JOIN pengukuran p ON p.periode_id = pe.id
           LEFT JOIN anak a ON a.id = p.anak_id AND a.deleted_at IS NULL
           LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
          WHERE ($1::text IS NULL OR EXISTS (
              SELECT 1 FROM sasaran s
              JOIN anak sa ON sa.id = s.anak_id AND sa.deleted_at IS NULL
              JOIN wilayah_rt sw ON sw.id = sa.wilayah_rt_id
              WHERE s.periode_id = pe.id AND sw.rt = $1
          ) OR w.rt = $1)
          GROUP BY pe.id
          ORDER BY pe.tahun, pe.bulan`,
        [rt],
    );
    return rows;
}

export async function riwayatBeranda(
    pool: Pool,
    pengguna: PenggunaAktif,
    awal: string,
    akhir: string,
): Promise<BarisUkurBeranda[]> {
    const rt = rtYangBolehDilihat(pengguna);
    const { rows } = await pool.query<BarisUkurBeranda>(
        `SELECT p.anak_id AS "anakId",
                to_char(make_date(pe.tahun, pe.bulan, 1), 'YYYY-MM') AS "periodeId",
                a.nama, to_char(a.tgl_lahir, 'YYYY-MM-DD') AS "tglLahir",
                w.rt, to_char(p.tanggal_ukur, 'YYYY-MM-DD') AS "tanggalUkur",
                p.status_kehadiran AS "statusKehadiran", p.ntob_raw AS ntob,
                (jsonb_agg(jsonb_build_object('z', pg.z_score, 'kategori', pg.kategori))
                    FILTER (WHERE pg.indeks = 'BB_TB' AND NOT pg.tidak_wajar))->0 AS "bbTb",
                (jsonb_agg(jsonb_build_object('z', pg.z_score, 'kategori', pg.kategori))
                    FILTER (WHERE pg.indeks = 'TB_U' AND NOT pg.tidak_wajar))->0 AS "tbU",
                (jsonb_agg(jsonb_build_object('z', pg.z_score, 'kategori', pg.kategori))
                    FILTER (WHERE pg.indeks = 'BB_U' AND NOT pg.tidak_wajar))->0 AS "bbU"
           FROM pengukuran p
           JOIN periode pe ON pe.id = p.periode_id
           JOIN anak a ON a.id = p.anak_id AND a.deleted_at IS NULL
           LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
           LEFT JOIN penilaian_gizi pg ON pg.pengukuran_id = p.id
                AND pg.standar_versi = 'WHO-2006'
                AND pg.indeks IN ('BB_TB', 'TB_U', 'BB_U')
          WHERE make_date(pe.tahun, pe.bulan, 1) BETWEEN $1::date AND $2::date
            AND ($3::text IS NULL OR w.rt = $3)
          GROUP BY p.id, pe.id, a.id, w.rt
          ORDER BY p.tanggal_ukur DESC, p.id DESC`,
        [`${awal}-01`, `${akhir}-01`, rt],
    );
    return rows;
}

export async function jumlahSasaran(
    pool: Pool,
    pengguna: PenggunaAktif,
    awal: string,
    akhir: string,
): Promise<Record<string, number>> {
    const rt = rtYangBolehDilihat(pengguna);
    const { rows } = await pool.query<{ periodeId: string; jumlah: number }>(
        `SELECT to_char(make_date(pe.tahun, pe.bulan, 1), 'YYYY-MM') AS "periodeId",
                count(*)::int AS jumlah
           FROM sasaran s
           JOIN periode pe ON pe.id = s.periode_id
           JOIN anak a ON a.id = s.anak_id AND a.deleted_at IS NULL
           LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
          WHERE make_date(pe.tahun, pe.bulan, 1) BETWEEN $1::date AND $2::date
            AND ($3::text IS NULL OR w.rt = $3)
          GROUP BY pe.id`,
        [`${awal}-01`, `${akhir}-01`, rt],
    );
    return Object.fromEntries(rows.map((row) => [row.periodeId, row.jumlah]));
}
