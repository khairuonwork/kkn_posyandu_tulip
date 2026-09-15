# Portal Posyandu Tulip

Sistem pencatatan, pemantauan, dan pelaporan status gizi balita Posyandu Tulip RW 18, Kelurahan Citeureup. Dokumentasi produk dan teknis lengkap ada di [docs/](docs/README.md).

## Instalasi

### Prasyarat

- PHP **^8.3**
- Composer
- Node.js 24+ dan npm 11+
- SQLite (default) atau database lain yang didukung Laravel

### Setup lengkap (Laravel + frontend)

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run build
```

Atau jalankan sekaligus dengan:

```bash
composer run setup
```

Jalankan server pengembangan (Laravel + Vite bersamaan):

```bash
composer run dev
```

> Catatan: pada saat dokumen ini ditulis, jalur Laravel penuh belum tervalidasi jalan di semua lingkungan lokal tim — lihat [10-prd-demo-frontend.md](docs/10-prd-demo-frontend.md) untuk kendala versi PHP yang pernah ditemui.

### Mode demo (frontend saja, tanpa backend Laravel)

Untuk keperluan demo UI tanpa perlu PHP/database:

```bash
npm install
npm run demo          # jalankan dev server demo
npm run demo:build    # build statis ke dist-demo/
```
