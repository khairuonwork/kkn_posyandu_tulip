-- Masuk dengan nama pengguna, bukan email (keputusan tim, 28 September 2026).
--
-- Portal tidak mengirim surel, jadi email hanya menjadi tanda pengenal saat
-- masuk, dan tidak semua kader memakai email. Nama pengguna pendek seperti
-- `kader01` lebih mudah diketik di tablet.
--
-- Akun yang sudah ada memakai bagian email sebelum '@', dalam huruf kecil:
-- `bidan@posyandutulip.id` menjadi `bidan`. Bila dua akun menghasilkan nama
-- yang sama, atau hasilnya melanggar aturan di bawah, seluruh migrasi ini batal
-- tanpa mengubah apa pun. Ganti email salah satunya lebih dulu, lalu ulangi.

-- Perubahan nama akun di bawah tercatat di audit dengan asal yang jelas.
SET LOCAL app.sumber = 'migrasi';

ALTER TABLE pengguna RENAME COLUMN email TO username;
ALTER INDEX pengguna_email_unik RENAME TO pengguna_username_unik;

UPDATE pengguna
   SET username = lower(split_part(username, '@', 1))
 WHERE username <> lower(split_part(username, '@', 1));

-- Huruf kecil saja, supaya satu nama tidak punya dua ejaan; tanpa spasi dan
-- tanpa '@', supaya tidak tertukar dengan email. Sama dengan `POLA_USERNAME`
-- di server/src/auth/akun.ts, yang memeriksanya lebih dulu dengan pesan yang
-- bisa dibaca.
ALTER TABLE pengguna
    ADD CONSTRAINT pengguna_username_sah CHECK (username ~ '^[a-z0-9._-]{3,32}$');
