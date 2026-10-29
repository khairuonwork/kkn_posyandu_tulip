import type { Pool, PoolClient } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";

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
    const { rows } = await pool.query<PeriodeDb>(
        `SELECT to_char(make_date(pe.tahun, pe.bulan, 1), 'YYYY-MM') AS id,
                to_char(coalesce(pe.tanggal_kegiatan,
                    max(p.tanggal_ukur) FILTER (WHERE $1::boolean OR w.posyandu_id=ANY($2::bigint[]))),
                    'YYYY-MM-DD') AS "tanggalKegiatan",
                count(p.id) FILTER (WHERE $1::boolean OR w.posyandu_id=ANY($2::bigint[])) > 0 AS "adaPengukuran"
           FROM periode pe
           LEFT JOIN pengukuran p ON p.periode_id = pe.id
           LEFT JOIN anak a ON a.id = p.anak_id AND a.deleted_at IS NULL
           LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
          WHERE ($1::boolean OR pe.posyandu_id=ANY($2::bigint[]))
            AND ($1::boolean OR EXISTS (
              SELECT 1 FROM sasaran s
              JOIN anak sa ON sa.id = s.anak_id AND sa.deleted_at IS NULL
              JOIN wilayah_rt sw ON sw.id = sa.wilayah_rt_id
              WHERE s.periode_id = pe.id AND sw.posyandu_id=ANY($2::bigint[])
          ) OR w.posyandu_id=ANY($2::bigint[]))
          GROUP BY pe.id
          ORDER BY pe.tahun, pe.bulan`,
        [pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    return rows;
}

export async function riwayatBeranda(
    pool: Pool,
    pengguna: PenggunaAktif,
    awal: string,
    akhir: string,
): Promise<BarisUkurBeranda[]> {
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
            AND ($3::boolean OR w.posyandu_id=ANY($4::bigint[]))
          GROUP BY p.id, pe.id, a.id, w.rt
          ORDER BY p.tanggal_ukur DESC, p.id DESC`,
        [`${awal}-01`, `${akhir}-01`, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    return rows;
}

export async function jumlahSasaran(
    pool: Pool,
    pengguna: PenggunaAktif,
    awal: string,
    akhir: string,
    rt: string | null = null,
): Promise<Record<string, number>> {
    const { rows } = await pool.query<{ periodeId: string; jumlah: number }>(
        `SELECT to_char(make_date(pe.tahun, pe.bulan, 1), 'YYYY-MM') AS "periodeId",
                count(*) FILTER (WHERE $5::text IS NULL OR w.rt=$5)::int AS jumlah
           FROM sasaran s
           JOIN periode pe ON pe.id = s.periode_id
           JOIN anak a ON a.id = s.anak_id AND a.deleted_at IS NULL
           LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
          WHERE make_date(pe.tahun, pe.bulan, 1) BETWEEN $1::date AND $2::date
            AND ($3::boolean OR w.posyandu_id=ANY($4::bigint[]))
          GROUP BY pe.id`,
        [`${awal}-01`, `${akhir}-01`, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? [], rt],
    );
    return Object.fromEntries(rows.map((row) => [row.periodeId, row.jumlah]));
}

export async function daftarRt(pool: Pool, pengguna: PenggunaAktif): Promise<string[]> {
    const { rows } = await pool.query<{ rt: string }>(
        `SELECT DISTINCT rt FROM wilayah_rt WHERE ($1::boolean OR posyandu_id=ANY($2::bigint[])) ORDER BY rt`,
        [pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    return rows.map(r => r.rt);
}

export type BarisHariH = {
    periodeId:string; periodeDbId:number; wilayahRtId:number; rt:string; posyandu:string;
    tanggalHariH:string|null; hadirHariH:number|null; sumber:'manual'|'antrean'|null; sasaran:number;
};

/** Tanggal input/ukur bukan bukti hadir fisik: gunakan daftar hadir, bukan pengukuran. */
export async function dataHariH(pool: Pool,pengguna:PenggunaAktif,awal:string,akhir:string): Promise<BarisHariH[]> {
    const {rows} = await pool.query<BarisHariH>(`
        SELECT to_char(make_date(pe.tahun,pe.bulan,1),'YYYY-MM') AS "periodeId",
            pe.id AS "periodeDbId",w.id AS "wilayahRtId",w.rt,ps.nama AS posyandu,
            to_char(coalesce(tanggal_override.tanggal_hari_h,pe.tanggal_kegiatan),'YYYY-MM-DD') AS "tanggalHariH",
            CASE WHEN h.jumlah_hadir IS NOT NULL THEN h.jumlah_hadir
                WHEN EXISTS(SELECT 1 FROM antrean_layanan q JOIN sasaran s ON s.id=q.sasaran_id
                    JOIN anak a ON a.id=s.anak_id AND a.deleted_at IS NULL
                    WHERE q.periode_id=pe.id AND q.tanggal=coalesce(tanggal_override.tanggal_hari_h,pe.tanggal_kegiatan) AND q.status<>'cancelled')
                THEN (SELECT count(DISTINCT a.id)::int FROM antrean_layanan q
                    JOIN sasaran s ON s.id=q.sasaran_id JOIN anak a ON a.id=s.anak_id AND a.deleted_at IS NULL
                    WHERE q.periode_id=pe.id AND q.tanggal=coalesce(tanggal_override.tanggal_hari_h,pe.tanggal_kegiatan)
                        AND q.status<>'cancelled' AND a.wilayah_rt_id=w.id)
                ELSE NULL END AS "hadirHariH",
            CASE WHEN h.jumlah_hadir IS NOT NULL THEN 'manual'
                WHEN EXISTS(SELECT 1 FROM antrean_layanan q WHERE q.periode_id=pe.id
                    AND q.tanggal=coalesce(tanggal_override.tanggal_hari_h,pe.tanggal_kegiatan) AND q.status<>'cancelled') THEN 'antrean'
                ELSE NULL END AS sumber,
            (SELECT count(*)::int FROM sasaran s JOIN anak a ON a.id=s.anak_id AND a.deleted_at IS NULL
                WHERE s.periode_id=pe.id AND a.wilayah_rt_id=w.id) AS sasaran
        FROM periode pe JOIN posyandu ps ON ps.id=pe.posyandu_id
        JOIN wilayah_rt w ON w.posyandu_id=ps.id
        LEFT JOIN LATERAL (SELECT h0.tanggal_hari_h FROM cakupan_hari_h h0 WHERE h0.periode_id=pe.id
            ORDER BY h0.updated_at DESC,h0.id DESC LIMIT 1) tanggal_override ON true
        LEFT JOIN cakupan_hari_h h ON h.periode_id=pe.id AND h.wilayah_rt_id=w.id
            AND h.tanggal_hari_h=coalesce(tanggal_override.tanggal_hari_h,pe.tanggal_kegiatan)
        WHERE make_date(pe.tahun,pe.bulan,1) BETWEEN ($1||'-01')::date AND ($2||'-01')::date
            AND ($3::boolean OR ps.id=ANY($4::bigint[]))
            AND EXISTS(SELECT 1 FROM sasaran s JOIN anak a ON a.id=s.anak_id AND a.deleted_at IS NULL
                WHERE s.periode_id=pe.id AND a.wilayah_rt_id=w.id)
        ORDER BY pe.tahun,pe.bulan,ps.id,w.rt`,[awal,akhir,pengguna.superAdmin??false,pengguna.posyanduIds??[]]);
    return rows;
}

export async function simpanHariH(db:PoolClient,pengguna:PenggunaAktif,row:{periodeDbId:number;wilayahRtId:number;tanggalHariH:string;hadirHariH:number|null}) {
    const params=[row.periodeDbId,row.wilayahRtId,pengguna.superAdmin??false,pengguna.posyanduIds??[]];
    if (row.hadirHariH === null) {
        await db.query(`DELETE FROM cakupan_hari_h h USING periode pe
            WHERE h.periode_id=$1 AND h.wilayah_rt_id=$2 AND pe.id=h.periode_id
                AND ($3::boolean OR pe.posyandu_id=ANY($4::bigint[]))`,params);
    } else {
        await db.query(`INSERT INTO cakupan_hari_h(periode_id,wilayah_rt_id,tanggal_hari_h,jumlah_hadir,dicatat_oleh)
            SELECT pe.id,w.id,$5,$6,$7 FROM periode pe JOIN wilayah_rt w ON w.posyandu_id=pe.posyandu_id
            WHERE pe.id=$1 AND w.id=$2 AND ($3::boolean OR pe.posyandu_id=ANY($4::bigint[]))
            ON CONFLICT(periode_id,wilayah_rt_id) DO UPDATE SET tanggal_hari_h=EXCLUDED.tanggal_hari_h,
                jumlah_hadir=EXCLUDED.jumlah_hadir,dicatat_oleh=EXCLUDED.dicatat_oleh,updated_at=now()`,
            [...params,row.tanggalHariH,row.hadirHariH,pengguna.id]);
    }
}
