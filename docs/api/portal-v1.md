# REST API Portal — v1

REST API ini milik backend website SIMPATIK (`server/`). React web dan aplikasi
Android akan menjadi klien dari kontrak yang sama; Supabase hanya menjadi
PostgreSQL terkelola, bukan API publik yang dipanggil aplikasi.

## Prinsip

- Seluruh resource berada di bawah `/api/v1`; rute `/api/masuk`, `/api/keluar`,
  dan `/api/saya` tetap rute sesi website yang sudah ada.
- Server menegakkan peran dan batas RT. Kader tidak bisa membaca anak di RT
  lain, walaupun URL diketahui.
- JSON selalu memakai envelope yang jelas; galat memakai `{ "galat": "…" }`.
- Hasil hitung gizi dan perubahan pengukuran nanti ditulis oleh server dalam
  transaksi, bukan dipercaya dari hasil hitung klien.

## Endpoint awal

| Metode | Endpoint | Hak minimum | Fungsi |
|---|---|---|---|
| `GET` | `/api/v1/anak?cari=&halaman=1&ukuran=25` | `lihat-anak` | daftar sasaran berpaginasi |
| `GET` | `/api/v1/anak/:id` | `lihat-anak` | profil lengkap seorang anak |
| `GET` | `/api/v1/anak/:id/pengukuran` | `lihat-kms` | riwayat untuk KMS |
| `POST` | `/api/v1/masuk` | publik | login tablet dan menghasilkan token Bearer |
| `POST` | `/api/v1/keluar` | sesi aktif | mencabut token tablet |
| `GET` | `/api/v1/sinkronisasi` | `lihat-anak` | paket sasaran dan pengukuran untuk cache offline |
| `POST` | `/api/v1/anak` | `daftar-anak-lapangan` | upsert pendaftaran berdasarkan NIK |
| `POST` | `/api/v1/pengukuran` | `catat-pengukuran-lapangan` | upsert pengukuran dan hitung gizi server |

Respons daftar berbentuk `{ items, total, halaman, ukuran }`; respons detail
berbentuk `{ anak }`; dan riwayat berbentuk `{ pengukuran }`.

## Tahap berikutnya

1. Endpoint periode, layanan, laporan, dan kartu sasaran.
2. Sinkronisasi bertahap berbasis cursor untuk dataset besar.
3. Rotasi token perangkat dan pencatatan identitas perangkat.

Secret Supabase tidak pernah masuk browser atau APK. Hanya `server/.env` yang
boleh memegang Database URL/kredensial backend.
