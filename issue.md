# Issue: Penyiapan Lingkungan Runtime & Eksekusi Web

## 1. Deskripsi Masalah
Perintah `php artisan serve` menghasilkan error:
```
Fatal error: Uncaught Error: Failed opening required '.../vendor/autoload.php' in ...\artisan:10
```

## 2. Akar Masalah (Root Cause)
1. Berkas `vendor/autoload.php` belum ada karena dependensi PHP (`vendor/`) belum diinstal via `composer install`.
2. Proyek ini mensyaratkan `PHP ^8.3` (Laravel 13), sedangkan versi PHP aktif saat ini di Laragon adalah `8.2.30` (`C:\laragon\bin\php\php-8.2.30-Win32-vs16-x64`).

## 3. Opsi Solusi

### Opsi A (Solusi Sederhana / Cepat - Mode Demo Frontend)
Menjalankan mode demo mandiri berbasis React + Vite yang tidak membutuhkan runtime PHP / Composer:
- Perintah: `npm run demo`
- Akses: `http://localhost:5173`
- Status: Siap dijalankan langsung.

### Opsi B (Solusi Lengkap / Skalabel - Full-Stack Laravel)
Menyiapkan PHP 8.3 di Laragon dan memasang dependensi:
1. Pasang binary PHP 8.3+ di `C:\laragon\bin\php\`.
2. Ganti versi aktif PHP di Laragon ke versi 8.3+.
3. Buat file `.env` dari `.env.example`.
4. Jalankan `composer install`.
5. Jalankan `php artisan key:generate`.
6. Konfigurasi database dan jalankan `php artisan migrate`.
7. Jalankan `php artisan serve` dan `npm run dev`.

## 4. Pertanyaan / Konfirmasi untuk Pengguna
- Apakah ingin fokus menjalankan antarmuka web saat ini via Mode Demo (`npm run demo`), atau ingin memandu instalasi PHP 8.3 di Laragon untuk backend penuh?
