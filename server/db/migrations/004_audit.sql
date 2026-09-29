-- Dipulihkan dari definisi skema 004 yang sudah terpasang di database lokal.
-- Perbaikan berikutnya ada di migrasi 005; jangan ubah migrasi historis ini.
CREATE TABLE audit (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tabel text NOT NULL,
    baris_id bigint NOT NULL,
    aksi text NOT NULL CHECK (aksi IN ('insert', 'update', 'delete')),
    sebelum jsonb,
    sesudah jsonb,
    pengguna_id bigint REFERENCES pengguna(id) ON DELETE SET NULL,
    sumber text NOT NULL,
    pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_baris_idx ON audit(tabel, baris_id, pada DESC);
CREATE INDEX audit_pengguna_idx ON audit(pengguna_id, pada DESC);

CREATE OR REPLACE FUNCTION catat_audit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    pengguna bigint;
    asal     text;
BEGIN
    -- Diset aplikasi lewat `SET LOCAL` di awal transaksi. Argumen kedua `true`
    -- membuat `current_setting` mengembalikan NULL alih-alih melempar galat
    -- ketika variabelnya belum pernah diset — perubahan tetap tercatat, hanya
    -- tanpa nama.
    pengguna := nullif(current_setting('app.pengguna_id', true), '')::bigint;
    asal     := coalesce(nullif(current_setting('app.sumber', true), ''), 'tidak diketahui');

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit (tabel, baris_id, aksi, sebelum, sesudah, pengguna_id, sumber)
        VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), NULL, pengguna, asal);

        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit (tabel, baris_id, aksi, sebelum, sesudah, pengguna_id, sumber)
        VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), pengguna, asal);

        RETURN NEW;
    END IF;

    INSERT INTO audit (tabel, baris_id, aksi, sebelum, sesudah, pengguna_id, sumber)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', NULL, to_jsonb(NEW), pengguna, asal);

    RETURN NEW;
END;
$function$
;

CREATE TRIGGER anak_catat_audit AFTER INSERT OR DELETE ON anak FOR EACH ROW EXECUTE FUNCTION catat_audit();
CREATE TRIGGER anak_catat_audit_update AFTER UPDATE ON anak FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION catat_audit();
CREATE TRIGGER layanan_catat_audit AFTER INSERT OR DELETE ON layanan FOR EACH ROW EXECUTE FUNCTION catat_audit();
CREATE TRIGGER layanan_catat_audit_update AFTER UPDATE ON layanan FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION catat_audit();
CREATE TRIGGER orang_tua_catat_audit AFTER INSERT OR DELETE ON orang_tua FOR EACH ROW EXECUTE FUNCTION catat_audit();
CREATE TRIGGER orang_tua_catat_audit_update AFTER UPDATE ON orang_tua FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION catat_audit();
CREATE TRIGGER pengguna_catat_audit AFTER INSERT OR DELETE ON pengguna FOR EACH ROW EXECUTE FUNCTION catat_audit();
CREATE TRIGGER pengguna_catat_audit_update AFTER UPDATE ON pengguna FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION catat_audit();
CREATE TRIGGER pengukuran_catat_audit AFTER INSERT OR DELETE ON pengukuran FOR EACH ROW EXECUTE FUNCTION catat_audit();
CREATE TRIGGER pengukuran_catat_audit_update AFTER UPDATE ON pengukuran FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION catat_audit();
CREATE TRIGGER periode_catat_audit AFTER INSERT OR DELETE ON periode FOR EACH ROW EXECUTE FUNCTION catat_audit();
CREATE TRIGGER periode_catat_audit_update AFTER UPDATE ON periode FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION catat_audit();
CREATE TRIGGER wilayah_rt_catat_audit AFTER INSERT OR DELETE ON wilayah_rt FOR EACH ROW EXECUTE FUNCTION catat_audit();
CREATE TRIGGER wilayah_rt_catat_audit_update AFTER UPDATE ON wilayah_rt FOR EACH ROW WHEN ((old.* IS DISTINCT FROM new.*)) EXECUTE FUNCTION catat_audit();
