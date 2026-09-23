# F07 — Skrining awal pendaftaran

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f07-skrining-daftar` |
| **Bergantung pada** | [F01](F01-kontak-whatsapp-ortu.md) — nomor WhatsApp jadi salah satu butir |
| **Terhambat** | [OI-15](../../pertanyaan-terbuka.md) — imunisasi, sebagian |
| **Perubahan berarti terakhir** | 21 September 2026 |

## 1. Latar

> "Difitur pendaftaran langsung muncul selain nama : Indentitas yg kurang di bulan sebelumnya, termasuk imunisasi muncul langsung ketika pendaftaran di lakukan"

> "Hal tersebut sebagai skrining awal kekurangan sasaran"

Meja pendaftaran adalah **satu-satunya saat** orang tua berdiri di depan kader dengan membawa berkasnya. Setelah ia pindah ke meja timbang, kekurangan data apa pun berubah menjadi pekerjaan bulan depan — dan bulan depan ia mungkin tidak datang.

Portal sudah menyimpan seluruh kekurangan itu. Ia bahkan sudah menampilkan dua di antaranya: `NIK belum lengkap` di daftar, dan `risikoLahir()` yang menandai BBLR serta ketiadaan Buku KIA. Yang belum ada adalah **satu tempat yang mengumpulkannya** pada saat yang tepat.

## 2. Lingkup

**Masuk:**

- Satu fungsi: apa saja yang kurang dari seorang anak.
- Kartu skrining yang muncul saat kader membuka baris anak di Data Balita.
- Butir yang bisa dilengkapi di tempat itu juga, tanpa berpindah layar.

**Sengaja tidak masuk:**

- **Layar pendaftaran tersendiri.** Portal bukan aplikasi input lapangan — itu batas yang ditetapkan [ADR-0003](../../adr/0003-batas-portal-vs-aplikasi-tablet.md) dan diulang di seluruh dokumen. "Meja pendaftaran" di sini berarti saat kader membuka baris anak, bukan alur meja fisik yang disalin ke layar.
- **Skrining imunisasi.** Lihat bagian 6 — datanya tidak ada, dan kerangkanya disiapkan tanpa diisi.
- **Memblokir pengukuran sampai data lengkap.** Anak yang NIK-nya belum ada tetap berhak ditimbang. Menahan penimbangan demi kerapian data membalik urutan kepentingan.

## 3. Perilaku yang diharapkan

Kader membuka baris anak. Sebelum bagian Identitas, muncul kartu:

> **Tiga hal belum lengkap** — NIK baru 8 digit · Nomor WhatsApp belum ada · Buku KIA belum ada

Kartunya **tidak muncul sama sekali** bila tidak ada yang kurang. Kartu berbunyi "semua lengkap" pada seratus baris adalah seratus kali gangguan tanpa satu pun tindakan.

| Butir | Terpicu bila | Bisa dilengkapi di tempat |
|---|---|---|
| NIK | kosong, atau bukan 16 digit | ya |
| Tanggal lahir | kosong | ya |
| Nomor WhatsApp orang tua | kosong ([F01](F01-kontak-whatsapp-ortu.md)) | ya |
| Nama ibu | kosong | ya |
| RT | kosong | ya |
| Buku KIA | `bukuKia` bernilai salah | ya, sakelar |
| Imunisasi | *tertahan* — lihat bagian 6 | — |

**Nada biru, bukan merah.** Ini kekurangan berkas, bukan kondisi anak. Warna merah di Portal sudah punya arti pasti — gizi buruk, BGM, di bawah garis merah — dan memakainya untuk NIK yang kurang satu digit membuat kader belajar mengabaikan warna merah. Aturan yang sama sudah dipegang penanda `risikoLahir()`, yang sengaja bernada biru dengan alasan tertulis: *"ini riwayat, bukan vonis bulan ini."*

**Menyebut jumlahnya di muka.** "Tiga hal belum lengkap" memberi tahu kader berapa lama ini akan memakan waktu sebelum ia membaca butir pertama.

**Satu saringan baru di bilah atas:** *Data belum lengkap* — sederet dengan `Hanya yang perlu perhatian` dan `Berisiko sejak lahir` yang sudah ada. Sebelum sesi dimulai, kader bisa melihat siapa saja yang perlu dikejar hari itu.

## 4. Data & tipe yang berubah

Tidak ada field baru. Seluruh butirnya sudah ada di `Anak`.

```ts
// client/src/lib/kelengkapan.ts
export type ButirKurang = {
    /** Field yang kurang; menentukan kotak mana yang disorot editor. */
    medan: 'nik' | 'tglLahir' | 'noWaOrtu' | 'namaOrtu' | 'rt' | 'bukuKia';
    /** Siap tampil: "NIK baru 8 digit", bukan "nik tidak valid". */
    label: string;
};

export function yangBelumLengkap(anak: Anak): ButirKurang[];
```

`risikoLahir()` di [`client/src/data/contoh/store.ts`](../../../client/src/data/contoh/store.ts) **tidak dilebur ke sini.** Keduanya menjawab pertanyaan berbeda: `risikoLahir()` tentang **anaknya** — lahir BBLR, tidak punya Buku KIA — dan F07 tentang **berkasnya**. Yang pertama tidak akan pernah bisa "dilengkapi"; anak yang lahir 2,1 kg selamanya lahir 2,1 kg. Melebur keduanya menghasilkan daftar tugas yang satu butirnya mustahil diselesaikan.

Keduanya memang beririsan pada Buku KIA, dan itu disengaja: ketiadaan Buku KIA sekaligus berkas yang kurang **dan** penanda kewaspadaan klinis.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/lib/kelengkapan.ts` | **Baru.** Fungsi di atas. |
| `client/test/kelengkapan.test.ts` | **Baru.** Anak lengkap menghasilkan daftar kosong; NIK 15 digit terpicu; label menyebut jumlah digitnya. |
| `client/src/pages/anak/index.tsx` | Kartu di puncak `EditorBaris`; sakelar Buku KIA; saringan *Data belum lengkap*. |
| `client/src/types/posyandu.ts` | `PatchAnak` bertambah `tglLahir` dan `bukuKia`. |
| `client/demo/DemoApp.tsx` | `terapkanKoreksi()` meneruskan dua field baru. |

## 6. Keputusan terbuka

**[OI-15](../../pertanyaan-terbuka.md) — imunisasi dicatat aplikasi atau tetap di buku.**

Pemilik program menyebut imunisasi secara khusus, dan butir itulah yang paling berguna di meja pendaftaran: anak yang imunisasinya tertinggal bisa langsung diarahkan ke meja berikutnya.

Persoalannya bukan teknis. Tabel `layanan` sudah siap menampungnya sejak awal — `anak_id`, `periode_id`, `jenis`, `tanggal`. Yang tidak ada adalah **datanya**: berkas impor utama tidak memuat satu pun kolom imunisasi, sehingga bagian ini kosong di demo apa pun keputusan yang diambil.

**Sementara ini:** butir imunisasi **tidak dirender sama sekali** — bukan dirender sebagai "belum diketahui". Kartu skrining yang setiap baris berbunyi "status imunisasi belum diketahui" mengajari kader bahwa kartu itu boleh dilewati.

`yangBelumLengkap()` sudah berbentuk daftar, jadi menambahkan butir imunisasi kelak berarti menambah satu entri — bukan merombak fiturnya.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Anak tanpa NIK lengkap dan tanpa nomor WhatsApp memunculkan kartu berisi **dua butir bernama**, bukan satu kalimat umum.
- [ ] Kartunya menyebut jumlahnya: "Dua hal belum lengkap".
- [ ] Anak yang datanya lengkap **tidak memunculkan kartu sama sekali**.
- [ ] Label NIK menyebut jumlah digitnya sekarang, bukan sekadar "tidak valid".
- [ ] Mengisi nomor WhatsApp membuat butirnya hilang dari kartu **tanpa menutup editor**.
- [ ] Nada kartu **biru**, tidak pernah merah.
- [ ] Saringan *Data belum lengkap* mengubah jumlah baris, dan jumlahnya cocok dengan cacah manual.
- [ ] Tidak ada butir imunisasi yang dirender.
- [ ] `kelengkapan.test.ts` lulus dijalankan.
