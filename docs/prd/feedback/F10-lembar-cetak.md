# F10 — Lembar bukti fisik siap cetak

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f10-lembar-cetak` |
| **Bergantung pada** | [F09](F09-laporan-f1.md) — rekap yang dicetak |
| **Terhambat** | — |
| **Perubahan berarti terakhir** | 21 September 2026 |

## 1. Latar

> "Pihak posyandu tetap butuh bukti fisiknya (pendataan dengan kertas)"

Satu kalimat, dan ia membatalkan asumsi yang diam-diam dipegang seluruh proyek: bahwa digitalisasi berarti kertasnya hilang.

Tidak. Kertas di Posyandu bukan kebiasaan lama yang belum sempat ditinggalkan — ia **bukti fisik** yang ditandatangani, diarsipkan, dan diminta saat pemeriksaan. Portal yang tidak bisa mencetak memaksa kader mengetik ulang angkanya ke lembar kertas, yaitu tepat pekerjaan ganda yang hendak dihapus proyek ini.

Saat ini **tidak ada satu pun aturan `@media print` di seluruh repo**. Mencetak halaman mana pun akan ikut mencetak sidebar, tombol, dan bilah saring.

Seperti tombol Unduh CSV, tombol **Cetak A4** pernah ada dan dicabut atas permintaan pemilik produk ([`laporan/index.tsx`](../../../client/src/pages/laporan/index.tsx)). Feedback ini memintanya kembali.

## 2. Lingkup

**Masuk — tiga lembar:**

1. **Daftar hadir & pendaftaran** — satu baris per sasaran, berkolom kosong untuk tanda tangan atau centang. Dicetak **sebelum** kegiatan.
2. **Rekap hasil pengukuran** — hasil satu hari kegiatan, beserta rekap F1 dari [F09](F09-laporan-f1.md). Dicetak **sesudah** kegiatan.
3. **Kartu riwayat anak** — identitas, kurva, dan tabel riwayat satu anak. Dicetak **saat dibutuhkan**, mis. rujukan ke Puskesmas.

**Sengaja tidak masuk:**

- **Pembangkitan PDF.** `window.print()` sudah menghasilkan PDF lewat dialog cetak peramban, di semua peramban, tanpa satu pun dependensi. Pustaka PDF menambah ratusan kilobyte untuk tombol yang sudah ada di dialog itu.
- **Pengaturan halaman di dalam aplikasi** — ukuran kertas, margin, potret/lanskap. Dialog cetak peramban sudah memilikinya, sudah dikenal kader, dan sudah mengingat pilihan terakhirnya.
- **Tata letak cetak tersendiri di React.** Lihat bagian 3 — ini keputusan, bukan kelalaian.

## 3. Perilaku yang diharapkan

Tombol **Cetak** di bilah kepala Laporan dan Detail anak. Ditekan → dialog cetak peramban terbuka dengan halaman yang sudah bersih.

**Cetak dikerjakan CSS, bukan JavaScript.** Tidak ada komponen "versi cetak" tersendiri. Alasannya: dua tata letak untuk satu isi berarti dua tempat yang harus diubah bersama, dan yang cetak adalah yang tidak pernah dibuka siapa pun selama pengembangan — jadi ia yang basi lebih dulu. Satu isi, satu sumber, aturan cetak yang menyembunyikan dan mengatur ulang.

Yang dilakukan `@media print`:

| Disembunyikan | Diubah |
|---|---|
| Sidebar, navigasi, pemilih peran | Latar jadi putih, teks jadi hitam |
| Tombol, bilah saring, pengalih tab | Bayangan dan warna latar kartu dibuang |
| Petunjuk geser `md:hidden` | Wadah bergulir dilepas — **tabel terpotong adalah kegagalan utama fitur ini** |
| Spanduk "Data contoh" | Baris kepala tabel diulang tiap halaman (`thead { display: table-header-group }`) |

Tiga hal yang harus dijaga:

**Tidak ada yang terpotong di tepi kanan.** Seluruh tabel Portal hidup di dalam wadah `overflow-auto` yang menggulir mendatar. Di layar itu benar; di kertas, wadah yang menggulir berarti kolom yang hilang tanpa jejak. Pada cetak wadahnya dilepas dan tabelnya diperkecil sampai muat.

**Kurva KMS ikut tercetak.** Ia SVG, jadi tercetak tajam pada resolusi apa pun — tapi warna pita hijau dan kuningnya hanya keluar bila `print-color-adjust: exact` dipasang. Tanpa itu peramban membuangnya demi menghemat tinta, dan yang tersisa kurva tanpa pita: kartu KMS yang kehilangan justru bagian yang dibacanya.

**Tiap lembar menyebut asal dan waktunya.** Satu baris kepala: nama Posyandu, RW, kelurahan, periode, dan tanggal cetak. Lembar kertas beredar lepas dari layarnya; yang tidak menyebut dirinya sendiri akan tertukar.

## 4. Data & tipe yang berubah

Tidak ada. Seluruhnya tata letak.

Satu kelas pembantu di `app.css`:

```css
/* Elemen yang tidak pernah ikut tercetak. */
.tanpa-cetak { }

@media print { .tanpa-cetak { display: none !important; } }
```

Ditulis sebagai kelas, bukan daftar pemilih panjang di dalam blok `@media print`: pemilih yang menyebut nama komponen akan tertinggal saat komponennya berganti nama, dan tidak ada yang tahu sampai ada yang mencetak.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/app.css` | Blok `@media print`, di ujung berkas. |
| `client/src/pages/laporan/index.tsx` | Tombol Cetak; kepala lembar; `.tanpa-cetak` pada tab dan saringan. |
| `client/src/pages/anak/show.tsx` | Tombol Cetak; kepala lembar. |
| `client/src/components/kms-chart.tsx` | `print-color-adjust: exact` pada pita SD. |
| `client/demo/DemoApp.tsx` | `.tanpa-cetak` pada sidebar dan pemilih peran. |
| `client/src/pages/laporan/lembar-hadir.tsx` | **Baru.** Daftar hadir berkolom tanda tangan. |

## 6. Keputusan terbuka

Tidak ada yang menghambat.

Satu hal yang perlu dikonfirmasi setelah dicoba, bukan sebelum: **apakah daftar hadir perlu kolom tanda tangan atau cukup kolom centang.** Keduanya satu kolom kosong dengan lebar berbeda; jawabannya datang dari mencetak satu lembar dan membawanya ke meja, bukan dari rapat. Bentuk awalnya kolom tanda tangan, yang lebih lebar — memperkecil kolom lebih mudah daripada menemukan ruang untuk memperbesarnya.

## 7. Kriteria terima

Diuji dengan `npm run demo`, lalu **pratinjau cetak peramban** (Ctrl+P):

- [ ] Sidebar, tombol, bilah saring, dan pemilih peran **tidak muncul** di pratinjau.
- [ ] **Tidak ada kolom tabel yang terpotong** di tepi kanan, pada ketiga lembar.
- [ ] Rekap yang lebih dari satu halaman **mengulang baris kepala** di halaman kedua.
- [ ] Kurva KMS tercetak **beserta pita hijau dan kuningnya**, tidak hanya garisnya.
- [ ] Tiap lembar menyebut nama Posyandu, RW, kelurahan, periode, dan tanggal cetak.
- [ ] Daftar hadir memuat seluruh sasaran periode itu beserta kolom kosong untuk diisi tangan.
- [ ] Spanduk "Data contoh" tidak ikut tercetak.
- [ ] Dicetak ke PDF, seluruh teks tetap dapat dipilih dan dicari — bukan gambar.
