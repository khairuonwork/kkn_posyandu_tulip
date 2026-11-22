-- Kader hanya melihat Beranda, Data Balita, dan Detail Balita di web bila admin
-- mencentangnya. Bawaan false: tanpa centang, kader tidak melihat data balita di web.
-- Tablet (token Bearer) tidak terpengaruh.
ALTER TABLE pengguna ADD COLUMN IF NOT EXISTS boleh_lihat_data boolean NOT NULL DEFAULT false;

DO $$
DECLARE latihan record;
BEGIN
    FOR latihan IN SELECT skema FROM pelatihan_sesi
        WHERE selesai_pada IS NULL AND skema ~ '^latihan_[a-f0-9]{32}$'
    LOOP
        IF to_regclass(format('%I.pengguna', latihan.skema)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I.pengguna ADD COLUMN IF NOT EXISTS boleh_lihat_data boolean NOT NULL DEFAULT false', latihan.skema);
        END IF;
    END LOOP;
END $$;
