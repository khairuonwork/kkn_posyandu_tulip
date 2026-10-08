-- Nomor kontak melekat pada orang tua/keluarga, bukan pada tiap anak.
ALTER TABLE orang_tua
    ADD COLUMN no_wa varchar(32);
