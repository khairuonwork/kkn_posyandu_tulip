-- Rekap hadir fisik hari H untuk arsip yang tidak memiliki daftar antrean.
CREATE TABLE cakupan_hari_h (
    periode_id bigint NOT NULL REFERENCES periode(id) ON DELETE CASCADE,
    wilayah_rt_id bigint NOT NULL REFERENCES wilayah_rt(id),
    tanggal_hari_h date NOT NULL,
    jumlah_hadir integer NOT NULL CHECK (jumlah_hadir BETWEEN 0 AND 100000),
    dicatat_oleh bigint REFERENCES pengguna(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (periode_id, wilayah_rt_id)
);
ALTER TABLE cakupan_hari_h ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER cakupan_hari_h_set_updated_at BEFORE UPDATE ON cakupan_hari_h
FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER cakupan_hari_h_catat_audit AFTER INSERT OR UPDATE OR DELETE ON cakupan_hari_h
FOR EACH ROW EXECUTE FUNCTION catat_audit();
