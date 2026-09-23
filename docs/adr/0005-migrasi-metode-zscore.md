# ADR-0005 — Perlakuan riwayat gizi saat metode perhitungan berganti

- **Status:** Accepted
- **Tanggal:** 2026-09-17
- **Terkait:** [ADR-0002](0002-metode-z-score-who-lms.md) — metode LMS WHO yang dipakai sekarang

## Konteks

[ADR-0002](0002-metode-z-score-who-lms.md) sudah menolak "menghitung kedua metode berdampingan" sebagai arsitektur permanen, karena belum ada kebutuhan nyata untuk memelihara dua jalur perhitungan sepanjang waktu.

Sesi klarifikasi 17 September 2026 mengangkat pertanyaan yang berbeda dari itu: bukan soal menghitung dua metode terus-menerus, melainkan **apa yang terjadi pada riwayat lama di satu momen migrasi** — kalau metode hitung gizi (bukan cuma versi tahun standar WHO seperti dicakup DR-06) suatu saat benar-benar diganti total. Data mentah anak (berat, tinggi, dst.) tidak berubah pada momen itu; yang berubah adalah hasil hitungnya (z-score, kategori).

## Keputusan

Pada saat migrasi metode benar-benar terjadi, riwayat lama yang sudah dihitung dengan metode lama **disimpan dengan dua hasil**:

1. Nilai asli hasil metode lama — diarsipkan, tidak pernah berubah, untuk kecocokan dengan laporan yang sudah dicetak atau dikirim ke Puskesmas.
2. Nilai hasil hitung ulang memakai metode baru — untuk tampilan grafik/rekap yang konsisten satu garis tanpa "patahan" di titik pergantian metode.

Ini adalah keputusan **kontinjensi** untuk skenario masa depan, bukan sesuatu yang dibangun sekarang. MVP tetap memakai satu metode (WHO-LMS, [ADR-0002](0002-metode-z-score-who-lms.md)), dengan DR-06 menangani pergantian *versi* standar dalam metode yang sama.

## Alasan

Selaras dengan DR-06 (setiap hasil menyimpan versi standarnya, versi baru ditambahkan bukan menimpa) dan DR-09 (jejak audit atas setiap perubahan data). Keputusan ini berbeda dari alternatif yang ditolak ADR-0002: ADR-0002 menolak "selalu hitung dua metode sekaligus" sebagai biaya permanen tanpa kebutuhan nyata, sedangkan ADR-0005 ini hanya berlaku "simpan dua hasil di satu titik migrasi" — biaya sesaat, ditanggung hanya kalau dan ketika kebutuhan itu benar-benar muncul.

## Konsekuensi

- Skema `penilaian_gizi` akan butuh kolom pembeda metode (bukan sekadar `standar_versi` yang menandai versi *dalam* satu metode) — dibuat saat migrasi itu benar-benar terjadi, bukan sekarang. Tidak ada perubahan skema yang perlu dilakukan hari ini.
- UI grafik dan rekap nanti perlu keputusan lanjutan (versi mana yang tampil sebagai default, bagaimana pengguna membandingkan keduanya) — dicatat sebagai pekerjaan untuk saat migrasi tiba, bukan diputuskan sekarang.
- Baris risiko "Standar antropometri diperbarui pemerintah" di [PRD utama](../prd/prd-utama.md) merujuk ADR ini untuk skenario ganti metode, terpisah dari DR-06 yang menangani skenario ganti versi.

## Alternatif yang ditolak

| Alternatif | Alasan ditolak |
|---|---|
| Hitung ulang semua riwayat lama tanpa menyimpan versi asli | Menyalahi DR-06 dan DR-09 — angka yang sudah dilaporkan/dicetak ke Puskesmas bisa berubah tanpa jejak yang jelas. |
| Biarkan riwayat lama apa adanya, tidak dihitung ulang sama sekali | Grafik jadi "patah" secara permanen di titik migrasi tanpa opsi tampilan mulus — ditolak karena pemilik program memilih transparansi dua-versi saat ditanya langsung. |
