# Sesi Pelatihan

Pengelolaan sementara hanya untuk akun `super_admin=true`. Menu berada di sidebar
**Sesi Pelatihan**. Superadmin memilih periode sumber, misalnya Oktober 2026
dengan 92 sasaran, lalu memulai sesi.

## Alur peserta

1. Sinkronkan seluruh pekerjaan riil tablet sebelum mulai.
2. Superadmin mulai sesi. Mode berlaku untuk seluruh web dan APK pada server
   ini; operasional riil tidak berlangsung bersamaan pada server yang sama.
3. Peserta login ulang dan sinkronisasi. Target disalin sebagai ANAK LATIHAN,
   dengan NIK, ID internal/UUID, dan keluarga berbeda. Kartu QR operasional lama
   tetap dapat dipindai langsung di APK dan otomatis memetakan ke ANAK LATIHAN
   di sandbox tanpa menyentuh data riil.
4. Latih antrean, pencatatan hasil ukur, KMS, profil, dan laporan menggunakan
   menu biasa. APK yang sudah memakai REST API ini tidak perlu rebuild.
5. Sinkronkan tablet, lalu superadmin memilih **Akhiri dan hapus data latihan**.
6. Bersihkan cache/data latihan lokal Android, lalu login dan sinkronkan data
   riil. APK lama menyimpan antrean offline dan tidak mendukung penghapusan
   jarak jauh. Logout saja tidak menghapus antrean tersebut.

NIK untuk pendaftaran latihan harus 16 digit berawalan `0099`, misalnya
`0099000000000001`. Pengiriman tautan orang tua dinonaktifkan dalam latihan.

## Isolasi

- Migrasi 027 menambah metadata kendali dan penanda mode pada sesi autentikasi.
- Setiap latihan mempunyai schema PostgreSQL sendiri, berawalan `latihan_` dan
  UUID acak. Tabel, foreign key dan sequence berada di schema itu. Tidak ada
  fallback search_path ke tabel public; akses public eksplisit lewat pool
  operasional ditolak selama latihan.
- Salinan mengambil anggota sasaran, referensi wilayah/akun dan standar WHO.
  Tidak menyalin hasil ukur, antrean, layanan, survei, kontak orang tua, sesi
  login atau hash password operasional. Nama keluarga disamarkan, tanggal
  lahir digeser ke hari pertama bulan agar kelompok usia tetap mirip.
- ID latihan mulai 1.000.000.000.000. NIK latihan memakai namespace 0099.
  API riil menolak payload latihan yang tertahan pada APK lama, bahkan setelah
  pengguna login kembali dengan token baru.
- Autentikasi memakai sumber riil. Token ditandai epoch latihan; sesi beda mode
  ditolak. Superadmin pemulai tetap masuk untuk mengakhiri latihan. Cluster
  Nearby memakai workspace dan kunci baru di sandbox.
- Kunci advisory bersama menahan pergantian mode sampai permintaan selesai.
  Transaksi bisnis tetap memakai koneksi per-request yang sama. Koneksi direset
  sebelum dikembalikan ke pool; akses setelah respons ditolak.
- Pengakhiran menghapus schema sesi beserta seluruh isinya. Metadata minimal
  pembuat, periode sumber, jumlah sasaran, waktu mulai/selesai dipertahankan;
  tidak berisi salinan identitas atau hasil latihan.

## Pemasangan

Jalankan migrasi dahulu, kemudian set `PELATIHAN_AKTIF=1` pada konfigurasi API
dan restart API. Fitur tetap tidak mengubah mode riil sampai superadmin menekan
tombol mulai. Jika flag belum aktif, endpoint pelatihan menjawab 503.

Uji murni: `node --experimental-strip-types --test test/pelatihan.test.ts`.
Uji integrasi sumber Oktober: `node --env-file=.env db/uji-pelatihan-rollback.ts`.
Uji integrasi membuat 92 target, memproses format ukur APK, memeriksa 37 FK,
menghapus schema, membandingkan sidik data riil, lalu rollback seluruh transaksi.
