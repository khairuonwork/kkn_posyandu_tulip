import type { Pool } from "pg";
import type { PenggunaAktif } from "../auth/peran.ts";

export type BarisLaporan = {
    anakId: number;
    nama: string;
    nik: string | null;
    namaOrtu: string | null;
    tglLahir: string;
    jk: "L" | "P";
    rt: string | null;
    periodeId: string;
    tanggalUkur: string;
    umurHari: number;
    bbKg: number | null;
    tinggiCm: number | null;
    lilaCm: number | null;
    likaCm: number | null;
    ntobRaw: string | null;
    statusKehadiran: string;
    jenisUkur: "PB" | "TB" | null;
    penilaian: Record<string, Record<string, Record<string, unknown>>>;
};

/** Satu baris per anak dan periode; data sumber tetap read-only. */
export async function dataLaporan(
    pool: Pool,
    pengguna: PenggunaAktif,
    sampai: string,
): Promise<BarisLaporan[]> {
    const { rows } = await pool.query<BarisLaporan>(
        `SELECT a.id AS "anakId", a.nama, a.nik,
                to_char(a.tgl_lahir, 'YYYY-MM-DD') AS "tglLahir", a.jk,
                ot.nama AS "namaOrtu",
                wr.rt,
                to_char(make_date(pe.tahun, pe.bulan, 1), 'YYYY-MM') AS "periodeId",
                to_char(p.tanggal_ukur, 'YYYY-MM-DD') AS "tanggalUkur",
                (p.tanggal_ukur - a.tgl_lahir)::int AS "umurHari",
                p.bb_kg::float8 AS "bbKg", p.tinggi_cm::float8 AS "tinggiCm",
                p.lila_cm::float8 AS "lilaCm", p.lika_cm::float8 AS "likaCm",
                p.ntob_raw AS "ntobRaw", p.status_kehadiran AS "statusKehadiran",
                p.jenis_ukur AS "jenisUkur",
                coalesce((
                    SELECT jsonb_object_agg(s.standar_versi, s.nilai)
                    FROM (
                        SELECT pg.standar_versi,
                               jsonb_object_agg(pg.indeks, jsonb_build_object(
                                   'z', pg.z_score, 'kategori', pg.kategori,
                                   'tidakWajar', pg.tidak_wajar
                               )) AS nilai
                        FROM penilaian_gizi pg
                        WHERE pg.pengukuran_id = p.id AND pg.z_score IS NOT NULL
                        GROUP BY pg.standar_versi
                    ) s
                ), '{}'::jsonb) AS penilaian
           FROM pengukuran p
           JOIN anak a ON a.id = p.anak_id
           JOIN periode pe ON pe.id = p.periode_id
           LEFT JOIN orang_tua ot ON ot.id = a.orang_tua_id
           LEFT JOIN wilayah_rt wr ON wr.id = a.wilayah_rt_id
          WHERE a.deleted_at IS NULL
            AND make_date(pe.tahun, pe.bulan, 1) <= ($1 || '-01')::date
            AND ($2::boolean OR wr.posyandu_id=ANY($3::bigint[]))
          ORDER BY a.nama_baku, p.tanggal_ukur, p.id`,
        [sampai, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    return rows;
}
