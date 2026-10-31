-- Metadata kendali saja. Seluruh data latihan berada di schema sesi yang dapat dibuang.
CREATE TABLE pelatihan_sesi (
    id uuid PRIMARY KEY,
    nomor bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
    skema text NOT NULL UNIQUE CHECK (skema ~ '^latihan_[a-f0-9]{32}$'),
    periode_id bigint NOT NULL REFERENCES periode(id),
    dibuat_oleh bigint NOT NULL REFERENCES pengguna(id),
    jumlah_sasaran integer NOT NULL,
    mulai_pada timestamptz NOT NULL DEFAULT now(),
    selesai_pada timestamptz
);
CREATE UNIQUE INDEX pelatihan_satu_aktif ON pelatihan_sesi ((true)) WHERE selesai_pada IS NULL;
ALTER TABLE pelatihan_sesi ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesi ADD COLUMN pelatihan_id uuid;
