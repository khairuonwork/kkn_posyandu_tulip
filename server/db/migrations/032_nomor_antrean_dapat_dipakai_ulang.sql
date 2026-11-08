-- Nomor antrean yang dibatalkan dikembalikan agar dipakai pendaftar berikutnya.
-- Keunikan nomor kini hanya berlaku untuk antrean yang tidak dibatalkan.
-- Baris batal tetap menyimpan nomor lamanya sebagai jejak audit.
DO $$
DECLARE
    skema record;
    kendala record;
BEGIN
    FOR skema IN
        SELECT current_schema()::text AS nama
        UNION ALL
        SELECT s.skema FROM pelatihan_sesi s
         WHERE s.selesai_pada IS NULL AND s.skema ~ '^latihan_[a-f0-9]{32}$'
    LOOP
        IF to_regclass(format('%I.antrean_layanan', skema.nama)) IS NULL THEN
            CONTINUE;
        END IF;
        FOR kendala IN
            SELECT c.conname
              FROM pg_constraint c
             WHERE c.conrelid = to_regclass(format('%I.antrean_layanan', skema.nama))
               AND c.contype = 'u'
               AND pg_get_constraintdef(c.oid) = 'UNIQUE (periode_id, tanggal, nomor)'
        LOOP
            EXECUTE format('ALTER TABLE %I.antrean_layanan DROP CONSTRAINT %I', skema.nama, kendala.conname);
        END LOOP;
        EXECUTE format(
            'CREATE UNIQUE INDEX IF NOT EXISTS antrean_layanan_nomor_aktif_key ON %I.antrean_layanan (periode_id, tanggal, nomor) WHERE status <> ''cancelled''',
            skema.nama);
    END LOOP;
END $$;
