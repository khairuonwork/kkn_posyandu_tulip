# Pengecekan masukan Bu Sri — 30 Oktober 2026

Sumber: 17 screenshot yang dikirim pemilik proyek. Pembaruan origin/development
ditarik fast-forward dari c4225ac ke 860a955. Tidak menjalankan impor, reset,
migrasi database live, atau deployment dalam pengecekan ini.

## Pemetaan permintaan ke implementasi

| Permintaan | Hasil pemeriksaan kode dan pengujian |
| --- | --- |
| Tiga distribusi status di Beranda: BB/U, PB/TB-U, BB/PB-TB | Sudah ada di pembaruan; layanan beranda diuji dengan filter RT. |
| Highlight anak bermasalah | Sudah menyaring BB kurang/sangat kurang, pendek/sangat pendek, gizi kurang/buruk dan obesitas. Gizi buruk tetap ditampilkan sebagai kondisi yang perlu perhatian. |
| N dan T serta dropdown RT di Beranda/Statistik | Sudah ada; pengujian mencakup KPI, distribusi, perhatian dan tren per RT. |
| Real D/S hari H berbeda dari D/S setelah sweeping | Sudah ada input per RT dan dua seri cakupan. Nilai belum diisi tetap null, bukan dianggap nol. Uji 45/91 dan penyimpanan hari H lulus. Kehadiran fisik harus diisi berdasarkan catatan kader. |
| Grafik BB/PB dan BB/TB | Komponen grafik berat–tinggi sudah terintegrasi. |
| Garis ±2 SD merah, ±3 SD hitam | Sudah ada pada grafik pertumbuhan; kurva KMS tetap memakai palet KMS. Uji warna lulus. |
| Anak aktif menurut periode, bukan seluruh master | Filter aktifPeriode sudah menggunakan sasaran/anak baru, umur di bawah 60 bulan, serta riwayat pindah. Master tetap tersedia melalui pilihan terpisah. |
| KB Ibu | Profil dan editor sudah tersedia; memerlukan migrasi 024 pada server tujuan. |
| Desil keluarga dan G/NG untuk F1 | Sudah tersedia dan diuji: 1–4 G, 5–10 NG; mengikuti periode dan tidak menimpa ASI. |
| LILA/U Normal/Gemuk/Kurus dalam Excel | Sudah memakai label itu pada tampilan laporan; skor tersimpan dipertahankan. |
| LiLA/LiKA diteruskan selama tiga bulan | Sudah ada; cm September berlaku sampai November, Desember wajib ukur ulang. Sumber cm dijelaskan dalam catatan sel Excel. |
| Historis 2T umur tahun + bulan | Sudah ada pada ekspor dan layanan riwayat laporan. |
| Riwayat pengukuran menampilkan BB/U | Tab profil sudah ada. Ditambahkan juga pada halaman detail riwayat `/balita/:id/riwayat`, memakai penilaian BB_U setiap rekam. |
| Carissa: grafik hilang setelah perubahan nama | Grafik memakai pengukuran per ID, bukan nama; uji dua titik pada umur bulan sama dan sambungan antarperiode lulus. Verifikasi visual kasus Carissa di server aktif masih perlu dilakukan saat rilis. |
| Impor Juli–Agustus | Skrip historis sudah ada, bawaan pratinjau dan --simpan untuk commit. Skrip pelengkap kini menerima --file PATH_EXCEL atau HISTORIS_FILE; tidak bergantung drive E: pembuat. Pelengkap tetap khusus untuk enam ID yang dikonfirmasi, bukan impor umum. |
| Impor hasil ukur melalui Excel Sasaran | Sebelumnya parser membaca nilai tetapi penerbitan sasaran tidak menyimpannya. Kini disambungkan ke transaksi penerbitan, dengan hasil tersimpan/sudah ada/ditahan pada respons dan tampilan. |
| Upload seluruh realisasi Oktober (92 anak) | Menunggu workbook riil yang akan disusulkan Bu Sri. Data demo maupun backup lama tidak dinyatakan sebagai realisasi riil. |

## Aturan impor hasil ukur yang dilengkapi

- Data berasal dari sheet periode yang dipilih, tanggal ukur wajib valid dan berada pada bulan itu.
- Pencocokan memakai NIK/nama, nama baku, tanggal lahir, jenis kelamin dan RT.
  Identitas untuk profil lama diperiksa dari snapshot sebelum pembaruan profil oleh impor.
- Anak baru dapat diukur setelah dibuat oleh penerbitan sasaran pada transaksi yang sama.
- Baris tanpa BB, pindah, tanggal tidak valid, nilai di luar rentang atau identitas duplikat tidak menghasilkan pengukuran baru.
- Hasil ukur anak/periode yang sudah ada dilewati (`ON CONFLICT DO NOTHING`), tidak ditimpa.
- Penilaian WHO dihitung dengan layanan yang sama, lalu sasaran hasil impor ditandai selesai.
  Impor arsip tidak membuat check-in/pemanggilan KMS fiktif.
- Bila posisi PB/TB tidak tersedia, posisi diasumsikan dari usia dan dicatat pada rekam.
- Tindakan ini menggunakan alur penerbitan sasaran yang juga memperbarui master sesuai Excel.
  Untuk impor arsip tanpa mengganti daftar sasaran, gunakan skrip historis bawaan pratinjau.

## Batas verifikasi

Pengecekan ini menggunakan tes logika dengan database tiruan, render komponen grafik,
TypeScript dan build frontend. Belum menjalankan impor pada database operasional
atau memperbarui VM publik. Tidak ada APK baru yang dibuat.

Sebelum rilis, pastikan migrasi 024–026 tersedia pada database tujuan dan uji
profil Carissa, input hari H, dan impor workbook contoh pada lingkungan uji.
Jangan menjalankan utilitas reset Oktober sebagai bagian deployment.
