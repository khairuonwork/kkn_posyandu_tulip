-- catat_audit memerlukan identitas bigint, selain kunci unik periode/RT.
ALTER TABLE cakupan_hari_h ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY UNIQUE;
