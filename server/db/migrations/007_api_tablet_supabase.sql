-- Kontrak aman antara aplikasi Android dan skema utama Portal di Supabase.
--
-- Android tidak menulis tabel domain secara langsung. Dua RPC SECURITY DEFINER
-- di bawah menjaga pendaftaran lintas tabel dan upsert pengukuran tetap atomik,
-- sementara dua view baca mempertahankan bentuk data ringkas yang diperlukan
-- tablet. Semua akses mensyaratkan sesi Supabase Auth yang sah.

ALTER TABLE pengguna
    ADD COLUMN supabase_uid uuid UNIQUE;

ALTER TABLE pengukuran
    ADD COLUMN id_sumber text UNIQUE;

-- Instalasi baru perlu satu Posyandu induk. Data sebenarnya tetap dapat diubah
-- melalui Portal setelah migrasi.
INSERT INTO posyandu (nama, slug, rw)
VALUES ('Posyandu Tulip', 'posyandu-tulip', '00')
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE VIEW tablet_anak
WITH (security_invoker = true)
AS
SELECT
    a.id AS id_anak,
    a.nik,
    'ANAK-' || lpad(a.id::text, 8, '0') AS kode_kartu,
    a.nama AS nama_anak,
    a.tgl_lahir,
    a.jk,
    ot.nama AS nama_ortu,
    ot.nik AS nik_ortu,
    wr.rt,
    a.anak_ke,
    a.bb_lahir_kg AS bb_lahir,
    a.pb_lahir_cm AS pb_lahir,
    a.buku_kia,
    a.imd,
    EXISTS (
        SELECT 1
        FROM layanan l
        WHERE l.anak_id = a.id AND l.jenis = 'imunisasi'
    ) AS imunisasi_lengkap
FROM anak a
LEFT JOIN orang_tua ot ON ot.id = a.orang_tua_id
LEFT JOIN wilayah_rt wr ON wr.id = a.wilayah_rt_id
WHERE a.deleted_at IS NULL;

CREATE OR REPLACE VIEW tablet_pengukuran
WITH (security_invoker = true)
AS
SELECT
    coalesce(p.id_sumber, 'ukur_db_' || p.id::text) AS id_pengukuran,
    a.nik,
    'periode_' || extract(year FROM p.tanggal_ukur)::int::text || '_' ||
        extract(month FROM p.tanggal_ukur)::int::text AS id_periode,
    p.tanggal_ukur,
    p.bb_kg,
    p.tinggi_cm AS panjang_tinggi_cm,
    CASE p.jenis_ukur WHEN 'TB' THEN 'Berdiri' WHEN 'PB' THEN 'Terlentang' END AS jenis_ukur,
    p.lila_cm AS lila,
    p.lika_cm AS lika,
    p.ntob_raw AS ntob,
    CASE p.status_kehadiran
        WHEN 'hadir' THEN 'Hadir'
        WHEN 'tidak_hadir' THEN 'Tidak Hadir'
        WHEN 'pindah' THEN 'Pindah'
        ELSE 'Tidak Dapat Diukur'
    END AS status_kehadiran,
    p.updated_at
FROM pengukuran p
JOIN anak a ON a.id = p.anak_id
WHERE a.deleted_at IS NULL;

CREATE OR REPLACE FUNCTION daftar_anak_tablet(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_nik text := nullif(btrim(payload->>'nik'), '');
    v_nama text := nullif(btrim(payload->>'nama_anak'), '');
    v_nama_ortu text := coalesce(nullif(btrim(payload->>'nama_ortu'), ''), 'Belum dilengkapi');
    v_rt text := coalesce(nullif(btrim(payload->>'rt'), ''), '00');
    v_posyandu_id bigint;
    v_wilayah_id bigint;
    v_orang_tua_id bigint;
    v_anak_id bigint;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Sesi pengguna diperlukan' USING ERRCODE = '42501';
    END IF;
    IF v_nik IS NULL OR v_nik !~ '^[0-9]{16}$' THEN
        RAISE EXCEPTION 'NIK anak harus 16 digit';
    END IF;
    IF v_nama IS NULL THEN
        RAISE EXCEPTION 'Nama anak wajib diisi';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_nik));

    SELECT id INTO v_posyandu_id FROM posyandu ORDER BY id LIMIT 1;
    IF v_posyandu_id IS NULL THEN
        RAISE EXCEPTION 'Data Posyandu belum tersedia';
    END IF;

    INSERT INTO wilayah_rt (posyandu_id, rt, rw)
    SELECT v_posyandu_id, v_rt, coalesce(nullif(rw, ''), '00')
    FROM posyandu WHERE id = v_posyandu_id
    ON CONFLICT (posyandu_id, rt, rw) DO UPDATE SET rt = excluded.rt
    RETURNING id INTO v_wilayah_id;

    SELECT id, orang_tua_id INTO v_anak_id, v_orang_tua_id
    FROM anak WHERE nik = v_nik AND deleted_at IS NULL
    FOR UPDATE;

    IF v_orang_tua_id IS NULL THEN
        INSERT INTO orang_tua (nama) VALUES (v_nama_ortu)
        RETURNING id INTO v_orang_tua_id;
    ELSE
        UPDATE orang_tua SET nama = v_nama_ortu WHERE id = v_orang_tua_id;
    END IF;

    IF v_anak_id IS NULL THEN
        INSERT INTO anak (
            nik, orang_tua_id, wilayah_rt_id, nama, nama_baku, tgl_lahir, jk
        ) VALUES (
            v_nik,
            v_orang_tua_id,
            v_wilayah_id,
            v_nama,
            lower(regexp_replace(v_nama, '\s+', ' ', 'g')),
            (payload->>'tgl_lahir')::date,
            upper(payload->>'jk')
        ) RETURNING id INTO v_anak_id;
    ELSE
        UPDATE anak SET
            orang_tua_id = v_orang_tua_id,
            wilayah_rt_id = v_wilayah_id,
            nama = v_nama,
            nama_baku = lower(regexp_replace(v_nama, '\s+', ' ', 'g')),
            tgl_lahir = (payload->>'tgl_lahir')::date,
            jk = upper(payload->>'jk')
        WHERE id = v_anak_id;
    END IF;

    RETURN jsonb_build_object('id_anak', v_anak_id, 'nik', v_nik);
END;
$$;

CREATE OR REPLACE FUNCTION simpan_pengukuran_tablet(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid uuid := auth.uid();
    v_nik text := nullif(btrim(payload->>'nik'), '');
    v_id_sumber text := nullif(btrim(payload->>'id_pengukuran'), '');
    v_tanggal date := (payload->>'tanggal_ukur')::date;
    v_anak_id bigint;
    v_posyandu_id bigint;
    v_periode_id bigint;
    v_pengguna_id bigint;
    v_pengukuran_id bigint;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Sesi pengguna diperlukan' USING ERRCODE = '42501';
    END IF;
    IF v_id_sumber IS NULL OR v_nik IS NULL OR v_tanggal IS NULL THEN
        RAISE EXCEPTION 'Identitas pengukuran, NIK, dan tanggal wajib diisi';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_nik || ':' || to_char(v_tanggal, 'YYYY-MM')));

    SELECT a.id, wr.posyandu_id
      INTO v_anak_id, v_posyandu_id
      FROM anak a
      LEFT JOIN wilayah_rt wr ON wr.id = a.wilayah_rt_id
     WHERE a.nik = v_nik AND a.deleted_at IS NULL;

    IF v_anak_id IS NULL THEN
        RAISE EXCEPTION 'Anak dengan NIK tersebut belum terdaftar';
    END IF;
    IF v_posyandu_id IS NULL THEN
        SELECT id INTO v_posyandu_id FROM posyandu ORDER BY id LIMIT 1;
    END IF;

    INSERT INTO periode (posyandu_id, bulan, tahun, tanggal_kegiatan)
    VALUES (v_posyandu_id, extract(month FROM v_tanggal), extract(year FROM v_tanggal), v_tanggal)
    ON CONFLICT (posyandu_id, bulan, tahun)
    DO UPDATE SET tanggal_kegiatan = coalesce(periode.tanggal_kegiatan, excluded.tanggal_kegiatan)
    RETURNING id INTO v_periode_id;

    SELECT id INTO v_pengguna_id FROM pengguna WHERE supabase_uid = v_uid;

    SELECT id INTO v_pengukuran_id
      FROM pengukuran
     WHERE id_sumber = v_id_sumber OR (anak_id = v_anak_id AND periode_id = v_periode_id)
     ORDER BY (id_sumber = v_id_sumber) DESC
     LIMIT 1
     FOR UPDATE;

    IF v_pengukuran_id IS NULL THEN
        INSERT INTO pengukuran (
            anak_id, periode_id, dicatat_oleh, tanggal_ukur, bb_kg, tinggi_cm,
            jenis_ukur, lila_cm, lika_cm, ntob_raw, status_kehadiran, sumber, id_sumber
        ) VALUES (
            v_anak_id, v_periode_id, v_pengguna_id, v_tanggal,
            nullif(payload->>'bb_kg', 'N/A')::numeric,
            nullif(payload->>'panjang_tinggi_cm', 'N/A')::numeric,
            CASE lower(payload->>'jenis_ukur') WHEN 'berdiri' THEN 'TB' ELSE 'PB' END,
            nullif(payload->>'lila', 'N/A')::numeric,
            nullif(payload->>'lika', 'N/A')::numeric,
            nullif(payload->>'ntob', ''),
            CASE lower(payload->>'status_kehadiran')
                WHEN 'hadir' THEN 'hadir'
                WHEN 'tidak hadir' THEN 'tidak_hadir'
                WHEN 'pindah' THEN 'pindah'
                ELSE 'tidak_dapat_diukur'
            END,
            'tablet', v_id_sumber
        ) RETURNING id INTO v_pengukuran_id;
    ELSE
        UPDATE pengukuran SET
            periode_id = v_periode_id,
            dicatat_oleh = coalesce(v_pengguna_id, dicatat_oleh),
            tanggal_ukur = v_tanggal,
            bb_kg = nullif(payload->>'bb_kg', 'N/A')::numeric,
            tinggi_cm = nullif(payload->>'panjang_tinggi_cm', 'N/A')::numeric,
            jenis_ukur = CASE lower(payload->>'jenis_ukur') WHEN 'berdiri' THEN 'TB' ELSE 'PB' END,
            lila_cm = nullif(payload->>'lila', 'N/A')::numeric,
            lika_cm = nullif(payload->>'lika', 'N/A')::numeric,
            ntob_raw = nullif(payload->>'ntob', ''),
            status_kehadiran = CASE lower(payload->>'status_kehadiran')
                WHEN 'hadir' THEN 'hadir'
                WHEN 'tidak hadir' THEN 'tidak_hadir'
                WHEN 'pindah' THEN 'pindah'
                ELSE 'tidak_dapat_diukur'
            END,
            sumber = 'tablet',
            id_sumber = v_id_sumber
        WHERE id = v_pengukuran_id;
    END IF;

    RETURN jsonb_build_object('id', v_pengukuran_id, 'id_pengukuran', v_id_sumber);
END;
$$;

-- Supabase memberi hak tabel public secara luas secara bawaan. RLS berikut
-- memastikan publishable key tanpa sesi tidak dapat membaca data sasaran.
ALTER TABLE posyandu ENABLE ROW LEVEL SECURITY;
ALTER TABLE wilayah_rt ENABLE ROW LEVEL SECURITY;
ALTER TABLE orang_tua ENABLE ROW LEVEL SECURITY;
ALTER TABLE anak ENABLE ROW LEVEL SECURITY;
ALTER TABLE periode ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengukuran ENABLE ROW LEVEL SECURITY;
ALTER TABLE layanan ENABLE ROW LEVEL SECURITY;

CREATE POLICY tablet_baca_posyandu ON posyandu FOR SELECT TO authenticated USING (true);
CREATE POLICY tablet_baca_wilayah ON wilayah_rt FOR SELECT TO authenticated USING (true);
CREATE POLICY tablet_baca_orang_tua ON orang_tua FOR SELECT TO authenticated USING (true);
CREATE POLICY tablet_baca_anak ON anak FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY tablet_baca_periode ON periode FOR SELECT TO authenticated USING (true);
CREATE POLICY tablet_baca_pengukuran ON pengukuran FOR SELECT TO authenticated USING (true);
CREATE POLICY tablet_baca_layanan ON layanan FOR SELECT TO authenticated USING (true);

REVOKE ALL ON tablet_anak, tablet_pengukuran FROM anon;
GRANT SELECT ON tablet_anak, tablet_pengukuran TO authenticated;
REVOKE ALL ON FUNCTION daftar_anak_tablet(jsonb), simpan_pengukuran_tablet(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION daftar_anak_tablet(jsonb), simpan_pengukuran_tablet(jsonb) TO authenticated;
