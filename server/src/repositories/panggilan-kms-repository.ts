import type { Pool, PoolClient } from "pg";
import type { PenggunaAktif } from "../auth/peran.ts";

export type AksiPanggilan = "panggil" | "ulang" | "tiba" | "kembalikan";

export async function mejaAkunKms(pool: Pool, penggunaId: number): Promise<number | null> {
    const { rows } = await pool.query<{ mejaKms: number | null }>(
        `SELECT meja_kms AS "mejaKms" FROM pengguna_posyandu
          WHERE pengguna_id=$1 ORDER BY posyandu_id LIMIT 1`,
        [penggunaId],
    );
    return rows[0]?.mejaKms ?? null;
}

export async function sesiKms(pool: Pool, pengguna: PenggunaAktif, periode: string) {
    const { rows } = await pool.query<{ id: number; mejaKms: number | null }>(
        `SELECT p.id, up.meja_kms AS "mejaKms"
           FROM periode p
           LEFT JOIN pengguna_posyandu up ON up.posyandu_id=p.posyandu_id AND up.pengguna_id=$1
          WHERE (up.pengguna_id IS NOT NULL OR $2::boolean)
            AND to_char(make_date(p.tahun,p.bulan,1), 'YYYY-MM')=$3
          ORDER BY p.posyandu_id LIMIT 1`,
        [pengguna.id, pengguna.superAdmin ?? false, periode],
    );
    return rows[0] ?? null;
}

export async function ubahPanggilan(
    db: PoolClient, penggunaId: number, periodeId: number, tanggal: string, id: string, aksi: AksiPanggilan,
    mejaDiharapkan?: number,
) {
    await db.query("SELECT pg_advisory_xact_lock($1::integer, $2::integer)", [
        periodeId, Number(tanggal.replaceAll("-", "")),
    ]);
    const { rows: akun } = await db.query<{ meja: number | null }>(
        `SELECT up.meja_kms AS meja FROM pengguna u
           JOIN pengguna_posyandu up ON up.pengguna_id=u.id
           JOIN periode p ON p.posyandu_id=up.posyandu_id
          WHERE u.id=$1 AND u.aktif AND u.peran='kms'
            AND p.id=$2 AND p.sesi_ditutup_pada IS NULL
          FOR SHARE OF u, up, p`,
        [penggunaId, periodeId],
    );
    const meja = akun[0]?.meja;
    if (meja == null) return "tanpa-meja";
    if (mejaDiharapkan !== undefined && mejaDiharapkan !== meja) return "bentrok";

    const { rows } = await db.query<{ nomor: number }>(
        `UPDATE antrean_layanan q SET
            meja_kms=CASE WHEN $5='kembalikan' THEN NULL ELSE $4::integer END,
            tiba_kms=$5='tiba',
            kms_petugas_id=CASE WHEN $5='kembalikan' THEN NULL ELSE coalesce(q.kms_petugas_id, $6) END,
            kms_dipanggil_pada=CASE WHEN $5='kembalikan' THEN NULL WHEN $5='panggil' THEN now() ELSE q.kms_dipanggil_pada END,
            called_at=CASE WHEN $5 IN ('panggil', 'ulang') THEN now()
                           WHEN $5='kembalikan' THEN NULL ELSE q.called_at END,
            updated_by=$6
          WHERE q.id=$1 AND q.periode_id=$2 AND q.tanggal=$3::date
            AND q.status NOT IN ('done', 'cancelled')
            AND EXISTS (SELECT 1 FROM sasaran s JOIN anak a ON a.id=s.anak_id
                        WHERE s.id=q.sasaran_id AND a.deleted_at IS NULL)
            AND (($5='panggil' AND q.meja_kms IS NULL AND q.kms_petugas_id IS NULL AND NOT EXISTS (
                   SELECT 1 FROM antrean_layanan aktif
                    WHERE aktif.periode_id=$2 AND aktif.tanggal=$3::date AND (aktif.meja_kms=$4 OR aktif.kms_petugas_id=$6)
                      AND aktif.status NOT IN ('done', 'cancelled')
                )) OR ($5 IN ('ulang', 'tiba') AND q.meja_kms=$4 AND (q.kms_petugas_id IS NULL OR q.kms_petugas_id=$6) AND NOT q.tiba_kms)
                   OR ($5='kembalikan' AND q.meja_kms=$4 AND (q.kms_petugas_id IS NULL OR q.kms_petugas_id=$6)))
          RETURNING q.nomor`,
        [id, periodeId, tanggal, meja, aksi, penggunaId],
    );
    if (!rows[0]) return "bentrok";
    if (aksi === "panggil" || aksi === "ulang") {
        await db.query("INSERT INTO panggilan_kms (antrean_id, nomor, meja) VALUES ($1,$2,$3)", [
            id, rows[0].nomor, meja,
        ]);
    }
    return "berhasil";
}

export async function daftarPanggilan(pool: Pool, periodeId: number, tanggal: string, setelah: string | null) {
    const { rows } = await pool.query<{ id: string; nomor: number; meja: number; nama: string | null }>(
        `SELECT k.id::text AS id, k.nomor, k.meja, a.nama FROM panggilan_kms k
           JOIN antrean_layanan q ON q.id=k.antrean_id
           LEFT JOIN sasaran s ON s.id=q.sasaran_id
           LEFT JOIN anak a ON a.id=s.anak_id
          WHERE q.periode_id=$1 AND q.tanggal=$2::date
            AND ($3::bigint IS NULL OR k.id > $3)
          ORDER BY CASE WHEN $3::bigint IS NULL THEN k.id END DESC,
                   CASE WHEN $3::bigint IS NOT NULL THEN k.id END ASC
          LIMIT CASE WHEN $3::bigint IS NULL THEN 1 ELSE 50 END`,
        [periodeId, tanggal, setelah],
    );
    return rows;
}
