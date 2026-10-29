# Format F1 — revisi 24 Oktober 2026

Acuan: 9-SEPTEMBER F1-REV 1.xlsx, lembar F1_SEPTEMBER 2026 dan RAW DATA FOR F1_ALL. File sumber asli tidak diubah.

- Lembar utama mempertahankan seluruh gaya sel A1:S64, lebar kolom, tinggi baris, merge, margin, skala 85%, dan area cetak asli.
- Ringkasan kanan kembali N/T/B/TOTAL. Kode O tetap dihitung di F1 utama dan total yang ditimbang.
- Sheet RAW DATA FOR F1 RT1, RT2, dan RT3-RT7 mengikuti pengelompokan contoh. RT tambahan mendapat sheet sendiri.
- Jumlah baris menyesuaikan data. Tabel salinan dan arsip Agustus pada berkas contoh tidak disalin menjadi keluaran bulan berjalan.
- Keterangan kelengkapan ada di luar area cetak, U67 dan seterusnya. Tanda ? berarti data belum cukup; bukan nol.
- Kolom manual tetap kosong. Nilai contoh (misalnya 18 kader) tidak dibawa ke laporan.
- Template layout JSON hanya berisi gaya dan label formulir; tidak memuat identitas anak.

Validasi: perbandingan 1216 gaya sel, 19 lebar kolom, 64 tinggi baris, seluruh merge dan pengaturan cetak; render lima sheet; penghitungan ulang Microsoft Excel termasuk perubahan G/NG; tes regresi format F1.

Revisi ini disiapkan lokal. Jangan restart server selama demonstrasi untuk menerapkan revisi tanpa konfirmasi waktu penerapan.
