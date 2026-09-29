-- Migrasi 004 sudah terpasang di database lokal sebelum berkasnya dipulihkan.
-- Perubahan perilaku harus masuk migrasi baru agar instalasi lama ikut berubah.
ALTER TABLE audit ALTER COLUMN pada SET DEFAULT clock_timestamp();

CREATE OR REPLACE FUNCTION catat_audit() RETURNS trigger AS $$
DECLARE
    lama jsonb;
    baru jsonb;
    pelaku bigint;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN
        RETURN NULL;
    END IF;

    IF TG_OP <> 'INSERT' THEN lama := to_jsonb(OLD); END IF;
    IF TG_OP <> 'DELETE' THEN baru := to_jsonb(NEW); END IF;

    -- Audit perubahan akun tetap ada, tetapi hash sandi tidak disalin.
    IF TG_TABLE_NAME = 'pengguna' THEN
        lama := lama - 'kata_sandi_hash';
        baru := baru - 'kata_sandi_hash';
    END IF;

    pelaku := NULLIF(current_setting('app.pengguna_id', true), '')::bigint;
    -- Penghapusan akun sendiri tidak boleh gagal karena FK audit.
    IF TG_TABLE_NAME = 'pengguna' AND TG_OP = 'DELETE' AND pelaku = OLD.id THEN
        pelaku := NULL;
    END IF;

    INSERT INTO audit (tabel, baris_id, aksi, sebelum, sesudah, pengguna_id, sumber)
    VALUES (
        TG_TABLE_NAME, (COALESCE(baru, lama)->>'id')::bigint,
        lower(TG_OP), lama, baru, pelaku,
        COALESCE(NULLIF(current_setting('app.sumber', true), ''), 'tidak diketahui')
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Hapus hanya salinan kredensial dari snapshot lama; peristiwa dan kolom
-- domain lainnya tetap utuh. Audit sendiri tidak memiliki trigger audit.
UPDATE audit
SET sebelum = sebelum - 'kata_sandi_hash', sesudah = sesudah - 'kata_sandi_hash'
WHERE tabel = 'pengguna'
  AND (sebelum ? 'kata_sandi_hash' OR sesudah ? 'kata_sandi_hash');
