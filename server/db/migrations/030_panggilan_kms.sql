ALTER TABLE pengguna_posyandu
    ADD COLUMN meja_kms integer CHECK (meja_kms BETWEEN 1 AND 99);

ALTER TABLE antrean_layanan
    ADD COLUMN meja_kms integer CHECK (meja_kms BETWEEN 1 AND 99),
    ADD COLUMN tiba_kms boolean NOT NULL DEFAULT false,
    ADD CONSTRAINT antrean_tiba_kms_sah CHECK (NOT tiba_kms OR meja_kms IS NOT NULL);

CREATE UNIQUE INDEX antrean_satu_peserta_per_meja_kms
    ON antrean_layanan (periode_id, tanggal, meja_kms)
    WHERE meja_kms IS NOT NULL AND status NOT IN ('done', 'cancelled');

CREATE TABLE panggilan_kms (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    antrean_id text NOT NULL REFERENCES antrean_layanan (id) ON DELETE CASCADE,
    nomor integer NOT NULL,
    meja integer NOT NULL
);

CREATE INDEX panggilan_kms_antrean_idx ON panggilan_kms (antrean_id, id);
ALTER TABLE panggilan_kms ENABLE ROW LEVEL SECURITY;
