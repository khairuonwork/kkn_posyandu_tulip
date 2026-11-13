# DOKUMEN SPESIFIKASI KOMPONEN WEB & ARSITEKTUR FRONTEND
## SIMPATIK POSYANDU (Sistem Informasi Posyandu Terintegrasi dan Antropometri Digital)
**Program KKN Tematik 2026 — Posyandu Tulip RW 18**
*Versi Dokumen: 2.1-Final · Tanggal: 1 November 2026 · Klasifikasi: Spesifikasi Komponen & Frontend*

---

## DAFTAR ISI
1. [BAB 1: Fondasi Arsitektur Frontend & Filosofi Desain](#bab-1-fondasi-arsitektur-frontend--filosofi-desain)
2. [BAB 2: Sistem Navigasi & Router Hash Tanpa Ketergantungan Eksternal](#bab-2-sistem-navigasi--router-hash-tanpa-ketergantungan-eksternal)
3. [BAB 3: Hierarki Komponen & Struktur Direktori Modular](#bab-3-hierarki-komponen--struktur-direktori-modular)
4. [BAB 4: Katalog Komponen Global & Antarmuka Bersama (Shared UI)](#bab-4-katalog-komponen-global--antarmuka-bersama-shared-ui)
5. [BAB 5: Spesifikasi Komponen Modular Halaman (Page Modules)](#bab-5-spesifikasi-komponen-modular-halaman-page-modules)
   - [5.1 Modul Daftar Balita (`pages/anak/`)](#51-modul-daftar-balita-pagesanak)
   - [5.2 Modul Detail Balita & Grafik WHO (`pages/anak/show.tsx`)](#52-modul-detail-balita--grafik-who-pagesanakshowtsx)
   - [5.3 Modul Sasaran Layanan & Impor Excel (`pages/sasaran/`)](#53-modul-sasaran-layanan--impor-excel-pagessasaran)
   - [5.4 Modul Konfigurasi & Manajemen Akun (`pages/pengaturan/`)](#54-modul-konfigurasi--manajemen-akun-pagespengaturan)
   - [5.5 Modul Pemeriksaan KMS Bidan (`pages/kms/`)](#55-modul-pemeriksaan-kms-bidan-pageskms)
   - [5.6 Modul Dasbor, Laporan & Sesi Pelatihan](#56-modul-dasbor-laporan--sesi-pelatihan)
6. [BAB 6: Peta Integrasi Komponen ke REST API (Data Fetching Map)](#bab-6-peta-integrasi-komponen-ke-rest-api-data-fetching-map)
7. [BAB 7: Panduan Ekstensi & Rekomendasi Pemeliharaan Masa Depan](#bab-7-panduan-ekstensi--rekomendasi-pemeliharaan-masa-depan)

---

## BAB 1: FONDASI ARSITEKTUR FRONTEND & FILOSOFI DESAIN

### 1.1 Tumpukan Teknologi Inti (Core Stack)
Frontend SIMPATIK Posyandu dibangun menggunakan teknologi web modern berorientasi performa tinggi dan keandalan lapangan:
- **React 19:** Pustaka antarmuka deklaratif dengan sistem rendering concurrent dan hooks modern.
- **TypeScript 5.9:** Penegakan tipe data statis ketat (`strict: true`) yang mencegah *null-pointer exception* dan kesalahan tipe runtime.
- **Tailwind CSS v4:** Mesin styling utilitas terbaru dengan variabel CSS terkompilasi instan tanpa overhead runtime CSS-in-JS.
- **Vite 8.3:** Build tool dan development server berkecepatan tinggi dengan Hot Module Replacement (HMR) instan.
- **Lucide React:** Paket ikon SVG terstandar berbobot ringan dan ramah aksesibilitas (WAI-ARIA).

### 1.2 Filosofi Desain Rekayasa (Engineering Tenets)
1. **Zero External State Library Bloat:** Tidak menggunakan Redux, Zustand, MobX, atau React Query. State dikelola secara murni menggunakan React primitive hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) yang dikemas ke dalam *custom hooks domain* (`useSesi`, `useAnakServer`, `useBerandaServer`, dll.).
2. **Single Responsibility Principle (SRP):** Setiap file komponen hanya bertanggung jawab atas satu tugas visual atau interaksi tertentu. Komponen tidak boleh melebihi ~350 baris kode.
3. **Pemisahan Kontrak Tipe (`tipe.ts`):** Seluruh interface props dan tipe data diletakkan di file terpisah bernama `tipe.ts` di direktori terkait, menjamin keterbacaan kode dan mencegah *circular dependency*.
4. **Resilience Offline & Fast Load:** Waktu bundle Vite menghasilkan satu file JavaScript utama berukuran ~219 kB (gzip) yang dimuat instan pada koneksi internet terbatas maupun jaringan LAN offline.

---

## BAB 2: SISTEM NAVIGASI & ROUTER HASH TANPA KETERGANTUNGAN EKSTERNAL

Aplikasi menggunakan sistem router kustom berbasis URL Hash (`window.location.hash`) di dalam file [`client/src/lib/nav.tsx`](file:///C:/Users/Husaini/Workspace/01.%20Projects/KKN%20POLMAN%202026/3.%20Development/kkn_posyandu_tulip/client/src/lib/nav.tsx) dan [`client/src/app-shell.tsx`](file:///C:/Users/Husaini/Workspace/01.%20Projects/KKN%20POLMAN%202026/3.%20Development/kkn_posyandu_tulip/client/src/app-shell.tsx).

### 2.1 Skema Alamat & Pemetaan Rute (Route Mapping)

```typescript
export type Rute =
    | { nama: 'beranda' }
    | { nama: 'balita' }
    | { nama: 'detail'; id: number }
    | { nama: 'riwayat'; id: number }
    | { nama: 'laporan' }
    | { nama: 'sasaran' }
    | { nama: 'kartu-sasaran'; id?: number }
    | { nama: 'pengaturan' }
    | { nama: 'kms' }
    | { nama: 'pelatihan' };
```

| URL Hash | Rute Internal | Komponen Halaman | Deskripsi Fungsional |
|---|---|---|---|
| `#/` atau `#/beranda` | `beranda` | `pages/dashboard.tsx` | Dasbor eksekutif, rekapitulasi kehadiran, progres RT |
| `#/balita` | `balita` | `pages/anak/index.tsx` | Daftar master balita, filter RT, pencarian nama/NIK |
| `#/balita/:id` | `detail` | `pages/anak/show.tsx` | Kartu detail balita, tab kurva WHO, tab status, riwayat |
| `#/balita/:id/riwayat` | `riwayat` | `pages/anak/riwayat.tsx` | Tabel khusus penimbangan kronologis balita |
| `#/kms` | `kms` | `pages/kms/index.tsx` | Layar antrean pemeriksaan KMS real-time Dokter/Bidan |
| `#/kms/ruang-tunggu` | `ruang-tunggu-kms` | `pages/kms/ruang-tunggu.tsx` | Nomor dan meja panggilan, serta pengaturan suara browser |
| `#/sasaran` | `sasaran` | `pages/sasaran/index.tsx` | Manajemen sasaran bulanan dan panel impor berkas Excel |
| `#/kartu-sasaran` | `kartu-sasaran` | `pages/kartu-sasaran/index.tsx` | Pratinjau kartu timbang sasaran siap cetak fisik |
| `#/laporan` | `laporan` | `pages/laporan/index.tsx` | Rekapitulasi indikator SKDN & generator ekspor Excel F1 |
| `#/pengaturan` | `pengaturan` | `pages/pengaturan/index.tsx` | Kelola akun kader, ambang batas antropometri & standar |
| `#/pelatihan` | `pelatihan` | `pages/pelatihan/index.tsx` | Pengendali sesi simulasi sandbox PostgreSQL |
| `#/hasil/:token` | Publik Lembar | `pages/hasil/lembar.tsx` | Layar publik hasil KMS digital untuk orang tua |

### 2.2 Penjaga Akses Antarmuka (Interface Route Guard)
Fungsi `boleh(rute: Rute, peran: Peran): boolean` di `app-shell.tsx` memastikan antarmuka secara transparan menyaring menu berdasarkan peran yang masuk:
- **`kms` (Petugas KMS / Bidan Meja 3):** Hanya memiliki akses ke layar `kms`, `detail`, dan `riwayat`. Jika membuka alamat lain, otomatis dialihkan ke `#/kms`.
- **`kader` (Kader Lapangan):** Memiliki akses ke `beranda`, `balita`, `detail`, `riwayat`, `kartu-sasaran`. Menu impor dan pengaturan pengguna disembunyikan.
- **`admin` (Admin Posyandu):** Akses penuh ke seluruh menu operasional posyandu binaannya.
- **`superAdmin` (Pengelola Global):** Akses lintas posyandu serta menu kendali Sesi Pelatihan Sandbox.

---

## BAB 3: HIERARKI KOMPONEN & STRUKTUR DIREKTORI MODULAR

```text
client/src/
├── app.tsx                 # Root Router Switch (Publik Lembar vs Aplikasi Petugas)
├── app-shell.tsx           # Kerangka Shell: Sidebar, Topbar, StatusTablet, Akun
├── layar.tsx               # Orchestrator Prop Injection & Screen Router
│
├── components/             # Komponen UI Global (Shared UI)
│   ├── dialog.tsx          # Modal Pop-up Container dengan Backdrop
│   ├── halaman.tsx         # Layout Pembungkus Konten Halaman
│   ├── filter-periode.tsx  # Dropdown Seleksi Periode Posyandu Aktif
│   ├── status-tablet.tsx   # Widget Pemantau Telemetri Tablet Online/Offline
│   ├── status-gizi-badge.tsx # Badge Warna Status Gizi Terstandar
│   ├── z-score-cell.tsx    # Sel Tabel Z-Score Berwarna
│   ├── dialog-kirim-wa.tsx # Modal Bagikan Lembar via WhatsApp
│   ├── cakupan-penimbangan.tsx # Indikator Target Timbang (D/S Bar)
│   ├── kms-chart.tsx       # Render Kurva Pertumbuhan Interaktif WHO (SVG)
│   ├── grafik-berat-tinggi.tsx # Scatter Plot BB vs TB
│   ├── grafik-pertumbuhan.tsx  # Grafik Multi-Indeks Pertumbuhan
│   ├── panduan-keluarga-kia.tsx # Modal Edukasi Stimulasi KIA
│   ├── pendampingan-kia.tsx    # Form Checklist Instrumen KIA 2024
│   └── ui/table.tsx        # Styled Data Table Primitives
│
└── pages/                  # Halaman Aplikasi Terstruktur (State-of-the-Art)
    ├── anak/
    │   ├── index.tsx       # Orchestrator Daftar Balita (~240 baris)
    │   ├── show.tsx        # Orchestrator Detail Balita (~350 baris)
    │   ├── daftar/         # Sub-komponen Daftar Balita
    │   │   ├── tipe.ts
    │   │   ├── filter-anak.tsx
    │   │   ├── tabel-anak.tsx
    │   │   ├── editor-baris.tsx
    │   │   ├── form-tambah.tsx
    │   │   └── baris-penanda.tsx
    │   └── detail/         # Sub-komponen Detail Balita
    │       ├── tipe.ts
    │       ├── tab-profil.tsx
    │       ├── tab-status.tsx
    │       ├── tab-kurva.tsx
    │       ├── tab-grafik.tsx
    │       ├── tab-riwayat.tsx
    │       ├── kartu-indeks.tsx
    │       ├── status-naik.tsx
    │       ├── dialog-ubah.tsx
    │       └── dialog-cetak.tsx
    │
    ├── sasaran/
    │   ├── index.tsx       # Orchestrator Sasaran (~320 baris)
    │   └── komponen/       # Sub-komponen Sasaran & Impor
    │       ├── tipe.ts
    │       ├── panel-impor.tsx
    │       ├── tabel-sasaran.tsx
    │       ├── dialog-tambah-sasaran.tsx
    │       ├── dialog-edit-sasaran.tsx
    │       └── dialog-reset-sasaran.tsx
    │
    ├── pengaturan/
    │   ├── index.tsx       # Orchestrator Pengaturan (~260 baris)
    │   ├── tipe.ts
    │   ├── komponen/       # Komponen Bantu Pengaturan
    │   │   ├── isian-angka.tsx
    │   │   └── bilah-simpan.tsx
    │   └── bagian/         # Tab-tab Bagian Pengaturan
    │       ├── bagian-pengguna.tsx
    │       ├── dialog-pengguna.tsx
    │       ├── bagian-batas.tsx
    │       ├── bagian-ambang.tsx
    │       ├── bagian-standar.tsx
    │       └── bagian-riwayat.tsx
    │
    ├── kms/index.tsx       # Layar Antrean Pemeriksaan KMS Bidan
    ├── dashboard.tsx       # Layar Dasbor Eksekutif & Ringkasan Kehadiran
    ├── laporan/index.tsx   # Layar Rekapitulasi SKDN & Ekspor F1
    └── auth/login.tsx      # Layar Masuk Akun Portal
```

---

## BAB 4: KATALOG KOMPONEN GLOBAL & ANTARMUKA BERSAMA (SHARED UI)

### 4.1 Shell & Tata Letak Inti

#### `<Cangkang>` (`app-shell.tsx`)
* **Peran:** Pembungkus tata letak utama (layout shell) yang membawahi sidebar navigasi samping, bilah atas (*topbar*), banner informasi mode simulasi pelatihan, dan area konten utama.
* **Props Contract:**
  ```typescript
  interface CangkangProps {
    superAdmin: boolean;
    peran: Peran;
    cakupanPosyandu: string;
    periodeId: string;
    periode: Periode | null;
    onPindahPeriode: (periode: string) => void;
    kakiSidebar: ReactNode;
    children: ReactNode;
  }
  ```

#### `<StatusTablet>` (`components/status-tablet.tsx`)
* **Peran:** Widget indikator pemantau status komunikasi tablet Android. Ditampilkan di pojok kiri bawah sidebar.
* **Perilaku:** Memanggil `GET /api/v1/perangkat-terhubung` setiap 15 detik. Menampilkan pil hijau bertuliskan "N online · M offline" beserta pop-up detail baterai, waktu ping terakhir, dan jumlah antrean lokal yang tertahan di tablet.

### 4.2 Komponen Interaktif & Visualisasi Medis

#### `<Dialog>` (`components/dialog.tsx`)
* **Peran:** Wadah modal pop-up serbaguna yang dilengkapi dengan backdrop blur, penangkapan tombol Escape, pencegahan klik di luar batas modal, serta header dan footer tindakan.
* **Props Contract:**
  ```typescript
  interface DialogProps {
    terbuka: boolean;
    onTutup: () => void;
    judul: string;
    deskripsi?: string;
    children: ReactNode;
    lebar?: 'standar' | 'lebar' | 'ekstra';
  }
  ```

#### `<KmsChart>` & `<KmsChartSep24>` (`components/kms-chart.tsx`)
* **Peran:** Mesin rendering grafik kurva pertumbuhan WHO (KMS) berbasis elemen SVG interaktif murni.
* **Fitur Utama:**
  - Mendukung 4 indeks antropometri: BB/U, TB/U (atau PB/U), BB/TB (atau BB/PB), dan IMT/U.
  - Memetakan pita deviasi standar WHO: Z-Score -3, -2, -1, 0 (Median), +1, +2, +3 dengan warna standar Kemenkes RI.
  - Titik ukur anak dihubungkan dengan garis tren pertumbuhan dan tooltip interaktif yang menampilkan tanggal ukur dan bobot presisi.

#### `<StatusGiziBadge>` (`components/status-gizi-badge.tsx`)
* **Peran:** Komponen badge warna yang mencerminkan vonis status gizi balita sesuai Permenkes No. 2 Tahun 2020.
* **Palet Warna Semantik:**
  - `Gizi baik` / `Normal`: Latar hijau lembut (`tone-green-100`, teks `tone-green-800`).
  - `Gizi kurang` / `Risiko BB lebih`: Latar amber (`tone-amber-100`, teks `tone-amber-800`).
  - `Gizi buruk` / `Sangat pendek (Severely Stunted)`: Latar merah tegas (`tone-red-100`, teks `tone-red-800`).

#### `<DialogKirimWa>` (`components/dialog-kirim-wa.tsx`)
* **Peran:** Dialog penghubung edukasi orang tua yang memanggil endpoint `POST /api/v1/lembar`, menyusun tautan hasil digital, dan membuka WhatsApp Web atau WhatsApp Mobile dengan format pesan edukasi yang dipersonalisasi.

---

## BAB 5: SPESIFIKASI KOMPONEN MODULAR HALAMAN (PAGE MODULES)

---

### 5.1 Modul Daftar Balita (`pages/anak/`)

#### 1. Orchestrator: `pages/anak/index.tsx` (~240 baris)
* **Tanggung Jawab:** Mengelola *state* pencarian teks, pemilihan RT binaan, filter status gizi, modal pendaftaran anak baru, dan pemicuan re-fetch data balita dari backend.
* **Props Contract:**
  ```typescript
  interface DaftarAnakProps {
    daftar: BarisAnak[];
    daftarRt: readonly string[];
    peran: Peran;
    superAdmin?: boolean;
    onTambahAnak: (anak: AnakBaru) => Promise<void>;
    onKoreksiBaris: (anakId: number, koreksi: PatchAnak) => Promise<void>;
    periodeAktif: Periode | null;
  }
  ```

#### 2. Sub-Komponen `daftar/`
* **`filter-anak.tsx`:** Bilah kontrol pencarian input teks nama/NIK, tombol pemilih RT, dan tombol pemicu modal pendaftaran.
* **`tabel-anak.tsx`:** Tabel data utama balita dengan pagination, indikator usia dalam bulan, berat badan, tinggi badan, badge gizi, dan tautan langsung ke detail.
* **`editor-baris.tsx`:** Form pengeditan inline cepat untuk memperbarui data fisik balita tanpa harus berpindah ke layar detail.
* **`form-tambah.tsx`:** Modal pendaftaran balita baru dengan validasi ketat NIK 16 digit, tanggal lahir, jenis kelamin, dan nama orang tua.
* **`baris-penanda.tsx`:** Baris penanda visual status kehadiran dan indikator "Perlu Perhatian Khusus" (balita 2T atau risiko gizi buruk).

---

### 5.2 Modul Detail Balita & Grafik WHO (`pages/anak/show.tsx`)

#### 1. Orchestrator: `pages/anak/show.tsx` (~350 baris)
* **Tanggung Jawab:** Menyusun tata letak profil anak di bagian atas, mengelola pemilihan 5 tab utama (Profil, Status, Kurva WHO, Grafik Tren, Riwayat Ukur), mengontrol modal pengeditan profil, dan modal cetak kartu fisik.

#### 2. Sub-Komponen `detail/`
* **`tab-profil.tsx`:** Kartu informasi demografi lengkap (NIK, Tempat Tanggal Lahir, Usia Kronologis, Nama Ayah/Ibu, Alamat RT/RW, Status Kepemilikan Buku KIA).
* **`tab-status.tsx`:** Menampilkan matriks ringkasan antropometri terkini (Z-score BB/U, TB/U, BB/TB, IMT/U), tren pertumbuhan N/T/O/B, tombol dialog WhatsApp, dan tombol cetak sertifikat pertumbuhan.
* **`tab-kurva.tsx`:** Wadah interaktif kurva pertumbuhan WHO (`KmsChart`) dengan selektor jenis indeks (BB terhadap Usia, TB terhadap Usia, BB terhadap TB).
* **`tab-grafik.tsx`:** Grafik scatter plot dan garis regresi linier pertumbuhan berat terhadap tinggi badan.
* **`tab-riwayat.tsx`:** Tabel kronologis seluruh penimbangan anak dari bulan pertama hingga bulan terakhir dengan catatan lingkar kepala dan lingkar lengan.
* **`kartu-indeks.tsx`:** Kartu ringkasan deviasi standar individual dengan indikator skala jarum z-score.
* **`status-naik.tsx`:** Badge visual NTOB (N = Naik, T = Tetap/Turun, O = Tidak Ditimbang Bulan Lalu, B = Baru Pertama Kali Ditimbang).
* **`dialog-ubah.tsx`:** Dialog pengeditan data identitas balita yang mengirimkan mutasi ke `PATCH /api/v1/anak/:id`.
* **`dialog-cetak.tsx`:** Dialog pratinjau cetak hasil penimbangan untuk dicetak fisik atau disimpan ke format PDF lembar kartu KMS.

---

### 5.3 Modul Sasaran Layanan & Impor Excel (`pages/sasaran/`)

#### 1. Orchestrator: `pages/sasaran/index.tsx` (~320 baris)
* **Tanggung Jawab:** Mengatur alur penerbitan sasaran bulanan, mengendalikan modal impor berkas Excel Puskesmas, memfasilitasi penambahan sasaran manual, dan menyediakan fungsi darurat reset data harian.

#### 2. Sub-Komponen `komponen/`
* **`panel-impor.tsx`:** Komponen drag-and-drop file picker berkas spreadsheet `.xlsx`. Membaca berkas secara lokal, mengonversi ke Base64, memanggil endpoint `POST /api/v1/sasaran/pratinjau`, menampilkan daftar sheet yang ditemukan beserta jumlah sasaran, dan mengeksekusi impor permanen via `POST /api/v1/sasaran/impor`.
* **`tabel-sasaran.tsx`:** Tabel yang menampilkan seluruh balita yang terdaftar pada sasaran bulan berjalan, lengkap dengan indikator kehadiran, nomor antrean, status timbang, dan aksi edit status.
* **`dialog-tambah-sasaran.tsx`:** Modal pencarian balita dari database arsip untuk dimasukkan ke sasaran bulan aktif tanpa melalui file Excel.
* **`dialog-edit-sasaran.tsx`:** Modal perubahan status layanan sasaran (misal menandai balita pindah, sakit, atau berhalangan hadir).
* **`dialog-reset-sasaran.tsx`:** Modal tindakan darurat yang meminta konfirmasi pengetikan teks `RESET HARI INI` sebelum menghapus pengukuran yang salah rekam pada hari posyandu.

---

### 5.4 Modul Konfigurasi & Manajemen Akun (`pages/pengaturan/`)

#### 1. Orchestrator: `pages/pengaturan/index.tsx` (~260 baris)
* **Tanggung Jawab:** Menyediakan navigasi berbasis tab untuk pengelolaan akun kader posyandu, batas rentang antropometri fisik, ambang batas peringatan dini, tabel standar acuan LMS WHO, dan riwayat audit konfigurasi.

#### 2. Sub-Komponen `bagian/` & `komponen/`
* **`bagian-pengguna.tsx`:** Tabel daftar akun kader dan nakes posyandu. Memiliki tombol tambah akun dan tombol edit akun. Terhubung ke `GET /api/pengguna`.
* **`dialog-pengguna.tsx`:** Modal penambahan akun baru atau perubahan status/kata sandi akun lama. Dilindungi aturan *Last Admin Standing Guard*.
* **`bagian-batas.tsx`:** Konfigurasi batas bawah dan batas atas fisik yang masuk akal (misal berat minimal 1.5 kg, maksimal 35 kg; tinggi minimal 40 cm, maksimal 130 cm) untuk mencegah salah ketik kader di lapangan.
* **`bagian-ambang.tsx`:** Konfigurasi ambang deviasi z-score untuk memicu status peringatan gizi kurang atau stunting.
* **`bagian-standar.tsx`:** Penampil referensi tabel data LMS WHO 2006 dan acuan Kemenkes RI 2020.
* **`bagian-riwayat.tsx`:** Riwayat waktu perubahan konfigurasi dan identitas admin yang mengubah.
* **`isian-angka.tsx`:** Komponen input angka terstandar dengan validasi batas rentang dan indikator satuan (kg, cm).
* **`bilah-simpan.tsx`:** Bilah melayang (*floating action bar*) yang muncul otomatis saat terdapat perubahan konfigurasi yang belum disimpan.

---

### 5.5 Modul Pemeriksaan KMS Bidan (`pages/kms/index.tsx`)

* **Peran:** Layar ruang periksa Dokter atau Bidan Posyandu pada Meja 3.
* **Alur Kerja Real-Time:**
  1. Komponen melakukan polling berkala ke endpoint `GET /api/v1/antrean?status=kms_review` setiap 3–5 detik.
  2. Saat balita selesai ditimbang di Meja 2 (Tablet Android), balita seketika muncul pada antrean pemeriksaan Bidan.
  3. Bidan mengklik kartu balita untuk melihat visualisasi status gizi dan kurva pertumbuhan WHO.
  4. Setelah memberikan edukasi kepada orang tua, Bidan menekan tombol **"Konfirmasi Selesai"**, yang mengirimkan `POST /api/v1/antrean/:id/konfirmasi-kms` dan mengosongkan antrean untuk anak berikutnya.
  5. Tersedia tombol darurat **"Konfirmasi Semua KMS"** untuk menyelesaikan sisa antrean secara serentak di penutupan sesi.

---

### 5.6 Modul Dasbor, Laporan & Sesi Pelatihan

* **`pages/dashboard.tsx`:** Menampilkan kartu ringkasan eksekutif persentase kehadiran (D/S), rasio balita yang mengalami kenaikan berat badan (N/D), grafik sebaran status gizi per RT, dan modal pengaturan tanggal Hari-H penimbangan.
* **`pages/laporan/index.tsx`:** Menampilkan tabel SKDN lengkap, tab perbandingan antar-RT, dan tombol unduh file Excel F1 resmi Puskesmas (`GET /api/v1/laporan/f1/unduh`).
* **`pages/sesi-pelatihan.tsx`:** Panel kendali simulasi sandbox dual-schema yang memungkinkan superadmin memulai sesi pelatihan tanpa merusak data operasional.
* **`pages/hasil/lembar.tsx`:** Layar publik ringan tanpa login yang menampilkan lembar KMS digital resmi saat orang tua membuka tautan unik dari WhatsApp.

---

## BAB 6: PETA INTEGRASI KOMPONEN KE REST API (DATA FETCHING MAP)

Tabel berikut adalah acuan lengkap bagi pengembang untuk mengetahui fungsi hook atau service apa yang memanggil REST API dan komponen mana yang mengonsumsinya:

| Komponen Frontend | Custom Hook / Service Pengelola | HTTP Endpoint yang Dipanggil | Frekuensi & Pemicu Pemanggilan |
|---|---|---|---|
| `app.tsx` (`AplikasiPetugas`) | `useSesi` (`lib/sesi.ts`) | `GET /api/saya` | Dipanggil sekali saat inisialisasi aplikasi |
| `pages/auth/login.tsx` | `masuk()` (`lib/sesi.ts`) | `POST /api/masuk` | Saat pengguna menekan tombol Masuk |
| `app-shell.tsx` (`KartuAkun`) | `keluar()` (`lib/sesi.ts`) | `POST /api/keluar` | Saat pengguna menekan tombol Keluar di sidebar |
| `components/status-tablet.tsx` | Internal Effect (`status-tablet.tsx`) | `GET /api/v1/perangkat-terhubung` | Polling otomatis setiap 15 detik |
| `app.tsx` | `mulaiHeartbeatWeb()` (`lib/perangkat.ts`)| `POST /api/v1/heartbeat` | Background timer berkala setiap 60 detik |
| `pages/dashboard.tsx` | `useBerandaServer` (`lib/beranda.ts`) | `GET /api/v1/beranda` & `GET /api/v1/periode` | Saat layar dasbor dibuka atau periode diganti |
| `pages/dashboard.tsx` (Modal Hari-H)| `ubahHariH()` (`lib/beranda.ts`) | `PUT /api/v1/beranda/hari-h` | Saat admin mengubah tanggal Hari-H posyandu |
| `pages/anak/index.tsx` | `useAnakServer` (`lib/anak.ts`) | `GET /api/v1/anak` | Saat halaman daftar balita dibuka atau filter berubah |
| `pages/anak/daftar/form-tambah.tsx`| `tambahAnakServer()` (`lib/anak.ts`) | `POST /api/v1/anak` | Saat kader menyimpan pendaftaran anak baru |
| `pages/anak/show.tsx` | `useDetailAnakServer` (`lib/anak.ts`)| `GET /api/v1/anak/:id` | Saat kartu detail balita dibuka |
| `pages/anak/detail/dialog-ubah.tsx`| `simpanProfilAnak()` (`lib/anak.ts`) | `PATCH /api/v1/anak/:id` | Saat kader/bidan menyimpan perubahan profil |
| `components/dialog-kirim-wa.tsx` | `buatTautanLembar()` (`lib/lembar.ts`)| `POST /api/v1/lembar` | Saat tombol bagikan WhatsApp diklik |
| `pages/kms/index.tsx` | `ambilAntreanHariIni()` | `GET /api/v1/antrean-kms` | Memuat ulang antrean setiap 3 detik |
| `pages/kms/index.tsx` | `ubahPanggilanKms()` | `POST /api/v1/antrean-kms/:id/panggilan` | Panggil, panggil ulang, tandai tiba, atau kembalikan |
| `pages/kms/index.tsx` | `konfirmasiSelesaiKms()` | `POST /api/v1/antrean/:id/konfirmasi-kms` | Mengonfirmasi selesai setelah syarat terpenuhi |
| `pages/kms/ruang-tunggu.tsx` | `ambilPanggilan()` | `GET /api/v1/panggilan-kms` | Membaca panggilan baru untuk tampilan dan suara |
| `pages/sasaran/index.tsx` | Internal Fetcher (`pages/sasaran/`) | `GET /api/v1/sasaran` & `GET /api/v1/sasaran/periode` | Saat halaman sasaran dibuka atau periode diganti |
| `pages/sasaran/komponen/panel-impor.tsx` | `pratinjauSasaran()` (`lib/sasaran.ts`)| `POST /api/v1/sasaran/pratinjau` | Saat berkas spreadsheet `.xlsx` selesai dipilih |
| `pages/sasaran/komponen/panel-impor.tsx` | `imporSasaran()` (`lib/sasaran.ts`) | `POST /api/v1/sasaran/impor` | Saat tombol eksekusi impor ditekan |
| `pages/sasaran/komponen/dialog-reset-sasaran.tsx` | `resetHariIniServer()` (`lib/sasaran.ts`) | `POST /api/v1/sasaran/reset-hari-ini` | Saat tindakan darurat reset dikonfirmasi |
| `pages/laporan/index.tsx` | `useLaporanServer` (`lib/laporan.ts`) | `GET /api/v1/laporan` | Saat halaman rekapitulasi laporan dibuka |
| `pages/laporan/index.tsx` | Browser Window / Link Download | `GET /api/v1/laporan/f1/unduh` | Saat tombol unduh format F1 Puskesmas diklik |
| `pages/pengaturan/bagian/bagian-pengguna.tsx` | `usePenggunaServer` (`lib/pengguna.ts`)| `GET /api/pengguna` | Saat tab Pengguna dibuka oleh Admin |
| `pages/pengaturan/bagian/dialog-pengguna.tsx` | `tambahPengguna()` / `ubahPengguna()` | `POST /api/pengguna` / `PATCH /api/pengguna/:id` | Saat form pengguna baru atau edit disimpan |
| `pages/pelatihan/index.tsx` | Internal Fetcher (`pages/pelatihan/`)| `GET /api/v1/pelatihan/status` & `GET /api/v1/pelatihan` | Saat layar kontrol simulasi dibuka |
| `pages/pelatihan/index.tsx` | Internal Action | `POST /api/v1/pelatihan/mulai` & `POST /api/v1/pelatihan/akhiri` | Saat simulasi dimulai atau diakhiri |
| `pages/hasil/lembar.tsx` | Internal Fetcher (`pages/hasil/lembar.tsx`) | `GET /api/v1/lembar/:token` | Saat orang tua membuka URL lembar digital |

---

## BAB 7: PANDUAN EKSTENSI & REKOMENDASI PEMELIHARAAN MASA DEPAN

Bagi pengembang yang akan melanjutkan atau memelihara frontend SIMPATIK Posyandu, berikut adalah pedoman praktis (*best practices*):

1. **Menambah Halaman Baru:**
   - Tambahkan nama rute baru pada union type `Rute` di [`client/src/app-shell.tsx`](file:///C:/Users/Husaini/Workspace/01.%20Projects/KKN%20POLMAN%202026/3.%20Development/kkn_posyandu_tulip/client/src/app-shell.tsx).
   - Daftarkan pola parsing URL pada fungsi `bacaRute(alamat: string)`.
   - Tetapkan hak akses peran pada fungsi `boleh(rute: Rute, peran: Peran)`.
   - Buat direktori halaman baru di bawah `client/src/pages/<nama_halaman>/` dengan arsitektur modular (`index.tsx` sebagai orchestrator, `tipe.ts` sebagai kontrak, dan sub-komponen terisolasi).
   - Hubungkan rute tersebut pada switch router di [`client/src/layar.tsx`](file:///C:/Users/Husaini/Workspace/01.%20Projects/KKN%20POLMAN%202026/3.%20Development/kkn_posyandu_tulip/client/src/layar.tsx).

2. **Menambah Komponen Dialog atau Modal:**
   - Selalu bungkus menggunakan komponen `<Dialog>` dari [`client/src/components/dialog.tsx`](file:///C:/Users/Husaini/Workspace/01.%20Projects/KKN%20POLMAN%202026/3.%20Development/kkn_posyandu_tulip/client/src/components/dialog.tsx).
   - Simpan state `terbuka: boolean` di komponen orchestrator dan kirimkan callback `onTutup: () => void`.
   - Definisikan tipe form data di file `tipe.ts`.

3. **Integritas Pengetikan Data (Type Safety):**
   - Jalankan `npm run types:check` (`tsc --noEmit`) sebelum melakukan commit git untuk memastikan nol galat tipe TypeScript.
   - Jalankan `npm run build` (`vite build`) untuk memverifikasi proses bundling dan minifikasi produksi berhasil secara bersih.

---
## BAB 8: Perilaku antarmuka saat ini

- Beranda memisahkan Ringkasan dan Statistik & Tren; isian kehadiran hari H dibuka dalam dialog. Grafik tren memakai animasi dan menghormati pengaturan gerak sistem.
- Detail balita menyediakan grafik pertumbuhan dengan kontrol perbesaran, garis acuan dan navigasi keyboard antar tab. Lembar hasil menampilkan legenda garis acuan; tautan hasil demo hanya contoh dan bergantung pada akses ke alamat demo.
- Laporan demo menggunakan data contoh serta unduhan contoh, sementara laporan aplikasi memakai API. Batas unduhan F1 demo dijelaskan pada [panduan antrean KMS](panduan-antrean-kms.md#uji-simulasi-developer).
- Demo KMS menyediakan pencarian, tampilan dua kolom dan menu pemeriksaan selesai; lihat [panduan antrean KMS](panduan-antrean-kms.md). Simulasi pelatihan di demo tidak mengaktifkan sandbox server. Kondisi memuat, kosong dan gagal menggunakan komponen state halaman.
- Tombol dan filter yang disentuh perubahan antarmuka menyertakan label, status, atau ukuran target untuk penggunaan keyboard dan layar sentuh. Ini bukan klaim bahwa seluruh aplikasi telah lulus audit aksesibilitas.

*Dokumen ini merupakan panduan arsitektur komponen frontend dan antarmuka web untuk SIMPATIK Posyandu.*
