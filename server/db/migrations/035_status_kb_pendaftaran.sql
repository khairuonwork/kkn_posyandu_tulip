-- Permintaan lapangan November 2026: meja pendaftaran menanyakan apakah ibu
-- ber-KB, dan bila ya, jenis KB-nya diketik kader. NULL berarti tidak
-- ditanyakan (APK lama atau pendaftaran sebelum fitur ini).
ALTER TABLE antrean_layanan
    ADD COLUMN IF NOT EXISTS ikut_kb boolean,
    ADD COLUMN IF NOT EXISTS jenis_kb text;

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
            EXECUTE format('ALTER TABLE %I.antrean_layanan ADD COLUMN IF NOT EXISTS ikut_kb boolean, ADD COLUMN IF NOT EXISTS jenis_kb text', latihan.skema);
        END IF;
    END LOOP;
END $$;
