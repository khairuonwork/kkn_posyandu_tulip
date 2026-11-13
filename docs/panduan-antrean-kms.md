# Panduan Antrean KMS

| | |
|---|---|
| **Jenis** | Panduan |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 13 November 2026 |

Panduan ini menjelaskan pemanggilan peserta dan pengujiannya. Rincian antarmuka server ada di [kontrak API](SIMPATIK_Posyandu_REST_API_Contract.md#34-antrean--pemeriksaan-kms-real-time) dan bentuk data di [Basis Data](database.md#panggilan-kms-migrasi-030).

## Pemakaian aplikasi

1. Jalankan migrasi sebelum memakai versi server yang mendukung pemanggilan. Dari folder utama proyek jalankan `npm --prefix server run migrate`; perintah memakai konfigurasi `server/.env`. Pastikan konfigurasi menunjuk database yang dimaksud. Migrasi mengubah database tersebut.
2. Admin menetapkan **Nomor meja KMS** pada akun Petugas KMS melalui **Pengaturan → Pengguna dan peran**. Nomor meja 1–99; boleh kosong jika belum ditetapkan. Akun tanpa meja dapat melihat antrean tetapi tidak dapat memanggil. Selesaikan atau kembalikan peserta aktif sebelum mengubah penugasan meja.
3. Daftarkan peserta melalui check-in pada hari layanan. Peserta dapat muncul di antrean sebelum diukur. Petugas memilih peserta dari antrean dan menekan **Panggil**; meja ditentukan oleh akun.
4. Pada perangkat speaker, buka **Buka layar ruang tunggu** dengan akun yang memiliki akses KMS. Suara dicoba aktif secara otomatis; jika diminta, tekan **Aktifkan suara**. Gunakan **Pengaturan suara** untuk memilih suara bahasa Indonesia dan **Tes suara**. Petugas dapat memakai perangkat atau tab lain untuk memanggil.
5. Petugas dapat **Panggil ulang**, **Tandai tiba**, atau **Kembalikan ke antrean**. Peserta yang kembali mempertahankan nomor antreannya. Setelah tiba dan pengukuran hari yang sama lengkap, gunakan **Konfirmasi selesai**. Selesaikan atau kembalikan peserta aktif sebelum memanggil peserta lain di meja tersebut.

Petugas bebas memilih peserta yang menunggu; pengurutan otomatis berdasarkan urgensi belum tersedia. Jika dua petugas memilih peserta yang sama atau meja sudah terisi, server menolak salah satu tindakan dan petugas perlu memeriksa antrean terbaru.

Layar ruang tunggu menampilkan nomor dan meja, sedangkan suara browser juga menyebut nama jika tersedia. Suara lokal Indonesia diutamakan; Microsoft Andika dipilih jika tersedia sebagai suara lokal. Suara daring yang tersedia di browser dapat dipilih. Pilihan disimpan di browser. Rekaman lokal menggunakan potongan audio nomor dan meja, tanpa nama. Saat audio gagal, nomor dan meja tetap dapat dilihat; aktifkan kembali suara dan gunakan **Panggil ulang**.

Saat layar aplikasi dibuka, panggilan terakhir dapat terlihat, tetapi tidak dibacakan ulang. Panggilan baru diputar berurutan selama suara aktif. Uji kejelasan nama, nomor dan meja di browser serta speaker yang akan dipakai; jika memakai suara lokal, uji juga tanpa internet dengan sambungan ke server antrean tetap tersedia.

## Uji simulasi developer

Simulasi ini memakai data contoh di browser, bukan data PostgreSQL. Ia berbeda dari [Sesi Pelatihan](sesi-pelatihan.md) yang menggunakan skema database latihan di server.

1. Dari folder utama proyek, jalankan `npm --prefix client run demo`. Buka alamat **Local** yang ditampilkan Vite, biasanya `http://localhost:5173`. Biarkan terminal tetap berjalan.
2. Masuk sebagai **Petugas KMS** pada halaman demo, lalu buka **Pemeriksaan KMS**. Demo menyediakan peserta contoh; gunakan **Tambah 20 peserta uji** untuk antrean panjang dan pilih **Meja simulasi** bila perlu.
3. Klik **Buka layar ruang tunggu**. Pada tab baru, aktifkan suara jika diminta, lalu buka **Pengaturan suara** untuk memilih dan menguji suara. Pertahankan kedua tab pada browser dan profil yang sama.
4. Kembali ke tab Pemeriksaan KMS, tekan **Panggil** pada peserta dan lihat nomor serta meja di tab ruang tunggu. Tekan **Panggil ulang** untuk mengirim panggilan baru. Peserta aktif dapat ditandai tiba, dikembalikan, atau diselesaikan setelah pengukuran simulasi lengkap.
5. **Reset simulasi** mengembalikan antrean KMS demo ke data awal dan menghapus panggilan demo tersimpan. Ini mengubah data simulasi di browser tersebut.

Di demo, layar ruang tunggu mulai menunggu panggilan baru setelah dibuka; panggilan sebelumnya tidak dibacakan. Panggilan dibagikan antartab melalui penyimpanan browser pada perangkat yang sama, bukan antarperangkat. Demo menyimpan peristiwa panggilan terakhir: beberapa panggilan yang dibuat sangat cepat dapat terlewat; jangan gunakan demo untuk membuktikan ketahanan antrean suara atau transaksi serentak server.

Pada 13 November 2026, tes teks suara lulus. Tes integrasi database untuk perubahan nama pada panggilan dilewati karena `TEST_DATABASE_URL` belum disiapkan; pelafalan dengan speaker Posyandu juga belum diverifikasi.

Tata letak dua kolom, pencarian antrean, pemilih meja dan halaman lengkap **Pemeriksaan selesai** adalah kontrol demo. Ekspor laporan demo berisi data contoh dan bukan formulir F1 resmi lengkap. Simulasi pelatihan pada demo juga hanya berada di browser; hasil latihannya tersedia di halaman Sesi Pelatihan demo.
