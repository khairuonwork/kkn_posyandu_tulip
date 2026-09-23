# Software Requirements Specification — Portal Posyandu Tulip

| | |
|---|---|
| **Jenis** | Rujukan |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 22 September 2026 |

Dokumen ini menerjemahkan [PRD utama](../prd/prd-utama.md) menjadi kebutuhan yang dapat diuji. Setiap kebutuhan punya ID tetap, kriteria penerimaan yang dapat diverifikasi, dan jejak ke *test*.

Kata **HARUS** menandai kebutuhan wajib MVP. **SEBAIKNYA** menandai kebutuhan yang boleh ditunda tanpa membatalkan rilis.

---

## 1. Kebutuhan fungsional

### 1.1 Master data (M1)

| ID | Kebutuhan | Kriteria penerimaan |
|---|---|---|
| FR-01 | Sistem HARUS menyimpan profil anak dengan identitas internal yang tetap. | `anak.id` adalah *primary key*; `nik` boleh kosong dan tetap *unique* bila terisi. Anak tanpa NIK dapat disimpan dan diukur. |
| FR-02 | Sistem HARUS menyimpan NIK sebagai teks. | NIK `0327703...` tersimpan utuh dengan nol di depan; NIK 16 digit tidak dibulatkan. |
| FR-03 | Sistem HARUS menyediakan pencarian anak berdasarkan nama, NIK, atau RT. | Kata kunci parsial pada `nama` maupun `nama_baku` menemukan anak; filter RT dan status dapat digabungkan. |
| FR-04 | Sistem HARUS memungkinkan Bidan mengoreksi profil anak. | Perubahan `nama`, `nama_baku`, `tgl_lahir`, `jk`, RT, dan orang tua tersimpan beserta jejak audit (FR-35). |
| FR-05 | Sistem HARUS menandai kandidat profil duplikat. | Anak dengan NIK sama, atau dengan `nama_baku` + `tgl_lahir` + `jk` sama, muncul sebagai kandidat pada layar Bidan. |
| FR-06 | Sistem HARUS memungkinkan Bidan menggabungkan dua profil. | Setelah penggabungan, seluruh `pengukuran` dan `layanan` berpindah ke profil tujuan; profil sumber tidak lagi muncul di daftar; aksi tercatat di audit. |
| FR-07 | Sistem HARUS mengelola wilayah RT. | RT tersimpan sebagai teks (`01` tetap `01`); kombinasi `rt` + `rw` unik per Posyandu. |

### 1.2 Periode dan pengukuran (M5, M2)

| ID | Kebutuhan | Kriteria penerimaan |
|---|---|---|
| FR-08 | Sistem HARUS mengelola periode kegiatan bulanan. | Satu periode unik per kombinasi bulan dan tahun; periode ganda ditolak validasi. |
| FR-09 | Sistem HARUS membatasi satu rekam pengukuran utama per anak per periode. | Upaya menyimpan rekam kedua ditolak *constraint* basis data, bukan hanya validasi aplikasi. |
| FR-10 | Sistem HARUS menyimpan BB, TB/PB, LILA, dan LIKA sebagai nilai numerik beserta satuannya. | Nilai bukan angka tidak pernah masuk kolom numerik. |
| FR-11 | Sistem HARUS membedakan panjang badan telentang dari tinggi badan berdiri. | `jenis_ukur` bernilai `PB` atau `TB`; nilai yang ditampilkan adalah nilai ukur asli, bukan hasil konversi. |
| FR-12 | Sistem HARUS membedakan ketidakhadiran dari nilai nol. | Teks seperti `PINDAH RUMAH` menjadi `status_kehadiran`, dan `bb_kg` tetap kosong — bukan `0`. |
| FR-13 | Sistem HARUS memungkinkan Bidan mengoreksi nilai pengukuran. | Setelah koreksi, penilaian gizi dihitung ulang otomatis; nilai lama tersimpan di audit. |
| FR-14 | Sistem HARUS menghitung umur dari tanggal lahir dan tanggal ukur. | Kolom umur pada file sumber diabaikan sepenuhnya. Lahir 20 Jan 2026, ukur 13 Jun 2026 → 4 bulan penuh. |

### 1.3 Status gizi (M3)

| ID | Kebutuhan | Kriteria penerimaan |
|---|---|---|
| FR-15 | Sistem HARUS menghitung z-score enam indeks dengan metode WHO LMS. | Rumus sesuai [`rujukan/antropometri.md`](antropometri.md) bagian 2.1 dan 2.2. |
| FR-16 | Sistem HARUS menyimpan versi standar pada setiap hasil. | Setiap baris `penilaian_gizi` memuat `standar_versi`; menambah versi baru tidak mengubah hasil lama. |
| FR-17 | Sistem HARUS memberi kategori sesuai ambang PMK 2/2020. | Ambang persis seperti bagian 4 spesifikasi antropometri. `LILA_U` tanpa kategori sampai OI-04 selesai. |
| FR-18 | Sistem HARUS mengosongkan hasil bila prasyarat tidak lengkap. | Tanggal lahir, jenis kelamin, tanggal ukur, atau nilai ukur kosong → `z_score` bernilai `NULL`, bukan `0`, dan tanpa *exception*. |
| FR-19 | Sistem HARUS menandai nilai yang tidak wajar secara biologis. | Nilai di luar rentang WHO diberi penanda `tidak_wajar`; nilainya tetap tersimpan dan tetap terlihat. |
| FR-20 | Sistem HARUS bersifat *idempotent* saat menghitung ulang. | Perhitungan ulang untuk pengukuran dan versi standar yang sama tidak menambah baris. |

### 1.4 Tampilan dan laporan (M2, M4, M5)

| ID | Kebutuhan | Kriteria penerimaan |
|---|---|---|
| FR-21 | Sistem HARUS menampilkan riwayat pertumbuhan anak sebagai kurva. | Halaman profil anak memuat garis SD sebagai latar dan titik pengukuran anak di atasnya. |
| FR-22 | Sistem HARUS menampilkan rekap per RT dan periode. | Baris rekap = satu anak pada satu periode; filter RT, periode, dan status gizi tersedia. |
| FR-23 | Sistem HARUS menampilkan nilai z-score numerik pada rekap dan *export*, bukan hanya kategorinya. | Setiap indeks menyumbang dua kolom (`Z <indeks>` dan `Status <indeks>`); z-score ditulis dua desimal; sel kosong bila tidak dapat dihitung — **bukan** `0`. Kolom `Versi Standar` ikut serta. |
| FR-24 | Sistem HARUS menghitung dan menampilkan D/S per periode. | `S` = jumlah anak berstatus `aktif`; `D` = jumlah anak dengan `status_kehadiran = hadir`. |
| FR-25 | Sistem HARUS menyediakan *export* rekap ke berkas. | Format CSV/Excel dengan susunan kolom seperti FR-23, dapat dibuka di Excel tanpa perbaikan manual. |
| FR-26 | Sistem SEBAIKNYA menampilkan daftar anak yang perlu tindak lanjut. | Daftar disusun dari kategori status gizi. Aturan 1T/2T/3T **tidak** dipakai sampai OI-01 selesai. |

### 1.5 Layanan (M6)

| ID | Kebutuhan | Kriteria penerimaan |
|---|---|---|
| FR-27 | Sistem HARUS menyimpan pemberian imunisasi, Vitamin A, dan obat cacing. | Tersimpan di `layanan` dengan kolom `jenis`, `tanggal`, dan `keterangan`; tampil pada profil anak. Tabelnya sudah ada; pengisiannya belum. Sumber datanya **sudah ditemukan** sejak 21 September 2026 — berkas data sasaran memuat imunisasi lengkap per antigen beserta tanggalnya ([OI-15](../pertanyaan-terbuka.md), [06 bagian 10](migrasi-data.md)), jadi yang dibutuhkan impor, bukan pengumpulan data baru. |

### 1.6 Impor arsip (M7)

| ID | Kebutuhan | Kriteria penerimaan |
|---|---|---|
| FR-28 | Sistem HARUS menyediakan perintah impor arsip Excel. | Perintahnya **belum ada** di stack baru; rancangannya di [`rujukan/migrasi-data.md`](migrasi-data.md). |
| FR-29 | Sistem HARUS menyediakan mode uji coba. | `--dry-run` tidak menulis **satu baris pun** ke tabel produksi, namun tetap melaporkan seluruh konflik. |
| FR-30 | Sistem HARUS mencatat asal setiap baris impor. | `import_batch` menyimpan nama berkas, sheet, waktu, dan ringkasan. |
| FR-31 | Sistem HARUS memisahkan konflik ke antrean, bukan menebak. | NIK ganda, tanggal lahir bentrok, nama mirip, satuan meragukan, dan nilai bukan angka masuk `import_konflik` dengan status `terbuka`. Data yang bersih tetap masuk. |
| FR-32 | Sistem HARUS bersifat *idempotent* saat impor diulang. | Menjalankan berkas yang sama dua kali tidak menghasilkan pengukuran ganda (dijamin FR-09). |

### 1.7 Akun dan otorisasi (M8)

| ID | Kebutuhan | Kriteria penerimaan |
|---|---|---|
| FR-33 | Sistem HARUS mewajibkan autentikasi untuk seluruh data anak. | Tidak ada satu pun halaman data yang dapat diakses tanpa login. |
| FR-34 | Sistem HARUS menegakkan tiga peran dengan hak berbeda. | Matriks otorisasi [Otorisasi](../arsitektur.md); setiap baris punya *test* yang memverifikasi 403 bagi peran di bawahnya. |
| FR-35 | Sistem HARUS mencatat jejak audit perubahan data. | Isi dan cakupannya ditetapkan **DR-09** di [PRD utama bagian 9](../prd/prd-utama.md) — tidak diulang di sini. Ditegakkan trigger pada tabel `audit`; lihat [ADR-0007](../adr/0007-jejak-audit-lewat-trigger.md). |

---

## 2. Kebutuhan non-fungsional

| ID | Kategori | Kebutuhan | Kriteria penerimaan |
|---|---|---|---|
| NFR-01 | Bahasa | Seluruh antarmuka berbahasa Indonesia. | Termasuk pesan validasi, label tombol, nama kolom, dan pesan kesalahan. Tidak ada string bawaan pustaka berbahasa Inggris yang terlihat pengguna. |
| NFR-02 | Responsif | Portal dapat dipakai pada laptop dan tablet. | Lebar 768 px ke atas tidak menimbulkan *scroll* horizontal pada tata letak halaman. Tabel lebar boleh menggulir di dalam wadahnya sendiri. |
| NFR-03 | Kinerja | Pencarian anak terasa seketika. | Respons di bawah 300 ms untuk 500 anak dan 10.000 pengukuran pada perangkat pengembangan. |
| NFR-04 | Kinerja | Halaman rekap tidak menimbulkan *query* N+1. | *Query count* halaman rekap tidak bertambah seiring jumlah baris. Diverifikasi dengan *test*. |
| NFR-05 | Keamanan | NIK dan data kesehatan anak hanya dapat diakses pengguna terautentikasi dengan peran yang sesuai. | FR-33, FR-34. |
| NFR-06 | Keamanan | Kata sandi di-hash scrypt (`node:crypto`), sesi disimpan di basis data dan dapat dicabut seketika, CSRF ditutup `SameSite=Lax` + wajib `application/json`. | Primitif kriptografi seluruhnya dari pustaka standar; tidak ada kriptografi buatan sendiri. Rinciannya di [`server/src/auth/`](../../server/src/auth) dan [ADR-0006](../adr/0006-pindah-ke-express-react-postgres.md). |
| NFR-07 | Ketertelusuran | Setiap angka pada laporan dapat dilacak ke pengukuran dan versi standar asalnya. | Kolom `Versi Standar` pada *export*; `penilaian_gizi.standar_versi` di basis data. |
| NFR-08 | Integritas | Aturan kritis ditegakkan *constraint* basis data, bukan hanya validasi aplikasi. | `unique(anak_id, periode_id)`, `unique(pengukuran_id, indeks, standar_versi)`, `unique(nik)`. |
| NFR-09 | Basis data | PostgreSQL 17 adalah satu-satunya basis data yang didukung. | Migrasi **sengaja** memakai fitur khas PostgreSQL — `CHECK`, indeks unik parsial, FK tertunda, dan *trigger* `updated_at` — karena aturan integritas lebih murah dan lebih aman ditegakkan basis data daripada kode aplikasi (NFR-08). Keputusannya di [ADR-0006](../adr/0006-pindah-ke-express-react-postgres.md). |
| NFR-10 | Kualitas kode | CI hijau di kedua paket. | `npm test` dan `npm run types:check` di `server/`; ditambah `lint:check`, `format:check`, dan build di `client/`. |
| NFR-11 | Backup | Prosedur *backup* dan *restore* terdokumentasi dan pernah diuji. | Panduan Operasional (Fase 5). |
| NFR-12 | Aksesibilitas | Elemen interaktif dapat dijangkau keyboard dan memiliki label yang terbaca *screen reader*. | Setiap input punya `<label>`; fokus terlihat; kontras teks memenuhi WCAG AA. |

---

## 3. Traceability matrix

| Kebutuhan | User story | Modul | Berkas test |
|---|---|---|---|
| FR-01, FR-02 | US-11 | M1 | belum ada |
| FR-03 | US-01, US-03 | M1 | belum ada |
| FR-04, FR-05, FR-06 | US-05, US-06 | M1 | belum ada |
| FR-07 | US-13 | M1 | belum ada |
| FR-08, FR-09 | US-14 | M5 | belum ada |
| FR-10 – FR-14 | US-07 | M2 | belum ada |
| FR-15 – FR-20 | US-10 | M3 | `server/test/z-score.test.ts`, `penilaian-gizi.test.ts`, `gizi-simpan.test.ts` |
| FR-21 | US-02 | M2 | belum ada |
| FR-22 – FR-25 | US-08, US-09 | M5 | belum ada |
| FR-26 | US-03, US-08 | M4 | belum ada |
| FR-27 | — | M6 | belum ada |
| FR-28 – FR-32 | US-11, US-12 | M7 | belum ada |
| FR-33 – FR-35 | US-13 | M8 | `server/test/auth.test.ts`, `auth-http.test.ts`, `audit.test.ts` |
| NFR-04 | — | M5 | belum ada |
| NFR-08 | — | semua | `server/test/basis-data.test.ts` |
| NFR-10 | — | semua | `.github/workflows/tests.yml` |

---

## 4. Asumsi dan ketergantungan

| # | Asumsi | Bila salah |
|---|---|---|
| A1 | Portal tidak menerima input pengukuran lapangan. | Rancangan halaman dan prioritas kinerja berubah total. Lihat [ADR-0003](../adr/0003-batas-portal-vs-aplikasi-tablet.md). |
| A2 | Hanya ada satu Posyandu. | Kolom `posyandu_id` sudah tersedia di seluruh tabel, sehingga penambahan Posyandu tidak menuntut migrasi data. |
| A3 | Berkas `ref kemenkes & who.xlsx` adalah standar yang berlaku. | *Seed* versi standar baru ditambahkan; hasil historis tidak berubah (DR-06). |
| A4 | Populasi berskala ratusan anak dan ribuan pengukuran. | *Cache* lintas-permintaan, *queue*, dan denormalisasi menjadi relevan. Belum sekarang. |
| A5 | Arsip Excel adalah satu-satunya sumber data awal. | Bila Aplikasi Tablet siap lebih dulu, prioritas FR-28 sampai FR-32 turun. |
