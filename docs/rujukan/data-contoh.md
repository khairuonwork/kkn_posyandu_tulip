# Data contoh

| | |
|---|---|
| **Jenis** | Rujukan |
| **Status** | hidup — berlaku sampai layar membaca data dari server |
| **Perubahan berarti terakhir** | 29 September 2026 |

Semua layar, kecuali Masuk dan Pengaturan › Pengguna dan peran, menampilkan data contoh dari [`client/src/data/contoh/posyandu.json`](../../client/src/data/contoh/posyandu.json). Berkas itu dibuat dari arsip Posyandu Tulip Januari–Juni 2026 oleh skrip [`extract-demo-data.py`](../../client/src/data/contoh/extract-demo-data.py) di folder yang sama. Nama dan NIK sudah diganti; sisanya data asli.

Dipindah dari PRD demo frontend bagian 5 ([`riwayat/layar-demo.md`](../riwayat/layar-demo.md)) pada 29 September 2026. Nomor bagiannya berubah: 5.1 menjadi 1, 5.2 menjadi 2, dan seterusnya.

---

## 1. Sumber

Enam berkas di `E:/TUGAS KULIAH/KKN/REKAP TAHUN 2026/`, di luar repo. Susunannya seragam: 22 kolom, satu sheet per berkas.

| Berkas | Sheet | Baris data |
|---|---|---|
| `JANUARO_2026.XLSX` | `JANUARI_2026` | 101 |
| `FEBRUARI_2026_HASIL.xlsx` | `FABRUARI_2026` | 106 |
| `MARET_2026_HASIL.xlsx` | `MARET_2026` | 108 |
| `APRIL_2026_HASIL.xlsx` | `APRIL_2026` | 108 |
| `MEI_HASIL_EKSTRAK.xlsx` | `MEI` | 109 |
| `REKAP JUNI 2026.xlsx` | `JUNI_2026` | 101 |

Hasilnya 633 pengukuran untuk 123 balita dalam enam periode.

Skrip hanya memakai pustaka standar Python dan hasilnya deterministik. Jalankan dari akar repo, hanya bila arsipnya bertambah:

```bash
python client/src/data/contoh/extract-demo-data.py "E:/TUGAS KULIAH/KKN/REKAP TAHUN 2026"
```

Argumen kedua, berkas master z-score milik pemilik program, opsional. Bila diberikan, z-score tiap balita dibandingkan dengan master itu (bagian 3).

## 2. Anonimisasi

| Bidang | Perlakuan |
|---|---|
| Nama anak, nama orang tua | **Diganti** dengan nama Indonesia yang wajar dan konsisten antar periode |
| NIK anak, NIK orang tua | **Dibangkitkan acak**, tetap 16 digit, tetap konsisten antar periode |
| Tanggal lahir | **Tidak diubah** — lihat alasannya di bawah |
| RT, RW | **Tidak diubah** |
| Jenis kelamin | **Tidak diubah** |
| BB, TB, LILA, LIKA, tanggal ukur | **Tidak diubah** |
| Z-score dan kategori | **Dihitung ulang** dari nilai ukur yang tidak diubah |

Nama asli tidak pernah masuk repo. `posyandu.json` hanya berisi hasil anonimisasi.

**Mengapa tanggal lahir tidak digeser.** Menggeser tanggal lahir menggeser umur, dan umur adalah kunci tabel standar, sehingga seluruh z-score ikut berubah. Padahal angka yang cocok dengan berkas Excel yang berjalan adalah bukti terkuat bahwa perhitungannya benar. Menggeser tanggal ukur bersamaan juga tidak menolong: sebagian pengukuran akan melompat ke bulan berikutnya dan merusak pengelompokan periode.

Akibatnya, kombinasi tanggal lahir, RT, jenis kelamin, dan nilai ukur di satu RW masih bisa ditelusuri orang setempat. Karena itu demo hanya dijalankan lokal; membagikannya lewat tautan publik menunggu keputusan [OI-12](../pertanyaan-terbuka.md#oi-12--privasi-data-demo-pada-link-publik).

## 3. Perhitungan z-score

Dihitung sekali oleh skrip ekstraksi, memakai [`server/db/data/who-lms.json`](../../server/db/data/who-lms.json) dan rumus di [Antropometri](antropometri.md). Hasilnya disimpan di JSON, dan layar hanya membacanya.

Hasil skrip sudah dicocokkan dengan master Juni 2026 milik pemilik program: nol selisih pada BB/U, TB/U, dan LIKA/U. BB/TB tidak dibandingkan karena master memakai cara pencarian tabel yang berbeda (lihat [catatan tahap demo](../riwayat/catatan-tahap-demo.md)).

## 4. Normalisasi

Mengikuti [Migrasi data](migrasi-data.md) bagian 5:

- NIK dibaca sebagai teks.
- Seluruh nilai teks di-*trim*. Kolom `NTOB`, misalnya, berisi `" N"` dengan spasi.
- Nilai `PINDAH RUMAH` di kolom ukur menjadi status kehadiran, **bukan** berat badan 0.
- Umur dihitung ulang dari tanggal lahir dan tanggal ukur; kolom umur di sumber diabaikan.
- Berat lahir bersatuan gram ditandai, tidak dikonversi diam-diam.

## 5. Sebaran Juni 2026

Angka yang diperiksa ulang oleh skrip setiap kali dijalankan (`periksa()`):

| Dimensi | Nilai |
|---|---|
| Jumlah balita | 101 |
| RT | 7 wilayah — RT 1 (39), RT 2 (20), RT 6 (13), RT 3 (8), RT 4 (7), RT 5 (7), RT 7 (7) |
| Jenis kelamin | 45 laki-laki, 56 perempuan |
| Obesitas (BB/TB) | 3 |

Umurnya 1–60 bulan. RT 1 memuat hampir 40% sasaran; ketimpangan ini nyata, bukan buatan.
