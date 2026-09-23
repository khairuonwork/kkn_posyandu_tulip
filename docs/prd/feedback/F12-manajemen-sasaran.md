# F12 — Manajemen sasaran dinamis

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f12-manajemen-sasaran` |
| **Bergantung pada** | — |
| **Terhambat** | — |
| **Perubahan berarti terakhir** | 21 September 2026 |

## 1. Latar

> "Tambahkan data untuk pendataan sasaran (pendataan sasaran diambil dari data puskesmas, sedangkan data setiap bulannya beda beda, bisa kurang bisa lebih, sehingga jika ada data yang baru seperti apa inputnya, jika sudah beres apakah data tetap ada/dihapus)"

Dua pertanyaan, dan yang kedua paling penting: **kalau sudah beres, datanya tetap ada atau dihapus?**

**Jawabannya: tetap ada, dan tidak pernah dihapus.**

Anak yang lulus di usia lima tahun membawa lima tahun riwayat pertumbuhan. Riwayat itulah yang membuat laporan tahun lalu masih bisa dipertanggungjawabkan tahun ini, dan yang membuat adiknya kelak bisa dibandingkan. Menghapusnya menghapus buktinya juga.

Skema sudah memihak jawaban ini sejak awal — `anak.status` (`aktif` · `lulus` · `pindah` · `meninggal`), `softDeletes`, dan `StatusAnak::dihitungSebagaiSasaran()` yang hanya mengakui `aktif` sebagai S. Yang belum ada: **status itu tidak muncul di satu layar pun**, dan tipe `Anak` di frontend bahkan belum memilikinya.

## 2. Lingkup

**Masuk:**

- Field `status` pada tipe `Anak`, mengikuti enum yang sudah ada di backend.
- Penandaan status dari editor baris, beserta konfirmasi.
- Saringan status di Data Balita; bawaannya hanya anak aktif.
- Kalimat tegas bahwa riwayat tidak terhapus.

**Sengaja tidak masuk:**

- **Impor massal sasaran dari berkas Puskesmas.** Bentuk berkasnya belum diketahui — persoalan yang sama dengan [OI-17](../../pertanyaan-terbuka.md). Tambah cepat lewat form yang sudah ada menutup kebutuhan bulanan; impor massal menunggu berkas contohnya.
- **Melulus otomatis di umur 60 bulan.** Tanggal lulus adalah keputusan Bidan, bukan akibat aritmetika kalender. Portal **mengusulkan**, Bidan yang menandai.
- **Menghapus anak, dalam bentuk apa pun.** Tidak ada tombol hapus, dan tidak akan ditambahkan. Salah tandai diperbaiki dengan menandai ulang.

## 3. Perilaku yang diharapkan

Di Data Balita, bilah saring bertambah satu pilihan **Status**, bawaannya `Aktif`. Kader yang membuka Portal melihat sasaran bulan berjalan, bukan seluruh anak yang pernah tercatat.

| Status | Arti | Terhitung sebagai S |
|---|---|---|
| **Aktif** | Sasaran berjalan | ya |
| **Lulus** | Di atas lima tahun | tidak |
| **Pindah** | Pindah domisili | tidak |
| **Meninggal** | — | tidak |

Menandai status dilakukan dari editor baris, dan **selalu melewati konfirmasi** yang menyebut akibatnya:

> Tandai **Yasmin Yudhistira** sebagai **Lulus**?
> Ia tidak lagi dihitung sebagai sasaran mulai periode ini. **Seluruh riwayat pengukurannya tetap tersimpan** dan tetap dapat dilihat.

Kalimat kedua bukan hiasan. Pertanyaan pemilik program menunjukkan kekhawatiran bahwa data akan hilang, dan satu-satunya tempat untuk menjawabnya adalah pada saat orang menekan tombolnya.

Tiga hal yang harus dijaga:

**Angka historis tidak boleh bergerak.** Rekap Januari dihitung dari sasaran Januari. Anak yang ditandai Lulus pada Juni **tetap terhitung sebagai S di Januari sampai Mei** — ia memang sasaran waktu itu. Status berlaku sejak ditandai, tidak berlaku surut. Rekap yang berubah setiap kali seseorang merapikan data adalah rekap yang tidak bisa dipertanggungjawabkan.

**Anak bukan-aktif tetap bisa dibuka.** Halaman detailnya utuh: kurva, riwayat, identitas, semuanya. Yang berubah hanya sebaris keterangan status di puncak, dan ketiadaannya dari cacah sasaran.

**Portal mengusulkan, tidak memutuskan.** Anak yang melewati 60 bulan dan masih berstatus aktif mendapat penanda biru — *Sudah di atas 5 tahun, belum ditandai lulus* — beserta saringannya sendiri. Ini bukan keadaan karangan: arsip Juni memuat anak berumur 60 bulan yang masih terdaftar sebagai sasaran, dan satu lagi yang sudah 67 bulan. Keduanya tercatat di [`client/src/data/contoh/store.ts`](../../../client/src/data/contoh/store.ts) sebagai hal yang **sengaja dibiarkan mengikuti arsip**. F12 memberi mereka jalan keluar tanpa mengubah angka yang lalu.

Untuk sasaran baru: form **Tambah balita** yang sudah ada sudah menutupnya. Yang ditambahkan hanya satu kalimat bahwa anak baru berstatus Aktif dan ikut menambah S mulai periode berjalan.

## 4. Data & tipe yang berubah

```ts
// client/src/types/posyandu.ts
/** Sama dengan App\Enums\StatusAnak. */
export type StatusAnak = 'aktif' | 'lulus' | 'pindah' | 'meninggal';

// pada type Anak
status: StatusAnak;
```

Tidak *nullable*. Anak selalu punya status; yang tidak diketahui statusnya adalah anak yang tidak ada. Anak dari arsip diberi `'aktif'` saat ekstraksi, sama seperti bawaan kolomnya di migrasi.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/types/posyandu.ts` | `StatusAnak`; field `status` pada `Anak` dan `BarisAnak`. |
| `client/src/pages/anak/index.tsx` | Saringan status; penanda "di atas 5 tahun"; penandaan status berkonfirmasi di `EditorBaris`. |
| `client/src/pages/anak/show.tsx` | Keterangan status untuk anak bukan-aktif. |
| `client/src/data/contoh/store.ts` | `daftarAnak()` menyaring status; `ringkasan()` menghitung S dari anak aktif. |
| `client/src/data/contoh/extract-demo-data.py` | `"status": "aktif"` pada tiap anak. |
| `client/src/data/contoh/posyandu.json` | Dibangkitkan ulang. |

## 6. Keputusan terbuka

Tidak ada yang menghambat — jawabannya sudah ditetapkan skema sejak awal.

Bersinggungan dengan **[OI-10](../../pertanyaan-terbuka.md)**: menyimpan selamanya adalah keputusan yang harus ditulis, bukan diasumsikan. Data kesehatan anak yang tidak pernah dihapus menuntut kebijakan retensi tertulis sebelum sistem menyimpan data sungguhan. F12 memperkuat alasan OI-10 harus selesai; ia tidak menyelesaikannya.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Bawaan Data Balita hanya menampilkan anak **Aktif**.
- [ ] Menandai anak **Lulus** mengeluarkannya dari sasaran periode berjalan.
- [ ] **Riwayat pengukurannya tetap utuh** dan halaman detailnya tetap bisa dibuka.
- [ ] Konfirmasinya menyebut nama anak dan menyatakan riwayat tetap tersimpan.
- [ ] **Rekap Januari sampai Mei tidak berubah** sedikit pun setelah penandaan itu.
- [ ] Anak berumur di atas 60 bulan yang masih aktif mendapat penanda biru dan punya saringan sendiri.
- [ ] Tidak ada tombol hapus di mana pun.
- [ ] Anak yang baru ditambahkan langsung berstatus Aktif dan menambah S.
