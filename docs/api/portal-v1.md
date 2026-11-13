# REST API Portal — Ringkasan Cepat v1

> [!IMPORTANT]
> Dokumen ini adalah ringkasan cepat endpoint HTTP. Spesifikasi kontrak teknis lengkap, skema payload JSON, kode status, dan alur request CDC tersedia di dokumen resmi: **[Spesifikasi Kontrak REST API](../SIMPATIK_Posyandu_REST_API_Contract.md)**.

Kontrak HTTP aktual untuk website dan aplikasi Android. Keduanya memanggil API SIMPATIK; hanya server yang mengakses PostgreSQL. Implementasi route ada di `server/src/http/*-controller.ts`, izin di `server/src/auth/peran.ts`, dan peta operasional di [Panduan serah-terima server](../panduan-serah-terima-server.md).

## Aturan umum

- API tablet berada di `/api/v1`; sesi web dan manajemen akun menggunakan `/api`.
- Android memakai `Authorization: Bearer <token>`; website memakai cookie sesi `httpOnly`.
- Mutasi mengirim `Content-Type: application/json`. Ukuran maksimum body parser adalah **4 MB**.
- Pemeriksaan izin dilakukan pada server. `401` berarti sesi tidak ada/kedaluwarsa, `403` berarti akun tidak memiliki izin, `400` berarti input tidak valid, `404` rute atau record tidak ditemukan, dan `500` galat internal generik.
- Respons galat menggunakan format seragam: `{ "galat": "pesan kesalahan" }`.

---

## 1. Status, Autentikasi & Pengguna

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `GET` | `/api/v1/kesehatan` | publik | Health check API dan koneksi PostgreSQL |
| `POST` | `/api/masuk` | publik | Login website, memasang cookie sesi `httpOnly` |
| `POST` | `/api/keluar` | publik | Keluar dari website dan menghapus cookie |
| `GET` | `/api/saya` | sesi web | Identitas akun aktif untuk sidebar |
| `POST` | `/api/v1/masuk` | publik | Login Android, mengembalikan token Bearer |
| `POST` | `/api/v1/keluar` | wajibMasuk | Cabut sesi/token Android di basis data |
| `GET` | `/api/pengguna` | kelola-akun | Daftar akun pengguna dan RT binaan |
| `POST` | `/api/pengguna` | kelola-akun | Buat akun kader baru (scrypt hash) |
| `PATCH` | `/api/pengguna/:id` | kelola-akun | Ubah status akun/peran/reset sandi (Last Admin Guard) |

---

## 2. Telemetri & Komunikasi Lapangan

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `POST` | `/api/v1/heartbeat` | wajibMasuk | Kirim telemetri tablet (baterai, antrean tertahan) |
| `GET` | `/api/v1/perangkat-terhubung` | lihat-anak | Daftar status tablet online/offline di Posyandu |
| `GET` | `/api/v1/cluster-context` | wajibMasuk | Kunci enkripsi sinkronisasi mesh lokal antar-tablet |

---

## 3. Anak, Pengukuran & Alur Layanan

Endpoint pemanggilan per meja dan ruang tunggu, termasuk penanda panggilan, dijelaskan pada [kontrak API bagian 3.4](../SIMPATIK_Posyandu_REST_API_Contract.md#34-antrean--pemeriksaan-kms-real-time).

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `GET` | `/api/v1/anak` | lihat-anak | Cari/daftar anak (filter RT, cari, periode) |
| `POST` | `/api/v1/anak` | daftar-anak-lapangan | Pendaftaran anak baru di lapangan / web |
| `GET` | `/api/v1/anak/:id` | lihat-anak | Profil lengkap anak, riwayat ukur & kurva WHO |
| `PATCH` | `/api/v1/anak/:id` | ubah-anak | Ubah profil demografi anak |
| `GET` | `/api/v1/anak/:id/pengukuran` | lihat-kms | Riwayat pengukuran kronologis anak |
| `POST` | `/api/v1/pengukuran` | catat-pengukuran-lapangan | Kirim hasil ukur; hitung z-score WHO & antrean KMS |
| `GET` | `/api/v1/sinkronisasi` | lihat-anak | Unduh master anak dan standar untuk cache tablet |
| `GET` | `/api/v1/anak/:id/pendampingan-kia` | lihat-anak | Panduan Buku KIA 2024 sesuai usia |
| `POST` | `/api/v1/anak/:id/pendampingan-kia` | catat-survei-kia | Simpan catatan evaluasi buku KIA |

### Data keluarga pada profil anak

Respons profil menyertakan `jenisKb: string | null` dan `desilKelompok: '6-10' | null`.
Pada PATCH profil, kedua field opsional. `jenisKb` yang tidak dikirim mempertahankan nilainya; desil dan kelompoknya diperbarui bersama saat salah satu field ekonomi dikirim.

- `jenisKb`: teks bebas maksimal 100 karakter setelah spasi dirapikan. String kosong atau `null` mengosongkan nilai. Jika terisi, `namaOrtu` wajib diisi. Field `kbIbu` lama tetap tersedia untuk kompatibilitas dan tidak digunakan untuk menebak jenis KB.
- Pilihan kelompok baru dikirim sebagai `desil: null, desilKelompok: '6-10', periodeId: 'YYYY-MM'`. Kategori ekonomi disimpan sebagai NG.
- Pilihan angka dikirim sebagai `desil: 1` sampai `5`, `desilKelompok: null`, dan `periodeId`. Angka 6–10 tetap diterima untuk kompatibilitas data lama; antarmuka menampilkannya sebagai Desil 6–10 tanpa menulis ulang angkanya.
- Untuk mengosongkan desil, kirim `desil: null, desilKelompok: null` beserta `periodeId`. Field ekonomi yang tidak dikirim tidak mengubah riwayat periode.

Migrasi `028_profil_keluarga.sql` menambahkan kolom pada tabel utama; `029_profil_keluarga_pelatihan.sql` menyesuaikan salinan tabel sesi pelatihan yang sudah aktif. Jalankan migrasi sebelum versi server baru.

---

## 4. Antrean & Pemeriksaan KMS Real-Time

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `GET` | `/api/v1/antrean` | lihat-anak | Daftar antrean hari ini (polling real-time KMS) |
| `POST` | `/api/v1/antrean` | catat-pengukuran-lapangan | Check-in antrean saat pindai kartu QR |
| `PATCH` | `/api/v1/antrean/:id` | catat-pengukuran-lapangan | Ubah status antrean (waiting, serving, dll.) |
| `POST` | `/api/v1/antrean/:id/konfirmasi-kms` | petugas KMS atau superadmin | Selesaikan pemeriksaan KMS (pindah ke done) |
| `POST` | `/api/v1/antrean/konfirmasi-semua-kms` | petugas KMS atau superadmin | Konfirmasi massal antrean KMS |

---

## 5. Lembar Hasil Digital Orang Tua

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `POST` | `/api/v1/lembar` | lihat-kms | Buat tautan enkripsi hasil ukur untuk WhatsApp |
| `GET` | `/api/v1/lembar/:token` | publik | Layar baca KMS digital orang tua (no-cache) |

---

## 6. Sasaran Layanan & Impor Excel

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `GET` | `/api/v1/sasaran/periode` | lihat-anak | Daftar periode kegiatan yang tercatat |
| `GET` | `/api/v1/sasaran` | lihat-anak | Daftar sasaran periode aktif beserta status |
| `GET` | `/api/v1/sasaran/calon-anak` | lihat-anak | Cari balita arsip untuk dimasukkan sasaran |
| `POST` | `/api/v1/sasaran/manual` | jalankan-impor | Tambah anak manual ke sasaran bulanan |
| `PATCH` | `/api/v1/sasaran/:id` | jalankan-impor | Edit catatan / status sasaran |
| `POST` | `/api/v1/sasaran/pratinjau` | jalankan-impor | Pindai & parsing workbook Excel .xlsx |
| `POST` | `/api/v1/sasaran/impor` | jalankan-impor | Terbitkan sasaran periode dari sheet Excel |
| `POST` | `/api/v1/sasaran/tutup-sesi` | selesaikan-sesi-lapangan | Bekukan antrean dan tandai sasaran selesai |
| `GET` | `/api/v1/sasaran/reset-hari-ini` | hapus-data | Pratinjau jumlah pengukuran/antrean hari ini |
| `POST` | `/api/v1/sasaran/reset-hari-ini` | hapus-data | Tindakan darurat hapus data hari ini |

---

## 7. Laporan SKDN, Ekspor F1 & Dasbor

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `GET` | `/api/v1/beranda` | lihat-dashboard | Statistik dasbor (D/S, sebaran gizi, tren RT) |
| `GET` | `/api/v1/periode` | lihat-dashboard | Daftar periode untuk selektor dasbor |
| `PUT` | `/api/v1/beranda/hari-h` | ubah-pengukuran | Atur tanggal hari H kegiatan posyandu |
| `GET` | `/api/v1/laporan` | lihat-rekap | Rekapitulasi SKDN, tabel RT, dan vonis gizi |
| `GET` | `/api/v1/laporan/tumbuh-kembang?periode=YYYY-MM` | lihat-rekap | Survei perkembangan bulanan dengan sedikitnya satu jawaban Tidak, dikelompokkan per balita |
| `GET` | `/api/v1/laporan/unduh` | unduh-rekap | Unduh spreadsheet rekapitulasi internal (.xlsx) |
| `GET` | `/api/v1/laporan/f1/unduh` | unduh-rekap | Unduh Format F1 resmi Puskesmas (.xlsx) |

Laporan tumbuh kembang mengembalikan `{ periode, balita }`. Setiap balita memuat `anakId`, `nama`, dan `survei`; setiap survei memuat `surveiId`, `tanggal`, `umurBulan`, `kelompokId`, `kelompokLabel`, dan `kemampuan`. Setiap kemampuan memuat `pertanyaanId`, `pertanyaan` asli, dan `keterangan` jawaban Tidak.

Periode mengikuti tanggal survei, termasuk survei yang belum selesai dibahas. Semua survei perkembangan dengan jawaban Tidak pada bulan itu ditampilkan; survei seluruhnya Ya, belum diamati, dan checklist perawatan bayi baru lahir dikecualikan. Usia dan pertanyaan berasal dari snapshot tersimpan. Daftar kosong dikembalikan sebagai `balita: []`. Cakupan akses dan isolasi pelatihan mengikuti laporan lain. Endpoint ini hanya membaca data dan tidak menyediakan ekspor.

---

## 8. Mode Pelatihan (Dual-Schema Sandbox)

| Method | Path | Akses | Kegunaan |
|---|---|---|---|
| `GET` | `/api/v1/pelatihan/status` | wajibMasuk | Periksa apakah mode latihan sedang aktif |
| `GET` | `/api/v1/pelatihan` | Superadmin | Ambil opsi periode sumber untuk simulasi |
| `POST` | `/api/v1/pelatihan/mulai` | Superadmin | Buat schema `latihan_<uuid>` & duplikasi data |
| `POST` | `/api/v1/pelatihan/akhiri` | Superadmin | Drop schema latihan & kembalikan ke public |
