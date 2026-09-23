# F08 — Atribut sosio-ekonomi: desil & Gakin

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f08-desil-gakin` |
| **Bergantung pada** | — |
| **Terhambat** | [OI-17](../../pertanyaan-terbuka.md) — sumber datanya |
| **Perubahan berarti terakhir** | 21 September 2026 |
| **Membuka jalan bagi** | [F09](F09-laporan-f1.md) |

## 1. Latar

> "Output akhir dari data pengukuran akan dirangkum kedalam data F1 dan di breakdown berdasarkan data yang dibutuhkan pemerintah (data dikumpulkan berdasarkan status desil, jenis kelamin, dan kategori Gakin (keluarga miskin), dan Non-Gakin)"

Tiga sumbu pemecah diminta pemerintah. **Satu sudah ada** — jenis kelamin, tercatat sejak impor. Dua sisanya tidak ada di mana pun: tidak di berkas arsip mana pun, tidak di master Juni 2026.

F08 hanya menyediakan kolomnya. Yang memakainya untuk melapor adalah [F09](F09-laporan-f1.md).

## 2. Lingkup

**Masuk:**

- Dua atribut pada anak: **desil** (1–10) dan **kategori kemiskinan** (Gakin / Non-Gakin).
- Isian di editor baris dan form Tambah balita.
- Saringan di bilah atas Data Balita.
- Keadaan **belum tercatat** yang tegas berbeda dari Non-Gakin.

**Sengaja tidak masuk:**

- **Impor massal dari berkas Puskesmas.** Bentuk berkasnya belum diketahui ([OI-17](../../pertanyaan-terbuka.md)). Membangun pembaca untuk berkas yang belum pernah dilihat menghasilkan pekerjaan yang dibuang.
- **Menurunkan Gakin dari desil secara otomatis.** Keduanya terdengar seperti satu hal — desil rendah artinya miskin — tetapi ambangnya kebijakan pemerintah, bisa berubah, dan bukan wewenang Posyandu. Dua kolom terpisah, diisi apa adanya.
- **Menampilkannya di Beranda atau Detail anak.** Ini atribut pelaporan, bukan informasi yang membantu kader merawat anak. Tempatnya di daftar dan di rekap.

## 3. Perilaku yang diharapkan

Dua isian baru di editor baris, dalam satu bagian tersendiri berjudul **Data pelaporan** — terpisah dari Identitas dan dari Pengukuran, karena keduanya bukan tentang anaknya melainkan tentang apa yang diminta pemerintah.

| Isian | Pilihan | Bawaan |
|---|---|---|
| Desil | `Belum tercatat` · `Desil 1` … `Desil 10` | Belum tercatat |
| Kategori | `Belum tercatat` · `Gakin` · `Non-Gakin` | Belum tercatat |

**"Belum tercatat" bukan "Non-Gakin".** Ini pengulangan DR-04 di wilayah baru, dan taruhannya nyata: anak dari keluarga miskin yang datanya belum sempat diisi akan terhitung sebagai keluarga mampu, lalu hilang dari angka yang menentukan bantuan. Kosong harus tetap kosong sampai seseorang benar-benar mengisinya.

Karena itu pilihan bawaannya **Belum tercatat**, bukan Non-Gakin — meski Non-Gakin yang lebih sering benar. Bawaan yang biasanya benar tetap saja tebakan, dan tebakan yang tersimpan tidak bisa dibedakan dari keterangan.

**Saringan mengikuti aturan yang sama.** Menyaring `Gakin` menampilkan hanya anak yang bertanda Gakin. Anak yang belum tercatat tidak masuk ke sana **dan tidak masuk ke Non-Gakin**; ia punya saringannya sendiri, `Belum tercatat`, supaya bisa dikejar.

**Desil dan Gakin tidak pernah muncul sebagai warna atau lencana.** Tidak ada baris merah untuk anak Gakin. Status ekonomi keluarga bukan vonis terhadap anaknya, dan daftar balita yang mewarnai anak menurut kemiskinan orang tuanya adalah layar yang tidak pantas ada. Keduanya tampil sebagai teks biasa di kolom yang muncul hanya saat saringannya menyala.

## 4. Data & tipe yang berubah

```ts
// client/src/types/posyandu.ts — pada type Anak
/** Desil kesejahteraan 1-10. Null berarti belum tercatat, bukan desil tertinggi. */
desil: number | null;
/** Null berarti belum tercatat — tegas berbeda dari 'non_gakin'. */
kategoriMiskin: 'gakin' | 'non_gakin' | null;
```

Tipe `number | null` dipilih ketimbang `1 | 2 | … | 10`: nilai di luar 1–10 yang kelak datang dari berkas Puskesmas harus bisa **masuk lalu ditandai**, bukan ditolak diam-diam di batas tipe. Aturan yang sama sudah dipakai `bbLahirMeragukan`.

**Untuk backend nanti:** kolomnya milik keluarga, bukan anak — dua kakak-adik satu rumah selalu sedesil. Skema sekarang belum punya tabel keluarga; `orang_tua` yang paling mendekati. Bentuk propsnya tetap seperti di atas.

**Data demo.** Tidak ada di arsip, jadi dibangkitkan di `extract-demo-data.py` — sebagian sengaja `null` supaya keadaan "belum tercatat" punya wujud di layar dan punya angka di rekap [F09](F09-laporan-f1.md).

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/types/posyandu.ts` | Dua field pada `Anak`; `PatchAnak` dan `AnakBaru` mengikuti. |
| `client/src/pages/anak/index.tsx` | Bagian **Data pelaporan** di `EditorBaris` dan `FormTambah`; dua saringan; dua kolom bersyarat. |
| `client/demo/DemoApp.tsx` | `terapkanKoreksi()` dan `keBaris()` meneruskan field baru. |
| `client/src/data/contoh/extract-demo-data.py` | Nilai contoh, sebagian `null`. |
| `client/src/data/contoh/posyandu.json` | Dibangkitkan ulang. |

## 6. Keputusan terbuka

**[OI-17](../../pertanyaan-terbuka.md) — dari mana angkanya datang.** Tiga kemungkinan, dan rancangannya berbeda untuk masing-masing: ikut berkas Puskesmas (kolom hanya dibaca), diisi kader (kolom dapat diubah), atau campuran (butuh penanda asal per baris).

**Asumsi kerja:** kemungkinan ketiga — kolom dapat diubah dan menyimpan "belum tercatat" secara eksplisit. Asumsi ini paling longgar: bila ternyata datanya datang dari Puskesmas, isiannya tinggal dikunci. Sebaliknya tidak berlaku — kolom yang terlanjur dirancang hanya-baca tidak bisa dibuka murah.

**Catatan privasi.** Desil dan status kemiskinan adalah data sosio-ekonomi **keluarga**, bukan data kesehatan anak, dan tidak pernah menjadi dasar vonis apa pun terhadap anaknya. [OI-10](../../pertanyaan-terbuka.md) berlaku padanya sama seperti pada NIK. Baris risikonya sudah tercatat di [PRD utama bagian 12](../prd-utama.md).

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Anak baru ditambahkan **tanpa** menyentuh kedua isian → tersimpan `null`, bukan `non_gakin` dan bukan `Desil 10`.
- [ ] Saringan `Gakin` dan `Non-Gakin` **tidak** memuat anak yang belum tercatat.
- [ ] Saringan `Belum tercatat` memuat tepat sisanya; ketiga jumlahnya dijumlahkan sama dengan jumlah seluruh anak.
- [ ] Ada anak di data contoh yang kedua atributnya `null`.
- [ ] Tidak ada warna, lencana, atau ikon apa pun yang menandai anak Gakin di daftar.
- [ ] Kolom desil dan kategori hanya muncul saat saringannya menyala.
