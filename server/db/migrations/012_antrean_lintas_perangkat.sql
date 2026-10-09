-- Satu antrean bersama untuk semua tablet pada tanggal layanan yang sama.
CREATE TABLE antrean_layanan (
    id                  text PRIMARY KEY,
    periode_id          bigint NOT NULL REFERENCES periode (id) ON DELETE CASCADE,
    sasaran_id          bigint NOT NULL REFERENCES sasaran (id) ON DELETE CASCADE,
    tanggal             date NOT NULL,
    nomor               integer NOT NULL CHECK (nomor > 0),
    urutan              integer NOT NULL CHECK (urutan > 0),
    status              text NOT NULL DEFAULT 'waiting'
                            CHECK (status IN ('waiting', 'called', 'serving', 'done', 'cancelled')),
    catatan             text,
    checked_in_at       timestamptz NOT NULL DEFAULT now(),
    called_at           timestamptz,
    completed_at        timestamptz,
    created_by          bigint REFERENCES pengguna (id) ON DELETE SET NULL,
    updated_by          bigint REFERENCES pengguna (id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    UNIQUE (periode_id, tanggal, sasaran_id),
    UNIQUE (periode_id, tanggal, nomor)
);

CREATE INDEX antrean_layanan_periode_tanggal_status_idx
    ON antrean_layanan (periode_id, tanggal, status, urutan);

ALTER TABLE antrean_layanan ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER antrean_layanan_set_updated_at
BEFORE UPDATE ON antrean_layanan
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER antrean_layanan_catat_audit
AFTER INSERT OR UPDATE OR DELETE ON antrean_layanan
FOR EACH ROW EXECUTE FUNCTION catat_audit();
