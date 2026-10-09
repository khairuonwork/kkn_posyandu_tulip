import type { Pool, PoolClient } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";

export type StatusAntrean = "waiting" | "called" | "serving" | "kms_review" | "done" | "cancelled";

export type BarisAntrean = {
    id: string;
    periodeId: number;
    sasaranId: number;
    anakId: number;
    tanggal: string;
    nomor: number;
    urutan: number;
    childIdentity: string;
    nama: string;
    namaOrtu: string | null;
    rt: string | null;
    status: StatusAntrean;
    catatan: string | null;
    checkedInAt: string;
    calledAt: string | null;
    completedAt: string | null;
    updatedAt: string;
};

const PILIH = `SELECT q.id, q.periode_id AS "periodeId", q.sasaran_id AS "sasaranId", a.id AS "anakId",
                      to_char(q.tanggal, 'YYYY-MM-DD') AS tanggal,
                      q.nomor, q.urutan, coalesce(a.nik, 'ANAK-' || a.id::text) AS "childIdentity",
                      a.nama, o.nama AS "namaOrtu", w.rt, q.status, q.catatan,
                      q.checked_in_at AS "checkedInAt", q.called_at AS "calledAt",
                      q.completed_at AS "completedAt", q.updated_at AS "updatedAt"
                 FROM antrean_layanan q
                 JOIN sasaran s ON s.id = q.sasaran_id
                 JOIN anak a ON a.id = s.anak_id AND a.deleted_at IS NULL
                 LEFT JOIN orang_tua o ON o.id = a.orang_tua_id
                 LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id`;

export async function daftar(pool: Pool, _pengguna: PenggunaAktif, periodeId: number, tanggal: string) {
    // Antrean layanan adalah antrean bersama lintas RT dalam Posyandu.
    const rt: string | null = null;
    const { rows } = await pool.query<BarisAntrean>(
        `${PILIH} WHERE q.periode_id=$1 AND q.tanggal=$2::date
            AND ($3::text IS NULL OR w.rt=$3)
          ORDER BY q.urutan, q.nomor`,
        [periodeId, tanggal, rt],
    );
    return rows;
}

export async function checkIn(
    db: PoolClient,
    pengguna: PenggunaAktif,
    periodeId: number,
    sasaranId: number,
    tanggal: string,
    catatan: string | null,
): Promise<BarisAntrean | null> {
    // Semua kader yang berhak mencatat layanan dapat check-in sasaran lintas RT.
    const rt: string | null = null;
    const target = await db.query<{ rt: string | null }>(
        `SELECT w.rt FROM sasaran s
           JOIN periode p ON p.id=s.periode_id
           JOIN anak a ON a.id=s.anak_id AND a.deleted_at IS NULL
           LEFT JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
          WHERE s.id=$1 AND s.periode_id=$2 AND s.status='menunggu'
            AND p.sesi_ditutup_pada IS NULL
            AND ($3::text IS NULL OR w.rt=$3)
          FOR UPDATE OF s`,
        [sasaranId, periodeId, rt],
    );
    if (!target.rows[0]) return null;

    // Kunci per periode/tanggal memastikan dua pemindaian serentak mendapat nomor unik.
    const tanggalKunci = Number(tanggal.replaceAll("-", ""));
    await db.query("SELECT pg_advisory_xact_lock($1::integer, $2::integer)", [periodeId, tanggalKunci]);
    const id = `antrean_${tanggal.replaceAll("-", "")}_${sasaranId}`;
    const existing = await db.query<{ status: StatusAntrean }>(
        `SELECT status FROM antrean_layanan
          WHERE periode_id=$1 AND tanggal=$2::date AND sasaran_id=$3 FOR UPDATE`,
        [periodeId, tanggal, sasaranId],
    );
    if (existing.rows[0]) {
        if (existing.rows[0].status === "cancelled") {
            const max = await db.query<{ urutan: number }>(
                `SELECT coalesce(max(urutan), 0)::int AS urutan FROM antrean_layanan
                  WHERE periode_id=$1 AND tanggal=$2::date`, [periodeId, tanggal],
            );
            await db.query(
                `UPDATE antrean_layanan SET status='waiting', catatan=$2, urutan=$3,
                    checked_in_at=now(), called_at=NULL, completed_at=NULL,
                    updated_by=$4 WHERE id=$1`,
                [id, catatan, max.rows[0].urutan + 1, pengguna.id],
            );
        }
    } else {
        const nomor = await db.query<{ nomor: number; urutan: number }>(
            `SELECT coalesce(max(nomor),0)::int AS nomor, coalesce(max(urutan),0)::int AS urutan
               FROM antrean_layanan WHERE periode_id=$1 AND tanggal=$2::date`,
            [periodeId, tanggal],
        );
        await db.query(
            `INSERT INTO antrean_layanan
                (id, periode_id, sasaran_id, tanggal, nomor, urutan, catatan, created_by, updated_by)
             VALUES ($1,$2,$3,$4::date,$5,$6,$7,$8,$8)`,
            [id, periodeId, sasaranId, tanggal, nomor.rows[0].nomor + 1,
                nomor.rows[0].urutan + 1, catatan, pengguna.id],
        );
    }
    const { rows } = await db.query<BarisAntrean>(`${PILIH} WHERE q.id=$1`, [id]);
    return rows[0] ?? null;
}

export async function ubahStatus(
    db: PoolClient,
    pengguna: PenggunaAktif,
    id: string,
    status: StatusAntrean,
    catatan: string | null | undefined,
    urutan: number | undefined,
): Promise<BarisAntrean | null> {
    const rt: string | null = null;
    const current = await db.query<{ periodeId: number; tanggal: string; rt: string | null }>(
        `SELECT q.periode_id AS "periodeId", q.tanggal::text AS tanggal, w.rt
           FROM antrean_layanan q
           JOIN sasaran s ON s.id=q.sasaran_id
          JOIN anak a ON a.id=s.anak_id
          JOIN periode p ON p.id=q.periode_id AND p.sesi_ditutup_pada IS NULL
           LEFT JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
          WHERE q.id=$1 AND ($2::text IS NULL OR w.rt=$2) FOR UPDATE OF q`, [id, rt],
    );
    if (!current.rows[0]) return null;
    let nextOrder = urutan;
    if (status === "waiting" && nextOrder === undefined) {
        const max = await db.query<{ urutan: number }>(
            `SELECT coalesce(max(urutan),0)::int AS urutan FROM antrean_layanan
              WHERE periode_id=$1 AND tanggal=$2::date`,
            [current.rows[0].periodeId, current.rows[0].tanggal],
        );
        nextOrder = max.rows[0].urutan + 1;
    }
    const { rows } = await db.query<BarisAntrean>(
        `UPDATE antrean_layanan q
            SET status=$2, catatan=coalesce($3, q.catatan),
                urutan=coalesce($4, q.urutan),
                called_at=CASE WHEN $2='called' THEN now() WHEN $2='waiting' THEN NULL ELSE q.called_at END,
                completed_at=CASE WHEN $2='done' THEN now() WHEN $2='waiting' THEN NULL ELSE q.completed_at END,
                updated_by=$5
          WHERE q.id=$1
          RETURNING q.id`,
        [id, status, catatan === undefined ? null : catatan, nextOrder ?? null, pengguna.id],
    );
    if (!rows[0]) return null;
    const refreshed = await db.query<BarisAntrean>(`${PILIH} WHERE q.id=$1`, [id]);
    return refreshed.rows[0] ?? null;
}

/** Satu-satunya transisi ke done: setelah pengguna KMS mengonfirmasi hasil. */
export async function konfirmasiKms(
    db: PoolClient,
    pengguna: PenggunaAktif,
    id: string,
): Promise<BarisAntrean | null> {
    const { rows } = await db.query<{ id: string; sasaranId: number; periodeId: number }>(
        `UPDATE antrean_layanan q
            SET status='done', completed_at=now(), updated_by=$2
          FROM periode p
         WHERE q.id=$1 AND p.id=q.periode_id AND p.sesi_ditutup_pada IS NULL
           AND q.status='kms_review'
         RETURNING q.id, q.sasaran_id AS "sasaranId", q.periode_id AS "periodeId"`,
        [id, pengguna.id],
    );
    if (!rows[0]) return null;
    await db.query(
        `UPDATE sasaran SET status='selesai', diselesaikan_pada=coalesce(diselesaikan_pada, now()),
                diselesaikan_oleh=$2
          WHERE id=$1 AND periode_id=$3 AND status='menunggu'`,
        [rows[0].sasaranId, pengguna.id, rows[0].periodeId],
    );
    const hasil = await db.query<BarisAntrean>(`${PILIH} WHERE q.id=$1`, [id]);
    return hasil.rows[0] ?? null;
}
