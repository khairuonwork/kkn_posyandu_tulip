# Format F1 — revisi 24 Oktober 2026

Acuan formulir cetak: F1_FORMAT EXCEL.xlsx, lembar F1 blank format. Acuan susunan data pendukung: 9-SEPTEMBER F1-REV 1.xlsx, lembar RAW DATA FOR F1_ALL. File sumber asli tidak diubah.

- Lembar utama mempertahankan seluruh gaya sel A1:S64, lebar kolom, tinggi baris, merge, margin dan area cetak A1:S64; cetak satu halaman A4 portrait (fit lebar 1 × tinggi 1).
- Ringkasan kanan kembali N/T/B/TOTAL. Kode O tetap dihitung di F1 utama dan total yang ditimbang.
- Sheet RAW DATA FOR F1 RT1, RT2, dan RT3-RT7 mengikuti pengelompokan contoh. RT tambahan mendapat sheet sendiri.
- Jumlah baris menyesuaikan data. Tabel salinan dan arsip Agustus pada berkas contoh tidak disalin menjadi keluaran bulan berjalan.
- Ringkasan sasaran dan keterangan kelengkapan ada di luar area cetak, kolom U mulai baris 3. Tanda ? berarti data belum cukup; bukan nol.
- Kolom manual tetap kosong. Nilai contoh (misalnya 18 kader) tidak dibawa ke laporan.
- Template layout JSON hanya berisi gaya dan label formulir; tidak memuat identitas anak.

Validasi format: tes regresi memeriksa batas cetak, judul gabungan, lebar kolom, label kosong petugas, format angka dan rumus rekap. Gaya angka G15:P38 diseragamkan; total BGM memakai SUM sesuai formulir kosong. Data sumber belum lengkap tetap ditandai ? pada rekap terkait.

Deployment mengikuti alur rilis main. Perubahan format tidak memerlukan migrasi atau pengisian ulang data pengukuran.
