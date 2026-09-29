# UI/UX Specification — SIMPATIK Posyandu

| | |
|---|---|
| **Jenis** | Rujukan |
| **Status** | hidup — skala huruf dan target sentuh menunggu keputusan pemilik produk (bagian 2.4) |
| **Perubahan berarti terakhir** | 29 September 2026 |

> Bagian **2, 3, dan 4** adalah sumber tunggal token, warna status, dan daftar komponen. Nilainya ditarik dari prototipe desain di `docs/design/` (9 dan 11 September 2026) dan dipasang di `client/src/app.css`.
>
> Peta layar yang berlaku ada di [Mulai di sini](../mulai-di-sini.md#peta-layar).
>
> ⚠️ `portal-sistem-desain.html` adalah sistem desain **aplikasi tablet** (lansia-first, dasar 18 px), **bukan Portal**. Nilainya tidak berlaku di sini.

---

## 1. Prinsip desain

| # | Prinsip | Konsekuensi konkret |
|---|---|---|
| P1 | **Kader bukan pengguna komputer harian.** | Tidak ada ikon tanpa teks. Tidak ada gerakan tersembunyi. Aksi merusak selalu meminta konfirmasi bertulis, bukan sekadar tombol merah. |
| P2 | **Angka kesehatan tidak boleh ambigu.** | Nilai kosong ditampilkan sebagai `—`, tidak pernah sebagai `0`. Satuan selalu tertulis. Status selalu berupa teks, warna hanya pendukung. |
| P3 | **Data yang salah harus terlihat, bukan tersembunyi.** | Nilai bertanda `tidak_wajar` tetap ditampilkan dengan penanda, bukan disaring keluar. |
| P4 | **Asumsi sistem harus terlihat.** | Bila `jenis_ukur` diasumsikan dari umur, keterangan itu muncul di antarmuka, bukan hanya di basis data. |
| P5 | **Bahasa Indonesia sepenuhnya.** | Termasuk pesan validasi dan nama kolom. Istilah medis baku dipertahankan (*stunting*, z-score) karena itulah yang dipakai kader dan Puskesmas. |

---

## 2. Design tokens

Diambil langsung dari `docs/design/portal-prototipe.html` dan `portal-layar-desktop-v2.html`, dengan frekuensi pemakaian sebagai dasar penentuan peran tiap nilai.

### 2.1 Permukaan dan teks

| Peran | Nilai | Catatan |
|---|---|---|
| `background` | `#FFFFFF` | Latar halaman dan kartu. Permukaan dominan. |
| `sidebar` | `#F6F7F5` | Sidebar tetap. |
| `surface-subtle` | `#F1F3EF` | Blok catatan dan bagian sekunder di dalam kartu. |
| `surface-alt` | `#EDEFEA` | Header tabel, latar chip netral. |
| `foreground` | `#16211C` | Teks utama. Kontras 16,6:1 di atas putih. |
| `muted-foreground` | `#4A5750` | Teks sekunder. Nilai paling sering dipakai di seluruh prototipe desain. Kontras 7,6:1. |

### 2.2 Garis

| Peran | Nilai |
|---|---|
| `border` | `#C2C9C0` |
| `border-soft` | `#D5DBD2` · `#CFD5CB` · `#C3C9C0` |
| `border-strong` | `#8B948C` — 3,1:1 di atas putih, memenuhi syarat komponen non-teks. Juga garis bawah kepala kolom tabel, setebal 2 px |
| `rule` | `#A3ACA1` — garis antarbaris tabel dan daftar, lebih gelap dari `border` supaya baris tetap bisa diikuti mata di tablet yang redup |

**Direvisi 11 September 2026.** Semula `#DCE0DA` (1,3:1) dan `#A8B0A9` (2,3:1), dan tidak satu pun memenuhi 3:1. Untuk mata menua, garis tabel yang tak terlihat berarti tabel tanpa struktur — dan tabel adalah bentuk utama produk ini. `border-strong` kini memenuhi 3:1; `border` tetap di bawahnya dengan sengaja, karena garis pemisah 101 baris yang terlalu pekat membuat tabel terbaca seperti jeruji.

Syarat bagian 8 tetap berlaku: **tepi kotak tidak pernah menjadi satu-satunya penanda sebuah kontrol.**

### 2.3 Merek dan nada keparahan

Prototipe desain mendefinisikannya sebagai konstanta, jadi nilainya pasti — bukan hasil terkaan dari pemakaian.

| Nada | Teks | Latar | Arti |
|---|---|---|---|
| Merek | `#0F6E44` | `#E9F3EC` | Aksi utama, tautan aktif |
| Perlu tindakan | `#A3170F` | `#FCEDEC` | Perlu dirujuk atau ditindaklanjuti bulan ini |
| Perlu perhatian | `#9A5B00` | `#FBF1E3` | Pantau lebih dekat, belum mendesak |
| Baik | `#0F6E44` | `#E9F3EC` | Sesuai untuk umurnya |
| Catatan | `#1148A8` | `#EAF0FB` | Dicatat, tidak mendesak |
| Netral | `#4A5750` | `#EDEFEA` | Belum ada data |

`#EAAA08` **dilarang sebagai warna teks** — kontrasnya 2,1:1. Teks peringatan memakai `#9A5B00`.

Tombol aksi per baris, seperti **Ubah**, berwarna kuning solid `#F2C300` (kuning pita KMS) dengan teks `#3D2E00`, token `--kuning-tombol*`. Teksnya sengaja bukan putih: putih di atas kuning ini hanya 1,7:1.

### 2.4 Tipografi

| Token | Di kode sekarang | Target 11 September |
|---|---|---|
| Keluarga huruf | `Plus Jakarta Sans`, jatuh ke `system-ui, sans-serif` | sama |
| Isi | **14 px** | 18 px |
| Label, chip, header tabel | **12 px** | 16 px |
| Subjudul | 15 · 17 px | 20 · 21 · 22 px |
| Judul layar | 21 px | 26 px |
| Angka besar | 28 px | 32 · 40 px |
| Angka | `font-feature-settings: "tnum" 1, "lnum" 1` pada `body` dan `input` | sama |

Angka **wajib** *tabular*. Tanpa itu kolom berat dan z-score tidak sejajar, dan tabel adalah bentuk utama produk ini.

**Skala mana yang berlaku belum diputuskan.** Target 18/16 px ditetapkan 11 September 2026 karena kader dan bidan Posyandu Tulip rata-rata bukan pengguna komputer harian dan tidak muda. Kode memakai 14/12 px (token `--text-*` di `client/src/app.css`) supaya layar utama muat satu tampilan di laptop dan tablet. Pada 26 September 2026 pemilik produk memilih skala yang sekarang untuk Beranda dan meminta ukurannya tidak terlalu besar; untuk layar lain belum ada keputusan. Jangan mengubah ukuran huruf di kode sebelum keputusan itu ada.

Target itu tetap bukan sistem desain Aplikasi Tablet: tablet memakai 18 px dengan target 56 px karena dipakai sambil berdiri memegang perangkat.

### 2.5 Bentuk, jarak, target

| Token | Nilai |
|---|---|
| Radius kartu dan blok | **20 px** |
| Radius tombol dan field | **14 px** |
| Radius chip | **10 px** |
| Pil | 999 px |
| Jarak | kelipatan 3,5 px (`--spacing`), bukan 4 px bawaan Tailwind |
| Target sentuh | **45,5 px** di kode (`min-h-13` pada tombol), kotak isian 49 px. Target 52 px dari 11 September menunggu keputusan bagian 2.4; batas bawah yang dijaga kode adalah 44 px |
| Bayangan | `0 4px 14px rgba(22,33,28,0.04)`, satu tingkat; kedalaman tetap terutama dinyatakan garis tepi |

### 2.6 Penerapan

Token ditulis sebagai CSS variable di `client/src/app.css`, mengganti nilai netral bawaan shadcn. Nama variabel bawaan shadcn (`--background`, `--primary`, `--border`, dan seterusnya) **tidak diubah**, sehingga seluruh komponen `components/ui/**` ikut berubah tanpa disentuh.

Token tambahan yang tidak ada di shadcn — `--sidebar-surface`, `--surface-subtle`, `--tone-red`, `--tone-amber`, `--tone-blue` beserta latarnya — ditambahkan di blok `@theme` yang sama.

Mode gelap **tidak dibangun**. Prototipe desain mengunci tema terang, dan dukungan dua tema menggandakan biaya verifikasi kontras tanpa pemakai yang menuntutnya.

Bentuk yang berulang di seluruh produk — `.kartu`, `.strip-kepala`, `.tombol-utama`, `.tombol-kedua`, `.tombol-ubah`, `.isian` — ditulis sekali di blok `@layer components` pada berkas yang sama, supaya mengubah radius kartu tidak berarti menyisir setiap berkas `.tsx`.

---

### 2.7 Apa yang diambil dari Prototipe v2, dan apa yang tidak

`portal-prototipe-v2.html` ditarik 11 September 2026. **Geometrinya diikuti; warnanya tidak.**

Diambil: radius 20/14/10 px, tinggi kontrol 52 px, dasar halaman `#EDEFEA` dengan isi di atas kartu putih `#FFFFFF`, strip kepala `#F6F7F5` bergaris bawah 2 px, bilah kepala layar setinggi 76 px, judul 28 px dan angka besar 36 px, bayangan kartu satu tingkat.

Ditahan, dengan alasan:

| v2 meminta | Yang dipakai | Alasan |
|---|---|---|
| `border` `#DCE0DA` | `#C2C9C0` | 1,3:1 terhadap putih, di bawah syarat 3:1 komponen non-teks (bagian 2.2) |
| `border-strong` `#A8B0A9` | `#8B948C` | 2,3:1, idem |
| Merah `#B42318` | `#A3170F` | nada keparahan bagian 2.3 sudah diselaraskan dengan sistem desainnya |
| Tanpa nada biru; `Berisiko gizi lebih` jadi oranye | Biru `#1148A8` | kategori yang hanya perlu dicatat tidak boleh terbaca sebagai perlu perhatian (bagian 3, OI-11) |

Dua akibat dari dasar halaman yang berubah abu, ditemukan saat verifikasi dan sudah diperbaiki:

- `EmptyState` semula berlatar `#F1F3EF` — hanya 1,04:1 terhadap dasar baru, keadaan kosong yang sendirinya tidak terlihat. Kini kartu putih.
- Pil hitung "0 anak" di Beranda berlatar `#EDEFEA` di atas strip `#F6F7F5`, 1,08:1. Nol kini ditulis sebagai teks biasa, tanpa pil.

`--surface-alt` `#EDEFEA` kini bernilai sama dengan dasar halaman. Ia masih dipakai chip netral dan kepala tabel, keduanya **selalu berada di atas kartu putih**; jangan memakainya langsung di atas dasar halaman.

---

## 3. Warna status gizi

Empat nada keparahan pada bagian 2.3 dipetakan ke kategori resmi PMK No. 2 Tahun 2020. Pemetaan ini hidup di satu tempat saja: `components/status-gizi-badge.tsx`.

| Indeks | Rentang z | Kategori resmi | Nada |
|---|---|---|---|
| **BB/U** | `< -3` | Berat badan sangat kurang | Merah |
| | `-3` … `< -2` | Berat badan kurang | Oranye |
| | `-2` … `+1` | Berat badan normal | Hijau |
| | `> +1` | Risiko berat badan lebih | Biru |
| **PB/U · TB/U** | `< -3` | Sangat pendek | Merah |
| | `-3` … `< -2` | Pendek | Oranye |
| | `-2` … `+3` | Normal | Hijau |
| | `> +3` | Tinggi | Biru |
| **BB/PB · BB/TB · IMT/U** | `< -3` | Gizi buruk | Merah |
| | `-3` … `< -2` | Gizi kurang | Oranye |
| | `-2` … `+1` | Gizi baik | Hijau |
| | `> +1` … `+2` | Berisiko gizi lebih | Biru |
| | `> +2` … `+3` | Gizi lebih | Oranye |
| | `> +3` | **Obesitas** | Merah |
| **LIKA/U** | `< -2` | Mikrosefali | Oranye |
| | `-2` … `+2` | Normal | Hijau |
| | `> +2` | Makrosefali | Oranye |
| **LILA/U** | — | belum ada label ([OI-04](../pertanyaan-terbuka.md)) | Netral |

Aturan mengikat: **warna tidak pernah menjadi satu-satunya penanda.** Setiap chip berisi ikon, teks kategori, dan warna sekaligus. Laporan Posyandu dicetak hitam-putih, dan harus tetap terbaca.

Ikon per nada, dari Lucide: `OctagonAlert` (merah) · `TriangleAlert` (oranye) · `CircleCheck` (hijau) · `Info` (biru dan netral).

### ⚠️ Dua penyimpangan pada prototipe desain

Ditemukan saat membaca `portal-prototipe.html`; keduanya perlu diperbaiki saat implementasi:

| Temuan | Akibat |
|---|---|
| `wflClass()` **tidak punya cabang Obesitas** — berhenti di `Gizi lebih` untuk semua `z > +2` | Data Juni 2026 punya **3 anak obesitas**; di prototipe desain mereka terbaca `Gizi lebih`, satu tingkat lebih ringan dari keadaan sebenarnya |
| `wazClass()` dan `wflClass()` memakai oranye untuk `Risiko berat badan lebih` dan `Berisiko gizi lebih`, sedangkan sistem desain menetapkan biru | Kategori yang sekadar perlu dicatat terbaca sebagai perlu perhatian |

Implementasi mengikuti tabel di atas, bukan kode prototipe desain. Tercatat sebagai [OI-13](../pertanyaan-terbuka.md#oi-13--dua-penyimpangan-pada-prototipe-desain-portal).

---

## 4. Inventory komponen

Bagian ini adalah **sumber tunggal** daftar komponen. Seluruhnya ada di `client/src/components/`.

| Komponen | Isi |
|---|---|
| `ui/table.tsx` | Tabel dari shadcn/ui, satu-satunya komponen yang diambil dari sana. Dipakai Data Balita, Detail Balita, Detail riwayat penimbangan, Laporan, dan Pengaturan |
| `status-gizi-badge.tsx` | Lencana kategori berwarna. **Sumber tunggal** pemetaan bagian 3 |
| `kms-chart.tsx` | Kurva KMS. **SVG langsung, tanpa pustaka grafik**: yang dibutuhkan hanya beberapa pita dan garis SD serta sederet titik, sedangkan membuat pustaka grafik menggambar pita SD menuntut kustomisasi yang lebih panjang daripada SVG-nya sendiri |
| `kartu-balita.tsx` | Satu desain kartu balita untuk tampilan di layar dan lembar cetak. QR-nya bisa dipindai (`qrcode.react`); formatnya di [Arsitektur — Kartu balita](../arsitektur.md#kartu-balita) |
| `dialog.tsx` | Dialog modal memakai `<dialog>` bawaan peramban: fokus terkurung, Esc menutup, isi di belakangnya tidak bisa disentuh |
| `filter-periode.tsx` | Pemilih periode di sidebar dan di bilah atas tablet tegak, memakai `<select>` asli |
| `empty-state.tsx` | Keadaan kosong: menyebutkan sebab dan menawarkan jalan keluar, bukan sekadar "tidak ada data" |
| `halaman.tsx` | Kerangka layar: petak ikon, judul, satu baris keterangan, dan aksi di kanan |

Komponen shadcn lain ditarik satu per satu **saat benar-benar dibutuhkan**, bukan diborong di muka. Ikon memakai `lucide-react`.

---

## 5. Struktur halaman

Peta sembilan layar yang berlaku — alamat, peran, dan tangkapan layarnya — ada di [Mulai di sini](../mulai-di-sini.md#peta-layar). Setiap layar memakai kerangka yang sama dari `components/halaman.tsx`.

Dua aturan tata letak yang mengikat:

- Beranda, Data Balita, dan Detail Balita muat satu tampilan pada 1280 × 800 px. Bagian yang panjang — daftar Perlu perhatian, tabel Data Balita, Riwayat penimbangan — digulir di dalam kartunya sendiri, bukan halamannya.
- Daftar **Perlu perhatian** di Beranda disusun dari kategori status gizi saja, bukan dari 1T/2T/3T ([OI-01](../pertanyaan-terbuka.md#oi-01--definisi-ntob-dan-aturan-1t2t3t)).

Rencana susunan halaman sebelumnya — Dashboard, Periode, Rekap — disimpan di [riwayat](../riwayat/rencana-struktur-halaman.md).

---

## 6. Alur pengguna

Alur terpendek yang paling sering dipakai — mencari seorang balita lalu membaca riwayatnya — harus selesai dalam **dua klik dari Beranda**: menu Data Balita, lalu nama balitanya. Balita di daftar Perlu perhatian cukup satu klik.

---

## 7. Responsif

Perangkat utama adalah laptop dan tablet; ponsel cukup rapi. Ukuran yang diuji: tablet 1280 × 800 (mendatar) dan 800 × 1280 (tegak), laptop 1230 × 572 dan 1366 × 768, serta desktop 1920 × 1080.

| Lebar jendela | Perilaku |
|---|---|
| ≥ 1200 px | Detail Balita tampil dua kolom dan muat satu layar. Batas `xl` sengaja diturunkan dari 1280 ke 1200 px, karena laptop FHD berpenskalaan 150% hanya memberi sekitar 1230 px pada zoom 100% |
| ≥ 1024 px | Sidebar selalu tampil di kiri |
| < 1024 px | Sidebar diganti bilah atas berisi tombol **Menu**, merek, dan periode. Menu membuka laci yang menimpa isi, bukan mendorongnya |
| < 768 px | Ponsel: teks tidak terpotong, elemen tidak bertumpuk, halaman tidak menggulir mendatar. Bukan sasaran utama |

Jendela yang pendek (tinggi ≤ 680 px, dengan tetikus) merapatkan sidebar lewat varian `pendek` di `app.css`.

Aturan mengikat: **badan halaman tidak pernah menggulir horizontal.** Konten lebar — tabel, grafik — menggulir di dalam wadahnya sendiri.

---

## 8. Aksesibilitas

Kebutuhan minimum, bukan kemewahan (NFR-12). Rasio di bawah dihitung dari pasangan warna yang benar-benar dipakai `Portal Posyandu - Prototipe (standalone).html`.

| Pasangan | Rasio | Putusan |
|---|---|---|
| `#16211C` di atas `#FFFFFF` | 16,6:1 | lulus AAA |
| `#4A5750` di atas `#FFFFFF` | 7,6:1 | lulus AAA — teks sekunder 15 px aman |
| `#4A5750` di atas `#F6F7F5` (sidebar) | 7,1:1 | lulus AAA |
| `#0F6E44` di atas `#FFFFFF` | 6,3:1 | lulus AA |
| `#FFFFFF` di atas `#0F6E44` (tombol utama) | 6,3:1 | lulus AA |
| `#0F6E44` di atas `#E9F3EC` (chip hijau) | 5,6:1 | lulus AA |
| `#A3170F` di atas `#FCEDEC` (chip merah) | 6,9:1 | lulus AA |
| `#9A5B00` di atas `#FBF1E3` (chip oranye) | 4,9:1 | lulus AA, margin tipis — latarnya tidak boleh digelapkan |
| `#1148A8` di atas `#EAF0FB` (blok catatan) | 7,3:1 | lulus AA |
| `#3D2E00` di atas `#F2C300` (tombol Ubah) | 7,9:1 | lulus AAA |

Warna garis tidak memenuhi 3:1 untuk komponen non-teks: `#DCE0DA` 1,3:1 · `#D5DBD2` 1,4:1 · `#CFD5CB` 1,5:1 · `#A8B0A9` 2,2:1. Diterima sebagai garis dekoratif, dengan syarat **tepi kotak tidak pernah menjadi satu-satunya penanda sebuah kontrol** — setiap input punya label teks di atasnya dan setiap tombol punya teks di dalamnya. `#EAAA08` (2,1:1) tetap dilarang sebagai warna teks; teks peringatan memakai `#9A5B00`.

| Aspek | Aturan |
|---|---|
| Fokus | `outline: 2px solid #0F6E44; outline-offset: 1px`. Prototipe desain memasangnya pada `input:focus-visible`; implementasi memberlakukannya ke **semua** kontrol — nav, chip filter, tombol baris, tautan Detail. |
| Elemen interaktif | Prototipe desain memakai `<span role="button" tabindex="0">` karena kanvas desain tidak punya `<button>`. Implementasi memakai `<button>` dan `<a>` asli, bukan meniru pola itu. |
| Target sentuh | Lihat bagian 2.5: 45,5 px di kode, target 52 px menunggu keputusan. Tidak ada kontrol di bawah 44 px. |
| Label | Label permanen bertulisan tebal di atas setiap field. `placeholder` dikosongkan dan tidak pernah menggantikan label. |
| Ikon | Lucide, selalu berpasangan dengan teks. Pengecualiannya empat tombol yang maknanya jelas dari letaknya: panah kembali di kepala Detail Balita, tombol Keluar di kartu akun, panah rentang umur kurva KMS, dan tombol Tutup kamera di Penimbangan. Keempatnya wajib ber-`aria-label`. |
| Status | Tidak pernah disampaikan lewat warna saja — selalu ada teks kategori (bagian 3). |
| Tabel | Daftar anak di prototipe desain adalah CSS grid; implementasi memakai `<table>` dengan `<th scope="col">`. Tabel riwayat pengukuran dan rekap per RT di prototipe desain sudah `<table>`. |
| Angka | `font-feature-settings: "tnum" 1, "lnum" 1` di `body` dan `input`, agar kolom angka sejajar dan tidak bergeser saat diketik. |
| Teks terkecil | 12 px di kode, untuk label, chip, dan header tabel. Di bawah itu tidak dipakai. Batas 16 px dari 11 September menunggu keputusan bagian 2.4. |
| Gerak | **Diperbarui 17 September 2026.** Prototipe desain tidak memakai animasi sama sekali. Feedback lapangan dikonfirmasi meminta animasi sederhana tapi menarik — implementasi tetap wajib hormati `prefers-reduced-motion`. Daftar konkret elemen yang dianimasikan menyusul di fase desain, supaya tidak menebak dan bertentangan dengan P1 (kesederhanaan untuk kader non-teknis). |
| Bahasa | `<html lang="id">`. |

Prototipe desain tidak memuat satu pun atribut `aria`. Itu batas kanvas desain, bukan keputusan desain: kelengkapan semantik — `<button>`, `<th scope>`, `aria-label` pada ikon tunggal, `aria-live` pada banner "belum terkirim" — adalah kewajiban implementasi.

---

## 9. Aturan penulisan antarmuka

| Konteks | Aturan | Contoh |
|---|---|---|
| Nilai kosong | `—`, tidak pernah `0` atau kosong melompong | `BB: —` |
| Satuan | Selalu ditulis | `7,02 kg` · `67,0 cm` |
| Desimal | Koma sebagai pemisah desimal | `−1,23` |
| Z-score | Dua desimal, selalu bertanda | `−2,15` · `+0,60` |
| Tanggal | `13 Jun 2026` di tabel, `13 Juni 2026` di teks | |
| Umur | Bulan penuh | `4 bulan` · `57 bulan` |
| Persentase | Dengan penyebutnya, kecuali persennya sudah dicetak sebagai angka besar di atasnya | `43% (18 dari 42)` |
| NIK | Berspasi tiap empat digit | `3204 0162 0125 0002` |
| Tombol | Kata kerja, bukan kata benda | `Simpan Perubahan`, bukan `Penyimpanan` |
| Konfirmasi merusak | Menyebut objeknya secara spesifik | `Hapus pengukuran Juni 2026 untuk Ahmad?` |
| Pesan kesalahan | Menyebut apa yang salah dan apa yang harus dilakukan | `Berat badan harus antara 0,5 dan 40 kg.` |
| Keadaan kosong | Menjelaskan sebab, bukan sekadar "tidak ada data" | `Belum ada pengukuran pada periode ini.` |
