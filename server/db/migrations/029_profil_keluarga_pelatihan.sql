-- Sesi yang sudah aktif tidak otomatis mengikuti perubahan struktur tabel publik.
DO $$
DECLARE latihan record;
BEGIN
    FOR latihan IN
        SELECT skema FROM pelatihan_sesi
        WHERE selesai_pada IS NULL AND skema ~ '^latihan_[a-f0-9]{32}$'
    LOOP
        IF to_regclass(format('%I.orang_tua', latihan.skema)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I.orang_tua ADD COLUMN IF NOT EXISTS jenis_kb varchar(100)', latihan.skema);
        END IF;
        IF to_regclass(format('%I.sumber_f1', latihan.skema)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I.sumber_f1 ADD COLUMN IF NOT EXISTS desil_kelompok text CHECK (desil_kelompok = ''6-10'')', latihan.skema);
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conrelid = to_regclass(format('%I.sumber_f1', latihan.skema))
                    AND conname = 'sumber_f1_desil_kelompok_valid'
            ) THEN
                EXECUTE format('ALTER TABLE %I.sumber_f1 ADD CONSTRAINT sumber_f1_desil_kelompok_valid CHECK (desil_kelompok IS NULL OR (desil IS NULL AND gng = ''NG'' AND gng IS NOT NULL))', latihan.skema);
            END IF;
        END IF;
    END LOOP;
END $$;
