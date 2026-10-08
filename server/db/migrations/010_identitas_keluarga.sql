-- ID internal anak tetap menjadi primary key; UUID stabil dipakai untuk
-- integrasi lintas perangkat. ID keluarga terpisah dari NIK orang tua agar
-- saudara dapat dikelompokkan tanpa menganggap NIK orang tua sebagai NIK anak.

ALTER TABLE orang_tua
    ADD COLUMN id_keluarga uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX orang_tua_id_keluarga_idx ON orang_tua (id_keluarga);

ALTER TABLE anak
    ADD COLUMN id_publik uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX anak_id_publik_unik ON anak (id_publik);

-- `orang_tua.id_keluarga` adalah UUID keluarga yang boleh dipakai beberapa
-- orang tua dalam satu keluarga. `anak.id_publik` adalah ID eksternal anak;
-- keduanya berbeda dari NIK dan ID internal database.
