# Dokumentasi SIMPATIK Posyandu

| | |
|---|---|
| **Jenis** | Orientasi — peta dokumentasi |
| **Status** | Final Approved / v2.1-Modular |
| **Perubahan berarti terakhir** | 1 November 2026 |

**SIMPATIK Posyandu** — sistem pencatatan, pemantauan, dan pelaporan status gizi balita Posyandu Tulip RW 18, Kelurahan Citeureup.

Halaman ini memberi tahu **mana yang perlu dibaca dan mana yang tidak**.

---

## 📌 Dokumen Handover & Spesifikasi Resmi (State-of-the-Art)

Tiga dokumen resmi berikut adalah acuan paling mutakhir (Final Handover 1 November 2026) yang mencakup seluruh arsitektur sistem, kontrak antarmuka API, dan arsitektur modular frontend:

| Dokumen | Format Dokumen | Menjawab & Menjelaskan |
|---|---|---|
| **[Handover Arsitektur Sistem](arsitektur-sistem-handover.md)** | [Markdown](arsitektur-sistem-handover.md) · **[PDF Resmi](SIMPATIK_Posyandu_System_Architecture_Handover.pdf)** | Topologi offline LAN & cloud, arsitektur monorepo, 8 bab spesifikasi, ERD, sequence alur ukur ke KMS, RBAC, dan systemd runbook. |
| **[Spesifikasi Kontrak REST API](SIMPATIK_Posyandu_REST_API_Contract.md)** | [Markdown](SIMPATIK_Posyandu_REST_API_Contract.md) · **[PDF Resmi](SIMPATIK_Posyandu_REST_API_Contract.pdf)** | Katalog lengkap 48 endpoint REST API (11 domain), dual-auth (cookie vs bearer), body payload, response code, dan origin mapping. |
| **[Spesifikasi Komponen Web & Frontend](SIMPATIK_Posyandu_Web_Components.md)** | [Markdown](SIMPATIK_Posyandu_Web_Components.md) · **[PDF Resmi](SIMPATIK_Posyandu_Web_Components.pdf)** | Katalog komponen React 19 modular, hierarki sub-komponen (`anak/`, `sasaran/`, `pengaturan/`), router hash, dan data fetching map. |

---

## Baru pertama kali?

Buka **[Mulai di sini](mulai-di-sini.md)** lebih dulu: aplikasi ini apa, peta sembilan layar beserta tangkapan layarnya, siapa penggunanya, dan apa yang dibaca berikutnya.

Setelah itu empat berkas ini. Sekitar dua puluh menit, dan cukup untuk memahami produknya tanpa bertanya.

| Urutan | Berkas | Menjawab |
|---|---|---|
| 1 | **[Ringkasan](ringkasan.md)** | Aplikasi ini apa, untuk siapa, masalah apa yang dipecahkannya |
| 2 | **[Fitur](fitur.md)** | Apa yang sudah berjalan hari ini, dan apa yang belum |
| 3 | **[Arsitektur](arsitektur.md)** | Teknologinya apa, permintaan mengalir ke mana, berkas ditaruh di mana |
| 4 | **[Basis Data](database.md)** | Tabelnya apa saja dan bagaimana saling terhubung |

Bertemu istilah asing — SKDN, KBM, NTOB, D/S? Semuanya ada di **[Glosarium](glosarium.md)**.

Cara menjalankan aplikasinya ada di [`README.md`](../README.md) di akar repo.

Tim yang menerima pengelolaan host/API dapat mulai dari [Panduan serah-terima server](panduan-serah-terima-server.md), lalu [Panduan menjalankan server LAN](menjalankan-server-lan.md) untuk prosedur koneksi lokal.

---

## Sedang mengerjakan sesuatu?

| Berkas | Untuk apa |
|---|---|
| **[Rencana kerja](rencana-kerja.md)** | Apa yang dikerjakan berikutnya, urutannya, dan apa yang menahannya |
| **[Pertanyaan terbuka](pertanyaan-terbuka.md)** | Hal yang belum diputuskan pemilik program. **Jangan ditebak diam-diam di dalam kode** |
| **[PRD](prd/README.md)** | Apa yang akan dibangun: kontrak produk, fitur dasar, fitur dari feedback |
| **[Status lingkup](prd/prd-utama.md#13-status-lingkup)** | Persetujuan dan target rilis; dibaca terpisah dari prioritas dan status pengerjaan |
| **[Panduan Kirim ke WhatsApp](panduan-kirim-whatsapp.md)** | Menyiapkan tombol kirim hasil dan tautan Lembar Hasil: kunci, alamat, nomor uji, dan cara mengecek |
| **[Panduan penulisan](panduan-penulisan.md)** | Cara menulis dokumen di repo ini. Baca sebelum menambah atau menyunting apa pun di sini |

---

## Dibuka saat butuh angka pasti

Isi [`rujukan/`](rujukan) tidak untuk dibaca berurutan. Dibuka saat ada pertanyaan yang jawabannya harus persis.

| Berkas | Jawabannya |
|---|---|
| [Antropometri & Z-Score](rujukan/antropometri.md) | Rumus LMS, ambang PMK 2/2020, koreksi ekstrem WHO |
| [UI/UX](rujukan/ui-ux.md) | Token warna, tipografi, komponen, aksesibilitas |
| [Data contoh](rujukan/data-contoh.md) | Asal data yang tampil di layar dan cara anonimisasinya |
| [Migrasi data](rujukan/migrasi-data.md) | Aturan impor arsip Excel: normalisasi, pencocokan, konflik |
| [Format laporan F1](rujukan/format-laporan-f1.md) | 22 butir blangko F1 Gizi dan struktur Buku 7 |
| [SRS](rujukan/srs.md) | Kebutuhan fungsional FR-nn dan non-fungsional NFR-nn |

---

## Keputusan arsitektur

Satu berkas untuk satu keputusan yang **mahal kalau dibalik** — bukan cara kerja sistem, melainkan kenapa jalan A dipilih dan jalan B tidak. Tidak pernah dihapus; yang sudah tidak berlaku ditandai *Superseded*.

| ADR | Judul | Status |
|---|---|---|
| [0001](adr/0001-primary-key-strategy.md) | Surrogate ID sebagai primary key, NIK sebagai natural key | Accepted |
| [0002](adr/0002-metode-z-score-who-lms.md) | Z-score dihitung dengan metode WHO LMS | Accepted |
| [0003](adr/0003-batas-portal-vs-aplikasi-tablet.md) | Batas tanggung jawab Portal dan Aplikasi Tablet | Accepted |
| [0004](adr/0004-reuse-team-sebagai-rbac.md) | Reuse tabel `teams`/`Membership` sebagai RBAC single-tenant | Superseded oleh 0006 |
| [0005](adr/0005-migrasi-metode-zscore.md) | Perlakuan riwayat gizi saat metode perhitungan berganti | Accepted |
| [0006](adr/0006-pindah-ke-express-react-postgres.md) | Pindah ke Express + React + PostgreSQL dengan REST API | Accepted |
| [0007](adr/0007-jejak-audit-lewat-trigger.md) | Jejak audit ditegakkan trigger, identitas pelaku lewat variabel sesi | Accepted |

---

## Jarang perlu dibuka

Berkas di [`riwayat/`](riwayat) bertanda status `beku`: isinya adalah catatan historis, log insiden/deployment yang sudah selesai, atau desain lama yang sudah digantikan. Dibuka kalau kamu perlu menelusuri asal-usul sebuah keputusan.

- [Catatan tahap demo](riwayat/catatan-tahap-demo.md) — catatan pengerjaan demo frontend, beserta keputusan yang waktu itu ditunda
- [Teks yang dicabut dari layar](riwayat/teks-dicabut-dari-layar.md) — kalimat, tombol, dan kartu yang dihapus atas permintaan pemilik produk, beserta risiko yang ditinggalkannya
- [PRD demo frontend](riwayat/layar-demo.md) — rancangan layar tahap demo, sebelum mockup 26 September 2026. Bagian yang masih berlaku sudah dipindah ke dokumen aktif
- [Rencana struktur halaman](riwayat/rencana-struktur-halaman.md) — susunan menu dan halaman yang direncanakan sebelum kesembilan layar dibangun
- [Pertanyaan yang sudah terjawab](riwayat/pertanyaan-terjawab.md) — isu dari Pertanyaan terbuka yang sudah selesai
- [Backlog feedback](riwayat/backlog-feedback.md) — daftar tugas awal dari feedback lapangan, sebelum dipecah menjadi PRD F01–F13
- [Log Deployment VM (23 Okt 2026)](riwayat/deployment-vm-2026-10-23.md) — log pemindahan server web/API ke Ubuntu VM dan Cloudflare Quick Tunnel
- [Log Tindak Lanjut Masukan Bu Sri (30 Okt 2026)](riwayat/tindak-lanjut-bu-sri-2026-10-30.md) — catatan verifikasi 17 masukan lapangan Bu Sri (D/S hari H, KB Ibu, Desil)
- [Log Pemulihan API (31 Okt 2026)](riwayat/pemulihan-api-2026-10-31.md) — penanganan galat koneksi idle pg.Pool EHOSTUNREACH dan systemd user service

Folder [`design/`](design/README.md) berisi salinan artboard prototipe. Nilai token warna dan tipografi yang berlaku ada di [UI/UX](rujukan/ui-ux.md), bukan di berkas-berkas itu.

---

## Susunannya

```text
docs/
  mulai-di-sini                                            ← halaman pertama
  ringkasan · fitur · arsitektur · database · glosarium    ← baca ini dulu
  rencana-kerja · pertanyaan-terbuka · panduan-penulisan   ← saat mengerjakan
  prd/        format-prd · prd-utama · dasar/ · feedback/  ← apa yang akan dibangun
  rujukan/    dibuka saat butuh angka pasti
  riwayat/    beku
  adr/        keputusan yang mahal dibalik
  design/     salinan artboard
  gambar/     tangkapan layar untuk Mulai di sini
```
