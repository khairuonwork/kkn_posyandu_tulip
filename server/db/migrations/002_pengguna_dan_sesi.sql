-- Akun pengguna dan sesi.
--
-- Menggantikan autentikasi Fortify dan RBAC berbasis tabel `teams` yang ikut
-- hilang bersama Laravel (ADR-0004, digantikan ADR-0006). Matriks izinnya ada
-- di docs/arsitektur.md bagian Otorisasi dan ditegakkan `server/src/auth/peran.ts`.
--
-- Tidak ada 2FA maupun passkey: keduanya ada di starter kit lama, tetapi tidak
-- pernah disebut sebagai kebutuhan pemilik program (ADR-0006).

CREATE TABLE pengguna (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama            text        NOT NULL,
    email           text        NOT NULL,
    -- Format `scrypt$N$r$p$garam$kunci`; parameternya ikut tersimpan supaya
    -- hash lama tetap terverifikasi saat parameter dinaikkan.
    kata_sandi_hash text        NOT NULL,
    peran           text        NOT NULL CHECK (peran IN ('kader', 'bidan', 'admin')),
    wilayah_rt_id   bigint REFERENCES wilayah_rt (id) ON DELETE RESTRICT,
    -- Dinonaktifkan, bukan dihapus: baris audit menyebut siapa yang mengubah
    -- apa, dan rujukan ke akun yang lenyap tidak dapat dibaca siapa pun.
    aktif           boolean     NOT NULL DEFAULT true,
    terakhir_masuk  timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    -- RT binaan hanya berarti bagi kader; bidan dan admin melihat seluruh RW.
    -- Ditegakkan di sini, bukan hanya di aplikasi: kader tanpa RT adalah
    -- keadaan yang penanganannya mudah salah menjadi "boleh lihat semua".
    CONSTRAINT pengguna_rt_sesuai_peran
        CHECK ((peran = 'kader') = (wilayah_rt_id IS NOT NULL))
);

-- Email dibandingkan tanpa peduli huruf besar-kecil. Indeks fungsional dipakai
-- alih-alih ekstensi citext supaya skema tetap berjalan di PostgreSQL polos.
CREATE UNIQUE INDEX pengguna_email_unik ON pengguna (lower(email));

-- Sesi disimpan di basis data supaya dapat dicabut seketika: saat Admin
-- menonaktifkan sebuah akun, akses yang sedang berjalan harus langsung mati.
CREATE TABLE sesi (
    -- SHA-256 heksadesimal dari token, bukan tokennya. Salinan basis data yang
    -- bocor karena itu tidak memuat satu pun sesi yang dapat dipakai.
    ringkasan   char(64)    PRIMARY KEY,
    pengguna_id bigint      NOT NULL REFERENCES pengguna (id) ON DELETE CASCADE,
    kedaluwarsa timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sesi_pengguna_idx ON sesi (pengguna_id);
-- Dipakai pembersihan sesi mati secara berkala.
CREATE INDEX sesi_kedaluwarsa_idx ON sesi (kedaluwarsa);

-- Foreign key yang sengaja ditunda pada migrasi 001, karena tabel pengguna
-- belum ada saat itu.
ALTER TABLE pengukuran
    ADD CONSTRAINT pengukuran_dicatat_oleh_fkey
    FOREIGN KEY (dicatat_oleh) REFERENCES pengguna (id) ON DELETE SET NULL;

ALTER TABLE import_batch
    ADD CONSTRAINT import_batch_dijalankan_oleh_fkey
    FOREIGN KEY (dijalankan_oleh) REFERENCES pengguna (id) ON DELETE SET NULL;
