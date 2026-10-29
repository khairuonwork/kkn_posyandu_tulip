CREATE TABLE survei_perkembangan_kia (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anak_id bigint NOT NULL REFERENCES anak(id),
    tanggal date NOT NULL,
    versi_buku varchar(32) NOT NULL,
    kelompok_id varchar(32) NOT NULL,
    kelompok_label text NOT NULL,
    umur_bulan integer NOT NULL CHECK (umur_bulan >= 0),
    umur_hari integer NOT NULL CHECK (umur_hari >= 0),
    halaman text NOT NULL,
    pertanyaan_snapshot jsonb NOT NULL CHECK (jsonb_typeof(pertanyaan_snapshot)='array'),
    jawaban jsonb NOT NULL CHECK (jsonb_typeof(jawaban)='object'),
    catatan text NOT NULL DEFAULT '' CHECK (length(catatan)<=2000),
    tindak_lanjut text NOT NULL DEFAULT '' CHECK (length(tindak_lanjut)<=2000),
    dibahas boolean NOT NULL DEFAULT false,
    dicatat_oleh bigint NOT NULL REFERENCES pengguna(id),
    revisi integer NOT NULL DEFAULT 1 CHECK (revisi>0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(anak_id,tanggal,versi_buku,kelompok_id)
);
CREATE INDEX survei_kia_anak_tanggal_idx ON survei_perkembangan_kia(anak_id,tanggal DESC);
CREATE TRIGGER survei_kia_audit AFTER INSERT OR UPDATE OR DELETE ON survei_perkembangan_kia
    FOR EACH ROW EXECUTE FUNCTION catat_audit();
-- Only the authenticated REST API is a writer; no anonymous Supabase access.
ALTER TABLE survei_perkembangan_kia ENABLE ROW LEVEL SECURITY;
