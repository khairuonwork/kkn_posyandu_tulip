-- Role KMS digunakan akun web khusus untuk membaca analisa dan mengonfirmasi
-- antrean setelah penjelasan. Role ini tidak memiliki wilayah RT penugasan.
ALTER TABLE pengguna
    DROP CONSTRAINT IF EXISTS pengguna_peran_check;

ALTER TABLE pengguna
    ADD CONSTRAINT pengguna_peran_check
    CHECK (peran IN ('kader', 'bidan', 'admin', 'kms'));
