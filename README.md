# SIMPATIK Posyandu

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
.\server\setup-supabase-env.ps1
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

### Website dan Android melalui domain ngrok tetap

Alur operasional memakai satu domain HTTPS tetap untuk website dan REST API.
Lakukan konfigurasi sekali saja:

1. Pasang ngrok agent dan salin **development domain** yang diberikan pada
   menu **Gateway › Domains**, misalnya `abc123.ngrok-free.dev`.
2. Salin `.env.ngrok.example` menjadi `.env.ngrok`.
3. Isi `NGROK_AUTHTOKEN` dan `NGROK_DOMAIN` pada berkas tersebut.
4. Pastikan URL yang sama sudah dipasang sebagai `PORTAL_API_BAWAAN` pada
   aplikasi Android, dengan akhiran `/api/v1`.

Setelah itu, pada Windows cukup klik dua kali:

```text
mulai-ngrok.bat
```

File batch membuka Git Bash dan menjalankan seluruh proses secara otomatis.
Alternatif dari Git Bash atau WSL:

```bash
./mulai-ngrok.sh
```

Skrip membangun website, menjalankan website dan REST API pada satu proses,
membuka tunnel ngrok, lalu memeriksa jalur publik sampai database. Biarkan
terminal tetap terbuka. Tekan `Ctrl+C` untuk menghentikan seluruh layanan.
Authtoken disimpan hanya di `.env.ngrok` dan tidak ikut Git.

### QA lokal website tanpa tunnel

Untuk uji website dan tablet sebelum hosting tersedia, jalankan dari akar repo:

```powershell
.\mulai-qa-lan.ps1
```

Skrip mendeteksi IPv4 PC, membuka React dan REST API pada jaringan lokal, lalu
memeriksa jalur API sampai PostgreSQL. Gunakan alamat yang dicetak untuk membuka
website dari perangkat lain pada Wi-Fi yang sama.

```powershell
.\hentikan-qa-lan.ps1
```

Alur Android versi 1.10 ke atas memakai static domain ngrok dan tidak lagi
menampilkan pengaturan IP pada halaman login. Mode LAN ini dipertahankan hanya
untuk pemeriksaan website lokal.

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
membaca daftar ini melalui `/api/v1/sinkronisasi`; hasil ukur mengubah status
menjadi `selesai`, sedangkan **Konfirmasi beres sesi** mengubah sasaran tersisa
menjadi `tidak_hadir`.

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
