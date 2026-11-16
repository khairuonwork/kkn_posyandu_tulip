CREATE TABLE konfirmasi_whatsapp (
    anak_id bigint NOT NULL REFERENCES anak(id) ON DELETE CASCADE,
    periode_id bigint NOT NULL REFERENCES periode(id) ON DELETE CASCADE,
    dikonfirmasi_oleh bigint NOT NULL REFERENCES pengguna(id),
    dikonfirmasi_pada timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (anak_id, periode_id)
);
ALTER TABLE konfirmasi_whatsapp ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE latihan record;
BEGIN
    FOR latihan IN SELECT skema FROM pelatihan_sesi
        WHERE selesai_pada IS NULL AND skema ~ '^latihan_[a-f0-9]{32}$'
    LOOP
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I.konfirmasi_whatsapp (anak_id bigint NOT NULL REFERENCES %I.anak(id) ON DELETE CASCADE, periode_id bigint NOT NULL REFERENCES %I.periode(id) ON DELETE CASCADE, dikonfirmasi_oleh bigint NOT NULL REFERENCES %I.pengguna(id), dikonfirmasi_pada timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (anak_id, periode_id))', latihan.skema, latihan.skema, latihan.skema, latihan.skema);
        EXECUTE format('ALTER TABLE %I.konfirmasi_whatsapp ENABLE ROW LEVEL SECURITY', latihan.skema);
    END LOOP;
END $$;
