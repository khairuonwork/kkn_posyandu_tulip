-- Fungsi audit lama meng-cast ID semua tabel menjadi bigint, sedangkan ID
-- antrean sengaja memakai teks stabil (`antrean_YYYYMMDD_<sasaran>`).
-- Lepas trigger audit untuk tabel ini agar check-in dan perubahan status tidak
-- gagal karena cast; data antrean tetap menyimpan created_by/updated_by.
DROP TRIGGER IF EXISTS antrean_layanan_catat_audit ON antrean_layanan;
