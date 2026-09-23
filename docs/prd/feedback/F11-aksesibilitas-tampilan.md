# F11 — Mode teks besar & mikro-interaksi

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f11-aksesibilitas` |
| **Bergantung pada** | — |
| **Terhambat** | — |
| **Perubahan berarti terakhir** | 21 September 2026 |

## 1. Latar

> "Pastikan untuk ukuran interface desain aplikasi menyesuaikan dengan pengguna (opsi bisa di aplikasi untuk berbagai menu bisa zoom/tulisan dan plot grafik dibuat dengan ukuran yang besar²)"

> "Untuk Design interface buat animasi yang lebih interaktif"

Kader Posyandu berumur beragam, dan Portal ini dibuka di laptop pinjaman, tablet, dan ponsel. Satu ukuran teks tidak akan pernah benar untuk semuanya.

**Fitur ini sudah diramalkan di dalam kode.** [`app.css`](../../../client/src/app.css) memuat catatan panjang tentang tarik-menarik kerapatan: nilainya sempat diturunkan agar cocok dengan layar pemilik produk (1920 px, penskalaan Windows 150%, zoom peramban 75%), lalu dinaikkan kembali karena pada kerapatan itu tidak satu pun elemen interaktif mencapai 44 px. Catatan itu ditutup dengan kalimatnya sendiri:

> *"Zoom peramban menyelesaikan masalah satu orang tanpa memaksakan ukurannya ke lima puluh kader. Kalau kerapatan lama tetap dibutuhkan, tempatnya preferensi per pengguna, bukan token bersama."*

F11 adalah preferensi per pengguna itu.

## 2. Lingkup

**Masuk:**

- Tiga pilihan ukuran tampilan, disetel dari layar Pengaturan.
- Tersimpan per peramban, bertahan setelah muat ulang.
- Beberapa mikro-interaksi: denyut pada peringatan, transisi antar-langkah, umpan balik simpan.

**Sengaja tidak masuk:**

- **Mengganti zoom peramban.** Ctrl+`+` tetap jalan dan tetap cara tercepat. F11 melengkapinya untuk kader yang tidak tahu pintasan itu ada.
- **Mode kontras tinggi dan mode gelap.** Palet Portal sudah memenuhi syarat kontras ([`rujukan/ui-ux.md`](../../rujukan/ui-ux.md) bagian 2.2); palet kedua berarti setiap warna baru harus diperiksa dua kali selamanya.
- **Pustaka animasi.** `tw-animate-css` sudah terpasang, dan `.baris-masuk` sudah menjadi contoh polanya.
- **Menyimpan preferensi di server.** Ini pilihan alat, bukan identitas — melekat pada perangkat yang dipakai, bukan pada akun.

## 3. Perilaku yang diharapkan

### Ukuran tampilan

Tiga pilihan di Pengaturan, di kartu tersendiri. Menggantinya berlaku **seketika di seluruh layar**, tanpa muat ulang.

| Pilihan | `--spacing` | `--text-base` | Untuk |
|---|---|---|---|
| Ringkas | 3,0 px | 13 px | Layar kecil, kader yang terbiasa |
| **Normal** | 3,5 px | 14 px | Bawaan, nilai sekarang |
| Besar | 4,5 px | 18 px | Layar besar, kader yang butuh teks besar |

**Satu tuas, bukan puluhan.** Seluruh utilitas jarak Tailwind — `p-5`, `gap-7`, `h-13`, `size-13` — diturunkan dari `--spacing`, dan seluruh ukuran teks dari token `--text-*`. Keduanya berdiri di satu blok `@theme` di `app.css`. Mode besar **mendeklarasikan ulang token itu** di bawah `[data-ukuran='besar']`; tidak satu pun berkas `.tsx` disentuh, dan keenam layar ikut membesar bersama.

Jarak ikut membesar bersama teks, bukan hanya teksnya. Catatan di `kms-chart.tsx` sudah membuktikan apa yang terjadi bila tidak: *"tiga kali berturut-turut angka ini dinaikkan tanpa pinggirannya ikut ditinjau, dan tiga kali pula teksnya bertabrakan."*

**Kurva KMS sudah siap.** Ia punya ragam `kompak` dengan ukuran teks tersendiri (`KOMPAK_TIK`) yang seluruh pinggirannya diturunkan dari satu angka, tepat supaya teks di dalam SVG tidak jatuh di bawah 15 px. Mode besar menyambung ke sana, bukan membuat ragam ketiga.

**Sasaran sentuh tidak pernah menyusut di bawah 44 px.** Mode Ringkas menurunkan kerapatan, tetapi `min-h-13` pada tombol dan kotak isian tetap harus lolos ambang bagian 2.5. Bila 3,0 px melanggarnya, yang turun angkanya — bukan ambangnya.

### Mikro-interaksi

| Tempat | Gerak |
|---|---|
| Peringatan "Ulangi pengukuran" ([F04](F04-validasi-kewajaran-ukur.md)) | Denyut dua kali lalu berhenti |
| Kartu skrining ([F07](F07-skrining-pendaftaran.md)) | Masuk dari atas |
| Ganti tab indeks ([F05](F05-grafik-enam-indeks.md)) | Kurva silang-pudar, bukan berkedip |
| Simpan perubahan | Toast, memakai `sonner` yang sudah terpasang |

**Denyut berhenti sendiri.** Peringatan yang berdenyut tanpa henti selama kader mengetik berubah dari perhatian menjadi gangguan, dan yang terjadi berikutnya adalah kader belajar mengabaikannya.

**`prefers-reduced-motion` dihormati.** Sudah ada di `app.css` untuk `.baris-masuk`; setiap gerak baru masuk ke blok yang sama. Gerak adalah hiasan; isinya tidak pernah bergantung padanya.

## 4. Data & tipe yang berubah

```ts
// client/src/hooks/use-ukuran.ts
export type Ukuran = 'ringkas' | 'normal' | 'besar';
```

Polanya: nilai disimpan di `localStorage`, dipasang sebagai atribut pada elemen akar, dan dibaca sebelum cat pertama supaya tidak ada kedipan ukuran saat halaman dibuka.

> **Catatan 21 September 2026.** PRD ini semula merujuk `use-appearance.tsx` bawaan starter kit sebagai contoh. Berkas itu **ikut terhapus** bersama Laravel ([ADR-0006](../../adr/0006-pindah-ke-express-react-postgres.md)) dan tidak punya pengganti — polanya perlu ditulis dari nol. Isinya masih dapat dibaca dari riwayat git bila diperlukan.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/app.css` | Token di bawah `[data-ukuran='ringkas']` dan `[data-ukuran='besar']`; keyframes denyut. |
| `client/src/hooks/use-ukuran.ts` | **Baru.** Pola di bagian 3; tidak ada berkas contoh yang tersisa untuk ditiru. |
| `client/src/pages/pengaturan/index.tsx` | Kartu **Ukuran tampilan**. |
| `client/src/components/kms-chart.tsx` | Ragam besar menyambung ke `KOMPAK_TIK`. |
| `client/demo/DemoApp.tsx` | Memasang atribut pada elemen akar. |
| `client/demo/index.html` | Skrip kecil pembaca preferensi sebelum cat pertama. |

## 6. Keputusan terbuka

Tidak ada.

Nilai pada tabel bagian 3 adalah titik awal, bukan hasil pengukuran. Nilai akhirnya datang dari mencoba di layar sungguhan — persis cara nilai `--spacing` yang sekarang ditetapkan, lengkap dengan dua kali salah sebelum benar.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Memilih **Besar** membesarkan keenam layar **seketika**, tanpa muat ulang.
- [ ] Pilihannya bertahan setelah muat ulang.
- [ ] Tidak ada kedipan ukuran saat halaman pertama kali dibuka.
- [ ] Pada mode Besar di lebar **375 px**: tidak ada teks terpotong dan **tidak ada gulir mendatar** pada badan halaman.
- [ ] Pada mode Besar, teks di dalam kurva KMS tetap terbaca dan tidak saling menimpa.
- [ ] Pada mode Ringkas, tombol dan kotak isian **tetap di atas 44 px**.
- [ ] Tabel 101 baris tetap punya kepala kolom yang menempel di ketiga mode.
- [ ] Dengan `prefers-reduced-motion: reduce`, tidak ada satu pun gerak — dan seluruh isi tetap terbaca.
- [ ] Denyut peringatan berhenti sendiri, tidak berulang selamanya.
