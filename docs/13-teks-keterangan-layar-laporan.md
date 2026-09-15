# Teks keterangan dan tombol yang dicabut dari layar Laporan

Berkas ini menampung kalimat keterangan dan dua tombol aksi yang sebelumnya ada
di `resources/js/pages/laporan/index.tsx`, lalu dicabut atas permintaan pemilik
produk supaya seluruh laporan muat dalam satu layar.

Sama seperti `docs/12-teks-keterangan-layar-detail.md`: **ini penampungan,
bukan keputusan akhir.** Kolom "Risiko setelah dicabut" mencatat apa yang
hilang, supaya bisa ditinjau ulang saat produksi.

---

## 1. Legenda kolom SKDN

> S sasaran, D ditimbang, N naik, T tidak naik, O tidak ditimbang bulan lalu,
> B baru pertama kali, BGM di bawah garis merah pada KMS. BGM dihitung dari
> BB/U, jadi jumlahnya bisa berbeda dari status gizi BB/PB atau BB/TB.

**Dulu di:** strip kepala kartu "Rekap per RT", tepat di bawah judulnya.

**Gunanya:** menerjemahkan sembilan kolom yang judulnya satu huruf, dan
menjelaskan kenapa angka BGM bisa berbeda dari angka status gizi di Beranda —
keduanya dihitung dari indeks yang berbeda (BB/U versus BB/PB atau BB/TB).

**Risiko setelah dicabut:** ini yang paling besar di antara semuanya. Tabelnya
sekarang berjudul `S D D/S N T O B BGM` tanpa satu pun keterangan. Singkatan
SKDN memang baku di lingkungan Posyandu dan kader senior hafal di luar kepala,
tapi kader baru tidak — dan selisih BGM versus status gizi adalah pertanyaan
yang pasti muncul saat angka Beranda dan Laporan dibandingkan.

**Jalan keluar termurah:** pasang sebagai `title` pada tiap `<th>`, atau satu
baris legenda yang hanya muncul saat dicetak (`print:block`). Halaman ini
memang dirancang untuk dicetak, dan di kertas tidak ada tempat bertanya.

## 2. Keterangan tab Harian

> Satu sesi penimbangan, {tanggal kegiatan}. Data impor hanya memuat satu
> tanggal ukur per periode.

**Dulu di:** bawah deretan tab, hanya saat tab Harian aktif.

**Gunanya:** menjelaskan kenapa tab "Harian" isinya sama persis dengan
"Bulanan" — arsip sumbernya memang hanya punya satu tanggal ukur per periode.

**Risiko setelah dicabut:** berpindah dari Harian ke Bulanan tidak mengubah
satu angka pun, dan sekarang tidak ada penjelasan kenapa. Terbaca seperti tab
yang rusak.

## 3. Keterangan tab Tahunan

> Agregat {jumlah} periode Januari–Juni 2026. 2026 masih berjalan, angka belum
> final. Arsip 2025 tidak diimpor ke demo.

**Dulu di:** bawah deretan tab, hanya saat tab Tahunan aktif.

**Gunanya:** menyatakan bahwa angka tahunan belum final dan cuma mencakup enam
bulan, bukan dua belas.

**Risiko setelah dicabut:** angka tahunan terbaca sebagai angka setahun penuh.
Kalau dipakai untuk laporan ke Puskesmas, itu salah lapor.

## 4. Cakupan layanan tambahan

> Cakupan vitamin A, obat cacing, imunisasi, dan KPSP belum dapat dilaporkan:
> kolomnya tidak ada di berkas sumber. Vitamin A dan obat cacing sendiri
> diberikan setiap Februari dan Agustus.

**Dulu di:** kaki halaman.

**Gunanya:** menjelaskan ketiadaan blok "Cakupan layanan tambahan" yang ada di
artboard Prototipe v2.

**Risiko setelah dicabut:** kecil. Bagian yang tidak pernah dirender tidak
meninggalkan lubang yang terlihat.

---

## Tombol yang dihapus

Keduanya berfungsi penuh saat dihapus — ini bukan kontrol mati.

### Unduh CSV

- **Handler:** prop `onUnduhCsv`, diisi `csvLaporan()` di `demo/store.ts` lalu
  diserahkan ke peramban lewat blob (`unduhBerkas` di `demo/DemoApp.tsx`).
- **Hak akses:** tampil untuk Bidan dan Admin, disembunyikan dari Kader
  (`peran !== 'kader'`).
- **Isi berkas:** rinci, satu baris per anak dengan enam pasang kolom z-score
  dan status — **berbeda dari tabel di layar**, yang bersifat agregat SKDN per
  RT.
- **Risiko setelah dihapus:** ini fitur yang jadi alasan layar Laporan ada
  (`docs/10-prd-demo-frontend.md` bagian 6.6: "berkas yang selama ini disusun
  manual bisa keluar dari sistem dalam satu klik").
- **Untuk mengembalikan:** `csvLaporan()` di `demo/store.ts` **masih utuh** —
  ia tidak ikut dihapus. Yang ikut hilang hanya pembantu `unduhBerkas()` di
  `demo/DemoApp.tsx`, empat baris yang membungkus isi CSV jadi blob lalu
  menyerahkannya ke peramban:

    ```tsx
    function unduhBerkas(nama: string, isi: string): void {
        const alamat = URL.createObjectURL(
            new Blob([isi], { type: 'text/csv;charset=utf-8' }),
        );
        const tautan = document.createElement('a');

        tautan.href = alamat;
        tautan.download = nama;
        tautan.click();
        URL.revokeObjectURL(alamat);
    }
    ```

    Di produk nanti pembantu ini digantikan respons streaming dari
    `LaporanController@export` (bagian 10), jadi yang benar-benar perlu
    dipertahankan cuma `csvLaporan()`.

### Cetak A4

- **Handler:** `window.print()`, dialog cetak bawaan peramban.
- **Risiko setelah dihapus:** kecil. Ctrl+P tetap bekerja dan tata letaknya
  tetap siap cetak — hitam-putih, setiap chip memuat ikon dan teks. Yang hilang
  hanya jalan pintasnya. Catatan: legenda SKDN di poin 1 dulu ikut tercetak;
  sekarang tidak ada lagi di kertas maupun di layar.
