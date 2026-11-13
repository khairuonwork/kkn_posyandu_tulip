import type { Pool, PoolClient } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { prioritasUntukAnak } from "../services/prioritas-kms.ts";

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
    masihMenyusui: boolean | null;
    asiEksklusif: boolean | null;
    catatanKhusus: string | null;
    catatanKms: string | null;
    /** Akun KMS yang memanggil/memeriksa; tetap terisi setelah selesai. */
    kmsPetugasId: number | null;
    kmsPetugasNama: string | null;
    kmsDipanggilPada: string | null;
    checkedInAt: string;
    calledAt: string | null;
    completedAt: string | null;
    updatedAt: string;
};

const PILIH = `SELECT q.id, q.periode_id AS "periodeId", q.sasaran_id AS "sasaranId", a.id AS "anakId",
                      to_char(q.tanggal, 'YYYY-MM-DD') AS tanggal,
                      q.nomor, q.urutan, coalesce(a.nik, 'ANAK-' || a.id::text) AS "childIdentity",
                      a.nama, o.nama AS "namaOrtu", w.rt, q.status, q.catatan,
                      q.masih_menyusui AS "masihMenyusui", q.asi_eksklusif AS "asiEksklusif",
                      p.catatan_khusus AS "catatanKhusus", p.catatan_kms AS "catatanKms",
                      q.kms_petugas_id::int AS "kmsPetugasId", pk.nama AS "kmsPetugasNama",
                      q.kms_dipanggil_pada AS "kmsDipanggilPada",
                      q.checked_in_at AS "checkedInAt", q.called_at AS "calledAt",
                      q.completed_at AS "completedAt", q.updated_at AS "updatedAt"
                 FROM antrean_layanan q
                 JOIN sasaran s ON s.id = q.sasaran_id
                 JOIN periode pe ON pe.id=q.periode_id
                 JOIN anak a ON a.id = s.anak_id AND a.deleted_at IS NULL
                 LEFT JOIN orang_tua o ON o.id = a.orang_tua_id
                 LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
                 LEFT JOIN pengukuran p ON p.anak_id = a.id AND p.periode_id = q.periode_id
                 LEFT JOIN pengguna pk ON pk.id = q.kms_petugas_id`;

export async function daftar(pool: Pool, pengguna: PenggunaAktif, periodeId: number, tanggal: string) {
    // Antrean layanan adalah antrean bersama lintas RT dalam Posyandu.
    const { rows } = await pool.query<BarisAntrean>(
        `${PILIH} WHERE q.periode_id=$1 AND q.tanggal=$2::date
            AND ($3::boolean OR EXISTS (SELECT 1 FROM periode pe WHERE pe.id=q.periode_id AND pe.posyandu_id=ANY($4::bigint[])))
          ORDER BY q.urutan, q.nomor`,
        [periodeId, tanggal, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    return rows;
}

/** Jawaban YA/TIDAK saat pendaftaran; undefined = tidak dikirim (APK lama). */
export type StatusMenyusui = {
    masihMenyusui?: boolean | null;
    asiEksklusif?: boolean | null;
};

/**
 * Nomor terkecil yang belum dipegang antrean aktif (bukan batal).
 * Nomor dari antrean yang dibatalkan dikembalikan ke sini dan dipakai
 * pendaftar berikutnya; nomor anak lain yang sudah terdaftar tidak berubah.
 * Pemanggil wajib memegang kunci periode/tanggal (lihat kunciHari).
 */
async function nomorKosong(db: PoolClient, periodeId: number, tanggal: string): Promise<number> {
    const { rows } = await db.query<{ nomor: number }>(
        `SELECT min(n)::int AS nomor
           FROM generate_series(1, (
                SELECT count(*)::int + 1 FROM antrean_layanan
                 WHERE periode_id=$1 AND tanggal=$2::date AND status<>'cancelled')) AS n
          WHERE NOT EXISTS (
                SELECT 1 FROM antrean_layanan q
                 WHERE q.periode_id=$1 AND q.tanggal=$2::date
                   AND q.status<>'cancelled' AND q.nomor=n)`,
        [periodeId, tanggal],
    );
    return Number(rows[0]?.nomor ?? 1);
}

/** Kunci yang sama dipakai check-in, check-in ulang, dan reset harian. */
async function kunciHari(db: PoolClient, periodeId: number, tanggal: string) {
    const tanggalKunci = Number(tanggal.slice(0, 10).replaceAll("-", ""));
    await db.query("SELECT pg_advisory_xact_lock($1::integer, $2::integer)", [periodeId, tanggalKunci]);
}

export async function checkIn(
    db: PoolClient,
    pengguna: PenggunaAktif,
    periodeId: number,
    sasaranId: number,
    tanggal: string,
    catatan: string | null,
    menyusui: StatusMenyusui = {},
): Promise<BarisAntrean | null> {
    // Kunci sebelum sasaran, sama dengan reset harian, agar tidak bersilangan.
    await kunciHari(db, periodeId, tanggal);
    // Semua kader yang berhak mencatat layanan dapat check-in sasaran lintas RT.
    const target = await db.query<{ id: number; rt: string | null }>(
        `SELECT s.id, w.rt FROM sasaran s
           JOIN periode p ON p.id=s.periode_id
           JOIN anak a ON a.id=s.anak_id AND a.deleted_at IS NULL
           LEFT JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
          WHERE (s.id=$1 OR ($1::bigint >= 1000000000000 AND (s.id % 1000000) = ($1::bigint % 1000000)))
            AND s.periode_id=$2
            AND p.sesi_ditutup_pada IS NULL
            AND ($3::boolean OR p.posyandu_id=ANY($4::bigint[]))
          ORDER BY (s.id = $1) DESC
          LIMIT 1
          FOR UPDATE OF s`,
        [sasaranId, periodeId, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    if (!target.rows[0]) return null;

    const actualSasaranId = Number(target.rows[0].id);

    // Kunci per periode/tanggal memastikan dua pemindaian serentak mendapat nomor unik.
    const id = `antrean_${tanggal.replaceAll("-", "")}_${actualSasaranId}`;
    const existing = await db.query<{ status: StatusAntrean }>(
        `SELECT status FROM antrean_layanan
          WHERE periode_id=$1 AND tanggal=$2::date AND sasaran_id=$3 FOR UPDATE`,
        [periodeId, tanggal, actualSasaranId],
    );
    // undefined dipertahankan sebagai "tidak diubah" agar APK lama tidak menghapus jawaban.
    const kirimMenyusui = menyusui.masihMenyusui !== undefined;
    const kirimAsi = menyusui.asiEksklusif !== undefined;
    if (existing.rows[0]) {
        if (kirimMenyusui || kirimAsi) {
            await db.query(
                `UPDATE antrean_layanan
                    SET masih_menyusui=CASE WHEN $2::boolean THEN $3::boolean ELSE masih_menyusui END,
                        asi_eksklusif=CASE WHEN $4::boolean THEN $5::boolean ELSE asi_eksklusif END,
                        updated_by=$6
                  WHERE id=$1`,
                [id, kirimMenyusui, menyusui.masihMenyusui ?? null, kirimAsi, menyusui.asiEksklusif ?? null, pengguna.id],
            );
        }
        if (existing.rows[0].status === "cancelled") {
            const max = await db.query<{ urutan: number }>(
                `SELECT coalesce(max(urutan), 0)::int AS urutan FROM antrean_layanan
                  WHERE periode_id=$1 AND tanggal=$2::date`, [periodeId, tanggal],
            );
            // Nomor lamanya mungkin sudah dipakai anak lain; ambil nomor kosong terkecil.
            const nomorBaru = await nomorKosong(db, periodeId, tanggal);
            await db.query(
                `UPDATE antrean_layanan SET status='waiting', catatan=$2, urutan=$3, nomor=$5,
                    checked_in_at=now(), called_at=NULL, completed_at=NULL,
                    updated_by=$4 WHERE id=$1`,
                [id, catatan, max.rows[0].urutan + 1, pengguna.id, nomorBaru],
            );
        }
    } else {
        const nomor = await db.query<{ urutan: number }>(
            `SELECT coalesce(max(urutan),0)::int AS urutan
               FROM antrean_layanan WHERE periode_id=$1 AND tanggal=$2::date`,
            [periodeId, tanggal],
        );
        // Urutan panggil tetap mengikuti waktu datang; nomor memakai nomor kosong terkecil.
        const nomorBaru = await nomorKosong(db, periodeId, tanggal);
        await db.query(
            `INSERT INTO antrean_layanan
                (id, periode_id, sasaran_id, tanggal, nomor, urutan, catatan,
                 masih_menyusui, asi_eksklusif, created_by, updated_by)
             VALUES ($1,$2,$3,$4::date,$5,$6,$7,$9,$10,$8,$8)`,
            [id, periodeId, actualSasaranId, tanggal, nomorBaru,
                nomor.rows[0].urutan + 1, catatan, pengguna.id,
                menyusui.masihMenyusui ?? null, menyusui.asiEksklusif ?? null],
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
    // Antrean batal yang diaktifkan lagi butuh nomor baru; kunci hari diambil
    // sebelum mengunci baris agar urutan kunci sama dengan check-in.
    const awal = await db.query<{ periodeId: number; tanggal: string; status: StatusAntrean }>(
        `SELECT periode_id AS "periodeId", tanggal::text AS tanggal, status
           FROM antrean_layanan WHERE id=$1`,
        [id],
    );
    const aktifkanLagi = awal.rows[0]?.status === "cancelled" && status !== "cancelled";
    if (aktifkanLagi) await kunciHari(db, awal.rows[0].periodeId, awal.rows[0].tanggal);
    const current = await db.query<{ periodeId: number; tanggal: string; rt: string | null; status: StatusAntrean }>(
        `SELECT q.periode_id AS "periodeId", q.tanggal::text AS tanggal, w.rt, q.status
           FROM antrean_layanan q
           JOIN sasaran s ON s.id=q.sasaran_id
          JOIN anak a ON a.id=s.anak_id
          JOIN periode p ON p.id=q.periode_id AND p.sesi_ditutup_pada IS NULL
           LEFT JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
          WHERE q.id=$1 AND ($2::boolean OR p.posyandu_id=ANY($3::bigint[])) FOR UPDATE OF q`, [id, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    if (!current.rows[0]) return null;
    const nomorBaru = current.rows[0].status === "cancelled" && status !== "cancelled"
        ? await nomorKosong(db, current.rows[0].periodeId, current.rows[0].tanggal)
        : null;
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
                nomor=coalesce($6, q.nomor),
                updated_by=$5
          WHERE q.id=$1
          RETURNING q.id`,
        [id, status, catatan === undefined ? null : catatan, nextOrder ?? null, pengguna.id, nomorBaru],
    );
    if (!rows[0]) return null;
    if (status === "done" && current.rows[0]) {
        await db.query(
            `UPDATE sasaran SET status='selesai', diselesaikan_pada=coalesce(diselesaikan_pada, now()),
                    diselesaikan_oleh=$2
              WHERE id=(SELECT sasaran_id FROM antrean_layanan WHERE id=$1)
                AND periode_id=$3`,
            [id, pengguna.id, current.rows[0].periodeId],
        );
    }
    const refreshed = await db.query<BarisAntrean>(`${PILIH} WHERE q.id=$1`, [id]);
    return refreshed.rows[0] ?? null;
}

/** Satu-satunya transisi ke done: setelah pengguna KMS mengonfirmasi hasil. */
export type HasilPanggilKms =
    | { status: "ok"; item: BarisAntrean }
    | { status: "kosong" }
    | { status: "tidak-ditemukan" }
    | { status: "milik-lain"; petugas: string | null }
    | { status: "masih-memeriksa"; item: BarisAntrean };

async function barisKms(db: PoolClient, id: string): Promise<BarisAntrean | null> {
    return (await db.query<BarisAntrean>(`${PILIH} WHERE q.id=$1`, [id])).rows[0] ?? null;
}

/** Anak yang sedang diperiksa akun ini pada hari tersebut, bila ada. */
async function sedangDiperiksa(db: PoolClient, pengguna: PenggunaAktif, periodeId: number, tanggal: string) {
    const { rows } = await db.query<{ id: string }>(
        `SELECT id FROM antrean_layanan
          WHERE periode_id=$1 AND tanggal=$2::date AND status='kms_review' AND kms_petugas_id=$3`,
        [periodeId, tanggal, pengguna.id],
    );
    return rows[0]?.id ?? null;
}

/** Memanggil anak tertentu dari antrean KMS atas nama akun yang masuk. */
export async function panggilKms(db: PoolClient, pengguna: PenggunaAktif, id: string): Promise<HasilPanggilKms> {
    const { rows } = await db.query<{ periodeId: number; tanggal: string; petugas: number | null }>(
        `SELECT q.periode_id::int AS "periodeId", to_char(q.tanggal, 'YYYY-MM-DD') AS tanggal, q.kms_petugas_id::int AS petugas
           FROM antrean_layanan q JOIN periode p ON p.id=q.periode_id
          WHERE q.id=$1 AND q.status='kms_review' AND p.sesi_ditutup_pada IS NULL
            AND ($2::boolean OR p.posyandu_id=ANY($3::bigint[]))
          FOR UPDATE OF q`,
        [id, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    const kini = rows[0];
    if (!kini) return { status: "tidak-ditemukan" };
    if (kini.petugas !== null && kini.petugas !== pengguna.id) {
        const item = await barisKms(db, id);
        return { status: "milik-lain", petugas: item?.kmsPetugasNama ?? null };
    }
    const aktif = await sedangDiperiksa(db, pengguna, kini.periodeId, kini.tanggal);
    if (aktif !== null && aktif !== id) {
        const item = await barisKms(db, aktif);
        return item ? { status: "masih-memeriksa", item } : { status: "tidak-ditemukan" };
    }
    await db.query(
        `UPDATE antrean_layanan SET kms_petugas_id=$2, kms_dipanggil_pada=coalesce(kms_dipanggil_pada, now()), updated_by=$2
          WHERE id=$1`,
        [id, pengguna.id],
    );
    const item = await barisKms(db, id);
    return item ? { status: "ok", item } : { status: "tidak-ditemukan" };
}

/** Memanggil anak berprioritas tertinggi yang belum diperiksa siapa pun. */
export async function panggilKmsBerikutnya(
    db: PoolClient,
    pengguna: PenggunaAktif,
    periodeId: number,
    tanggal: string,
): Promise<HasilPanggilKms> {
    const izin = await db.query(
        `SELECT 1 FROM periode WHERE id=$1 AND sesi_ditutup_pada IS NULL
            AND ($2::boolean OR posyandu_id=ANY($3::bigint[]))`,
        [periodeId, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    if (!izin.rows[0]) return { status: "tidak-ditemukan" };
    // Satu kunci per hari layanan: dua petugas tidak mendapat anak yang sama.
    const tanggalKunci = Number(tanggal.replaceAll("-", ""));
    await db.query("SELECT pg_advisory_xact_lock($1::integer, $2::integer)", [periodeId, tanggalKunci]);
    const aktif = await sedangDiperiksa(db, pengguna, periodeId, tanggal);
    if (aktif !== null) {
        const item = await barisKms(db, aktif);
        return item ? { status: "masih-memeriksa", item } : { status: "tidak-ditemukan" };
    }
    const calon = (await db.query<{ id: string; anakId: number; urutan: number }>(
        `SELECT q.id, s.anak_id::int AS "anakId", q.urutan
           FROM antrean_layanan q JOIN sasaran s ON s.id=q.sasaran_id
          WHERE q.periode_id=$1 AND q.tanggal=$2::date AND q.status='kms_review' AND q.kms_petugas_id IS NULL
          ORDER BY q.updated_at, q.urutan`,
        [periodeId, tanggal],
    )).rows;
    if (calon.length === 0) return { status: "kosong" };
    const prioritas = await prioritasUntukAnak(db, periodeId, calon.map(c => c.anakId));
    // Skor tertinggi lebih dahulu; skor sama mengikuti urutan tiba di KMS.
    const terpilih = calon
        .map((c, urutanTiba) => ({ ...c, urutanTiba, skor: prioritas.get(c.anakId)?.skor ?? 0 }))
        .sort((a, b) => b.skor - a.skor || a.urutanTiba - b.urutanTiba)[0];
    await db.query(
        `UPDATE antrean_layanan SET kms_petugas_id=$2, kms_dipanggil_pada=now(), updated_by=$2 WHERE id=$1`,
        [terpilih.id, pengguna.id],
    );
    const item = await barisKms(db, terpilih.id);
    return item ? { status: "ok", item } : { status: "tidak-ditemukan" };
}

/** Mengembalikan anak ke antrean KMS; hanya pemanggil atau superadmin. */
export async function lepasKms(db: PoolClient, pengguna: PenggunaAktif, id: string): Promise<HasilPanggilKms> {
    const { rows } = await db.query<{ petugas: number | null }>(
        `SELECT q.kms_petugas_id::int AS petugas FROM antrean_layanan q JOIN periode p ON p.id=q.periode_id
          WHERE q.id=$1 AND q.status='kms_review' AND p.sesi_ditutup_pada IS NULL
            AND ($2::boolean OR p.posyandu_id=ANY($3::bigint[]))
          FOR UPDATE OF q`,
        [id, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    if (!rows[0]) return { status: "tidak-ditemukan" };
    if (rows[0].petugas !== null && rows[0].petugas !== pengguna.id && !pengguna.superAdmin) {
        const item = await barisKms(db, id);
        return { status: "milik-lain", petugas: item?.kmsPetugasNama ?? null };
    }
    await db.query(
        `UPDATE antrean_layanan SET kms_petugas_id=NULL, kms_dipanggil_pada=NULL, updated_by=$2 WHERE id=$1`,
        [id, pengguna.id],
    );
    const item = await barisKms(db, id);
    return item ? { status: "ok", item } : { status: "tidak-ditemukan" };
}

export async function konfirmasiKms(
    db: PoolClient,
    pengguna: PenggunaAktif,
    id: string,
    catatanKms?: string | null,
): Promise<BarisAntrean | null> {
    // Anak yang sedang diperiksa petugas lain tidak boleh diselesaikan akun ini.
    const pemilik = await db.query<{ petugas: number | null }>(
        `SELECT kms_petugas_id::int AS petugas FROM antrean_layanan WHERE id=$1 FOR UPDATE`, [id],
    );
    const petugas = pemilik.rows[0]?.petugas ?? null;
    if (petugas !== null && petugas !== pengguna.id && !pengguna.superAdmin) return null;
    const { rows } = await db.query<{ id: string; sasaranId: number; periodeId: number }>(
        `UPDATE antrean_layanan q
            SET status='done', completed_at=now(), updated_by=$2,
                kms_petugas_id=coalesce(q.kms_petugas_id, $2),
                kms_dipanggil_pada=coalesce(q.kms_dipanggil_pada, now())
          FROM periode p
         WHERE q.id=$1 AND p.id=q.periode_id AND p.sesi_ditutup_pada IS NULL
           AND ($3::boolean OR p.posyandu_id=ANY($4::bigint[]))
           AND q.status='kms_review'
         RETURNING q.id, q.sasaran_id AS "sasaranId", q.periode_id AS "periodeId"`,
        [id, pengguna.id, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    if (!rows[0]) {
        // Idempoten: bila sudah berstatus 'done', kembalikan baris yang ada
        const existing = await db.query<BarisAntrean>(`${PILIH} WHERE q.id=$1 AND q.status='done'`, [id]);
        return existing.rows[0] ?? null;
    }
    if (catatanKms !== undefined) {
        await db.query(
            `UPDATE pengukuran p SET catatan_kms=$3
               FROM sasaran s
              WHERE s.id=$1 AND p.anak_id=s.anak_id AND p.periode_id=$2`,
            [rows[0].sasaranId, rows[0].periodeId, catatanKms],
        );
    }
    await db.query(
        `UPDATE sasaran SET status='selesai', diselesaikan_pada=coalesce(diselesaikan_pada, now()),
                diselesaikan_oleh=$2
          WHERE id=$1 AND periode_id=$3`,
        [rows[0].sasaranId, pengguna.id, rows[0].periodeId],
    );
    const hasil = await db.query<BarisAntrean>(`${PILIH} WHERE q.id=$1`, [id]);
    return hasil.rows[0] ?? null;
}

/** Konfirmasi seluruh antrean yang sedang menunggu review KMS sekaligus. */
export async function konfirmasiSemuaKms(
    db: PoolClient,
    pengguna: PenggunaAktif,
    periodeId: number,
    tanggal: string,
): Promise<number> {
    const { rows } = await db.query<{ id: string; sasaranId: number }>(
        `UPDATE antrean_layanan q
            SET status='done', completed_at=now(), updated_by=$2
          FROM periode p
         WHERE q.periode_id=$3 AND q.tanggal=$4::date
           AND p.id=q.periode_id AND p.sesi_ditutup_pada IS NULL
           AND ($5::boolean OR p.posyandu_id=ANY($6::bigint[]))
           AND q.status='kms_review'
         RETURNING q.id, q.sasaran_id AS "sasaranId"`,
        [tanggal, pengguna.id, periodeId, tanggal, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
    );
    for (const r of rows) {
        await db.query(
            `UPDATE sasaran SET status='selesai', diselesaikan_pada=coalesce(diselesaikan_pada, now()),
                    diselesaikan_oleh=$2
              WHERE id=$1 AND periode_id=$3 AND status='menunggu'`,
            [r.sasaranId, pengguna.id, periodeId],
        );
    }
    return rows.length;
}
