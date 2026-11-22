-- Pembatas percobaan masuk (server/src/http/batas-masuk.ts): hitungan salah per
-- nama pengguna dan per alamat IP, serta perangkat yang pernah berhasil masuk.
-- Disimpan agar restart server tidak menghapus hitungan. Hitungan berumur paling
-- lama 24 jam, penanda perangkat 180 hari. Baris kedaluwarsa dihapus setiap
-- server menyala.
CREATE TABLE IF NOT EXISTS percobaan_masuk (
    kunci text PRIMARY KEY,
    gagal integer NOT NULL CHECK (gagal >= 0),
    terakhir timestamptz NOT NULL,
    kedaluwarsa timestamptz NOT NULL
);

-- Hanya server, sebagai pemilik tabel, yang membaca dan menulis tabel ini.
ALTER TABLE percobaan_masuk ENABLE ROW LEVEL SECURITY;

-- Peran Data API Supabase tidak ada di Postgres lokal biasa.
DO $$
DECLARE peran text;
BEGIN
    FOR peran IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
        EXECUTE format('REVOKE ALL ON percobaan_masuk FROM %I', peran);
    END LOOP;
END $$;
