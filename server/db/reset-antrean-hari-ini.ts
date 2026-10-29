import { dapatkanPool, tutupPool } from "../src/db/pool.ts";

if (!process.argv.includes("--apply")) {
    throw new Error("Reset ditolak. Jalankan ulang dengan --apply setelah memeriksa cakupan.");
}

const tanggal = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(new Date());
const pool = dapatkanPool();
const db = await pool.connect();

try {
    await db.query("BEGIN");
    const byDate = await db.query<{ tanggal: string; periodeId: number; status: string; jumlah: number }>(
        `SELECT to_char(tanggal, 'YYYY-MM-DD') AS tanggal, periode_id AS "periodeId",
                status, count(*)::int AS jumlah
           FROM antrean_layanan GROUP BY tanggal, periode_id, status
          ORDER BY tanggal DESC, periode_id DESC, status`,
    );
    const targets = await db.query<{ periode: string; rt: string; status: string; jumlah: number }>(
        `SELECT p.tahun || '-' || lpad(p.bulan::text, 2, '0') AS periode,
                coalesce(w.rt, 'tanpa-RT') AS rt, s.status, count(*)::int AS jumlah
           FROM sasaran s
           JOIN periode p ON p.id=s.periode_id
           JOIN anak a ON a.id=s.anak_id AND a.deleted_at IS NULL
           LEFT JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
          GROUP BY p.tahun, p.bulan, w.rt, s.status
          ORDER BY p.tahun DESC, p.bulan DESC, w.rt, s.status`,
    );
    console.log(JSON.stringify({ antreanSeluruhTanggal: byDate.rows, sasaranPerPeriodeRt: targets.rows }));
    const before = await db.query<{ status: string; jumlah: number }>(
        `SELECT status, count(*)::int AS jumlah
           FROM antrean_layanan WHERE tanggal=$1::date
          GROUP BY status ORDER BY status`,
        [tanggal],
    );
    console.log(JSON.stringify({ tanggal, sebelum: before.rows }));

    const changed = await db.query<{ status: string; jumlah: number }>(
        `WITH target AS (
             SELECT q.id,
                    CASE
                      WHEN EXISTS (
                          SELECT 1 FROM pengukuran u
                           WHERE u.periode_id=q.periode_id AND u.anak_id=s.anak_id
                      ) THEN 'done'
                      WHEN s.status IN ('batal','pindah','tidak_hadir') THEN 'cancelled'
                      ELSE 'waiting'
                    END AS status_baru
               FROM antrean_layanan q
               JOIN sasaran s ON s.id=q.sasaran_id
              WHERE q.tanggal=$1::date
         ), diperbarui AS (
             UPDATE antrean_layanan q
                SET status=t.status_baru,
                    called_at=NULL,
                    completed_at=CASE WHEN t.status_baru='done'
                                      THEN coalesce(q.completed_at, now()) ELSE NULL END,
                    updated_at=now(),
                    updated_by=NULL
               FROM target t
              WHERE q.id=t.id
             RETURNING q.status
         )
         SELECT status, count(*)::int AS jumlah
           FROM diperbarui GROUP BY status ORDER BY status`,
        [tanggal],
    );
    const after = await db.query<{ status: string; jumlah: number }>(
        `SELECT status, count(*)::int AS jumlah
           FROM antrean_layanan WHERE tanggal=$1::date
          GROUP BY status ORDER BY status`,
        [tanggal],
    );
    await db.query("COMMIT");
    console.log(JSON.stringify({ berubah: changed.rows, sesudah: after.rows }));
} catch (error) {
    await db.query("ROLLBACK");
    throw error;
} finally {
    db.release();
    await tutupPool();
}
