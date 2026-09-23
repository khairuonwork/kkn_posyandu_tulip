# Teks yang dicabut dari layar

| | |
|---|---|
| **Jenis** | Kontrak — calon teks layar |
| **Status** | beku — dicabut atas permintaan pemilik produk |
| **Perubahan berarti terakhir** | 22 September 2026 |

Penampungan kalimat keterangan, dua tombol, dan dua kartu yang pernah ada di layar lalu dicabut atas permintaan pemilik produk supaya layarnya bersih dan muat satu jendela.

**Ini penampungan, bukan keputusan akhir.** Isinya bukan hiasan: sebagian besar kalimat di bawah menyatakan asumsi sistem atau batas data, dan prinsip P4 ([`rujukan/ui-ux.md`](../rujukan/ui-ux.md)) menuntut asumsi semacam itu terlihat di antarmuka, bukan hanya di basis data. Mencabutnya memindahkan beban itu ke pelatihan dan dokumen, bukan menghapusnya.

Karena itu tiap entri punya **Risiko setelah dicabut** — supaya keputusannya bisa ditinjau ulang saat produksi, dengan tahu persis apa yang hilang.

Jalan keluar yang lebih murah daripada mengembalikannya sebagai paragraf: taruh sebagai `title`/tooltip pada elemen yang bersangkutan, atau kumpulkan di satu panel "Tentang angka ini" yang bisa dibuka-tutup.

> Berkas ini menggabungkan tiga dokumen terpisah (dulu 12, 13, dan 14) pada 22 September 2026. Isinya utuh; yang dibuang hanya tiga pembukaan yang saling mengulang. Nomor 13 dan 14 pensiun dan tidak dipakai ulang.

---

# Bagian A — Layar Detail Anak

Dulu tercetak di `client/src/pages/anak/show.tsx` dan `client/src/components/kms-chart.tsx`.

## A1. Acuan perhitungan z-score

> Acuan standar pertumbuhan WHO 2006, dihitung dari parameter LMS. Nilainya
> sama dengan tabel Permenkes No. 2 Tahun 2020. Indeks mengikuti umur anak:
> BB/PB di bawah 24 bulan, BB/TB untuk 24 bulan ke atas.

**Dulu di:** bawah tiga kartu indeks, bagian "Status pengukuran".

**Gunanya:** menjawab dua pertanyaan yang pasti muncul saat bidan membandingkan angka aplikasi dengan tabel cetak — acuannya apa, dan kenapa label indeksnya berubah-ubah antar anak.

**Risiko setelah dicabut:** label kartu berganti sendiri antara BB/PB dan BB/TB menurut umur anak tanpa satu pun keterangan. Perbedaan dengan tabel Permenkes yang dipegang bidan tidak lagi punya penjelasan di layar.

## A2. Asumsi cara ukur

> Cara ukur {jenisUkur}: panjang badan, telentang. Berkas sumber tidak
> mencatatnya.
>
> (atau "tinggi badan, berdiri" untuk anak 24 bulan ke atas)

**Dulu di:** paragraf terakhir bagian "Status pengukuran", hanya muncul bila `catatanUkur.jenisUkur` ada.

**Gunanya:** menyatakan bahwa cara ukur **disimpulkan dari umur**, bukan dibaca dari arsip. Panjang badan telentang dan tinggi badan berdiri berbeda sekitar 0,7 cm, dan selisih itu masuk ke z-score.

**Risiko setelah dicabut:** ini satu-satunya tempat asumsi tersebut terlihat. Setelah dicabut, angka hasil asumsi tidak bisa dibedakan dari angka hasil pencatatan — persis yang dilarang prinsip P4.

## A3. Arti kolom Pertumbuhan

> Kolom Pertumbuhan menampilkan huruf N, T, O, dan B apa adanya dari arsip.
> Aturan 1T/2T/3T belum diterapkan karena definisinya masih dikonfirmasi.

**Dulu di:** bawah tabel "Riwayat pengukuran".

**Gunanya:** menyatakan bahwa huruf N/T/O/B diteruskan apa adanya, dan bahwa aturan lanjutannya belum jalan. Terkait [OI-01](../pertanyaan-terbuka.md).

**Risiko setelah dicabut:** tabel menampilkan "T, tidak naik" berturut-turut tanpa memberi tahu bahwa aplikasi belum menghitung 2T atau 3T. Kader bisa menyangka sistem sudah menandainya.

## A4. Imunisasi dan catatan bidan

> Belum ada catatan imunisasi maupun catatan bidan untuk anak ini. Detail per
> vaksin ada di Buku KIA fisik; aplikasi hanya menyimpan status ringkas.

**Dulu di:** kaki halaman, di luar blok pengukuran.

**Gunanya:** menjelaskan ketiadaan dua bagian yang ada di artboard Prototipe v2 tetapi tidak punya kolom di basis data.

**Risiko setelah dicabut:** paling kecil di antara semuanya. Bagian yang tidak pernah dirender tidak meninggalkan lubang yang terlihat.

> **Pembaruan 21 September 2026.** Alasan pencabutannya sudah gugur: berkas data sasaran ternyata memuat imunisasi lengkap per antigen beserta tanggalnya ([OI-15](../pertanyaan-terbuka.md), [06 bagian 10](../rujukan/migrasi-data.md)), dan tabel `layanan` siap menampungnya. Yang dibutuhkan impor, bukan pengumpulan data baru.

## A5. Keterangan kurva KMS

> Garis anak terputus pada bulan tanpa penimbangan. Pita mengikuti standar
> WHO 2006 yang dipakai KMS Buku KIA.

**Dulu di:** bawah legenda pita SD, di dalam `KmsChart`.

**Gunanya:** menjelaskan putusnya garis. Tanpa ini, garis terputus terbaca sebagai galat render, bukan sebagai bulan anak tidak hadir.

**Risiko setelah dicabut:** cukup besar. Dua puluh dua dari 101 anak punya bulan bolong, jadi garis terputus adalah keadaan yang sering terlihat.

### Yang sengaja TIDAK dicabut dari Detail Anak

Ketiganya instruksi pemakaian, bukan keterangan data. Mencabutnya menghilangkan satu-satunya tanda bahwa sebuah kontrol bisa dipakai, dan itu melanggar prinsip P1 — tidak boleh ada gerakan tersembunyi.

| Teks | Tempat | Alasan dipertahankan |
|---|---|---|
| Pilih tanggal untuk menyorot titiknya pada kurva di atas. | strip kepala Riwayat | Satu-satunya tanda bahwa tanggal di tabel bisa diklik |
| Geser kurva ke samping untuk melihat bulan berikutnya. | atas kurva, hanya di bawah 640 px | Di ponsel kurva lebih lebar daripada layar |
| Tabel ini lebih lebar daripada layar. Geser ke samping … | atas tabel Riwayat, hanya di bawah 768 px | Sama, untuk kolom z-score |

---

# Bagian B — Layar Laporan

Dulu ada di `client/src/pages/laporan/index.tsx`. Dicabut supaya seluruh laporan muat dalam satu layar.

## B1. Legenda kolom SKDN

> S sasaran, D ditimbang, N naik, T tidak naik, O tidak ditimbang bulan lalu,
> B baru pertama kali, BGM di bawah garis merah pada KMS. BGM dihitung dari
> BB/U, jadi jumlahnya bisa berbeda dari status gizi BB/PB atau BB/TB.

**Dulu di:** strip kepala kartu "Rekap per RT", tepat di bawah judulnya.

**Gunanya:** menerjemahkan sembilan kolom yang judulnya satu huruf, dan menjelaskan kenapa angka BGM bisa berbeda dari angka status gizi di Beranda — keduanya dihitung dari indeks yang berbeda (BB/U versus BB/PB atau BB/TB).

**Risiko setelah dicabut:** **yang paling besar di seluruh berkas ini.** Tabelnya sekarang berjudul `S D D/S N T O B BGM` tanpa satu pun keterangan. Singkatan SKDN memang baku di lingkungan Posyandu dan kader senior hafal di luar kepala, tapi kader baru tidak — dan selisih BGM versus status gizi adalah pertanyaan yang pasti muncul saat angka Beranda dan Laporan dibandingkan.

**Jalan keluar termurah:** pasang sebagai `title` pada tiap `<th>`, atau satu baris legenda yang hanya muncul saat dicetak (`print:block`). Halaman ini memang dirancang untuk dicetak, dan di kertas tidak ada tempat bertanya.

## B2. Keterangan tab Harian

> Satu sesi penimbangan, {tanggal kegiatan}. Data impor hanya memuat satu
> tanggal ukur per periode.

**Dulu di:** bawah deretan tab, hanya saat tab Harian aktif.

**Gunanya:** menjelaskan kenapa tab "Harian" isinya sama persis dengan "Bulanan" — arsip sumbernya memang hanya punya satu tanggal ukur per periode.

**Risiko setelah dicabut:** berpindah dari Harian ke Bulanan tidak mengubah satu angka pun, dan sekarang tidak ada penjelasan kenapa. Terbaca seperti tab yang rusak.

## B3. Keterangan tab Tahunan

> Agregat {jumlah} periode Januari–Juni 2026. 2026 masih berjalan, angka belum
> final. Arsip 2025 tidak diimpor ke demo.

**Dulu di:** bawah deretan tab, hanya saat tab Tahunan aktif.

**Gunanya:** menyatakan bahwa angka tahunan belum final dan cuma mencakup enam bulan, bukan dua belas.

**Risiko setelah dicabut:** angka tahunan terbaca sebagai angka setahun penuh. Kalau dipakai untuk laporan ke Puskesmas, itu salah lapor.

## B4. Cakupan layanan tambahan

> Cakupan vitamin A, obat cacing, imunisasi, dan KPSP belum dapat dilaporkan:
> kolomnya tidak ada di berkas sumber. Vitamin A dan obat cacing sendiri
> diberikan setiap Februari dan Agustus.

**Dulu di:** kaki halaman.

**Gunanya:** menjelaskan ketiadaan blok "Cakupan layanan tambahan" yang ada di artboard Prototipe v2.

**Risiko setelah dicabut:** kecil. Bagian yang tidak pernah dirender tidak meninggalkan lubang yang terlihat.

> **Pembaruan 21 September 2026.** Sama seperti A4: kolomnya **ada** di berkas data sasaran, dan KPSP pun sudah tercatat di berkas Bidan. Kalimat "kolomnya tidak ada di berkas sumber" sudah tidak benar.

## B5. Tombol Unduh CSV

Berfungsi penuh saat dihapus — ini bukan kontrol mati.

- **Handler:** prop `onUnduhCsv`, diisi `csvLaporan()` di `client/src/data/contoh/store.ts` lalu diserahkan ke peramban lewat blob (`unduhBerkas` di `client/demo/DemoApp.tsx`).
- **Hak akses:** tampil untuk Bidan dan Admin, disembunyikan dari Kader (`peran !== 'kader'`).
- **Isi berkas:** rinci, satu baris per anak dengan enam pasang kolom z-score dan status — **berbeda dari tabel di layar**, yang bersifat agregat SKDN per RT.
- **Risiko setelah dihapus:** ini fitur yang jadi alasan layar Laporan ada ([`rujukan/layar-demo.md`](../rujukan/layar-demo.md) bagian 6.6: "berkas yang selama ini disusun manual bisa keluar dari sistem dalam satu klik").
- **Untuk mengembalikan:** `csvLaporan()` **masih utuh** — ia tidak ikut dihapus. Yang ikut hilang hanya pembantu `unduhBerkas()`, empat baris yang membungkus isi CSV jadi blob lalu menyerahkannya ke peramban:

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

    Di produk nanti pembantu ini digantikan respons *streaming* dari endpoint ekspor, jadi yang benar-benar perlu dipertahankan cuma `csvLaporan()`.

Keputusan mengembalikan tombolnya atau tidak masih terbuka — lihat pertanyaan 11 pada [`rencana-kerja.md`](../rencana-kerja.md).

## B6. Tombol Cetak A4

- **Handler:** `window.print()`, dialog cetak bawaan peramban.
- **Risiko setelah dihapus:** kecil. Ctrl+P tetap bekerja dan tata letaknya tetap siap cetak — hitam-putih, setiap chip memuat ikon dan teks. Yang hilang hanya jalan pintasnya. Catatan: legenda SKDN di B1 dulu ikut tercetak; sekarang tidak ada lagi di kertas maupun di layar.

---

# Bagian C — Layar Pengaturan

Dulu tercetak di `client/src/pages/pengaturan/index.tsx`. Dicabut supaya seluruh layar muat dalam satu jendela.

Layar ini punya sifat yang membedakannya dari Detail dan Laporan: isinya bukan data yang dibaca, melainkan **dua belas angka yang bisa diubah dan berakibat ke alur penimbangan**. Keterangan di layar semacam ini bukan hiasan — ia yang memberi tahu apa yang terjadi setelah tombol Simpan ditekan.

## C1. Pita biru: apa yang dilakukan batas ini

> Batas ini hanya memicu pertanyaan konfirmasi. Kader tidak pernah diblokir.
> Perubahan berlaku untuk pengukuran baru, data lama tidak dihitung ulang.

**Dulu di:** pita biru di puncak halaman, di atas semua kartu.

**Gunanya:** tiga pernyataan sekaligus, dan ketiganya menjawab pertanyaan yang pasti muncul sebelum seseorang berani mengubah angka:

1. Batasnya **memicu pertanyaan**, bukan penolakan.
2. Kader **tidak pernah diblokir** — ini keputusan produk, bukan detail teknis.
3. Perubahan **tidak menghitung ulang data lama**.

**Risiko setelah dicabut:** paling besar di bagian ini. Bidan yang menaikkan batas berat maksimal sekarang tidak punya cara tahu apakah pengukuran bulan lalu ikut dinilai ulang atau tidak. Poin 2 juga satu-satunya tempat janji "kader tidak pernah diblokir" tertulis di antarmuka.

**Jalan keluar termurah:** kembalikan sebagai satu baris di dekat tombol Simpan, tempat akibatnya paling relevan.

## C2. Keterangan "Rentang wajar pengukuran"

> Angka di luar rentang ini memunculkan peringatan sebelum disimpan.

**Dulu di:** strip kepala kartu "Rentang wajar pengukuran".

**Gunanya:** menyatakan bahwa yang diatur adalah **ambang peringatan**, bukan batas penolakan.

**Risiko setelah dicabut:** judul kartunya berbunyi "Rentang wajar pengukuran" — tanpa kalimat ini, ia terbaca seperti batas keras yang menolak angka di luarnya.

## C3. Keterangan "Ambang selisih antar bulan"

> Selisih yang melebihi batas memunculkan pertanyaan, Yakin dengan angka ini?

**Dulu di:** strip kepala kartu "Ambang selisih antar bulan".

**Gunanya:** sama dengan C2, dan sekaligus mengutip kalimat persis yang akan dilihat kader di Aplikasi Tablet.

**Risiko setelah dicabut:** sedang. Kata "ambang" sendiri tidak memberi tahu apa yang terjadi saat ambangnya terlampaui.

## C4. Dasar hukum ambang z-score

> Ditetapkan Permenkes No. 2 Tahun 2020, tidak bisa diubah dari aplikasi.

**Dulu di:** strip kepala kartu "Ambang z-score, terkunci".

**Gunanya:** menyebut dasar hukum kenapa empat ambang itu tidak bisa disentuh.

**Risiko setelah dicabut:** kecil sampai sedang. Judul kartu masih berbunyi "terkunci" dan ikon gemboknya masih ada, jadi keadaan terkuncinya tetap terbaca — yang hilang cuma **alasannya**.

## C5. Jejak audit

> Setiap perubahan dicatat dengan nama dan waktu.

**Dulu di:** kaki kartu "Siapa boleh mengubah batas".

**Gunanya:** menyatakan bahwa perubahan meninggalkan jejak. Ini pernyataan tata kelola, bukan penjelasan antarmuka.

**Risiko setelah dicabut:** sedang. Subjudul halaman masih menyebut "Terakhir diubah {tanggal} oleh {nama}", jadi buktinya masih terlihat sekali walaupun janjinya tidak lagi tertulis.

## C6. Kartu "Batas z-score, terkunci" — SELURUH KARTU dicabut

Bukan lagi kalimat keterangan, melainkan satu kartu utuh beserta datanya.

> **Batas z-score, terkunci** (ikon gembok)
>
> | Chip | Nada |
> | --- | --- |
> | di bawah −3 SD | merah |
> | −3 SD sampai −2 SD | oranye |
> | −2 SD sampai +1 SD | hijau |
> | di atas +1 SD | biru |
>
> Tabel standar: WHO-2006

**Dulu di:** kolom kanan layar Pengaturan, kartu pertama.

**Gunanya:** rujukan yang bisa dibaca bidan — empat ambang PMK No. 2 Tahun 2020 apa adanya, dan penegasan bahwa tidak satu pun dapat diubah dari aplikasi. Tiap chip memuat teks, bukan warna saja, karena laporan Posyandu dicetak hitam-putih.

**Alasan dicabut:** keputusan pemilik produk — ini informasi aplikasi, bukan pengaturan. Layar Pengaturan sebaiknya hanya memuat yang benar-benar bisa diatur. Ruangnya (203 px dari anggaran 910 px pada 1920×1080) diberikan ke kartu Kelola pengguna.

**Risiko setelah dicabut:** dasar hukum Permenkes No. 2 Tahun 2020 sekarang **tidak muncul di mana pun dalam produk** — keterangannya sudah dicabut lebih dulu (C4), dan sekarang datanya ikut. Ambangnya tetap dipakai sistem (`client/src/lib/kategori.ts` dan `server/src/antropometri/penilaian-gizi.ts`); yang hilang hanya pernyataannya di layar. Untuk demo ke Puskesmas, pernyataan "kami mengikuti PMK 2/2020" adalah sinyal kepercayaan yang sekarang tidak tertulis di mana pun.

**Jalan keluar termurah kalau ditinjau ulang:** satu baris di kaki layar Pengaturan atau di layar Tentang, berbunyi `Ambang z-score mengikuti Permenkes No. 2 Tahun 2020, tabel standar WHO-2006.`

## C7. Kartu "Siapa boleh mengubah apa" — SELURUH KARTU dicabut

> | Peran | Izin |
> | --- | --- |
> | Bidan | Boleh mengubah batas |
> | Admin | Boleh mengubah batas dan pengguna |
> | Kader | Menu ini tidak tampil |

**Dulu di:** kolom kanan layar Pengaturan, kartu kedua.

**Gunanya:** menyatakan matriks izin di tempat izin itu berlaku.

**Alasan dicabut:** sama — informasi aplikasi, bukan pengaturan.

**Risiko setelah dicabut:** kecil, dan mengecil lagi sejak kartu Kelola pengguna ada. Matriksnya sekarang terlihat langsung sebagai perilaku: kolom Peran pada tiap baris akun, dan kartu Kelola pengguna itu sendiri yang hanya tampil untuk Admin. Yang hilang hanya baris `Kader — Menu ini tidak tampil`, yang memang tidak pernah dibaca kader.

### Yang sengaja TIDAK dicabut dari Pengaturan

| Teks | Tempat | Alasan dipertahankan |
|---|---|---|
| Ada perubahan yang belum disimpan. / Semua perubahan tersimpan. | bilah simpan | Umpan balik langsung (`aria-live`), bukan keterangan. Tanpa ini tidak ada tanda ada yang belum tersimpan |
| Belum ada tempat menyimpannya: tabel pengaturan_ambang belum ada di basis data. | bilah simpan | Muncul hanya saat `onSimpan` tidak ada; menjelaskan tombol Simpan yang nonaktif |
| Terakhir diubah {tanggal} oleh {nama} | subjudul halaman | Fakta, bukan keterangan desain |
