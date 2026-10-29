-- Perbedakan admin Posyandu dari superadmin portal.
-- Mirae tetap memakai akun dan hash kata sandi yang sama; hanya cakupan yang ditandai.
ALTER TABLE pengguna
    ADD COLUMN IF NOT EXISTS super_admin boolean NOT NULL DEFAULT false;

UPDATE pengguna
   SET super_admin = true
 WHERE lower(username) = 'mirae';
