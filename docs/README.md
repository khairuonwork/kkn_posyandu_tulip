# Dokumentasi SIMPATIK Posyandu

| | |
|---|---|
| **Jenis** | Orientasi — peta dokumentasi |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 29 September 2026 |

**SIMPATIK Posyandu** — sistem pencatatan, pemantauan, dan pelaporan status gizi balita Posyandu Tulip RW 18, Kelurahan Citeureup. Dokumen yang lebih lama menyebutnya Portal Posyandu Tulip, atau cukup Portal.

Halaman ini memberi tahu **mana yang perlu dibaca dan mana yang tidak**.

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

---

## Sedang mengerjakan sesuatu?

| Berkas | Untuk apa |
|---|---|
| **[Rencana kerja](rencana-kerja.md)** | Apa yang dikerjakan berikutnya, urutannya, dan apa yang menahannya |
| **[Pertanyaan terbuka](pertanyaan-terbuka.md)** | Hal yang belum diputuskan pemilik program. **Jangan ditebak diam-diam di dalam kode** |
| **[PRD](prd/README.md)** | Apa yang akan dibangun: kontrak produk, fitur dasar, fitur dari feedback |
| **[Status lingkup](prd/prd-utama.md#13-status-lingkup)** | Persetujuan dan target rilis; dibaca terpisah dari prioritas dan status pengerjaan |
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

Berkas di [`riwayat/`](riwayat) bertanda status `beku`: isinya sudah tidak diperbarui, dan sebagian menyebut hal yang sekarang tidak ada lagi. Dibuka kalau kamu perlu menelusuri asal-usul sebuah keputusan.

- [Catatan tahap demo](riwayat/catatan-tahap-demo.md) — catatan pengerjaan demo frontend, beserta keputusan yang waktu itu ditunda
- [Teks yang dicabut dari layar](riwayat/teks-dicabut-dari-layar.md) — kalimat, tombol, dan kartu yang dihapus atas permintaan pemilik produk, beserta risiko yang ditinggalkannya
- [PRD demo frontend](riwayat/layar-demo.md) — rancangan layar tahap demo, sebelum mockup 26 September 2026. Bagian yang masih berlaku sudah dipindah ke dokumen aktif
- [Rencana struktur halaman](riwayat/rencana-struktur-halaman.md) — susunan menu dan halaman yang direncanakan sebelum kesembilan layar dibangun
- [Pertanyaan yang sudah terjawab](riwayat/pertanyaan-terjawab.md) — isu dari Pertanyaan terbuka yang sudah selesai
- [Backlog feedback](riwayat/backlog-feedback.md) — daftar tugas awal dari feedback lapangan, sebelum dipecah menjadi PRD F01–F13

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
