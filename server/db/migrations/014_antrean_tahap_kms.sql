-- Pengukuran tidak menyelesaikan antrean. Slot tetap dipakai sampai petugas
-- KMS di Portal mengonfirmasi tahap penjelasan selesai.
ALTER TABLE antrean_layanan
    DROP CONSTRAINT IF EXISTS antrean_layanan_status_check;

ALTER TABLE antrean_layanan
    ADD CONSTRAINT antrean_layanan_status_check
    CHECK (status IN ('waiting', 'called', 'serving', 'kms_review', 'done', 'cancelled'));
