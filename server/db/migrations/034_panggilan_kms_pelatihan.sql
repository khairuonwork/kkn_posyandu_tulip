-- Sesuaikan sesi pelatihan yang sudah aktif ketika migrasi 030 dipasang.
DO $$
DECLARE latihan record;
BEGIN
    IF to_regclass('pelatihan_sesi') IS NULL THEN RETURN; END IF;
    FOR latihan IN SELECT skema FROM pelatihan_sesi
        WHERE selesai_pada IS NULL AND skema ~ '^latihan_[a-f0-9]{32}$'
    LOOP
        IF to_regclass(format('%I.antrean_layanan', latihan.skema)) IS NULL
           OR to_regclass(format('%I.pengguna_posyandu', latihan.skema)) IS NULL THEN CONTINUE; END IF;
        EXECUTE format('ALTER TABLE %I.pengguna_posyandu ADD COLUMN IF NOT EXISTS meja_kms integer CHECK (meja_kms BETWEEN 1 AND 99)', latihan.skema);
        EXECUTE format('ALTER TABLE %I.antrean_layanan ADD COLUMN IF NOT EXISTS meja_kms integer CHECK (meja_kms BETWEEN 1 AND 99), ADD COLUMN IF NOT EXISTS tiba_kms boolean NOT NULL DEFAULT false', latihan.skema);
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass(format('%I.antrean_layanan', latihan.skema)) AND conname='antrean_tiba_kms_sah') THEN
            EXECUTE format('ALTER TABLE %I.antrean_layanan ADD CONSTRAINT antrean_tiba_kms_sah CHECK (NOT tiba_kms OR meja_kms IS NOT NULL)', latihan.skema);
        END IF;
        EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS antrean_satu_peserta_per_meja_kms ON %I.antrean_layanan (periode_id, tanggal, meja_kms) WHERE meja_kms IS NOT NULL AND status NOT IN (''done'', ''cancelled'')', latihan.skema);
        IF to_regclass(format('%I.panggilan_kms', latihan.skema)) IS NULL THEN
            EXECUTE format('CREATE TABLE %I.panggilan_kms (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, antrean_id text NOT NULL REFERENCES %I.antrean_layanan(id) ON DELETE CASCADE, nomor integer NOT NULL, meja integer NOT NULL)', latihan.skema, latihan.skema);
            EXECUTE format('CREATE INDEX panggilan_kms_antrean_idx ON %I.panggilan_kms (antrean_id, id)', latihan.skema);
            EXECUTE format('ALTER TABLE %I.panggilan_kms ENABLE ROW LEVEL SECURITY', latihan.skema);
        END IF;
    END LOOP;
END $$;
