# Integrasi development ke struktur modular — 5 November 2026

| | |
|---|---|
| Jenis | Riwayat integrasi |
| Status | Beku — catatan rilis |

Pembaruan development `7268e7e`, `a5351dd`, dan `9b68e17` berasal dari basis refactor `a40d51f`. Penggabungan dilakukan fast-forward, tanpa mengganti implementasi dengan salinan halaman lama.

Pembaruan mencakup antarmuka kader, interaksi dan status halaman, penyempurnaan kurva, profil keluarga (jenis KB dan kelompok desil), laporan tumbuh kembang, serta pembatasan konfirmasi KMS. Alur pelatihan dan pemindaian kartu QR lama yang sudah ada tetap digunakan.

Halaman laporan dipisah menjadi pemilih tab, SKDN, controller tampilan live, filter, tabel, ringkasan, bantuan, format umur, dan tipe. Beranda dipindahkan ke folder domain dashboard dengan komponen dan tipe terpisah; jalur impor sebelumnya tetap berfungsi. Tombol unduhan F1 mengikuti izin unduh rekap, sama dengan Excel Z-score dan endpoint API.

Migrasi 028 dan 029 menambah kolom profil keluarga pada tabel operasional dan schema pelatihan yang sedang aktif. Keduanya tidak menghapus atau mengisi ulang hasil pengukuran.

Verifikasi integrasi meliputi TypeScript client/server, tes server dan client, lint modul yang berubah, build produksi, serta perbandingan hasil render sebelum/sesudah refactor pada 15 kombinasi laporan/beranda. Pemeriksaan render ini tidak menggantikan peninjauan visual di browser.
