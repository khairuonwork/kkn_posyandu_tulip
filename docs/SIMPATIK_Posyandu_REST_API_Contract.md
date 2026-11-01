# DOKUMEN SPESIFIKASI KONTRAK REST API
## SIMPATIK POSYANDU (Sistem Informasi Posyandu Terintegrasi dan Antropometri Digital)
**Program KKN Tematik 2026 — Posyandu Tulip RW 18**
*Versi Dokumen: 2.1-Final · Tanggal: 1 November 2026 · Klasifikasi: Spesifikasi Teknis Terbuka*

---

## DAFTAR ISI
1. [BAB 1: Arsitektur Komunikasi & Standar Global REST API](#bab-1-arsitektur-komunikasi--standar-global-rest-api)
2. [BAB 2: Jalur Autentikasi, Sesi & Penjaga Akses (Middleware)](#bab-2-jalur-autentikasi-sesi--penjaga-akses-middleware)
3. [BAB 3: Katalog Lengkap REST API per Domain](#bab-3-katalog-lengkap-rest-api-per-domain)
   - [3.1 Autentikasi & Akun Pengguna](#31-autentikasi--akun-pengguna)
   - [3.2 Telemetri Perangkat & Sinkronisasi Mesh](#32-telemetri-perangkat--sinkronisasi-mesh)
   - [3.3 Master Data Balita & Penimbangan](#33-master-data-balita--penimbangan)
   - [3.4 Antrean & Pemeriksaan KMS Real-Time](#34-antrean--pemeriksaan-kms-real-time)
   - [3.5 Lembar Hasil Digital Orang Tua](#35-lembar-hasil-digital-orang-tua)
   - [3.6 Pendampingan Buku KIA 2024](#36-pendampingan-buku-kia-2024)
   - [3.7 Sasaran Layanan & Impor Excel Puskesmas](#37-sasaran-layanan--impor-excel-puskesmas)
   - [3.8 Laporan SKDN & Ekspor Puskesmas F1](#38-laporan-skdn--ekspor-puskesmas-f1)
   - [3.9 Dasbor Eksekutif & Jadwal Hari-H](#39-dasbor-eksekutif--jadwal-hari-h)
   - [3.10 Manajemen Pengguna & Hak Akses](#310-manajemen-pengguna--hak-akses)
   - [3.11 Mesin Sesi Pelatihan (Sandbox Isolation)](#311-mesin-sesi-pelatihan-sandbox-isolation)
4. [BAB 4: Matriks Pemetaan Pemanggil (Request Origin Mapping)](#bab-4-matriks-pemetaan-pemanggil-request-origin-mapping)
5. [BAB 5: Konfigurasi Jaringan & Alur Permintaan (Request Pipeline)](#bab-5-konfigurasi-jaringan--alur-permintaan-request-pipeline)

---

## BAB 1: ARSITEKTUR KOMUNIKASI & STANDAR GLOBAL REST API

### 1.1 Format Data & Protokol
Seluruh pertukaran data pada REST API SIMPATIK Posyandu menggunakan format JSON murni (`application/json`) dengan pengkodean karakter `UTF-8`.
- **Base Paths:**
  - `/api`: Rute tingkat portal dan autentikasi sesi peramban (`cookie-based`).
  - `/api/v1`: Rute berversi yang melayani Web Portal dan Aplikasi Tablet Android (`token-based` & `cookie-based`).
- **Aturan Pembatasan Body Parser:**
  - Batas payload JSON adalah `4MB` (`express.json({ limit: "4mb" })`) untuk mengakomodasi pengunggahan berkas Excel sasaran bulanan yang di-encode sebagai Base64.
- **Standar Tanggal & Waktu:**
  - Semua stempel waktu (*timestamp*) menggunakan standar ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
  - Tanggal kegiatan posyandu menggunakan format kalender standar (`YYYY-MM-DD`).
  - Periode posyandu menggunakan format tahun-bulan (`YYYY-MM`).

### 1.2 Format Respons Galat Standar (Standard Error Response)
Jika terjadi kegagalan validasi atau kesalahan server, API selalu mengembalikan struktur respons terpadu:
```json
{
  "galat": "Pesan deskripsi kesalahan yang mudah dipahami manusia"
}
```

### 1.3 Kode Status HTTP (HTTP Status Codes)
| Kode Status | Makna Teknis | Penggunaan dalam Sistem SIMPATIK |
|---|---|---|
| `200 OK` | Permintaan berhasil | Permintaan baca (`GET`) atau mutasi sukses (`POST`, `PATCH`, `PUT`). |
| `201 Created` | Sumber daya baru terbentuk | Balita baru terdaftar, penimbangan tercatat, sesi latihan dimulai. |
| `204 No Content` | Berhasil tanpa konten balik | Keluar sesi (`/api/keluar`), pra-pemeriksaan CORS OPTIONS. |
| `400 Bad Request` | Validasi input gagal | Format NIK tidak valid, parameter query salah, tanggal salah. |
| `401 Unauthorized` | Belum terotentikasi | Cookie sesi kosong, token Bearer kedaluwarsa atau salah. |
| `403 Forbidden` | Izin peran tidak cukup | Kader mencoba mengimpor sasaran atau membuka menu pengaturan. |
| `404 Not Found` | Data tidak ditemukan | ID balita, ID antrean, atau token lembar tidak ada di database. |
| `409 Conflict` | Konflik integritas data | Akun belum terikat posyandu, antrean belum menunggu KMS. |
| `429 Too Many Requests` | Batas laju tercapai | Rate limit brute-force kata sandi terpicu (header `Retry-After`). |
| `500 Server Error` | Galat internal server | Kegagalan basis data PostgreSQL yang tidak terduga. |
| `503 Service Unavailable` | Layanan belum aktif | Sesi pelatihan belum diaktifkan oleh pengelola sistem. |

---

## BAB 2: JALUR AUTENTIKASI, SESI & PENJAGA AKSES (MIDDLEWARE)

Sistem menggunakan arsitektur autentikasi ganda (*Dual-Authentication Scheme*) untuk melayani dua jenis klien:

```
[ KLIEN WEB BROWSER ]                    [ KLIEN TABLET ANDROID ]
        |                                           |
  POST /api/masuk                             POST /api/v1/masuk
        |                                           |
  (Set-Cookie: sesi=...)                      (Response: { token: "..." })
        |                                           |
  Header: Cookie                              Header: Authorization: Bearer <token>
        \                                           /
         +--------------------+--------------------+
                              |
                      [ sesiMiddleware ]
                              |
               Cek Token di Tabel `sesi` (PostgreSQL)
                              |
                     req.pengguna Terisi
                              |
                +-------------+-------------+
                |                           |
         [ wajibMasuk ]             [ wajibBoleh(...) ]
         (Cek Autentikasi)           (Cek Hak Akses RBAC)
```

### 2.1 Mekanisme Klien Web Browser
1. Petugas memasukkan kredensial pada `/api/masuk`.
2. Backend memvalidasi hash `scrypt` dan membuat string acak 32-byte kriptografis.
3. Token disimpan pada tabel `sesi` dan dikirimkan via header HTTP:
   `Set-Cookie: sesi=<token>; Path=/api; HttpOnly; SameSite=Lax; Secure`
4. Browser secara otomatis menyertakan cookie ini pada setiap request berikutnya ke `/api/*`.

### 2.2 Mekanisme Klien Tablet Android
1. Kader memasukkan username dan PIN/kata sandi pada `/api/v1/masuk`.
2. Backend mengembalikan JSON berisi `token` dan waktu kedaluwarsa `kedaluwarsa`.
3. Tablet Android menyimpan token pada `EncryptedSharedPreferences` dan menyertakannya pada header:
   `Authorization: Bearer <token>`
   `X-SIMpatik-Device-Id: <UUID_Perangkat>`

### 2.3 Rantai Middleware Penjaga Akses (Route Guards)
* `wajibMasuk`: Memastikan `req.pengguna` ada. Jika tidak ada, mengembalikan status `401 Unauthorized`.
* `wajibBoleh(izin)`: Menegakkan izin RBAC granular (misal: `lihat-anak`, `catat-pengukuran-lapangan`, `lihat-kms`, `konfirmasi-kms`, `kelola-akun`, `jalankan-impor`).
* `lingkupPelatihan`: Mengalihkan pool koneksi basis data ke skema `latihan_<uuid>` jika header `X-Mode-Pelatihan: 1` dikirimkan atau sesi latihan global sedang aktif.

---

## BAB 3: KATALOG LENGKAP REST API PER DOMAIN

---

### 3.1 Autentikasi & Akun Pengguna

#### `POST /api/masuk`
* **Fungsi:** Masuk sesi untuk pengguna Web Portal.
* **Izin Akses:** Publik (Tanpa Autentikasi).
* **Asal Pemanggil:** Web Login Screen (`pages/auth/login.tsx`).
* **Request Body:**
  ```json
  {
    "username": "kader_tulip1",
    "kataSandi": "rahasia123"
  }
  ```
* **Respons `200 OK`:**
  Memasang cookie `sesi`.
  ```json
  {
    "pengguna": {
      "id": 12,
      "username": "kader_tulip1",
      "nama": "Siti Rahmawati",
      "peran": "kader",
      "rt": "01",
      "rw": "18",
      "posyanduNama": "Posyandu Tulip",
      "superAdmin": false
    }
  }
  ```
* **Respons Galat:** `400` (Data tidak lengkap), `401` (Kata sandi salah), `429` (Terkena pembatas laju percobaan).

#### `POST /api/v1/masuk`
* **Fungsi:** Masuk sesi untuk Aplikasi Tablet Android.
* **Izin Akses:** Publik.
* **Asal Pemanggil:** Tablet Login Screen Android.
* **Request Body:** Sama dengan `/api/masuk`.
* **Respons `200 OK`:**
  ```json
  {
    "token": "a8f3b9c1d2e4...32bytesHex",
    "kedaluwarsa": "2026-11-02T18:00:00.000Z",
    "pengguna": {
      "id": 12,
      "username": "kader_tulip1",
      "nama": "Siti Rahmawati",
      "peran": "kader",
      "rt": "01",
      "rw": "18",
      "posyanduNama": "Posyandu Tulip"
    }
  }
  ```

#### `POST /api/keluar`
* **Fungsi:** Mengakhiri sesi Web Portal dan menghapus cookie.
* **Izin Akses:** Publik (Idempoten).
* **Asal Pemanggil:** Web Sidebar Footer (`KartuAkun` tombol keluar).
* **Respons `204 No Content`**

#### `POST /api/v1/keluar`
* **Fungsi:** Mengakhiri sesi tablet dan mencabut token di database.
* **Izin Akses:** `wajibMasuk`.
* **Asal Pemanggil:** Pengaturan Akun Tablet.
* **Respons `204 No Content`**

#### `GET /api/saya`
* **Fungsi:** Validasi status aktif sesi saat ini dan mengambil profil pengguna.
* **Izin Akses:** `wajibMasuk`.
* **Asal Pemanggil:** App Bootstrap Web (`useSesi` hook).
* **Respons `200 OK`:**
  ```json
  {
    "pengguna": {
      "id": 12,
      "username": "kader_tulip1",
      "nama": "Siti Rahmawati",
      "peran": "kader",
      "rt": "01",
      "rw": "18",
      "posyanduNama": "Posyandu Tulip",
      "superAdmin": false
    }
  }
  ```

---

### 3.2 Telemetri Perangkat & Sinkronisasi Mesh

#### `GET /api/v1/kesehatan`
* **Fungsi:** Cek konektivitas jalur PC/Server -> PostgreSQL sebelum kader masuk.
* **Izin Akses:** Publik.
* **Asal Pemanggil:** Android Network Check & Diagnostic Ping.
* **Respons `200 OK`:**
  ```json
  {
    "status": "siap",
    "database": "terhubung",
    "waktuServer": "2026-11-01T18:06:11.000Z"
  }
  ```

#### `POST /api/v1/heartbeat`
* **Fungsi:** Mengirim laporan status kesehatan tablet (baterai, antrean tertahan, versi APK).
* **Izin Akses:** `wajibMasuk`.
* **Asal Pemanggil:** Android Background Sync Service (setiap 30-60 detik) & Web Heartbeat.
* **Request Body:**
  ```json
  {
    "perangkatId": "tablet-kader-rt01",
    "tipe": "android",
    "baterai": 85,
    "tertahan": 0,
    "versi": "2.1.0"
  }
  ```
* **Respons `200 OK`:** `{"ok": true, "status": "terhubung", "waktuServer": "..."}`

#### `GET /api/v1/perangkat-terhubung`
* **Fungsi:** Mendapatkan daftar perangkat tablet aktif dalam 5 menit terakhir di Posyandu ini.
* **Izin Akses:** `wajibBoleh('lihat-anak')`.
* **Asal Pemanggil:** Komponen `StatusTablet` di sidebar kiri bawah Web.
* **Respons `200 OK`:**
  ```json
  [
    {
      "perangkatId": "tablet-kader-rt01",
      "tipe": "android",
      "online": true,
      "baterai": 85,
      "tertahan": 0,
      "terakhirDilihat": "2026-11-01T18:05:40.000Z",
      "username": "kader_tulip1"
    }
  ]
  ```

#### `GET /api/v1/cluster-context`
* **Fungsi:** Menyediakan kunci enkripsi komunikasi peer-to-peer (P2P) antar-tablet di LAN.
* **Izin Akses:** `wajibMasuk`.
* **Asal Pemanggil:** Inisialisasi Sinkronisasi Mesh Tablet Android.
* **Respons `200 OK`:**
  ```json
  {
    "workspaceId": "posyandu:1",
    "posyanduId": 1,
    "namaPosyandu": "Posyandu Tulip",
    "rw": "18",
    "clusterKey": "c3f87a912e8b...",
    "keyVersion": 1
  }
  ```

---

### 3.3 Master Data Balita & Penimbangan

#### `GET /api/v1/anak`
* **Fungsi:** Menampilkan daftar balita dengan riwayat status gizi terakhir.
* **Izin Akses:** `wajibBoleh('lihat-anak')`.
* **Asal Pemanggil:** Halaman Daftar Balita (`pages/anak/index.tsx`).
* **Query Params:**
  - `periode` (opsional): `2026-10`
  - `cari` (opsional): Nama balita atau NIK
  - `halaman` (opsional): Nomor halaman
  - `ukuran` (opsional): Jumlah item per halaman (default 50)
* **Respons `200 OK`:**
  ```json
  {
    "items": [
      {
        "anakId": 101,
        "nama": "Ahmad Faris",
        "nik": "3201012304210001",
        "nikLengkap": true,
        "jk": "L",
        "umurBulan": 28,
        "rt": "01",
        "namaOrtu": "Nurul",
        "tanggalUkurTerakhir": "2026-10-09",
        "kategoriGizi": "Gizi baik",
        "perluPerhatian": false,
        "risikoLahir": null,
        "bbKg": 12.4,
        "tinggiCm": 89.5
      }
    ],
    "total": 92
  }
  ```

#### `POST /api/v1/anak`
* **Fungsi:** Mendaftarkan balita baru dari meja pendaftaran lapangan atau web.
* **Izin Akses:** `wajibBoleh('daftar-anak-lapangan')`.
* **Asal Pemanggil:** Dialog Form Tambah Anak (`pages/anak/daftar/form-tambah.tsx`) & Form Pendaftaran Tablet.
* **Request Body:**
  ```json
  {
    "nama": "Muhammad Rizky",
    "nik": "3201010908240002",
    "tglLahir": "2024-08-09",
    "jk": "L",
    "rt": "02",
    "namaOrtu": "Dewi Sartika",
    "nikOrtu": "3201015506920001",
    "hp": "081234567890",
    "bukuKia": true,
    "bbLahirKg": 3.2
  }
  ```
* **Respons `201 Created`:** `{"anak": { "id": 105, "nama": "Muhammad Rizky", ... }}`

#### `GET /api/v1/anak/:id`
* **Fungsi:** Mengambil data spesifik balita, riwayat pengukuran lintas bulan, dan kurva WHO.
* **Izin Akses:** `wajibBoleh('lihat-anak')`.
* **Asal Pemanggil:** Halaman Detail Balita (`pages/anak/show.tsx`).
* **Query Params:** `periode` (opsional)
* **Respons `200 OK`:** Objek profil anak dan seluruh riwayat pengukurannya.

#### `PATCH /api/v1/anak/:id`
* **Fungsi:** Memperbarui data demografi balita (nama, NIK, RT, orang tua, status buku KIA).
* **Izin Akses:** `wajibBoleh('ubah-anak')`.
* **Asal Pemanggil:** Dialog Ubah Profil (`pages/anak/detail/dialog-ubah.tsx`).
* **Request Body:** Partial object field anak yang diubah.
* **Respons `200 OK`:** `{"hasil": { "id": 101, ... }}`

#### `POST /api/v1/pengukuran`
* **Fungsi:** Menyimpan hasil penimbangan dan pengukuran fisik balita.
* **Izin Akses:** `wajibBoleh('catat-pengukuran-lapangan')`.
* **Asal Pemanggil:** Tablet Pengukuran Meja 2 Android & Form Entri Pengukuran Web.
* **Logika Backend:**
  1. Menghitung umur bulan presisi pada tanggal ukur.
  2. Mengeksekusi engine antropometri WHO LMS 2006 (z-score BB/U, TB/U, BB/TB, IMT/U).
  3. Menentukan status N/T/O/B dibandingkan bulan sebelumnya.
  4. Menyimpan catatan ke tabel `pengukuran`.
  5. Memperbarui status antrean menjadi `kms_review` agar balita langsung muncul di layar Bidan.
* **Request Body:**
  ```json
  {
    "anakId": 101,
    "periodeId": "2026-10",
    "tanggalUkur": "2026-10-09",
    "bbKg": 12.4,
    "tinggiCm": 89.5,
    "caraUkur": "berdiri",
    "lilaCm": 15.2,
    "likaCm": 47.5,
    "asiEksklusif": true,
    "statusKehadiran": "hadir"
  }
  ```
* **Respons `201 Created`:**
  ```json
  {
    "pengukuran": {
      "id": 450,
      "anakId": 101,
      "zScore": { "bbU": -0.45, "tbU": -0.65, "bbTb": 0.12 },
      "kategori": { "bbU": "Normal", "tbU": "Normal", "bbTb": "Gizi baik" },
      "ntob": "N"
    }
  }
  ```

#### `GET /api/v1/sinkronisasi`
* **Fungsi:** Menyediakan dump data lengkap master anak dan standar antropometri untuk cache offline tablet Android.
* **Izin Akses:** `wajibBoleh('lihat-anak')`.
* **Asal Pemanggil:** Sinkronisasi Awal Tablet Android.
* **Respons `200 OK`:** Objek master anak, standar LMS WHO, dan daftar sasaran bulan berjalan.

---

### 3.4 Antrean & Pemeriksaan KMS Real-Time

#### `GET /api/v1/antrean`
* **Fungsi:** Mengambil daftar antrean penimbangan dan antrean pemeriksaan KMS hari ini.
* **Izin Akses:** `wajibBoleh('lihat-anak')`.
* **Asal Pemanggil:** Layar KMS Bidan (`pages/kms/index.tsx` dipolling tiap 3 detik) & Layar Antrean Tablet.
* **Query Params:**
  - `periodeId`: `2026-10` (format YYYY-MM untuk web, integer untuk tablet)
  - `tanggal`: `2026-10-09`
* **Respons `200 OK`:**
  ```json
  {
    "items": [
      {
        "id": "antrean_20261009_1",
        "nomorAntrean": 1,
        "sasaranId": 88,
        "anakId": 101,
        "nama": "Ahmad Faris",
        "status": "kms_review",
        "bbKg": 12.4,
        "tinggiCm": 89.5,
        "kategoriBbTb": "Gizi baik",
        "catatan": null
      }
    ]
  }
  ```

#### `POST /api/v1/antrean`
* **Fungsi:** Check-in balita ke antrean hari ini (biasanya saat memindai kartu QR di Meja 1).
* **Izin Akses:** `wajibBoleh('catat-pengukuran-lapangan')`.
* **Asal Pemanggil:** Scanner QR Tablet Meja 1 Pendaftaran.
* **Request Body:**
  ```json
  {
    "periodeId": 15,
    "sasaranId": 88,
    "tanggal": "2026-10-09",
    "catatan": "Keluarga baru pindah"
  }
  ```
* **Respons `201 Created`:** Objek item antrean dengan nomor urut yang digenerate otomatis.

#### `PATCH /api/v1/antrean/:id`
* **Fungsi:** Memperbarui status antrean (`waiting`, `called`, `serving`, `kms_review`, `done`, `cancelled`).
* **Izin Akses:** `wajibBoleh('catat-pengukuran-lapangan')`.
* **Asal Pemanggil:** Kontrol Antrean Tablet Android.
* **Request Body:**
  ```json
  {
    "status": "serving"
  }
  ```
* **Respons `200 OK`:** Objek antrean terbarui.

#### `POST /api/v1/antrean/:id/konfirmasi-kms`
* **Fungsi:** Dokter atau Bidan mengonfirmasi edukasi KMS balita selesai; memindahkan antrean ke status `done`.
* **Izin Akses:** `wajibBoleh(['konfirmasi-kms', 'catat-pengukuran-lapangan'])`.
* **Asal Pemanggil:** Tombol "Konfirmasi Selesai" di Layar KMS Web Bidan (`pages/kms/index.tsx`).
* **Respons `200 OK`:** Objek antrean terbarui dengan status `done`.

#### `POST /api/v1/antrean/konfirmasi-semua-kms`
* **Fungsi:** Tindakan batch untuk menyelesaikan seluruh sisa balita di antrean KMS secara serentak di akhir acara.
* **Izin Akses:** `wajibBoleh(['konfirmasi-kms', 'catat-pengukuran-lapangan'])`.
* **Asal Pemanggil:** Tombol "Konfirmasi Semua" di Layar KMS Web.
* **Request Body:** `{"periodeId": 15, "tanggal": "2026-10-09"}`
* **Respons `200 OK`:** `{"ok": true, "jumlah": 8}`

---

### 3.5 Lembar Hasil Digital Orang Tua

#### `POST /api/v1/lembar`
* **Fungsi:** Membuat tautan publik digital berenkripsi yang aman untuk dibagikan ke WhatsApp orang tua.
* **Izin Akses:** `wajibBoleh('lihat-kms')`.
* **Asal Pemanggil:** Dialog Kirim WhatsApp (`components/dialog-kirim-wa.tsx`) & Tab Status Detail Anak.
* **Request Body:**
  ```json
  {
    "anakId": 101,
    "periodeId": "2026-10"
  }
  ```
* **Respons `201 Created`:**
  ```json
  {
    "token": "7b8e9a21c4...400chars",
    "tautan": "https://posyandu-tulip.rw18.id/#/hasil/7b8e9a21c4..."
  }
  ```

#### `GET /api/v1/lembar/:token`
* **Fungsi:** Menampilkan lembar KMS digital resmi untuk dibaca oleh orang tua di ponsel pribadi.
* **Izin Akses:** Publik (Tanpa Autentikasi).
* **Header Keamanan:** `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`.
* **Asal Pemanggil:** Halaman Publik Lembar Hasil (`pages/hasil/lembar.tsx`).
* **Respons `200 OK`:** Data lengkap nama balita, tanggal penimbangan, berat badan, tinggi badan, vonis status gizi bahasa awam, dan panduan gizi seimbang KIA.

---

### 3.6 Pendampingan Buku KIA 2024

#### `GET /api/v1/anak/:id/pendampingan-kia`
* **Fungsi:** Mengambil status verifikasi pengisian buku KIA (kepatuhan imunisasi, vitamin A, obat cacing, stimulasi motorik).
* **Izin Akses:** `wajibBoleh('lihat-anak')`.
* **Asal Pemanggil:** Dialog Pendampingan KIA (`components/pendampingan-kia.tsx`).
* **Respons `200 OK`:** Checklist instrumen panduan keluarga KIA 2024.

#### `POST /api/v1/anak/:id/pendampingan-kia`
* **Fungsi:** Menyimpan hasil diskusi dan evaluasi buku KIA balita bulan ini.
* **Izin Akses:** `wajibBoleh('catat-survei-kia')`.
* **Asal Pemanggil:** Dialog Pendampingan KIA (`components/pendampingan-kia.tsx`).
* **Request Body:** Objek kuesioner KIA (skor stimulasi, kepemilikan buku KIA, pemberian vitamin A/oralit).
* **Respons `200 OK`:** `{"sukses": true, "dicatatPada": "..."}`

---

### 3.7 Sasaran Layanan & Impor Excel Puskesmas

#### `GET /api/v1/sasaran/periode`
* **Fungsi:** Mengambil daftar seluruh periode sasaran yang tercatat di sistem (misal: `2026-10`, `2026-09`).
* **Izin Akses:** `wajibBoleh('lihat-anak')`.
* **Asal Pemanggil:** Dropdown filter periode global (`FilterPeriode`).
* **Respons `200 OK`:** Array metadata periode dan tanggal kegiatan.

#### `GET /api/v1/sasaran`
* **Fungsi:** Mengambil daftar balita yang menjadi target timbang pada periode aktif beserta status layanannya.
* **Izin Akses:** `wajibBoleh('lihat-anak')`.
* **Asal Pemanggil:** Tabel Sasaran Web (`pages/sasaran/komponen/tabel-sasaran.tsx`).
* **Query Params:** `periode` (opsional, contoh: `2026-10`)
* **Respons `200 OK`:** Array balita sasaran, status penimbangan (sudah diukur / belum), dan keterangan.

#### `GET /api/v1/sasaran/calon-anak`
* **Fungsi:** Mencari balita yang sudah terdaftar di master database tetapi belum dimasukkan ke sasaran bulan ini.
* **Izin Akses:** `wajibBoleh('lihat-anak')`.
* **Asal Pemanggil:** Dialog Tambah Sasaran Manual (`pages/sasaran/komponen/dialog-tambah-sasaran.tsx`).
* **Query Params:** `periodeId`, `cari`
* **Respons `200 OK`:** Daftar rekomendasi balita.

#### `POST /api/v1/sasaran/manual`
* **Fungsi:** Menambahkan satu anak ke daftar sasaran bulan berjalan tanpa impor file.
* **Izin Akses:** `wajibBoleh('jalankan-impor')`.
* **Asal Pemanggil:** Dialog Tambah Sasaran Manual.
* **Request Body:** `{"periodeId": "2026-10", "anakId": 101, "catatan": "Pindahan baru"}`
* **Respons `201 Created`:** Objek sasaran baru.

#### `PATCH /api/v1/sasaran/:id`
* **Fungsi:** Mengubah status layanan atau catatan kehadiran sasaran (misal: pindah RT, sakit).
* **Izin Akses:** `wajibBoleh('jalankan-impor')`.
* **Asal Pemanggil:** Dialog Edit Sasaran (`pages/sasaran/komponen/dialog-edit-sasaran.tsx`).
* **Respons `200 OK`:** Objek sasaran terbarui.

#### `POST /api/v1/sasaran/pratinjau`
* **Fungsi:** Memindai dan mem-parsing berkas Excel `.xlsx` yang diunggah oleh kader sebelum dilakukan impor permanen.
* **Izin Akses:** `wajibBoleh('jalankan-impor')`.
* **Asal Pemanggil:** Panel Impor Excel (`pages/sasaran/komponen/panel-impor.tsx`).
* **Request Body:**
  ```json
  {
    "namaBerkas": "Sasaran_Posyandu_Oktober2026.xlsx",
    "berkasBase64": "UEsDBBQAAAAIA..."
  }
  ```
* **Respons `200 OK`:**
  ```json
  {
    "daftarSheet": [
      {
        "namaSheet": "Oktober 2026",
        "periode": "2026-10",
        "jumlahBaris": 92,
        "siapImpor": 92,
        "duplikat": 0
      }
    ]
  }
  ```

#### `POST /api/v1/sasaran/impor`
* **Fungsi:** Mengeksekusi penulisan sasaran bulanan dari sheet Excel yang dipilih ke database PostgreSQL.
* **Izin Akses:** `wajibBoleh('jalankan-impor')`.
* **Asal Pemanggil:** Panel Impor Excel.
* **Request Body:**
  ```json
  {
    "namaBerkas": "Sasaran_Posyandu_Oktober2026.xlsx",
    "berkasBase64": "UEsDBBQAAAAIA...",
    "namaSheet": "Oktober 2026"
  }
  ```
* **Respons `201 Created`:** `{"hasil": { "jumlahDiproses": 92, "anakBaru": 2, "anakDiperbarui": 90 }}`

#### `POST /api/v1/sasaran/tutup-sesi`
* **Fungsi:** Menandai sesi posyandu bulan ini telah resmi ditutup; membekukan perubahan antrean.
* **Izin Akses:** `wajibBoleh('selesaikan-sesi-lapangan')`.
* **Asal Pemanggil:** Tombol "Tutup Sesi Bulan Ini" di Web Sasaran.
* **Request Body:** `{"periodeId": "2026-10"}`
* **Respons `200 OK`:** `{"hasil": { "status": "ditutup", "waktuTutup": "..." }}`

#### `GET /api/v1/sasaran/reset-hari-ini`
* **Fungsi:** Menghitung jumlah pengukuran dan antrean yang dibuat pada hari ini sebagai pratinjau tindakan darurat.
* **Izin Akses:** `wajibBoleh('hapus-data')`.
* **Asal Pemanggil:** Dialog Reset Data Hari Ini (`pages/sasaran/komponen/dialog-reset-sasaran.tsx`).
* **Query Params:** `periodeId`
* **Respons `200 OK`:** `{"jumlahPengukuran": 14, "jumlahAntrean": 14}`

#### `POST /api/v1/sasaran/reset-hari-ini`
* **Fungsi:** Menghapus seluruh penimbangan dan antrean yang tercatat pada hari ini jika terjadi kekeliruan fatal operasional.
* **Izin Akses:** `wajibBoleh('hapus-data')`.
* **Asal Pemanggil:** Dialog Reset Data Hari Ini.
* **Request Body:**
  ```json
  {
    "periodeId": "2026-10",
    "konfirmasi": "RESET HARI INI"
  }
  ```
* **Respons `200 OK`:** `{"hasil": { "dihapus": true, "jumlahPengukuranDihapus": 14 }}`

---

### 3.8 Laporan SKDN & Ekspor Puskesmas F1

#### `GET /api/v1/laporan`
* **Fungsi:** Menghasilkan rekapitulasi indikator SKDN (Sasaran, KMS, Ditimbang, Naik BB) dan sebaran status gizi balita.
* **Izin Akses:** `wajibBoleh('lihat-rekap')`.
* **Asal Pemanggil:** Halaman Laporan Web (`pages/laporan/index.tsx`).
* **Query Params:** `periode` (`YYYY-MM`)
* **Respons `200 OK`:** Objek ringkasan indikator SKDN, tabel per RT, dan sebaran gizi stunting/wasting.

#### `GET /api/v1/laporan/unduh`
* **Fungsi:** Mengunduh file Excel ringkasan rekapitulasi posyandu internal.
* **Izin Akses:** `wajibBoleh('unduh-rekap')`.
* **Asal Pemanggil:** Tombol "Unduh Rekap Bulanan" di Halaman Laporan.
* **Format Output:** Binary Stream `.xlsx` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).

#### `GET /api/v1/laporan/f1/unduh`
* **Fungsi:** Mengunduh buku kerja Excel resmi Format F1 Puskesmas Pembina (terdiri dari Sheet F1 Rekapitulasi, Sheet Raw Data RT 1 s/d RT 7).
* **Izin Akses:** `wajibBoleh('unduh-rekap')`.
* **Asal Pemanggil:** Tombol "Unduh Format F1 Puskesmas" di Halaman Laporan.
* **Format Output:** Binary Stream `.xlsx` dengan nama berkas `laporan-f1-YYYY-MM.xlsx`.

---

### 3.9 Dasbor Eksekutif & Jadwal Hari-H

#### `GET /api/v1/beranda`
* **Fungsi:** Mengambil metrik utama untuk pemantauan pimpinan (tingkat kehadiran D/S, grafik radar tren gizi).
* **Izin Akses:** `wajibBoleh('lihat-dashboard')`.
* **Asal Pemanggil:** Halaman Beranda Web (`pages/dashboard.tsx`).
* **Query Params:** `periode` (`YYYY-MM`), `rt` (opsional)
* **Respons `200 OK`:** Objek statistik dasbor eksekutif.

#### `GET /api/v1/periode`
* **Fungsi:** Daftar periode untuk navigasi dasbor.
* **Izin Akses:** `wajibBoleh('lihat-dashboard')`.
* **Asal Pemanggil:** Selector periode di Dasbor.

#### `PUT /api/v1/beranda/hari-h`
* **Fungsi:** Mengatur tanggal pelaksanaan kegiatan posyandu (Hari-H) pada bulan aktif.
* **Izin Akses:** `wajibBoleh('ubah-pengukuran')`.
* **Asal Pemanggil:** Modal Pengaturan Hari-H di Beranda.
* **Request Body:**
  ```json
  {
    "periodeId": "2026-10",
    "tanggalKegiatan": "2026-10-09"
  }
  ```
* **Respons `200 OK`:** `{"sukses": true, "tanggalKegiatan": "2026-10-09"}`

---

### 3.10 Manajemen Pengguna & Hak Akses

#### `GET /api/pengguna`
* **Fungsi:** Mengambil seluruh akun pengguna di Posyandu ini beserta daftar wilayah binaan RT.
* **Izin Akses:** `wajibBoleh('kelola-akun')` (Khusus Admin Posyandu & Superadmin).
* **Asal Pemanggil:** Tab Pengguna di Pengaturan (`pages/pengaturan/bagian/bagian-pengguna.tsx`).
* **Respons `200 OK`:**
  ```json
  {
    "pengguna": [
      {
        "id": 12,
        "username": "kader_tulip1",
        "nama": "Siti Rahmawati",
        "peran": "kader",
        "rt": "01",
        "aktif": true
      }
    ],
    "daftarRt": ["01", "02", "03", "04", "05", "06", "07"]
  }
  ```

#### `POST /api/pengguna`
* **Fungsi:** Membuat akun kader atau nakes baru dengan kata sandi awal yang di-hash menggunakan algoritma `scrypt`.
* **Izin Akses:** `wajibBoleh('kelola-akun')`.
* **Asal Pemanggil:** Dialog Pengguna (`pages/pengaturan/bagian/dialog-pengguna.tsx`).
* **Request Body:**
  ```json
  {
    "nama": "Nurul Hidayah",
    "username": "kader_tulip2",
    "kataSandi": "Posyandu2026!",
    "peran": "kader",
    "rt": "02"
  }
  ```
* **Respons `201 Created`:** Objek data pengguna baru tanpa hash kata sandi.

#### `PATCH /api/pengguna/:id`
* **Fungsi:** Memperbarui data pengguna, status aktif/nonaktif, peran, RT binaan, atau mereset kata sandi.
* **Izin Akses:** `wajibBoleh('kelola-akun')`.
* **Proteksi Khusus:** Dilindungi aturan *Last Admin Standing* (Admin aktif terakhir tidak dapat dinonaktifkan).
* **Asal Pemanggil:** Dialog Pengguna.
* **Request Body:**
  ```json
  {
    "nama": "Nurul Hidayah",
    "peran": "kader",
    "rt": "02",
    "aktif": true,
    "kataSandi": "SandiBaru2026"
  }
  ```
* **Respons `200 OK`:** Objek pengguna terbarui. Sesi aktif pengguna otomatis dicabut jika kata sandi diubah.

---

### 3.11 Mesin Sesi Pelatihan (Sandbox Isolation)

#### `GET /api/v1/pelatihan/status`
* **Fungsi:** Mengetahui apakah sistem saat ini sedang berada dalam Mode Pelatihan (Sandbox) atau Mode Riil.
* **Izin Akses:** `wajibMasuk`.
* **Asal Pemanggil:** Banner Penanda Pelatihan di Web Portal & Indikator Status Tablet.
* **Respons `200 OK`:**
  ```json
  {
    "aktif": true,
    "sesi": {
      "id": "8f4b12c9-6a21-43ef-b209-1a3e872e4521",
      "jumlah": 92,
      "mulaiPada": "2026-10-31T08:15:00.000Z"
    }
  }
  ```

#### `GET /api/v1/pelatihan`
* **Fungsi:** Mengambil opsi sasaran riil yang dapat dijadikan sumber duplikasi untuk simulasi pelatihan.
* **Izin Akses:** Superadmin (`req.pengguna.superAdmin === true`).
* **Asal Pemanggil:** Halaman Kelola Sesi Pelatihan (`pages/pelatihan/index.tsx`).
* **Respons `200 OK`:** Sesi aktif dan daftar periode sumber.

#### `POST /api/v1/pelatihan/mulai`
* **Fungsi:** Menginisialisasi skema isolasi PostgreSQL `latihan_<uuid>` dan menduplikasi data sasaran dengan NIK & nama tersamar.
* **Izin Akses:** Superadmin.
* **Asal Pemanggil:** Tombol "Mulai Sesi Pelatihan" di Halaman Pelatihan.
* **Request Body:**
  ```json
  {
    "periodeId": 15,
    "konfirmasi": true
  }
  ```
* **Respons `201 Created`:** `{"status": "aktif", "id": "8f4b12c9...", "jumlahSasaran": 92}`

#### `POST /api/v1/pelatihan/akhiri`
* **Fungsi:** Menghancurkan (*DROP SCHEMA CASCADE*) seluruh data simulasi pelatihan; mengembalikan server ke skema `public`.
* **Izin Akses:** Superadmin.
* **Asal Pemanggil:** Tombol "Akhiri dan Hapus Data Latihan" di Halaman Pelatihan.
* **Request Body:**
  ```json
  {
    "id": "8f4b12c9-6a21-43ef-b209-1a3e872e4521",
    "konfirmasi": true
  }
  ```
* **Respons `200 OK`:** `{"status": "selesai", "dataLatihanDihapus": true}`

---

## BAB 4: MATRIKS PEMETAAN PEMANGGIL (REQUEST ORIGIN MAPPING)

Tabel berikut memetakan setiap endpoint ke komponen frontend atau aplikasi Android yang bertanggung jawab memanggilnya:

| HTTP Method & Endpoint | Pemanggil di Web Portal | Pemanggil di Android App | Frekuensi & Pemicu Request |
|---|---|---|---|
| `POST /api/masuk` | `pages/auth/login.tsx` | - | Interaksi tombol saat login web |
| `POST /api/v1/masuk` | - | `LoginActivity.kt` | Interaksi tombol saat login APK |
| `POST /api/keluar` | `app-shell.tsx` (`KartuAkun`) | - | Tombol keluar pada sidebar |
| `POST /api/v1/keluar` | - | Menu Pengaturan APK | Tombol keluar pada tablet |
| `GET /api/saya` | `lib/sesi.ts` (`useSesi`) | - | Auto-check saat pertama kali web dibuka |
| `GET /api/v1/kesehatan` | - | `NetworkDiagnostic.kt` | Sebelum login di APK tablet |
| `POST /api/v1/heartbeat` | `lib/perangkat.ts` | `HeartbeatWorker.kt` | Timer background berkala (30-60 detik) |
| `GET /api/v1/perangkat-terhubung` | `components/status-tablet.tsx` | - | Polling 15 detik saat web dibuka |
| `GET /api/v1/anak` | `pages/anak/index.tsx` | `AnakListFragment.kt` | Navigasi halaman, pencarian, filter RT |
| `POST /api/v1/anak` | `pages/anak/daftar/form-tambah.tsx` | `RegistrasiAnakActivity.kt` | Submit form pendaftaran anak baru |
| `GET /api/v1/anak/:id` | `pages/anak/show.tsx` | `DetailAnakActivity.kt` | Buka kartu profil anak |
| `PATCH /api/v1/anak/:id` | `pages/anak/detail/dialog-ubah.tsx` | `EditAnakActivity.kt` | Submit form edit data anak |
| `POST /api/v1/pengukuran` | `pages/anak/show.tsx` | `TimbangActivity.kt` | Submit simpan hasil penimbangan |
| `GET /api/v1/sinkronisasi` | - | `SyncManager.kt` | Tombol sinkronisasi awal di tablet |
| `GET /api/v1/antrean` | `pages/kms/index.tsx` | `AntreanQueueActivity.kt` | Polling real-time 3-5 detik di web KMS |
| `POST /api/v1/antrean` | - | Scanner QR Meja 1 | Saat kartu anak berhasil dipindai |
| `POST /api/v1/antrean/:id/konfirmasi-kms` | `pages/kms/index.tsx` | - | Tombol "Konfirmasi Selesai" Bidan |
| `POST /api/v1/antrean/konfirmasi-semua-kms` | `pages/kms/index.tsx` | - | Tombol konfirmasi massal akhir sesi |
| `POST /api/v1/lembar` | `components/dialog-kirim-wa.tsx` | - | Tombol "Bagikan via WhatsApp" |
| `GET /api/v1/lembar/:token` | `pages/hasil/lembar.tsx` | - | Akses peramban ponsel orang tua |
| `GET /api/v1/sasaran` | `pages/sasaran/index.tsx` | `SasaranCache.kt` | Saat membuka menu sasaran |
| `POST /api/v1/sasaran/pratinjau` | `pages/sasaran/komponen/panel-impor.tsx` | - | Saat file `.xlsx` selesai dipilih |
| `POST /api/v1/sasaran/impor` | `pages/sasaran/komponen/panel-impor.tsx` | - | Tombol "Impor Sheet Ini" |
| `GET /api/v1/laporan/f1/unduh` | `pages/laporan/index.tsx` | - | Tombol unduh laporan F1 Puskesmas |
| `GET /api/v1/beranda` | `pages/dashboard.tsx` | - | Saat membuka menu Beranda |
| `GET /api/pengguna` | `pages/pengaturan/bagian/bagian-pengguna.tsx` | - | Buka tab Akun di Pengaturan |
| `POST /api/pengguna` | `pages/pengaturan/bagian/dialog-pengguna.tsx` | - | Simpan akun kader baru |
| `GET /api/v1/pelatihan/status` | `app.tsx` & `app-shell.tsx` | `MainActivity.kt` | Pengecekan banner sandbox |
| `POST /api/v1/pelatihan/mulai` | `pages/pelatihan/index.tsx` | - | Tombol mulai sesi simulasi |
| `POST /api/v1/pelatihan/akhiri` | `pages/pelatihan/index.tsx` | - | Tombol akhiri & bersihkan simulasi |

---

## BAB 5: KONFIGURASI JARINGAN & ALUR PERMINTAAN (REQUEST PIPELINE)

### 5.1 Jalur Konfigurasi Proxy Pengembangan vs Produksi
1. **Lingkungan Pengembangan Lokal (Local Dev):**
   * Frontend berjalan di Vite Server porta `5173`.
   * Backend Express berjalan di porta `3000`.
   * File `client/vite.config.ts` membelokkan seluruh request berawalan `/api` ke backend:
     ```typescript
     server: {
       proxy: {
         '/api': {
           target: 'http://localhost:3000',
           changeOrigin: true
         }
       }
     }
     ```
2. **Lingkungan Produksi Server Fisik (Production Host):**
   * Express menyajikan aset statis build frontend (`client/dist/`) langsung melalui `express.static()`.
   * Akses internet aman difasilitasi oleh `Cloudflare Zero-Trust Tunnel` yang mengarah langsung ke porta `3000` tanpa perlu membuka port publik pada router Wi-Fi Posyandu.

### 5.2 Alur Transaksi & Change Data Capture (CDC)
Setiap mutasi basis data kritis (`INSERT`, `UPDATE`, `DELETE`) dieksekusi di dalam wrapper fungsi `dalamTransaksi(pool, meta, callback)`:
- Menetapkan `SET LOCAL audit.pelaku = 'username'` dan `SET LOCAL audit.sumber = 'tablet/web'`.
- Trigger PostgreSQL merekam otomatis *snapshot* data sebelum dan data sesudah mutasi ke tabel `audit_log`.
- Menjamin konsistensi ACID 100%: jika terjadi kegagalan pencatatan audit, mutasi data medis juga otomatis dibatalkan (*rollback*).

---
*Dokumen ini merupakan spesifikasi kontrak antarmuka pemrograman aplikasi (REST API) resmi untuk sistem SIMPATIK Posyandu KKN Tematik 2026.*
