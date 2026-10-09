# Kontrak REST API — SIMPATIK Posyandu Tulip

| Status | Draf |
|---|---|
| Terakhir diperbarui | 9 Oktober 2026 |
| Backend | Express + PostgreSQL |
| Client | Portal React dan aplikasi tablet |

## 1. Arsitektur dan channel

```text
Portal React ── cookie sesi ──→ /api     ─┐
                                          ├─ Express API ─→ PostgreSQL
Tablet      ── Bearer token ─→ /api/v1 ──┘
```

| Channel | Base path | Auth | Kegunaan |
|---|---|---|---|
| Portal web | `/api` | Cookie `sesi` HTTP-only | Operasi internal Portal |
| Tablet | `/api/v1` | `Authorization: Bearer <token>` | Kerja lapangan dan sinkronisasi |

Client tidak boleh mengakses PostgreSQL secara langsung.

---

## 2. Aturan umum

### Request

- Semua body mutasi menggunakan `Content-Type: application/json`.
- Maksimum body JSON: **4 MB**.
- Format tanggal: `YYYY-MM-DD`.
- Format waktu: ISO 8601, contoh `2026-10-09T08:00:00.000Z`.

### Response list

```json
{
  "items": [],
  "total": 150,
  "halaman": 1,
  "ukuran": 25
}
```

### Response detail

```json
{
  "anak": {}
}
```

Nama pembungkus menyesuaikan resource, misalnya `anak`, `pengguna`, atau `pengukuran`.

### Error

```json
{
  "error": "Pesan error berbahasa Indonesia"
}
```

| Status | Arti |
|---:|---|
| `400` | Body, parameter, atau format data tidak valid |
| `401` | Sesi atau token tidak ada/tidak valid |
| `403` | Tidak memiliki izin atau melewati batas RT binaan |
| `404` | Route atau data tidak ditemukan |
| `415` | Request mutasi tidak memakai JSON |
| `429` | Terlalu banyak percobaan login; sertakan header `Retry-After` |
| `500` | Kesalahan internal tanpa detail sensitif |

---

## 3. Autentikasi dan keamanan

| Hal | Ketentuan |
|---|---|
| Login | Menggunakan `username` dan `kataSandi` |
| Pendaftaran publik | Tidak tersedia; akun dibuat admin |
| Token tablet | Token acak 256-bit; database menyimpan digest SHA-256 |
| Masa token | 12 jam |
| Cookie web | `sesi`, HTTP-only, `SameSite=Lax` |
| Pembatasan login | Maksimum 5 kegagalan per `(username, IP)`, lalu diblokir 15 menit |
| CORS | Diperlukan di `/api/v1/*` jika tablet WebView memakai origin `null` |

---

## 4. Peran dan otorisasi

Urutan peran:

```text
admin → mewarisi izin bidan → mewarisi izin kader
```

Kader hanya dapat membaca/menulis data pada RT binaannya. Pembatasan RT wajib dilakukan pada server dan query database.

| Izin | Peran minimum |
|---|---|
| `lihat-dashboard` | kader |
| `lihat-anak` | kader |
| `lihat-kms` | kader |
| `lihat-rekap` | kader |
| `daftar-anak-lapangan` | kader |
| `catat-pengukuran-lapangan` | kader |
| `selesaikan-sesi-lapangan` | kader |
| `ubah-anak` | bidan |
| `ubah-pengukuran` | bidan |
| `gabung-duplikat` | bidan |
| `selesaikan-konflik-impor` | bidan |
| `unduh-rekap` | bidan |
| `kelola-wilayah-rt` | admin |
| `kelola-periode` | admin |
| `hapus-data` | admin |
| `kelola-akun` | admin |
| `jalankan-impor` | admin |

---

# 5. Endpoint

## 5.1 Autentikasi Portal

Base path: `/api`

| Method | Endpoint | Auth | Response sukses |
|---|---|---|---|
| `POST` | `/masuk` | Publik | `200` + cookie `sesi` + objek pengguna |
| `POST` | `/keluar` | Cookie opsional | `204 No Content` |
| `GET` | `/saya` | Cookie atau Bearer | `200` + objek pengguna |

### `POST /api/masuk`

Request:

```json
{
  "username": "kader.rt01",
  "kataSandi": "kata-sandi"
}
```

Response `200`:

```json
{
  "pengguna": {
    "id": 1,
    "nama": "Siti Aminah",
    "username": "kader.rt01",
    "peran": "kader",
    "rt": "001",
    "aktif": true
  }
}
```

Error: `400`, `401`, `429`, `500`.

### `POST /api/keluar`

Response `204 No Content`.

Endpoint ini selalu berhasil menghapus cookie sesi, walaupun sesi sudah tidak ada.

### `GET /api/saya`

Response `200`:

```json
{
  "pengguna": {
    "id": 1,
    "nama": "Siti Aminah",
    "username": "kader.rt01",
    "peran": "kader",
    "rt": "001",
    "aktif": true
  }
}
```

Error: `401`, `500`.

---

## 5.2 Autentikasi Tablet dan Health Check

Base path: `/api/v1`

| Method | Endpoint | Auth | Response sukses |
|---|---|---|---|
| `POST` | `/masuk` | Publik | `200` + Bearer token + pengguna |
| `POST` | `/keluar` | Bearer | `204 No Content` |
| `GET` | `/kesehatan` | Publik | `200` + status API/database |

### `POST /api/v1/masuk`

Request:

```json
{
  "username": "kader.rt01",
  "kataSandi": "kata-sandi"
}
```

Response `200`:

```json
{
  "token": "base64url-string",
  "kedaluwarsa": "2026-10-05T07:37:00.000Z",
  "pengguna": {
    "id": 1,
    "peran": "kader",
    "rt": "001",
    "aktif": true
  }
}
```

Error: `400`, `401`, `429`, `500`.

### `POST /api/v1/keluar`

Header:

```text
Authorization: Bearer <token>
```

Response `204 No Content`.

Error: `401`, `500`.

### `GET /api/v1/kesehatan`

Response `200`:

```json
{
  "status": "ok",
  "database": "ok",
  "waktuServer": "2026-10-09T08:00:00.000Z"
}
```

Jika koneksi database gagal: `500`.

---

## 5.3 Data Anak

Base path: `/api/v1`

| Method | Endpoint | Izin | Response sukses |
|---|---|---|---|
| `GET` | `/anak` | `lihat-anak` | `200` + list anak berpaginasi |
| `GET` | `/anak/:id` | `lihat-anak` | `200` + detail anak |
| `POST` | `/anak` | `daftar-anak-lapangan` | `201` + anak baru/terbarui |

### `GET /api/v1/anak`

Query parameter:

| Parameter | Default | Keterangan |
|---|---:|---|
| `cari` | - | Kata kunci pencarian |
| `halaman` | `1` | Nomor halaman positif |
| `ukuran` | `25` | Jumlah item tiap halaman |

Response `200`:

```json
{
  "items": [
    {
      "id": 1,
      "nama": "Aisyah"
    }
  ],
  "total": 1,
  "halaman": 1,
  "ukuran": 25
}
```

> Field lengkap `Anak` harus dibekukan sebelum implementasi.

Error: `400`, `401`, `403`, `500`.

### `GET /api/v1/anak/:id`

Response `200`:

```json
{
  "anak": {
    "id": 1,
    "nama": "Aisyah"
  }
}
```

Error: `401`, `403`, `404`, `500`.

### `POST /api/v1/anak`

Mendaftarkan anak baru atau memperbarui data berdasarkan NIK.

Response `201`:

```json
{
  "anak": {
    "id": 1,
    "nama": "Aisyah"
  }
}
```

Error: `400`, `401`, `403`, `415`, `500`.

> **TBD:** field wajib/opsional anak, perilaku NIK kosong, dan aturan jika NIK bertentangan.

---

## 5.4 Pengukuran dan KMS

Base path: `/api/v1`

| Method | Endpoint | Izin | Response sukses |
|---|---|---|---|
| `GET` | `/anak/:id/pengukuran` | `lihat-kms` | `200` + riwayat pengukuran |
| `POST` | `/pengukuran` | `catat-pengukuran-lapangan` | `201` + pengukuran dan hasil gizi |

### `GET /api/v1/anak/:id/pengukuran`

Response `200`:

```json
{
  "items": [
    {
      "id": 1,
      "tanggal": "2026-10-09"
    }
  ],
  "total": 1,
  "halaman": 1,
  "ukuran": 25
}
```

Error: `401`, `403`, `404`, `500`.

### `POST /api/v1/pengukuran`

Response `201`:

```json
{
  "pengukuran": {
    "id": 1,
    "tanggal": "2026-10-09"
  }
}
```

Error: `400`, `401`, `403`, `415`, `500`.

> Perhitungan status gizi wajib dilakukan di server, dalam transaksi, dan dicatat untuk audit.  
> **TBD:** field pengukuran, validasi nilai, periode, serta bentuk hasil gizi.

---

## 5.5 Sinkronisasi Offline Tablet

Base path: `/api/v1`

| Method | Endpoint | Izin | Response sukses |
|---|---|---|---|
| `GET` | `/sinkronisasi` | `lihat-anak` | `200` + paket data cache tablet |

### `GET /api/v1/sinkronisasi`

Response `200`:

```json
{
  "sinkronisasi": {
    "data": []
  }
}
```

Error: `401`, `403`, `500`.

> Endpoint ini digunakan untuk unduhan awal cache tablet.  
> Upload dasar saat online dilakukan melalui `POST /anak` dan `POST /pengukuran`.  
> **TBD:** struktur paket, cursor, batch, masa cache, idempotency key, retry, serta strategi konflik web vs tablet.

---

## 5.6 Dashboard dan Periode

Base path: `/api/v1`

| Method | Endpoint | Izin | Response sukses |
|---|---|---|---|
| `GET` | `/periode` | `lihat-dashboard` | `200` + daftar periode |
| `GET` | `/beranda?periode=YYYY-MM` | `lihat-dashboard` | `200` + statistik dashboard |

### `GET /api/v1/periode`

Response `200`:

```json
{
  "items": [
    {
      "periode": "2026-10"
    }
  ],
  "total": 1,
  "halaman": 1,
  "ukuran": 25
}
```

Error: `401`, `403`, `500`.

### `GET /api/v1/beranda?periode=YYYY-MM`

Response `200`:

```json
{
  "beranda": {
    "periode": "2026-10"
  }
}
```

Error: `400` jika format periode salah, `401`, `403`, `404` jika periode tidak tersedia, `500`.

> **TBD:** daftar statistik dashboard yang wajib dikirim.

---

## 5.7 Pengelolaan Pengguna

Base path: `/api`

Semua endpoint hanya dapat digunakan oleh admin dengan izin `kelola-akun`.

| Method | Endpoint | Response sukses |
|---|---|---|
| `GET` | `/pengguna` | `200` + daftar akun dan RT binaan |
| `POST` | `/pengguna` | `201` + akun baru |
| `PATCH` | `/pengguna/:id` | `200` + akun terbarui |

### `GET /api/pengguna`

Response `200`:

```json
{
  "items": [
    {
      "id": 1,
      "nama": "Siti Aminah",
      "username": "kader.rt01",
      "peran": "kader",
      "aktif": true
    }
  ],
  "total": 1,
  "halaman": 1,
  "ukuran": 25
}
```

### `POST /api/pengguna`

Response `201`:

```json
{
  "pengguna": {
    "id": 2,
    "nama": "Budi",
    "username": "budi.admin",
    "peran": "admin",
    "aktif": true
  }
}
```

### `PATCH /api/pengguna/:id`

Digunakan untuk mengubah profil, peran, RT, status aktif, atau kata sandi.

Response `200`:

```json
{
  "pengguna": {
    "id": 2,
    "nama": "Budi",
    "username": "budi.admin",
    "peran": "admin",
    "aktif": true
  }
}
```

Error umum: `400`, `401`, `403`, `404`, `415`, `500`.

Tidak ada endpoint hapus akun. Akun dinonaktifkan agar jejak audit tetap tersimpan. Nilai kata sandi kosong pada `PATCH` berarti kata sandi tidak diubah.

---

## 5.8 Sasaran, Impor Excel, dan Sesi Lapangan

Base path: `/api/v1`

| Method | Endpoint | Izin | Response sukses |
|---|---|---|---|
| `GET` | `/sasaran?periode=YYYY-MM` | `lihat-anak` | `200` + daftar sasaran |
| `POST` | `/sasaran/pratinjau` | `jalankan-impor` | `200` + hasil validasi file |
| `POST` | `/sasaran/impor` | `jalankan-impor` | `201` + hasil impor |
| `POST` | `/sasaran/tutup-sesi` | `selesaikan-sesi-lapangan` | `200` + sesi ditutup |

### `GET /api/v1/sasaran?periode=YYYY-MM`

Response `200`:

```json
{
  "items": [],
  "total": 0,
  "halaman": 1,
  "ukuran": 25
}
```

### `POST /api/v1/sasaran/pratinjau`

Response `200`:

```json
{
  "pratinjau": {
    "valid": true,
    "totalBaris": 0,
    "kesalahan": []
  }
}
```

### `POST /api/v1/sasaran/impor`

Response `201`:

```json
{
  "impor": {
    "berhasil": true,
    "totalDiproses": 0
  }
}
```

### `POST /api/v1/sasaran/tutup-sesi`

Response `200`:

```json
{
  "sesi": {
    "ditutup": true
  }
}
```

Error umum: `400`, `401`, `403`, `415`, `500`.

> **TBD:** payload penutupan sesi, struktur sasaran, format hasil impor, dan format upload Excel.  
> JSON/base64 hanya boleh digunakan bila file di bawah 4 MB; file lebih besar perlu mekanisme upload terautentikasi atau streaming.

---

## 5.9 Catch-all

Route `/api/*` atau `/api/v1/*` yang tidak cocok:

Response `404`:

```json
{
  "error": "Rute tidak ada"
}
```

---

# 6. Hal yang wajib dibekukan sebelum implementasi

1. Field wajib dan opsional data anak.
2. Aturan NIK kosong, duplikat, dan konflik NIK.
3. Field pengukuran, batas validasi, periode, serta output status gizi.
4. Detail statistik dashboard.
5. Struktur paket sinkronisasi, cursor, batch, cache, retry, dan konflik.
6. Aturan idempotency untuk upload offline.
7. Payload dan response sasaran, impor Excel, serta tutup sesi.
8. Strategi upload file Excel di atas 4 MB.
9. Keputusan apakah Portal React memakai `/api/v1` dengan cookie atau facade `/api` khusus Portal.

---

# 7. Urutan implementasi

1. Akun admin, username, login cookie/Bearer, dan middleware autentikasi.
2. RBAC serta pembatasan data berdasarkan RT pada query/repository.
3. Health check, periode, daftar/detail anak, dan riwayat pengukuran.
4. Pendaftaran anak, pengukuran, perhitungan gizi, dan audit.
5. Sinkronisasi offline dua arah.
6. Dashboard, pengelolaan akun, sasaran, dan impor Excel.
