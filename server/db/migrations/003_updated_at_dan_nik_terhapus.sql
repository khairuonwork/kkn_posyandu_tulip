-- Dua lubang yang terbawa dari skema Laravel, ditemukan saat memeriksa hasil
-- migrasi terhadap PostgreSQL sungguhan. Keduanya diam: tidak memunculkan
-- galat apa pun, hanya menyimpan data yang salah.

-- 1. `updated_at` tidak pernah berubah -------------------------------------
--
-- Di Laravel, Eloquent yang mengisinya pada tiap penyimpanan. Tanpa Eloquent,
-- tidak ada yang melakukannya, dan kolom itu membeku di waktu insert pada
-- kesebelas tabel yang memilikinya. Layar Pengaturan menampilkan "Terakhir
-- diubah ... oleh ...", dan angka yang salah di sana lebih buruk daripada
-- tidak ada angka sama sekali.
--
-- Ditegakkan trigger, bukan diserahkan ke repository. Satu repository yang
-- lupa menulis `updated_at` akan menghasilkan baris yang tampak tidak pernah
-- disentuh — persis jenis kekeliruan yang tidak terlihat sampai ada yang
-- mencari tahu siapa mengubah apa.

CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'posyandu', 'wilayah_rt', 'orang_tua', 'anak', 'periode',
        'pengukuran', 'penilaian_gizi', 'layanan', 'pengguna',
        'import_batch', 'import_konflik'
    ]
    LOOP
        -- `WHEN (OLD.* IS DISTINCT FROM NEW.*)`: penyimpanan yang tidak
        -- mengubah apa pun tidak boleh menggeser stempel waktunya.
        EXECUTE format(
            'CREATE TRIGGER %I_set_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW
             WHEN (OLD.* IS DISTINCT FROM NEW.*)
             EXECUTE FUNCTION set_updated_at()',
            t, t
        );
    END LOOP;
END;
$$;

-- 2. NIK anak yang sudah dihapus masih tersandera ---------------------------
--
-- `UNIQUE (nik)` ikut menghitung baris yang sudah di-soft-delete, sehingga
-- anak yang profilnya dihapus tidak dapat didaftarkan ulang dengan NIK yang
-- sama. Impor arsip akan menabraknya, dan pesannya — "duplicate key" — tidak
-- menyebut sedikit pun bahwa penyebabnya baris yang sudah terhapus.
--
-- Indeks parsial: keunikan hanya berlaku di antara anak yang masih hidup.

ALTER TABLE anak DROP CONSTRAINT anak_nik_key;

CREATE UNIQUE INDEX anak_nik_unik_aktif
    ON anak (nik)
    WHERE deleted_at IS NULL;
