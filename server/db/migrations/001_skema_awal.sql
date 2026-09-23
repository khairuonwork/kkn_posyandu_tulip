-- Skema awal Portal Posyandu Tulip untuk PostgreSQL.
--
-- Port dari empat migration Laravel di database/migrations/2026_09_09_*.
-- Bentuk tabel dan alasan tiap kolom ada di docs/database.md; yang berubah hanya
-- dialeknya.
--
-- Tiga hal yang sengaja berbeda dari asalnya:
--
-- 1. Tabel `teams` menjadi `posyandu`, dan `team_id` menjadi `posyandu_id`.
--    Nama lama adalah sisa starter kit Laravel yang ADR-0004 pertahankan supaya
--    diff-nya kecil; starter kit itu sudah tidak ada. Alasan mempertahankan
--    kolomnya tetap berlaku: dukungan multi-Posyandu nanti tidak menuntut
--    migrasi data.
--
-- 2. Enum disimpan sebagai `text` dengan CHECK, bukan tipe enum PostgreSQL.
--    Menambah satu nilai pada CHECK adalah satu ALTER; pada tipe enum ia
--    menyeret dependensi tipe.
--
-- 3. `dicatat_oleh` dan `dijalankan_oleh` belum punya foreign key. Tabel
--    pengguna dibuat bersama autentikasi (ADR-0006 langkah 3), dan FK-nya
--    ditambahkan di migration itu.

CREATE TABLE posyandu (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama        text        NOT NULL,
    slug        text        NOT NULL UNIQUE,
    rw          varchar(3),
    kelurahan   text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wilayah_rt (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posyandu_id bigint      NOT NULL REFERENCES posyandu (id) ON DELETE CASCADE,
    -- Teks, bukan integer: menjaga bentuk "01".
    rt          varchar(3)  NOT NULL,
    rw          varchar(3)  NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    UNIQUE (posyandu_id, rt, rw)
);

CREATE TABLE orang_tua (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- NIK adalah natural key, bukan primary key. Boleh kosong.
    -- Lihat docs/adr/0001-primary-key-strategy.md.
    nik        varchar(16) UNIQUE,
    nama       text        NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orang_tua_nama_idx ON orang_tua (nama);

CREATE TABLE anak (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nik           varchar(16) UNIQUE,
    orang_tua_id  bigint REFERENCES orang_tua (id) ON DELETE SET NULL,
    wilayah_rt_id bigint REFERENCES wilayah_rt (id) ON DELETE SET NULL,
    nama          text        NOT NULL,
    -- Nama yang sudah dibakukan; dipakai untuk pencarian dan pencocokan impor.
    nama_baku     text        NOT NULL,
    tgl_lahir     date        NOT NULL,
    jk            char(1)     NOT NULL CHECK (jk IN ('L', 'P')),
    anak_ke       smallint CHECK (anak_ke IS NULL OR anak_ke > 0),
    -- Kilogram. Nilai bersatuan gram dari arsip menjadi konflik impor,
    -- bukan dikonversi diam-diam.
    bb_lahir_kg   numeric(5, 2),
    pb_lahir_cm   numeric(5, 1),
    buku_kia      boolean     NOT NULL DEFAULT false,
    imd           boolean     NOT NULL DEFAULT false,
    status        text        NOT NULL DEFAULT 'aktif'
                      CHECK (status IN ('aktif', 'lulus', 'pindah', 'meninggal')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz
);

CREATE INDEX anak_nama_baku_idx ON anak (nama_baku);
CREATE INDEX anak_tgl_lahir_idx ON anak (tgl_lahir);
CREATE INDEX anak_rt_status_idx ON anak (wilayah_rt_id, status);

CREATE TABLE periode (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    posyandu_id      bigint      NOT NULL REFERENCES posyandu (id) ON DELETE CASCADE,
    bulan            smallint    NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    tahun            smallint    NOT NULL,
    tanggal_kegiatan date,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),

    UNIQUE (posyandu_id, bulan, tahun)
);

CREATE INDEX periode_tahun_bulan_idx ON periode (tahun, bulan);

CREATE TABLE pengukuran (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anak_id          bigint      NOT NULL REFERENCES anak (id) ON DELETE CASCADE,
    periode_id       bigint      NOT NULL REFERENCES periode (id) ON DELETE CASCADE,
    -- FK menyusul bersama tabel pengguna.
    dicatat_oleh     bigint,
    tanggal_ukur     date        NOT NULL,
    -- Kosong berbeda dari nol: ketidakhadiran bukan berat badan 0 kg.
    bb_kg            numeric(5, 2),
    -- Nilai ukur asli, sebelum konversi PB/TB.
    tinggi_cm        numeric(5, 1),
    jenis_ukur       varchar(2) CHECK (jenis_ukur IS NULL OR jenis_ukur IN ('PB', 'TB')),
    lila_cm          numeric(4, 1),
    lika_cm          numeric(4, 1),
    -- Nilai mentah dari arsip. Aturan turunannya ada di
    -- docs/rujukan/antropometri.md bagian 10, belum diterapkan (OI-01).
    ntob_raw         varchar(8),
    status_kehadiran text        NOT NULL DEFAULT 'hadir'
                         CHECK (status_kehadiran IN ('hadir', 'tidak_hadir', 'pindah', 'tidak_dapat_diukur')),
    catatan          text,
    sumber           text        NOT NULL DEFAULT 'manual'
                         CHECK (sumber IN ('import', 'manual', 'tablet')),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),

    -- Satu rekam utama per anak per periode. Membuat impor ulang idempotent
    -- dan mencegah penghitungan ganda pada rekap D/S.
    UNIQUE (anak_id, periode_id)
);

CREATE INDEX pengukuran_periode_kehadiran_idx ON pengukuran (periode_id, status_kehadiran);
CREATE INDEX pengukuran_tanggal_ukur_idx ON pengukuran (tanggal_ukur);

CREATE TABLE penilaian_gizi (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pengukuran_id       bigint      NOT NULL REFERENCES pengukuran (id) ON DELETE CASCADE,
    -- Versi standar disimpan agar hasil lama tetap dapat ditelusuri ketika
    -- standar diperbarui. Lihat docs/adr/0005-migrasi-metode-zscore.md.
    standar_versi       varchar(20) NOT NULL,
    indeks              varchar(10) NOT NULL
                            CHECK (indeks IN ('BB_U', 'TB_U', 'BB_TB', 'IMT_U', 'LILA_U', 'LIKA_U')),
    z_score             numeric(6, 3),
    kategori            varchar(40),
    tidak_wajar         boolean     NOT NULL DEFAULT false,
    -- Mis. {"jenis_ukur":"diasumsikan dari umur"} — membuat asumsi terlihat.
    catatan_perhitungan jsonb,
    dihitung_pada       timestamptz NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT penilaian_gizi_unik UNIQUE (pengukuran_id, indeks, standar_versi)
);

CREATE INDEX penilaian_gizi_indeks_kategori_idx ON penilaian_gizi (indeks, kategori);

CREATE TABLE layanan (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anak_id    bigint      NOT NULL REFERENCES anak (id) ON DELETE CASCADE,
    periode_id bigint REFERENCES periode (id) ON DELETE SET NULL,
    jenis      text        NOT NULL CHECK (jenis IN ('imunisasi', 'vitamin_a', 'obat_cacing')),
    keterangan text,
    tanggal    date,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX layanan_anak_jenis_idx ON layanan (anak_id, jenis);

-- Tabel referensi, bukan data yang diinput pengguna. Diisi sekali lewat seed
-- dari database/data/who-lms.json.
CREATE TABLE standar_lms (
    id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    versi  varchar(20) NOT NULL,
    indeks varchar(10) NOT NULL
               CHECK (indeks IN ('BB_U', 'TB_U', 'BB_TB', 'IMT_U', 'LILA_U', 'LIKA_U')),
    jk     char(1)     NOT NULL CHECK (jk IN ('L', 'P')),
    -- Umur dalam bulan untuk indeks *_U, panjang/tinggi cm untuk BB_TB.
    kunci  numeric(5, 1) NOT NULL,
    -- L, M, S disimpan per baris, bukan per tabel. Lihat OI-05 di
    -- docs/pertanyaan-terbuka.md: koreksi nanti cukup dengan seed versi baru.
    -- Presisi 6 desimal sudah diperiksa cukup: nilai terpanjang di berkas
    -- sumber punya 5 desimal, jadi tidak ada yang terpotong.
    l      numeric(10, 6) NOT NULL,
    m      numeric(10, 6) NOT NULL,
    s      numeric(10, 6) NOT NULL,

    CONSTRAINT standar_lms_unik UNIQUE (versi, indeks, jk, kunci)
);

CREATE TABLE import_batch (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sumber_file     text        NOT NULL,
    sheet           text,
    -- FK menyusul bersama tabel pengguna.
    dijalankan_oleh bigint,
    dijalankan_pada timestamptz NOT NULL,
    ringkasan       jsonb       NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE import_konflik (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    import_batch_id bigint      NOT NULL REFERENCES import_batch (id) ON DELETE CASCADE,
    baris_asal      integer     NOT NULL,
    jenis           varchar(30) NOT NULL,
    payload         jsonb       NOT NULL,
    status          varchar(12) NOT NULL DEFAULT 'terbuka',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX import_konflik_batch_status_idx ON import_konflik (import_batch_id, status);
