# Ekspor laporan Posyandu

Tombol **Unduh Excel** pada Laporan menghasilkan workbook dengan dua lembar
laporan di depan dan Petunjuk di belakang. Acuannya adalah `SEPT_REKAP` dalam
`9_SEPT_MASTER Z SCORE_PERMENKES vs WHO (1).xlsx` serta `2T-6T SEPT 2026` dalam
`9-SEPTEMBER 2T-6T.xlsx` yang diberikan Posyandu.

## Susunan

- **Rekap Z Score**: nomor, nama lengkap, RT, jenis kelamin, umur lengkap,
  hasil ukur (BB, TB/PB, LILA, LIKA, N/T), kemudian enam kelompok indeks.
  Di setiap indeks, pasangan Z-score/status Permenkes berada sebelum WHO.
- **Historis 2T+**: nomor kelompok, status 2T/3T/dst., bulan, identitas dan
  hasil ukur. Satu kelompok berisi rangkaian T yang masih aktif pada periode
  laporan. Anak yang pernah 2T tetapi sudah N atau tidak diukur pada periode
  terpilih tidak termasuk. Pengelompokan memakai ID anak, bukan nama/NIK.
- **Petunjuk** menjelaskan satuan, umur, status, dan pembaruan laporan.

Header bertingkat, warna kelompok, penanda panah, font Calibri, garis tabel,
filter, panel beku, serta cetak A4 landscape mengikuti pola contoh. Header
diulang saat cetak; area cetak mengikuti jumlah data, bukan batas baris tetap
dari file September. Tabel lebar memakai skala 65% seperti referensi dan dapat
tercetak pada beberapa halaman mendatar. Kolom umur diperlebar untuk format
`2Thn8Bln4Hari`; N/T ditambahkan pada kelompok hasil ukur sesuai permintaan.

Nilai angka tetap numerik (Z-score dan BB dua desimal; ukuran cm satu desimal).
Kategori memakai singkatan contoh melalui pemetaan label, tanpa mengganti
ambang penilaian. Warna peringatan memakai conditional formatting berdasarkan
label kategori. Nilai yang belum tersedia tetap kosong, bukan nol.

Kolom tersembunyi setelah tabel menyimpan ID anak, NIK, tanggal lahir, orang
tua, tanggal ukur, umur hari, N/T arsip, kenaikan BB, dan KBM. Kolom ini tidak
masuk area cetak. Berkas ekspor adalah snapshot layanan laporan: perubahan
manual angka di Excel tidak menghitung ulang Z-score; unduh ulang setelah
data aplikasi diperbarui.

## Pemeliharaan

- `server/src/services/laporan-excel-layout.ts`: header, warna, format angka,
  conditional formatting, panel beku, dan pengaturan cetak.
- `server/src/services/laporan-export.ts`: pemetaan data dan kelompok riwayat.
- `server/src/services/laporan-service.ts`: pemilihan periode dan rangkaian 2T+.
- `server/src/services/laporan-perhitungan.ts`: penilaian dan hitungan T berurutan.

Data contoh pasien tidak disertakan dalam template kode. Pemeriksaan lokal
dan contoh hasil ekspor berada dalam folder yang diabaikan Git,
`output/excel-reference/`.
# Arsip riwayat 2T bulanan

Riwayat petugas yang hanya mencantumkan bulan disimpan di `riwayat_2t_arsip`
(migrasi 016), terpisah dari pengukuran bertanggal. Setiap baris terikat ke ID
anak, bulan laporan, bulan riwayat, batch impor, sheet, dan baris sumber.
Tanggal ukur dan umur hari tidak dibuat-buat. Nilai ukur, umur bulan, dan
Z-score arsip mengikuti file sumber, sehingga dapat berbeda dari perhitungan
harian pada rekap pengukuran aplikasi.

Status 2T–6T arsip menjadi dasar pada bulan laporan tersebut. Pengukuran bulan
berikutnya meneruskan jumlah T hanya jika tetap T dan bulannya berurutan.
Kenaikan N, ketidakhadiran, atau jeda bulan menghentikan rangkaian. Penggabungan
web dan Excel memakai ID anak + periode untuk menghindari riwayat ganda.
Kolom sumber membedakan arsip petugas dan pengukuran aplikasi.

Kenaikan berat badan juga dihitung untuk baris arsip: `(BB bulan ini - BB
bulan sebelumnya) × 1000` gram, hanya untuk anak yang sama pada bulan
berurutan. KBM memakai umur bulan pada baris terkait dengan aturan yang sama
seperti pengukuran aplikasi. Bulan pembanding yang hilang tetap menghasilkan
nilai kosong, sedangkan berat yang sama menghasilkan kenaikan 0 gram.
Riwayat arsip membandingkan nilai BB arsip yang ditampilkan; bila arsip tidak
memiliki bulan sebelumnya, pengukuran bertanggal dapat menjadi pembanding.
Rekap pengukuran memakai pengukuran bertanggal terlebih dahulu lalu arsip
sebagai pelengkap. N/T hasil hitung tidak menimpa status 2T–6T resmi arsip.
