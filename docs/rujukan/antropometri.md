# Spesifikasi Antropometri dan Z-Score

| | |
|---|---|
| **Jenis** | Rujukan |
| **Status** | selesai |
| **Perubahan berarti terakhir** | 21 September 2026 |

Dokumen ini adalah spesifikasi teknis mesin perhitungan status gizi. Isinya mengikat implementasi di `server/src/antropometri/` dan diverifikasi oleh `server/test/z-score.test.ts` beserta `penilaian-gizi.test.ts`.

Keputusan metodenya ada di [ADR-0002](../adr/0002-metode-z-score-who-lms.md).

---

## 1. Indeks yang dihitung

| Kode | Nama | Kunci tabel | Deteksi |
|---|---|---|---|
| `BB_U` | Berat Badan menurut Umur | umur (bulan) | *underweight* |
| `TB_U` | Panjang/Tinggi Badan menurut Umur | umur (bulan) | *stunting* |
| `BB_TB` | Berat Badan menurut Panjang/Tinggi Badan | panjang/tinggi (cm) | *wasting*, *overweight* |
| `IMT_U` | Indeks Massa Tubuh menurut Umur | umur (bulan) | *wasting*, *overweight* |
| `LILA_U` | Lingkar Lengan Atas menurut Umur | umur (bulan) | gizi akut |
| `LIKA_U` | Lingkar Kepala menurut Umur | umur (bulan) | mikro/makrosefali |

Keenamnya dihitung untuk setiap pengukuran yang datanya memadai. Menghitung enam sama mahalnya dengan menghitung tiga — satu perulangan atas enum — sementara rekap yang sudah berjalan di Posyandu Tulip memang memakai keenamnya.

Dashboard menonjolkan tiga indeks inti (`TB_U`, `BB_U`, `BB_TB`). Rekap dan *export* memuat keenamnya.

---

## 2. Rumus

### 2.1 Z-score dasar

```text
L != 0 :  Z = ((X / M)^L - 1) / (L * S)
L == 0 :  Z = ln(X / M) / S
```

- `X` — nilai ukur anak (kg, cm, atau kg/m²)
- `L`, `M`, `S` — parameter dari `standar_lms` untuk indeks, jenis kelamin, dan kunci yang sesuai

Ambang `L == 0` diuji sebagai `abs(L) < 1e-7`, bukan perbandingan kesamaan bilangan pecahan.

### 2.2 Koreksi WHO di luar rentang ±3 SD

Untuk nilai di luar ±3 SD, distribusi LMS menjadi tidak stabil. WHO menetapkan ekstrapolasi linear berbasis jarak antar-garis SD terluar:

```text
SD(n) = M * (1 + L * S * n)^(1/L)

Jika Z >  3 :  Z = 3 + (X - SD(+3)) / (SD(+3) - SD(+2))
Jika Z < -3 :  Z = -3 + (X - SD(-3)) / (SD(-2) - SD(-3))
```

**Koreksi ini diterapkan pada:** `BB_U`, `BB_TB`, `IMT_U`, `LILA_U`.

**Tidak diterapkan pada:** `TB_U` dan `LIKA_U`. Keduanya berdistribusi mendekati normal, dan WHO memang tidak mengoreksinya.

Koreksi ini **tidak boleh disederhanakan**. Justru pada rentang inilah kasus gizi buruk dan obesitas berada — kasus yang paling menuntut akurasi.

### 2.3 IMT

```text
IMT = BB_kg / (tinggi_cm / 100)^2
```

Dihitung sistem, tidak pernah diinput.

---

## 3. Menentukan kunci tabel

### 3.1 Umur

Umur **selalu** dihitung sistem dari `anak.tgl_lahir` dan `pengukuran.tanggal_ukur` (DR-03). Kolom `UMUR LENGKAP` dan `UMUR HARI` pada file sumber diabaikan.

Kunci tabel adalah **umur bulan penuh** (*completed months*) menurut selisih kalender, bukan hasil bagi jumlah hari. Contoh: lahir 20 Januari 2026, diukur 13 Juni 2026 → 4 bulan penuh (bukan 4,8).

Tabel WHO per bulan penuh **tidak diinterpolasi**. Anak berumur 4 bulan 24 hari memakai baris bulan 4.

### 3.2 Panjang atau tinggi badan

Kunci tabel `BB_TB` adalah nilai panjang/tinggi dalam cm, dengan langkah tabel 0,5 cm. Nilai di antara dua baris **diinterpolasi linear** pada ketiga parameter `L`, `M`, dan `S`.

Contoh: tinggi 67,3 cm → interpolasi antara baris 67,0 dan 67,5 dengan bobot 0,6.

### 3.3 Konversi PB ↔ TB

`pengukuran.jenis_ukur` menyimpan cara pengukuran: `PB` (telentang) atau `TB` (berdiri). Selisih sistematis keduanya adalah 0,7 cm. Aturan WHO:

| Umur | Diukur | Aksi sebelum mencari tabel |
|---|---|---|
| < 24 bulan | `PB` | dipakai apa adanya |
| < 24 bulan | `TB` | **+ 0,7 cm** |
| ≥ 24 bulan | `TB` | dipakai apa adanya |
| ≥ 24 bulan | `PB` | **− 0,7 cm** |

Nilai hasil konversi hanya dipakai untuk perhitungan. Nilai yang **disimpan dan ditampilkan** tetap nilai ukur asli beserta `jenis_ukur`-nya.

Bila `jenis_ukur` tidak diketahui, cara ukur diasumsikan sesuai umur (< 24 bulan → PB, ≥ 24 bulan → TB) dan asumsi itu **dicatat pada hasil**, agar tidak menyamar sebagai fakta.

### 3.4 Batas rentang tabel

| Indeks | Rentang kunci yang tersedia |
|---|---|
| `BB_U`, `TB_U`, `IMT_U`, `LIKA_U` | umur 0–60 bulan |
| `LILA_U` | umur **6–60 bulan** (tabel LMS tersedia sejak 3 bulan, tetapi PMK 2/2020 dan pelaporan Posyandu Tulip memakai 6–60; master Juni 2026 menandai anak di bawah 6 bulan sebagai `USIA <6BLN`) |
| `BB_TB` | panjang/tinggi 45,0–120,0 cm |

Nilai di luar rentang → hasil **kosong**, bukan hasil ekstrapolasi (DR-07).

---

## 4. Kategori status gizi

Ambang mengikuti **PMK No. 2 Tahun 2020**. Metode perhitungannya WHO LMS, tetapi ambang pembacaannya identik — lihat [ADR-0002](../adr/0002-metode-z-score-who-lms.md).

### 4.1 BB/U — Berat Badan menurut Umur

| Rentang Z | Kategori |
|---|---|
| `Z < -3` | Berat badan sangat kurang (*severely underweight*) |
| `-3 <= Z < -2` | Berat badan kurang (*underweight*) |
| `-2 <= Z <= 1` | Berat badan normal |
| `Z > 1` | Risiko berat badan lebih |

### 4.2 PB/U atau TB/U — Panjang/Tinggi Badan menurut Umur

| Rentang Z | Kategori |
|---|---|
| `Z < -3` | Sangat pendek (*severely stunted*) |
| `-3 <= Z < -2` | Pendek (*stunted*) |
| `-2 <= Z <= 3` | Normal |
| `Z > 3` | Tinggi |

**Stunting** = kategori "pendek" atau "sangat pendek", yaitu `Z < -2`.

### 4.3 BB/PB atau BB/TB — Berat Badan menurut Panjang/Tinggi Badan

| Rentang Z | Kategori |
|---|---|
| `Z < -3` | Gizi buruk (*severely wasted*) |
| `-3 <= Z < -2` | Gizi kurang (*wasted*) |
| `-2 <= Z <= 1` | Gizi baik (normal) |
| `1 < Z <= 2` | Berisiko gizi lebih |
| `2 < Z <= 3` | Gizi lebih (*overweight*) |
| `Z > 3` | Obesitas |

### 4.4 IMT/U — Indeks Massa Tubuh menurut Umur

Kategori dan ambangnya sama persis dengan BB/TB (bagian 4.3).

### 4.5 LIKA/U — Lingkar Kepala menurut Umur

| Rentang Z | Kategori |
|---|---|
| `Z < -2` | Mikrosefali |
| `-2 <= Z <= 2` | Normal |
| `Z > 2` | Makrosefali |

### 4.6 LILA/U — Lingkar Lengan Atas menurut Umur

⚠️ **Terbuka.** PMK 2/2020 menyediakan tabel standar LILA/U, tetapi program Posyandu di lapangan umumnya memakai ambang LILA **absolut** (mis. < 11,5 cm gizi buruk akut) dan bukan kategori berbasis z-score.

Sampai pemilik program mengonfirmasi, sistem **menghitung dan menampilkan z-score LILA/U tanpa memberi label kategori**. Lihat [`pertanyaan-terbuka.md`](../pertanyaan-terbuka.md) isu OI-04.

---

## 5. Sumber data standar

### 5.1 Berkas sumber

`E:/TUGAS KULIAH/KKN/ref kemenkes & who.xlsx`, sheet `Lembar1`. Berkas ini berada **di luar repo** dan tidak boleh menjadi dependensi *runtime*.

Nilainya diekstrak sekali ke `server/db/data/who-lms.json`, yang **di-*commit* ke repo** dan menjadi sumber *seed* tabel `standar_lms`.

### 5.2 Tabel LMS di berkas sumber

Dua belas tabel bernama (*Excel named table*), sudah diverifikasi isinya:

| Nama tabel | Rentang sel | Kolom kunci | Baris |
|---|---|---|---|
| `LMS_BB_PER_U_L` / `_P` | `F465:I526` / `A465:D526` | `Month` 0–60 | 61 |
| `LMS_TB_PER_U_L` / `_P` | `F529:I590` / `A529:D590` | `Month` 0–60 | 61 |
| `LMS_BB_PER_TB_L` / `_P` | `F593:I744` / `A593:D744` | `Length` 45,0–120,0 (langkah 0,5) | 151 |
| `LMS_IMT_PER_U_L` / `_P` | `F747:I808` / `A747:D808` | `Month` 0–60 | 61 |
| `LMS_LIKA_PER_U_L` / `_P` | `F811:I872` / `A811:D872` | `Month` 0–60 | 61 |
| `LMS_LILA_PER_U_L` / `_P` | `F876:I934` / `A876:D934` | `Month` 3–60 | 58 |

Total **906 baris** untuk versi standar `WHO-2006`.

Berkas ini juga memuat tabel SD Permenkes (`STD_*`). Tabel-tabel itu **tidak dipakai** untuk perhitungan; disimpan sebagai rujukan dan bahan pembanding manual.

### 5.3 ⚠️ Temuan pada kolom `L` tabel BB/TB

Verifikasi isi berkas menunjukkan:

- `LMS_BB_PER_TB_L` (laki-laki): kolom `L` bernilai **−0,3521 pada seluruh 151 baris** (45,0–120,0 cm).
- `LMS_BB_PER_TB_P` (perempuan): kolom `L` bernilai **−0,3833 pada seluruh 151 baris**.

Standar WHO sendiri memisahkan dua kurva untuk indeks ini — *weight-for-length* (posisi telentang, 45–110 cm) dan *weight-for-height* (posisi berdiri, 65–120 cm) — dengan parameter `L` yang berbeda antar keduanya. Kolom `M` dan `S` pada berkas ini berubah sepanjang baris seperti yang diharapkan; hanya kolom `L` yang konstan.

Pola ini konsisten dengan kolom `L` yang terisi satu nilai lalu disalin ke seluruh baris, sehingga sebagian rentang memakai `L` dari kurva yang lain.

**Keputusan sementara:** *seed* mengambil berkas **apa adanya**, tanpa koreksi diam-diam. Alasannya:

1. Berkas ini adalah standar yang **sedang dipakai** program Posyandu Tulip. Mengubahnya sepihak akan membuat angka aplikasi berbeda dari laporan yang sudah disahkan, tanpa persetujuan pemilik data.
2. Kriteria keberhasilan S1 justru menuntut kecocokan dengan perhitungan yang berjalan.
3. Skema `standar_lms` menyimpan `L` **per baris**, bukan per tabel, sehingga koreksi nanti cukup dengan *seed* versi standar baru — tanpa perubahan skema maupun kode.

Temuan ini terdaftar sebagai isu OI-05 dan perlu dikonfirmasi ke pemilik program sebelum rilis produksi.

---

## 6. Kontrak implementasi

Lokasi: `server/src/antropometri/`.

```text
Indeks           enum  BB_U, TB_U, BB_TB, IMT_U, LILA_U, LIKA_U
JenisKelamin     enum  L, P
JenisUkur        enum  PB, TB

StandarLmsRepository
    cari(versi, indeks, jk, kunci): ?Lms     interpolasi linear bila perlu

ZScore
    hitung(indeks, jk, kunci, nilai): ?float  rumus 2.1 + koreksi 2.2

Kategori
    dari(indeks, z): ?string                  tabel bagian 4

PenilaianGiziService
    untukPengukuran(Pengukuran): Collection<PenilaianGizi>
```

Aturan yang mengikat:

1. **Seluruh tabel `standar_lms` dimuat sekali per proses** dan disimpan di memori dengan kunci `versi|indeks|jk`. Tidak ada *query* per anak. 906 baris muat dengan nyaman di memori.
2. **Tabel standar tidak pernah dikirim ke browser.** Perhitungan hanya terjadi di *backend*.
3. **Mengembalikan `null`**, bukan nilai dugaan, bila salah satu prasyarat tidak terpenuhi: tanggal lahir, jenis kelamin, tanggal ukur, nilai ukur, atau baris standar yang sesuai (DR-07).
4. **Setiap `penilaian_gizi` menyimpan `standar_versi`** yang dipakai saat perhitungan (DR-06).
5. **Perhitungan ulang bersifat *idempotent*.** Menjalankan ulang untuk pengukuran yang sama dan versi standar yang sama menimpa baris yang ada, bukan menambah baris baru. Dijamin `unique(pengukuran_id, indeks, standar_versi)`.

---

## 7. Nilai tidak wajar

WHO menetapkan rentang nilai yang secara biologis tidak masuk akal. Nilai di luar rentang ini **ditandai, bukan dibuang** — nilai aslinya tetap disimpan dan tetap terlihat, disertai penanda agar Bidan dapat memeriksanya.

| Indeks | Ditandai bila |
|---|---|
| `BB_U` | `Z < -6` atau `Z > 5` |
| `TB_U` | `Z < -6` atau `Z > 6` |
| `BB_TB` | `Z < -5` atau `Z > 5` |
| `IMT_U` | `Z < -5` atau `Z > 5` |
| `LIKA_U` | `Z < -5` atau `Z > 5` |
| `LILA_U` | `Z < -5` atau `Z > 5` |

Penandaan ini berbeda dari kategori status gizi. Anak dengan gizi buruk nyata (`Z = -3,5`) tidak ditandai; nilai `Z = -12` hampir pasti salah input dan itulah yang ditandai.

---

## 8. Verifikasi

*Acceptance test* utama seluruh sistem: `server/test/z-score.test.ts`. Salinan peramban di `client/src/lib/z-score.ts` diikat ke acuan yang sama lewat `client/test/z-score.test.ts`.

| Aspek | Cara uji |
|---|---|
| Kecocokan dengan perhitungan berjalan | Sekitar 10 anak dari `Output Laporan/6_JUNI 2026_MASTER Z SCORE_PERMENKES vs WHO.xlsx` beserta z-score kolom WHO-nya. Selisih < 0,01. |
| Rumus `L == 0` | Kasus buatan dengan `L = 0`; hasilnya harus sama dengan `ln(X/M)/S`. |
| Koreksi di luar ±3 SD | Nilai ekstrem pada `BB_TB`; hasilnya harus mengikuti rumus 2.2, bukan LMS mentah. |
| Tidak ada koreksi pada `TB_U` | Nilai ekstrem pada `TB_U`; hasilnya harus tetap LMS mentah. |
| Interpolasi panjang badan | Tinggi 67,3 cm; hasilnya harus di antara baris 67,0 dan 67,5. |
| Konversi PB/TB | Anak 30 bulan diukur `PB`; kunci tabel harus berkurang 0,7 cm. |
| Umur bulan penuh | Lahir 20 Jan 2026, ukur 13 Jun 2026 → bulan ke-4, bukan ke-5. |
| Batas rentang | Panjang 44,0 cm dan umur 61 bulan → hasil `null`, bukan *exception*. |
| Data tidak lengkap | Tanggal lahir kosong → seluruh indeks `null`. |
| Idempoten | Hitung ulang dua kali → jumlah baris `penilaian_gizi` tidak bertambah. |

---

## 9. Hasil verifikasi terhadap data berjalan

Implementasi dan berkas *seed* diverifikasi terhadap `Output Laporan/6_JUNI 2026_MASTER Z SCORE_PERMENKES vs WHO.xlsx` — perhitungan yang sedang dipakai Posyandu Tulip. Seluruh baris berdata pada keenam sheet indeks diperiksa.

| Indeks | Baris diperiksa | Selisih maks | Baris > 0,01 | Beda nilai LMS terhadap seed |
|---|---:|---:|---:|---:|
| BB/U | 96 | 0,000000 | 0 | 0 |
| TB/U | 96 | 0,000000 | 0 | 0 |
| BB/TB | 96 | 0,100621 | 3 | 0 |
| IMT/U | 96 | 0,089429 | 3 | 0 |
| LILA/U | 88 | 0,220597 | 2 | 0 |
| LIKA/U | 95 | 0,000000 | 0 | 0 |

**Seed: nol perbedaan.** Nilai `L`, `M`, dan `S` hasil ekstraksi ke `who-lms.json` sama persis dengan yang dipakai berkas berjalan pada seluruh 567 baris berdata.

**Formula: cocok sempurna pada 287 baris** (BB/U, TB/U, LIKA/U) — selisih 0,000000.

**Delapan baris berbeda, dan seluruhnya terjelaskan.** Kedelapan baris itu memiliki z di luar ±3 SD pada indeks berbasis berat. Berkas Excel memakai rumus LMS polos; aplikasi menerapkan ekstrapolasi WHO (bagian 2.2). Ini perbedaan yang **disengaja dan diinginkan**: pada rentang itu rumus LMS polos memang tidak akurat.

Yang penting: **tidak ada satu pun kategori status gizi yang berubah.** Ketiga baris BB/TB tetap `Obesitas`, ketiga baris IMT/U tetap `Obesitas`, dan kedua baris LILA/U tetap berada di atas +3 SD. Angka z bergeser paling jauh 0,22; labelnya tidak.

Cara mengulang verifikasi: seluruh nilai harapan tercatat sebagai *dataset* di `server/test/z-score.test.ts`, dalam bentuk anonim (jenis kelamin, kunci tabel, nilai ukur, z harapan) tanpa nama maupun NIK. Acuan kesetaraan terhadap implementasi PHP lama dibekukan di `server/test/acuan-php.json`.

---

## 10. Status pertumbuhan N/T/O/B dan tabel KBM

Bagian ini **bukan z-score**. Z-score membandingkan seorang anak dengan populasi acuan pada satu saat; status pertumbuhan membandingkan anak dengan **dirinya sendiri bulan sebelumnya**. Keduanya dapat berselisih arah — anak bergizi baik bisa berstatus `T`, dan sebaliknya — dan itu memang seharusnya.

Sumber: `Output Laporan/FILE PERTUMBUHAN ANAK 2025-2026.xlsx` sheet `DATA ANAK` (definisi N/T dan tabel KBM) serta `Output Laporan/F1 revised format proposal.xlsx` (definisi O dan B). Dibedah 21 September 2026; menutup sebagian besar [OI-01](../pertanyaan-terbuka.md#oi-01--definisi-ntob-dan-aturan-1t2t3t).

### 10.1 Definisi keempat huruf

| Kode | Definisi menurut berkas pemilik program |
|---|---|
| `N` | Grafik BB/U mengikuti garis pertumbuhan, **atau** kenaikan BB sama dengan KBM atau lebih |
| `T` | Grafik BB/U mendatar atau menurun memotong garis pertumbuhan di bawahnya, **atau** kenaikan BB kurang dari KBM |
| `O` | Ditimbang bulan ini tetapi **tidak** ditimbang bulan lalu |
| `B` | Baru pertama kali hadir dan ditimbang di posyandu bulan ini |

`N` dan `T` masing-masing punya dua kalimat yang dihubungkan "atau". Yang dapat dihitung tanpa menafsir adalah cabang KBM-nya; cabang "mengikuti garis pertumbuhan" menuntut pembacaan bentuk kurva dan **tidak diterjemahkan menjadi kode** — lihat 10.4.

### 10.2 Tabel KBM

KBM — Kenaikan Berat Badan Minimal — adalah tambahan berat terkecil yang masih dianggap naik pada umur tersebut.

| Umur (bulan) | KBM |
|---:|---:|
| 1 | 800 g |
| 2 | 900 g |
| 3 | 600 g |
| 4 | 600 g |
| 5 | 500 g |
| 6 | 400 g |
| 7–10 | 300 g |
| 11–60 | 200 g |

Umur 0 tidak punya KBM: belum ada penimbangan sebelumnya untuk dibandingkan.

Nilai 7–10 dan 11–60 berasal dari sel gabungan (`K16:N16` dan `O16:AB16`), dan 24–60 dari `D28:AN28` — sudah diperiksa langsung ke definisi `mergeCell` berkasnya, bukan disimpulkan dari sel yang tampak kosong.

⚠️ **KBM bulan ke-3 perlu dikonfirmasi.** Berkas menuliskan **600 g**, sedangkan tabel KBM Kemenkes yang lazim beredar menyebut **800 g** untuk bulan ke-3 (pola menurun 800 · 900 · 800 · 600 · 500 · 400). Angka ini menentukan vonis `N`/`T` setiap bayi berumur tiga bulan, jadi selisihnya tidak boleh diputuskan sepihak.

### 10.3 Aturan turunan dan pemeriksaan mandiri

**`2T`** — dipakai F1 butir 10 — berarti dua penimbangan **berturut-turut** berstatus `T`. Dasarnya sheet `DATA ANAK` yang menghitung N/T per kolom penimbangan, bukan per bulan kalender; bulan tanpa penimbangan dilewati, tidak dianggap `T`. `1T` dan `3T` tidak muncul di blangko F1 sama sekali.

**Identitas rekap.** F1 butir 7 menyatakan `D = N + T + O + B`. Keempat status karena itu saling lepas dan menutup: tiap anak yang ditimbang jatuh ke tepat satu status. Bila jumlahnya tidak sama, rekapnya salah — pemeriksaan yang murah dan wajib ada.

**Urutan penentuan** yang mengikuti definisi di atas:

```text
belum pernah ditimbang sebelumnya      -> B
tidak ditimbang pada penimbangan lalu  -> O
selisih BB >= KBM(umur)                -> N
selebihnya                             -> T
```

`B` dan `O` diperiksa lebih dulu karena keduanya menyatakan **ketiadaan pembanding**; tanpa pembanding, selisih berat tidak dapat dihitung sama sekali.

### 10.4 Yang sengaja tidak diterjemahkan

**Cabang "mengikuti garis pertumbuhan".** Definisi `N` menerima dua kemungkinan, dan yang kedua menyangkut bentuk kurva anak terhadap garis kurva acuan — bukan satu perbandingan angka. Menerjemahkannya menjadi aturan tunggal berarti memilih tafsir tanpa diminta. Implementasi memakai **cabang KBM saja**, dan perbedaannya perlu diakui: anak yang kurva BB/U-nya jelas menanjak tetapi kenaikannya kurang beberapa gram dari KBM akan dibaca `T` oleh sistem, sementara pembaca grafik manusia mungkin membacanya `N`.

**Huruf `O` tidak pernah muncul di arsip.** Keenam berkas 2026 memuat `N` 350, `T` 235, `B` 35, dan 13 baris kosong — tidak satu pun `O`. Sheet `DATA ANAK` memberi petunjuk sebabnya: pada anak yang bulan sebelumnya absen, baris `N/T` **dikosongkan**, bukan diisi `O`. Dugaan yang wajar: sebagian dari 13 baris kosong itu sebenarnya kasus `O`. Dugaan ini belum dikonfirmasi dan tidak dipakai untuk mengisi data.

Selama status ini belum dihitung sistem, `pengukuran.ntob_raw` tetap menyimpan nilai mentah arsip dan layar menampilkannya apa adanya.

