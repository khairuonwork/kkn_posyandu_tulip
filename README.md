# SIMPATIK Posyandu

Pembaruan 21 Oktober 2026: daftar perangkat memakai heartbeat bertoken yang tersimpan di PostgreSQL. Perangkat offline tetap tercatat; akun operasional melihat Posyandunya sendiri dan super admin melihat semua Posyandu. Panduan dan hasil uji ada di [status perangkat per Posyandu](docs/status-perangkat-posyandu.md). Migrasi baru: `022_status_perangkat_posyandu.sql`.

| | |
|---|---|
| **Jenis** | Panduan — pengembangan lokal |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 1 Oktober 2026 |

Sistem pencatatan, pemantauan, dan pelaporan status gizi balita Posyandu Tulip RW 18, Kelurahan Citeureup. Baru bergabung? Mulai dari [docs/mulai-di-sini.md](docs/mulai-di-sini.md): aplikasi ini apa, peta layarnya, dan apa yang dibaca berikutnya. Dokumentasi lengkap ada di [docs/](docs/README.md).

| Folder | Isi |
|---|---|
| [`server/`](server/) | API dan perhitungan gizi: Node, TypeScript, PostgreSQL |
| [`client/`](client/) | Antarmuka: React, Tailwind |
| [`docs/`](docs/README.md) | Dokumentasi produk dan teknis |
| [`archive-fitur/`](archive-fitur/) | Fitur web yang dinonaktifkan tetapi disimpan agar dapat dipulihkan |

`server/` dan `client/` masing-masing punya `package.json` sendiri; di akar repo tidak ada.

## Prasyarat

- Node.js 24 atau lebih baru.
- Docker yang sedang berjalan, untuk PostgreSQL lokal. Bila memakai PostgreSQL sendiri, cukup isi `DATABASE_URL` di `server/.env`.

## Pemasangan

Cukup sekali. Perintah berikut berlaku di Bash maupun PowerShell:

```bash
git clone https://github.com/khairuonwork/kkn_posyandu_tulip.git
cd kkn_posyandu_tulip
npm --prefix server ci
npm --prefix client ci
cd server
cp .env.example .env
docker compose up -d --wait
npm run migrate
npm run seed
```

`migrate` membuat tabel, `seed` mengisi tabel standar WHO. Keduanya aman diulang.

### Supabase produksi

Proyek produksi memakai PostgreSQL Supabase. Pada Windows, buat `server/.env`
tanpa menampilkan kata sandi di terminal:

```powershell
node scripts\buat-env-supabase.cjs
```

Masukkan **Database Password** proyek ketika diminta, lalu jalankan dari folder
`server/`:

```powershell
node --experimental-strip-types --env-file=.env db/migrate.ts
node --experimental-strip-types --env-file=.env db/seed-standar-lms.ts
node --experimental-strip-types --env-file=.env db/verify-supabase.ts
```

Migrasi `007_api_tablet_supabase.sql` menyediakan view baca dan RPC atomik untuk
Android. RLS mewajibkan sesi Supabase Auth; publishable key boleh berada di APK,
sedangkan secret key dan Database Password tidak boleh masuk repository.

Lalu isi wilayah (Posyandu Tulip, RT 01–07) dan akun contoh. Pilih sendiri kata sandinya, minimal 8 karakter, dan jalankan dari `server/`:

```bash
# Bash, termasuk Git Bash
SANDI='kata-sandi-anda' npm run seed:contoh
```

```powershell
# PowerShell
$env:SANDI = 'kata-sandi-anda'; npm run seed:contoh; Remove-Item Env:SANDI
```

Semua akun berikut memakai kata sandi tadi:

| Nama pengguna | Peran |
|---|---|
| `admin` | Admin |
| `bidan` | Bidan |
| `kader01` … `kader07` | Kader RT 01–07 |
| `kader02.lama` | Kader nonaktif, untuk mencoba penolakan masuk |

Perintah ini hanya mau berjalan pada database lokal. Akun yang sudah ada dilewati, dan kata sandinya tidak diubah.

## Menjalankan

Dua terminal, keduanya dari akar repo:

```bash
# Terminal 1 — API
cd server
npm run db:up
npm run dev
```

```bash
# Terminal 2 — antarmuka
cd client
npm run dev
```

Buka http://localhost:5173 dan masuk, misalnya sebagai `admin`.

### Jalankan website dan tablet lokal

Untuk uji website dan tablet sebelum hosting tersedia, jalankan dari akar repo:

```powershell
.\mulai-server.bat
```

Atau klik dua kali [`mulai-server.bat`](mulai-server.bat) di Windows. File ini
memeriksa Node.js, konfigurasi `.env`, dan dependensi terlebih dahulu, lalu
menampilkan URL yang dapat dibuka dari tablet di jaringan yang sama.

Skrip mendeteksi IPv4 PC, membuka React dan REST API pada jaringan lokal, lalu
memeriksa jalur API sampai PostgreSQL. Gunakan alamat yang dicetak untuk membuka
website dari perangkat lain pada Wi-Fi yang sama.

Panduan menyiapkan PC baru dari clone, termasuk dependensi, konfigurasi database,
firewall, dan cara menjalankan/berhenti ada di
[`docs/menjalankan-server-lan.md`](docs/menjalankan-server-lan.md).
Untuk penyerahan pengelolaan API/host ke tim server, gunakan
[`docs/panduan-serah-terima-server.md`](docs/panduan-serah-terima-server.md).

```powershell
.\hentikan-server.bat
```

Untuk QA lokal, Android dapat menemukan server melalui jaringan Wi-Fi/hotspot
yang sama setelah layanan lokal dijalankan. Hosting publik dan tunnel bukan
bagian dari launcher lokal ini.

Setelah `git pull`, jalankan `npm ci` di folder yang dependensinya berubah, lalu `npm run migrate` dari `server/`.

> Masuk/keluar, daftar akun, Data Balita, Kartu Balita, Sasaran & Impor, dan
> REST API Android sudah tersambung ke database live. Input pengukuran hanya
> tersedia di aplikasi Android; halaman Penimbangan web telah diarsipkan.
> Dashboard, laporan, dan sebagian detail masih memakai data contoh; lihat
> [rencana kerja](docs/rencana-kerja.md).

### Kirim ke WhatsApp dan Lembar Hasil

Tombol **Kirim ke WhatsApp** di Detail Balita membutuhkan satu kunci di
`server/.env` (`LEMBAR_RAHASIA`) dan, untuk pengujian, dua isian di
`client/.env.local`. Langkahnya ada di
[panduan Kirim ke WhatsApp](docs/panduan-kirim-whatsapp.md).

### Data balita dan sasaran bulanan

`anak` adalah data induk: halaman **Data Balita** dan **Kartu Balita** selalu
membaca semua anak aktif, sehingga pergantian periode tidak menghapus profil,
kartu, maupun riwayat. Setiap anak otomatis memiliki payload QR kartu dari ID
anaknya.

`sasaran` adalah daftar kerja per periode. Admin mengunggah `.xlsx` Puskesmas di
**Sasaran & Impor**, memeriksa pratinjau per sheet, lalu menerbitkannya. Impor
ulang hanya mengganti keanggotaan sasaran pada periode terpilih. Aplikasi Android
membaca daftar ini melalui `/api/v1/sinkronisasi`. Layanan memiliki tiga tahap:
antrean/pemanggilan, pengukuran, lalu penjelasan KMS. Setelah hasil ukur disimpan,
slot tetap aktif dengan status `kms_review` dan sasaran belum ditandai selesai.
Petugas KMS di website mengonfirmasi setelah penjelasan; barulah antrean dan
sasaran menjadi `done`/`selesai`. **Konfirmasi beres sesi** admin tetap menandai
sasaran yang belum hadir sebagai `tidak_hadir`.

Antrean lintas perangkat dan tahap KMS memerlukan migrasi database `012`–`015`.
Lihat [panduan menjalankan server LAN](docs/menjalankan-server-lan.md) sebelum
menerapkan migrasi ke database yang dipakai.

Endpoint terkait:

- `GET /api/v1/sasaran` — daftar dan ringkasan sasaran aktif.
- `POST /api/v1/sasaran/pratinjau` — membaca sheet Excel tanpa menulis data.
- `POST /api/v1/sasaran/impor` — mengganti sasaran periode secara transaksional.
- `POST /api/v1/sasaran/tutup-sesi` — menutup sisa sasaran sesuai cakupan RT akun.

### Demo tanpa database

```bash
npm --prefix client ci
npm --prefix client run demo
```

Demo memakai data contoh, tanpa API maupun database. Peran dipilih di layar Masuk dan kata sandi tidak diperiksa.

## Mengelola akun

Admin mengelola akun dari **Pengaturan › Pengguna dan peran**: menambah akun, mengubah peran dan RT, mengganti kata sandi, dan menonaktifkan akun.

Lewat terminal dari `server/`, untuk admin pertama di server baru atau bila tidak ada admin yang bisa masuk (contoh Bash; di PowerShell, setel `$env:SANDI` seperti di atas):

```bash
SANDI='kata-sandi' npm run pengguna:buat -- "Nama Lengkap" namapengguna admin
SANDI='kata-sandi-baru' npm run pengguna:sandi -- namapengguna
```

Untuk kader, tambahkan RT binaannya di akhir: `npm run pengguna:buat -- "Kader RT 01" kader01 kader 01`.

## Pemeriksaan

```bash
npm --prefix server test
npm --prefix server run types:check
npm --prefix client test
npm --prefix client run types:check
npm --prefix client run lint:check
npm --prefix client run format:check
```

Tes server yang butuh database memakai `DATABASE_URL` dari `server/.env`, jadi database itu harus sudah dimigrasi. Jangan arahkan ke database produksi. CI menjalankan pemeriksaan yang sama pada setiap pull request.

## Kendala umum

| Gejala | Yang perlu dilakukan |
|---|---|
| Docker tidak bisa dihubungi | Nyalakan Docker Desktop, lalu ulangi `docker compose up -d --wait` dari `server/` |
| Galat `column … does not exist` atau `relation … does not exist` | Jalankan `npm run migrate` dari `server/`, lalu nyalakan ulang API |
| Login gagal padahal kata sandi benar | Pastikan terminal API (`npm run dev` di `server/`) masih menyala |
| `bash: :SANDI: command not found` | Perintah PowerShell dijalankan di Bash; pakai versi Bash |
| Porta 4321 sudah dipakai | Isi `PORT=4322` di `server/.env`, lalu jalankan antarmuka dengan variabel lingkungan `API=http://127.0.0.1:4322` |
| Lupa kata sandi | Minta admin menggantinya di Pengaturan, atau pakai `pengguna:sandi` seperti di atas |

## Deployment VM (23 Oktober 2026)

Web dan REST API disiapkan untuk VM Ubuntu melalui systemd, dengan akses publik HTTPS Cloudflare dan database Supabase yang sama. Lihat [lokasi konfigurasi, operasi, dan batas URL sementara](docs/deployment-vm-2026-10-23.md). Rahasia dan hasil cetak kartu anak tidak ikut Git.

### Revisi ekspor laporan Bu Sri (23 Oktober 2026)

Unduhan Excel memakai N/T/B, warna status konsisten, peringatan internal −1,96 SD, deskripsi LILA usia ≥6 bulan dan umur historis berdasarkan tanggal yang tersedia. [Aturan dan hasil pemeriksaan](docs/format-ekspor-laporan.md#revisi-komentar-bu-sri--23-oktober-2026). Pembaruan ini cukup memperbarui backend VM; APK dan frontend tidak perlu di-build ulang.

Pembaruan sinkronisasi Android 1.12.6: paket REST `/sinkronisasi` mencakup master anak Posyandu termasuk anak baru yang belum menjadi sasaran periode aktif. Ringkasan sasaran tetap menghitung sasaran terdaftar. Diuji dengan skema database terisolasi.
