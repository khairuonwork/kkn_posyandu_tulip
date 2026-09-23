# ADR-0003 — Batas tanggung jawab Portal dan Aplikasi Tablet

- **Status:** Accepted, dengan satu bagian **terbuka**
- **Tanggal:** 2026-09-09

> **Catatan 22 September 2026.** Pembagian tanggung jawab Portal dan Aplikasi Tablet **tetap berlaku utuh** — itulah inti ADR ini, dan tidak ada yang berubah. Tiga penyebutan teknologi di dalamnya sudah usang sejak [ADR-0006](0006-pindah-ke-express-react-postgres.md): Portal bukan lagi Laravel + Inertia melainkan Express + React SPA, impornya bukan `php artisan posyandu:import` melainkan skrip di `server/db/` yang **belum dibangun**, dan rumus z-score kini tinggal di `server/src/antropometri/`. Nama teknologinya berubah; batas tanggung jawabnya tidak.

## Konteks

PRD v1.0 memperlakukan produk ini sebagai satu aplikasi utuh, termasuk pencatatan di lokasi Posyandu. Ternyata pemilik program merencanakan **dua** aplikasi:

- **Portal Posyandu Tulip** — produk ini. Laravel + Inertia + React.
- **Aplikasi Tablet Posyandu** — aplikasi pencatatan lapangan, masih berupa prototipe Vue 3 (`Aplikasi Tablet Posyandu.html`) dan belum dibangun.

Perbedaan ini bukan detail: seluruh rancangan halaman, prioritas kinerja, dan bahkan kebutuhan *offline* bergantung padanya. Aplikasi yang dipakai berdiri di tengah antrean sambil memegang tablet tidak dirancang seperti aplikasi yang dipakai duduk di depan laptop.

## Keputusan

| Tanggung jawab | Portal | Aplikasi Tablet |
|---|---|---|
| Master data anak, orang tua, RT | ya | tidak |
| Input pengukuran saat kegiatan | tidak | ya |
| Koreksi pengukuran setelah kegiatan | ya | tidak |
| Perhitungan status gizi | ya | tidak |
| Profil anak dan kurva KMS | ya | riwayat ringkas saja |
| Dashboard dan analitik | ya | tidak |
| Rekap dan export laporan | ya | tidak |
| Pengelolaan akun dan peran | ya | tidak |
| Kemampuan *offline* | tidak | kemungkinan besar ya |
| Pemindaian barcode/QR | tidak | ya |

Portal adalah *system of record*. Perhitungan status gizi hanya ada di Portal supaya tidak ada dua implementasi rumus yang bisa berbeda hasilnya.

## Bagian yang masih terbuka

**Mekanisme aliran data dari Aplikasi Tablet ke Portal belum diputuskan.** Tiga kemungkinan:

| Opsi | Konsekuensi |
|---|---|
| **Basis data bersama** | Paling sederhana bila keduanya dibangun tim yang sama dan berjalan di server yang sama. Tidak ada kontrak API yang perlu dipelihara. |
| **Impor berkala** | Aplikasi Tablet mengekspor file, Portal mengimpornya. Berarti modul impor in-app naik prioritas menjadi jalur data utama. |
| **API sync** | Aplikasi Tablet mengirim data ke *endpoint* Portal. Satu-satunya opsi yang menuntut REST di luar Inertia, plus autentikasi perangkat dan *idempotency*. |

Sampai diputuskan, data model Portal dirancang **netral** terhadap ketiganya:

- Kolom `pengukuran.sumber` mencatat asal setiap rekam (`import`, `manual`, dan nanti `tablet`).
- *Constraint* `unique(anak_id, periode_id)` membuat pengiriman ulang bersifat *idempotent*, apa pun jalurnya.
- Tidak ada logika yang mengasumsikan pengukuran selalu dibuat lewat antarmuka Portal.

Isu ini terdaftar di [`pertanyaan-terbuka.md`](../pertanyaan-terbuka.md).

## Konsekuensi

- MVP Portal **tidak** membangun mode input massal maupun pemindaian barcode. Keduanya milik Aplikasi Tablet.
- Karena Aplikasi Tablet belum ada, **satu-satunya sumber data MVP adalah `php artisan posyandu:import`**. Ini menjadikan modul impor jalur kritis, bukan pelengkap.
- Portal tetap menyediakan form koreksi pengukuran per anak. Tanpa itu, kesalahan input tidak akan pernah bisa diperbaiki.
- Bila nanti kedua aplikasi berbagi basis data, `App\Support\Antropometri` tetap satu-satunya tempat rumus z-score hidup.
