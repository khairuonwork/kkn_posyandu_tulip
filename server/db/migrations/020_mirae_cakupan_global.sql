-- Mirae adalah super admin global, bukan anggota cluster satu RW tertentu.
-- Perubahan hanya menghapus relasi cakupan wilayah; akun dan kredensial tetap.
DELETE FROM pengguna_posyandu up
 USING pengguna u
 WHERE u.id = up.pengguna_id
   AND lower(u.username) = 'mirae';
