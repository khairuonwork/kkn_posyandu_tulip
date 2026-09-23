# 📋 Backlog & Rencana Pengembangan: Posyandu Tulip

Dokumen ini merupakan rekapitulasi modular dari seluruh kebutuhan, fitur baru, validasi, dan penyesuaian alur kerja Posyandu Tulip. Dokumen ini disusun sesuai prinsip **KISS & YAGNI**, menyediakan opsi solusi (Sederhana vs Kompleks), serta memetakan pertanyaan klarifikasi bisnis.

---

## 📌 Ringkasan Eksekutif & Pemetaan Modul

Seluruh kebutuhan dikelompokkan ke dalam **7 Modul Utama**:
1. **Modul 1:** Visualisasi Multi-Grafik Standar WHO & KMS Interaktif
2. **Modul 2:** Validasi Input Cerdas & Evaluasi Tren Pertumbuhan (N/T/O/B)
3. **Modul 3:** Komunikasi & Forwarding WhatsApp Orang Tua
4. **Modul 4:** Instrumen Stimulasi Perkembangan Anak Berbasis Usia
5. **Modul 5:** Pendaftaran Cerdas & Skrining Awal Sasaran
6. **Modul 6:** Rekapitulasi Laporan F1, Data Desil/Gakin, & Bukti Fisik Cetak
7. **Modul 7:** Desain UI/UX Aksesibel & Interaktif (Kader-Friendly)

---

## 🏗️ Rincian Task Modular

### 📈 Modul 1: Visualisasi Multi-Grafik Standar WHO & KMS Interaktif

#### [TASK-1.1] Multi-Grafik Pertumbuhan Standar WHO (BB/U, TB/U, IMT/U, LiLA/U, LiKA/U)
- **Deskripsi:** Menambahkan visualisasi grafik pertumbuhan lengkap berbasis standar WHO (LMS) selain grafik BB/U yang sudah ada.
- **Indeks yang Ditampilkan:**
  1. **BB/U** (Berat Badan menurut Umur) — Deteksi *underweight* / gizi kurang & buruk.
  2. **TB/U** atau **PB/U** (Tinggi/Panjang Badan menurut Umur) — Deteksi *stunting* (*severely stunted*, *stunted*, normal, tinggi).
  3. **IMT/U** & **BB/TB** (Indeks Massa Tubuh / Berat menurut Tinggi) — Deteksi *wasting* & obesitas.
  4. **LiLA/U** (Lingkar Lengan Atas menurut Umur) — Skrining gizi akut / KEK.
  5. **LiKA/U** (Lingkar Kepala menurut Umur) — Deteksi mikrosefali & makrosefali.
- **Standarisasi Status Gizi:** Menampilkan pita warna standar deviasi WHO (-3 SD, -2 SD, -1 SD, Median/0 SD, +1 SD, +2 SD, +3 SD) yang jelas membedakan zona aman dan zona waspada.
- **Opsi Solusi:**
  - **Solusi Sederhana (KISS):** Menambahkan tabs/pilihan indeks pada komponen `kms-chart.tsx`. Engine SVG yang sudah ada digunakan kembali dengan memuat data kurva LMS masing-masing indeks dari file `who-lms.json`.
  - **Solusi Kompleks (Skalabel):** Refaktor komponen grafik menjadi modular (`GrowthChartEngine`) dengan fitur interaktif seperti hover detail Z-Score per titik, toggle batas SD, dan zoom interaktif.
- **Referensi:** *WHO Child Growth Standards (2006)* & *Permenkes No. 2 Tahun 2020 tentang Standar Antropometri Anak*.

#### [TASK-1.2] Generator Pesan Edukasi & Rekomendasi Rujukan KMS
- **Deskripsi:** Di bawah grafik KMS, muncul kartu edukasi kontekstual yang otomatis menyesuaikan hasil pengukuran anak.
- **Logika Edukasi:**
  - **Kondisi Bahaya / Rujukan:** Jika Z-score berada di bawah ambang normal (Z < -2 SD / batas -1.96 SD) atau terindikasi *stunting/wasting/gizi buruk*, tampilkan kartu peringatan merah: *"Hasil berada di luar rentang normal. Silakan hubungi Faskes / Puskesmas dan dokter terdekat untuk penanganan lebih lanjut."*
  - **Kondisi Waspada (T / Berat Seret):** Peringatan dini jika berat tidak naik 2 bulan berturut-turut, anjuran evaluasi MP-ASI kaya protein hewani dan deteksi penyakit penyerta (batuk/pilek/diare).
  - **Kondisi Baik (N / Hijau):** Apresiasi dan tips mempertahankan gizi seimbang sesuai tahapan usia.

---

### 🛡️ Modul 2: Validasi Input Cerdas & Evaluasi Tren Pertumbuhan (N/T/O/B)

#### [TASK-2.1] Deteksi Anomali Input Real-Time ("Ulangi Pengukuran")
- **Deskripsi:** Mencegah kesalahan ketik kader saat memasukkan hasil timbang/ukur (BB, TB, LiLA, LiKA).
- **Contoh Kasus:** Bulan lalu BB anak 15.0 kg, lalu kader mengetik 13.0 kg (turun drastis 2 kg dalam 1 bulan) atau mengetik 25.0 kg (salah digit).
- **Logika & Perilaku:**
  - Sistem membandingkan nilai input dengan data bulan sebelumnya.
  - Jika penurunan BB > 1.0 kg (atau > 10% BB), TB berkurang (tinggi tidak mungkin menyusut), atau lonjakan nilai tidak realistis, sistem memunculkan indikator peringatan menyolok: **"⚠️ Angka tidak wajar! Harap ulangi lagi pengukuran anak sebelum menyimpan."**
- **Opsi Solusi:**
  - **Solusi Sederhana:** Validasi `onChange`/`onBlur` berbasis aturan delta batas tetap (misal selisih BB > 1.5 kg, TB turun > 0.5 cm).
  - **Solusi Kompleks:** Evaluasi berbasis delta Z-Score (> 1.0 SD per bulan) disertai modal konfirmasi ganda jika data memang benar-benar riil (misal anak pasca sakit parah).

#### [TASK-2.2] Penentuan Status N/T/O/B Berbasis Data 2 Bulan Terakhir
- **Deskripsi:** Menghitung status kenaikan berat badan secara otomatis dengan membandingkan data penimbangan 2 bulan ke belakang.
- **Kategori:**
  - **N (Naik):** Berat badan naik dan memenuhi Kenaikan Berat Badan Minimal (KBM) sesuai umur.
  - **T (Tidak Naik):** Berat badan naik tapi tidak mencapai KBM, tetap, atau turun.
  - **O (Absen Lalu Hadir):** Bulan lalu tidak hadir/timbang, hadir pada bulan ini.
  - **B (Baru):** Sasaran baru yang pertama kali ditimbang.
- **Tampilan:** Menampilkan badge tren kenaikan di tabel dan riwayat pengukuran anak.

---

### 💬 Modul 3: Komunikasi & Forwarding WhatsApp Orang Tua

#### [TASK-3.1] Penambahan Nomor Kontak Person Orang Tua (WhatsApp / HP)
- **Deskripsi:** Menambahkan kolom kontak aktif orang tua pada database dan form pendaftaran/edit.
- **Perubahan Data:**
  - Menambahkan kolom `no_telepon` / `no_wa` pada tabel `orang_tua`.
  - Validasi format nomor telepon (normalisasi format internasional, misal `0812...` -> `62812...`).

#### [TASK-3.2] Generator Format Pesan WhatsApp & Tombol "Forward ke WA"
- **Deskripsi:** Mengubah hasil pengukuran anak menjadi draf pesan WhatsApp yang rapi, informatif, dan langsung bisa dikirimkan ke orang tua saat pengukuran selesai.
- **Struktur Pesan WhatsApp:**
  ```text
  Halo Ayah/Bunda [Nama Orang Tua],
  Berikut hasil pengukuran bulanan Posyandu Tulip untuk ananda:

  Nama: [Nama Anak]
  Tanggal Ukur: [Tanggal]
  Usia: [X Tahun Y Bulan]

  📊 Hasil Pengukuran:
  • Berat Badan: [X] kg (Status: [N/T])
  • Tinggi/Panjang: [X] cm
  • Lingkar Kepala: [X] cm
  • Lingkar Lengan: [X] cm

  🏷️ Status Gizi:
  • Gizi (BB/U): [Normal / Kurang / Lebih]
  • Tinggi (TB/U): [Normal / Pendek / Sangat Pendek]

  💡 Catatan & Edukasi:
  [Pesan edukasi atau anjuran periksa faskes jika Z < -2 SD]

  Terima kasih telah rutin memantau tumbuh kembang ananda di Posyandu Tulip! 🌷
  ```
- **Opsi Solusi:**
  - **Solusi Sederhana (KISS - Rekomendasi):** Menggunakan tombol tautan langsung WhatsApp API client-side (`https://wa.me/{no_wa}?text={pesan_terenkripsi}`). Kader mengklik tombol, WhatsApp Web/App langsung terbuka dengan draf pesan siap kirim. Nol biaya server/gateway.
  - **Solusi Kompleks:** Integrasi WhatsApp Gateway (Wablas/Fonnte/Twilio) dari backend agar pesan terkirim otomatis di latar belakang saat tombol simpan ditekan.

---

### 🧠 Modul 4: Instrumen Stimulasi Perkembangan Anak Berbasis Usia

#### [TASK-4.1] Pendataan Variabel Stimulasi Perkembangan (KPSP / Checklist Milestone)
- **Deskripsi:** Menambahkan variabel penilaian perkembangan motorik & stimulasi yang disesuaikan dengan batasan kelompok umur anak.
- **Batasan Usia:** Pengelompokan milestone Kemenkes (0-3 bln, 3-6 bln, 6-9 bln, 9-12 bln, 12-18 bln, 18-24 bln, 2-3 th, 3-4 th, 4-5 th).
- **Aspek Penilaian:** Motorik kasar, motorik halus, kemampuan bicara & bahasa, kemandirian & sosialisasi.
- **Output:** Status Capaian Perkembangan:
  - **Tercapai / Sesuai (S)**: Seluruh stimulasi dasar usia terpenuhi.
  - **Meragukan / Perlu Pemantauan (M)**: Ada 1-2 indikator belum tercapai.
  - **Penyimpangan (P)**: Indikator tertinggal, disarankan konsultasi faskes.
- **Opsi Solusi:**
  - **Solusi Sederhana:** Checklist cepat 3-4 pertanyaan per rentang usia saat kader mengisi buku posyandu, menghasilkan status ringkas "Tercapai / Perlu Stimulasi Tambahan".
  - **Solusi Kompleks:** Formulir instrumen KPSP standar Kemenkes lengkap (9-10 pertanyaan per interval usia) dengan log perkembangan bulanan.

---

### 📝 Modul 5: Pendaftaran Cerdas & Skrining Awal Sasaran

#### [TASK-5.1] Skrining Awal Pendaftaran (Identitas Kurang & Jadwal Imunisasi)
- **Deskripsi:** Saat kader memasukkan/mencari nama anak di meja pendaftaran, sistem langsung menampilkan kotak peringatan (*alert*) skrining awal:
  1. **Identitas Kurang:** NIK belum tercatat, tanggal lahir belum pasti, nomor WhatsApp orang tua belum ada, atau data domisili belum lengkap.
  2. **Jadwal Layanan / Imunisasi:** Status imunisasi yang belum lengkap sesuai usia anak (BCG, Polio, DPT-HB-Hib, Campak, PCV, Rotavirus) atau pemberian Vitamin A (Februari/Agustus) & Obat Cacing.
- **Tujuan:** Kader pendaftaran langsung mengonfirmasi kekurangan berkas dan mengarahkan sasaran ke meja imunisasi/edukasi.

#### [TASK-5.2] Manajemen Sasaran Dinamis (Data Puskesmas & Status Retensi)
- **Deskripsi:** Mengelola data sasaran yang fluktuatif setiap bulan dari Puskesmas.
- **Alur Kerja:**
  - Fitur tambah cepat (*quick-add*) atau impor batch data sasaran baru dari Puskesmas.
  - **Aturan Retensi Data:** Data sasaran lama yang sudah lulus (usia > 5 tahun) atau pindah domisili **TIDAK DIHAPUS**, melainkan dialihkan statusnya menjadi `Lulus` atau `Pindah` (Soft Deletion/Arsip). Riwayat pengukuran tetap tersimpan untuk kebutuhan statistik dan audit posyandu.

#### [TASK-5.3] Integrasi Scan ID Card Sasaran (STATUS: PENDING)
- **Status:** **PENDING / Tahap Lanjutan** (sesuai arahan user).
- **Rencana Teknis Masa Depan:** Pemanfaatan QR Code / Barcode pada kartu posyandu sasaran menggunakan kamera laptop/HP untuk pencarian instan anak di meja pendaftaran.

---

### 📊 Modul 6: Rekapitulasi Laporan F1, Data Desil/Gakin, & Bukti Fisik Cetak

#### [TASK-6.1] Penambahan Atribut Sosio-Ekonomi (Status Desil & Kategori Gakin)
- **Deskripsi:** Menambahkan atribut data yang dibutuhkan pelaporan pemerintah pada data anak/keluarga:
  - **Status Desil:** Desil 1 s.d. Desil 4 (Sangat Miskin / Rentan) hingga Desil 10.
  - **Kategori Kemiskinan:** `Gakin` (Keluarga Miskin) vs `Non-Gakin`.

#### [TASK-6.2] Laporan Rekapitulasi Format F1 (Breakdown Pemerintah)
- **Deskripsi:** Menghasilkan tabel laporan rekapitulasi bulanan sesuai blangko F1 Posyandu:
  - Breakdown berdasarkan: Jenis Kelamin (L/P), Kategori Gakin vs Non-Gakin, dan Kelompok Desil.
  - Rekapitulasi indikator penimbangan:
    - **S** (Sasaran balita terdaftar di wilayah)
    - **K** (Balita yang memiliki KMS/Buku KIA)
    - **D** (Balita yang hadir dan ditimbang)
    - **N** (Balita yang berat badannya naik)
    - **T** (Balita yang berat badannya tidak naik / tetap / turun)
    - **O** (Balita yang bulan lalu absen dan bulan ini hadir)
    - **B** (Balita baru pertama kali timbang)
  - Ekspor ke format spreadsheet (Excel / CSV).

#### [TASK-6.3] Lembar Bukti Fisik Siap Cetak (Printable Paper View)
- **Deskripsi:** Mengakomodasi kebutuhan fisik kader yang tetap memerlukan bukti kertas di lapangan.
- **Fitur:** Tampilan khusus cetak (`@media print`) untuk:
  1. Lembar Absensi & Pendaftaran Meja 1.
  2. Lembar Rekap Hasil Pengukuran Posyandu per Hari Kegiatan.
  3. Kartu Riwayat Ukur Anak (salinan Buku KIA/KMS).

---

### 🎨 Modul 7: Desain UI/UX Aksesibel & Interaktif (Kader-Friendly)

#### [TASK-7.1] Mode Aksesibilitas Tampilan (Zoom & Font/Grafik Skala Besar)
- **Deskripsi:** Kader posyandu memiliki rentang usia yang beragam, sehingga antarmuka harus mudah dibaca di layar laptop maupun tablet/smartphone.
- **Fitur:**
  - Pilihan mode tampilan teks besar (*Large Text Mode*).
  - Kurva KMS dan angka hasil ukur disajikan dengan kontras warna tajam dan ukuran font besar (anti-kekecilan).

#### [TASK-7.2] Animasi & Mikro-Interaksi yang Interaktif
- **Deskripsi:** Memberikan umpan balik visual yang menyenangkan saat kader bekerja.
- **Fitur:**
  - Animasi transisi halus antar langkah pendaftaran -> pengukuran -> resume.
  - Badge peringatan merah berdenyut (*pulse animation*) saat nilai tidak wajar terdeteksi.
  - Toast notifikasi sukses yang informatif.

---

## 🚦 Matriks Prioritas & Rekomendasi Urutan Eksekusi

| Prioritas | Kode Task | Nama Task | Dampak Langsung |
|---|---|---|---|
| **P1 (Kritis)** | `TASK-2.1` | Validasi Anomali Input ("Ulangi Pengukuran") | Mencegah kesalahan data fatal di lapangan |
| **P1 (Kritis)** | `TASK-3.1` & `3.2` | No. Kontak Ortu & Forwarding WhatsApp Langsung | Meningkatkan kepatuhan orang tua membaca hasil |
| **P1 (Kritis)** | `TASK-5.1` | Skrining Awal Pendaftaran (Data Kurang & Imunisasi) | Kader pendaftaran langsung tanggap kekurangan |
| **P2 (Tinggi)** | `TASK-1.1` | Multi-Grafik WHO (BB/U, TB/U, IMT/U, LiLA, LiKA) | Standarisasi analisis gizi lengkap |
| **P2 (Tinggi)** | `TASK-1.2` | Edukasi & Rekomendasi Rujukan Otomatis KMS | Panduan konseling kader kepada sasaran |
| **P2 (Tinggi)** | `TASK-2.2` | Evaluasi N/T/O/B 2 Bulan Terakhir | Akurasi status pertumbuhan bulanan |
| **P2 (Tinggi)** | `TASK-4.1` | Variabel Stimulasi Perkembangan (KPSP) | Pemantauan tumbuh kembang holistik |
| **P2 (Tinggi)** | `TASK-6.1` & `6.2` | Status Desil/Gakin & Rekap Laporan F1 | Kepatuhan pelaporan ke Puskesmas/Pemerintah |
| **P3 (Menengah)** | `TASK-6.3` | Format Cetak Kertas Fisik (Print-Ready) | Backup bukti fisik administrasi kader |
| **P3 (Menengah)** | `TASK-7.1` & `7.2` | Aksesibilitas Ukuran Tampilan & Animasi | Kenyamanan dan kemudahan kader |
| **PENDING** | `TASK-5.3` | Scan ID Card Sasaran | Ditunda sesuai catatan pengguna |

---

## ❓ Poin Pertanyaan & Klarifikasi (Ambiguitas Bisnis & Teknis)

Sebelum mulai menulis kode untuk task-task di atas, terdapat beberapa hal yang perlu kita sepakati:

1. **Ambang Batas Peringatan Dokter/Faskes:**
   - Anda menyebutkan: *"kalau sudah diatas -1,96 = silahkan hubungi faskes dan dokter terdekat"*.
   - Dalam standar WHO Z-score, rentang normal adalah antara **-2.0 SD s.d. +2.0 SD** (nilai -1.96 SD adalah ekuivalen batas bawah 95% kurva normal). Apakah yang dimaksud adalah jika status gizi anak **berada di bawah -2.0 SD (atau < -1.96 SD)** seperti gizi buruk/stunting/wasting, ATAU untuk indikator obesitas (Z > +2.0 SD)?
2. **Sumber Data Desil & Status Gakin:**
   - Apakah data kategori Desil (1-4, dll.) dan Gakin/Non-Gakin sudah tersedia di lembar master data Puskesmas yang biasa diimpor, atau perlu diisi mandiri oleh kader saat pendaftaran anak?
3. **Format Blangko Laporan F1 & Cetak Fisik:**
   - Apakah Posyandu Tulip saat ini memiliki format file Excel / format cetak formulir kertas F1 yang biasa digunakan? Jika ada contoh kolom atau susunan resminya, kita bisa sesuaikan persis 1-to-1.
4. **Kedalaman Variabel Stimulasi Perkembangan:**
   - Apakah Anda menginginkan checklist sederhana (misal 3-4 pertanyaan ringkas per kelompok umur: Gerak Kasar, Gerak Halus, Bicara, Kemandirian -> Hasil: Tercapai / Belum Tercapai) atau instrumen lengkap formulir KPSP resmi Kemenkes (9-10 pertanyaan per interval umur)?
5. **Mode Pengembangan:**
   - Karena sebelumnya backend Laravel mensyaratkan PHP 8.3, apakah fitur-fitur ini ingin kita implementasikan dan demonstrasikan terlebih dahulu di **Mode Demo Frontend (`npm run demo`)** agar dapat langsung diuji di browser, atau kita siapkan di backend Laravel secara paralel?
