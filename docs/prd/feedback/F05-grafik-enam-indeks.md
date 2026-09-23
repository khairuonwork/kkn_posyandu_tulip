# F05 — Pengukuran & grafik indeks WHO

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f05-grafik-6-indeks` |
| **Bergantung pada** | — |
| **Terhambat** | [OI-04](../../pertanyaan-terbuka.md) — label LILA/U |
| **Perubahan berarti terakhir** | 21 September 2026 |

## 1. Latar

> "Tambahin grafik: lila, lika, grafik BB, umur (usia) Badan menurut umur, Indeks masa tumbuh, BB/U, TB/U (dasarnya dari who)"

> "Tambah grafik yang menentukan standarisasi status gizi"

Portal sudah menghitung **keenam** indeks dan menyimpan z-score-nya. Yang digambar baru satu: berat badan menurut umur. Lima sisanya hanya muncul sebagai angka di dalam sel tabel.

Akibatnya *stunting* — alasan utama program ini ada — tidak punya satu pun garis di layar, sementara berat badan punya kartu penuh warna. Kader bisa melihat anak yang kurus; ia tidak bisa melihat anak yang pendek.

**Modal untuk ini sudah tersedia seluruhnya, dan sudah sampai ke halamannya:**

| Yang sudah ada | Di mana |
|---|---|
| Tabel LMS WHO 906 baris untuk **keenam** indeks | `server/db/data/who-lms.json` |
| Tabel itu sudah di-*import* dan sudah dilempar ke halaman sebagai `standarLms` | `client/src/data/contoh/store.ts` → `DemoApp.tsx` → `DaftarAnak` |
| `hitungZ()` dan `nilaiPadaZ()` untuk keenam indeks | `client/src/lib/z-score.ts` |
| Mesin SVG kurva: pita ±3 SD, panel 12 bulan, tooltip, ragam teks besar | `client/src/components/kms-chart.tsx` |
| Nilai LILA dan LIKA beserta z-score-nya, di arsip sejak impor | `client/src/data/contoh/posyandu.json` |

Tidak ada data baru yang perlu dicari. Yang kurang hanya penyambungannya.

## 2. Lingkup

**Masuk:**

- Generalisasi `kms-chart.tsx` dari khusus-BB/U menjadi satu indeks berkunci umur mana pun.
- Pemilih indeks di Detail anak: **BB/U · PB/U atau TB/U · IMT/U · LILA/U · LIKA/U**.
- Dua kotak isian baru di editor baris: LILA dan LIKA.
- Kartu z-score di editor bertambah mengikuti isian baru.

**Sengaja tidak masuk:**

- **Kurva BB/TB.** Sumbu datarnya panjang badan dalam cm, bukan umur dalam bulan — bukan varian dari kurva yang sama melainkan grafik lain. BB/TB tetap hadir sebagai kartu angka di Detail anak, tempatnya sekarang. Tidak diminta pula: butir feedback menyebut LILA, LIKA, BB/U, TB/U, dan IMT.
- **Menggeser BB/U dari tampilan awal.** Panel pembuka tetap BB/U. [`rujukan/layar-demo.md` bagian 6.5](../../rujukan/layar-demo.md) memilihnya supaya layar bisa disandingkan langsung dengan KMS di Buku KIA yang dipegang ibu; alasan itu tidak gugur. Lima indeks lain berdiri sebagai tab **di sebelahnya**, untuk Bidan.
- **Hover detail z-score dan zoom interaktif.** Tooltip `<title>` bawaan peramban sudah memuat angkanya, jalan tanpa JS, dan terbaca pembaca layar.

## 3. Perilaku yang diharapkan

Di atas kurva berdiri sederet tombol indeks. Menggantinya mengganti **lima hal sekaligus**: garis SD, judul sumbu tegak, satuannya, skala tegaknya, dan titik-titik riwayatnya. Panel umur yang sedang dibuka dan titik yang sedang disorot **tidak ikut berpindah** — kader sedang menatap bulan tertentu, dan mengembalikannya ke panel 0 setiap ganti indeks adalah pekerjaan yang diulang percuma.

| Indeks | Sumbu tegak | Satuan | Rentang tabel |
|---|---|---|---|
| BB/U | Berat badan | kg | 0–60 bulan |
| PB/U · TB/U | Panjang atau tinggi badan | cm | 0–60 bulan |
| IMT/U | Indeks massa tubuh | kg/m² | 0–60 bulan |
| LILA/U | Lingkar lengan atas | cm | **3–60** bulan, dipakai sejak **6** |
| LIKA/U | Lingkar kepala | cm | 0–60 bulan |

Tiga keadaan yang menentukan mutu fitur ini, dan ketiganya nyata di data:

**LIKA hanya terisi 282 dari 633 baris.** Kurvanya akan banyak bolong. Itu keadaan arsip, bukan kerusakan. Aturan yang sudah dipegang `kms-chart.tsx` berlaku: garis **diputus** setiap jarak antar titik lebih dari satu bulan, tidak ditarik lurus melintasi bulan tanpa pengukuran — garis yang menyambung bulan kosong mengarang data yang tidak pernah diukur.

**LILA/U kosong sebelum 6 bulan.** Tabel WHO mulai di bulan ke-3, tetapi `Indeks::umurMinimum()` menetapkan 6 mengikuti PMK 2/2020 dan praktik Posyandu Tulip. Panel `0–12 bulan` karena itu kosong di separuh kirinya. Kosong dengan keterangan, bukan kosong tanpa penjelasan.

**LILA/U tidak punya label kategori** ([OI-04](../../pertanyaan-terbuka.md)). Kurvanya digambar, z-score-nya ditulis, kolom statusnya dibiarkan kosong. Menebak label untuk rentang gizi akut dari data yang tidak memuat satu pun kasusnya bukan pilihan yang aman.

Untuk keadaan yang benar-benar tidak punya titik sama sekali, kurva tidak dirender; yang tampil satu kalimat yang menyebut indeksnya — mengikuti pola dua kalimat kosong yang sudah ada di layar ini.

## 4. Data & tipe yang berubah

```ts
// client/src/types/posyandu.ts — GarisSd kehilangan asumsi diam-diamnya
export type GarisSd = {
    /** BARU. Dulu tersirat selalu BB_U. */
    indeks: Indeks;
    jk: JenisKelamin;
    umurBulan: number;
    l: number; m: number; s: number;
};
```

```ts
// client/src/components/kms-chart.tsx
type Props = {
    /** BARU. Menentukan sumbu, satuan, skala, dan baris LMS mana yang dipakai. */
    indeks: Indeks;
    // ...selebihnya tetap
};
```

`PatchAnak` bertambah `lilaCm` dan `likaCm`, sederet dengan `bbKg` dan `tinggiCm` yang sudah ada.

**Sumber garis SD berpindah.** `garisSdBbU` di `posyandu.json` (122 baris, BB/U saja) tidak lagi dipakai kurva; gantinya `standarLms` dari `who-lms.json` yang sudah memuat keenamnya dan sudah sampai ke halaman. Satu sumber, dan demo tidak perlu dibangun ulang saat tabelnya diperbarui.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/components/kms-chart.tsx` | Prop `indeks`; sumbu, satuan, dan skala diturunkan darinya; LMS dibaca dari tabel enam indeks. **Perubahan terbesar PR ini.** |
| `client/src/pages/anak/show.tsx` | Pemilih indeks; `detail` titik mengikuti indeks aktif; kalimat keadaan kosong per indeks. |
| `client/src/pages/anak/index.tsx` | Isian LILA dan LIKA; kartu z-score bertambah LILA/U, LIKA/U, IMT/U. |
| `client/src/types/posyandu.ts` | `GarisSd.indeks`; `PatchAnak` bertambah dua field. |
| `client/src/data/contoh/store.ts` | `detailAnak()` memasok tabel enam indeks, bukan `garisSdBbU`. |
| `client/demo/DemoApp.tsx` | Meneruskan keduanya. |

## 6. Keputusan terbuka

**[OI-04](../../pertanyaan-terbuka.md) — label kategori LILA/U.** Tidak menghambat kurvanya; hanya membuat kolom statusnya kosong. Bila Bidan memilih ambang LILA absolut (mis. di bawah 11,5 cm sebagai gizi buruk akut) alih-alih z-score, yang berubah cukup `kategoriDariZ()` — bukan kurvanya.

**Tidak menghambat, perlu dicatat:** IMT/U dan BB/TB memakai ambang PMK yang sama persis dan hampir selalu sependapat. Menampilkan keduanya sekaligus berisiko terbaca sebagai dua vonis terpisah. Karena itu IMT/U berada di tab kurva, BB/TB tetap di kartu angka — satu di satu tempat.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Kelima tab tampil, **BB/U terpilih saat halaman dibuka**.
- [ ] Ganti tab → garis SD, judul sumbu, satuan, dan titik riwayat berganti bersama.
- [ ] Ganti tab **tidak** mengembalikan panel umur ke 0–12, dan tidak menghapus sorotan titik.
- [ ] Anak di bawah 24 bulan menampilkan `PB/U`; 24 bulan ke atas `TB/U`.
- [ ] Anak tanpa data LIKA: kalimat kosong yang menyebut lingkar kepala, **bukan** garis di angka nol.
- [ ] Anak dengan LIKA bolong-bolong: garisnya **terputus** di bulan yang kosong.
- [ ] Panel 0–12 pada LILA/U kosong sebelum bulan ke-6, dengan keterangan sebabnya.
- [ ] LILA/U menampilkan z-score tanpa label kategori.
- [ ] Mengetik LILA di editor mengubah kartu z-score LILA/U saat itu juga.
- [ ] Teks di dalam SVG tetap di atas 15 px pada lebar kolom tersempit ([`rujukan/ui-ux.md`](../../rujukan/ui-ux.md) bagian 8).
