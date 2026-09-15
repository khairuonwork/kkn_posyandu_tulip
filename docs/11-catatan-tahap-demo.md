# Catatan Tahap — Demo Frontend

Catatan pengerjaan demo frontend, satu entri per tahap [10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 12.

Berkas ini mencatat tiga hal: apa yang dibuat, apa yang **dibuktikan berjalan**,
dan keputusan yang **ditahan** karena bukan wewenang pengerjaan. Isu produk yang
lebih luas tetap tinggal di [99-open-issues.md](99-open-issues.md); di sini hanya
yang muncul saat membangun demo.

Tidak ada commit selama fase demo. Seluruh perubahan tinggal di *working tree*.

---

## Keputusan yang ditahan

Belum dikerjakan, menunggu jawaban. Tidak ada satu pun yang ditebak di dalam kode.

### D-01 — Jumlah per kategori status gizi di PRD bagian 5.5 tidak dapat direproduksi

| | |
|---|---|
| **Pemilik** | Bidan / pemilik program |
| **Menghambat** | tidak menghambat T2; menghambat klaim angka saat presentasi |

[10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 5.5 menyebut sebaran
Juni 2026 sebagai sesuatu yang "sudah diperiksa langsung dari arsip". Empat dari
enam angkanya cocok; jumlah per kategori status gizi tidak, dan tidak cocok pula
dengan master milik pemilik program.

| Angka | PRD 5.5 | Master `STATUS LMS` | Master `STATUS EXISTING` | Hasil ekstraksi |
|---|---:|---:|---:|---:|
| Jumlah anak Juni | 101 | 100 baris | 100 baris | **101** ✅ |
| Sebaran RT | 39·20·8·7·7·13·7 | — | — | **sama** ✅ |
| Jenis kelamin | 45 L, 56 P | — | — | **sama** ✅ |
| TB/U Pendek | 6 | 4 | 4 | 5 |
| TB/U Tinggi | 4 | 5 | 5 | 0 |
| BB/TB Gizi baik | 81 | 71 | 73 | 83 |
| BB/TB Berisiko gizi lebih | 12 | 11 | 8 | 10 |
| BB/TB Gizi lebih | 1 | 1 | 2 | 1 |
| BB/TB Obesitas | 3 | 3 | 3 | **3** ✅ |
| BB/TB Gizi buruk | — | 1 | 1 | 0 |

Tiga sumber, tiga angka berbeda — jadi tidak ada satu pun yang bisa dijadikan
acuan tanpa bertanya. Sebagian selisihnya sudah punya sebab yang diketahui:

- **TB/U Tinggi.** Master memberi label `Tinggi` pada z +1,16 sampai +1,76,
  sedangkan PMK 2/2020 menetapkan `Tinggi` hanya untuk z > +3 SD. Ini persis
  temuan [OI-11](99-open-issues.md), dan [ADR-0002](adr/0002-metode-z-score-who-lms.md)
  sudah memutuskan aplikasi memakai ambang PMK. Angka **0** karena itu benar
  menurut aturan yang berlaku, bukan kekeliruan.
- **Jumlah yang dihitung.** Master hanya menghitung 87 dari 100 baris; ekstraksi
  ini menghitung 97 dari 101. Selisih pembilang saja sudah membuat jumlah per
  kategori tidak sebanding.
- **BB/TB.** Lihat D-02.

**Sementara ini:** pemeriksaan mandiri skrip hanya menguji angka yang benar-benar
terbaca dari sheet arsip — jumlah anak, sebaran RT, jenis kelamin, dan jumlah
obesitas (satu-satunya kategori yang disepakati ketiga sumber). Kebenaran
perhitungan dibuktikan dengan cara yang jauh lebih kuat: perbandingan z-score
**per anak** terhadap master, bukan jumlah per kategori. Lihat bagian T1.

**Yang dibutuhkan:** konfirmasi angka mana yang dianggap benar, atau izin memakai
hasil perhitungan aplikasi apa adanya dan memperbarui bagian 5.5.

---

### D-02 — BB/TB: interpolasi tabel atau pembulatan ke bawah?

| | |
|---|---|
| **Pemilik** | pemilik berkas standar (Ibu Sri) / Bidan |
| **Menghambat** | kecocokan angka BB/TB saat demo dibandingkan dengan Excel |

Tabel standar BB/TB berlangkah 0,5 cm, sementara tinggi badan anak sering jatuh
di antaranya. Ada dua cara membacanya, dan keduanya sedang dipakai:

| Cara | Dipakai oleh |
|---|---|
| Interpolasi linear antara dua baris | `StandarLmsRepository::cari` dan skrip ekstraksi ini |
| Ambil baris terdekat ke bawah | master Excel, pada 29 dari 87 baris |

Dari 87 baris Juni yang dapat dihitung: 54 cocok pada kedua cara (tingginya
memang jatuh tepat di kelipatan 0,5), 29 hanya cocok dengan pembulatan ke bawah,
dan 4 tidak cocok dengan keduanya. Selisihnya kecil — sekitar 0,02 sampai 0,10 SD
— tetapi cukup untuk memindahkan anak yang berada tepat di ambang +1 SD antara
`Gizi baik` dan `Berisiko gizi lebih`. Itulah sebab utama selisih pada D-01.

Perlu dicatat, [10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 5.3
memang hanya menjanjikan nol selisih pada **BB/U, TB/U, dan LIKA/U** — BB/TB
sengaja tidak disebut. [OI-05](99-open-issues.md) juga sudah menandai kolom `L`
yang konstan pada tabel BB/TB.

**Sementara ini:** interpolasi tetap dipakai, mengikuti keputusan yang sudah
tertulis di `StandarLmsRepository` dan [04-spesifikasi-antropometri.md](04-spesifikasi-antropometri.md).
Mengubahnya hanya agar cocok dengan Excel berarti menyalin cara baca yang belum
tentu disengaja.

**Yang dibutuhkan:** konfirmasi apakah pembulatan ke bawah di Excel disengaja
sebagai metode, atau sekadar akibat `VLOOKUP` yang tidak diminta interpolasi.

---

### D-03 — Dua NIK dipakai dua anak berbeda

| | |
|---|---|
| **Pemilik** | Bidan / kader pencatat |
| **Menghambat** | tidak menghambat demo; menghambat impor ke basis data nanti |

| NIK | Anak | Tanggal lahir | RT |
|---|---|---|---|
| `3277032005230002` | ARZAYYAN E. K. R. | 2023-05-20 | 7 |
| | ARZANDYA D. D. | 2025-10-07 | 4 |
| `3205022304230001` | ASHER G. I. | 2023-04-23 | 6 |
| | ARKANA A. M. | 2023-04-23 | 6 |

Keduanya muncul berdampingan di keenam periode dengan berat dan tinggi yang
berbeda, jadi jelas dua anak — bukan baris ganda. Pasangan pertama bahkan terpaut
dua tahun lima bulan dan beda RT. Pasangan kedua bertanggal lahir sama, mungkin
kembar yang NIK-nya tersalin.

**Sementara ini:** skrip memisahkan keduanya. Penandanya jelas dan tidak
menebak-nebak — satu NIK yang muncul **dua kali pada periode yang sama** pasti
milik dua anak, karena seorang anak tidak ditimbang dua kali dalam satu sesi.
Pemisahan hanya dilakukan pada grup seperti itu; grup lain tidak disentuh, supaya
empat anak yang namanya sekadar berubah ejaan antar bulan (`ALUARO` menjadi
`ALVARO`, `ABRAB` menjadi `ABRAR`) tidak ikut terbelah dan riwayat
pertumbuhannya terputus.

Ini sejalan dengan [06-migrasi-data.md](06-migrasi-data.md) bagian 6:
*"Menggabungkan dua anak yang ternyata berbeda jauh lebih merugikan daripada
meninggalkan dua profil yang menunggu keputusan."*

**Yang dibutuhkan:** NIK yang benar untuk salah satu anak pada tiap pasangan,
supaya arsipnya bisa diperbaiki di sumber.

---

### D-04 — Gerbang `lint:check` dan `types:check` belum bisa lulus di mesin ini

| | |
|---|---|
| **Pemilik** | tim pengembang |
| **Menghambat** | butir 1 pada [10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 14.9 |

Keadaan saat T1 selesai:

| Perintah | Hasil | Sebab |
|---|---|---|
| `npm run format:check` | **lulus** | — |
| `npm run lint:check` | 25 error di 23 berkas, seluruhnya `import/order` | modul `@/routes/*` dan `@/actions/*` tidak dapat di-*resolve* |
| `npm run types:check` | 50 error di 35 berkas, seluruhnya `TS2307 Cannot find module` | idem |

Akarnya satu dan sudah diketahui sejak awal: `resources/js/routes/` dan
`resources/js/actions/` **dihasilkan** oleh plugin Wayfinder yang memanggil
`php artisan` saat Vite berjalan. PHP di mesin ini 8.2 sedangkan `composer.json`
menuntut ^8.3, jadi berkas-berkas itu tidak pernah terbentuk
([10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 1).

Seluruh 75 error berada di berkas bawaan *starter kit* — halaman `teams`, `auth`,
`welcome`, dan komponen yang mengimpor rute. **Tidak satu pun di berkas yang
ditulis untuk demo.**

**Sementara ini:** angka di atas dipakai sebagai garis dasar. Tiap tahap wajib
membuktikan jumlahnya **tidak bertambah**, dan berkas yang ditulis untuk demo
wajib bersih sepenuhnya. Menyatakan tahap gagal karena galat yang sudah ada
sebelum satu baris pun ditulis tidak memberi informasi apa pun.

**Yang dibutuhkan:** konfirmasi bahwa garis dasar ini cara yang diterima, atau
keputusan untuk membuang halaman *starter kit* yang memang tidak dipakai Portal
(`teams`, `welcome`) — sebagian sudah disebut [05-uiux-spec.md](05-uiux-spec.md)
bagian 4.4.

---

### D-05 — Layar Masuk tinggal di `demo/`, bukan menimpa halaman Fortify

| | |
|---|---|
| **Pemilik** | tim pengembang |
| **Menghambat** | tidak menghambat; menentukan berkas mana yang dipakai ulang nanti |

[10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 6.1 merancang layar
Masuk dua panel dengan pemilih peran, sedangkan bagian 10 memetakan Login ke
`pages/auth/login.tsx` dengan controller **Fortify yang sudah ada**. Keduanya
tidak bisa sekaligus: berkas itu kini berisi halaman login *starter kit* lengkap
dengan 2FA dan passkey, dan menimpanya akan merusak jalur autentikasi yang sudah
berfungsi.

Yang menentukan: pemilih peran hanya ada di demo. Bagian 11 menyatakan
autentikasi demo **palsu** dan otorisasinya hanya tampilan, jadi layar ini
memang tidak akan dipakai ulang apa adanya oleh produk.

**Sementara ini:** layar Masuk dibangun sebagai `demo/Login.tsx`, mengikuti
bagian 6.1 sepenuhnya. `resources/js/pages/auth/login.tsx` tidak disentuh.
Ini pilihan yang tidak merusak apa pun dan mudah dibalik.

**Yang dibutuhkan:** keputusan apakah tampilan dua panel bagian 6.1 nanti
dipindahkan ke halaman Fortify, atau halaman Fortify bawaan yang dipakai dan
rancangan 6.1 hanya berlaku untuk demo.

---

## T1 — Skrip ekstraksi dan `posyandu.json`

**Selesai.** Berkas yang dibuat:

| Berkas | Isi |
|---|---|
| `demo/data/extract-demo-data.py` | ekstraksi, normalisasi, anonimisasi, dan perhitungan z-score |
| `demo/data/posyandu.json` | hasilnya, 585 KB |

Hanya pustaka standar Python, mengikuti pola `database/data/extract-who-lms.py`
yang sudah ada — `zipfile` dan `re` membaca XML di dalam `.xlsx` langsung,
sehingga `openpyxl` tidak diperlukan.

### Yang dibuktikan berjalan

```bash
python demo/data/extract-demo-data.py "E:/TUGAS KULIAH/KKN/REKAP TAHUN 2026" \
    "E:/TUGAS KULIAH/KKN/Excel ibu Sri/6_JUNI 2026_MASTER Z SCORE.xlsx"
```

| Pemeriksaan | Hasil |
|---|---|
| Jumlah anak Juni, sebaran RT, jenis kelamin, jumlah obesitas | cocok dengan arsip |
| **Z-score per anak terhadap master Juni 2026** | **BB/U 87 cocok · TB/U 86 cocok · LIKA/U 86 cocok — nol selisih** |
| Determinisme | dua kali jalan, `md5` berkas identik |
| Kebocoran nama asli | nol nama dari arsip muncul di `posyandu.json` |
| Nilai ukur bernilai `0` | nol — ketidakhadiran tidak pernah menjadi berat badan nol |
| Isi | 123 anak · 633 pengukuran · 6 periode · 122 baris garis SD |

Perbandingan per anak terhadap master adalah pemeriksaan terkuat yang tersedia,
dan hasilnya persis seperti yang dijanjikan
[10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 5.3: nol selisih pada
ketiga indeks berkunci umur. Argumen kedua bersifat opsional karena berkas master
berada di luar repo.

Satu baris master dikecualikan dan dicatat di dalam skrip: `JUN_TB_U` baris 77
memuat z-score **210,49** untuk anak bertinggi 87,9 cm — kesalahan rumus di
berkasnya, bukan selisih metode. Nilai yang benar sekitar −1,71.

### Yang ditemukan berbeda dari dokumen

Empat hal, semuanya sudah ditangani; tidak ada yang menuntut keputusan produk.

**1. Lima dari enam berkas 2026 memakai serial Excel, bukan string ISO.**
[06-migrasi-data.md](06-migrasi-data.md) bagian 5.1 menduga hanya arsip 2025 yang
berbentuk serial. Kenyataannya hanya `REKAP JUNI 2026.xlsx` yang memakai string
ISO; 532 baris lainnya berbentuk serial. Bagian yang sama sudah menuntut kedua
bentuk ditangani, jadi skrip menangani keduanya.

**2. Berkas Mei menulis header `BUKU KIA`, lima berkas lain `BUKUKIA`.**
Kolomnya sama. Perbandingan header mengabaikan spasi; susunan kolom yang benar
tetap diperiksa dan berkas yang menyimpang tetap ditolak.

**3. Kolom `JK` memuat `p` huruf kecil pada 16 baris.** Dinormalkan menjadi huruf
besar, sekelas dengan aturan *trim* pada bagian 5.3.

**4. Nilai bukan angka di kolom ukur, empat ragam.** `PINDAH RUMAH`, `PINDAH`,
`Pindah`, dan `P I N D A H` (12 baris) menjadi `statusKehadiran: "pindah"`.
Tanda hubung pada LILA dan LIKA (9 baris) dibaca sebagai kosong, bukan konflik.
Satu baris berisi `APRAS (STLH KOREKSI THN LAHIR)` pada kolom berat menjadi
`tidak_dapat_diukur`, dengan teks aslinya tersimpan di `catatanUkur` sesuai
bagian 5.4. Kolom numerik selalu kosong, tidak pernah `0`.

### Catatan tambahan

**"Dua anak tanpa nama" ada di master, bukan di arsip.**
[10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 5.5 dan 6.4 menyebut
dua anak tanpa nama yang harus tampil sebagai `(nama belum tercatat)`. Di keenam
berkas `REKAP TAHUN 2026/` kolom `NAMA ANAK` **selalu terisi**; yang kosong
adalah kolom `NAMA LENGKAP` pada master z-score, dan master itu bukan sumber
demo. Jadi aturan tampilannya tetap perlu ada, tetapi tidak ada data yang
memicunya. Tidak ada yang perlu diputuskan — hanya perlu diketahui supaya tidak
dicari-cari saat T4.

**Garis SD BB/U ikut ditulis sekarang.** 122 baris parameter LMS untuk umur 0–60
bulan, dipakai kurva KMS di T4. Skrip ini toh sudah membaca `who-lms.json`;
membuat skrip kedua nanti berarti mengerjakan hal yang sama dua kali.

**Anonimisasi.** Nama diambil dari kolam nama yang diacak sekali dengan benih
tetap, dipasangkan menurut urutan anak yang stabil (tanggal lahir, jenis kelamin,
kunci identitas) — sehingga sama di keenam periode dan sama setiap kali skrip
dijalankan. NIK dibangkitkan dari benih tetap dengan **panjang aslinya
dipertahankan**, supaya 8 anak yang NIK-nya memang belum lengkap tetap terbaca
belum lengkap dan baris `NIK belum lengkap` pada bagian 6.4 punya data nyata.
Tanggal lahir, RT, RW, jenis kelamin, dan seluruh nilai ukur tidak diubah.

### Juga dikerjakan

`npm install` dijalankan sekali; `node_modules/` sebelumnya kosong. Tanpa
dependensi baru.

### Belum dikerjakan di T1

Tidak ada. Seluruh isi T1 selesai. Lihat D-01 sampai D-04 untuk hal yang ditahan.

---

## T2 — Kerangka, token, dan layar Masuk

**Selesai.** Berkas yang dibuat atau diubah:

| Berkas | Isi |
|---|---|
| `vite.demo.config.ts` | build demo: React dan Tailwind saja, `base: './'`, keluaran ke `dist-demo/` |
| `demo/index.html` · `main.tsx` · `index.css` | entri mandiri, `<html lang="id">`, `@font-face` lokal |
| `demo/nav.tsx` | `Link`, `Head`, `navigate`, `useAlamat` — router hash, 70 baris |
| `demo/DemoApp.tsx` | shell, state peran, dan router enam alamat |
| `demo/Login.tsx` | layar Masuk bagian 6.1 |
| `demo/store.ts` | sumber data dan selektor dasar |
| `demo/assets/fonts/*.woff2` | Plus Jakarta Sans, dua berkas |
| `resources/js/lib/nav.ts` | titik sambung navigasi versi Inertia |
| `resources/js/types/posyandu.ts` | tipe domain |
| `resources/js/components/filter-periode.tsx` | pemilih periode |
| `resources/css/app.css` | seluruh token bagian 8 |
| `package.json` · `tsconfig.json` · `.prettierignore` · `.gitignore` | naskah dan cakupan perkakas |

`vite.config.ts` tidak disentuh. Nol dependensi npm baru.

### Yang dibuktikan berjalan

Dijalankan dengan `npm run demo`, dibuka di peramban pada 1440 × 900:

| Pemeriksaan | Hasil |
|---|---|
| Layar Masuk | dua panel, pemilih peran tiga kartu, Bidan terpilih bawaan, label mode demo |
| Masuk sebagai Bidan | nav Beranda · Data Anak · Laporan · Pengaturan; **Periode tidak ada** |
| Ganti ke Kader | Pengaturan **hilang dari DOM**, bukan dinonaktifkan |
| Ganti ke Admin | Periode muncul, alamat `#/periode` terbuka |
| Penjaga rute | dari `#/periode` lalu ganti ke Kader → dialihkan ke `#/beranda` |
| Konsol peramban | **nol pesan galat** |
| Rujukan domain luar | **nol** — 57 permintaan jaringan, seluruhnya localhost; huruf dari `/assets/fonts/` |
| `npm run demo:build` | berhasil; 4 berkas, 538 kB JS (97 kB gzip) |
| Hasil build di static host biasa | dibuka lewat `python -m http.server`, 4 permintaan, nol galat konsol |

Gerbang bagian 14.9: `format:check` **lulus**; `lint:check` 25 dan `types:check`
50 — **sama persis dengan garis dasar D-04**, dan **nol** di antaranya berada di
berkas yang ditulis pada tahap ini.

### Yang diperbaiki setelah diperiksa di peramban

Dua cacat aksesibilitas ditemukan saat membaca pohon aksesibilitas, bukan saat
menulis kode:

1. **`Masuk sebagai` terbaca dua kali** di sidebar — ada `<legend>` tersembunyi
   sekaligus `<p>` dengan teks yang sama. `<legend>` dijadikan elemen yang
   terlihat dan `<p>` dibuang.
2. **Radio peran tidak punya `id`**, sehingga hubungan label-kontrol hanya
   bergantung pada pembungkusan implisit. Ditambahkan `id` dan `htmlFor` di
   sidebar maupun layar Masuk; diverifikasi lewat DOM bahwa tiap radio punya
   tepat satu label dengan teks yang benar.

### Keputusan teknis kecil

- **`--sidebar-surface` tidak ditambahkan.** [05-uiux-spec.md](05-uiux-spec.md)
  bagian 2.6 menyebutnya, tetapi shadcn sudah punya `--sidebar` yang tersambung
  ke seluruh komponen sidebar. Menambah token kedua berarti dua nama untuk satu
  warna dengan satu pemakai.
- **Blok `.dark` dipertahankan** meski mode gelap tidak dibangun. Tanpa
  `@custom-variant dark`, kelas `dark:` di `components/ui/**` menjadi utilitas
  yang tidak dikenal. Tidak ada berkas yang memasang kelas `.dark`, dan
  `initializeTheme()` hanya dipanggil dari `resources/js/app.tsx` — entri
  Laravel, bukan entri demo.
- **`demo/data/posyandu.json` masuk `.prettierignore`.** Prettier sempat
  memformat ulang berkas itu, sehingga keluaran skrip dan isi repo berbeda
  setiap kali skrip dijalankan. Berkas hasil tidak ditulis tangan.
- **Cakupan `format:check` diperluas** dari `resources/` menjadi
  `resources/ demo/ vite.demo.config.ts`. Tanpa itu seluruh berkas demo tidak
  pernah diperiksa dan gerbang bagian 14.9 kehilangan artinya.
- **`demo/` masuk `include` di `tsconfig.json`** dengan alasan yang sama, dan
  `resolveJsonModule` diaktifkan agar `posyandu.json` dapat diimpor.

### Catatan untuk T7

Hasil build memuat `<script type="module" crossorigin>`. Peramban menolak modul
ES dari `file://` karena kebijakan CORS, jadi janji "dapat dibuka langsung dari
`file://`" pada bagian 4.1 **belum terbukti** — yang sudah terbukti adalah
"static host mana pun", diuji dengan `python -m http.server`. Kalau membuka
berkas ganda dari flash disk memang dibutuhkan saat presentasi, T7 perlu
menyatukan seluruh aset ke dalam satu berkas HTML. Kalau demo dijalankan dengan
`npm run demo` seperti bagian 9, tidak ada yang perlu diubah.

---

## T3 — Beranda

**Selesai.** Berkas yang dibuat atau diubah:

| Berkas | Isi |
|---|---|
| `resources/js/pages/dashboard.tsx` | halaman Beranda bagian 6.3, menggantikan placeholder *starter kit* |
| `resources/js/lib/format.ts` | seluruh aturan angka bagian 8.2 di satu tempat |
| `resources/js/components/status-gizi-badge.tsx` | **satu-satunya tempat** pemetaan kategori ke nada hidup |
| `resources/js/components/empty-state.tsx` | keadaan kosong yang mewajibkan sebab |
| `demo/store.ts` | selektor `ringkasan`, `statusGizi`, `cakupanEnamBulan`, `perluPerhatian` |
| `demo/DemoApp.tsx` | memasok props Beranda — bagian yang nanti digantikan controller |
| `eslint.config.js` | `dist-demo` masuk daftar abai |

### Yang dibuktikan berjalan

Juni 2026, dibaca langsung dari DOM peramban:

| Bagian | Hasil |
|---|---|
| Empat KPI | S 101 · D 97 · D/S 96% (97 dari 101) · N 53 |
| Status gizi | Gizi baik 83 · Gizi kurang 0 · Gizi buruk 0, disertai kalimat penjelas |
| Cakupan enam bulan | 98% · 99% · 100% · 97% · 95% · 96%, seluruhnya dengan pembilang dan penyebut |
| Perlu perhatian | 10 anak, paling mendesak di atas, tiap baris punya alasan |
| Ganti periode | Januari 2026 → S 101 · D 99 · D/S 98% · N 44 · 9 anak; subjudul ikut berubah |
| Judul tab | berubah menjadi `Beranda — Portal Posyandu Tulip` |
| Konsol peramban | **nol pesan galat** |

Contoh baris `Perlu perhatian`, memperlihatkan aturan angka bagian 8.2 sekaligus
label indeks yang mengikuti umur:

```text
AM  Athaya Mahendra   52 bulan, RT 1   BB/TB +3,92 SD, naik dari +3,75 SD   [Obesitas]
NA  Naura Anggraeni   11 bulan, RT 2   PB/U −2,17 SD, turun dari −1,82 SD   [Pendek]
```

Gerbang bagian 14.9: `format:check` **lulus**; `lint:check` **24** dan
`types:check` **49** — keduanya satu di bawah garis dasar D-04, karena
`dashboard.tsx` tidak lagi mengimpor `@/routes`. Nol galat di berkas yang ditulis
pada tahap ini.

### Yang diperbaiki setelah diperiksa di peramban

1. **Urutan `Perlu perhatian` salah untuk Obesitas.** Semula diurutkan menaik
   menurut z, sehingga `+3,30` berada di atas `+3,92`. Benar untuk kekurangan
   gizi, terbalik untuk kelebihan. Diganti menjadi urut menurut jarak dari
   rentang normal.
2. **ESLint ikut memeriksa `dist-demo/`.** Setelah `npm run demo:build`, jumlah
   galat melonjak dari 25 menjadi 5.893 — seluruhnya dari berkas bundel
   terminifikasi. `dist-demo` dimasukkan ke daftar abai.
3. **Dua `no-unused-vars` di `store.ts`** akibat pola *destructuring* untuk
   membuang field bantu. Diganti dengan penyusunan objek secara eksplisit,
   bukan dengan mematikan aturannya.

### Angka yang berbeda dari dokumen

Dua selisih satu angka, keduanya berasal dari arsip dan bukan dari perhitungan:

| Angka | Dokumen | Terhitung dari arsip | Sebab |
|---|---|---|---|
| Sasaran Juni | 101 (bagian 5.5 dan 9) | **101** | tetapi bagian 6.3 mendefinisikan S sebagai balita **0–59 bulan**, dan satu anak Juni sudah 60 bulan. Mengikuti definisi itu, S menjadi 100 |
| Ditimbang Juni | 96 (naskah presentasi bagian 9) | **97** | 101 baris dikurangi 4 baris bertuliskan `PINDAH` di kolom berat |

Dipilih **101 dan 97**: keduanya terbaca langsung dari sheet Juni, dan 101 sudah
diverifikasi pada T1 terhadap sebaran RT. Anak berumur 60 bulan itu memang masih
terdaftar sebagai sasaran di arsip. Bila pemilik program menghendaki batas
0–59 bulan ditegakkan, satu baris di `ringkasan()` yang berubah.

### Catatan isi data

- **Juni tidak punya satu pun `Gizi kurang` maupun `Gizi buruk`.** Dua dari tiga
  angka besar bernilai nol. Itu keadaan datanya, bukan kekeliruan tampilan —
  anak bermasalah pada periode ini berkategori `Pendek`, `Berat badan kurang`,
  dan `Obesitas`, dan seluruhnya muncul di daftar `Perlu perhatian`.
- **Kolom `NTOB` tidak pernah bernilai `O`** di keenam berkas: hanya `N` 350,
  `T` 235, `B` 35, dan 13 kosong. Kolom `O` pada rekap Laporan (T5) karena itu
  akan bernilai nol di seluruh RT.

### Keputusan teknis kecil

- **`pages/dashboard.tsx` ditimpa**, mengikuti pemetaan bagian 10. Isi lamanya
  hanya `PlaceholderPattern` ditambah `PendingInvitationsModal` milik alur
  undangan tim — alur yang memang akan dinonaktifkan
  ([ADR-0004](adr/0004-reuse-team-sebagai-rbac.md), bagian 10 langkah 2).
- **Baris alasan memakai bentuk z-score, bukan "berat sama dua bulan berturut".**
  Bagian 6.3 memberi dua contoh, tetapi [05-uiux-spec.md](05-uiux-spec.md)
  bagian 5.2 menyusun daftar ini **dari status gizi saja**. Semua barisnya karena
  itu punya kategori bermasalah, dan bentuk z-score berlaku untuk semuanya;
  bentuk kedua akan menuntut aturan pertumbuhan yang tertahan OI-01.
- **`memuat` berupa props yang selalu `false` di demo.** Datanya sinkron,
  sehingga skeleton tidak pernah tampil. Dirancang sekarang karena bagian 6.3
  memintanya dan controller nanti memerlukannya.

### Catatan untuk T7

Di bawah kira-kira 1024 px, sidebar selebar 256 px memaksa badan halaman
menggulir mendatar — melanggar aturan mengikat [05-uiux-spec.md](05-uiux-spec.md)
bagian 7. Sidebar perlu diciutkan atau dijadikan *sheet*. Tidak menghambat demo,
yang menurut bagian 3 dijalankan di laptop.

---

## T4 — Data Anak, Detail anak, dan kurva KMS

**Selesai.** Berkas yang dibuat:

| Berkas | Isi |
|---|---|
| `resources/js/pages/anak/index.tsx` | Data Anak bagian 6.4 |
| `resources/js/pages/anak/show.tsx` | Detail anak bagian 6.5 |
| `resources/js/components/kms-chart.tsx` | kurva pertumbuhan, SVG langsung tanpa pustaka |
| `resources/js/components/z-score-block.tsx` | blok besar di Detail anak |
| `resources/js/components/z-score-cell.tsx` | sel tabel, dengan penanda `tidak_wajar` |
| `resources/js/components/ui/table.tsx` | primitif tabel, dipakai empat layar |
| `demo/store.ts` | `daftarAnak`, `daftarRt`, `detailAnak` |

### Yang dibuktikan berjalan

| Bagian | Hasil |
|---|---|
| Data Anak | 101 baris, kolom sesuai 6.4, `RT 01`–`RT 07` |
| Cari nama anak | `adzkia` → 5 dari 101 |
| Cari **nama ibu** | `Euis` → 5 dari 101 |
| Filter RT 01 | **39 dari 101** — persis angka bagian 9 langkah 3 |
| Hanya perlu perhatian | 10 dari 101, cocok dengan Beranda |
| Tanpa hasil | `Tidak ada anak bernama "zzzz" di seluruh RT.` disertai tombol `Hapus kata pencarian` |
| Peran Kader | `39 dari 101 balita — terkunci ke RT 01`, pilihan RT dinonaktifkan, `Tambah balita` dan `Ubah` hilang |
| Detail, anak ≥ 24 bulan | blok **BB/TB · BB/U · TB/U** |
| Detail, anak < 24 bulan | blok **BB/PB · BB/U · PB/U**, keterangan `panjang badan, telentang` |
| Kurva KMS | 5 pita, 7 garis SD, halo putih di bawah kurva, titik r 7 |
| Garis terputus | 2 lompatan → **3 segmen**; 1 lompatan → **2 segmen**; tanpa lompatan → 1 |
| Satu pengukuran | `Baru satu kali pengukuran — kurva muncul setelah pengukuran berikutnya.` |
| Tooltip titik | `13 Jun 2026 · 12,80 kg · 46 bulan · BB/U −1,54 SD · Berat badan normal` |
| Klik baris riwayat | titik yang bersesuaian membesar dari r 7 menjadi r 10 |
| Konsol peramban | **nol pesan galat** pada delapan halaman detail |

Gerbang bagian 14.9: `format:check` lulus; `lint:check` **24**, `types:check`
**49** — keduanya di bawah garis dasar D-04.

### Tiga cacat yang ditemukan saat diperiksa di peramban

Ketiganya tidak terlihat saat menulis kode, hanya saat mengklik layarnya.

**1. Kurva hilang setiap berpindah anak.** `KmsChart` menyimpan panel umur aktif
di `useState`, dan React memakai ulang instance komponen yang sama ketika alamat
berubah dari satu anak ke anak lain. Panel milik anak sebelumnya tetap terpasang,
sehingga tidak ada satu titik pun yang masuk jendela. Diperbaiki dengan
`key={detail.anak.id}` pada halaman Detail — satu baris, dan sekaligus
mengembalikan baris riwayat yang tersorot.

**2. Pita SD tergambar di luar kartu.** Dengan skala tetap 18 kg, garis +3 SD
untuk anak 46 bulan berada di sekitar 26 kg, sehingga pita atas keluar sampai
y = −208 dan menimpa judul sumbu. Dua perbaikan: bidang plot diberi `clipPath`,
dan `skalaMax` diperlakukan sebagai **batas bawah** — skala naik mengikuti garis
+3 SD panel yang sedang tampil. Kartu KMS cetak pun memakai rentang berat
berbeda untuk tiap lembar umur.

**3. Kunci React bertabrakan pada titik kurva.** Empat belas anak punya dua
penimbangan yang jatuh pada umur bulan penuh yang sama, karena tanggal ukur
bergeser terhadap tanggal lahir. Satu anak bahkan punya dua penimbangan
beruntun dengan berat **persis sama**, 17,1 kg pada 60 bulan, sehingga kedua
titiknya benar-benar berimpit. Kunci akhirnya memakai urutan render.
Konsekuensinya: pada kasus berimpit itu tooltip yang terbaca hanya satu, dan
bedanya cuma tanggal.

### Keputusan teknis

- **`ui/pagination.tsx` tidak dibuat**, meski disebut
  [05-uiux-spec.md](05-uiux-spec.md) bagian 4.2. Daftar terpanjang 101 baris,
  sudah dipersempit pencarian dan filter, dan bagian 9 justru menyuruh
  menunjukkan jumlahnya berubah dari 101 menjadi 39 — paging akan menyembunyikan
  baris yang ingin ditunjukkan. Ditambahkan bila daftarnya nanti tumbuh.
- **Data Anak dibatasi periode terpilih**, bukan seluruh 123 anak lintas enam
  bulan. Bagian 9 menyebut 101 dan 39, dan keduanya angka Juni.
- **Kolom `Pertumbuhan` menampilkan `N, naik` dan seterusnya**, mengikuti bagian
  6.5. Yang ditahan OI-01 adalah aturan turunan 1T/2T/3T, bukan arti hurufnya —
  prototipe desain dan artboard sudah memakai arti yang sama. Keterangan di
  bawah tabel menyebutkan bahwa aturan turunannya belum diterapkan.
- **`Telepon` dan `Kader` tampil `—`.** Keduanya tidak ada di berkas sumber.
  Tempatnya disiapkan, isinya belum ada — sama seperti Imunisasi dan Catatan
  bidan.

---

### D-06 — Kontrak `GrafikKMS` tidak memuat parameter garis SD

| | |
|---|---|
| **Pemilik** | tim pengembang / desainer |
| **Menghambat** | tidak menghambat; menyangkut kesetiaan pada kontrak artboard |

[10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 6.5 menetapkan kontrak
komponen kurva dan menyebutnya "dipakai apa adanya":

```ts
{ kelamin: 'P' | 'L'; panelAwal: number; skalaMax: number; riwayat: [number, number][] }
```

Empat props itu tidak cukup untuk menggambar apa yang diminta bagian yang sama.
Pita dan garis SD dihitung dari `M × (1 + L×S×z)^(1/L)`, dan parameter L, M, S
tidak ada di keempatnya. Bagian 6.5 sendiri menyebut garis SD sebagai bagian dari
**data** halaman, bukan sesuatu yang dikarang komponen.

Tooltip titik juga menuntut lebih: bagian 6.5 meminta tanggal, nilai ukur,
z-score, dan kategori, sedangkan `riwayat` hanya memuat pasangan
`[umurBulan, beratKg]`.

**Sementara ini:** keempat props kontrak dipertahankan persis, lalu ditambah
`garisSd` yang wajib dan `detail`, `umurDisorot`, `onGantiPanel` yang opsional.
Pemanggil yang hanya mengirim empat props asli tetap berjalan, jadi kontraknya
tidak dilanggar — hanya dilengkapi.

**Yang dibutuhkan:** konfirmasi bahwa penambahan ini diterima, atau kontrak
artboard diperbarui agar memuat parameter garis SD.

---

## T5 — Laporan dan unduh CSV

**Selesai.** Berkas yang dibuat: `resources/js/pages/laporan/index.tsx`, ditambah
selektor `rekapPerRt` dan `csvLaporan` di `demo/store.ts`.

### Yang dibuktikan berjalan

| Bagian | Hasil |
|---|---|
| Lima angka, Juni | S 101 · D 97 · D/S 96% (97 dari 101) · N/D 55% (53 dari 97) · BGM 0 |
| Rekap per RT | tujuh baris, `RT 01 39 37 95% 24 13 0 0 0`, ditutup baris `Total 101 97 96% 53 43 0 1 0` |
| Tab Tahunan | S 633 · D 618 · **D/S 98% dihitung ulang dari 618/633**, bukan rata-rata persentase bulanan |
| Tahunan per RT | `RT 01 249 242 97% 133 96 0 14 0`, total `633 618 98% 350 235 0 35 0` |
| Filter RT | menyaring tabel |
| **Unduh CSV** | berkas `posyandu-tulip-2026-06.csv`, 19.701 byte, 101 baris data |
| BOM UTF-8 | tiga byte pertama `EF BB BF` |
| Kolom CSV | enam pasang z-score dan status, ditutup `Versi Standar` |
| Peran Kader | `Unduh CSV` hilang, `Cetak A4` tetap |
| Konsol peramban | **nol pesan galat** |

Satu baris CSV nyata, memperlihatkan LILA/U yang z-nya terisi tetapi statusnya
sengaja kosong (OI-04):

```text
1;3277271646395656;Athaya Permana;P;2021-06-03;5;18;2026-06;2026-06-03;60;13,50;
103,0;16,5;51,0;T;-2,13;Berat badan kurang;-1,35;Normal;-1,85;Gizi baik;
-1,97;Gizi baik;-0,23;;0,76;Normal;WHO-2006
```

Gerbang bagian 14.9: ketiganya sesuai garis dasar — `lint:check` 24,
`types:check` 49, `format:check` lulus.

### Keputusan teknis

- **Pemisah kolom CSV titik koma, desimal koma.** Keduanya harus sejalan: koma
  tidak bisa menjadi pemisah kolom sekaligus pemisah desimal. Titik koma adalah
  pemisah daftar bawaan Excel berbahasa Indonesia, yang dipakai pemilik program,
  dan bagian 9 langkah 5 memang menyuruh membuka berkasnya di Excel di depan
  client.
- **Tanda minus di berkas memakai tanda hubung ASCII**, berbeda dari layar yang
  memakai U+2212 sesuai bagian 8.2. Excel hanya mengenali angka negatif dengan
  tanda hubung biasa; memakai U+2212 akan membuat seluruh kolom z-score terbaca
  sebagai teks.
- **Tab `Harian` menampilkan angka yang sama dengan `Bulanan`**, disertai
  keterangan tanggal sesinya. Bagian 6.6 sendiri menyatakan data impor hanya
  punya satu tanggal ukur per periode.

### Catatan isi data

- **Kolom `O` bernilai nol di seluruh RT dan seluruh periode**, karena kolom
  `NTOB` di arsip tidak pernah berisi huruf `O`. Sudah diperkirakan pada catatan
  T3.
- **BGM bernilai nol di mana-mana.** BGM dihitung dari BB/U di bawah −3 SD, dan
  tidak ada satu pun anak pada Januari–Juni 2026 yang mencapainya. Nilai BB/U
  terendah pada Juni adalah −2,23.
- **Cakupan layanan tambahan seluruhnya `0 dari 97`**, sesuai bagian 11: kolom
  Vitamin A, obat cacing, imunisasi, dan KPSP tidak ada di berkas sumber.

---

## T6 — Pengaturan dan Periode

**Selesai.** Set tujuh layar lengkap. Berkas yang dibuat:
`resources/js/pages/pengaturan/index.tsx` dan
`resources/js/pages/periode/index.tsx`, ditambah `PENGATURAN_BAWAAN`,
`PENGATURAN_TERAKHIR_DIUBAH`, dan `daftarPeriode` di `demo/store.ts`.

### Yang dibuktikan berjalan

| Bagian | Hasil |
|---|---|
| Subjudul Pengaturan | `… Terakhir diubah 13 Juni 2026 oleh Bidan Posyandu Tulip. Data contoh.` |
| Callout | `Batas ini hanya memicu pertanyaan konfirmasi. Kader tidak pernah diblokir…` |
| Lima bagian | Rentang wajar · Ambang selisih · Ambang z-score terkunci · Tabel standar · Siapa boleh mengubah |
| Nilai isian | `1,0` `30,0` `40,0` `130,0` — desimal koma, satuan di segmen dalam kotak |
| Tabel standar | Versi `WHO-2006`, **906 baris**, status `Tersedia` |
| Ubah lalu kembalikan | `1,0` → `2,5` → tombol `Kembalikan ke bawaan` → `1,0` |
| Periode | enam baris, `Januari 2026 · 10 Jan 2026 · 101 · 99 · 98% · Selesai` |
| Klik baris periode | membuka Beranda pada periode itu; pemilih periode di header ikut berubah |
| Konsol peramban | **nol pesan galat** |

Gerbang bagian 14.9: `lint:check` 24, `types:check` 49, `format:check` lulus.

### Keputusan teknis

- **`906` tidak ditulis tangan.** Skrip ekstraksi kini menuliskan
  `meta.barisStandar` ke `posyandu.json`, dihitung dari `who-lms.json`, sehingga
  angka di layar Pengaturan ikut berubah bila tabel standarnya diganti.
- **`Terakhir diubah … oleh Bidan Posyandu Tulip`** memakai sebutan peran, bukan
  nama orang. Bagian 6.7 meminta `{nama}`, tetapi seluruh nama pada demo sudah
  dianonimkan (bagian 5.2) dan mengarang nama bidan akan menambah satu orang
  fiktif yang tidak perlu.
- **Kolom `Status` pada Periode berisi `Selesai` atau `Sedang dilihat`.**
  Bagian 6.8 menyebut kolomnya tanpa menetapkan nilainya, dan data demo tidak
  punya konsep periode terbuka atau terkunci.

---

## T7 — Poles, gerak, dan build statis

**Selesai.** Tidak ada layar baru; tahap ini memperbaiki apa yang sudah ada.

### Cacat terbesar sepanjang pengerjaan, ditemukan di sini

**Tailwind hanya memindai `demo/`, bukan `resources/js/`.**

`vite.demo.config.ts` memakai `root: 'demo'`, dan deteksi sumber otomatis
Tailwind v4 bertumpu pada akar itu. Akibatnya **setiap kelas utilitas yang hanya
dipakai di `resources/js/` tidak pernah dihasilkan** — dan tidak ada pesan galat
sama sekali, kelasnya cuma tidak berefek.

Yang paling merugikan: `overflow-x-auto` pada `ui/table.tsx` tidak ada, sehingga
tabel lebar mendorong badan halaman menggulir mendatar — persis aturan mengikat
[05-uiux-spec.md](05-uiux-spec.md) bagian 7. Ikut hilang antara lain
`min-w-[720px]` pada kurva KMS, `text-tone-amber`, `caption-bottom`, dan `w-44`.

Sebagian besar layar tetap terlihat wajar karena kelas yang sama kebetulan juga
dipakai di `demo/Login.tsx` atau `demo/DemoApp.tsx`. Itulah yang membuatnya sulit
terlihat.

**Perbaikan:** `@source '../js';` ditulis eksplisit di `resources/css/app.css`.
Berkas CSS hasil build naik dari **22 kB menjadi 122 kB** — ukuran itu sendiri
bukti berapa banyak yang sebelumnya hilang.

Pelajarannya untuk tahap-tahap berikutnya: `root` yang berbeda antara dua build
membuat deteksi otomatis tidak bisa dipercaya. Sumber ditulis eksplisit.

### Yang dikerjakan

| Hal | Isi |
|---|---|
| Responsif | sidebar menumpuk menjadi blok atas di bawah 1024 px, bukan kolom 256 px |
| Lebar kolom cakupan | dikecilkan di layar sempit; sebelumnya meluber 2 px di 375 px |
| Gerak bagian 8.4 | transisi 200 ms, **hanya `transform` dan `opacity`**, pada tautan, tombol, dan baris tabel yang dapat diklik |
| Jeda bertahap | baris Data Anak masuk berurutan 20 ms, dibatasi delapan baris pertama, dipicu perubahan filter |
| `prefers-reduced-motion` | seluruh transisi dan animasi dimatikan |

### Yang dibuktikan berjalan

| Pemeriksaan | Hasil |
|---|---|
| Gulir mendatar pada 375 px | **nihil** di keenam layar |
| Gulir mendatar pada 1440 px | **nihil**; sidebar 256 px, nav kolom |
| Build statis | 5 berkas, 612 kB JS (118 kB gzip), 95 kB CSS (16 kB gzip) |
| Build di static host biasa | keenam layar terbuka, alur masuk sampai Detail anak berjalan |
| **Permintaan ke domain luar** | **nol** — `performance.getEntriesByType('resource')` hanya memuat tiga berkas lokal |
| Huruf | `Plus Jakarta Sans 200 800 loaded` dari `/assets/`, bukan dari Google Fonts |
| Konsol peramban | **nol pesan galat** |
| Determinisme skrip | dijalankan ulang, `md5` `posyandu.json` identik |
| Verifikasi master | BB/U 87 · TB/U 86 · LIKA/U 86 — **nol selisih** |
| `console.log` tertinggal | nihil |

Gerbang bagian 14.9: `lint:check` **24**, `types:check` **49**,
`format:check` **lulus**.

### Dua rujukan domain luar yang tersisa di berkas build, keduanya mati

| Rujukan | Bentuk |
|---|---|
| `https://tailwindcss.com` | komentar lisensi di awal berkas CSS |
| `https://react.dev/errors/` | potongan teks yang disambung React saat menyusun pesan galat produksi |

Keduanya tidak pernah diminta peramban — dibuktikan oleh daftar permintaan yang
kosong di atas.

### Yang tidak dikerjakan

- **`file://` tetap tidak didukung.** Berkas build memuat
  `<script type="module" crossorigin>`, dan peramban menolak modul ES dari
  `file://` karena kebijakan CORS. Yang terbukti berjalan adalah static host mana
  pun, termasuk `python -m http.server`. Menyatukan seluruh aset ke satu berkas
  HTML akan menyelesaikannya, tetapi bagian 9 memang menjalankan demo dengan
  `npm run demo`.
- **Deploy.** Bagian 12 menyatakan T7 tidak memuat deploy; build tersimpan lokal
  di `dist-demo/`, yang masuk `.gitignore`.

---

## Perbaikan — label z-score pada kurva KMS berselang-seling

Ditemukan dari layar: label di atas tiap titik naik-turun bergantian seperti
tangga, sehingga kurvanya terbaca berantakan.

**Sebabnya.** Jarak angkat label dihitung dari ganjil-genap urutan titik:

```ts
y(kg) - (urutan % 2 === 0 ? 16 : 42)
```

Selang-seling itu dipasang untuk menghindari tabrakan, dan tabrakannya memang
tidak pernah ada. Diukur langsung dari SVG di peramban: lebar tiap label **92
satuan**, jarak antar bulan **114 satuan** — tersisa 22 satuan, nol tumpang
tindih mendatar.

Yang membuatnya baru terlihat sekarang: ukuran teks label pernah dinaikkan dari
15 menjadi 21 satuan, sementara angka 16 dan 42 tidak ikut ditinjau. Pada 21
satuan, selisih 26 satuan antar label setara satu garis kilogram penuh.

**Kenapa ini lebih dari sekadar tidak rapi.** Pada anak yang dipakai memeriksa,
dua pengukuran pertama bernilai **+1,31** dan **+1,30** — hampir sama — tetapi
labelnya berdiri terpaut 26 satuan. Di kartu pertumbuhan, tinggi sebuah angka
dibaca sebagai besarnya angka itu. Yang dikodekan posisi label justru parity
indeksnya.

**Perbaikannya.** Jarak angkat dibuat tetap dan diturunkan dari ukuran
penandanya, bukan ditulis sebagai angka lepas:

```ts
const LABEL_ANGKAT = TITIK_JARI + TITIK_GARIS / 2 + 7;
```

`LABEL_UKURAN`, `TITIK_JARI`, dan `TITIK_GARIS` kini berdiri satu kelompok dan
dipakai bersama oleh teks maupun lingkaran titiknya, sehingga mengubah ukuran
teks tidak bisa lagi diam-diam merusak jaraknya.

Diverifikasi kembali di peramban: keenam label berjarak **tepat 16 satuan** di
atas titiknya masing-masing, dan garis alasnya menurun 279 → 262 → 260 → 253 →
252 → 248 mengikuti kurvanya.

### Sekalian: `docs/design/` dikeluarkan dari ESLint

`npm run lint:check` menunjukkan **801** galat, dan **778** di antaranya berasal
dari `docs/design/support.js` dan `image-slot.js` — berkas prototipe hasil
salinan Claude Design, bukan kode aplikasi. Galat sungguhan tenggelam di
dalamnya. Sekelas dengan `dist-demo` yang sudah lebih dulu diabaikan.

Sesudahnya: `lint:check` **23**, `types:check` **48**, `format:check` lulus —
seluruhnya `@/routes` dan `@/actions` milik Wayfinder (D-04), nol di berkas
mana pun yang disentuh perbaikan ini.

---

## Perbaikan — Detail anak: satu layar ditukar dengan kurva yang terbaca

**Keluhannya:** Detail anak dulu muat satu layar tanpa menggulir, sekarang tidak.

**Sebabnya.** Tata letak satu layar itu digerbangi `2xl`, yaitu **1536 px CSS**.
Di bawah itu kedua kolom menumpuk dan yang menggulir bagian dalam `<main>`, bukan
halamannya — sehingga terlihat seperti tata letaknya hilang, bukan seperti
halaman biasa yang panjang. Terukur di peramban:

| Lebar | `display` kolom | Tinggi isi vs ruang |
|---|---|---|
| 1440 px | `flex` (menumpuk) | 1.476 px dalam 830 px |
| 1600 px | `grid` (dua kolom) | muat |

Layar yang dipakai memeriksa berskala DPI, jadi 1.901 piksel fisik jatuh ke
sekitar 1.520 px CSS — meleset belasan piksel dari gerbangnya.

**Yang lebih serius daripada gerbang yang meleset.** Begitu gerbangnya terbuka,
kurvanya justru jadi korban. Pada 1536 px, kolom kanan selebar 614 px:

| | Nilai |
|---|---|
| Gambar kurva | 614 × 221 px |
| 1 satuan viewBox | 0,409 px |
| Teks label z-score | **8,6 px** |
| Angka sumbu | **9,4 px** |
| Ruang kartu tak terpakai | ±320 px |

Batas terkecil pada [05-uiux-spec.md](05-uiux-spec.md) bagian 8 adalah **15 px**
dan disebut tidak diturunkan lagi. Lebih jauh, perubahan yang sama menaikkan
ukuran teks kurva dari 16-17 menjadi 23-24 satuan justru **karena** 10,6 px
dianggap terlalu kecil — lalu menaruh kurvanya di kolom yang membuatnya 8,6 px.
Dua niat baik yang saling meniadakan.

Menurunkan gerbang ke 1280 px tidak menolong: kolom kurva tinggal ~500 px dan
labelnya ~7 px.

**Keputusan pemilik produk:** kurva lebar penuh, halaman boleh menggulir.
Dasarnya bagian 9 — "Tunjuk kurvanya" adalah momen paling meyakinkan seluruh
presentasi, dan kurva sebesar prangko melemahkan justru momen itu.

**Yang dikerjakan.** Tata letak dua kolom dicabut dari Detail anak: `penuh` pada
`<Halaman>`, seluruh kelas `2xl:grid`/`2xl:min-h-0`/`2xl:flex-1`, dan prop
`penuh` pada `<KmsChart>`. Kurva **dipindah ke dalam kolom tunggal, sebelum tabel
riwayat** — itu urutan bagian 6.5, dan sekaligus membuat kalimat yang sudah
tercetak di kepala tabel ("menyorot titiknya pada kurva di atas") menjadi benar;
selama ini kurvanya ada di sebelah kanan.

**Hasilnya, diukur pada 1520 × 820:**

| | Sebelum | Sesudah |
|---|---|---|
| Lebar kurva | 614 px | **1.232 px** |
| Tinggi kurva | 221 px | **444 px** |
| Label z-score | 8,6 px | **17,3 px** |
| Angka sumbu | 9,4 px | **19,7 px** |
| Urutan judul | Identitas · Status · Riwayat \| Kurva | Identitas · Status · **Kurva** · Riwayat |

Pada 375 px tetap nol gulir mendatar. Gerbang bagian 14.9 tidak bergeser:
`lint:check` 23, `types:check` 48, `format:check` lulus.

**Catatan.** `penuh` tetap dipakai Data Balita dan Laporan. Keduanya layar tabel
— tidak ada gambar berskala di dalamnya yang ikut mengecil saat kolomnya
menyempit, jadi tinggi-jendela di sana tidak menukar apa pun.

---

## Perbaikan — Detail anak dirombak jadi satu layar

Kelanjutan catatan sebelumnya. Pemilik produk meninjau ulang dan memilih **satu
layar tanpa gulir tegak, dengan seluruh informasi tetap tampil** — jadi
ongkosnya bukan lagi menggulir, melainkan kurva yang harus muat di kolom.

### Susunannya sekarang

| Baris | Isi | Tinggi pada 1520 × 820 |
|---|---|---|
| 1 | Identitas, empat kolom | 113 px |
| 2 | Status pengukuran, tiga blok z-score | 182 px |
| 3 | Kurva \| Riwayat, berdampingan 1,6 : 1 | 385 px |

Baris ketiga menyerap sisa tinggi; tabel Riwayat menggulir di dalam wadahnya
sendiri, mendatar maupun tegak. Total pas 820 px, nol gulir halaman.

### Mode kompak pada kurva

Ukuran teks di dalam SVG berbanding lurus dengan lebar tayangnya:

```text
px = satuan × lebarTayang / 1500
```

Pada kolom ~740 px, satuan 23–24 mendarat di 11–12 px — di bawah batas 15 px
[05-uiux-spec.md](05-uiux-spec.md) bagian 8. Prop `kompak` menaikkan satuannya
menjadi 32 dan 34, dihitung mundur dari kolom tersempit yang mungkin terjadi.

Konsekuensinya **label z-score per titik ditiadakan di mode kompak**: pada
satuan sebesar itu lebarnya 132 satuan sementara jarak antar bulan 114, jadi
pasti bertabrakan. Angkanya tidak hilang — tetap ada di tooltip titik, dan di
tabel Riwayat yang pada tata letak ini justru berdiri tepat di sebelahnya. Ini
sekaligus mengembalikan rancangan asli bagian 6.5, yang memang hanya meminta
tooltip.

### Ambangnya 1500 px, bukan `xl`

Dicoba dulu pada `xl` (1280 px) dan ditolak sendiri oleh angkanya: di sana
kolom kurva tinggal ~595 px dan teksnya 11,9 px. Ambangnya dinaikkan ke lebar
tempat angkanya benar-benar bertahan.

| Lebar | Gulir | Lebar kurva | Teks tik |
|---|---|---|---|
| 1520 | tidak | 759 px | **16,2 px** |
| 1500 (ambang) | tidak | 736 px | **15,7 px** |
| 1440 | ya, kembali ke susunan lebar penuh | 1.152 px | **17,7 px** |
| 375 | nol gulir mendatar | — | — |

Di bawah 1500 px halaman kembali ke susunan satu kolom dengan kurva lebar penuh
— bukan versi yang dipaksakan mengecil.

### `penuh` jadi pilihan per layar

`Halaman` dulu memakai satu ambang `lg` untuk semua. Menaikkannya ke 1500 px
akan menyeret Beranda, Data Balita, dan Laporan ikut menggulir di rentang
1024–1500 px, padahal ketiganya layar tabel: menyempitkan kolomnya hanya
menambah gulir mendatar di dalam wadahnya sendiri, tidak ada gambar berskala
yang ikut mengecil.

Karena itu `penuh` berubah dari `boolean` menjadi `false | 'lg' | 'lebar'`.
Tiga layar tabel memakai `"lg"`, Detail anak memakai `"lebar"`. Kelas
Tailwind-nya ditulis utuh dalam konstanta, bukan dirakit dari potongan — kelas
yang dirakit tidak terbaca pemindai Tailwind dan akan hilang diam-diam, persis
kegagalan yang tercatat di T7.

Gerbang bagian 14.9 tidak bergeser: `lint:check` 23, `types:check` 48,
`format:check` lulus.

---

## Perbaikan — satu layar pada 1280 × 645, dan tabrakan teks kurva

Lanjutan catatan sebelumnya. Dua hal dilaporkan sekaligus: layarnya masih
menggulir pada zoom 100% dan baru muat pada 80%, lalu angka pada kurva saling
menimpa.

### Ukuran layar sebenarnya

Dari fakta "80% muat, 100% tidak" ukuran viewport CSS-nya dapat dihitung mundur:
sekitar **1280 × 645**. Dua angka sebelumnya salah dipakai sebagai patokan —
ambang 1500 px tidak pernah aktif, dan seluruh pengukuran dilakukan pada tinggi
820 px padahal yang tersedia hanya 645 px.

### Susunan baru

Dua kolom saja tidak cukup pada tinggi 645. Susunannya menjadi grid dua baris:

| Baris | Isi | Tinggi |
|---|---|---|
| 1 | **Identitas \| Status pengukuran**, berdampingan | 175 px |
| 2 | **Kurva \| Riwayat**, berdampingan 1,6 : 1 | 361 px |

Susunan DOM-nya tidak diubah sama sekali: penempatan otomatis grid menaruh
Identitas dan Status di baris pertama, dan baris kedua diberi `col-span-2`.
Lebih sedikit yang bisa salah daripada memindah-mindah blok JSX.

Penghematan lain yang tidak membuang informasi: vonis "Tidak perlu tindak lanjut
bulan ini." naik sebaris dengan judul bagiannya — dulu satu baris penuh untuk
lima kata — dan padding kartu indeks turun dari 20 ke 16.

Total pada 1280 × 645: **645 px isi dalam 645 px ruang.** Nol gulir.

### Angka kurva bertabrakan — akarnya sama dengan bug sebelumnya

Ukuran teks dinaikkan ke 32 satuan, tetapi pinggiran kartu dan jarak antar
labelnya tidak ikut ditinjau. Persis pola yang sama dengan label z-score
berselang-seling: satu angka dinaikkan, angka lain yang bergantung padanya
ditinggalkan.

Tiga tabrakan yang terjadi:

| Tabrakan | Sebab |
|---|---|
| Angka kg saling menimpa | jarak antar garis kg ~27 satuan, tinggi hurufnya ~51 |
| Judul "Berat badan, kg" menimpa angka kg | pinggiran kiri 64 satuan, tidak cukup untuk teks 40 satuan |
| Angka bulan menimpa "Umur, bulan" dan angka kg pojok | jarak label sumbu bawah masih 26 satuan dari zaman teks 17 satuan |

Perbaikannya bukan menggeser satu-satu, melainkan **menjadikan geometri kartu
sebagai satu kesatuan**: `GEOMETRI` kini punya dua ragam — `lebar` dan `kompak`
— yang masing-masing memuat pinggiran, tinggi kartu, ukuran teks, jarak label
sumbu, dan apakah label z-score per titik ditampilkan. Semuanya bergerak
bersama.

Ditambah dua aturan yang dihitung, bukan ditebak:

- **Angka kg diencerkan** bila jaraknya lebih rapat daripada tinggi hurufnya:
  `langkah = ceil(ukuranTeks / jarakAntarGarisKg)`. Pada ragam kompak hasilnya
  tiap 2 kg. Garis bantunya tetap tiap 1 kg.
- **Angka teratas hanya diberi label** bila jaraknya dari angka berlabel
  sebelumnya memang cukup — tanpa itu skala 18 kg berlangkah 2 menghasilkan
  "17" dan "18" berdempetan.

Pinggiran bawah ragam kompak dihitung dari syaratnya, bukan dicoba-coba:
`tikBawah >= 56` supaya angka bulan lepas dari angka kg di pojok, dan
`tikBawah <= BAWAH - 69` supaya lepas dari judul sumbu. Keduanya hanya terpenuhi
bila `BAWAH >= 125`; dipakai 132.

### Hasil

Diperiksa dengan menghitung perpotongan kotak teks di peramban, bukan dengan
melihat:

| Viewport | Gulir | Lebar kurva | Teks tik | Tabrakan teks |
|---|---|---|---|---|
| 1280 × 645 | **tidak** | 602 px | 16,1 px | **0** |
| 1366 × 700 | tidak | 664 px | 17,7 px | 0 |
| 1600 × 806 (zoom 80%) | tidak | 808 px | 21,5 px | 0 |
| 375 × 760 | nol gulir mendatar | — | — | — |

Diuji pada tiga anak berbeda, termasuk yang hanya punya satu pengukuran.

### Yang belum beres

Di bawah 1280 px halaman kembali ke susunan satu kolom dengan kurva lebar penuh.
Di sana kurva memakai ragam `lebar` yang teksnya 23 satuan: pada viewport
1100 px kurvanya 812 px dan teksnya jatuh ke **12,5 px**, di bawah batas 15 px.

Tidak dikejar karena itu jalur cadangan di luar sasaran demo — bagian 3 menyebut
demo dijalankan di laptop. Membetulkannya menuntut ragam geometri ketiga, dan
ragam ketiga hanya masuk akal bila ada yang benar-benar memakainya.

Gerbang bagian 14.9 tidak bergeser: `lint:check` 23, `types:check` 48,
`format:check` lulus.

---

## Perbaikan — Identitas menimpa nilainya, dan kurva yang meluber

Laporan berikutnya: pada zoom 90% masih menggulir, dan angka pada grafik
bertabrakan. Yang ditemukan lebih dari itu — **label Identitas menimpa nilai
kolom sebelahnya**, cacat yang terlewat karena tahap sebelumnya hanya memeriksa
tabrakan teks **di dalam SVG**, bukan di seluruh halaman.

### Cacat 1: label Identitas meluber

`BarisDefinisi` memakai label selebar **160 px tetap** (`w-40 shrink-0`).
Begitu barisnya berdiri di kolom selebar **111 px**, labelnya tidak menyusut —
ia meluber menimpa kolom di sebelahnya. Terhitung **12 pasang** teks
bertabrakan: "Tanggal lahir" di atas "Perempuan", "NIK" di atas
"28 September 2025", dan seterusnya.

Perbaikannya: varian **bertumpuk** — label di atas isinya, tanpa lebar tetap
sama sekali, jadi tidak mungkin meluber. Bentuk bersanding tetap dipakai
Pengaturan, yang kolomnya memang lebar.

Identitas juga diberi porsi lebih besar daripada Status pengukuran
(`1.6fr : 1fr`, dulu `1fr : 1.15fr`): delapan fakta butuh lebar, tiga kartu
angka tidak.

### Cacat 2: tinggi kurva sebanding dengan lebarnya

Ini yang membuat jendela **lebih besar** justru menggulir. Tinggi gambar kurva
sebanding dengan lebarnya, sedangkan tinggi jendela tidak tumbuh secepat itu:

| Viewport | Ruang tegak bertambah | Tinggi kurva bertambah | Akibat |
|---|---|---|---|
| 1280 × 645 | — | 241 px | muat |
| 1366 × 660 | +15 px | +21 px (262) | **menggulir** |

Dua perbaikan yang harus berpasangan:

1. `max-h-full` pada SVG — gambarnya mengecil dan memusat sendiri alih-alih
   meluber.
2. Akar kartu kurva `flex-1 min-h-0`, bukan `h-full`. Ini syarat butir 1
   berfungsi: di dalam kolom lentur, `h-full` mengacu pada tinggi yang belum
   pasti, sehingga `max-h-full` tidak punya patokan. Dengan `h-full` saja,
   kartunya tetap meluber 6 px.

### Cara memeriksanya berubah

Tahap sebelumnya memeriksa perpotongan kotak teks hanya di dalam SVG, dan itulah
sebabnya 12 tabrakan di Identitas lolos. Sekarang pemeriksaannya menyapu
**seluruh `<main>`** — `dt`, `dd`, `h2`, `p`, `span`, `th`, `td` — dan
menghitung tiap pasang yang berpotongan.

### Hasil

Diuji pada empat anak berbeda, termasuk yang hanya punya satu pengukuran:

| Viewport | Gulir | Kurva | Teks tik | Tabrakan teks |
|---|---|---|---|---|
| 1280 × 600 | tidak | 611 × 182 | 12,2 px | 0 |
| **1280 × 645** | **tidak** | 602 × 241 | 16,1 px | **0** |
| 1366 × 660 | tidak | 664 × 243 | 16,2 px | 0 |
| 1422 × 717 (zoom 90%) | tidak | 699 × 279 | 18,6 px | 0 |
| 1920 × 1000 | tidak | 1005 × 402 | 26,8 px | 0 |
| 375 × 760 | nol gulir mendatar | — | — | 0 |

Seluruh lebar 1280 px ke atas kini muat satu layar. Di bawah tinggi ~645 px
kurvanya mengecil sendiri dan teksnya turun di bawah 15 px — tetapi tidak ada
yang terpotong dan tidak ada yang menggulir. Itu penurunan mutu yang bertahap,
bukan kerusakan.

Gerbang bagian 14.9 tidak bergeser: `lint:check` 23, `types:check` 48,
`format:check` lulus.

---

## Perbaikan — tampilan blok Identitas

Tiga dari empat saran diterapkan. Yang keempat dibatalkan setelah membaca kode.

### Yang dikerjakan

**1. Garis bawah tiap field dibuang.** Delapan garis selebar kolom di atas data
baca-saja terbaca sebagai borang isian — afordansi yang keliru, karena tidak
satu pun bisa diketik. Garis-garis itu juga elemen paling kontras di blok,
mengalahkan angkanya sendiri. Pemisahnya kini tipografi label dan jaraknya
(`gap-y` 2 → 3,5). [10-prd-demo-frontend.md](10-prd-demo-frontend.md) bagian 6.5
memang menyebut daftar ini **"tanpa kotak"**.

**2. Tanggal lahir membawa umurnya:** `28 September 2025, 8 bulan`, bentuk
bagian 6.5. Umur adalah kunci seluruh z-score di layar ini; sebelumnya ia hanya
ada di subjudul header, jauh dari tanggal yang menghasilkannya. Umur memang jadi
muncul dua kali di layar — sebagai konteks di header, dan sebagai turunan
tanggal lahir di sini.

**3. `self-start`.** Blok ini sebelumnya diregangkan menyamai tinggi kartu
Status di sebelahnya, sehingga baris terakhirnya mengambang di atas ruang
kosong. Tingginya turun dari 175 menjadi **122 px**.

### Yang dibatalkan, dan kenapa

Saran keempat — menggabungkan `RT` dan `Anak ke-` menjadi satu field `Alamat`
berbunyi `RT 02, anak ke-3`, persis bentuk bagian 6.5 — **tidak dikerjakan**.

Saat membuka berkasnya, tepat di atas kedua field itu sudah ada komentar:

> *Urutan kelahiran dulu ikut menumpang di baris "Alamat", padahal ia bukan
> alamat: layar berbunyi "Alamat: RT 02, anak ke-3". Dua fakta, dua baris.*

Jadi penggabungan itu sudah pernah dipasang dan sengaja dibatalkan, dengan
alasan yang benar: urutan kelahiran bukan alamat. Sarannya dibuat sebelum
komentar itu terbaca.

Keuntungannya pun tipis: delapan field dalam empat kolom jatuh tepat dua baris
penuh, sedangkan tujuh field menyisakan baris kedua yang timpang. Bagian 6.5
tetap berbeda dari yang tampil di layar, dan perbedaan itu disengaja.

### Yang sengaja tidak diubah

- **`Berat lahir —` tetap ditampilkan** meski kosong. P2 dan DR-04 menyebut
  nilai kosong harus terlihat sebagai `—`, bukan disembunyikan — menghilangkan
  fieldnya membuat "tidak tercatat" tak bisa dibedakan dari "tidak ada
  kolomnya".
- **`Buku KIA: Ada` tetap teks, bukan chip berwarna.** Lebih cepat terbaca
  sebagai chip, tetapi menambah elemen berwarna di blok yang tugasnya justru
  tenang, sementara di layar ini warna sudah dipakai untuk vonis gizi.

### Hasil

| Viewport | Gulir | Kurva | Teks tik | Tabrakan teks |
|---|---|---|---|---|
| 1280 × 645 | tidak | 611 × 227 | 15,2 px | 0 |
| 1422 × 717 | tidak | 699 × 279 | 18,6 px | 0 |
| 375 × 760 | nol gulir mendatar | — | — | 0 |

Gerbang bagian 14.9 tidak bergeser.

---

## Perbaikan — ambang tata letak dan urutan breakpoint Tailwind

Pada zoom 100% Identitas melebar penuh dua kolom dan Status turun ke bawah;
pada zoom 90% susunannya benar. Artinya kelas bergerbang itu **tidak aktif** di
zoom 100%.

### Sebab 1: ambang 1280 px kena lingkaran setan bilah gulir

Lebar yang dipakai media query **tidak memasukkan bilah gulir**. Jendela 1280 px
yang sempat menggulir melapor 1265 px, `xl:` mati, tata letaknya menumpuk, jadi
lebih tinggi, bilah gulirnya menetap, dan keadaan itu mengunci dirinya sendiri.
Tahap sebelumnya lolos karena 1280 × 645 muat **persis tanpa sisa** — nol margin,
jadi selisih sekecil apa pun menjatuhkannya.

Ambangnya diturunkan ke **1240 px**, dan angkanya dihitung, bukan dikira:
kolom kurva = `0,615 × (lebar jendela − 328)`, dan supaya teks di dalamnya
bertahan di 15 px kolomnya harus ≥ 560 px — terpenuhi mulai 1238 px.

### Sebab 2: Tailwind mengurutkan breakpoint tanpa menyamakan satuan

Perbaikan pertama tidak cukup, dan alasannya tersembunyi di berkas CSS hasil.

`min-[1240px]:grid-cols-4` **dihasilkan dengan benar**, tetapi blok medianya
dipancarkan di urutan paling depan:

```text
@media (width >= 1240px)   <- lebar
@media (width >= 40rem)    <- sm
@media (width >= 48rem)    <- md
@media (width >= 64rem)    <- lg
@media (width >= 80rem)    <- xl
```

Pada lebar 1265 px kedua blok cocok, dan `sm:grid-cols-2` yang berada lebih
belakang memenangkan cascade. Identitas tetap dua kolom meski kelas empat
kolomnya ada.

Mendaftarkannya sebagai breakpoint bernama saja belum menyelesaikan: selama
nilainya ditulis `1240px`, Tailwind tidak dapat membandingkannya dengan
breakpoint bawaan yang semuanya `rem`, dan ia tetap terlempar ke depan.

**Yang menyelesaikan: menulis nilainya dalam satuan yang sama.**

```css
@theme {
    --breakpoint-lebar: 77.5rem; /* 1240px pada akar 16px */
}
```

Urutannya kini benar: `40rem → 48rem → 64rem → 77.5rem → 80rem`.

Pelajaran yang berlaku di luar kasus ini: **breakpoint kustom harus memakai
satuan yang sama dengan breakpoint bawaan.** Mencampur `px` dan `rem` tidak
menimbulkan galat apa pun — kelasnya tetap dihasilkan, hanya kalah cascade,
dan itu jenis kegagalan yang paling lama dicari.

### Juga dirapikan

Kategori pada kartu indeks turun ke 15 px — batas terkecil bagian 8, bukan di
bawahnya — supaya "Berat badan normal" tidak terpatah dua baris di kolom sempit.
Baris atas menyusut dari 175 menjadi **168 px**.

### Hasil

| Viewport | Gulir | Kolom Identitas | Teks tik | Tabrakan |
|---|---|---|---|---|
| 1230 × 645 | ya, kembali satu kolom | 2 | — | — |
| **1265 × 645** (1280 dengan bilah gulir) | **tidak** | **4** | 15,7 px | **0** |
| 1280 × 645 | tidak | 4 | 15,7 px | 0 |
| 1422 × 717 | tidak | 4 | 18,6 px | 0 |

Gerbang bagian 14.9 tidak bergeser.

> **Perhatian saat menjalankan:** perubahan pada blok `@theme` tidak terbaca
> server dev yang sudah berjalan — Tailwind menyajikan CSS lama tanpa pesan
> galat apa pun. Hentikan `npm run demo` lalu jalankan lagi.

---

## Perbaikan — ambang 1088 px, dan kurva yang ternyata dibatasi tinggi

Keluhannya sama bunyinya dengan ronde sebelumnya, tetapi sebabnya lain:
pada zoom 90% Identitas empat kolom, pada zoom 100% dua kolom. Ambang 77,5rem
tercapai di zoom 90% dan tidak tercapai di zoom 100%, jadi jendela pengguna
berada **di antara** keduanya.

### Sebab: ambang 1240 px diturunkan dari asumsi yang salah

Angka 1240 dihitung dengan anggapan kurva dibatasi **lebar** kolomnya. Diukur
langsung, anggapan itu keliru: pada jendela 645 px tingginya, kotak SVG berhenti
di ~203 px karena `max-h-full`, jadi skalanya `203/620` dan bukan `lebar/1500`.
Lebar jendela tidak lagi menentukan ukuran teks kurva, sehingga ambang setinggi
1240 px tidak membeli apa pun.

Diukur ulang dari bawah: susunan dua kolom masih utuh — tanpa gulir, tanpa satu
pun tabrakan — sampai **1088 px**. Ambangnya turun ke sana.

```css
@theme {
    --breakpoint-lebar: 68rem; /* 1088px pada akar 16px */
}
```

### `auto-fit` dicoba untuk Identitas, lalu dibatalkan

Jumlah kolom yang dihitung dari lebar wadah terdengar lebih benar daripada
ambang yang bisa meleset, dan sempat dipakai:
`grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]`.

Hasil ukurnya menolak gagasan itu. Wadah Identitas bukan selebar halaman — ia
1,6fr dari kolom kiri, yaitu **552 px** pada jendela 1180 px. `auto-fit` di sana
menghasilkan 2 kolom, 3 kolom pada 1280 px, dan 5 kolom pada 1920 px: tidak
pernah 4, dan berubah-ubah di tiap lebar. Delapan ruas yang menumpuk jadi tiga
baris itu persis yang membuat blok ini terlihat memenuhi layar.

Kembali ke jumlah tetap — `grid-cols-2 gap-x-6 lebar:grid-cols-4`. Delapan ruas
dibagi empat kolom = dua baris rapi, sama di seluruh lebar di atas ambang.

### Teks kurva 14,9 px — di bawah lantai bagian 8

Konsekuensi dari temuan "dibatasi tinggi" di atas: dengan `KOMPAK_TIK` 46 teks
tik mendarat di **14,9 px**, sementara `docs/05-uiux-spec.md` bagian 8 menyebut
15 px sebagai lantai yang mengikat. Selisihnya sepersepuluh piksel, tetapi
lantai yang dilanggar sedikit tetap dilanggar.

`KOMPAK_TIK` naik ke **48** → 15,6 px pada kasus tersempit. Seluruh pinggiran
ikut naik sendiri karena semuanya diturunkan dari angka ini.

### Penjarangan label kg memakai ukuran huruf, bukan tinggi barisnya

Pada `KOMPAK_TIK` 46 terukur **16 tabrakan** teks di dalam SVG. Penjarangan
label kg membandingkan jarak antar garis dengan `g.tik` — ukuran hurufnya —
padahal yang harus dibandingkan adalah tinggi kotak barisnya, yang lebih besar.

```ts
const tinggiBarisTeks = g.tik * 1.3;
const langkahLabelKg = Math.max(1, Math.ceil(tinggiBarisTeks / jarakKg));
```

Pada 1180 px label kg kini muncul tiap 3 kg (1, 4, 7, 10, 13, 16).

### Hasil

Diukur pada halaman Detail anak, `#/balita/110`:

| Viewport | Gulir | Kolom Identitas | Teks tik | Tabrakan SVG | Tabrakan halaman |
|---|---|---|---|---|---|
| 1024 × 645 | ya — di bawah ambang, satu kolom | 2 | — | 0 | 0 |
| **1088 × 645** (ambang) | **tidak** | **4** | 15,7 px | **0** | **0** |
| 1180 × 645 | tidak | 4 | 17,0 px | 0 | 0 |
| 1280 × 645 | tidak | 4 | 18,2 px | 0 | 0 |
| 1422 × 717 | tidak | 4 | 22,4 px | 0 | 0 |
| 1920 × 937 | tidak | 4 | 32,2 px | 0 | 0 |
| 375 × 760 | ya — memang bergulir | 1 | — | 0 | 0 |

Konsol bersih (hanya HMR Vite dan anjuran React DevTools). Gerbang bagian 14.9
tidak bergeser: `format:check` lulus, `lint:check` 23, `types:check` 48 —
seluruhnya berkas `@/routes/**` bawaan Wayfinder.

### Pelajaran

Ambang tata letak harus diturunkan dari **ukuran yang benar-benar terukur**,
bukan dari rumus yang menganggap satu dimensi yang mengikat. Rumus 1240 px itu
rapi dan salah selama dua ronde karena tidak pernah dibandingkan dengan hasil
`getBoundingClientRect()`.
