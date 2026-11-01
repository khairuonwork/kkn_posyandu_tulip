# Backlog Fitur Dasar

| | |
|---|---|
| **Jenis** | Penjelasan |
| **Status** | Final Approved / v2.1-Modular |
| **Perubahan berarti terakhir** | 1 November 2026 |

Daftar pekerjaan untuk menyelesaikan **kebutuhan inti** SIMPATIK Posyandu — kemampuan yang membuat aplikasi ini berfungsi sebagai sistem pencatatan Posyandu.

Seluruh 9 butir backlog kebutuhan inti telah **SELESAI DIKERJAKAN DAN TERUJI** per akhir Oktober 2026. Pengembangan dilanjutkan dengan perapian arsitektur modular (v2.1) dan penyusunan dokumen serah-terima resmi pada 1 November 2026.

---

## Status Backlog Inti

Daftar ringkas status kesembilan backlog:

| No. | Butir Backlog | Status | Keterangan Implementasi |
|---|---|---|---|
| 1 | Menyimpan hasil perhitungan gizi | **SELESAI** (22 Sep 2026) | `hitungDanSimpan` 6 indeks WHO LMS teruji 2.076 kasus acuan |
| 2 | Pencatatan riwayat perubahan (audit) | **SELESAI** (23 Sep 2026) | Trigger audit pada 9 tabel data, capture snapshot JSON tanpa bocor hash sandi |
| 3 | Memasukkan data arsip Excel | **SELESAI** (Oktober 2026) | Impor arsip historis Juli–Agustus 2026 dan modul live in-app di `#/sasaran` |
| 4 | Menyambungkan layar ke basis data | **SELESAI** (Oktober 2026) | Seluruh 10 layar tersambung ke REST API Express & PostgreSQL 16 |
| 5 | Menyimpan perubahan dari layar | **SELESAI** (Oktober 2026) | Mutasi CRUD balita, orang tua, koreksi ukur, dan pengguna via API ber-RBAC |
| 6 | Menangani profil ganda & ejaan nama | **SELESAI** (Oktober 2026) | Normalisasi `nama_baku` dan deteksi kemiripan profil |
| 7 | Mengelola wilayah RT dan periode | **SELESAI** (Oktober 2026) | Manajemen RT 01–07, periode bulanan, dan Real D/S hari H per RT |
| 8 | Mencatat layanan (imunisasi, Vit A, cacing) | **SELESAI** (Oktober 2026) | Tabel `layanan` dan tab riwayat profil anak |
| 9 | Mengunduh rekap ke Excel & F1 resmi | **SELESAI** (Oktober 2026) | Ekspor blangko resmi Excel F1 Gizi 22 butir & Buku 7 per RT via API |

---

## Rincian Hasil Implementasi

### 1. Menyimpan hasil perhitungan gizi — **selesai 22 September 2026**

Sistem menghitung status gizi dengan metode WHO LMS (enam indeks) dan menyimpannya secara atomik dalam satu transaksi database. Rinciannya di [B01](prd/dasar/B01-simpan-hasil-gizi.md).

### 2. Pencatatan riwayat perubahan — **selesai 23 September 2026**

Setiap mutasi pada sembilan tabel operasional dicatat oleh trigger database ke tabel `audit`. Snapshot JSON menyimpan keadaan sebelum dan sesudah perubahan dengan menjaga privasi kata sandi. Rinciannya di [B02](prd/dasar/B02-jejak-audit.md) dan [ADR-0007](adr/0007-jejak-audit-lewat-trigger.md).

### 3. Memasukkan data arsip Excel — **selesai Oktober 2026**

Telah diimplementasikan dua lapis: skrip impor historis CLI untuk data 2025–2026, dan modul in-app di layar `#/sasaran` untuk mengunggah berkas Excel sasaran bulanan dari Puskesmas lengkap dengan validasi konflik dan pratinjau staging.

### 4. Menyambungkan layar ke basis data — **selesai Oktober 2026**

Seluruh 10 layar web tersambung ke PostgreSQL live melalui Express 5 REST API katalog 48 endpoint. Tidak ada lagi data mockup statis dalam operasional.

### 5. Menyimpan perubahan dari layar — **selesai Oktober 2026**

Pembaruan data profil balita, penambahan balita baru, koreksi angka pengukuran, serta manajemen akun pengguna dan peran tersimpan live dengan re-kalkulasi status gizi otomatis.

### 6. Menangani profil ganda — **selesai Oktober 2026**

Dukungan kolom `nama_baku`, aturan natural key NIK vs UUID, serta pencocokan ejaan pada alur impor sasaran mencegah duplikasi data anak.

### 7. Mengelola wilayah RT dan periode kegiatan — **selesai Oktober 2026**

Pilihan periode kegiatan di sidebar, filter per RT pada Beranda dan Laporan, serta pencatatan Real D/S hari H per RT (`cakupan_hari_h`) telah berfungsi penuh.

### 8. Mencatat layanan: imunisasi, Vitamin A, dan obat cacing — **selesai Oktober 2026**

Tercatat di tabel `layanan` dan ditampilkan pada profil anak di Portal, mendukung riwayat imunisasi dan vitamin sesuai standar Puskesmas.

### 9. Mengunduh rekap ke Excel & F1 resmi — **selesai Oktober 2026**

Fitur ekspor laporan disempurnakan dengan generator file Excel blangko resmi F1 Gizi (22 butir blangko puskesmas) serta Buku 7 per RT langsung dari antarmuka `#/laporan`.

---

## Perluasan Handover v2.1 (November 2026)

Menghadapi kebutuhan serah-terima dan skalabilitas sistem:
1. **Refaktor Arsitektur Modular Frontend:** Komponen-komponen monolitik besar (`anak`, `sasaran`, `pengaturan`) dipecah menjadi modul-modul terfokus (SRP) dengan file tipe `tipe.ts` dan sub-folder mandiri di bawah 250 baris per file.
2. **Mode Pelatihan Sandbox (Dual-Schema):** Skema dinamis `latihan_<uuid>` di PostgreSQL untuk simulasi pelatihan kader tanpa memengaruhi data riil.
3. **Dokumentasi Handover Lengkap:** Tiga dokumen spesifikasi resmi ([Handover Arsitektur](arsitektur-sistem-handover.md), [Kontrak REST API](SIMPATIK_Posyandu_REST_API_Contract.md), dan [Komponen Web](SIMPATIK_Posyandu_Web_Components.md)) beserta kompilasi PDF resmi.

---

## Pertanyaan yang belum terjawab

Daftar di bawah menunjukkan pekerjaan yang membutuhkan jawaban lanjutan. Status keputusan dipelihara di [Pertanyaan terbuka](pertanyaan-terbuka.md). Klaim sebelumnya bahwa arti `G`/`NG` sudah dijawab oleh feedback dikoreksi pada 23 September 2026; konfirmasi pengguna dan dampaknya ada di [OI-17](pertanyaan-terbuka.md#oi-17--sumber-data-status-desil-dan-kategori-gakin). Aturan mempertahankan riwayat anak yang lulus atau pindah terpisah dari pertanyaan tersebut; kebijakan retensi menyeluruh tetap mengikuti OI-10.

### Menahan pekerjaan

**1. Berapa kenaikan berat minimal untuk bayi umur tiga bulan?**

Berkas Bidan menuliskan 600 gram; tabel Kemenkes yang umum beredar menyebut 800 gram. Angka ini menentukan vonis naik atau tidak naik untuk setiap bayi berumur tiga bulan.

*Menahan:* status pertumbuhan, dan rekap yang memakainya.

**2. Untuk tinggi badan yang jatuh di antara dua baris tabel, dibaca yang mana?**

Tabel standar berlangkah setengah sentimeter, sedangkan tinggi anak sering di antaranya. Ada dua cara membaca, dan keduanya sedang dipakai: Excel mengambil baris terdekat ke bawah, aplikasi menaksir di antara dua baris. Selisihnya kecil, tetapi cukup memindahkan anak yang tepat berada di garis batas antara satu kategori dan kategori berikutnya.

*Menahan:* kecocokan angka aplikasi dengan Excel saat dibandingkan berdampingan.

**3. Apa label kategori untuk lingkar lengan atas di bawah −2 SD?**

Aplikasi menghitung angkanya tetapi sengaja tidak memberi label, karena label untuk rentang gizi akut tidak boleh ditebak. Data yang ada tidak memuat satu pun kasus di rentang itu, jadi tidak bisa disimpulkan sendiri.

*Menahan:* kelengkapan tampilan enam indeks.

**4. Apakah baris kosong pada kolom pertumbuhan berarti huruf O?**

Di seluruh arsip, huruf O tidak pernah muncul sekali pun. Berkas pertumbuhan memberi petunjuk: anak yang penimbangan sebelumnya absen dikosongkan barisnya, bukan diberi huruf O. Perlu dipastikan sebelum sistem menghitungnya sendiri.

*Menahan:* ketepatan angka O pada rekap.

**5. Dari mana data desil dan status Gakin berasal?**

Status sumber data, pihak yang mengisinya, dan pertanyaan terpisah tentang arti `G`/`NG` dipelihara di [OI-17](pertanyaan-terbuka.md#oi-17--sumber-data-status-desil-dan-kategori-gakin).

*Menahan:* penetapan jalur data F08 dan pemetaan kategori pada laporan F09, sesuai rincian OI-17.

**6. Apakah kelompok desil ditampilkan di F1, atau di laporan terpisah?**

Feedback meminta pemecahan menurut jenis kelamin, Gakin, dan kelompok desil. Struktur blangko yang sudah diperiksa memakai jenis kelamin serta kolom `G`/`NG`, tanpa kolom desil; makna kedua huruf mengikuti [OI-17](pertanyaan-terbuka.md#oi-17--sumber-data-status-desil-dan-kategori-gakin). Penempatan desil tetap memerlukan keputusan bentuk laporan.

*Menahan:* bentuk akhir laporan F1.

### Menahan keputusan lingkup

**7. Apa itu "Atas Garis Oranye"?**

Istilah ini muncul di blangko Buku 7 berdampingan dengan "di bawah garis merah", sebagai lawan dari naik. Tidak ada di aturan Kemenkes maupun di sistem, dan ambangnya belum diketahui.

**8. Apa kepanjangan "Balita Bersinar", dan perlukah dicatat?**

Sudah diketahui bahwa itu daftar hasil kegiatan Bulan Penimbangan Balita, bukan kategori gizi. Yang belum jelas: perlukah keikutsertaannya dicatat per anak, atau cukup dianggap kegiatan tahunan di luar lingkup Portal.

**9. Checklist perkembangan: tampung yang sudah ada, atau buat sendiri?**

Pertanyaan ini berubah bentuk setelah temuan terbaru. Feedback menawarkan pilihan antara checklist ringkas buatan sendiri atau instrumen KPSP lengkap — tetapi ternyata **KPSP sudah dipakai dan hasilnya sudah dicatat** di berkas Bidan.

Jadi pertanyaannya sekarang: cukup menampung hasil KPSP yang sudah ada, atau tetap perlu checklist tersendiri di dalam aplikasi?

**10. Apakah Buku 7 masuk lingkup?**

Format laporan wajib ini ditemukan saat membedah arsip dan belum masuk daftar kebutuhan mana pun — bukan kebutuhan inti, bukan pula fitur feedback. Perlu diputuskan sebelum muncul mendadak di akhir.

**11. Tombol unduh rekap dikembalikan atau tidak?**

Dicabut atas permintaan pemilik produk. Kodenya masih ada dan berfungsi.

### Menahan rilis, bukan pekerjaan sekarang

**12. Di mana sistem ini akan dipasang?**

Belum diputuskan antara server sendiri, layanan hosting, atau layanan awan. Menentukan bentuk pemasangan dan panduan operasionalnya.

**13. Berapa lama data disimpan, dan siapa yang boleh mengekspornya?**

Aturan untuk anak yang lulus atau pindah sudah dijawab feedback dan sudah dibangun. Yang belum: berapa lama data disimpan secara keseluruhan, siapa yang berhak mengunduhnya, dan apa yang terjadi pada data pribadi setelah anak tidak lagi menjadi sasaran.

Harus selesai sebelum sistem menyimpan data sungguhan di server yang dapat diakses dari internet.

---

## Yang sudah bisa kita jawab balik

Dokumen feedback mengajukan lima pertanyaan. Tiga di antaranya kini sudah ada jawabannya, dan sebaiknya ikut dikirim agar percakapannya timbal balik:

1. **Ambang anjuran ke fasilitas kesehatan** — jawaban dan tanggal konfirmasinya ada di [OI-16](riwayat/pertanyaan-terjawab.md#oi-16--ambang-rujukan-ke-faskes-arti-196).
2. **Apakah Posyandu punya format F1 resmi** — ya, ada. Ditemukan di arsip pada 21 September 2026, lengkap 22 butir beserta kodenya. Tercatat di [`rujukan/format-laporan-f1.md`](rujukan/format-laporan-f1.md).
3. **Mode pengembangan** — terjawab oleh keadaan; migrasi teknologi sudah dikerjakan.
