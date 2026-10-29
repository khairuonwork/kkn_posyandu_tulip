# REST API Portal — v1

Kontrak HTTP aktual untuk website dan aplikasi Android. Keduanya memanggil API SIMPATIK; hanya server yang mengakses PostgreSQL. Implementasi route ada di `server/src/http/*-controller.ts`, izin di `server/src/auth/peran.ts`, dan peta operasional di [Panduan serah-terima server](../panduan-serah-terima-server.md).

## Aturan umum

- API tablet berada di `/api/v1`; sesi web dan manajemen akun menggunakan `/api`.
- Android memakai `Authorization: Bearer <token>`; website memakai cookie sesi `httpOnly`.
- Mutasi mengirim `Content-Type: application/json`. Jangan mengirim kredensial database dari klien.
- Pemeriksaan izin dilakukan pada server. `401` berarti sesi tidak ada/kedaluwarsa, `403` berarti akun tidak memiliki izin, `400` berarti input tidak valid, `404` rute atau record tidak ditemukan, dan `500` galat internal generik.
- Jangan mengandalkan isi stack trace atau error PostgreSQL dari respons; detail teknis harus tinggal di log server yang disanitasi.

## Status, pengguna, laporan

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `GET` | `/api/v1/kesehatan` | jaringan server | Health check API dan koneksi PostgreSQL; tidak mengembalikan secret |
| `POST` | `/api/masuk` | publik | Login website, cookie sesi |
| `POST` | `/api/keluar` | sesi web | Keluar dari website |
| `GET` | `/api/saya` | sesi web | Identitas akun aktif |
| `POST` | `/api/v1/masuk` | publik | Login Android, token Bearer |
| `POST` | `/api/v1/keluar` | sesi aktif | Cabut sesi/token Android |
| `GET` | `/api/pengguna` | admin | Daftar akun |
| `POST` | `/api/pengguna` | admin | Buat akun |
| `PATCH` | `/api/pengguna/:id` | admin | Ubah akun/peran/status |
| `GET` | `/api/v1/periode` | kader, bidan, admin, KMS | Periode yang tersedia |
| `GET` | `/api/v1/beranda?periode=YYYY-MM&rt=01` | kader, bidan, admin, KMS | Ringkasan beranda, filter RT opsional, sebaran status gizi (BB/U, TB/U, BB/TB), tren gizi, dan perbandingan Real D/S kehadiran hari H |
| `PUT` | `/api/v1/beranda/hari-h` | catat-cakupan, admin | Simpan konfirmasi kehadiran fisik hari H per RT untuk perhitungan Real D/S |
| `GET` | `/api/v1/laporan?periode=YYYY-MM` | lihat-rekap | Rekap pengukuran, status N/T dan historis 2T+ |
| `GET` | `/api/v1/laporan/unduh?periode=YYYY-MM` | unduh-rekap | Workbook Excel laporan |

## Anak dan alur layanan

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `GET` | `/api/v1/anak?periode=YYYY-MM` | lihat-anak | Cari/daftar anak; parameter periode mengembalikan `aktifPeriode` dan batas pengukuran `tanggalAcuan` |
| `GET` | `/api/v1/anak/:id?periode=YYYY-MM` | lihat-anak | Profil anak, status KB ibu, kelompok Desil (G/NG), dan hasil penilaian |
| `PATCH` | `/api/v1/anak/:id` | ubah-anak | Ubah profil anak, termasuk `kbIbu` (boolean/null) dan `desil` per `periodeId` |
| `GET` | `/api/v1/anak/:id/pendampingan-kia` | lihat-anak | Panduan Buku KIA 2024 sesuai usia dan riwayat diskusi |
| `POST` | `/api/v1/anak/:id/pendampingan-kia` | catat-survei-kia | Simpan atau perbarui catatan diskusi tumbuh kembang |
| `GET` | `/api/v1/antrean?periodeId=&tanggal=` | lihat-anak | Antrean layanan |
| `POST` | `/api/v1/antrean` | catat-pengukuran-lapangan | Check-in sasaran dari QR |
| `PATCH` | `/api/v1/antrean/:id` | catat-pengukuran-lapangan | Panggil, mulai, atau lanjutkan tahap |
| `POST` | `/api/v1/antrean/:id/konfirmasi-kms` | konfirmasi-kms | Selesaikan tahap penjelasan KMS |
| `GET` | `/api/v1/sasaran` | lihat-anak | Daftar sasaran dan ringkasan |
| `POST` | `/api/v1/sasaran/pratinjau` | admin | Validasi/pratinjau workbook sebelum impor |
| `POST` | `/api/v1/sasaran/impor` | admin | Terbitkan sasaran periode |
| `POST` | `/api/v1/sasaran/tutup-sesi` | admin | Tutup sesi dan tandai sasaran yang belum hadir |
| `POST` | `/api/v1/pengukuran` | catat-pengukuran-lapangan | Kirim hasil ukur dari tablet; transaksi atomik (ukur + sasaran + gizi) dengan advisory lock anak/periode dan idempotensi relai identik |
| `GET` | `/api/v1/sinkronisasi` | catat-pengukuran-lapangan | Unduh data sinkronisasi tablet; penggabungan in-flight query pooling untuk beban serentak |

Peran rinci dapat berbeda menurut aksi; controller merujuk ke matriks otorisasi, bukan daftar peran yang diketik ulang. KMS bersifat khusus dan tidak mewarisi hak kader.

## Bentuk dan perubahan kontrak

Controller saat ini mengembalikan JSON yang disesuaikan per resource, dengan error `{ "galat": "pesan" }`. Sebelum menambah field, periksa konsumennya di `client/src/lib/` dan aplikasi Android; perubahan yang memengaruhi payload QR, autentikasi, status antrean, atau sinkronisasi perlu kompatibilitas lintas klien.

Uji kontrak dan otorisasi ditempatkan di `server/test/`. Setiap perubahan endpoint harus menambah/memperbarui uji tersebut, `types:check`, dan catatan dokumen ini. Untuk deployment, lakukan health check serta smoke test baca/tulis di QA sebelum mengarahkan pengguna ke versi baru.
