# PRD Demo Frontend — Portal Posyandu Tulip

| | |
|---|---|
| **Jenis** | Kontrak — tingkat 2 (layar) |
| **Status** | beku sebagian — rancangan layar masih mengikat, pemetaan ke backend tidak |
| **Perubahan berarti terakhir** | 21 September 2026 |

| | |
|---|---|
| **Produk** | Portal Posyandu Tulip — demo frontend untuk ditunjukkan ke client |
| **Versi dokumen** | 1.0 |
| **Status** | **Selesai.** Fase demo rampung; dokumen ini catatan sejarahnya |
| **Berlaku untuk** | Fase demo saja, bukan produk akhir |
| **Induk** | [PRD utama](../prd/prd-utama.md) — kontrak produk |

---

> **Dibaca sebagai catatan, bukan sebagai rencana.** Dokumen ini ditulis saat repo masih Laravel + Inertia, dan seluruh rujukan `resources/js/`, `php artisan`, serta `composer` di dalamnya menggambarkan keadaan waktu itu — bukan keadaan sekarang. Sejak [ADR-0006](../adr/0006-pindah-ke-express-react-postgres.md), kode frontend tinggal di `client/` dan backend di `server/`.
>
> Yang **masih berlaku** dan tetap mengikat: rancangan keenam layar (bagian 6), token desain (bagian 8), aturan angka (bagian 8.2), dan gerbang mutu (bagian 14.9). Yang **tidak lagi berlaku**: bagian 10 dan 14, yang memetakan jalur ke backend Laravel.

---

## 1. Ringkasan dan tujuan demo

Demo frontend ini adalah **aplikasi React yang benar-benar berjalan**, berisi data nyata Posyandu Tulip yang sudah dianonimkan, tanpa backend sama sekali. Tujuannya satu: membuat client melihat dan merasakan portal ini bekerja, jauh sebelum basis data dan API-nya ada.

Yang membedakannya dari mockup gambar: pencarian benar-benar mencari, filter benar-benar menyaring, grafik benar-benar menggambar pertumbuhan anak dari enam bulan pengukuran nyata, dan tombol unduh benar-benar menghasilkan berkas.

Yang membedakannya dari produk jadi: tidak ada yang tersimpan. Tutup tab, semua kembali seperti semula.

### Mengapa frontend lebih dulu

Ini bukan sekadar preferensi. Lingkungan pengembangan saat ini tidak bisa menjalankan Laravel:

| Kenyataan | Akibat |
|---|---|
| Node 24.18 + npm 11.16 terpasang | Jalur frontend murni bisa jalan hari ini |
| PHP 8.2.30, `composer.json` menuntut `^8.3` | `composer install` gagal; Laravel tidak bisa dijalankan sama sekali |
| `vite.config.ts` memanggil `wayfinder` → `php artisan` | `npm run dev` apa adanya ikut gagal tanpa PHP |

Jadi menunda backend bukan mengorbankan apa pun — sekarang justru satu-satunya jalur yang tersedia.

---

## 2. Hubungan dengan PRD produk

[Ringkasan](../ringkasan.md) menggambarkan produk utuh dengan horizon berbulan-bulan. Dokumen ini mengambil sebagian kecilnya dan mendorongnya sampai terlihat, sambil menunda seluruh sisanya.

| Aspek | PRD produk | Demo ini |
|---|---|---|
| Data anak | Basis data, dapat diubah | JSON statis hasil ekstraksi arsip |
| Perhitungan z-score | `App\Support\Antropometri` saat pengukuran disimpan | Sudah dihitung di skrip ekstraksi, tersimpan di JSON |
| Autentikasi | Fortify, 2FA, passkeys | Layar login palsu; peran dipilih, tidak diverifikasi |
| Peran | `TeamPolicy` + middleware | State di frontend; mengubah tampilan, bukan keamanan |
| Impor arsip | `php artisan posyandu:import` | Sudah dijalankan lebih dulu oleh skrip ekstraksi |
| Koreksi data | Form + validasi + audit | Tidak ada |
| Export | Streamed dari basis data | Dibangun dari data JSON di browser |

Yang **tidak** dikompromikan: struktur halaman, alur navigasi, aturan tampilan angka, kategori status gizi, dan sebaran data. Semua itu sama persis dengan produk akhirnya — karena memang halaman yang sama yang nanti dipakai.

---

## 3. Kriteria sukses demo

Demo dinyatakan berhasil bila setelah sekitar 15 menit:

| # | Kriteria | Cara mengetahuinya |
|---|---|---|
| K1 | Client mengenali angkanya sebagai data mereka sendiri | Bidan atau kader menunjuk layar dan menyebut hal seperti "ini yang RT 1 memang paling banyak" |
| K2 | Client memahami alurnya tanpa dijelaskan ulang | Client bisa menyebutkan sendiri urutan: dashboard → cari anak → lihat grafik |
| K3 | Client menanyakan hal yang benar | Pertanyaan bergeser dari "nanti bentuknya bagaimana" menjadi "kapan bisa dipakai" atau "bisa tambah kolom ini?" |
| K4 | Nilai produknya tertangkap | Client menyebut manfaat yang tidak Anda sebutkan lebih dulu — misalnya tidak perlu buka banyak file Excel lagi |
| K5 | Tidak ada momen canggung | Tidak ada tombol yang diklik lalu tidak terjadi apa-apa, tidak ada layar kosong tanpa penjelasan, tidak ada error di layar |

K5 yang paling sering gagal pada demo. Karena itu setiap layar pada bagian 6 wajib punya state kosong yang dirancang, bukan kebetulan.

### Bukan kriteria sukses

- Kecepatan. Data hanya ratusan baris; apa pun akan terasa cepat.
- Kelengkapan fitur. Client tidak menghitung fitur, mereka menilai apakah ini terasa nyata.
- Kesempurnaan visual di ponsel. Demo dilakukan di laptop atau tablet.

---

## 4. Batasan dan keputusan arsitektur demo

### 4.1 Empat keputusan yang menjaga agar tidak ada pekerjaan terbuang

> **Dua butir dihapus 22 September 2026.** Butir 1 dan 2 menjelaskan bentuk halaman Inertia dan titik sambung ke `@inertiajs/react`. Keduanya tidak berlaku sejak [ADR-0006](../adr/0006-pindah-ke-express-react-postgres.md). Yang menggantikannya: props dipasok dari `client/src/layar.tsx`, dan navigasi memakai `client/src/lib/nav.tsx` berbasis alamat hash.

**3. Hash routing.**
Alamat berbentuk `#/balita/12`. Konsekuensinya: berkas hasil build bisa dibuka langsung dari `file://` maupun static host mana pun tanpa satu pun konfigurasi *rewrite*. Untuk demo yang harus jalan di laptop dan di link online sekaligus, ini menghilangkan seluruh kelas masalah deployment.

**4. Tanpa dependensi baru.**
Tidak ada library chart, router, maupun state manager. Grafik memakai SVG langsung, routing sekitar 30 baris, state memakai `useState` dan `useMemo` atas 633 baris data. Setiap dependensi yang ditambahkan sekarang adalah dependensi yang harus dipelihara nanti.

### 4.2 Struktur berkas

```
vite.demo.config.ts          react + tailwind saja; tanpa laravel/inertia/wayfinder
demo/
  index.html                 entry mandiri
  main.tsx                   mount DemoApp
  DemoApp.tsx                router, state peran, shell
  nav.tsx                    Link & navigate versi demo
  store.ts                   selector: cari, filter, agregasi
  data/
    extract-demo-data.py     skrip ekstraksi dari arsip Excel
    posyandu.json            hasil ekstraksi, di-commit
resources/js/
  pages/…                    halaman — dipakai bersama build Laravel nanti
  lib/nav.ts                 re-export @inertiajs/react untuk build Laravel
  components/…               komponen domain
```

Berkas di `resources/js/` adalah milik produk, bukan milik demo. Berkas di `demo/` adalah perancah yang nanti bisa dibuang tanpa menyentuh apa pun.

### 4.4 Aset lokal — tanpa CDN sama sekali

Prototipe desain memuat huruf dari `fonts.googleapis.com` dan ikon dari `unpkg.com`. Demo **tidak boleh** melakukan itu.

Alasannya satu dan cukup: presentasi bisa berlangsung di ruangan tanpa Wi-Fi. Bila huruf gagal dimuat, seluruh tipografi jatuh ke huruf sistem dan tata letaknya bergeser; bila ikon gagal, yang tersisa kotak kosong. Kegagalan ini tidak bisa diperbaiki di tempat saat client sudah duduk di depan layar.

| Aset | Perlakuan |
|---|---|
| `Plus Jakarta Sans` | Berkas `.woff2` bobot 400, 600, 700, 800 di `demo/assets/fonts/`, dipasang lewat `@font-face` dengan `font-display: swap` |
| Ikon Phosphor | Hanya ikon yang benar-benar dipakai, disalin sebagai SVG ke `demo/assets/icons/`. Sekitar sepuluh berkas: `house` · `baby` · `file-text` · `gear` · `calendar` · `magnifying-glass` · `funnel` · `caret-down` · `warning` · `check-circle` · `x` · `eye` |
| Data | `demo/data/posyandu.json`, sudah lokal |

Aturan mengikat: **nol rujukan ke domain luar** di seluruh berkas demo. Diverifikasi dengan mematikan Wi-Fi lalu memuat ulang — tampilan harus utuh.

Ini juga menjaga janji "tanpa dependensi baru": tidak ada paket npm yang ditambahkan, hanya berkas aset yang di-*commit*.

### 4.3 Perintah

```bash
npm install
npm run demo          # vite --config vite.demo.config.ts
npm run demo:build    # build statis ke dist-demo/
```

`vite.config.ts` yang sudah ada **tidak disentuh**. Jalur Laravel tetap utuh dan akan langsung berfungsi begitu PHP 8.3 tersedia.

---

## 5. Data demo

### 5.1 Sumber

Enam berkas di `E:/TUGAS KULIAH/KKN/REKAP TAHUN 2026/`, sudah diverifikasi seragam — 22 kolom, satu sheet per berkas:

| Berkas | Sheet | Baris data |
|---|---|---|
| `JANUARO_2026.XLSX` | `JANUARI_2026` | 101 |
| `FEBRUARI_2026_HASIL.xlsx` | `FABRUARI_2026` | 106 |
| `MARET_2026_HASIL.xlsx` | `MARET_2026` | 108 |
| `APRIL_2026_HASIL.xlsx` | `APRIL_2026` | 108 |
| `MEI_HASIL_EKSTRAK.xlsx` | `MEI` | 109 |
| `REKAP JUNI 2026.xlsx` | `JUNI_2026` | 101 |

Total sekitar 633 baris pengukuran untuk kurang lebih 110 anak selama enam periode.

### 5.2 Anonimisasi

| Bidang | Perlakuan |
|---|---|
| Nama anak, nama orang tua | **Diganti** dengan nama Indonesia yang wajar dan konsisten antar periode |
| NIK anak, NIK orang tua | **Dibangkitkan acak**, tetap 16 digit, tetap konsisten antar periode |
| Tanggal lahir | **Tidak diubah** — lihat catatan di bawah |
| RT, RW | **Tidak diubah** |
| Jenis kelamin | **Tidak diubah** |
| BB, TB, LILA, LIKA, tanggal ukur | **Tidak diubah** |
| Z-score dan kategori | **Dihitung ulang** dari nilai ukur yang tidak diubah |

Nama asli tidak pernah masuk repo. Berkas `posyandu.json` yang di-*commit* hanya berisi hasil anonimisasi.

Yang dipertahankan justru bagian yang membuat demo meyakinkan: sebaran umur, sebaran RT, sebaran status gizi, dan pola pertumbuhan tiap anak semuanya nyata.

**Mengapa tanggal lahir tidak digeser.** Menggeser tanggal lahir akan menggeser umur, dan umur adalah kunci tabel standar — seluruh z-score ikut berubah. Padahal kecocokan angka dengan berkas Excel yang berjalan adalah bukti terkuat saat demo (bagian 9, langkah 4). Menggeser tanggal ukur bersamaan agar umurnya tetap pun tidak menyelesaikan masalah: sebagian pengukuran akan melompat ke bulan berikutnya dan merusak pengelompokan periode.

⚠️ **Keputusan yang perlu Anda ambil sebelum deploy publik.** Untuk demo di laptop, ini tidak bermasalah — Anda menunjukkan data client kepada client itu sendiri. Untuk **link online yang dapat dibuka siapa saja**, kombinasi tanggal lahir + RT + jenis kelamin + nilai ukur pada satu RW berpenduduk terbatas masih berpeluang ditelusuri oleh orang setempat, meskipun nama dan NIK sudah diganti.

Tiga pilihan:

| Pilihan | Akibat |
|---|---|
| Link dilindungi kata sandi | Netlify dan Vercel menyediakannya gratis. Angka tetap cocok dengan arsip. **Paling dianjurkan.** |
| Deploy apa adanya | Paling praktis. Perlu izin pemilik program lebih dulu. |
| Dataset kedua yang digeser khusus untuk publik | Aman, tetapi angkanya tidak lagi cocok dengan arsip — bukti terkuat demo hilang. |

Isu ini terdaftar sebagai OI-12 di [`pertanyaan-terbuka.md`](../pertanyaan-terbuka.md).

### 5.3 Perhitungan z-score

Dilakukan di **skrip ekstraksi**, bukan di browser, memakai `database/data/who-lms.json` dan rumus pada [`rujukan/antropometri.md`](antropometri.md).

Alasannya: mesin antropometri versi JavaScript akan menjadi implementasi kedua dari rumus yang sama, dan dua implementasi berarti dua peluang berbeda hasilnya. Kode Python-nya sudah diverifikasi cocok dengan master Juni 2026 — 0 selisih pada BB/U, TB/U, dan LIKA/U.

### 5.4 Normalisasi

Mengikuti [`rujukan/migrasi-data.md`](migrasi-data.md) bagian 5, seluruhnya:

- NIK dibaca sebagai teks
- Seluruh nilai teks di-*trim* (kolom `NTOB` berisi `" N"` dengan spasi)
- Nilai `PINDAH RUMAH` di kolom ukur menjadi status kehadiran, **bukan** berat badan 0
- Umur dihitung ulang dari tanggal lahir dan tanggal ukur; kolom umur di sumber diabaikan
- Berat lahir bersatuan gram ditandai, tidak dikonversi diam-diam

Demo yang menampilkan `0 kg` untuk anak yang tidak hadir akan langsung ketahuan oleh Bidan.

### 5.5 Sebaran yang dihasilkan

Sudah diperiksa langsung dari arsip, periode Juni 2026:

| Dimensi | Nilai |
|---|---|
| Jumlah anak | 101 |
| RT | 7 wilayah — RT 1 (39), RT 2 (20), RT 6 (13), RT 3 (8), RT 4 (7), RT 5 (7), RT 7 (7) |
| Jenis kelamin | 45 laki-laki, 56 perempuan |
| Umur | 1–60 bulan |
| Status TB/U | 6 pendek, 4 tinggi, sisanya normal |
| Status BB/TB | 81 gizi baik, 12 berisiko gizi lebih, 1 gizi lebih, 3 obesitas |
| Catatan | 2 anak tanpa nama pada sumbernya — **dipertahankan**, karena keadaan datanya memang begitu |

RT 1 memuat hampir 40% sasaran. Ketimpangan ini nyata dan justru berguna: grafik per RT tidak akan terlihat seperti data buatan.

> **Koreksi untuk backend nanti:** `database/seeders/PosyanduSeeder.php` menebak 5 RT. Data nyata menunjukkan 7.

---

## 6. Spesifikasi layar

Tujuh layar. Lima diambil dari artboard `Portal Posyandu - Layar Desktop v2` dan prototipe desain berjalan di `docs/design/`; dua sisanya — Login dan Periode — tidak ada di desain dan dirancang mengikuti token serta pola yang sama.

Setiap layar memakai kerangka yang sama: **tujuan · isi · data · interaksi · state kosong dan loading · aturan tampilan · yang belum nyata**.

> **Bagian ini dan [`rujukan/ui-ux.md`](ui-ux.md) bagian 5 bukan salinan satu sama lain.** Keduanya menjelaskan layar yang sama dari dua sudut, dan pembagiannya: **`05` bagian 5 menetapkan Portal yang dituju** — termasuk hal yang belum dibangun, seperti tren stunting per RT di Beranda. **Bagian ini menetapkan yang benar-benar dibangun untuk demo**, sampai ke bunyi kalimat di layar. Bila keduanya berbeda, itu bukan salah ketik melainkan jarak antara rencana dan keadaan. Token dan komponennya sendiri hanya ada di `05` (bagian 2, 3, dan 4); bagian 8 di sini menunjuk ke sana.

> ⚠️ **Angka piksel di bawah memakai skala sebelum 11 September 2026** — paling padat di 6.1, sedikit di 6.5 dan 6.8: teks `17/15 px`, radius `10 px`, tinggi kotak `44`, border `#A8B0A9`. Skala itu **sudah direvisi** menjadi 18/16 px, radius 20/14/10, target 52 px ([`05`](ui-ux.md) bagian 2.4 dan 2.5), dan `05` yang berlaku. Angkanya sengaja **tidak** ditulis ulang di sini pada 22 September 2026: menaikkannya satu per satu berarti mereka-reka ulang keputusan desain per elemen, dan itu pekerjaan desainer, bukan perapihan dokumen. Baca tata letak dan susunannya dari sini; baca ukurannya dari `05`.

> **Sumber angka.** Contoh pada desain memakai Posyandu Melati 2, RW 04, 42 balita, Agustus 2026. Demo memakai data Posyandu Tulip yang sebenarnya: RW 18, 101 balita, 7 RT, Januari–Juni 2026. Tata letaknya tetap, angkanya diganti.

---

### 6.1 Login dan pemilih peran

**Tidak ada di prototipe desain.** Bagian ini ditulis sebagai **acuan menggambar**: cukup rinci untuk dibuat artboard-nya tanpa bertanya lagi. Seluruh nilainya diambil dari token bagian 8 dan geometri yang sudah dipakai layar lain, supaya hasilnya menyatu.

**Tujuan.** Pembuka demo yang membuatnya terasa seperti aplikasi sungguhan, dan tempat menetapkan peran awal. Setelah masuk, peran tetap dapat diganti dari sidebar.

---

#### Tata letak

Dua panel, layar penuh, tanpa sidebar dan tanpa header aplikasi.

```text
┌──────────────────────────────┬───────────────────────────┐
│  PANEL KIRI                  │  PANEL KANAN              │
│  lebar 52%, min 560px        │  lebar 48%                │
│  latar #FFFFFF               │  latar #F6F7F5            │
│  isi rata kiri,              │                           │
│  blok maks 400px,            │  blok kutipan             │
│  terpusat vertikal           │  maks 420px, terpusat     │
└──────────────────────────────┴───────────────────────────┘
```

| Lebar | Perilaku |
|---|---|
| ≥ 1280 px | Dua panel, 52 / 48 |
| 1024–1279 px | Dua panel, 60 / 40 |
| < 1024 px | Panel kanan hilang. Panel kiri jadi satu kolom terpusat, blok tetap maks 400 px |

Padding panel kiri 64 px pada ≥ 1280 px, 40 px di bawahnya. Jarak antar blok mengikuti skala 8 · 16 · 24 · 32.

---

#### Isi panel kiri, dari atas ke bawah

| # | Elemen | Spesifikasi |
|---|---|---|
| 1 | Logo dan nama | Ikon `ph-bold ph-heartbeat` 28 px `#0F6E44`, berdampingan dengan `Portal Posyandu Tulip` 20/800. Jarak 12 px |
| 2 | Lokasi | `RW 18 Kelurahan Citeureup` — 15/500 `#4A5750`. Jarak 32 px ke bawah |
| 3 | Judul | `Masuk` — 32/800, `letter-spacing: -0.02em` |
| 4 | Subjudul | `Catatan pertumbuhan balita Posyandu Tulip.` — 17/400 `#4A5750`, maks 44ch. Jarak 32 px ke bawah |
| 5 | Field Email | Label `Email` 15/600 `#4A5750` di atas kotak. Kotak tinggi 44, border `#A8B0A9`, radius 10, padding samping 14, teks 17. Terisi `bidan@posyandutulip.id` |
| 6 | Field Kata sandi | Label `Kata sandi`. Kotak sama. Terisi enam titik. Ikon mata `ph-bold ph-eye` 20 px `#4A5750` di kanan dalam kotak, target sentuh 44 × 44 |
| 7 | Pemilih peran | Lihat di bawah. Jarak 24 px dari field terakhir |
| 8 | Tombol | `Masuk` — lebar penuh, tinggi 48, radius 10, `#0F6E44`, teks putih 17/700. Jarak 24 px |
| 9 | Label mode | `Mode demo — data contoh, tidak tersimpan.` 15/500 `#4A5750`, rata tengah. Jarak 16 px |

Jarak antar field 16 px. Label selalu di atas kotak, tidak pernah di dalamnya — `placeholder` dikosongkan sepenuhnya.

---

#### Pemilih peran

**Bukan dropdown.** Ketiga pilihan tampak sekaligus, supaya pemirsa demo langsung melihat ada tiga peran.

Bentuknya tiga kartu bertumpuk vertikal, bukan segmented control seperti di sidebar — di sini ruangnya cukup untuk keterangan, dan keterangan itulah yang menjelaskan bedanya.

```text
┌────────────────────────────────────────────┐
│ ( ) Kader                                  │  tinggi 64
│     Melihat data anak di RT binaannya      │
├────────────────────────────────────────────┤
│ (•) Bidan                                  │  terpilih
│     Melihat semua RT, mengoreksi data      │
├────────────────────────────────────────────┤
│ ( ) Admin                                  │
│     Mengelola akun, periode, dan ambang    │
└────────────────────────────────────────────┘
```

| Bagian | Spesifikasi |
|---|---|
| Wadah | Border `border-strong`, radius kartu, pemisah antar kartu `border` 1 px — nilainya di [`05`](ui-ux.md) bagian 2.2 dan 2.5 |
| Kartu | Tinggi minimal 64, padding 12 / 16, dapat diklik seluruhnya |
| Radio | 20 × 20, border 2 px `border-strong`; saat terpilih border dan titik warna merek |
| Nama peran | 17/700 |
| Keterangan | 15/400 `#4A5750`, satu baris |
| Kartu terpilih | Latar `#E9F3EC`, nama peran `#0F6E44` |

Bawaan: **Bidan** — peran yang paling banyak kemampuannya, jadi demo dimulai dari tampilan paling lengkap.

---

#### Enam state

| State | Tampilan |
|---|---|
| Normal | Seperti di atas |
| Fokus keyboard | `outline: 2px solid #0F6E44; outline-offset: 1px` pada elemen yang difokus. Urutan: Email → Kata sandi → tombol mata → tiga kartu peran → `Masuk` |
| Sedang memuat | Tombol `Masuk` menampilkan spinner 20 px dan teks `Masuk…`, seluruh field dinonaktifkan. Berlangsung sekitar 400 ms |
| Kredensial salah | Blok di atas field: latar `#FCEDEC`, teks `#A3170F` 15/600, ikon `ph-bold ph-warning` 16 px, isi `Email atau kata sandi salah.` Kedua field berborder `#A3170F`. **Dirancang meski demo tidak memvalidasi** — supaya tidak perlu dirancang ulang saat backend masuk |
| Nonaktif | Tombol `Masuk` memakai `border` sebagai latar dengan teks `muted-foreground`, bila salah satu field kosong |
| Berhasil | Langsung berpindah ke Beranda, tanpa layar antara |

---

#### Panel kanan

Berisi satu kutipan tentang produk, bukan ilustrasi orang atau foto stok.

```text
Satu anak, satu riwayat.
Bukan dua belas berkas Excel.
```

24/700 `#16211C`, maks 420 px, terpusat. Di bawahnya keterangan 15/400 `#4A5750`: `Data Januari–Juni 2026, dianonimkan untuk demo.`

Latar `#F6F7F5` polos. Tanpa gambar, tanpa gradasi.

**Kenapa panel kanan tetap ada.** Butir K5 pada daftar temuan desainer (bagian 13.3) menolak ilustrasi setengah layar — tetapi alasannya khusus tablet: dipakai di luar ruangan yang memantulkan cahaya, dan satu tablet dipakai lima kader bergantian sehingga kata sandi per orang terlalu berat. Portal dipakai duduk di dalam ruangan oleh bidan atau admin dengan akun masing-masing, jadi kedua alasan itu tidak berlaku. Yang tetap diambil dari K5 adalah semangatnya: panel kanan diisi kalimat yang berguna, bukan gambar dekoratif.

---

#### Data

Tidak ada. Nilai field sudah terisi.

#### Interaksi

- Kartu peran dapat diklik seluruh bidangnya, bukan hanya lingkaran radionya
- `Enter` di kolom kata sandi sama dengan menekan `Masuk`
- Tombol mata mengubah kata sandi menjadi terbaca dan sebaliknya
- `Masuk` menuju Beranda dengan peran terpilih

#### State kosong dan loading

Tidak ada state kosong — layar ini selalu terisi. State memuat ada di tabel di atas. Jeda 400 ms disengaja: perpindahan seketika terasa seperti tautan, bukan seperti masuk ke aplikasi.

#### Aturan tampilan

| Konteks | Aturan |
|---|---|
| Nama peran | Istilah lapangan: `Kader`, `Bidan`, `Admin` — bukan `user`, `role`, atau `level 1` |
| Tombol | `Masuk`, bukan `Login` atau `Sign in` |
| Pesan kesalahan | Menyebut apa yang salah: `Email atau kata sandi salah.` Bukan `Terjadi kesalahan` |
| Label mode demo | Selalu terlihat, tidak pernah disembunyikan. Client harus tahu sejak layar pertama bahwa ini data contoh |

#### Aksesibilitas

- Ketiga kartu peran adalah satu `<fieldset>` dengan `<legend>` `Masuk sebagai`
- Setiap kartu `<input type="radio">` dengan `<label>` yang membungkusnya, sehingga seluruh kartu jadi target klik
- Tombol mata `<button type="button">` dengan `aria-label="Tampilkan kata sandi"` yang berubah menjadi `Sembunyikan kata sandi`
- Blok kesalahan `role="alert"` agar dibacakan saat muncul
- Seluruh target interaktif memenuhi target sentuh minimum [`05`](ui-ux.md) bagian 2.5
- Panel kanan `aria-hidden="true"` — isinya hiasan bermakna, bukan informasi yang hilang bila tidak terbaca

#### Yang belum nyata

Kredensial tidak diverifikasi; peran apa pun dapat dipilih tanpa kata sandi yang benar. State `Kredensial salah` dirancang tetapi tidak pernah muncul di demo.

---

### 6.2 Shell aplikasi

**Tujuan.** Kerangka yang membuat enam layar lain terasa sebagai satu aplikasi.

**Isi.** Sidebar tetap berlatar `#F6F7F5`, header maksimal 72 px.

```text
Catatan Posyandu
Tulip, RW 18
├── Beranda
├── Data Anak
├── Laporan
├── Pengaturan        ← Bidan dan Admin
└── Periode           ← Admin
─────────────────────
Masuk sebagai
  ( ) Kader
  (•) Bidan
  ( ) Admin
  Boleh mengubah batas pengukuran.
```

Blok `Masuk sebagai` menetap di sidebar, bukan tersembunyi di menu profil. Ini keputusan desain: saat demo, pemirsa harus bisa melihat sendiri peran yang sedang aktif tanpa Anda menyebutkannya.

**Data.** Daftar periode untuk pemilih periode di header.

**Interaksi.** Menu aktif ditandai jelas. Pemilih periode memengaruhi Beranda dan Laporan, tidak memengaruhi Detail anak yang memang menampilkan seluruh riwayat. Ganti peran langsung mengubah menu dan tombol tanpa muat ulang.

**Aturan tampilan.** Teks di desktop tidak pernah dikecilkan demi memuat lebih banyak data. Batas terkecil 15 px.

**Yang belum nyata.** Menu Pengaturan bawaan *starter kit* tidak dipakai; yang ada adalah layar Pengaturan pada 6.7.

---

### 6.3 Beranda

**Tujuan.** Layar paling meyakinkan. Dalam sepuluh detik client melihat seluruh kondisi gizi Posyandu — sesuatu yang selama ini butuh berjam-jam menyusun spreadsheet.

**Isi.**

*Subjudul dengan caveat periode.* `Juni 2026, data per 13 Juni. Data contoh.` Satu tempat saja, tidak diulang di tiap kartu.

*Empat KPI, tanpa ikon dan tanpa kalimat penjelas per kartu:*

| Kartu | Isi |
|---|---|
| Sasaran, S | jumlah balita 0–59 bulan |
| Ditimbang, D | `dari {S} sasaran` |
| Cakupan penimbangan, D/S | persen |
| Naik, N | `dari {D} yang diukur` |

*Status gizi* — tiga angka besar berdampingan tanpa grafik dan tanpa pembatas baris: `Gizi baik`, `Gizi kurang`, `Gizi buruk`. Di bawahnya satu kalimat: `Dari {D} anak yang sudah diukur, {S−D} anak belum punya angka bulan ini. Indeks mengikuti umur anak: BB/PB di bawah 24 bulan, BB/TB untuk 24 bulan ke atas.`

*Cakupan D/S enam bulan* — batang per periode, Januari sampai Juni.

*Perlu perhatian* — jumlah anak berada di header tabel, bukan sebagai kartu KPI tersendiri. Paling mendesak di atas. Tiap baris memuat inisial, nama, `{umur} bulan, RT {rt}`, chip kategori, dan **satu baris alasan** — misalnya `BB/TB −3,1 SD, turun dari −2,6 SD` atau `Berat sama dua bulan berturut, 7,3 kg`.

**Data.** Seluruh pengukuran periode terpilih, plus enam periode untuk grafik cakupan.

**Interaksi.** Pemilih periode mengubah seluruh angka. Klik baris `Perlu perhatian` membuka Detail anak.

**State kosong.** `Belum ada pengukuran pada periode ini.` disertai tombol berpindah ke periode terakhir yang berisi.

**State loading.** Skeleton berbentuk kartu dan baris, bukan spinner.

**Aturan tampilan.** D/S ditulis dengan pembilang dan penyebutnya. Kategori selalu berupa teks. Baris alasan wajib ada — angka tanpa sebab tidak bisa ditindaklanjuti.

**Yang belum nyata.** Blok sinkronisasi offline pada desain **dibuang**. Portal dipakai di tempat berkoneksi, sehingga blok itu tidak akan pernah menyala. Lihat [ADR-0003](../adr/0003-batas-portal-vs-aplikasi-tablet.md).

---

### 6.4 Data Anak

**Tujuan.** Membuktikan bahwa mencari seorang anak butuh beberapa detik, bukan membuka dua belas berkas Excel.

**Isi.** Subjudul `{n} balita terdaftar di RW 18. Data contoh.` dan tombol `Tambah balita`.

Filter dengan **label di atas kotaknya**, bukan placeholder sebagai label:

- `Cari nama anak atau nama ibu`
- `RT` — dari `Semua RT` sampai `RT 07`
- `Hanya yang perlu perhatian`

Kolom: `Nama anak · Umur · RT · Ibu · Diukur terakhir · Status gizi · Aksi`

Aksi per baris: `Detail`, `Ubah`.

**Data.** Seluruh anak dengan pengukuran terakhirnya.

**Interaksi.** Pencarian berjalan seiring ketikan, mencocokkan nama anak **maupun nama ibu**. Filter dapat digabungkan. Jumlah hasil selalu terlihat.

**State kosong.** Menyebut ulang kata kunci dan menawarkan jalan keluar: `Tidak ada anak bernama "andi" di RT 03.` dengan tombol `Hapus kata pencarian`.

**State loading.** Skeleton baris tabel.

**Aturan tampilan.**

- Umur ditulis `18 bulan`; di Detail anak ditambah bentuk panjangnya `1 tahun 6 bulan`
- **NIK hanya muncul bila belum lengkap**, sebagai baris kedua di bawah nama: `NIK belum lengkap`. Anak dengan data lengkap tidak menampilkan NIK sama sekali — mengurangi paparan data pribadi di layar yang paling sering terbuka
- Kolom `Status gizi` tidak menyebut indeksnya, karena indeksnya berbeda menurut umur anak
- Dua anak tanpa nama ditampilkan sebagai `(nama belum tercatat)`, tidak disembunyikan
- Nama panjang membungkus ke baris kedua, tidak dipotong elipsis

**Yang belum nyata.** `Tambah balita` dan `Ubah` menampilkan `Belum tersedia di demo`.

---

### 6.5 Detail anak

**Tujuan.** Layar yang paling sering membuat client mengangguk. Riwayat pertumbuhan satu anak sebagai satu garis.

**Isi.**

*Header.* Nama anak, subjudul `Data Anak, detail. Data contoh.`, tombol `Ubah data`, dan panah kembali ber-`aria-label`.

*Identitas* — daftar dua kolom tanpa kotak: Foto (opsional) · Jenis kelamin · Tanggal lahir (`22 Januari 2025, 18 bulan`) · NIK (berspasi tiap empat digit) · Ibu · Telepon · Alamat (`RT 03, anak ke-2`).

*Status pengukuran {tanggal}* — tiga blok z-score, **satu penanda saja**: angka besar berwarna, satuan `SD` di bawahnya, lalu label kategori. Indeks yang ditampilkan **mengikuti umur anak**:

| Umur | Tiga indeks yang ditampilkan |
|---|---|
| < 24 bulan | BB/PB · BB/U · PB/U |
| ≥ 24 bulan | BB/TB · BB/U · TB/U |

Caption: `Acuan standar pertumbuhan WHO 2006, dihitung dari parameter LMS. Nilainya sama dengan tabel Permenkes No. 2 Tahun 2020.`

*Grafik KMS.* Tampilan default pada lebar 1024 px ke atas. Spesifikasinya diambil utuh dari artboard `GrafikKMS`, yang merupakan komponen tersendiri — bukan gambar yang digambar ulang.

**Indeksnya hanya satu: berat badan menurut umur.** Ini bukan penyederhanaan — KMS pada Buku KIA memang kartu berat-menurut-umur, dan menyamakannya membuat grafik di layar dapat dibandingkan langsung dengan buku yang dipegang ibu. Kelima indeks lain tetap terbaca sebagai angka pada blok z-score dan tabel riwayat.

| Bagian | Spesifikasi |
|---|---|
| Kanvas | SVG `viewBox="0 0 1100 640"`, padding kiri dan kanan 70, atas 20, bawah 80 |
| Panel umur | Jendela 12 bulan: `0-12` · `12-24` · `24-36` · `36-48` · `48-60`. Hanya panel sampai umur pengukuran terakhir yang ditampilkan. Panel aktif berlatar `#0F6E44` putih; sisanya berborder `#4A5750` |
| Sumbu tegak | Berat 1 kg sampai `skalaMax` (bawaan 18 kg). Label kg di **kiri dan kanan**, 16/600 `#4A5750` |
| Sumbu datar | Umur bulan, label 17/600. Judul sumbu `Umur, bulan` dan `Berat badan, kg` 17/700 |
| Garis bantu | Bulan `#16211C` 1,6 · minggu 0,6 opasitas 0,35 (tiga per bulan) · kg 0,6 opasitas 0,3 |
| Pita | −3…−2 dan +2…+3 kuning `#F2C300` · −2…−1 dan +1…+2 hijau muda `#6FB63C` · −1…+1 hijau tua `#1E8C34` |
| Garis SD | z = −3 merah `#D92B0C` tebal 2,4 · z = 0 tebal 1,6 · sisanya `#16211C` tebal 1,2 |
| Kurva anak | Halo putih tebal 8 di bawah, lalu `#16211C` tebal 3,5, ujung dan sambungan membulat |
| Titik ukur | Lingkaran jari-jari 7, isi putih, garis `#16211C` tebal 3,5 |
| Garis terputus | Kurva dipecah menjadi segmen terpisah setiap kali **selisih umur antar pengukuran lebih dari satu bulan** |
| Nilai garis SD | `M × (1 + L×S×z)^(1/L)` — rumus yang sama dengan `ZScore::nilaiPadaZ` di mesin PHP |

Di atas grafik dicetak dua baris slogan KMS Buku KIA: `Timbanglah Anak Anda Setiap Bulan` dan `Anak Sehat, Tambah Umur, Tambah Berat, Tambah Pandai`. Di kanan atas ada penanda `Acuan perempuan, WHO 2006` atau `Acuan laki-laki, WHO 2006` beserta ikon jenis kelamin.

Legenda empat butir di bawah grafik, lalu keterangan: `Garis anak terputus pada bulan tanpa penimbangan. Pita mengikuti standar WHO 2006 yang dipakai KMS Buku KIA.`

Kontrak komponennya sudah ditetapkan artboard dan dipakai apa adanya:

```ts
{ kelamin: 'P' | 'L'; panelAwal: number; skalaMax: number; riwayat: [number, number][] }
```

`riwayat` berisi pasangan `[umurBulan, beratKg]`.

> Warna pita **dikecualikan dari palet aplikasi**. Ini satu-satunya tempat warna di luar token bagian 8 dibolehkan, karena tujuannya justru menyamai buku cetak, bukan menyamai aplikasi.

*Riwayat pengukuran.* Kolom: `Tanggal · Umur · Berat · Panjang atau Tinggi · {indeks berat} · {indeks tinggi} · Pertumbuhan · Kader`. Kolom `Pertumbuhan` berisi `N, naik` · `T, tidak naik` · `O` · `B`.

*Imunisasi.* Status ringkas: `Imunisasi dasar — Lengkap`, `Imunisasi lanjutan — Belum lengkap`. Caption: `Detail per vaksin ada di Buku KIA fisik. Aplikasi hanya menyimpan status ringkas.`

*Catatan bidan.* Tanggal, nama bidan, isi catatan. Di bawahnya tombol `Tambah catatan` — hanya tampil bagi Bidan ke atas.

State kosong: `Belum ada catatan dari bidan.` disertai tombol yang sama. Bukan blok kosong tanpa penjelasan.

**Data.** Seluruh pengukuran anak lintas enam periode, plus garis SD dari `who-lms.json`.

**Interaksi.** Menunjuk titik pada grafik menampilkan tanggal, nilai ukur, z-score, dan kategori. Klik baris riwayat menyorot titik yang bersesuaian.

**State kosong.** Satu pengukuran menghasilkan titik tunggal disertai `Baru satu kali pengukuran — kurva muncul setelah pengukuran berikutnya`. Imunisasi kosong berbunyi `Belum ada catatan imunisasi`.

**State loading.** Skeleton berbentuk grafik.

**Aturan tampilan.** Z-score dua desimal bertanda. Nilai kosong `—`, tidak pernah `0`. Satuan selalu ditulis. Jenis ukur berdampingan dengan tingginya. Bila jenis ukur diasumsikan dari umur, keterangan itu muncul di layar.

**Yang belum nyata.** Data imunisasi dan catatan bidan kosong untuk hampir semua anak — kolomnya tidak ada di berkas sumber. Bagian ini menunjukkan tempatnya, bukan isinya.

---

### 6.6 Laporan

**Tujuan.** Menunjukkan bahwa berkas yang selama ini disusun manual bisa keluar dari sistem dalam satu klik.

**Isi.** Subjudul `Juni 2026. RW 18 Kelurahan Citeureup. Data contoh.` dengan tombol `Unduh CSV` dan `Cetak A4`.

*Lima angka:* `S sasaran` · `D ditimbang` · `D/S cakupan` · `N/D naik` · `BGM di bawah garis merah`.

*Rekap per RT* — kolom `RT · S · D · D/S · N · T · O · B · BGM`, dengan baris `Total`. RT tanpa sasaran tidak ditampilkan.

Legenda wajib di bawah tabel: `S sasaran, D ditimbang, N naik, T tidak naik, O tidak ditimbang bulan lalu, B baru pertama kali, BGM di bawah garis merah pada KMS. BGM dihitung dari BB/U, jadi jumlahnya bisa berbeda dari status gizi BB/PB atau BB/TB.`

*Cakupan layanan tambahan* — grid empat angka berbentuk `{n} dari {D}`: Vitamin A · Obat cacing · Imunisasi dicatat · KPSP. Caption: `Vitamin A dan obat cacing diberikan setiap Februari dan Agustus.`

**Data.** Seluruh pengukuran periode terpilih beserta penilaian gizinya.

*Tiga tab periode* di atas isi laporan:

| Tab | Isi | Catatan |
|---|---|---|
| `Harian` | Satu sesi penimbangan — tanggal ukur pada periode terpilih | Data impor hanya punya satu tanggal ukur per periode, jadi tab ini menampilkan satu sesi |
| `Bulanan` | **Bawaan.** Seluruh periode terpilih | |
| `Tahunan` | Agregat Januari–Juni 2026 | Disertai keterangan `2026 masih berjalan, angka belum final`. Arsip 2025 tidak diimpor ke demo |

Yang diagregasi pada tab Tahunan: S, D, D/S, N, T, O, B, dan BGM dijumlahkan per RT lintas enam periode; D/S dihitung ulang dari totalnya, bukan dirata-rata dari persentase bulanan.

**Interaksi.** Tab periode, filter RT. **Tombol `Unduh CSV` benar-benar mengunduh berkas.**

> **Layar dan berkas berbeda isinya.** Tabel di layar bersifat agregat SKDN per RT — bentuk yang dipakai laporan Posyandu. Berkas CSV bersifat rinci: satu baris per anak dengan **enam pasang kolom z-score dan status** ditambah kolom `Versi Standar`, mengikuti susunan `0_REKAP Z SCORE GABUNGAN_JAN_DES 2026.xlsx` supaya bisa langsung dibandingkan dengan rekap Excel yang berjalan.

**State kosong.** Menyebut periode yang dipilih dan menawarkan berpindah.

**Aturan tampilan.** Z-score dua desimal; sel kosong bila tidak dapat dihitung — bukan `0`. CSV diawali BOM UTF-8. Tabel menggulir di dalam wadahnya; badan halaman tidak pernah menggulir mendatar.

**Yang belum nyata.** `Cetak A4` menampilkan `Belum tersedia di demo`. Format F1 Gizi dan Buku 7 belum ada — formatnya masih direvisi ([OI-07](../pertanyaan-terbuka.md)).

---

### 6.7 Pengaturan

**Tujuan.** Menunjukkan sisi tata kelola: ambang ditetapkan bersama, perubahannya tercatat, dan kader tidak pernah diblokir oleh sistem.

**Isi.** Subjudul `Batas pengukuran dan ambang peringatan. Terakhir diubah {tanggal} oleh {nama}. Data contoh.`

Callout di atas: `Batas ini hanya memicu pertanyaan konfirmasi. Kader tidak pernah diblokir. Perubahan berlaku untuk pengukuran baru, data lama tidak dihitung ulang.`

*Rentang wajar pengukuran* — Berat `1,0`–`30,0` kg · Panjang atau tinggi `40,0`–`130,0` cm · LILA `8,0`–`25,0` cm · LIKA `30,0`–`60,0` cm. Satuan berada di segmen dalam kotak, bukan sebagai tombol terpisah.

*Ambang selisih antar bulan* — Berat naik maksimal `2,0` kg · Berat turun maksimal `1,5` kg · Tinggi berkurang `0,5` cm · Umur maksimal balita `60` bulan.

*Ambang z-score, terkunci* — `Ditetapkan Permenkes No. 2 Tahun 2020, tidak bisa diubah dari aplikasi.`

*Tabel standar antropometri* — versi `WHO-2006`, 906 baris, status `Tersedia`.

*Siapa boleh mengubah batas* — daftar bertanda: Bidan `Boleh mengubah` · Admin `Boleh mengubah` · Kader `Menu ini tidak tampil`. Caption: `Setiap perubahan dicatat dengan nama dan waktu.`

Tombol: `Simpan pengaturan`, `Kembalikan ke bawaan`.

**Data.** Nilai statis dari berkas konfigurasi demo.

**Interaksi.** Field dapat diubah selama sesi; `Simpan` menampilkan `Belum tersedia di demo`.

**Aturan tampilan.** Semua label di atas kotaknya. Angka *tabular*. Desimal memakai koma.

**Yang belum nyata.** Tidak ada yang tersimpan. Bagian unduhan tabel standar pada desain dibuang bersama blok offline lainnya; yang tersisa keterangan versi standarnya.

---

### 6.8 Periode

Tidak ada di desain — dirancang mengikuti pola tabel pada 6.4.

**Tujuan.** Menunjukkan bahwa periode kegiatan adalah entitas yang dikelola, bukan sekadar label.

**Isi.** Tabel: `Periode · Tanggal kegiatan · Sasaran · Ditimbang · D/S · Status`. Enam baris, Januari sampai Juni 2026. Tombol `Tambah periode`.

**Data.** Daftar periode beserta agregat pengukurannya.

**Interaksi.** Klik baris menuju Beranda pada periode tersebut.

**State kosong.** Tidak berlaku — selalu ada enam periode.

**Aturan tampilan.** Periode ditulis `Juni 2026`, bukan `2026-06`.

**Yang belum nyata.** `Tambah periode` menampilkan `Belum tersedia di demo`. Layar ini hanya tampil bagi Admin.

---

## 7. Matriks peran × layar

Pergantian peran harus mengubah sesuatu yang **terlihat**, kalau tidak fiturnya tidak berguna saat demo.

| Elemen | Kader | Bidan | Admin |
|---|:---:|:---:|:---:|
| Menu Beranda | ✅ | ✅ | ✅ |
| Menu Data Anak | ✅ | ✅ | ✅ |
| Menu Laporan | ✅ | ✅ | ✅ |
| Menu Pengaturan | ❌ | ✅ | ✅ |
| Menu Periode | ❌ | ❌ | ✅ |
| Tombol `Tambah balita` | ❌ | ✅ | ✅ |
| Aksi `Ubah` pada baris anak | ❌ | ✅ | ✅ |
| Tombol `Ubah data` di Detail anak | ❌ | ✅ | ✅ |
| Tombol `Unduh CSV` | ❌ | ✅ | ✅ |
| Tombol `Tambah catatan` di Detail anak | ❌ | ✅ | ✅ |
| Mengubah ambang di Pengaturan | ❌ | ✅ | ✅ |
| Filter RT di Data Anak | terkunci ke RT-nya | semua RT | semua RT |

Baris terakhir paling menarik didemokan: kader hanya melihat RT binaannya, dan jumlah hasil langsung berubah dari 101 menjadi 39 di depan mata client.

Mengikuti [Otorisasi](../arsitektur.md). Di demo pembatasannya hanya di tampilan — **bukan pengamanan**.

---

## 8. Spesifikasi visual dan komponen

**Token dan inventaris komponen tidak ditulis di sini.** Keduanya hidup di [`rujukan/ui-ux.md`](ui-ux.md) — token warna, garis, tipografi, dan bentuk di bagian 2 dan 3; daftar komponen di bagian 4.

> **Tabel ringkas token dihapus 22 September 2026.** Ia menyalin tiga belas nilai dari `05` dan sudah melenceng di **empat** tempat sekaligus — seluruhnya akibat revisi 11 September 2026 yang tidak ikut tersalin ke sini:
>
> | Yang tertulis di sini | Yang berlaku (`05`) | Akibatnya bila diikuti |
> |---|---|---|
> | garis `#DCE0DA` | `#C2C9C0` (bagian 2.2) | kontras 1,3:1, gagal syarat 3:1 komponen non-teks |
> | isi 17 px, label 15 px | 18 px dan 16 px (bagian 2.4) | teks terkecil justru yang paling perlu terbaca kader |
> | radius 8 / 10 / 6 px | 20 / 14 / 10 px (bagian 2.5) | bentuk tidak cocok dengan prototipe v2 |
> | target sentuh 44 px | 52 px (bagian 2.5) | di bawah ambang yang sudah ditetapkan |
>
> Kode memakai nilai yang benar; `client/src/app.css` mencatat bahwa `#DCE0DA` memang tidak dipakai lagi. Jalur berkas hurufnya juga masih menunjuk `demo/assets/fonts/`. Salinan token seperti ini membeku sementara sumbernya berubah, tanpa ada yang menandai selisihnya — karena itu bagian ini kini hanya menunjuk ke `05`.

Dua hal di bawah khusus milik demo dan tidak ada di `05`:

⚠️ **`portal-sistem-desain.html` adalah sistem desain aplikasi tablet** (lansia-first, dasar 18 px, radius 12 px, target 56 px), **bukan Portal**. Nilainya tidak berlaku di sini.

**Ikon** memakai subset SVG lokal — bukan paket npm dan bukan CDN, supaya demo berjalan tanpa jaringan. Lihat bagian 4.4. Berkas hurufnya `.woff2` bobot 400/600/700/800 di `client/src/assets/fonts/`, di-*commit* ke repo dengan alasan yang sama.

### 8.2 Aturan angka — tidak boleh dilanggar

Produk ini pada dasarnya adalah tabel angka, jadi aturan penyajian angka berlaku di seluruh layar.

| Aturan | Contoh |
|---|---|
| *Tabular figures* pada `body` dan `input` | kolom sejajar sempurna |
| Koma sebagai pemisah desimal | `−1,23` |
| Z-score dua desimal, selalu bertanda | `−2,15` · `+0,60` |
| Satuan selalu ditulis | `9,2 kg` · `78,1 cm` |
| Nilai kosong sebagai `—` | tidak pernah `0` |
| Persentase dengan penyebutnya | `43% (18 dari 42)` |
| NIK berspasi tiap empat digit | `3204 0162 0125 0002` |
| Umur dalam bulan, plus bentuk panjang di Detail | `18 bulan` · `1 tahun 6 bulan` |
| Tanggal ringkas di tabel | `14 Agu 2026` |

### 8.3 Komponen

Daftar lengkapnya di [`rujukan/ui-ux.md`](ui-ux.md) bagian 4 — termasuk `status-gizi-badge`, `z-score-cell`, `kms-chart`, dan `filter-periode` yang dirujuk beberapa komentar di kode sebagai "bagian 8.3". Nomor ini dipertahankan supaya rujukan itu tetap mendarat.

Satu blok yang tidak berdiri sebagai berkas komponen tersendiri dan karena itu tidak masuk daftar `05`:

| Blok | Keterangan |
|---|---|
| `z-score-block` | Blok besar di Detail anak — angka berwarna, `SD`, label. Hidup di dalam `client/src/pages/anak/show.tsx`, bukan sebagai komponen terpisah |

### 8.4 Gerak

Prototipe desain tidak memakai animasi sama sekali. Implementasi menambahkan transisi 200 ms pada elemen interaktif (`transform` dan `opacity` saja) dan jeda bertahap kecil pada baris tabel saat filter berubah — cukup untuk menandakan isinya berganti.

Tanpa animasi gulir, parallax, atau efek masuk yang mencolok. Ini portal data kesehatan, bukan halaman pemasaran.

---

## 9. Skenario presentasi

> **Dihapus 22 September 2026.** Berisi naskah peragaan 15 menit — persiapan, urutan layar, kalimat yang diucapkan. Peragaannya sudah berlangsung dan naskah semacam ini tidak dipakai dua kali. Isinya ada di riwayat git.
>
> Nomor 9 dipensiunkan dan tidak dipakai ulang, supaya rujukan lama tidak mendarat di isi yang berbeda.

---

## 10. Peta transisi ke backend

> **Sebagian besar bagian ini dipangkas 22 September 2026.** Isinya dulu memetakan tiap layar ke controller Laravel beserta delapan langkah menjadikan demo sebuah produk — seluruhnya batal sejak [ADR-0006](../adr/0006-pindah-ke-express-react-postgres.md). Yang disimpan di bawah hanya bagian yang masih mengikat, karena empat komentar di kode menunjuk ke sini. Versi lengkapnya ada di riwayat git.

**Bentuk props tiap halaman adalah kontraknya.** Itu gagasan yang bertahan, dan itu keuntungan yang disengaja: rancangan API-nya sudah teruji lewat pemakaian sungguhan sebelum satu baris kode server ditulis.

Props kini dipasok dari satu tempat — `client/src/layar.tsx` — dan tipenya dideklarasikan sekali di `client/src/types/posyandu.ts`, tidak diketik ulang di tiap halaman.

| Layar | Berkas halaman | Props yang dikirim |
|---|---|---|
| Login | `pages/auth/login.tsx` | — |
| Beranda | `pages/dashboard.tsx` | `periode`, `ringkasan`, `statusGizi`, `cakupanEnamBulan`, `perluPerhatian` |
| Data Anak | `pages/anak/index.tsx` | `anak` (paginated), `filter`, `wilayahRt` |
| Detail anak | `pages/anak/show.tsx` | `anak`, `pengukuran`, `penilaianGizi`, `garisSd`, `layanan`, `catatanBidan` |
| Laporan | `pages/laporan/index.tsx` | `ringkasan`, `rekapPerRt`, `cakupanLayanan`, `filter` |
| Pengaturan | `pages/pengaturan/index.tsx` | `ambang`, `standarVersi`, `izinPeran`, `terakhirDiubah` |
| Periode | `pages/periode/index.tsx` — **belum dibangun** | `periode` beserta agregatnya |

Satu lingkup baru yang muncul dari desain dan belum ada di [arsitektur](../arsitektur.md): tabel `pengaturan_ambang` beserta jejak auditnya. Layar Pengaturan sudah menampilkannya, basis data belum menyimpannya.

Urutan pekerjaan yang berlaku sekarang ada di [`rencana-kerja.md`](../rencana-kerja.md).

---

## 11. Di luar lingkup demo

Daftar tegas, supaya tidak ada salah paham di kemudian hari.

| Hal | Keadaan di demo |
|---|---|
| Penyimpanan data | Tidak ada. Muat ulang mengembalikan semuanya. |
| Tambah dan ubah data | Tidak ada. Tombolnya terlihat, menampilkan `Belum tersedia di demo`. |
| Autentikasi | Palsu. Kredensial apa pun diterima. |
| Otorisasi | Hanya tampilan. Bukan pengamanan. |
| Impor Excel | Sudah dijalankan lebih dulu; tidak ada antarmukanya. |
| Export F1 dan Buku 7 | Tidak ada. Rekap per RT di layar sudah berbentuk Buku 7, tetapi belum bisa dicetak ke formatnya. |
| `Cetak A4` | Tidak ada. |
| Menyimpan ambang di Pengaturan | Tidak ada. Nilainya dapat diubah selama sesi, tidak tersimpan. |
| Data imunisasi, Vitamin A, KPSP | Kosong — tidak ada di berkas sumber. Angka cakupan layanan tambahan bernilai nol. |
| Catatan bidan | Kosong — tidak ada di berkas sumber. |
| Aturan 1T/2T/3T | Kolom `Pertumbuhan` menampilkan `NTOB` mentah dari arsip. Tidak ada logika turunan sampai [OI-01](../pertanyaan-terbuka.md) selesai. |
| Kategori LILA/U | Z-score tampil, label kosong ([OI-04](../pertanyaan-terbuka.md)). |
| Kemampuan offline | **Sengaja dibuang** dari desain. Milik aplikasi tablet ([ADR-0003](../adr/0003-batas-portal-vs-aplikasi-tablet.md)). Catatan: demo sendiri **berjalan penuh tanpa internet** — itu soal aset lokal (bagian 4.4), bukan sinkronisasi data. |
| Meja Ukur | Layar input pengukuran pada artboard `Portal Posyandu - Layar Kader`. **Milik aplikasi tablet.** Lihat bagian 13. |
| Tombol `Ukur sekarang` di Detail anak | Pintasan ke form ukur, dan form ukur milik tablet. |
| Rujukan ke Puskesmas | Butir T1 daftar temuan desainer. Ditunda — [OI-14](../pertanyaan-terbuka.md). |
| Link publik | Belum ada. Demo dijalankan lokal; deploy menunggu [OI-12](../pertanyaan-terbuka.md). |
| Mode gelap | Tidak dibangun. Prototipe desain mengunci tema terang. |
| Tampilan ponsel | Terbaca, tidak dioptimalkan. |

---

## 12. Urutan kerja

Disusun agar ada sesuatu yang bisa dilihat sedini mungkin, dan agar layar paling meyakinkan selesai lebih dulu.

| Tahap | Isi | Hasil yang bisa dilihat |
|---|---|---|
| **T1** | Skrip ekstraksi + `posyandu.json` | Data siap; sebaran bisa diperiksa terhadap arsip |
| **T2** | `vite.demo.config.ts`, router, token di `app.css`, shell, Login | Aplikasi terbuka, menu bisa diklik, ganti peran bekerja |
| **T3** | Beranda | **Layar paling meyakinkan sudah bisa didemokan** |
| **T4** | Data Anak + Detail anak + kurva KMS | Alur inti utuh — sudah cukup untuk demo bila waktu mendesak |
| **T5** | Laporan + unduh CSV | Bukti bahwa laporan keluar dari sistem |
| **T6** | Pengaturan + Periode | Set tujuh layar lengkap |
| **T7** | State kosong, loading, polish, aset lokal, build statis | Uji tanpa Wi-Fi lulus; berkas build tersimpan lokal siap pakai |

Setelah **T4** demo sudah layak dijalankan. T5 sampai T7 menaikkan mutu dan kelengkapan, bukan membuka kemungkinan baru.

Token visual masuk di **T2**, bukan di akhir — sekarang nilainya sudah pasti dari `docs/design/`, jadi tidak ada alasan menundanya dan mengecat ulang belakangan. Aset lokal (huruf dan ikon) juga dipasang di T2, bukan T7, karena seluruh layar berikutnya bergantung padanya.

**T7 tidak memuat deploy.** Build statis tetap dihasilkan agar siap kapan pun, tetapi tidak diunggah ke mana pun — demo dijalankan dari laptop. Link publik menunggu [OI-12](../pertanyaan-terbuka.md).

---

## 13. Temuan dari artboard yang belum diekspor

Project Claude Design memuat **sembilan** artboard; tiga pertama sudah disalin ke `docs/design/` lebih dulu, enam sisanya baru terbaca setelah `/design-login` aktif. Bagian ini merekam apa yang ditemukan dan apa yang diputuskan, supaya tidak ditanyakan ulang.

### 13.1 Artboard dan perannya

Inventaris artboard beserta perannya ada di [`docs/design/README.md`](../design/README.md), yang tinggal di folder artboard-nya sendiri. Tidak diulang di sini.

Satu catatan yang tidak ada di sana: **putaran kedua menang.** `Layar Desktop v2` menyebut sendiri apa yang diubahnya dari putaran pertama, dan versi itulah yang diikuti bagian 6.

### 13.2 Meja Ukur — milik tablet, bukan Portal

`Layar Kader` memuat layar bernama **Meja Ukur**: mode input pengukuran desktop 1440 px dengan antrean anak, pintasan papan tombol (panah pindah anak, `Tab` pindah field, `Enter` simpan lalu muat berikutnya, `Ctrl+L` lewati), pembanding `Bulan lalu`, dan z-score terhitung langsung saat mengetik. Navigasinya bertambah jadi lima item.

**Keputusan: milik aplikasi tablet, tidak masuk Portal.** [ADR-0003](../adr/0003-batas-portal-vs-aplikasi-tablet.md) tetap berlaku dan **tidak** direvisi — temuan ini justru menguatkannya, karena seluruh rancangan Meja Ukur berputar pada pekerjaan di meja penimbangan saat hari Posyandu, bukan pada pekerjaan bidan di depan laptop.

Konsekuensinya: tombol `Ukur sekarang` di Detail anak juga tidak masuk, karena ia hanya pintasan menuju layar itu.

### 13.3 Daftar temuan desainer

Sembilan dari dua belas butir sudah selaras atau sudah diputuskan.

| Kode | Butir | Keputusan |
|---|---|---|
| T1 | Rujukan ke Puskesmas | **Tidak masuk.** Desainer menyebutnya *"satu-satunya kekurangan yang berakibat pada anaknya"* — dicatat sebagai [OI-14](../pertanyaan-terbuka.md), bukan diabaikan |
| T2 | Isian Vitamin A dan obat cacing | Milik form pengukuran, jadi milik tablet |
| T3 | Hasil yang dibawa pulang ibu | Milik tablet dan cetak; di luar lingkup demo |
| K1 | Tab bulan dan tahun di Kartu Kontrol | Tidak berlaku — Portal memakai satu daftar riwayat, terbaru di atas, persis seperti anjurannya |
| K2 | Layar portal pilih modul | Tidak pernah ada di Portal |
| K3 | Dashboard di tablet | Milik tablet |
| K4 | Kolom LIKA dihapus | **Ditolak.** Premisnya *"tidak dipakai di mana pun"* tidak berlaku di Posyandu Tulip — arsip pemilik program memuat `0_REKAP JAN-DES 2026_LIKA_U.xlsx`, jadi memang ada pembacanya. LIKA tetap tampil |
| K5 | Halaman masuk tanpa ilustrasi setengah layar | **Sebagian diambil.** Alasannya khusus tablet; Portal tetap dua panel, tetapi panel kanan diisi kalimat berguna, bukan gambar. Lihat 6.1 |
| K6 | Ambang z-score sebagai keterangan, bukan kolom | ✅ sudah begitu sejak awal di 6.7 |
| P1 | Nama produk | **Portal Posyandu Tulip.** Nama `Catatan Posyandu` dan `SIMPATIK Posyandu` pada artboard tidak dipakai |
| P2 | Cakupan sasaran | Sudah diputuskan sejak awal: balita saja. Lihat [PRD utama](../prd/prd-utama.md) |
| P3 | Imunisasi dapat dicatat dari aplikasi? | Terbuka — [OI-15](../pertanyaan-terbuka.md) |

Lima butir "Jangan diubah" seluruhnya sudah selaras. Dua di antaranya kebetulan sama persis dengan aturan yang sudah ditetapkan lebih dulu di PRD produk: tombol `Tidak hadir` (*"kolom kosong dan anak tidak datang bukan hal yang sama"* — DR-04) dan keterangan sumber angka (*"ini yang membedakan alat kesehatan dari mockup"*).

### 13.4 Cakupan pemeriksaan tambahan

Dua artboard menyebut daftar yang berbeda:

| `Layar Kader` (putaran pertama) | `Layar Desktop v2` (putaran kedua) |
|---|---|
| Imunisasi dicatat · Asupan gizi · Pemeriksaan gigi · KPSP | Vitamin A · Obat cacing · Imunisasi dicatat · KPSP |

Bagian 6.6 memakai versi **v2**, mengikuti aturan bahwa putaran kedua menang.

---

## 14. Standar penulisan kode

> **Sebagian besar bagian ini dipangkas 22 September 2026.** Tujuh sub-bagian (14.1–14.3, 14.5–14.8) berisi aturan lint, format, penamaan, dan struktur yang **sudah ditegakkan mesin** — konfigurasi ESLint dan Prettier di `client/` dan `server/` adalah penegaknya, dan konfigurasi itu tidak pernah tertinggal seperti dokumen. Sebagiannya juga menyebut jalur `resources/js/` yang sudah tidak ada. Nomor 14.1–14.3 dan 14.5–14.8 pensiun. Versi lengkapnya ada di riwayat git.
>
> Dua sub-bagian di bawah **tetap berlaku** karena tidak bisa ditegakkan mesin, dan keduanya dirujuk dari luar.

### 14.4 TypeScript

`strict: true`, `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`. Alias `@/*` menunjuk `client/src/*`.

| Aturan | Ketentuan |
|---|---|
| Alias impor | Selalu `@/components/…`, tidak pernah `../../components/…` |
| `any` | ESLint mengizinkannya, tetapi **tipe data domain wajib dideklarasikan**. `any` hanya boleh di batas pustaka pihak ketiga yang memang tidak bertipe |
| Tipe domain | Satu tempat: `client/src/types/posyandu.ts`. Bukan diketik ulang di tiap halaman |
| Props halaman | Dideklarasikan sebagai `type Props = { … }` di berkas halaman itu sendiri, karena bentuk props inilah yang menjadi kontrak endpoint nanti (bagian 10) |
| Nilai kosong | `null` untuk "tidak ada nilai", bukan `undefined` dan bukan `0`. Ini menurun langsung dari DR-04 dan DR-07 pada [PRD utama](../prd/prd-utama.md) |

> Node 24 menjalankan TypeScript lewat *type stripping*, sehingga `enum`, `namespace`, dan *constructor parameter property* dilarang di `server/`. Rinciannya di [ADR-0006](../adr/0006-pindah-ke-express-react-postgres.md).

### 14.9 Selesai berarti

Sebuah tahap (T1–T7 pada bagian 12) dinyatakan selesai bila **seluruhnya** terpenuhi:

1. `npm run lint:check` · `format:check` · `types:check` — ketiganya lulus
2. Nol pesan kesalahan dan peringatan di konsol browser
3. Layar yang dikerjakan punya state kosong dan state memuat yang dirancang, bukan kebetulan
4. Uji tanpa Wi-Fi lulus — huruf, ikon, dan data tetap utuh
5. Nilai kosong tampil sebagai `—`, tidak pernah `0`
6. Tidak ada `TODO` tanpa isu terbuka yang menaunginya di [`pertanyaan-terbuka.md`](../pertanyaan-terbuka.md)

---

## 15. Peta PRD fitur

Bagian 1–14 memotret demo sebagaimana ia dirancang dan dibangun pada tahap T1–T7. Bagian ini **tidak mengubah satu pun di antaranya** — ia menambahkan lapisan di atasnya.

Setelah demo dicoba pihak Posyandu, feedback lapangan menambah lingkup pada tiga arah: komunikasi ke orang tua, pencegahan salah input di meja, dan bukti fisik cetak. Lingkupnya ditetapkan di [Fitur](../fitur.md) sebagai modul M9–M11; **perilaku tiap fiturnya** ditulis satu per satu di [`prd_feedback/`](../prd/feedback/README.md).

> **Bagian ini sengaja ditaruh di ujung.** Rujukan ke dokumen ini tertanam di dalam kode dalam bentuk `docs/`rujukan/layar-demo.md` bagian 6.4` — terpaku ke nomor bagian, bukan ke nama berkas. Menyisipkan bagian baru di tengah membuat 25 komentar kode menunjuk ke tempat yang salah. Menambah di ujung tidak menggeser apa pun.

### 15.1 Fitur terhadap layar

Kolom **Layar** memakai penomoran bagian 6.

| Kode | Fitur | Layar yang disentuh |
|---|---|---|
| [F01](../prd/feedback/F01-kontak-whatsapp-ortu.md) | Kontak WhatsApp orang tua | 6.4 Data Anak (editor baris, form tambah) · 6.5 Detail anak (Identitas) |
| [F02](../prd/feedback/F02-edukasi-rujukan-kms.md) | Edukasi & anjuran rujukan di KMS | 6.5 Detail anak (di bawah kurva) |
| [F03](../prd/feedback/F03-kirim-whatsapp.md) | Kirim hasil ke WhatsApp | 6.5 Detail anak (bilah aksi) |
| [F04](../prd/feedback/F04-validasi-kewajaran-ukur.md) | Validasi kewajaran input pengukuran | 6.4 Data Anak (editor baris) |
| [F05](../prd/feedback/F05-grafik-enam-indeks.md) | Pengukuran & grafik 6 indeks WHO | 6.4 Data Anak (dua isian baru) · 6.5 Detail anak (tab indeks pada kurva) |
| [F06](../prd/feedback/F06-status-ntob.md) | Status pertumbuhan N/T/O/B terhitung | 6.5 Detail anak (kolom Pertumbuhan) · 6.6 Laporan (kolom N T O B) |
| [F07](../prd/feedback/F07-skrining-pendaftaran.md) | Skrining awal pendaftaran | 6.4 Data Anak (kartu skrining) |
| [F08](../prd/feedback/F08-desil-gakin.md) | Atribut sosio-ekonomi: desil & Gakin | 6.4 Data Anak (isian + saringan) |
| [F09](../prd/feedback/F09-laporan-f1.md) | Rekap F1 & ekspor laporan | 6.6 Laporan |
| [F10](../prd/feedback/F10-lembar-cetak.md) | Lembar bukti fisik siap cetak | 6.6 Laporan · 6.5 Detail anak |
| [F11](../prd/feedback/F11-aksesibilitas-tampilan.md) | Mode teks besar & mikro-interaksi | 6.7 Pengaturan (sakelar) · seluruh layar (akibatnya) |
| [F12](../prd/feedback/F12-manajemen-sasaran.md) | Manajemen sasaran dinamis | 6.4 Data Anak · 6.8 Periode |
| [F13](../prd/feedback/F13-stimulasi-perkembangan.md) | Checklist stimulasi perkembangan | 6.4 Data Anak · 6.5 Detail anak — **ditahan**, lihat [OI-18](../pertanyaan-terbuka.md) |

Dua layar tidak disentuh sama sekali: **6.1 Login** dan **6.2 Shell aplikasi**. **6.3 Beranda** hanya ikut berubah lewat F11.

### 15.2 Yang tetap berlaku dari bagian 1–14

Fitur baru tidak membatalkan keputusan yang sudah diambil. Yang paling sering tersentuh:

| Acuan | Isi | Kenapa disebut lagi di sini |
|---|---|---|
| Bagian 4 | Demo tidak menyimpan apa pun; muat ulang mengembalikan data contoh | Berlaku juga untuk field baru F01, F08, dan F13 |
| Bagian 8 | Token warna, tipografi, dan geometri | F11 mengubah **nilai** tokennya, bukan menambah token di luar sistem |
| Bagian 10 | Kontrak props tiap halaman = kontrak controller Laravel nanti | Field baru masuk `types/posyandu.ts`, bukan diketik ulang per halaman |
| Bagian 14 | Standar penulisan kode, termasuk 14.9 "Selesai berarti" | Tetap jadi syarat tutup tiap PR fitur, ditambah kriteria terima PRD-nya sendiri |

Satu pengecualian yang perlu dicatat: **bagian 6.5 menetapkan kurva KMS hanya menampilkan berat badan menurut umur**, dengan alasan menyamai lembar KMS Buku KIA yang dipegang ibu. F05 memperluasnya ke enam indeks. Alasan lama tidak gugur — panel BB/U tetap jadi tampilan awal dan tetap menyamai buku cetak; lima indeks lain berdiri sebagai tab di sebelahnya, untuk Bidan, bukan untuk menggantikan kartu ibu.

### 15.3 Yang di luar putaran ini

Bagian 11 sudah menetapkan apa yang di luar lingkup demo. Dua butir bertambah:

| Butir | Sebab |
|---|---|
| Scan ID Card / QR sasaran | Ditandai *pending* oleh pemilik program. [Fitur](../fitur.md) no. 4 sudah menempatkannya di Aplikasi Tablet. |
| Skrining imunisasi | Berkas impor tidak memuat kolom imunisasi sama sekali ([OI-15](../pertanyaan-terbuka.md)). F07 tetap jalan untuk kelengkapan identitas. |
