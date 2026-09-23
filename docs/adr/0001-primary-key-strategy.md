# ADR-0001 — Surrogate ID sebagai primary key, NIK sebagai natural key

- **Status:** Accepted
- **Tanggal:** 2026-09-09
- **Menggantikan:** rancangan `ERD_DIGITALISASI_POSYANDU_TULIP.md` v1.0 yang memakai `nik` sebagai PK

> **Catatan 22 September 2026.** Keputusannya **tetap berlaku utuh**; dua rinciannya sudah berubah bentuk sejak [ADR-0006](0006-pindah-ke-express-react-postgres.md). Surrogate key kini `bigint GENERATED ALWAYS AS IDENTITY` PostgreSQL, bukan auto-increment Laravel. Dan *unique index* pada `nik` kini berupa indeks parsial `WHERE deleted_at IS NULL` — perilaku `NULL` yang disebut di bagian Konsekuensi tidak lagi jadi penopangnya.

## Konteks

ERD v1.0 menetapkan `ANAK.nik` dan `ORANG_TUA.nik_ortu` sebagai *primary key*, dengan alasan NIK adalah identitas yang dipakai di lapangan. Namun PRD v1.0 bagian 7 justru mensyaratkan hal sebaliknya: "Kunci primer aplikasi adalah UUID/internal ID; **bukan** nama, nomor urut Excel, atau NIK." Dua dokumen yang sama-sama disetujui saling bertentangan, dan implementasi tidak bisa dimulai sebelum ini diputuskan.

Fakta dari arsip yang sebenarnya, bukan dari asumsi:

| Temuan | Jumlah | Sumber |
|---|---|---|
| Baris tanpa NIK | 8 | `REKAP_DATA_POSYANDU-2025.xlsx` |
| NIK dengan tanggal lahir saling bertentangan antar file | 4 | idem |
| Baris 2026 dengan kolom NIK kosong | ada, mis. baris pertama `REKAP JUNI 2026.xlsx` | `REKAP TAHUN 2026/` |
| Variasi ejaan nama untuk populasi yang sama | 129 nama untuk 124 NIK | `REKAP_DATA_POSYANDU-2025.xlsx` |

NIK juga bukan angka meskipun terlihat seperti angka: 16 digit, boleh berawalan nol, dan sudah terbukti rusak saat Excel memperlakukannya sebagai numerik.

## Keputusan

1. Seluruh tabel domain memakai **surrogate primary key** berupa `id` auto-increment bawaan Laravel.
2. `anak.nik` dan `orang_tua.nik` disimpan sebagai kolom `string`, **`nullable`**, dengan *unique index* yang mengizinkan banyak `NULL`.
3. Relasi antar tabel memakai surrogate ID (`anak_id`, `orang_tua_id`), tidak pernah NIK.
4. NIK tetap menjadi kunci pencocokan utama saat impor dan pencarian — sebagai *natural key*, bukan *primary key*.

## Konsekuensi

**Yang menjadi mungkin:**

- Anak tanpa NIK tetap bisa didaftarkan dan diukur. Dengan NIK sebagai PK, 8 baris arsip itu tidak akan punya tempat.
- NIK yang salah ketik dapat dikoreksi dengan satu `UPDATE` tanpa *cascade* ke tabel pengukuran, penilaian gizi, dan layanan.
- Dua entri yang ternyata anak yang sama dapat digabungkan dengan memindahkan `anak_id`, tanpa menyentuh nilai NIK.

**Yang menjadi tanggung jawab tambahan:**

- Pencocokan identitas saat impor menjadi logika aplikasi, bukan lagi dijamin *constraint* basis data. Aturannya ditetapkan di [`rujukan/migrasi-data.md`](../rujukan/migrasi-data.md).
- *Unique index* pada `nik` tetap wajib supaya dua profil tidak menempati NIK yang sama. Perilaku `NULL` pada *unique index* sudah sesuai di SQLite, MySQL, maupun PostgreSQL: banyak `NULL` diizinkan.

## Alternatif yang ditolak

| Alternatif | Alasan ditolak |
|---|---|
| `nik` sebagai PK (ERD v1.0) | Delapan baris arsip tidak akan bisa masuk. Koreksi NIK memutus seluruh relasi. |
| UUID/ULID sebagai PK | Manfaatnya (penggabungan basis data terdistribusi, ID tak tertebak) tidak relevan untuk satu Posyandu dengan ratusan anak, sementara biayanya nyata: indeks lebih besar dan URL lebih panjang. Bila Aplikasi Tablet nanti membutuhkan ID yang dibuat di sisi klien, kolom ULID tambahan bisa disisipkan tanpa mengganti PK. |
| Nomor urut Excel sebagai PK | Nomor urut diulang setiap bulan dan setiap file. Bukan identitas. |
