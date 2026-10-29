import type { Pool } from 'pg';
import type { BarisLaporan } from './laporan-repository.ts';
import type { PenggunaAktif } from '../auth/peran.ts';

export type BarisArsip2T = Pick<BarisLaporan, 'anakId' | 'nama' | 'nik' | 'namaOrtu' | 'tglLahir' | 'jk' | 'rt' | 'bbKg' | 'tinggiCm' | 'lilaCm' | 'likaCm' | 'penilaian'> & {
    periodeLaporan: string;
    periodeId: string;
    jumlahT: number;
    umurBulan: number;
    sumberFile: string;
};

/** Read source-approved 2T snapshots, including monthly history with no exact day. */
export async function dataArsip2T(pool: Pool, sampai: string, pengguna: PenggunaAktif): Promise<BarisArsip2T[]> {
    const { rows } = await pool.query<BarisArsip2T>(`
        SELECT a.id AS "anakId", a.nama, a.nik, ot.nama AS "namaOrtu",
               to_char(a.tgl_lahir,'YYYY-MM-DD') AS "tglLahir", a.jk, wr.rt,
               r.periode_laporan AS "periodeLaporan", r.periode_riwayat AS "periodeId",
               r.jumlah_t::int AS "jumlahT", r.umur_bulan::float8 AS "umurBulan",
               r.bb_kg::float8 AS "bbKg", r.tinggi_cm::float8 AS "tinggiCm",
               r.lila_cm::float8 AS "lilaCm", r.lika_cm::float8 AS "likaCm",
               r.penilaian, r.sumber_file AS "sumberFile"
          FROM riwayat_2t_arsip r
          JOIN anak a ON a.id=r.anak_id AND a.deleted_at IS NULL
          LEFT JOIN orang_tua ot ON ot.id=a.orang_tua_id
          LEFT JOIN wilayah_rt wr ON wr.id=a.wilayah_rt_id
         WHERE r.periode_laporan <= $1
           AND ($2::boolean OR wr.posyandu_id=ANY($3::bigint[]))
         ORDER BY r.periode_laporan, a.id, r.periode_riwayat`, [sampai, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []]);
    return rows;
}
