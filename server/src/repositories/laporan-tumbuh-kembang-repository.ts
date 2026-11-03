import type { Pool } from "pg";
import type { PenggunaAktif } from "../auth/peran.ts";
import type { PertanyaanKia } from "../edukasi/kia-2024.ts";
import type { JawabanKia } from "../services/survei-kia-domain.ts";

export type BarisSurveiBulanan = {
    anakId: number;
    nama: string;
    surveiId: number;
    tanggal: string;
    umurBulan: number;
    kelompokId: string;
    kelompokLabel: string;
    pertanyaan: PertanyaanKia[];
    jawaban: JawabanKia;
};

export async function dataSurveiBulanan(
    pool: Pool,
    pengguna: PenggunaAktif,
    periode: string,
    kelompokIds: string[],
): Promise<BarisSurveiBulanan[]> {
    const { rows } = await pool.query<BarisSurveiBulanan>(
        `
        SELECT a.id AS "anakId", a.nama, s.id AS "surveiId",
            to_char(s.tanggal, 'YYYY-MM-DD') AS tanggal,
            s.umur_bulan AS "umurBulan", s.kelompok_id AS "kelompokId",
            s.kelompok_label AS "kelompokLabel", s.pertanyaan_snapshot AS pertanyaan, s.jawaban
        FROM survei_perkembangan_kia s
        JOIN anak a ON a.id=s.anak_id
        JOIN wilayah_rt wr ON wr.id=a.wilayah_rt_id
        WHERE a.deleted_at IS NULL
            AND s.tanggal >= ($1 || '-01')::date
            AND s.tanggal < (($1 || '-01')::date + interval '1 month')
            AND ($2::boolean OR wr.posyandu_id=ANY($3::bigint[]))
            AND s.kelompok_id=ANY($4::text[])
            AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(s.pertanyaan_snapshot) q
                WHERE s.jawaban->>(q->>'id')='tidak'
            )
        ORDER BY a.nama_baku, a.id, s.tanggal DESC, s.id DESC`,
        [
            periode,
            pengguna.superAdmin ?? false,
            pengguna.posyanduIds ?? [],
            kelompokIds,
        ],
    );
    return rows;
}
