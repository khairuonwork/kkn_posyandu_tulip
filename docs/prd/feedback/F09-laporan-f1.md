# F09 — Rekap F1 & ekspor laporan

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f09-laporan-f1` |
| **Bergantung pada** | [F06](F06-status-ntob.md) huruf N/T/O/B, [F08](F08-desil-gakin.md) desil & Gakin |
| **Terhambat** | [OI-07](../../pertanyaan-terbuka.md) — blangko F1 resmi |
| **Perubahan berarti terakhir** | 21 September 2026 |
| **Membuka jalan bagi** | [F10](F10-lembar-cetak.md) |

## 1. Latar

> "Output akhir dari data pengukuran akan dirangkum kedalam data F1 dan di breakdown berdasarkan data yang dibutuhkan pemerintah (data dikumpulkan berdasarkan status desil, jenis kelamin, dan kategori Gakin (keluarga miskin), dan Non-Gakin)"

> "Laporan bisa di export sesuai Format kita yg biasa di lakukan"

Ini muara seluruh putaran. Kader menimbang, Portal menghitung, lalu **angkanya harus berpindah ke lembar yang dikirim ke Puskesmas**. Selama perpindahan itu masih manual, seluruh ketelitian di layar berhenti di layar.

Dua hal yang perlu diluruskan sejak awal:

**Tombol unduhnya pernah ada, lalu dicabut.** [`laporan/index.tsx`](../../../client/src/pages/laporan/index.tsx) mencatatnya: *"Tombol Unduh CSV dan Cetak A4 dicabut atas permintaan pemilik produk… `csvLaporan()` di client/src/data/contoh/store.ts sengaja dibiarkan utuh supaya mengembalikan tombolnya cukup satu blok JSX."* Penyusun CSV-nya masih lengkap, enam pasang kolom z-score dan semua. Mengembalikannya bukan membangun ulang.

**Rekap yang ada sekarang rancangan, bukan salinan blangko.** [OI-07](../../pertanyaan-terbuka.md) sudah menyatakannya, dan desainer menuliskannya di atas artboard Laporan: *"Rekap yang saya rancang dari model data Anda, bukan format baku."*

## 2. Lingkup

**Masuk:**

- Kembalikan tombol **Unduh CSV**.
- Tampilan **Rekap F1**: S/K/D/N/T/O/B dipecah menurut jenis kelamin, kategori Gakin, dan desil.
- Ekspor rekap F1 sebagai CSV, terpisah dari CSV rinci yang sudah ada.

**Sengaja tidak masuk:**

- **Menyalin blangko F1 resmi kolom per kolom.** Blangkonya belum ada, dan `F1 revised format proposal.xlsx` di arsip menunjukkan formatnya sedang direvisi. Membangun ekspor terhadap format yang masih berubah menghasilkan pekerjaan yang segera usang.
- **Berkas `.xlsx`.** CSV bertitik koma sudah terbuka benar di Excel berbahasa Indonesia — yang dipakai pemilik program. Pustaka penulis Excel menambah dependensi demi format yang sama isinya.
- **Buku 7.** Disebut bersama F1 di [OI-07](../../pertanyaan-terbuka.md), tetapi tidak disebut dalam feedback putaran ini.

## 3. Perilaku yang diharapkan

Tampilan ketiga di kartu rekap Laporan, sederet dengan **SKDN** dan **Enam bulan** yang sudah ada — pengalih isi, bukan kartu baru. Alasannya sudah tertulis di layar itu: pada 1280 px kartu rekap hanya menyisakan 89 px kosong, jadi tabel tambahan tidak muat.

Tujuh indikator, mengikuti istilah yang sudah dipakai Portal dan Puskesmas:

| Kode | Arti | Dari |
|---|---|---|
| **S** | Sasaran terdaftar | cacah anak berstatus aktif pada periode |
| **K** | Punya KMS / Buku KIA | `anak.bukuKia` — **sudah ada di data sejak impor, belum pernah dipakai di satu layar pun** |
| **D** | Hadir dan ditimbang | `statusKehadiran === 'hadir'` |
| **N** · **T** | Naik · tidak naik | arsip ([F06](F06-status-ntob.md), DR-08) |
| **O** · **B** | Absen lalu hadir · baru | terhitung ([F06](F06-status-ntob.md), DR-11) |

Dipecah tiga arah: **jenis kelamin** (L/P), **kategori** (Gakin / Non-Gakin / belum tercatat), dan **desil** (1–10 / belum tercatat).

Aturan yang menjaga angkanya tetap jujur:

**Totalnya harus cocok dengan rekap per RT yang sudah ada.** Dua tabel di satu layar yang tidak berjumlah sama adalah alasan untuk tidak mempercayai keduanya. Ini kriteria terima nomor satu, bukan kehati-hatian tambahan.

**"Belum tercatat" mendapat barisnya sendiri, dan tidak pernah dilebur.** Bila 30 anak belum punya desil, itu 30 baris yang harus terlihat — bukan disembunyikan ke Desil 10 atau dihilangkan dari tabel. Rekap yang jumlahnya tidak sampai ke S adalah rekap yang berbohong tentang cakupannya sendiri.

**Tab Tahunan menjumlahkan enam periode, bukan mencacah anak.** Peringatan yang sudah dipasang di kartu KPI — *"jumlah 6 bulan, bukan jumlah balita"* — berlaku juga di sini.

Dua tombol unduh, dan keduanya dinamai menurut isinya, bukan menurut formatnya:

| Tombol | Isi |
|---|---|
| **Unduh data rinci** | Satu baris per anak, enam pasang kolom z-score. `csvLaporan()` yang sudah ada, tanpa perubahan |
| **Unduh rekap F1** | Satu baris per kelompok, tujuh indikator. Baru |

## 4. Data & tipe yang berubah

Tidak ada field baru; seluruhnya datang dari [F06](F06-status-ntob.md) dan [F08](F08-desil-gakin.md).

```ts
// client/src/data/contoh/store.ts
export type BarisF1 = {
    /** 'L' | 'P' | 'gakin' | 'non_gakin' | 'belum' | 'desil-3' | … */
    kelompok: string;
    label: string;
    s: number; k: number; d: number;
    n: number; t: number; o: number; b: number;
};

export function rekapF1(
    periodeIds: string[],
    rt: string | null,
): { jenisKelamin: BarisF1[]; kategori: BarisF1[]; desil: BarisF1[]; total: BarisF1 };

export function csvRekapF1(periodeIds: string[], rt: string | null): string;
```

`csvRekapF1()` memakai ulang aturan penulisan `csvLaporan()` — pemisah titik koma, koma sebagai desimal, sel kosong bukan nol, dan BOM UTF-8 supaya Excel berbahasa Indonesia membacanya benar.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/data/contoh/store.ts` | `rekapF1()` dan `csvRekapF1()`; `hitungNtob()` memakai [F06](F06-status-ntob.md). |
| `client/test/rekap.test.ts` | **Baru.** Rekonsiliasi: total F1 = total per RT; `O+B ≤ D`; jumlah tiap pecahan = S. |
| `client/src/pages/laporan/index.tsx` | Tampilan ketiga; dua tombol unduh; keterangan selisih arsip dari [F06](F06-status-ntob.md). |
| `client/demo/DemoApp.tsx` | Memasok `rekapF1()` ke halaman. |

## 6. Keputusan terbuka

**[OI-07](../../pertanyaan-terbuka.md) — struktur blangko F1 resmi.** Bentuk di bagian 3 disusun dari breakdown yang disebut pemilik program, bukan disalin dari blangko. Bila blangkonya datang, yang perlu berubah hanya susunan kolom di `csvRekapF1()` — angkanya sudah benar, dan `store.test.ts` yang menjaga agar tetap begitu setelah kolomnya digeser.

**Bergantung pada [OI-17](../../pertanyaan-terbuka.md).** Selama desil dan Gakin belum diketahui sumbernya, sebagian besar baris akan jatuh ke "belum tercatat". Itu **bukan kegagalan fitur** — justru itu gunanya: angka yang besar di baris itu adalah ukuran seberapa jauh data sasaran masih harus dikejar.

**Terikat DR-08 lewat [F06](F06-status-ntob.md).** Kolom N dan T pada rekap F1 memuat nilai arsip, bukan hitungan. Kolom O dan B terhitung. Beda asal ini disebutkan di layar, tidak dibiarkan ditebak.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] **Total S, D, N, T, O, B pada rekap F1 sama persis** dengan total rekap per RT pada tampilan SKDN, di setiap periode.
- [ ] Jumlah L + P = S. Jumlah Gakin + Non-Gakin + belum tercatat = S. Jumlah seluruh desil + belum tercatat = S.
- [ ] Baris **belum tercatat** muncul dengan angkanya sendiri, tidak dilebur ke mana pun.
- [ ] **K** terisi dari `bukuKia` dan tidak pernah melampaui S.
- [ ] Tombol **Unduh data rinci** menghasilkan CSV yang sama persis dengan keluaran `csvLaporan()` sebelum tombolnya dicabut.
- [ ] Kedua CSV terbuka benar di Excel berbahasa Indonesia: kolom terpisah, desimal berkoma, huruf beraksen utuh.
- [ ] Sel yang tidak dapat dihitung kosong, **tidak pernah** `0`.
- [ ] Tab Tahunan menyebut angkanya jumlah enam bulan, bukan cacah balita.
- [ ] `store.test.ts` lulus dijalankan.
