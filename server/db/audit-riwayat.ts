/** Audit baca-saja untuk kualitas riwayat ukur; tidak menampilkan identitas anak. */
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';

const pool = dapatkanPool();
const client = await pool.connect();

try {
    await client.query('BEGIN READ ONLY');

    const ringkasan = await client.query(`
        SELECT count(*)::int AS pengukuran,
               count(DISTINCT anak_id)::int AS anak,
               count(*) FILTER (WHERE status_kehadiran = 'hadir' AND bb_kg IS NULL)::int AS hadir_tanpa_bb,
               count(*) FILTER (WHERE status_kehadiran <> 'hadir' AND bb_kg IS NOT NULL)::int AS absen_berbb,
               count(*) FILTER (WHERE bb_kg <= 0 OR tinggi_cm <= 0)::int AS nilai_nonpositif
        FROM pengukuran
    `);
    const duplikat = await client.query(`
        SELECT
            (SELECT count(*)::int FROM (
                SELECT anak_id, periode_id FROM pengukuran GROUP BY 1, 2 HAVING count(*) > 1
            ) q) AS anak_periode,
            (SELECT count(*)::int FROM (
                SELECT anak_id, tanggal_ukur FROM pengukuran GROUP BY 1, 2 HAVING count(*) > 1
            ) q) AS anak_tanggal,
            (SELECT count(*)::int FROM (
                SELECT pengukuran_id, indeks, standar_versi FROM penilaian_gizi GROUP BY 1, 2, 3 HAVING count(*) > 1
            ) q) AS penilaian_sama,
            (SELECT count(*)::int FROM (
                SELECT nik FROM anak WHERE deleted_at IS NULL AND nik IS NOT NULL GROUP BY 1 HAVING count(*) > 1
            ) q) AS nik_anak,
            (SELECT count(*)::int FROM (
                SELECT nama_baku, tgl_lahir, jk, wilayah_rt_id FROM anak
                WHERE deleted_at IS NULL GROUP BY 1, 2, 3, 4 HAVING count(*) > 1
            ) q) AS kandidat_anak_nama_lahir_rt
    `);
    const zScore = await client.query(`
        SELECT indeks,
               count(*)::int AS total,
               count(*) FILTER (WHERE tidak_wajar)::int AS ditandai_tidak_wajar,
               count(*) FILTER (WHERE CASE indeks
                   WHEN 'BB_U' THEN z_score < -6 OR z_score > 5
                   WHEN 'TB_U' THEN z_score < -6 OR z_score > 6
                   WHEN 'BB_TB' THEN z_score < -5 OR z_score > 5
                   WHEN 'IMT_U' THEN z_score < -5 OR z_score > 5
                   ELSE false END)::int AS diluar_rentang_who,
               min(z_score)::float8 AS min_z, max(z_score)::float8 AS max_z
        FROM penilaian_gizi
        WHERE standar_versi = 'WHO-2006' AND z_score IS NOT NULL
        GROUP BY indeks ORDER BY indeks
    `);
    const selisih = await client.query(`
        WITH urut AS (
            SELECT anak_id, tanggal_ukur, bb_kg,
                   lag(tanggal_ukur) OVER (PARTITION BY anak_id ORDER BY tanggal_ukur, id) AS tanggal_lalu,
                   lag(bb_kg) OVER (PARTITION BY anak_id ORDER BY tanggal_ukur, id) AS bb_lalu
            FROM pengukuran WHERE status_kehadiran = 'hadir' AND bb_kg IS NOT NULL
        )
        SELECT count(*) FILTER (WHERE tanggal_ukur - tanggal_lalu BETWEEN 1 AND 62 AND abs(bb_kg - bb_lalu) > 3)::int AS beda_bb_lebih_3kg_62hari,
               count(*) FILTER (WHERE tanggal_ukur - tanggal_lalu = 0)::int AS ukur_berulang_hari_sama
        FROM urut
    `);
    const kandidat = await client.query(`
        WITH calon AS (
            SELECT nama_baku, tgl_lahir, jk, wilayah_rt_id
            FROM anak WHERE deleted_at IS NULL
            GROUP BY 1, 2, 3, 4 HAVING count(*) > 1
        )
        SELECT array_agg(a.id ORDER BY a.id) AS id_anak,
               count(DISTINCT a.nik)::int AS nik_berbeda,
               count(*) FILTER (WHERE a.nik IS NULL)::int AS nik_kosong,
               array_agg((SELECT count(*)::int FROM pengukuran p WHERE p.anak_id = a.id) ORDER BY a.id) AS jumlah_riwayat
        FROM calon c JOIN anak a USING (nama_baku, tgl_lahir, jk, wilayah_rt_id)
        WHERE a.deleted_at IS NULL
        GROUP BY c.nama_baku, c.tgl_lahir, c.jk, c.wilayah_rt_id
    `);
    const contoh = await client.query(`
        SELECT p.id, to_char(p.tanggal_ukur, 'YYYY-MM-DD') AS tanggal,
               pe.tahun, pe.bulan, p.bb_kg::float8 AS bb,
               p.tinggi_cm::float8 AS tinggi, p.status_kehadiran AS hadir,
               p.sumber, pg.z_score::float8 AS z_bbu, pg.tidak_wajar
        FROM pengukuran p
        JOIN periode pe ON pe.id = p.periode_id
        LEFT JOIN penilaian_gizi pg ON pg.pengukuran_id = p.id
            AND pg.indeks = 'BB_U' AND pg.standar_versi = 'WHO-2006'
        WHERE p.anak_id = $1
        ORDER BY p.tanggal_ukur DESC, p.id DESC
    `, [Number(process.argv[2] ?? 289)]);

    console.log(JSON.stringify({
        ringkasan: ringkasan.rows[0],
        duplikat: duplikat.rows[0],
        zScore: zScore.rows,
        selisih: selisih.rows[0],
        kandidatIdentitas: kandidat.rows,
        riwayatAnak: contoh.rows,
    }, null, 2));
    await client.query('COMMIT');
} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    client.release();
    await tutupPool();
}
