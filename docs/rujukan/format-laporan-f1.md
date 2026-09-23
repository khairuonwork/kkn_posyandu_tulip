# Format Laporan F1 Gizi dan Buku 7

| | |
|---|---|
| **Jenis** | Rujukan |
| **Status** | hidup — format masih direvisi pemilik program |
| **Perubahan berarti terakhir** | 21 September 2026 |

Struktur dua blangko laporan resmi yang dipakai Posyandu Tulip, dibedah langsung dari berkas milik pemilik program pada 21 September 2026.

Dokumen ini **rujukan struktur**, bukan spesifikasi fitur. Perilaku layar dan kriteria selesainya ada di [`prd_feedback/F09-laporan-f1.md`](../prd/feedback/F09-laporan-f1.md).

Sebelum ini, [OI-07](../pertanyaan-terbuka.md#oi-07--struktur-format-f1-gizi-dan-buku-7) menyatakan struktur kedua blangko belum dibedah, dan rekap `S D D/S N T O B BGM` yang ada di Portal adalah rancangan desainer — bukan salinan format resmi. Dokumen ini menutup bagian "belum dibedah" itu.

---

## 1. Berkas sumber

| Berkas | Isi yang dipakai |
|---|---|
| `Output Laporan/F1 revised format proposal.xlsx`, sheet `MEI_F1 GIZI_rev format` | struktur F1 lengkap, 22 butir |
| `Output Laporan/6_JUNI 2026_MASTER Z SCORE_PERMENKES vs WHO.xlsx`, sheet `BUKU 7` | struktur Buku 7 beserta sumber data tiap butir |
| `Output Laporan/3_rekap buku 7 _shared.xlsx`, sheet `Lembar Buku 7_Balita` | salinan Buku 7 yang dibagikan |
| `Output Laporan/1-JANUARI F1 2026.xlsx` … `4-APRIL F1 2026_FINAL.xlsx` | F1 format lama, per bulan |

Nama berkasnya sendiri menyebutkannya: `F1 revised format proposal` — formatnya **sedang direvisi**. Struktur di bawah adalah format usulan yang dipakai per Mei 2026, bukan blangko yang sudah disahkan selamanya.

---

## 2. F1 Gizi

### 2.1 Kop laporan

| Ruas | Nilai pada berkas Mei 2026 |
|---|---|
| Kode formulir | `(FI / FII / GIZI / 2026)` |
| Kelurahan | Citeureup |
| Laporan bulan | Mei |
| Penimbangan bulan ini dilakukan tanggal | 9 |
| Posyandu / RW | Tulip / 018 |
| Petugas lapangan yang membina | *(kosong pada berkas)* |
| Jumlah kader yang ada | *(orang)* |
| Jumlah kader aktif bulan ini | *(orang)* |
| Jumlah kader yang sudah dilatih | *(orang)* |

Empat ruas terakhir tidak ada padanannya di basis data Portal. Jumlah kader bukan turunan dari data anak; ia data posyandu, dan saat ini tidak tersimpan di mana pun.

### 2.2 Dimensi pemecahan angka

Butir 1–12 tidak berupa satu angka. Tiap butir dipecah menjadi:

| Dimensi | Nilai |
|---|---|
| Kelompok umur | `0–5 bln` · `6–11 bln` · `12–23 bln` · `24–35 bln` · `36–59 bln` · `JUMLAH` |
| Status ekonomi | `G` · `NG` — pada tiap kelompok umur |
| Jenis kelamin | `L` · `P` — satu baris masing-masing |

Jadi satu butir menghasilkan 6 kelompok × 2 status × 2 jenis kelamin = 24 sel, ditambah kolom `TOTAL`.

**`G` dan `NG` tidak diberi keterangan di berkas mana pun.** Pembacaan yang paling masuk akal adalah `Gakin` dan `Non-Gakin`, sejalan dengan permintaan pemilik program soal pemecahan Gakin di [F08](../prd/feedback/F08-desil-gakin.md). Pembacaan itu **belum dikonfirmasi**, dan datanya memang tidak ada di satu pun berkas sumber — lihat [OI-17](../pertanyaan-terbuka.md#oi-17--sumber-data-status-desil-dan-kategori-gakin).

### 2.3 Butir 1–12: kegiatan penimbangan

| No | Butir | Kode | Cara hitung di Portal |
|---:|---|---|---|
| 1 | Jumlah semua balita yang ada di posyandu bulan ini | `S` | cacah `anak` aktif pada periode |
| 2 | Jumlah balita yang terdaftar dan mempunyai KMS bulan ini | `K` | cacah `anak.buku_kia = true` |
| 3 | Jumlah balita yang Naik Berat Badannya bulan ini | `N` | lihat [04 bagian 10](antropometri.md) |
| 4 | Jumlah balita yang Tidak Naik/Tetap Berat Badannya bulan ini | `T` | idem |
| 5 | Jumlah balita yang Ditimbang bulan ini tetapi Tidak ditimbang bulan lalu | `O` | idem |
| 6 | Jumlah balita yang Baru pertama kali hadir & ditimbang di posyandu bulan ini | `B` | idem |
| 7 | Jumlah balita yang Ditimbang bulan ini | `D` | **`= 3 + 4 + 5 + 6`** |
| 8 | Jumlah balita yang Tidak hadir di posyandu bulan ini | `( - )` | **`= 2 − 7`** |
| 9 | Jumlah balita yang BB berada di Bawah Garis Merah bulan ini | `BGM` | `BB/U` di bawah garis merah KMS |
| 10 | Jumlah balita yang 2× berturut-turut Tidak Naik/Tetap Berat Badannya | `2 T` | dua penimbangan berturut-turut ber-status `T` |
| 11 | Jumlah balita Gizi Buruk **(BB/U)** | `GIZI BURUK` | kategori `BB_U` |
| 12 | Jumlah balita Gizi Kurang **(BB/U)** | `GIZI KURANG` | kategori `BB_U` |

Tiga hal yang mengikat implementasi:

**a. `D = N + T + O + B` adalah identitas, bukan kebetulan.** Blangkonya menuliskan rumus itu sendiri di butir 7. Artinya keempat huruf bersifat saling lepas dan menutup: setiap anak yang ditimbang harus jatuh ke tepat satu di antaranya. Ini sekaligus pemeriksaan mandiri yang murah — bila jumlahnya tidak sama, rekapnya salah.

**b. Butir 8 memakai `K`, bukan `S`.** Yang disebut "tidak hadir" adalah `K − D`, bukan `S − D`. Pada data Posyandu Tulip keduanya berimpit karena seluruh balita punya Buku KIA, tetapi rumusnya tidak boleh diganti diam-diam.

**c. Gizi buruk dan gizi kurang di F1 dihitung dari `BB/U`, bukan `BB/TB`.** Layar Beranda Portal menampilkan sebaran status gizi dari `BB/TB`. Keduanya benar untuk keperluannya masing-masing, tetapi angkanya **akan berbeda**, dan laporan F1 tidak boleh mengambil angka dari kartu Beranda.

### 2.4 Butir 13–22: di luar penimbangan

| No | Butir | Pemecahan |
|---:|---|---|
| 13 | Jumlah balita yang ditimbang bulan ini mencapai umur 36 bulan | `S36`, L/P |
| 14 | Jumlah balita yang mencapai umur 36 bulan pada bulan ini, dengan BB 11,5 kg atau lebih | `L`, L/P |
| 15 | Jumlah balita yang menerima Kapsul Vitamin A | kapsul `BIRU` dan `MERAH`, L/P |
| 16 | Jumlah Bayi | per umur bulan 0–6, L/P, `TOTAL` |
| 17 | Jumlah Bayi dengan ASI Eksklusif | per umur bulan 0–6, L/P, `TOTAL` |
| 18 | Jumlah Ibu Nifas / Vit. A Nifas | orang |
| 19 | Jumlah Ibu Hamil | orang |
| 20 | Jumlah Ibu Hamil KEK (LILA < 23,5 cm) | orang |
| 21 | Jumlah Ibu Hamil yang dapat Tablet FE | orang |
| 22 | Jumlah Bayi yang di IMD | orang |

Butir 18–21 adalah data **ibu**, bukan data balita. Portal tidak memodelkan ibu hamil sama sekali — [PRD utama](../prd/prd-utama.md) membatasi lingkup pada balita. Butir-butir ini karena itu tetap diisi manual, apa pun yang dibangun.

---

## 3. Buku 7

Sheet `BUKU 7` berjudul *"Rekapitulasi Hasil Pemeriksaan Bayi dan Balita (0–59 bulan)"*. Nilainya bukan hanya daftar butirnya, melainkan **kolom keterangan di sebelah kanan yang menyebutkan sumber tiap angka** — itu peta ketergantungan antar laporan, ditulis sendiri oleh yang mengisinya.

### 3.1 Butir dan sumbernya

| Kelompok | Rincian | Sumber menurut berkas |
|---|---|---|
| Jumlah sasaran | `Total`, `Datang`, `Tidak Datang` — masing-masing dipecah `Balita 0–6 bln` dan `Balita & APRAS (≥6 bln–6 thn)` | data dari F1 |
| Ceklis perkembangan | `Lengkap` · `Tidak Lengkap` | konfirmasi dari Bu Indah *(catatan di berkas terpotong)* |
| BB/U (0–5 thn) | `Naik (N)` · `Tidak Naik/BGM/Atas Garis Oranye` · `Gizi Baik` · `Gizi Buruk/Gizi Kurang/Berisiko Gizi Lebih/Obesitas` | dari rekap Laporan Status Gizi |
| TB/U (0–5 thn) | `Normal` · `Sangat Pendek & Pendek/Tinggi melebihi normal` | idem |
| BB/TB | `Gizi Baik` · `Gizi Kurang/Berisiko Gizi Lebih/Gizi Lebih/Obesitas` | idem |
| Lingkar kepala | `Normal` · `Melebihi Normal/Kurang dari Normal` | rekap dari kartu bantu |
| Lingkar lengan atas | `Normal` · `Gizi Kurang/Gizi Buruk` | rekap dari kartu bantu |
| Bergejala TBC | `Memenuhi 2 Gejala` | dari rekap Kartu Bantu |
| Bayi/balita mendapat | ASI Eksklusif (0–6 bln) · MP-ASI (>6 bln, sesuai) · Imunisasi · Vitamin A · Obat Cacing · MT Pangan Lokal · Edukasi | F1; Laporan Status Gizi; imunisasi **mulai diisi bulan Mei dengan menanyakan kepada orang tua saat kegiatan posyandu** |
| Jumlah balita sakit | — | kartu bantu, wajib diisi setiap kegiatan posyandu |
| Jumlah sasaran dirujuk | `Balita 0–6 bln` · `Balita & APRAS (≥6 bln–6 thn)` | dari Buku Laporan Balita khusus |

### 3.2 Tiga hal yang perlu diperhatikan

**Pengelompokan umurnya berbeda dari F1.** Buku 7 memakai `0–6 bulan` dan `≥6 bulan–6 tahun`; F1 memakai lima kelompok `0–5 / 6–11 / 12–23 / 24–35 / 36–59 bulan`. Rekap yang sama harus dapat dipotong dua cara.

**Buku 7 mencakup APRAS (anak prasekolah) sampai 6 tahun**, sedangkan definisi sasaran Portal berhenti di 59 bulan. Anak berumur 60 bulan yang sempat jadi pertanyaan pada [`riwayat/catatan-tahap-demo.md`](../riwayat/catatan-tahap-demo.md) T3 ternyata memang punya tempat di laporan ini.

**"Atas Garis Oranye" adalah istilah baru.** Ia muncul berdampingan dengan BGM sebagai lawan dari `Naik (N)`. Istilah ini tidak ada di PMK 2/2020 maupun di kode Portal, dan belum jelas ambangnya. Belum ditanyakan.

---

## 4. Yang belum ada di Portal

Daftar ini sengaja tidak diubah menjadi rencana kerja; ia hanya mencatat jarak antara blangko dan aplikasi per 21 September 2026.

| Butir blangko | Keadaan di Portal |
|---|---|
| `N` · `T` · `O` · `B` terhitung | belum — `ntob_raw` hanya menyimpan nilai mentah arsip. Aturannya kini diketahui, lihat [04 bagian 10](antropometri.md) |
| `2T` | belum |
| Pemecahan `G`/`NG` | belum — datanya tidak ada, [OI-17](../pertanyaan-terbuka.md#oi-17--sumber-data-status-desil-dan-kategori-gakin) |
| Pemecahan lima kelompok umur | belum — rekap Portal dipecah per RT, bukan per kelompok umur |
| Gizi buruk/kurang menurut `BB/U` | perhitungannya ada, penyajiannya belum |
| `S36` dan BB ≥ 11,5 kg | belum |
| Vitamin A biru/merah, obat cacing, MT pangan lokal | tabel `layanan` sudah dapat menampung, belum diisi maupun ditampilkan |
| Imunisasi | belum — tetapi datanya ternyata ada, lihat [06 bagian 10](migrasi-data.md) |
| Ceklis perkembangan / KPSP | belum — [F13](../prd/feedback/F13-stimulasi-perkembangan.md), tertahan [OI-18](../pertanyaan-terbuka.md#oi-18--naskah-pertanyaan-checklist-stimulasi) |
| Bergejala TBC, balita sakit, dirujuk | belum — rujukan adalah [OI-14](../pertanyaan-terbuka.md#oi-14--rujukan-ke-puskesmas-belum-ada-di-mana-pun) |
| Jumlah kader, data ibu hamil/nifas | di luar lingkup produk saat ini |
