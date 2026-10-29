-- Hubungkan setiap akun ke Posyandu/RW yang menjadi wilayah kerjanya.
-- Keanggotaan terpisah dari wilayah RT agar Admin, Bidan, dan KMS juga dapat
-- memiliki konteks cluster tanpa mengubah aturan penugasan RT kader.
CREATE TABLE IF NOT EXISTS pengguna_posyandu (
    pengguna_id bigint NOT NULL REFERENCES pengguna (id) ON DELETE CASCADE,
    posyandu_id bigint NOT NULL REFERENCES posyandu (id) ON DELETE CASCADE,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (pengguna_id, posyandu_id)
);

CREATE INDEX IF NOT EXISTS pengguna_posyandu_posyandu_idx
    ON pengguna_posyandu (posyandu_id, pengguna_id);

-- Database aktif saat migrasi ini hanya memiliki Posyandu Tulip RW 18.
-- Semua akun yang sudah ada diberi cakupan wilayah tersebut; kata sandi,
-- hash, status akun, dan penugasan RT tidak diubah.
INSERT INTO pengguna_posyandu (pengguna_id, posyandu_id)
SELECT u.id, p.id
  FROM pengguna u
 CROSS JOIN posyandu p
 WHERE p.slug = 'posyandu-tulip'
ON CONFLICT (pengguna_id, posyandu_id) DO NOTHING;
