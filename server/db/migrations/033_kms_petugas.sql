-- Panggilan pemeriksaan KMS per akun: siapa memanggil/memeriksa anak.
-- kms_petugas_id tetap terisi setelah selesai sebagai jejak "diperiksa oleh".
-- Tidak menyentuh kolom meja_kms/tiba_kms milik migrasi panggilan meja KMS.
ALTER TABLE antrean_layanan
    ADD COLUMN IF NOT EXISTS kms_petugas_id bigint REFERENCES pengguna (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS kms_dipanggil_pada timestamptz;

-- Satu petugas memeriksa satu anak pada satu waktu dalam satu hari layanan.
CREATE UNIQUE INDEX IF NOT EXISTS antrean_kms_satu_anak_per_petugas
    ON antrean_layanan (periode_id, tanggal, kms_petugas_id)
    WHERE status = 'kms_review' AND kms_petugas_id IS NOT NULL;

-- Sesi pelatihan yang sedang aktif mengikuti struktur yang sama.
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
            IF to_regclass(format('%I.pengguna', latihan.skema)) IS NOT NULL THEN
                EXECUTE format('ALTER TABLE %I.antrean_layanan ADD COLUMN IF NOT EXISTS kms_petugas_id bigint REFERENCES %I.pengguna (id) ON DELETE SET NULL', latihan.skema, latihan.skema);
            ELSE
                EXECUTE format('ALTER TABLE %I.antrean_layanan ADD COLUMN IF NOT EXISTS kms_petugas_id bigint', latihan.skema);
            END IF;
            EXECUTE format('ALTER TABLE %I.antrean_layanan ADD COLUMN IF NOT EXISTS kms_dipanggil_pada timestamptz', latihan.skema);
            EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS antrean_kms_satu_anak_per_petugas ON %I.antrean_layanan (periode_id, tanggal, kms_petugas_id) WHERE status = ''kms_review'' AND kms_petugas_id IS NOT NULL', latihan.skema);
        END IF;
    END LOOP;
END $$;
