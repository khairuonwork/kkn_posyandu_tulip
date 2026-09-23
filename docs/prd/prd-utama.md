# PRD Utama — Portal Posyandu Tulip

| | |
|---|---|
| **Jenis** | Kontrak — tingkat produk |
| **Status** | hidup — disetujui untuk MVP, lingkup diperluas feedback lapangan September 2026 |
| **Perubahan berarti terakhir** | 22 September 2026 |
| **Versi dokumen** | 2.1 |
| **Basis** | Revisi dari `PRD_DIGITALISASI_POSYANDU_TULIP.md` v1.0 |
| **Lokasi** | Posyandu Tulip, RW 18, Kelurahan Citeureup |

Kontrak produk: apa yang dijanjikan, kepada siapa, dan kapan dianggap berhasil.

> **Nomor bagian di bawah sengaja berlubang.** Dokumen ini dulu `prd/prd-utama.md` dengan dua belas bagian; pada 22 September 2026 bagian naratifnya dipindahkan ke dokumen orientasi supaya pembaca baru tidak perlu membuka kontrak untuk memahami produknya. Nomor yang tersisa **tidak digeser**, karena rujukan dari dokumen lain menyebutnya menurut nomor.
>
> | Dulu | Sekarang ada di |
> |---|---|
> | 1. Ringkasan · 2. Masalah · 4. Pengguna · 5. Batas sistem | [Ringkasan](../ringkasan.md) |
> | 6. Lingkup | [Fitur](../fitur.md) |

> **Perubahan utama dari v2.0.** Pihak Posyandu memberi feedback lapangan setelah mencoba Portal. Lingkupnya bertambah pada tiga arah yang belum tersentuh MVP: komunikasi ke orang tua, pencegahan salah input di meja, dan bukti fisik cetak. Tiap fiturnya punya PRD sendiri di [`feedback/`](feedback/README.md).

> **Perubahan utama dari v1.0.** v1.0 mengasumsikan produk ini sekaligus menjadi aplikasi pencatatan lapangan. Asumsi itu **salah**: pencatatan di hari-H ditangani Aplikasi Tablet yang terpisah. Lihat [ADR-0003](../adr/0003-batas-portal-vs-aplikasi-tablet.md).

---

## 3. Tujuan produk

| # | Tujuan | Ukuran keberhasilan |
|---|---|---|
| G1 | Satu identitas, satu riwayat per anak | Seluruh baris arsip 2025–2026 tergabung ke sekitar 129 profil anak; setiap konflik identitas terdokumentasi dan diputuskan manusia, bukan ditebak sistem. |
| G2 | Status gizi otomatis dan dapat ditelusuri | Z-score keenam indeks dihitung sistem; setiap hasil menyimpan versi standar yang dipakai. Selisih dengan perhitungan Excel yang berjalan kurang dari 0,01. |
| G3 | Riwayat pertumbuhan terbaca sekali lihat | Profil anak menampilkan kurva KMS dengan garis SD sebagai latar, tanpa membuka file lain. |
| G4 | Rekap tanpa kerja manual | Rekap per RT dan per periode, lengkap dengan kolom z-score, dihasilkan dari data — bukan disalin antar-spreadsheet. |
| G5 | Data lama tidak hilang | Arsip 2025–2026 masuk sistem lewat jalur impor yang punya jejak asal baris. |

### Non-goals

Hal berikut secara sadar **tidak** dikerjakan produk ini:

- Pencatatan pengukuran di lokasi Posyandu saat kegiatan berlangsung. Itu milik Aplikasi Tablet.
- Layanan di luar balita: ibu hamil, remaja, lansia, PTM/Posbindu, atau ILP enam siklus hidup.
- Portal untuk orang tua atau warga. Ini menuntut *informed consent*, kebijakan privasi, dan kontrol akses tersendiri yang belum tersedia.
- Integrasi otomatis ke e-PPGBM atau SIGIZI.
- Fungsi *offline* atau PWA. Portal dipakai di tempat yang memiliki koneksi.

## 7. User stories

Setiap *story* punya ID yang direferensikan di [SRS](../rujukan/srs.md) dan Test Plan (Fase 5).

### Kader

| ID | Story | Prioritas |
|---|---|---|
| US-01 | Sebagai kader, saya mencari anak berdasarkan nama, NIK, atau RT, agar tidak perlu membuka file Excel. | Must |
| US-02 | Sebagai kader, saya melihat riwayat pertumbuhan seorang anak dalam satu grafik, agar tren naik atau turunnya terlihat langsung. | Must |
| US-03 | Sebagai kader, saya melihat daftar anak di RT saya beserta status gizi terakhirnya, agar tahu siapa yang perlu dikunjungi. | Must |
| US-04 | Sebagai kader, saya melihat siapa saja yang belum hadir pada periode berjalan, agar bisa mengingatkan orang tuanya. | Should |
| US-15 | Sebagai kader, saya mengirim hasil pengukuran ke WhatsApp orang tua sesaat setelah anak diukur, agar orang tua benar-benar membacanya dan tidak bergantung pada buku Posyandu yang jarang dibuka. | Must |
| US-16 | Sebagai kader, saya diperingatkan ketika angka yang saya ketik tidak wajar dibanding bulan lalu, agar salah ketik tertangkap sebelum tersimpan, bukan sesudah. | Must |
| US-17 | Sebagai kader, saya melihat apa saja yang masih kurang dari data seorang anak saat ia mendaftar, agar bisa melengkapinya saat orang tuanya masih berdiri di depan saya. | Must |
| US-18 | Sebagai kader, saya membaca anjuran yang sudah menyesuaikan hasil ukur anak, agar bisa menyampaikannya kepada orang tua tanpa menghafal. | Should |

### Bidan / Koordinator

| ID | Story | Prioritas |
|---|---|---|
| US-05 | Sebagai Bidan, saya mengoreksi ejaan nama dan data profil anak, agar identitas tidak terpecah menjadi beberapa entri. | Must |
| US-06 | Sebagai Bidan, saya melihat kandidat data duplikat dan memutuskan penggabungannya, agar riwayat anak tidak terbelah. | Must |
| US-07 | Sebagai Bidan, saya mengoreksi nilai pengukuran yang salah input, agar status gizi yang dihitung sistem benar. | Must |
| US-08 | Sebagai Bidan, saya melihat sebaran status gizi per RT dan periode, agar bisa menentukan prioritas intervensi. | Must |
| US-09 | Sebagai Bidan, saya mengunduh rekap berisi z-score dan status per anak, agar bisa dibandingkan dengan rekap Excel yang berjalan. | Must |
| US-10 | Sebagai Bidan, saya melihat versi standar yang dipakai pada setiap hasil perhitungan, agar angka lama tetap bisa dipertanggungjawabkan. | Must |
| US-19 | Sebagai Bidan, saya melihat kurva pertumbuhan untuk keenam indeks — bukan berat badan saja — agar stunting dan gizi akut terbaca sejelas berat badan. | Must |
| US-20 | Sebagai Bidan, saya mengunduh rekap F1 yang sudah dipecah menurut jenis kelamin, desil, dan kategori Gakin, agar tidak menyusunnya ulang di Excel. | Must |
| US-21 | Sebagai Bidan, saya mencetak lembar bukti fisik kegiatan, agar arsip kertas Posyandu tetap ada seperti yang selama ini berjalan. | Must |

### Admin sistem

| ID | Story | Prioritas |
|---|---|---|
| US-11 | Sebagai admin, saya mengimpor arsip Excel 2025–2026 dan menerima laporan konflik, agar data lama masuk tanpa merusak data yang sudah benar. | Must |
| US-12 | Sebagai admin, saya menjalankan impor dalam mode uji coba lebih dulu, agar bisa memeriksa hasilnya sebelum menulis ke basis data. | Must |
| US-13 | Sebagai admin, saya membuat akun kader dan menetapkan perannya, agar setiap orang hanya bisa melakukan yang menjadi haknya. | Must |
| US-14 | Sebagai admin, saya membuat periode kegiatan bulanan, agar pengukuran punya tempat bernaung yang jelas. | Must |
| US-22 | Sebagai admin, saya menandai anak yang lulus atau pindah tanpa menghapusnya, agar riwayat pengukurannya tetap dapat ditelusuri untuk statistik dan audit. | Must |

## 8. Alur utama

### 8.1 Menyiapkan periode

1. Admin membuat periode, misalnya `Juni 2026`, beserta tanggal kegiatannya.
2. Sistem menandai seluruh anak berstatus aktif sebagai **sasaran (S)** periode tersebut.

### 8.2 Data pengukuran masuk

Selama Aplikasi Tablet belum ada, data masuk lewat impor arsip. Setelah itu Bidan mengoreksi apa yang perlu dikoreksi lewat Portal.

1. Admin menjalankan perintah impor dalam mode uji-coba dan memeriksa laporan konflik.
2. Admin menjalankan impor sungguhan. Sistem mencatat asal setiap baris.
3. Sistem menghitung z-score dan kategori untuk setiap pengukuran yang datanya lengkap.
4. Bidan menyelesaikan antrean konflik: menggabungkan profil ganda, memperbaiki tanggal lahir yang bertentangan, dan menentukan status untuk baris bernilai teks seperti `PINDAH RUMAH`.

### 8.3 Memantau dan melaporkan

1. Dashboard menampilkan D/S periode berjalan, sebaran status gizi, dan daftar anak perlu tindak lanjut.
2. Kader membuka profil anak untuk melihat kurva KMS dan riwayatnya.
3. Bidan mengunduh rekap periode sebagai bahan laporan ke Puskesmas.

## 9. Aturan data yang mengikat

Aturan ini bersifat wajib dan diverifikasi lewat *test*, bukan sekadar imbauan.

| # | Aturan | Alasan |
|---|---|---|
| DR-01 | *Primary key* aplikasi adalah surrogate ID internal. **Bukan** nama, nomor urut Excel, atau NIK. | Delapan baris arsip tidak punya NIK dan empat NIK saling bertentangan. Lihat [ADR-0001](../adr/0001-primary-key-strategy.md). |
| DR-02 | `nik`, `nik_ortu`, dan nomor KK disimpan sebagai **string**, boleh kosong. | Menjaga nol di depan dan mencegah pembulatan Excel pada angka 16 digit. |
| DR-03 | Umur **selalu** dihitung sistem dari `tgl_lahir` dan `tanggal_ukur`. Kolom umur pada file sumber diabaikan. | Kolom `UMUR LENGKAP` di arsip berupa teks (`0Thn4Bln24Hari`) dan bisa tidak sinkron dengan tanggalnya. |
| DR-04 | Nilai kosong **berbeda** dari nol. Teks seperti `PINDAH RUMAH` menjadi status kehadiran, bukan berat badan 0 kg. | Nol pada kolom berat merusak seluruh perhitungan status gizi dan rata-rata. |
| DR-05 | Panjang badan telentang (PB) dan tinggi badan berdiri (TB) dibedakan lewat kolom `jenis_ukur`. | Selisihnya 0,7 cm dan berpengaruh langsung pada penetapan status *stunting*. |
| DR-06 | Setiap hasil perhitungan status gizi menyimpan **versi standar** yang dipakai. | Bila standar diperbarui, angka historis tetap dapat ditelusuri dan tidak berubah diam-diam. |
| DR-07 | Status gizi **tidak dihitung** bila tanggal lahir, jenis kelamin, tanggal ukur, atau nilai ukur yang diperlukan tidak tersedia. Hasilnya kosong, bukan tebakan. | Status gizi yang salah lebih berbahaya daripada status gizi yang kosong. |
| DR-08 | Definisi `NTOB`, `1T/2T/3T`, dan ambang tindak lanjut **tidak diaktifkan otomatis** sebelum dikonfirmasi pemilik program. Nilai mentah tetap disimpan. | Salah menandai anak sebagai bermasalah, atau gagal menandai yang bermasalah, sama-sama merugikan. |
| DR-09 | Setiap impor, perubahan profil, perubahan pengukuran, dan penggabungan data menyimpan pengguna, waktu, sumber, serta nilai sebelum dan sesudah. | Data kesehatan anak harus dapat diaudit. |
| DR-10 | Satu anak memiliki paling banyak satu rekam pengukuran utama per periode. | Mencegah penghitungan ganda pada rekap D/S. |
| DR-11 | **O** dan **B** dikecualikan dari DR-08 dan boleh dihitung sistem. **N** dan **T** tetap terikat DR-08. | O dan B murni menyatakan kehadiran — bulan lalu ditimbang atau tidak, pertama kali ditimbang atau tidak — dan keduanya terbaca langsung dari `status_kehadiran` tanpa satu pun ambang yang diperdebatkan. Yang belum dikonfirmasi pada [OI-01](../pertanyaan-terbuka.md) adalah tabel KBM, dan KBM hanya menentukan N versus T. Menahan O dan B ikut menunggu berarti menahan angka yang sudah pasti benar. |

## 10. Kebutuhan non-fungsional (ringkas)

Rincian dan kriteria terukurnya ada di [SRS bagian 4](../rujukan/srs.md).

- **Bahasa antarmuka:** Indonesia sepenuhnya, termasuk pesan kesalahan validasi.
- **Perangkat:** responsif untuk laptop dan tablet. Kader tidak selalu memakai layar besar.
- **Kinerja:** pencarian anak terasa seketika pada skala ratusan anak dan ribuan pengukuran.
- **Keamanan:** autentikasi wajib, otorisasi berbasis peran, dan jejak audit untuk akses data anak. NIK adalah data pribadi.
- **Ketertelusuran:** setiap angka pada laporan dapat dilacak ke pengukuran dan versi standar asalnya.
- **Backup:** prosedur *backup* dan *restore* terdokumentasi dan pernah diuji.

## 11. Ukuran keberhasilan MVP

MVP dinyatakan berhasil bila **seluruh** kriteria berikut terpenuhi:

| # | Kriteria | Cara verifikasi |
|---|---|---|
| S1 | Z-score aplikasi cocok dengan perhitungan Excel yang berjalan | Selisih kurang dari 0,01 terhadap kolom WHO-LMS pada master Juni 2026, **kecuali** baris ber-z di luar ±3 SD yang memang sengaja berbeda karena aplikasi menerapkan ekstrapolasi WHO. Selisih pada baris tersebut tidak boleh mengubah kategori status gizi. Hasil verifikasi: [`rujukan/antropometri.md`](../rujukan/antropometri.md) bagian 9. |
| S2 | Seluruh arsip 2025 dan Januari–Juni 2026 masuk sistem | Semua baris terproses; setiap konflik tercatat dan berstatus selesai. |
| S3 | Tidak ada pengukuran ganda | Tidak ada anak dengan dua rekam utama pada periode yang sama tanpa alasan tercatat. |
| S4 | Rekap D/S cocok dengan Buku 7 | Angka D/S per periode sama dengan `3_rekap buku 7_shared.xlsx`, atau setiap selisihnya dapat dijelaskan. |
| S5 | Kader dapat bekerja tanpa Excel | Kader menemukan anak dan membaca riwayat pertumbuhannya tanpa membuka file lain. |
| S6 | Tidak ada regresi | CI hijau di kedua paket: `npm test` dan `types:check` di `server/`, ditambah `lint:check`, `format:check`, dan build di `client/`. |

## 12. Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Definisi NTOB dan 1T/2T/3T tidak kunjung dikonfirmasi | Fitur tindak lanjut otomatis tertunda | Nilai mentah tetap disimpan; mesin aturan dibuat *configurable* sehingga aktivasinya nanti tidak menuntut migrasi data. |
| Konflik identitas lebih banyak dari perkiraan | Migrasi memakan waktu lama | Impor sudah memisahkan konflik ke antrean tersendiri; data yang bersih tetap masuk lebih dulu. |
| Aplikasi Tablet tidak jadi dibangun | Portal kehilangan sumber data rutin | Portal tetap menyediakan form koreksi pengukuran; modul impor in-app tersedia sebagai jalur cadangan di Fase 2. |
| Angka aplikasi berbeda dari laporan yang sudah disahkan | Kepercayaan pemilik program turun | S1 dan S4 dijadikan *acceptance test* yang harus lulus sebelum rilis, bukan diperiksa setelahnya. |
| Standar antropometri diperbarui pemerintah | Angka historis berubah | DR-06: setiap hasil menyimpan versi standarnya; versi baru ditambahkan, tidak menimpa. Bila yang berganti bukan sekadar versi tahun standar tapi metode hitungnya sendiri, lihat [ADR-0005](../adr/0005-migrasi-metode-zscore.md): riwayat lama disimpan dua hasil (metode lama diarsipkan, metode baru untuk tampilan). |
| Nomor WhatsApp orang tua adalah data pribadi baru yang sebelumnya tidak disimpan sistem | Kebocoran kontak seluruh orang tua balita satu RW | Nomor **memang** berada di jalur URL `wa.me` dan hasil ukur anak di *query string*-nya — begitulah WhatsApp bekerja, dan mengirim lewat WhatsApp berarti WhatsApp membacanya. Yang dijaga: tautan hanya disusun dan dibuka di peramban kader, tidak pernah dikirim ke server mana pun termasuk server Portal sendiri, dan NIK tidak pernah ikut di dalam pesan. Rinciannya di [F03](feedback/F03-kirim-whatsapp.md) bagian 6. [OI-10](../pertanyaan-terbuka.md) harus selesai sebelum data sungguhan tersimpan di server yang terjangkau internet. |
| Status desil dan kategori Gakin adalah data sosio-ekonomi keluarga, bukan data kesehatan anak | Salah pakai di luar pelaporan gizi | Dipakai hanya sebagai kolom breakdown pada rekap F1, tidak pernah menjadi dasar vonis apa pun terhadap anak. Aksesnya mengikuti peran, sama seperti NIK. |
