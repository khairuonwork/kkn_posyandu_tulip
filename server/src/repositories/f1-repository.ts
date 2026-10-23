import type { Pool } from 'pg';
import type { PenggunaAktif } from '../auth/peran.ts';

export async function dasarF1(pool: Pool, user: PenggunaAktif, periode: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) throw new RangeError('Periode harus berformat YYYY-MM.');
    const {rows} = await pool.query(`SELECT a.id AS "anakId",a.nama,a.jk,wr.rt,
        ps.id AS "posyanduId",ps.nama AS posyandu,ps.rw,ps.kelurahan,
        to_char(a.tgl_lahir,'YYYY-MM-DD') AS "tglLahir",
        to_char(pe.tanggal_kegiatan,'YYYY-MM-DD') AS "tanggalKegiatan",
        to_char(p.tanggal_ukur,'YYYY-MM-DD') AS "tanggalUkur",
        p.bb_kg::float8 AS bb,p.ntob_raw AS "ntobRaw",s.status AS "statusSasaran",
        (p.bb_kg IS NOT NULL AND p.status_kehadiran='hadir') AS diukur,
        EXISTS(SELECT 1 FROM pengukuran prev JOIN periode pp ON pp.id=prev.periode_id
            WHERE prev.anak_id=a.id AND prev.bb_kg IS NOT NULL AND prev.status_kehadiran='hadir'
            AND make_date(pp.tahun,pp.bulan,1)<($1||'-01')::date) AS "pernahDiukur",
        ekonomi.gng,ekonomi.desil,ekonomi.sumber AS "sumberEkonomi",ekonomi.periode AS "periodeEkonomi",
        asi.asi_eksklusif AS asi
        FROM sasaran s JOIN periode pe ON pe.id=s.periode_id
        JOIN posyandu ps ON ps.id=pe.posyandu_id JOIN anak a ON a.id=s.anak_id
        JOIN wilayah_rt wr ON wr.id=a.wilayah_rt_id AND wr.posyandu_id=ps.id
        LEFT JOIN pengukuran p ON p.anak_id=a.id AND p.periode_id=pe.id
        LEFT JOIN LATERAL (SELECT * FROM sumber_f1 sf WHERE sf.anak_id=a.id AND sf.periode<=$1
            AND (sf.gng IS NOT NULL OR sf.desil IS NOT NULL) ORDER BY sf.periode DESC LIMIT 1) ekonomi ON true
        LEFT JOIN sumber_f1 asi ON asi.anak_id=a.id AND asi.periode=$1
        WHERE a.deleted_at IS NULL AND s.status NOT IN ('batal','pindah')
        AND make_date(pe.tahun,pe.bulan,1)=($1||'-01')::date
        AND ($2::boolean OR ps.id=ANY($3::bigint[]))
        ORDER BY ps.id,a.jk,a.tgl_lahir DESC,a.nama`,[periode,user.superAdmin??false,user.posyanduIds??[]]);
    return rows;
}
