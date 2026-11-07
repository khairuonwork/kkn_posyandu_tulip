# SIMPATIK Posyandu

**Portal web dan REST API untuk pelayanan balita di Posyandu Tulip RW 18, Kelurahan Citeureup.**

SIMPATIK membantu kader, bidan, petugas KMS, dan admin mengelola sasaran bulanan, memantau pertumbuhan balita, serta menyiapkan laporan Posyandu. Petugas lapangan mencatat pengukuran melalui aplikasi Android. Hasilnya disinkronkan ke portal untuk ditinjau dan digunakan dalam pelaporan.

## Alur pelayanan

1. **Siapkan sasaran.** Admin meninjau dan menerbitkan daftar sasaran bulanan dari berkas Excel. Petugas dapat mencetak kartu balita dengan kode QR dari portal.
2. **Catat kunjungan dan pengukuran.** Petugas menggunakan aplikasi Android untuk memindai kartu, mengelola antrean, dan mencatat hasil ukur.
3. **Tinjau hasil di web.** Petugas Kartu Menuju Sehat (KMS) melihat hasil dan grafik pertumbuhan, lalu mengonfirmasi setelah penjelasan kepada keluarga.
4. **Susun laporan.** Portal menyediakan rekap cakupan penimbangan, status gizi, dan ekspor Excel, termasuk laporan F1 Gizi.

## Isi repo

| Folder | Isi |
| --- | --- |
| [`client/`](client/) | Portal web dengan React, TypeScript, Tailwind CSS, dan Vite. |
| [`server/`](server/) | REST API dengan Node.js, Express, TypeScript, dan PostgreSQL. Server menangani autentikasi, data pengukuran, dan perhitungan status gizi. |
| [`docs/`](docs/README.md) | Panduan penggunaan, arsitektur, kontrak API, dan rujukan perhitungan. |

Aplikasi Android menggunakan REST API portal dan dikembangkan di repositori terpisah.

## Coba demo

Siapkan **Node.js 24 atau lebih baru**, lalu jalankan dari akar repo. Demo menggunakan data contoh dan bisa dijalankan tanpa PostgreSQL.

```sh
npm --prefix client ci
npm --prefix client run demo
```

Buka alamat yang ditampilkan Vite. Panduan pengenalan produk dan peta layar tersedia di [Mulai di sini](docs/mulai-di-sini.md).

## Jalankan untuk pengembangan

Siapkan Node.js 24 atau lebih baru dan Docker yang sedang berjalan. Dari akar repo, pasang dependensi dan salin `server/.env.example` menjadi `server/.env`.

```sh
npm --prefix server ci
npm --prefix client ci
```

Konfigurasi contoh memakai PostgreSQL lokal dari Docker. Jika sudah memiliki PostgreSQL untuk pengembangan, sesuaikan `DATABASE_URL` pada `server/.env` dan lewati perintah `db:up`.

```sh
npm --prefix server run db:up -- --wait
npm --prefix server run migrate
npm --prefix server run seed
```

Buat akun contoh pada database lokal dengan menetapkan `SANDI` minimal delapan karakter. Pilih perintah sesuai terminal.

```bash
SANDI='ganti-kata-sandi-ini' npm --prefix server run seed:contoh
```

```powershell
$env:SANDI = 'ganti-kata-sandi-ini'
npm --prefix server run seed:contoh
Remove-Item Env:SANDI
```

Jalankan API dan web di dua terminal dari akar repo.

| Terminal | Perintah |
| --- | --- |
| API | `npm --prefix server run dev` |
| Web | `npm --prefix client run dev` |

Buka [localhost:5173](http://localhost:5173) dan masuk sebagai `admin` dengan kata sandi akun contoh. Untuk mencoba Android pada jaringan yang sama, ikuti [panduan server LAN](docs/menjalankan-server-lan.md).

## Dokumentasi lanjutan

- [Arsitektur dan serah terima sistem](docs/arsitektur-sistem-handover.md)
- [Kontrak REST API](docs/SIMPATIK_Posyandu_REST_API_Contract.md)
- [Panduan pengelolaan server](docs/panduan-serah-terima-server.md)
- [Sesi pelatihan](docs/sesi-pelatihan.md)
- [Format laporan F1](docs/format-f1.md)
- [Kirim hasil melalui WhatsApp](docs/panduan-kirim-whatsapp.md)
- [Alur kontribusi dan pemeriksaan](docs/git/git-workflow.md)
