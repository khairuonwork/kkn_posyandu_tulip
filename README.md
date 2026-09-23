		

# Portal Posyandu Tulip

Sistem pencatatan, pemantauan, dan pelaporan status gizi balita Posyandu Tulip RW 18, Kelurahan Citeureup.

Dokumentasi lengkap ada di [docs/](docs/README.md).

## Susunan repo

| Direktori                  | Isi                                                                   |
| -------------------------- | --------------------------------------------------------------------- |
| [`server/`](server/)      | REST API dan mesin perhitungan gizi — Node + TypeScript + PostgreSQL |
| [`client/`](client/)      | Antarmuka — React + Tailwind, SPA                                    |
| [`docs/`](docs/README.md) | Dokumentasi produk, teknis, dan keputusan arsitektur                  |

Dua paket berdiri sendiri, masing-masing dengan `package.json` sendiri. Tidak ada `package.json` di akar repo, jadi perintah `npm` selalu dijalankan dari dalam `server/` atau `client/`.

`npm run dev` ada di keduanya dan artinya berbeda: di `server/` menyalakan API, di `client/` menyalakan antarmuka.

Pemilihan stack-nya dijelaskan di [ADR-0006](docs/adr/0006-pindah-ke-express-react-postgres.md).

## Prasyarat

- **Node.js 24+** — kode TypeScript dijalankan langsung tanpa langkah build, memakai pembuangan anotasi tipe bawaan Node 24. Versi 22 tidak cukup.
- **Docker**, dan harus sedang berjalan — hanya untuk PostgreSQL lokal. Kalau sudah punya PostgreSQL sendiri, Docker tidak diperlukan; lihat [Memakai PostgreSQL sendiri](#memakai-postgresql-sendiri-tanpa-docker).

Tidak perlu PHP, Composer, maupun pemasangan global.

## Menjalankan demo

Demo statis memakai data contoh dari berkas JSON dan tidak memanggil backend. Cara tercepat melihat layar-layarnya tanpa menyiapkan basis data.

```bash
cd client && npm install && npm run demo
```

Buka `http://localhost:5173`. Untuk membangun versi statisnya:

```bash
cd client && npm run demo:build
```

Hasilnya di `client/dist-demo/`, dapat dibuka dari static host mana pun.

## Pemasangan

### Sekali saja

**1. Ambil repo dan pasang dependensi.**

```bash
git clone https://github.com/khairuonwork/kkn_posyandu_tulip.git
cd kkn_posyandu_tulip
(cd server && npm install)
(cd client && npm install)
```

Tanda kurung menjaga posisimu tetap di akar repo.

**2. Siapkan basis data.** Docker harus sudah berjalan. Dari akar repo:

```bash
cd server
cp .env.example .env
npm run db:up
npm run migrate
npm run seed
```

`migrate` membuat tabelnya, `seed` mengisi 906 baris standar antropometri WHO. Keduanya aman diulang. Lewati `cp` bila `server/.env` sudah ada dan sudah disesuaikan.

**3. Buat akun pertama.** Masih dari `server/`. Akun dibuat lewat baris perintah karena layar Kelola pengguna hanya terbuka untuk Admin:

```bash
SANDI="ganti-kata-sandi-ini" npm run pengguna:buat -- "Bidan Posyandu Tulip" bidan@posyandutulip.id bidan
```

### Menjalankan

Dua terminal, keduanya dibuka dari akar repo. Docker harus sudah berjalan.

Terminal pertama — API:

```bash
cd server
npm run db:up
npm run dev
```

Terminal kedua — antarmuka:

```bash
cd client
npm run dev
```

Buka `http://localhost:5173` dan masuk dengan akun tadi. Aplikasinya butuh kedua terminal tetap menyala.

`npm run db:up` aman diulang; bila kontainernya sudah menyala ia tidak melakukan apa-apa. Untuk menghentikannya, `npm run db:down` dari `server/`. Data tetap tersimpan di volume Docker.

> Kelima layar masih membaca data contoh yang terbundel. Yang sudah berjalan lewat HTTP baru autentikasi (`/api/masuk`, `/api/keluar`, `/api/saya`); menyambungkan layar ke basis data adalah pekerjaan berikutnya — lihat [rencana kerja](docs/rencana-kerja.md).

### Porta

|            | Porta | Ganti lewat                                 |
| ---------- | ----- | ------------------------------------------- |
| Antarmuka  | 5173  | —                                          |
| API        | 4321  | `PORT` di `server/.env`                 |
| PostgreSQL | 5433  | `docker-compose.yml` dan `DATABASE_URL` |

Keduanya sengaja bukan porta bawaan (3000 dan 5432), yang sering sudah dipakai proses lain. Alasan lengkapnya di [ADR-0006](docs/adr/0006-pindah-ke-express-react-postgres.md).

### Mengelola akun

Untuk kader, sebutkan RT binaannya sebagai argumen keempat. Kader wajib punya RT; bidan dan admin tidak boleh punya.

```bash
cd server && SANDI="ganti-kata-sandi-ini" npm run pengguna:buat -- "Kader RT 01" kader01@posyandutulip.id kader 01
```

Portal tidak mengirim surel, jadi tidak ada layar "lupa kata sandi". Setel ulang dari baris perintah — seluruh sesi akun itu ikut dicabut:

```bash
cd server && SANDI="kata-sandi-baru" npm run pengguna:sandi -- bidan@posyandutulip.id
```

Melihat daftar akun:

```bash
cd server && docker exec server-db-1 psql -U posyandu -d posyandu_tulip -c "SELECT id, nama, email, peran, aktif FROM pengguna ORDER BY id;"
```

### Memakai PostgreSQL sendiri, tanpa Docker

Ganti `DATABASE_URL` di `server/.env` dengan sambunganmu, lalu jalankan `npm run migrate && npm run seed`. Perintah `db:up` dan `docker-compose.yml` boleh diabaikan.

## Pemeriksaan

```bash
(cd server && npm test)
(cd client && npm test)
```

191 pengujian: 142 di `server/`, 49 di `client/`. Di antaranya 2.076 kasus acuan yang membandingkan mesin gizi dengan implementasi sebelumnya — rinciannya di [docs/rujukan/antropometri.md](docs/rujukan/antropometri.md).

Pengujian yang butuh basis data berjalan bila `server/.env` ada, dan dilewati bila tidak, sehingga perintah di atas tetap bekerja tanpa PostgreSQL. CI selalu menyediakannya.

```bash
cd client && npm run types:check && npm run lint:check && npm run format:check
```

Semuanya juga berjalan di CI pada setiap push dan pull request.

## Memperbarui tabel standar WHO

Tabel LMS ada di `server/db/data/who-lms.json` dan ikut di-commit; berkas Excel asalnya di luar repo. Bila standarnya berubah:

```bash
python server/db/data/extract-who-lms.py "<path berkas Excel>"
```

Lalu `npm run seed` lagi dari `server/`. Perlakuan riwayat gizi saat metode perhitungan berganti diatur [ADR-0005](docs/adr/0005-migrasi-metode-zscore.md).
