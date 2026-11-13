# Fitur

| | |
|---|---|
| **Jenis** | Orientasi |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 13 November 2026 |

Seluruh kemampuan SIMPATIK Posyandu beserta keadaannya hari ini. Untuk tahu **apa yang sudah bisa dipakai**, baca tabel pertama saja.

Urutan pengerjaan yang berlaku ada di [Rencana kerja](rencana-kerja.md). Perilaku rinci tiap fitur ada di [PRD](prd/README.md). Arsitektur teknis dan kontrak lengkap ada di [Handover Arsitektur](arsitektur-sistem-handover.md) dan [Kontrak REST API](SIMPATIK_Posyandu_REST_API_Contract.md).

---

## Keadaan hari ini

| Kemampuan | Keadaan |
|---|---|
| Perhitungan status gizi enam indeks (WHO LMS) | **Berjalan dan terbukti** — setara perhitungan acuan sampai 4,4 × 10⁻¹⁵ pada 2.076 kasus uji |
| Perhitungan umur, skema basis data, aturan integritasnya | **Berjalan** — PostgreSQL 16/17, migrasi hingga 030, advisory lock transaksi |
| Login, peran RBAC (Kader, Bidan, Admin, Petugas KMS, Superadmin) | **Berjalan** — ditegakkan server, termasuk pembatasan RT kader, hak antrean KMS, dan cakupan superadmin |
| Kelola akun di Pengaturan › Pengguna dan peran | **Berjalan** — tersimpan ke basis data lewat `/api/pengguna`, khusus admin/superadmin, tercatat di audit |
| Sepuluh layar web modular: Beranda, Data Balita, Detail Balita, Detail riwayat, Pemeriksaan KMS, Kartu Balita, Laporan, Sasaran & Impor, Pengaturan, Sesi Pelatihan | **Berjalan dan tersambung live ke PostgreSQL** — React 19 modular; Beranda memuat filter RT dan Real D/S; Detail memuat grafik pertumbuhan kurva KIA, kelompok Desil, KB Ibu, dan panduan KIA; Laporan memuat rekap live dan ekspor F1; Sesi Pelatihan memuat sandbox terisolasi |
| Kartu balita ber-QR dan pemindaiannya | **Berjalan** — kartu dibuat/cetak dari Portal dan QR dipindai langsung dari aplikasi Android ([format](arsitektur.md#kartu-balita)) |
| Sinkronisasi tablet dan transaksi pengukuran | **Berjalan** — transaksi atomik (ukur + sasaran + gizi), advisory lock transaksi, batch insert penilaian, idempotensi kiriman relai offline-first |
| Antrean dan pemanggilan KMS | Antrean setelah check-in, pemanggilan menurut meja dan suara ruang tunggu; lihat [panduan antrean KMS](panduan-antrean-kms.md). Versi demo menyediakan tata letak dan kontrol simulasi tersendiri. |
| Mode Pelatihan Sandbox (Dual-Schema) | **Berjalan** — skema terisolasi `latihan_<uuid>` untuk latihan kader tanpa risiko mencemari atau menghapus data riil produksi |
| Pencatatan riwayat perubahan (audit) | **Berjalan** — trigger sembilan tabel (`anak`, `orang_tua`, `pengukuran`, `layanan`, `periode`, `wilayah_rt`, `pengguna`, `cakupan_hari_h`, `pelatihan_sesi`) |
| Pemasukan data arsip Excel & Sasaran Live | **Berjalan** — impor historis Juli–Agustus 2026 dan modul in-app pratinjau/penerbitan sasaran langsung di web |
| Ekspor Blangko Resmi F1 Gizi & Buku 7 | **Berjalan** — ekspor file Excel 22 butir blangko F1 dan rekap Buku 7 per RT langsung dari web |

---

## Modul MVP

Tabel ini memetakan kemampuan inti dan perluasan yang diusulkan. Judul modul tidak menetapkan persetujuan atau target rilis; keduanya ada di [PRD utama bagian 13](prd/prd-utama.md#13-status-lingkup).

| Modul | Isi |
|---|---|
| **M1 — Master data** | CRUD anak, orang tua, dan wilayah RT. Pencarian berdasarkan nama, NIK, atau RT. Koreksi ejaan nama. Penandaan kandidat duplikat. |
| **M2 — Profil anak dan KMS** | Halaman detail anak: riwayat pengukuran dengan kolom z-score per indeks, kurva pertumbuhan dengan garis SD sebagai latar, riwayat layanan, form koreksi pengukuran. |
| **M3 — Status gizi** | Perhitungan otomatis z-score dan kategori untuk BB/U, TB/U, BB/TB, IMT/U, LILA/U, dan LIKA/U dengan metode WHO LMS. |
| **M4 — Dashboard** | Ringkasan periode berjalan: sasaran dan kehadiran (D/S), sebaran status gizi, tren stunting per RT dan periode, daftar anak yang perlu tindak lanjut. |
| **M5 — Periode dan rekap** | Pengelolaan periode kegiatan bulanan. Rekap per RT dan periode dengan kolom z-score. Export CSV/Excel. |
| **M6 — Layanan** | Pencatatan dan tampilan imunisasi, Vitamin A, dan obat cacing pada profil anak. |
| **M7 — Impor arsip** | Perintah impor untuk memuat arsip 2025–2026, lengkap dengan laporan konflik dan mode uji-coba. Rancangannya di [`rujukan/migrasi-data.md`](rujukan/migrasi-data.md); perintahnya belum ada di stack baru. |
| **M8 — Akun dan peran** | Autentikasi, pengelolaan akun kader, penetapan peran. Mesinnya sudah berdiri di [`server/src/auth/`](../server/src/auth) — kata sandi di-*hash* scrypt, sesi tersimpan di basis data dan dapat dicabut seketika, matriks peran ditegakkan server. Layar pengelolaannya, Pengaturan › Pengguna dan peran, tersambung ke basis data sejak 28 September 2026. Wajib ganti kata sandi awal saat pertama masuk belum ada. |
| **M9 — Komunikasi orang tua** | Nomor WhatsApp orang tua pada profil. Kartu edukasi dan anjuran rujukan yang menyesuaikan hasil ukur anak. Penyusun pesan hasil pengukuran yang dapat langsung diteruskan ke WhatsApp orang tua. |
| **M10 — Skrining dan validasi meja** | Peringatan angka tidak wajar di aplikasi Android saat kader mengetik, dibandingkan terhadap pengukuran bulan sebelumnya. Skrining kelengkapan identitas saat pendaftaran. Status pertumbuhan N/T/O/B. |
| **M11 — Aksesibilitas kader** | Mode tampilan teks besar. Lembar cetak A4 sebagai bukti fisik kegiatan. |

M9–M11 berasal dari feedback lapangan, bukan dari analisis arsip seperti M1–M8. Ketiganya menjawab keluhan yang sama dari arah berbeda: **data yang benar di layar tidak berarti apa-apa kalau tidak sampai ke orang tua, tidak tertangkap saat salah ketik, dan tidak punya wujud di atas kertas.**

## Status Pengembangan Fitur

Diurutkan menurut penomoran historis:

1. **Export F1 Gizi dan Buku 7** — **SELESAI (Oktober 2026)**. Format resmi Excel 22 butir F1 Gizi dan rekap Buku 7 didukung endpoint `/api/laporan/f1/ekspor` dan migrasi 023.
2. **Aturan tindak lanjut otomatis 1T/2T/3T** — **SELESAI (Oktober 2026)**. Indikator 2T+ dan vonis pertumbuhan dihitung otomatis, ditampilkan di kartu "Perlu Perhatian" Beranda dan tabel laporan riwayat 2T+.
3. **Aplikasi Tablet & Aliran Data** — **SELESAI (Oktober 2026)**. Integrasi offline-first REST API Android APK v1.6 ke `/api/v1/pengukuran/sync` dengan idempotensi, deduplikasi, dan transaksi atomik.
4. **Kartu barcode/QR per anak** — **SELESAI (Oktober 2026)**. Cetak kartu A4 (8 kartu/lembar) di Portal (`#/kartu-sasaran`) dengan barcode `SPT-<id>`, dipindai langsung oleh kamera tablet Android.
5. **Modul impor in-app** — **SELESAI (Oktober 2026)**. Modul Sasaran & Impor (`#/sasaran`) membaca berkas Excel Posyandu/Puskesmas langsung di browser, verifikasi konflik NIK/nama/usia, staging pratinjau, dan penerbitan sasaran live.
6. **KPSP dan deteksi dini tumbuh kembang** — **SEBAGIAN SELESAI**. Survei perkembangan KIA sudah didukung skema migrasi 017 dan form penilaian.
7. **Mode Pelatihan Sandbox** — **SELESAI (Oktober 2026)**. Menu khusus superadmin (`#/pelatihan`) untuk latihan simulasi kader dengan isolasi skema PostgreSQL terpisah (`latihan_<uuid>`).
8. **Portal orang tua** — **Fase Berikutnya**. Membutuhkan perumusan kebijakan privasi, persetujuan orang tua (*consent*), dan integrasi WhatsApp Business API mandiri.

---

## Fitur dari feedback lapangan

Pihak Posyandu mencoba Portal dan mengusulkan perluasan pada komunikasi ke orang tua, pencegahan salah input di meja, dan bukti fisik cetak — itulah modul M9, M10, dan M11 di atas.

Ketiga belas fiturnya punya PRD masing-masing di [`prd/feedback/`](prd/feedback/README.md), lengkap dengan urutan, ketergantungan, dan mana yang masih tertahan pertanyaan terbuka.

Persetujuan dan target rilis ketiga belas fitur hanya dipelihara di [PRD utama bagian 13](prd/prd-utama.md#13-status-lingkup). Perbedaan antara input lapangan dan koreksi di Portal dicatat di [OI-20](pertanyaan-terbuka.md#oi-20--input-lapangan-dan-hak-kader-di-portal).
