ALTER TABLE orang_tua ADD COLUMN jenis_kb varchar(100);
ALTER TABLE sumber_f1 ADD COLUMN desil_kelompok text
    CHECK (desil_kelompok = '6-10');
ALTER TABLE sumber_f1 ADD CONSTRAINT sumber_f1_desil_kelompok_valid
    CHECK (desil_kelompok IS NULL OR (desil IS NULL AND gng = 'NG' AND gng IS NOT NULL));
