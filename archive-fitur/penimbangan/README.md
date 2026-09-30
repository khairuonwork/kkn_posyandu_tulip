# Arsip fitur Penimbangan web

Fitur input Penimbangan dikeluarkan dari website pada 1 Oktober 2026 karena
pengukuran hanya dilakukan melalui aplikasi Android. Arsip ini menyimpan
komponen React aslinya agar rancangan dapat dipakai kembali tanpa menyalin dari
riwayat Git.

## Isi arsip

- `client/src/pages/layanan/index.tsx` — halaman lengkap: pencarian/pemindaian
  kartu, antrean, skrining identitas, validasi hasil ukur, dan ringkasan.

Arsip berada di luar `client/src`, sehingga tidak ikut diperiksa TypeScript dan
tidak masuk bundel website aktif.

## Cara memulihkan

1. Pindahkan `client/src/pages/layanan/index.tsx` dari folder arsip ini kembali
   ke lokasi yang sama di akar repositori.
2. Tambahkan kembali varian `{ nama: 'layanan' }`, pemetaan `/layanan`, menu
   Penimbangan, dan ikon `Stethoscope` di `client/src/app-shell.tsx`.
3. Tambahkan kembali impor dan cabang render `LayananPosyandu` di
   `client/src/layar.tsx`.
4. Pulihkan tipe `BalitaTimbang` dan selektor `balitaPenimbangan()` dari commit
   sebelum pengarsipan ke `client/src/data/contoh/store.ts`, atau ganti props
   halaman dengan endpoint REST yang berlaku saat fitur dipulihkan.
5. Jalankan `npm run types:check` dan `npm run build` dari folder `client`.

Jangan memulihkan fitur ini ke navigasi web selama kebijakan tetap menetapkan
Android sebagai satu-satunya perangkat input pengukuran.
