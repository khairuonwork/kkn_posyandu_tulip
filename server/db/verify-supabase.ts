import { dapatkanPool, tutupPool } from "../src/db/pool.ts";

const pool = dapatkanPool();

try {
    const migrasi = await pool.query<{ nama: string }>(
        "SELECT nama FROM migrasi ORDER BY nama",
    );
    const standar = await pool.query<{ jumlah: number }>(
        "SELECT count(*)::int AS jumlah FROM standar_lms",
    );
    const objek = await pool.query<{ nama: string; jenis: string }>(`
        SELECT c.relname AS nama, c.relkind::text AS jenis
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relname IN ('tablet_anak', 'tablet_pengukuran')
         ORDER BY c.relname
    `);
    const fungsi = await pool.query<{ nama: string }>(`
        SELECT p.proname AS nama
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname IN ('daftar_anak_tablet', 'simpan_pengukuran_tablet')
         ORDER BY p.proname
    `);
    const rls = await pool.query<{ nama: string; aktif: boolean }>(`
        SELECT relname AS nama, relrowsecurity AS aktif
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND relname IN ('posyandu', 'wilayah_rt', 'orang_tua', 'anak', 'periode', 'pengukuran', 'layanan', 'sasaran')
         ORDER BY relname
    `);
    const isi = await pool.query<{
        auth_users: number;
        pengguna: number;
        anak: number;
        pengukuran: number;
    }>(`
        SELECT
            (SELECT count(*)::int FROM auth.users) AS auth_users,
            (SELECT count(*)::int FROM pengguna) AS pengguna,
            (SELECT count(*)::int FROM anak) AS anak,
            (SELECT count(*)::int FROM pengukuran) AS pengukuran
    `);

    console.log(
        JSON.stringify(
            {
                migrasi: migrasi.rows.map((baris) => baris.nama),
                standarLms: standar.rows[0].jumlah,
                viewTablet: objek.rows.map((baris) => baris.nama),
                rpcTablet: fungsi.rows.map((baris) => baris.nama),
                rls: rls.rows,
                isi: isi.rows[0],
            },
            null,
            2,
        ),
    );

    if (
        migrasi.rowCount !== 9 ||
        standar.rows[0].jumlah !== 906 ||
        objek.rowCount !== 2 ||
        fungsi.rowCount !== 2 ||
        rls.rowCount !== 8 ||
        rls.rows.some((baris) => !baris.aktif)
    ) {
        throw new Error("Verifikasi Supabase belum lengkap.");
    }
} finally {
    await tutupPool();
}
