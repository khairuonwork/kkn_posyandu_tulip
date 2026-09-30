-- Master wilayah minimum untuk akun live dan pembatasan akses kader.

UPDATE posyandu
   SET nama = 'Posyandu Tulip', rw = '18', kelurahan = 'Citeureup'
 WHERE slug = 'posyandu-tulip';

INSERT INTO wilayah_rt (posyandu_id, rt, rw)
SELECT p.id, lpad(n::text, 2, '0'), '18'
  FROM posyandu p
 CROSS JOIN generate_series(1, 7) AS n
 WHERE p.slug = 'posyandu-tulip'
ON CONFLICT (posyandu_id, rt, rw) DO NOTHING;
