# Menjalankan SIMPATIK di jaringan lokal

Panduan ini menyiapkan satu PC sebagai host website React dan REST API untuk
tablet pada Wi-Fi/hotspot yang sama. Website memakai proxy Vite menuju API di
PC; aplikasi Android menemukan API lokal melalui UDP discovery. Database tetap
mengikuti `DATABASE_URL` yang dipasang pada host—misalnya PostgreSQL Supabase.

## Persiapan PC host

Pastikan PC punya Git, Node.js **24 atau lebih baru**, npm, dan akses ke database
yang dipakai aplikasi. Clone branch `development`:

```powershell
git clone --branch development https://github.com/khairuonwork/kkn_posyandu_tulip.git
Set-Location .\kkn_posyandu_tulip
npm --prefix server ci
npm --prefix client ci
```

Buat `server/.env` secara lokal. Untuk database Supabase, jalankan helper dan
masukkan password database saat diminta (input disembunyikan):

```powershell
& ".\server\setup-supabase-env.ps1"
```

Jangan commit atau mengirim `server/.env`. Pastikan `DATABASE_URL` menunjuk ke
database yang memang akan digunakan. Jangan jalankan migrasi terhadap database
live hanya untuk menyalakan server; migrasi hanya dilakukan ketika ada perubahan
skema yang sudah ditinjau.

## Jalankan untuk PC dan tablet

Hubungkan PC dan tablet ke Wi-Fi/hotspot yang sama, dan pastikan fitur AP/client
isolation pada router tidak memblokir komunikasi antarperangkat. Dari akar repo:

```powershell
.\mulai-qa-lan.ps1
```

Skrip mencetak URL website, API, dan pemeriksaan kesehatan berdasarkan IP PC.
Buka URL website yang dicetak di perangkat pada jaringan yang sama. Di Android,
tekan **Cari server lokal** bila belum tersambung; URL API yang ditemukan akan
disimpan di aplikasi.

Izinkan trafik masuk pada jaringan privat untuk port berikut bila Windows
Firewall meminta izin atau koneksi dari perangkat lain gagal:

- TCP `5173` — website React/Vite.
- TCP `4321` — REST API.
- UDP `43210` — penemuan server otomatis oleh Android.

> **Catatan keamanan:** gunakan mode LAN hanya di jaringan privat yang dipercaya.
> Skrip ini membuka layanan dev ke perangkat satu jaringan dan bukan pengganti
> hosting HTTPS untuk penggunaan publik.

Untuk menghentikan proses yang dibuat skrip tersebut:

```powershell
.\hentikan-qa-lan.ps1
```

Jika hanya perlu menguji aplikasi Android, API tetap harus hidup. Android
menyimpan catatan lokal saat offline, tetapi sinkronisasi ke server/database
memerlukan koneksi ke API host.
