# Status perangkat per Posyandu

Pembaruan 21 Oktober 2026.

## Perilaku

Panel **Perangkat Posyandu** berada di kaki sidebar atau laci menu mobile. Panel mencakup Android dan browser web yang sudah login. Catatan menyebut akun, nama/model perangkat, ID singkat, wilayah, versi, jalur koneksi, serta waktu laporan terakhir. Pencarian menerima nama perangkat, akun, Posyandu, atau RW; tersedia filter online/siaga/offline.

- Online: laporan terakhir paling lama 45 detik.
- Siaga: lebih dari 45 detik sampai 120 detik.
- Offline: lebih dari 120 detik atau akun sudah dinonaktifkan.

Catatan offline tetap ada setelah restart server. Web hanya mengetahui laporan yang telah diterima; aktivitas saat perangkat tidak dapat menghubungi server belum menjadi informasi terbaru. Jika pembacaan API gagal, data yang sudah dimuat ditandai sebagai laporan terakhir dengan status belum diketahui.

## Penegakan wilayah

`POST /api/v1/heartbeat` memerlukan sesi pengguna. Identitas pengguna dan Posyandu berasal dari sesi terverifikasi server. Klaim `penggunaId`, `posyanduId`, `rw`, atau `superAdmin` dalam badan tidak menentukan cakupan. Akun operasional harus mempunyai satu keanggotaan Posyandu. Akun super admin tanpa satu keanggotaan disimpan sebagai lintas Posyandu dan hanya terlihat oleh super admin.

`GET /api/v1/perangkat-terhubung` dibatasi ke `posyanduIds` pengguna. `superAdmin` dari database memberi cakupan semua Posyandu; peran admin biasa tidak memberikan akses global. Parameter query tidak dapat memperluas akses.

Kunci catatan `(pengguna_id, device_id)` mencegah ID dari akun lain menimpa laporan akun yang berbeda. Pengguna dan perangkat dapat muncul lagi pada akun berbeda; status lama beralih offline ketika tidak lagi melapor. Status berbasis laporan, bukan deteksi radio langsung.

## Penyimpanan dan kompatibilitas

Migrasi `022_status_perangkat_posyandu.sql` membuat `perangkat_posyandu`, indeks wilayah/waktu, dan mengaktifkan RLS tanpa kebijakan akses langsung Supabase. API menggunakan koneksi server dan memeriksa sesi pada setiap permintaan. Tidak ada perubahan hash kata sandi, data anak, atau riwayat pengukuran.

Kontrak mempertahankan nama properti `daftarTablet`; kini juga memuat jenis perangkat web/Android, cakupan, dan waktu server. APK 1.12.4 mengirim token yang sebelumnya hilang dari heartbeat serta nama/model dari native Android. Browser melapor setiap 15 detik hanya setelah login; listener dihentikan ketika Portal ditutup/keluar. Komponen status membaca setiap 6 detik.

## Pengujian

`node --experimental-strip-types --env-file=.env --test test/perangkat-http.test.ts` menjalankan 8 tes. Fixture dibuat dalam skema sementara `uji_perangkat_<UUID>` dan dihapus sesudah pengujian, sehingga akun dan data Posyandu nyata tidak dipakai untuk simulasi lintas RW.

Tes membuktikan penolakan tanpa sesi, pemalsuan wilayah, pemisahan dua RW dengan ID klien sama, cakupan admin biasa versus super admin, upsert berulang, pemulihan online, serta catatan offline setelah aplikasi server dibuat ulang. Pemeriksaan tipe server/client dan lint komponen perangkat juga dijalankan.

Uji langsung Samsung SM-S711B: heartbeat HTTP 200, jalur online, versi v1.12.4, daftar perangkat global Mirae, dan akses tanpa token HTTP 401. Pengujian UI web mencakup desktop dan lebar mobile 390 px, dialog di atas menu native, pencarian, dan filter offline.

Login langsung Yuliani menampilkan **Posyandu Tulip · RW 18** dan hanya perangkat yang terikat cakupan tersebut. Perangkat Mirae lintas wilayah tidak muncul pada daftar Yuliani. Login Mirae menampilkan **Semua Posyandu**, termasuk Android dan browser yang sudah melapor. Tidak ada kata sandi maupun penugasan akun yang diubah untuk uji ini.

Setelah Yuliani keluar dan berhenti melapor lebih dari 2 menit, browser tersebut tetap terlihat sebagai **Offline** pada cakupan super admin. Dua tes browser tambahan memverifikasi klasifikasi Cloudflare/LAN dan heartbeat pada HTTP LAN tanpa `crypto.randomUUID` maupun akses localStorage.

## Menjalankan layanan

`mulai-server.bat` tetap menjalankan API dan website dalam satu pengelola. API memakai Node `--watch` agar perubahan modul dimuat ulang tanpa menghidupkan jendela layanan kedua. Tunnel Cloudflare berdiri terpisah; restart API tidak mengganti URL tunnel selama proses tunnel tetap berjalan.
