-- Arsip bulanan dapat sah tanpa tanggal ukur harian. Jangan membuat tanggal
-- fiktif di pengukuran untuk memenuhi laporan riwayat dari Puskesmas.
CREATE TABLE riwayat_2t_arsip (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anak_id bigint NOT NULL REFERENCES anak(id),
    periode_laporan varchar(7) NOT NULL CHECK (periode_laporan ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    periode_riwayat varchar(7) NOT NULL CHECK (periode_riwayat ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    jumlah_t smallint NOT NULL CHECK (jumlah_t >= 2),
    umur_bulan numeric(5,1) NOT NULL CHECK (umur_bulan >= 0),
    bb_kg numeric(6,2),
    tinggi_cm numeric(6,2),
    lila_cm numeric(6,2),
    lika_cm numeric(6,2),
    penilaian jsonb NOT NULL DEFAULT '{}',
    import_batch_id bigint NOT NULL REFERENCES import_batch(id),
    sumber_file text NOT NULL,
    sheet text NOT NULL,
    baris_asal integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (periode_riwayat <= periode_laporan),
    UNIQUE (anak_id, periode_laporan, periode_riwayat)
);
CREATE INDEX riwayat_2t_arsip_periode_idx ON riwayat_2t_arsip(periode_laporan, anak_id);
