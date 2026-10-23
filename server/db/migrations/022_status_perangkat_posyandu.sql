-- Laporan terakhir perangkat tetap tersedia setelah offline/restart server.
-- Identitas akun dan cakupan diisi API dari sesi, bukan dari klaim perangkat.
CREATE TABLE perangkat_posyandu (
    pengguna_id bigint NOT NULL REFERENCES pengguna(id) ON DELETE CASCADE,
    device_id text NOT NULL CHECK (length(device_id) BETWEEN 3 AND 128),
    posyandu_id bigint REFERENCES posyandu(id) ON DELETE SET NULL,
    nama_perangkat text NOT NULL CHECK (length(nama_perangkat) BETWEEN 1 AND 100),
    jenis text NOT NULL CHECK (jenis IN ('android', 'web')),
    versi_aplikasi text,
    ip text NOT NULL,
    mode_koneksi text NOT NULL DEFAULT 'tidak_diketahui'
        CHECK (mode_koneksi IN ('online', 'lokal', 'tailscale', 'tidak_diketahui')),
    baterai integer CHECK (baterai BETWEEN 0 AND 100),
    antrean_tertunda integer NOT NULL DEFAULT 0 CHECK (antrean_tertunda >= 0),
    pertama_terlihat timestamptz NOT NULL DEFAULT now(),
    terakhir_aktif timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (pengguna_id, device_id)
);
CREATE INDEX perangkat_posyandu_wilayah_aktif
    ON perangkat_posyandu(posyandu_id, terakhir_aktif DESC);
ALTER TABLE perangkat_posyandu ENABLE ROW LEVEL SECURITY;
-- Tidak ada kebijakan akses langsung Supabase: seluruh akses melewati API
-- yang memeriksa sesi dan keanggotaan Posyandu pada setiap permintaan.
