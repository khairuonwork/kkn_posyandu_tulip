-- Daftar operasional anak per periode. Tabel `anak` tetap menjadi master
-- keseluruhan dan tidak dipangkas saat sasaran bulanan diganti.

ALTER TABLE periode
    ADD COLUMN sesi_ditutup_pada timestamptz,
    ADD COLUMN sesi_ditutup_oleh bigint REFERENCES pengguna (id) ON DELETE SET NULL;

CREATE TABLE sasaran (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    periode_id        bigint      NOT NULL REFERENCES periode (id) ON DELETE CASCADE,
    anak_id           bigint      NOT NULL REFERENCES anak (id) ON DELETE CASCADE,
    import_batch_id   bigint REFERENCES import_batch (id) ON DELETE SET NULL,
    status            varchar(16) NOT NULL DEFAULT 'menunggu'
                          CHECK (status IN ('menunggu', 'selesai', 'tidak_hadir', 'pindah', 'batal')),
    catatan           text,
    diselesaikan_pada timestamptz,
    diselesaikan_oleh bigint REFERENCES pengguna (id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    UNIQUE (periode_id, anak_id)
);

CREATE INDEX sasaran_periode_status_idx ON sasaran (periode_id, status);
CREATE INDEX sasaran_anak_periode_idx ON sasaran (anak_id, periode_id DESC);

-- Tidak ada policy untuk anon/authenticated: aplikasi Android wajib melalui
-- REST API Portal, bukan membaca tabel ini langsung lewat Supabase Data API.
ALTER TABLE sasaran ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER sasaran_set_updated_at
BEFORE UPDATE ON sasaran
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sasaran_catat_audit
AFTER INSERT OR DELETE ON sasaran
FOR EACH ROW EXECUTE FUNCTION catat_audit();

CREATE TRIGGER sasaran_catat_audit_update
AFTER UPDATE ON sasaran
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION catat_audit();
