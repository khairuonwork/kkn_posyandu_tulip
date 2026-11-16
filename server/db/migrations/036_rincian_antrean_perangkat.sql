-- Rincian data yang masih tertahan di perangkat (id lokal, anak, tanggal,
-- dan alasan penolakan terakhir) agar admin dapat menemukan tablet mana
-- yang menyimpan pengukuran belum terkirim tanpa memegang perangkatnya.
ALTER TABLE perangkat_posyandu
    ADD COLUMN IF NOT EXISTS rincian_tertunda jsonb NOT NULL DEFAULT '[]'::jsonb;
