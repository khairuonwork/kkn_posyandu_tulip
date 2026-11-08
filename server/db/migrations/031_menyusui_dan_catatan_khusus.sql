-- Permintaan lapangan November 2026:
-- * Pendaftaran (check-in antrean) mencatat status menyusui (0-23 bulan)
--   dan ASI eksklusif (0-6 bulan). NULL berarti tidak ditanyakan.
-- * Pencatatan (tablet) dan KMS (web) masing-masing punya catatan/pengamatan
--   khusus, terpisah dari catatan survei tumbuh kembang dan catatan impor.
ALTER TABLE antrean_layanan
    ADD COLUMN IF NOT EXISTS masih_menyusui boolean,
    ADD COLUMN IF NOT EXISTS asi_eksklusif boolean;

ALTER TABLE pengukuran
    ADD COLUMN IF NOT EXISTS catatan_khusus text,
    ADD COLUMN IF NOT EXISTS catatan_kms text;

-- Sesi pelatihan yang sedang aktif tidak otomatis mengikuti struktur tabel publik.
DO $$
DECLARE latihan record;
BEGIN
    IF to_regclass('pelatihan_sesi') IS NULL THEN
        RETURN;
    END IF;
    FOR latihan IN
        SELECT skema FROM pelatihan_sesi
        WHERE selesai_pada IS NULL AND skema ~ '^latihan_[a-f0-9]{32}$'
    LOOP
        IF to_regclass(format('%I.antrean_layanan', latihan.skema)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I.antrean_layanan ADD COLUMN IF NOT EXISTS masih_menyusui boolean, ADD COLUMN IF NOT EXISTS asi_eksklusif boolean', latihan.skema);
        END IF;
        IF to_regclass(format('%I.pengukuran', latihan.skema)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I.pengukuran ADD COLUMN IF NOT EXISTS catatan_khusus text, ADD COLUMN IF NOT EXISTS catatan_kms text', latihan.skema);
        END IF;
    END LOOP;
END $$;
