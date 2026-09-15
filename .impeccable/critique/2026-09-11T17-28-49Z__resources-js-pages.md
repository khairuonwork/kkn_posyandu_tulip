---
target: tampilan Portal Posyandu di browser
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 3
p1_count: 2
target_identity: "file:E:\\TUGAS KULIAH\\KKN\\kkn_posyandu_tulip\\kkn_posyandu_tulip\\resources\\js\\pages"
timestamp: 2026-09-11T17-28-49Z
slug: resources-js-pages
---
Method: dual-agent (A: tinjauan desain · B: detektor + bukti terukur peramban)

# Kritik Desain — Portal Posyandu Tulip

Kebersihan mekanis sangat baik (0 kontras gagal, 0 label hilang, 0 galat konsol).
Yang rusak ada di lapisan MAKNA: kata yang artinya terbalik, dua layar yang saling
membantah, dan satu angka laporan yang salah lima kali lipat.

## Skor Kesehatan Desain

| # | Heuristik | Skor | Masalah utama |
|---|---|---|---|
| 1 | Visibilitas status sistem | 2 | Simpan pengaturan menyimpan dalam diam; "Semua perubahan tersimpan." tampil sebelum ada yang disimpan |
| 2 | Kecocokan dengan dunia nyata | 1 | naik/turun di baris alasan = gerak z-score, bertabrakan dengan N = naik SKDN |
| 3 | Kendali dan kebebasan | 2 | Tidak ada urung; "Ubah data" melempar ke daftar 101 baris tanpa saringan |
| 4 | Konsistensi dan standar | 1 | RT 1 vs RT 01; 55 bulan vs 4 tahun 7 bulan; Naik (N) angka vs Naik (N/D) persen |
| 5 | Pencegahan galat | 1 | Berat min 99 kg / maks 30 kg tersimpan tanpa peringatan; batas tak dipakai editor |
| 6 | Pengenalan, bukan pengingatan | 1 | Legenda SKDN hanya title= — hover-only, mati di ponsel |
| 7 | Fleksibilitas dan efisiensi | 2 | Tidak ada editor sama sekali di bawah 768 px |
| 8 | Estetika dan minimalis | 2 | Satu layar penuh dibayar dengan teks 10 px dan kontrol 29 px |
| 9 | Pemulihan dari galat | 2 | EmptyState mewajibkan sebab; tapi spanduk peringatan utama salah fakta |
| 10 | Bantuan dan dokumentasi | 1 | Seluruh teks penjelas hidup di docs/12-14, di luar produk |
| **Total** | | **15/40** | Di bawah pita wajar (20-32) |

Tidak ada heuristik n/a — mode Operate, kesepuluhnya mengikat.

## Verdikt Kekhususan Desain

Kerangka posyandu memakai kulit dashboard admin generik, disetel untuk meja yang
tidak akan ia tempati.

Bukti domain nyata: SKDN kelas satu, NTOB apa adanya dari register, enam kategori
BB/TB PMK 2/2020, RT/RW sebagai satuan agregasi, warna tidak pernah satu-satunya
sinyal (laporan dicetak hitam-putih), koma desimal, CSV dengan ; untuk Excel ID.

Tapi semua yang disentuh pengguna disetel untuk orang lain: app.css:50-70 menetapkan
--spacing 2.25px, isi 10px, label 9px, keterangan 8px — disetujui pemilik produk di
monitor 1920px pada zoom 75%, dengan alasan "dipakai di laptop dengan tetikus, bukan
disentuh jari". Produknya membantah dirinya: ada daftar kartu ponsel, pengalih peran
kaki halaman, navigasi membungkus, tiga petunjuk md:hidden.

Pindaian deterministik: 2 temuan, 1 aturan (overused-font, demo/index.css:16,28).
Keduanya @font-face keluarga sama dipisah unicode-range = 1 isu, bukan 2. Setiap
aturan lain 0 temuan di resources/js/pages, resources/js/components, demo.

Overlay: injeksi berhasil di 5 rute. dark-glow = deteksi-diri (terbukti: 0 elemen
punya box-shadow itu; absen di injeksi pertama, muncul di 4 berikutnya).
layout-transition = CSS mati (0 elemen menganimasikan width; 5 aturan dari
ui/sidebar.tsx shadcn yang tak pernah dirender). Server overlay sudah dihentikan.

Terukur bersih: 0 kegagalan kontras WCAG AA dari 1.870 elemen di 10 kombinasi
rute x viewport; 0 kontrol tanpa label; 0 lompatan judul; 0 id ganda; 0 galat
konsol; 0 permintaan gagal dari 83; 0 luapan mendatar tingkat dokumen.

## Kesan Keseluruhan

Produk ini jujur soal data dan ceroboh soal bahasa. Ia menolak memalsukan nol,
menerbitkan penyebutnya sendiri tanpa diminta, tidak pernah mengarang berat badan.
Lalu ia memakai kata naik untuk sesuatu yang berlawanan dengan artinya di KMS.

Peluang terbesar: naikkan skala tipografi. Komentar app.css sudah menunjuk tuasnya
sendiri — "Naikkan dari sini, jangan dari tempat lain."

## Yang Sudah Bekerja

1. EmptyState membuat penjelasan wajib secara struktural (prop sebab wajib).
2. Panel gizi menolak menyanjung — menerbitkan penyebutnya sendiri tanpa diminta.
3. Nol dipertahankan sebagai nol, kosong sebagai kosong; tabel riwayat mencetak
   alasan baris kosong.

## Masalah Prioritas

### [P0] naik/turun berarti kebalikan dari artinya di posyandu
susunAlasan (demo/store.ts:297) menggambarkan gerak z-score. "Obesitas, turun dari
+4,38 SD" (membaik) beberapa baris dari "Pendek, turun dari -2,44 SD" (memburuk),
40px di bawah KPI "Naik (N) 53" di mana naik jelas baik.
Fix: namai arah anaknya — memburuk/membaik. Sisakan naik/turun untuk kg dan kolom N/T.
Command: /impeccable clarify

### [P0] "Hanya yang perlu perhatian" memulangkan 10 balita, 7 dilabeli "Gizi baik"
Saringan pakai perluPerhatian (semua indeks); kolom pakai BB/TB saja
(demo/store.ts:369-370). Kader akan menyimpulkan penandanya rusak.
Fix: tampilkan indeks pemicu. Minimal "Status gizi (BB/TB)" + "ditandai: Pendek".
Command: /impeccable clarify

### [P0] Detail menampilkan pengukuran periode lain di bawah spanduk yang membantahnya
Periode Februari 2026, Adzkia Cahyani: spanduk "Belum ditimbang pada Februari 2026"
sementara tabel di bawahnya menunjukkan 14 Feb 2026, 7,55 kg. Halaman mencampur umur
Februari dengan pengukuran Juni.
Fix: pilih pengukuran untuk periode yang dilihat dulu; mundur, jangan pernah maju.
Command: /impeccable harden

### [P1] Tidak satu pun elemen interaktif mencapai 44px
Kotak interaktif tertinggi di seluruh aplikasi = 29,3px. Isian pencarian 15px
(bantalan 29px di sekelilingnya mati). Pemilih periode 27px. Isian Pengaturan 25px.
Tombol panel KMS 22,5px. 9px memegang label, header tabel, baris alasan Beranda.
Fix: --spacing 3.25px, --text-base 14px / --text-sm 12px / --text-xs 11px sebagai
lantai; verifikasi ulang kendala satu-layar. Kalau monitor pemilik produk kendala
nyata, pakai preferensi kerapatan per pengguna.
Command: /impeccable adapt

### [P1] Tab Tahunan melaporkan 633 sasaran di RW berisi 123 balita
rekapPerRt mem-flatMap pengukuran 6 periode lalu menghitungnya per RT
(demo/store.ts:461). S jadi jumlah baris penimbangan, bukan jumlah balita. Ini layar
yang menghasilkan angka untuk puskesmas. Terpisah: Harian identik dengan Bulanan.
Fix: S = cacah balita unik, D/S = rerata cakupan bulanan berlabel "rata-rata 6 bulan";
redupkan pemilih periode saat tab aktif.
Command: /impeccable harden

## Bendera Merah per Persona

Bu Eni (52, kader baru, ponsel 375px):
- Kolom pencarian 15px tinggi.
- Tidak bisa mengubah apa pun (editor hidden md:block, anak/index.tsx:309,352) —
  tapi "Tambah balita" ada di headernya.
- Petunjuk palsu "geser ke samping": tabel 356px, wadah 356px.
- Tooltip SKDN title= butuh hover — tidak terjangkau jarinya.

Bu Sri (bidan, 11:40, 60 anak lagi):
- Berdiri di timbangan dengan ponsel; tidak ada editor di bawah 768px.
- Pagar pengamannya sendiri tidak menyala: editor baris tidak membaca Rentang wajar.
- Laporan tidak seimbang: Januari RT 02 D=17 tapi N+T+B=18, tanpa penanda.

Pak Dedi (admin/pembina):
- rtTerkunci hanya ke Data Balita (demo/DemoApp.tsx:505). Beranda "Sasaran 101"
  se-RW untuk kader; Laporan menampilkan 7 RT. Dua layar menjanjikan "RT binaannya saja".
- Tiga sumber, tiga jawaban untuk "siapa boleh mengubah batas".

## Observasi Kecil

- Grafik cakupan 6 bulan mengabaikan pemilih periode (pilih Februari, batang
  tersorot tetap "96% Juni 2026").
- RT 1 di Beranda (dashboard.tsx:409) vs RT 01 di layar lain; labelRt() tak diimpor.
- Tiga kata satu vonis: Gizi baik / Berat badan normal / Normal.
- Urutan peringatan terbalik klinis: obesitas selalu di atas pendek dan kurang berat.
- "Ibu: Ujang Suherman" — nama laki-laki di kolom Ibu, baris kedua tampilan bawaan.
- Label bulan grafik batang terpotong 3px di Beranda ponsel (satu-satunya luapan
  tak disengaja yang terukur).
- CSS shadcn mati (ui/sidebar.tsx) dikirim tapi tak pernah dirender.
- Jeda masuk buatan 400ms (demo/Login.tsx:36).

## Pertanyaan untuk Dipikirkan

1. Kalau kader tidak bisa mengubah data di ponselnya, untuk apa tata letak ponselnya ada?
2. Skala huruf disetel ke monitor satu orang pada zoom 75%. Mata siapa produk ini untuk?
3. docs/12-14 tiga kali menulis "ini penampungan, bukan keputusan akhir". Kapan
   penampungan menjadi keputusan?
4. Apa yang terjadi setelah "Perlu tindak lanjut bulan ini."? Dirender identik dengan
   kebalikannya, tanpa tindakan terlampir.
5. Beranda menandai 10 anak; Laporan melaporkan BGM 0 dan Gizi buruk 0 setiap RT
   setiap bulan. Keduanya benar — indeks berbeda. Mana yang pergi ke puskesmas?
