-- Menutup akses peran Data API Supabase (anon, authenticated) ke skema public.
--
-- Web dan APK hanya memakai REST API SIMPATIK, yang tersambung sebagai pemilik
-- tabel. Pemilik tidak terkena RLS dan haknya tidak dicabut di sini, jadi
-- aplikasi tidak berubah. Yang ditutup hanya jalur langsung lewat Data API
-- (/rest/v1, /graphql/v1) dengan kunci anon atau sesi Supabase Auth.
--
-- Sebelumnya Supabase memberi GRANT ALL ke anon dan authenticated untuk setiap
-- tabel baru di public, sedangkan sebagian tabel tidak menyalakan RLS. Siapa pun
-- yang memegang kunci anon dapat membaca dan mengubah tabel itu.

-- 1. Policy baca untuk tablet dari migrasi 007. APK sudah lewat REST API sejak
--    1 Okt 2026, jadi policy ini tidak dipakai lagi.
DROP POLICY IF EXISTS tablet_baca_posyandu ON posyandu;
DROP POLICY IF EXISTS tablet_baca_wilayah ON wilayah_rt;
DROP POLICY IF EXISTS tablet_baca_orang_tua ON orang_tua;
DROP POLICY IF EXISTS tablet_baca_anak ON anak;
DROP POLICY IF EXISTS tablet_baca_periode ON periode;
DROP POLICY IF EXISTS tablet_baca_pengukuran ON pengukuran;
DROP POLICY IF EXISTS tablet_baca_layanan ON layanan;

-- 2. RLS tanpa policy menolak semua peran selain pemilik tabel.
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_konflik ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengguna_posyandu ENABLE ROW LEVEL SECURITY;
ALTER TABLE penilaian_gizi ENABLE ROW LEVEL SECURITY;
ALTER TABLE posyandu_cluster ENABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_2t_arsip ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesi ENABLE ROW LEVEL SECURITY;
ALTER TABLE standar_lms ENABLE ROW LEVEL SECURITY;
-- Dibuat oleh pelari migrasi (db/migrate.ts), bukan oleh berkas migrasi.
ALTER TABLE IF EXISTS migrasi ENABLE ROW LEVEL SECURITY;

-- Fungsi trigger mendapat EXECUTE untuk PUBLIC secara bawaan PostgreSQL. Trigger
-- tetap berjalan tanpa hak ini; yang ditutup hanya pemanggilan langsung.
REVOKE EXECUTE ON FUNCTION catat_audit(), set_updated_at() FROM PUBLIC;

-- 3. Cabut hak yang sudah ada dan hak bawaan untuk objek baru. Peran ini hanya
--    ada di Supabase; PostgreSQL lokal biasa melewati bagian ini.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
        EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
        EXECUTE 'REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated';
        -- Berlaku untuk objek yang nanti dibuat oleh peran yang menjalankan migrasi.
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
        EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated';
    END IF;
END $$;
