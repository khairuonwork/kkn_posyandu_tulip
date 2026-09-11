# PRD Demo Frontend — Portal Posyandu Tulip

| | |
|---|---|
| **Produk** | Portal Posyandu Tulip — demo frontend untuk ditunjukkan ke client |
| **Versi dokumen** | 1.0 |
| **Status** | Menunggu persetujuan sebelum pembangunan dimulai |
| **Berlaku untuk** | Fase demo saja, bukan produk akhir |
| **Induk** | [01-prd.md](01-prd.md) — PRD produk utuh |

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

[01-prd.md](01-prd.md) menggambarkan produk utuh dengan horizon berbulan-bulan. Dokumen ini mengambil sebagian kecilnya dan mendorongnya sampai terlihat, sambil menunda seluruh sisanya.

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

**1. Halaman ditulis persis sebagai Inertia page.**
Setiap halaman adalah komponen React dengan *default export* yang menerima props — bentuk yang sama persis dengan yang nanti dipakai Laravel. Demo memasok props dari modul data mock; nanti controller yang memasok. Isi halamannya tidak berubah satu baris pun.

**2. Navigasi lewat satu titik sambung.**
Halaman mengimpor `Link` dari `@/lib/nav`, bukan langsung dari `@inertiajs/react`. Build Laravel meneruskan ke Inertia; build demo mengalihkannya ke implementasi demo lewat `resolve.alias` di Vite. Tiga baris konfigurasi, nol percabangan di dalam halaman.

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

Isu ini terdaftar sebagai OI-12 di [99-open-issues.md](99-open-issues.md).

### 5.3 Perhitungan z-score

Dilakukan di **skrip ekstraksi**, bukan di browser, memakai `database/data/who-lms.json` dan rumus pada [04-spesifikasi-antropometri.md](04-spesifikasi-antropometri.md).

Alasannya: mesin antropometri versi JavaScript akan menjadi implementasi kedua dari rumus yang sama, dan dua implementasi berarti dua peluang berbeda hasilnya. Kode Python-nya sudah diverifikasi cocok dengan master Juni 2026 — 0 selisih pada BB/U, TB/U, dan LIKA/U.

### 5.4 Normalisasi

Mengikuti [06-migrasi-data.md](06-migrasi-data.md) bagian 5, seluruhnya:

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

**Bukan dropdown.** Tiga pilihan tampak sekaligus, karena inilah yang akan ditunjukkan ke client dan pemirsa harus melihat sendiri ada tiga peran.

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
| Wadah | Border `#A8B0A9`, radius 10, pemisah antar kartu `#DCE0DA` 1 px |
| Kartu | Tinggi minimal 64, padding 12 / 16, dapat diklik seluruhnya |
| Radio | 20 × 20, border 2 px `#A8B0A9`; saat terpilih border dan titik `#0F6E44` |
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
| Nonaktif | Tombol `Masuk` `#DCE0DA` dengan teks `#4A5750` bila salah satu field kosong |
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
- Seluruh target interaktif minimal 44 × 44 px
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

**Yang belum nyata.** Blok sinkronisasi offline pada desain **dibuang**. Portal dipakai di tempat berkoneksi, sehingga blok itu tidak akan pernah menyala. Lihat [ADR-0003](adr/0003-batas-portal-vs-aplikasi-tablet.md).

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

**Yang belum nyata.** `Cetak A4` menampilkan `Belum tersedia di demo`. Format F1 Gizi dan Buku 7 belum ada — formatnya masih direvisi ([OI-07](99-open-issues.md)).

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

Mengikuti [03-sdd.md](03-sdd.md) bagian 4. Di demo pembatasannya hanya di tampilan — **bukan pengamanan**.

---

## 8. Spesifikasi visual dan komponen

Token lengkap ada di [05-uiux-spec.md](05-uiux-spec.md) bagian 2 dan 3, diambil langsung dari `docs/design/portal-prototipe.html` dan `portal-layar-desktop-v2.html`. Bagian ini hanya merangkum yang paling sering dipakai.

### 8.1 Ringkas

| | Nilai |
|---|---|
| Latar halaman dan kartu | `#FFFFFF` |
| Sidebar | `#F6F7F5` |
| Teks utama dan sekunder | `#16211C` · `#4A5750` |
| Garis | `#DCE0DA` |
| Merek | `#0F6E44` · latar `#E9F3EC` |
| Perlu tindakan | `#A3170F` · latar `#FCEDEC` |
| Perlu perhatian | `#9A5B00` · latar `#FBF1E3` |
| Catatan | `#1148A8` · latar `#EAF0FB` |
| Huruf | `Plus Jakarta Sans` — isi 17 px, label 15 px |
| Radius | kartu 8 px · tombol dan field 10 px · chip 6 px |
| Target sentuh | 44 × 44 px |
| Ikon | Phosphor `bold` 20–24 px, selalu berpasangan dengan teks. **Subset SVG lokal**, bukan paket npm dan bukan CDN — lihat bagian 4.4 |
| Berkas huruf | `.woff2` bobot 400/600/700/800 di `demo/assets/fonts/`, di-*commit* ke repo |

⚠️ **`portal-sistem-desain.html` adalah sistem desain aplikasi tablet** (lansia-first, dasar 18 px, radius 12 px, target 56 px), **bukan Portal**. Nilainya tidak berlaku di sini.

### 8.2 Aturan angka — tidak boleh dilanggar

Produk ini pada dasarnya adalah tabel angka. Aturan ini yang menentukan apakah ia terlihat profesional atau amatir.

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

| Komponen | Keterangan |
|---|---|
| `ui/table` | Belum ada di repo, padahal tabel adalah bentuk utama produk ini |
| `ui/pagination` | Navigasi halaman |
| `status-gizi-badge` | Chip berisi ikon, teks, dan warna. Satu-satunya tempat pemetaan kategori hidup |
| `z-score-block` | Blok besar di Detail anak: angka berwarna, `SD`, label |
| `z-score-cell` | Sel tabel: dua desimal, `—` bila kosong, penanda bila tidak wajar |
| `kms-chart` | Kurva pertumbuhan, warna Buku KIA, SVG langsung tanpa library |
| `filter-periode` | Dipakai ulang di header, Beranda, dan Laporan |
| `empty-state` | Menyebutkan sebab dan menawarkan jalan keluar |

### 8.4 Gerak

Prototipe desain tidak memakai animasi sama sekali. Implementasi menambahkan transisi 200 ms pada elemen interaktif (`transform` dan `opacity` saja) dan jeda bertahap kecil pada baris tabel saat filter berubah — cukup untuk menandakan isinya berganti.

Tanpa animasi gulir, parallax, atau efek masuk yang mencolok. Ini portal data kesehatan, bukan halaman pemasaran.

---

## 9. Skenario presentasi

Sekitar 15 menit. Urutannya disusun agar nilai produknya muncul lebih dulu, detailnya menyusul.

### Persiapan

- Jalankan `npm run demo` sebelum client datang, buka di browser, muat ulang sekali
- Layar penuh, zoom 100%, tutup tab lain
- Siapkan `0_REKAP Z SCORE GABUNGAN_JAN_DES 2026.xlsx` di tab sebelah, untuk pembanding
- Pilih satu anak dengan kurva menarik, catat namanya
- Pastikan periode aktif adalah Juni 2026

### Alur

**1. Login (30 detik).** Masuk sebagai **Bidan**. Sebutkan ada tiga peran, bedanya akan ditunjukkan di akhir. Jangan berlama-lama.

**2. Beranda (4 menit).** Layar yang membuka nilai produk.

> "Ini kondisi Posyandu Tulip bulan Juni. Seratus satu balita sasaran, sembilan puluh enam ditimbang."

Tunjuk tiga angka status gizi. Sebutkan enam anak pendek dan tiga obesitas. **Jangan jelaskan, tunggu reaksi** — kalau client mengenali angkanya, kriteria K1 sudah terpenuhi dan sisanya jauh lebih mudah.

Turun ke daftar `Perlu perhatian`. Tunjuk baris alasannya, bukan cuma chip statusnya:

> "Bukan cuma bilang gizi buruk. Dia bilang kenapa: BB/TB turun dari −2,6 ke −3,1."

Ganti periode ke Januari lalu kembali ke Juni. Grafik cakupan enam bulan bergerak.

**3. Data Anak (3 menit).** Klik menu Data Anak.

Ketik beberapa huruf sebuah nama. Hasil menyusut seiring ketikan. Sebutkan bahwa pencarian juga menemukan lewat **nama ibu** — itu cara kader mengingat.

> "Yang tadi harus buka dua belas file, sekarang di sini."

Filter RT 01. Jumlah berubah dari 101 menjadi 39. Sebutkan RT 01 memang yang paling banyak — angka yang bisa mereka periksa sendiri.

Tunjuk satu baris bertanda `NIK belum lengkap`:

> "NIK cuma muncul kalau memang belum lengkap. Yang sudah lengkap tidak ditampilkan, supaya data pribadi tidak terpampang di layar yang paling sering dibuka."

**4. Detail anak (5 menit).** Bagian terpenting. Klik anak yang sudah Anda pilih.

Tunjuk tiga blok z-score di atas. Sebutkan indeksnya mengikuti umur — di bawah dua tahun memakai BB/PB, di atasnya BB/TB.

Tunjuk kurvanya. Enam titik, pita KMS di belakangnya.

> "Warna pitanya sengaja sama dengan Buku KIA yang dipegang ibu, bukan warna aplikasi."

Gulir ke tabel riwayat. Tunjuk kolom `Pertumbuhan` — N, T, O, B.

**Momen paling meyakinkan:** buka tab Excel, cari anak yang sama, tunjukkan z-score-nya sama. Ini yang mengubah "kelihatannya bagus" menjadi "ini benar".

**5. Laporan (2 menit).** Klik menu Laporan.

Tunjuk rekap per RT — S, D, D/S, N, T, O, B, BGM. Sebutkan ini bentuk yang sama dengan Buku 7 yang selama ini disusun manual.

Klik `Unduh CSV`, **buka berkasnya di Excel di depan client**. Tunjukkan bahwa berkasnya rinci per anak dengan enam z-score, berbeda dari agregat di layar. Tombol yang benar-benar bekerja lebih meyakinkan daripada penjelasan apa pun.

**6. Pengaturan (1 menit).** Klik menu Pengaturan.

> "Ambang ini yang menentukan kapan aplikasi bertanya 'yakin dengan angka ini?'. Ditetapkan bersama bidan, bukan oleh yang bikin aplikasi. Dan kader tidak pernah diblokir — cuma ditanya."

Tunjuk bagian `Ambang z-score, terkunci` — Permenkes, tidak bisa diubah dari aplikasi.

**7. Ganti peran (1 menit).** Di sidebar, pilih **Kader**.

Menu Pengaturan dan Periode hilang. Tombol `Tambah balita` hilang. Kembali ke Data Anak: hanya 39 anak RT 01 yang terlihat.

> "Kader cuma lihat RT binaannya. Bidan lihat semua."

Tutup dengan menyebutkan apa yang belum ada dan kapan bisa ada.

### Pertanyaan yang mungkin muncul

| Pertanyaan | Jawaban |
|---|---|
| "Ini datanya nyata?" | Angkanya nyata dari arsip Januari–Juni 2026. Nama dan NIK diganti untuk demo. |
| "Bisa saya coba input?" | Belum di versi ini. Pencatatan ada di aplikasi tablet yang dipakai kader saat hari Posyandu — itu tahap berikutnya. |
| "Kalau internet mati?" | Portal ini dipakai di tempat berkoneksi. Aplikasi tablet yang dirancang untuk lapangan. |
| "Bisa keluar laporan F1?" | Datanya sudah lengkap. Format F1-nya belum, karena formatnya sedang direvisi — kami tunggu yang final supaya tidak buat dua kali. |
| "Kenapa indeksnya beda-beda tiap anak?" | Mengikuti umur. Di bawah 24 bulan diukur telentang, jadi BB/PB. Di atasnya berdiri, jadi BB/TB. Ini aturan Permenkes, bukan pilihan aplikasi. |
| "Kapan bisa dipakai?" | *(sesuaikan)* — sebutkan bahwa yang terlihat hari ini adalah tampilan lengkap; yang tersisa penyimpanan data dan akun pengguna. |
| "Angkanya beda sedikit dengan file saya" | Ada dua temuan yang perlu dikonfirmasi ke Bidan. Rujuk `docs/99-open-issues.md` OI-05 dan OI-11. Jangan berimprovisasi. |

### Yang tidak boleh dilakukan

- Jangan klik `Tambah balita`, `Ubah`, `Cetak A4`, atau `Simpan pengaturan` kecuali sedang menjelaskan bahwa tempatnya sudah disiapkan
- Jangan menjanjikan tanggal tanpa memeriksa dulu
- Jangan menyebut angka yang tidak ada di layar
- Jangan menyebut kemampuan offline — Portal memang tidak punya, dan itu keputusan sadar

---

## 10. Peta transisi ke backend

Bagian ini menjawab pertanyaan yang wajar muncul: apakah pekerjaan ini akan dibuang. Tidak.

| Layar | Berkas halaman | Controller nanti | Props yang dikirim |
|---|---|---|---|
| Login | `pages/auth/login.tsx` | Fortify (sudah ada) | — |
| Beranda | `pages/dashboard.tsx` | `DashboardController` | `periode`, `ringkasan`, `statusGizi`, `cakupanEnamBulan`, `perluPerhatian` |
| Data Anak | `pages/anak/index.tsx` | `AnakController@index` | `anak` (paginated), `filter`, `wilayahRt` |
| Detail anak | `pages/anak/show.tsx` | `AnakController@show` | `anak`, `pengukuran`, `penilaianGizi`, `garisSd`, `layanan`, `catatanBidan` |
| Laporan | `pages/laporan/index.tsx` | `LaporanController@index` | `ringkasan`, `rekapPerRt`, `cakupanLayanan`, `filter` |
| Unduh CSV | — | `LaporanController@export` | *streamed response* |
| Pengaturan | `pages/pengaturan/index.tsx` | `PengaturanController` | `ambang`, `standarVersi`, `izinPeran`, `terakhirDiubah` |
| Periode | `pages/periode/index.tsx` | `PeriodeController@index` | `periode` beserta agregatnya |

### Yang berubah saat backend siap

| Berkas | Perubahan |
|---|---|
| `resources/js/pages/**` | **Tidak berubah.** Sudah berbentuk Inertia page. |
| `resources/js/components/**` | **Tidak berubah.** |
| `resources/js/lib/nav.ts` | **Tidak berubah.** Sudah meneruskan ke Inertia. |
| `demo/**` | Berhenti dipakai. Boleh dihapus, boleh disimpan untuk demo offline. |
| `vite.demo.config.ts` | Idem. |
| `app/Http/Controllers/**` | Dibuat baru — memasok props yang bentuknya sudah ditentukan di sini. |

Bentuk props yang dipakai demo **menjadi kontrak** bagi controller nanti. Ini bukan efek samping, ini keuntungan: rancangan API-nya sudah teruji lewat pemakaian sungguhan sebelum satu baris PHP ditulis.

### Yang perlu dikerjakan agar demo menjadi produk

1. PHP 8.3+, `composer install`, `php artisan migrate --seed`
2. Nonaktifkan routing multi-tenant ([ADR-0004](adr/0004-reuse-team-sebagai-rbac.md))
3. Koreksi `PosyanduSeeder` dari 5 RT menjadi **7 RT**
4. Jalankan `php artisan posyandu:import` atas arsip nyata
5. Buat tujuh controller pada tabel di atas
6. Tambahkan tabel `pengaturan_ambang` beserta jejak auditnya — belum ada di data model [03-sdd.md](03-sdd.md)
7. Ganti pemilih peran demo dengan `TeamPolicy` dan middleware
8. Hapus `demo/` dan `vite.demo.config.ts`

Langkah 6 adalah lingkup baru yang muncul dari desain. Selebihnya sudah tercakup dokumen yang ada.

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
| Aturan 1T/2T/3T | Kolom `Pertumbuhan` menampilkan `NTOB` mentah dari arsip. Tidak ada logika turunan sampai [OI-01](99-open-issues.md) selesai. |
| Kategori LILA/U | Z-score tampil, label kosong ([OI-04](99-open-issues.md)). |
| Kemampuan offline | **Sengaja dibuang** dari desain. Milik aplikasi tablet ([ADR-0003](adr/0003-batas-portal-vs-aplikasi-tablet.md)). Catatan: demo sendiri **berjalan penuh tanpa internet** — itu soal aset lokal (bagian 4.4), bukan sinkronisasi data. |
| Meja Ukur | Layar input pengukuran pada artboard `Portal Posyandu - Layar Kader`. **Milik aplikasi tablet.** Lihat bagian 13. |
| Tombol `Ukur sekarang` di Detail anak | Pintasan ke form ukur, dan form ukur milik tablet. |
| Rujukan ke Puskesmas | Butir T1 daftar temuan desainer. Ditunda — [OI-14](99-open-issues.md). |
| Link publik | Belum ada. Demo dijalankan lokal; deploy menunggu [OI-12](99-open-issues.md). |
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

**T7 tidak memuat deploy.** Build statis tetap dihasilkan agar siap kapan pun, tetapi tidak diunggah ke mana pun — demo dijalankan dari laptop. Link publik menunggu [OI-12](99-open-issues.md).

---

## 13. Temuan dari artboard yang belum diekspor

Project Claude Design memuat **sembilan** artboard; tiga pertama sudah disalin ke `docs/design/` lebih dulu, enam sisanya baru terbaca setelah `/design-login` aktif. Bagian ini merekam apa yang ditemukan dan apa yang diputuskan, supaya tidak ditanyakan ulang.

### 13.1 Artboard dan perannya

| Artboard | Peran | Dipakai di sini? |
|---|---|---|
| `Portal Posyandu - Prototipe (standalone)` | Prototipe desain berjalan; sumber seluruh token | ✅ sumber utama |
| `Portal Posyandu - Layar Desktop v2` | Lima layar desktop, **putaran kedua** | ✅ sumber utama |
| `Portal Posyandu - Sistem Desain` | Sistem desain **aplikasi tablet**, lansia-first 18 px | ❌ bukan Portal |
| `Portal Posyandu - Layar Kader` | Lima layar, **putaran pertama**, plus Meja Ukur dan alur mobile | sebagian — lihat 13.2 |
| `Catatan Posyandu - Daftar Temuan` | Daftar temuan desainer: 3 tambah, 6 kurangi, 3 putuskan | ✅ lihat 13.3 |
| `GrafikKMS` | Komponen kurva pertumbuhan | ✅ dipakai utuh di 6.5 |
| `Panel Ubah A - Drawer` | Pola ubah data, varian laci kanan 460 px | ✅ geometri tabel Data Anak |
| `Panel Ubah B - Baris` · `C - Modal` | Dua varian lain pola ubah data | ⏸ belum dibaca — alur ubah data di luar lingkup demo |

**Putaran kedua menang.** `Layar Desktop v2` menyebut sendiri apa yang diubahnya dari putaran pertama: kartu "Perlu tindakan" dihapus dan angkanya pindah ke header tabel, ikon dan kalimat penjelas per KPI dibuang, status gizi jadi tiga angka besar, dan NIK hanya tampil bila belum lengkap. Bagian 6 mengikuti v2, bukan `Layar Kader`.

### 13.2 Meja Ukur — milik tablet, bukan Portal

`Layar Kader` memuat layar bernama **Meja Ukur**: mode input pengukuran desktop 1440 px dengan antrean anak, pintasan papan tombol (panah pindah anak, `Tab` pindah field, `Enter` simpan lalu muat berikutnya, `Ctrl+L` lewati), pembanding `Bulan lalu`, dan z-score terhitung langsung saat mengetik. Navigasinya bertambah jadi lima item.

**Keputusan: milik aplikasi tablet, tidak masuk Portal.** [ADR-0003](adr/0003-batas-portal-vs-aplikasi-tablet.md) tetap berlaku dan **tidak** direvisi — temuan ini justru menguatkannya, karena seluruh rancangan Meja Ukur berputar pada pekerjaan di meja penimbangan saat hari Posyandu, bukan pada pekerjaan bidan di depan laptop.

Konsekuensinya: tombol `Ukur sekarang` di Detail anak juga tidak masuk, karena ia hanya pintasan menuju layar itu.

### 13.3 Daftar temuan desainer

Sembilan dari dua belas butir sudah selaras atau sudah diputuskan.

| Kode | Butir | Keputusan |
|---|---|---|
| T1 | Rujukan ke Puskesmas | **Tidak masuk.** Desainer menyebutnya *"satu-satunya kekurangan yang berakibat pada anaknya"* — dicatat sebagai [OI-14](99-open-issues.md), bukan diabaikan |
| T2 | Isian Vitamin A dan obat cacing | Milik form pengukuran, jadi milik tablet |
| T3 | Hasil yang dibawa pulang ibu | Milik tablet dan cetak; di luar lingkup demo |
| K1 | Tab bulan dan tahun di Kartu Kontrol | Tidak berlaku — Portal memakai satu daftar riwayat, terbaru di atas, persis seperti anjurannya |
| K2 | Layar portal pilih modul | Tidak pernah ada di Portal |
| K3 | Dashboard di tablet | Milik tablet |
| K4 | Kolom LIKA dihapus | **Ditolak.** Premisnya *"tidak dipakai di mana pun"* tidak berlaku di Posyandu Tulip — arsip Ibu Sri memuat `0_REKAP JAN-DES 2026_LIKA_U.xlsx`, jadi memang ada pembacanya. LIKA tetap tampil |
| K5 | Halaman masuk tanpa ilustrasi setengah layar | **Sebagian diambil.** Alasannya khusus tablet; Portal tetap dua panel, tetapi panel kanan diisi kalimat berguna, bukan gambar. Lihat 6.1 |
| K6 | Ambang z-score sebagai keterangan, bukan kolom | ✅ sudah begitu sejak awal di 6.7 |
| P1 | Nama produk | **Portal Posyandu Tulip.** Nama `Catatan Posyandu` dan `SIMPATIK Posyandu` pada artboard tidak dipakai |
| P2 | Cakupan sasaran | Sudah diputuskan sejak awal: balita saja. Lihat [01-prd.md](01-prd.md) |
| P3 | Imunisasi dapat dicatat dari aplikasi? | Terbuka — [OI-15](99-open-issues.md) |

Lima butir "Jangan diubah" seluruhnya sudah selaras. Dua di antaranya kebetulan sama persis dengan aturan yang sudah ditetapkan lebih dulu di PRD produk: tombol `Tidak hadir` (*"kolom kosong dan anak tidak datang bukan hal yang sama"* — DR-04) dan keterangan sumber angka (*"ini yang membedakan alat kesehatan dari mockup"*).

### 13.4 Cakupan pemeriksaan tambahan

Dua artboard menyebut daftar yang berbeda:

| `Layar Kader` (putaran pertama) | `Layar Desktop v2` (putaran kedua) |
|---|---|
| Imunisasi dicatat · Asupan gizi · Pemeriksaan gigi · KPSP | Vitamin A · Obat cacing · Imunisasi dicatat · KPSP |

Bagian 6.6 memakai versi **v2**, mengikuti aturan bahwa putaran kedua menang.

---

## 14. Standar penulisan kode

Repo ini sudah membawa konfigurasi lint dan format yang cukup tegas dari *starter kit*. Bagian ini **tidak menambah aturan baru** — ia merangkum yang sudah berlaku, menandai yang paling sering dilanggar, dan menetapkan beberapa hal yang khusus berlaku untuk demo.

Prinsipnya: kode demo ditulis dengan standar yang sama dengan kode produksi. Halaman yang ditulis di sini akan dipakai ulang produk final ([bagian 10](#10-peta-transisi-ke-backend)), jadi tidak ada alasan menurunkan mutunya.

---

### 14.1 Perkakas yang sudah ada

| Perintah | Isinya |
|---|---|
| `npm run lint:check` | ESLint 9 — TypeScript, React, React Hooks, import order, stylistic |
| `npm run format:check` | Prettier 3 + plugin Tailwind |
| `npm run types:check` | `tsc --noEmit` |
| `npm run lint` · `npm run format` | Versi yang memperbaiki otomatis |

`composer ci:check` menjalankan ketiganya, dan CI di `.github/workflows/tests.yml` memanggilnya pada setiap *push* ke `main` dan setiap *pull request*.

> **Catatan:** `composer ci:check` juga menjalankan Pint, Larastan, dan Pest — semuanya menuntut PHP 8.3 yang belum tersedia. Selama fase demo, jalankan ketiga perintah `npm` di atas secara langsung.

---

### 14.2 Aturan yang paling sering dilanggar

Empat aturan di bawah ini tidak umum dan tidak akan tertebak. Melanggarnya membuat `lint:check` gagal.

**1. Baris kosong mengelilingi pernyataan kendali.**
`@stylistic/padding-line-between-statements` menuntut baris kosong **sebelum dan sesudah** setiap `if`, `return`, `for`, `while`, `do`, `switch`, `try`, dan `throw`.

```ts
const anakTerpilih = cariAnak(id);

if (!anakTerpilih) {
    return null;
}

return <ProfilAnak anak={anakTerpilih} />;
```

**2. Impor tipe dipisah.**
`@typescript-eslint/consistent-type-imports` dengan `fixStyle: separate-type-imports`, ditambah `import/consistent-type-specifier-style: prefer-top-level`.

```ts
import { useMemo } from 'react';
import type { Anak, Pengukuran } from '@/types/posyandu';
```

Bukan `import { useMemo, type Anak }`.

**3. Urutan impor alfabetis per golongan.**
`import/order` — golongan `builtin` → `external` → `internal` → `parent` → `sibling` → `index`, dan **di dalam tiap golongan diurutkan alfabetis**, tidak peka huruf besar-kecil.

**4. Kurung kurawal selalu ditulis.**
`curly: all` dan `@stylistic/brace-style: 1tbs` tanpa `allowSingleLine`. Tidak ada `if (x) return;` satu baris.

---

### 14.3 Format

Diatur `.prettierrc` dan `.editorconfig`. Jangan diubah, jangan dilawan manual.

| Aturan | Nilai |
|---|---|
| Indentasi | 4 spasi (2 untuk `.yml`) |
| Kutip | Tunggal |
| Titik koma | Wajib |
| Lebar baris | 80 |
| Akhir baris | LF |
| Baris akhir berkas | Wajib ada |
| Spasi di ujung baris | Dibuang (kecuali `.md`) |

Plugin Tailwind mengurutkan kelas utilitas otomatis, dan mengenali `clsx`, `cn`, serta `cva` sebagai fungsi kelas — jadi kelas di dalamnya ikut diurutkan.

---

### 14.4 TypeScript

`strict: true`, `isolatedModules: true`, `moduleResolution: bundler`, alias `@/*` menunjuk `resources/js/*`.

| Aturan | Ketentuan |
|---|---|
| Alias impor | Selalu `@/components/…`, tidak pernah `../../components/…` |
| `any` | ESLint mengizinkannya, tetapi **tipe data domain wajib dideklarasikan**. `any` hanya boleh di batas pustaka pihak ketiga yang memang tidak bertipe |
| Tipe domain | Satu tempat: `resources/js/types/posyandu.ts`. Bukan diketik ulang di tiap halaman |
| Props halaman | Dideklarasikan sebagai `type Props = { … }` di berkas halaman itu sendiri, karena inilah yang nanti menjadi kontrak controller |
| Nilai kosong | `null` untuk "tidak ada nilai", bukan `undefined` dan bukan `0`. Ini menurun langsung dari DR-04 dan DR-07 pada [PRD produk](01-prd.md) |

---

### 14.5 Penamaan

Mengikuti pola yang sudah dipakai *starter kit*.

| Hal | Aturan | Contoh |
|---|---|---|
| Nama berkas | `kebab-case` | `status-gizi-badge.tsx` · `use-filter-periode.ts` |
| Komponen | `PascalCase` | `StatusGiziBadge` |
| Hook | `use-` di berkas, `useXxx` di fungsi | `use-filter-periode.ts` → `useFilterPeriode` |
| Fungsi dan variabel | `camelCase` | `hitungRasioDS` |
| Konstanta modul | `SCREAMING_SNAKE_CASE` | `BATAS_WAJAR_BB` |

**Bahasa dalam kode.** Istilah domain memakai bahasa Indonesia, istilah teknis memakai bahasa Inggris — sama seperti sisi PHP yang sudah ada (`App\Models\Anak`, `App\Support\Antropometri\ZScore`).

```ts
function hitungSebaranStatus(pengukuran: Pengukuran[]): SebaranStatus {
    return useMemo(() => { … }, [pengukuran]);
}
```

`anak`, `pengukuran`, `penilaianGizi`, `periode`, `wilayahRt` — Indonesia.
`props`, `state`, `handleSubmit`, `onChange`, `isLoading` — Inggris.

Komentar ditulis dalam bahasa Indonesia, dan menjelaskan **alasan**, bukan mengulang isi kode.

---

### 14.6 Struktur dan batas

| Lokasi | Isi | Nasibnya nanti |
|---|---|---|
| `resources/js/pages/**` | Halaman, berbentuk Inertia page | **Milik produk.** Dipakai ulang tanpa diubah |
| `resources/js/components/**` | Komponen domain dan UI | Milik produk |
| `resources/js/types/**` | Tipe domain | Milik produk |
| `resources/js/lib/nav.ts` | Titik sambung navigasi | Milik produk |
| `demo/**` | Perancah: router, store mock, data | **Dibuang** saat backend siap |
| `vite.demo.config.ts` | Konfigurasi build demo | Dibuang |

Aturan mengikat: **tidak ada berkas di `resources/js/` yang mengimpor apa pun dari `demo/`.** Arah ketergantungan hanya satu — `demo/` boleh mengimpor `resources/js/`, tidak sebaliknya. Kalau aturan ini dilanggar, janji "halaman tidak ditulis ulang" pada bagian 10 batal.

`resources/js/components/ui/*` dikecualikan dari ESLint karena berasal dari shadcn/ui. Jangan disunting gayanya; kalau perlu perilaku berbeda, bungkus di komponen domain.

---

### 14.7 Yang tidak dibangun

Berlaku sepanjang fase demo, dan alasannya sama untuk semuanya: menambah yang belum ada pemakainya berarti menambah yang harus dipelihara.

- **Tanpa dependensi npm baru.** Grafik memakai SVG langsung, routing sekitar 30 baris, state memakai `useState` dan `useMemo` atas 633 baris data
- **Tanpa rujukan CDN.** Huruf dan ikon di-*self-host* — lihat bagian 4.4
- **Tanpa abstraksi berpemakai tunggal.** Tidak ada *wrapper* untuk satu komponen, tidak ada *config* untuk nilai yang tidak pernah berubah, tidak ada `interface` dengan satu implementasi
- **Tanpa state manager.** 101 anak dan enam periode tidak menuntutnya
- **Tanpa `console.log` tertinggal.** Nol pesan di konsol saat demo berjalan

---

### 14.8 Uji

Demo bukan produk berumur panjang, jadi ujinya secukupnya — tetapi tidak nol.

| Yang diuji | Cara |
|---|---|
| Logika `demo/store.ts` — pencarian, filter RT, agregasi D/S dan SKDN | Satu berkas uji kecil, tanpa kerangka uji baru. Ini satu-satunya bagian demo yang bisa salah diam-diam |
| Skrip ekstraksi data | Bandingkan sebaran hasil terhadap arsip: 101 anak, 7 RT, 6 pendek, 3 obesitas |
| Sisanya | Diperiksa mata saat menjalankan demo |

Tidak ada uji komponen dan tidak ada uji *end-to-end*. Menulisnya untuk layar yang akan disambungkan ulang ke backend dalam hitungan minggu adalah pekerjaan yang dibuang dua kali.

---

### 14.9 Selesai berarti

Sebuah tahap (T1–T7 pada bagian 12) dinyatakan selesai bila **seluruhnya** terpenuhi:

1. `npm run lint:check` · `format:check` · `types:check` — ketiganya lulus
2. Nol pesan kesalahan dan peringatan di konsol browser
3. Layar yang dikerjakan punya state kosong dan state memuat yang dirancang, bukan kebetulan
4. Uji tanpa Wi-Fi lulus — huruf, ikon, dan data tetap utuh
5. Nilai kosong tampil sebagai `—`, tidak pernah `0`
6. Tidak ada `TODO` tanpa isu terbuka yang menaunginya di [99-open-issues.md](99-open-issues.md)
