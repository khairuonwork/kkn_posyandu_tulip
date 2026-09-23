# F04 — Validasi kewajaran input pengukuran

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f04-validasi-ukur` |
| **Bergantung pada** | — |
| **Terhambat** | — |
| **Perubahan berarti terakhir** | 21 September 2026 |

## 1. Latar

> "Di pengukuran : apabila setelah input penulisan BB TB LILA LIKA tidak wajar, muncul kata ulangi lagi pengukuran"

> "Misal bulan lalu 15 kg, Bagian pengukuran menulis 13 kg di bulan sekarang, karena tidak wajar = makan akan ada comment = ulangi"

Contoh yang diberikan pemilik program justru menunjukkan letak persoalannya: **13 kg dan 15 kg dua-duanya angka yang wajar.** Tidak ada satu pun pemeriksaan rentang mutlak yang bisa menangkapnya. Yang salah adalah **selisihnya**.

Portal sudah tahu ini. Fungsi `janggal()` di [`anak/show.tsx`](../../../client/src/pages/anak/show.tsx) sudah membandingkan tiap baris riwayat dengan bulan sebelumnya, lengkap dengan alasannya sendiri:

> *"`tidakWajar` hanya menangkap nilai di luar rentang mutlak — 2 baris dari 633. Tinggi yang turun 11,5 cm lolos bersih karena kedua angkanya sendiri-sendiri masih wajar. Yang salah adalah selisihnya."*

Masalahnya fungsi itu berdiri **di tempat yang salah**: ia berjalan di tabel riwayat, *setelah* angkanya tersimpan. Saat peringatannya muncul, orang tua dan anaknya sudah pulang. F04 memindahkannya ke tempat angkanya diketik.

## 2. Lingkup

**Masuk:**

- Pemeriksaan saat kader mengetik, di editor baris Data Balita.
- Dua jenis: **rentang mutlak** (angkanya sendiri mustahil) dan **selisih antar bulan** (angkanya mungkin, perubahannya tidak).
- Keempat nilai ukur: BB, TB/PB, LILA, LIKA.
- Kalimat yang menyebut **apa yang janggal**, bukan sekadar "tidak wajar".

**Sengaja tidak masuk:**

- **Memblokir penyimpanan.** Lihat bagian 3 — ini keputusan, bukan kelalaian.
- **Ambang berbasis delta z-score.** Menarik, tetapi `1,0 SD per bulan` tidak punya arti bagi kader yang memegang timbangan. Ambang dalam kg dan cm bisa diperdebatkan Bidan; ambang dalam SD hanya bisa dipercaya.
- **Ambang baru di layar Pengaturan.** Kedua belas ambangnya **sudah ada di sana** — termasuk `lilaMin/Max` dan `likaMin/Max` yang sampai hari ini tidak dipakai di satu tempat pun. F04 memakainya, bukan menambahnya.

## 3. Perilaku yang diharapkan

Kader mengetik `13` pada anak yang bulan lalu `15,0` kg. Begitu kotak ditinggalkan, muncul peringatan di bawahnya:

> ⚠️ **Ulangi pengukuran.** Berat turun 2,00 kg dalam sebulan — periksa timbangan dan pastikan angkanya benar sebelum menyimpan.

**Peringatan, bukan penolakan. Tombol Simpan tetap bisa ditekan.**

Ini bukan kelonggaran, melainkan aturan yang sudah berdiri di Portal. Layar Pengaturan menyatakannya sendiri: *batas ditetapkan bersama, perubahannya tercatat, dan **kader tidak pernah diblokir oleh sistem***. Alasannya tahan uji di lapangan: anak yang baru sembuh dari diare berat memang bisa turun 2 kg, dan sistem yang menolak menyimpannya memaksa kader mencatat di kertas — lalu angka itu hilang selamanya. Peringatan yang diabaikan tetap meninggalkan data; penolakan tidak meninggalkan apa-apa.

| Pemeriksaan | Ambang | Kalimat |
|---|---|---|
| BB turun | `> turunMax` (bawaan 1,5 kg) | Berat turun X kg dalam sebulan |
| BB naik | `> naikMax` (bawaan 2,0 kg) | Berat naik X kg dalam sebulan |
| Tinggi berkurang | `> tinggiBerkurangMax` (bawaan 0,5 cm) | Tinggi berkurang X cm — anak tidak menyusut |
| BB di luar rentang | `beratMin`–`beratMax` | Berat di luar rentang wajar balita |
| Tinggi di luar rentang | `tinggiMin`–`tinggiMax` | idem |
| LILA di luar rentang | `lilaMin`–`lilaMax` | idem |
| LIKA di luar rentang | `likaMin`–`likaMax` | idem |
| LIKA mengecil | `> tinggiBerkurangMax` | Lingkar kepala mengecil — ukur ulang |

Tiga hal yang harus dijaga:

**Tidak ada pembanding bukan kejanggalan.** Anak yang baru pertama ditimbang, atau yang bulan lalu tidak hadir, tidak punya selisih untuk diperiksa. Pemeriksaan rentang mutlak tetap jalan; pemeriksaan selisih diam. Diam, bukan lulus (DR-04).

**"Bulan lalu" berarti penimbangan sebelumnya, bukan bulan kalender sebelumnya.** Anak yang absen dua bulan dibandingkan dengan tiga bulan lalu, dan ambang selisih satu bulan tidak berlaku adil padanya. Untuk jeda lebih dari satu periode, ambangnya dikalikan jumlah periode yang terlewat — dan kalimatnya menyebut jaraknya: *"turun 2,4 kg dalam 3 bulan"*.

**Pembaruan 17 September 2026.** Feedback lapangan dikonfirmasi meminta jendela pembanding **dua** titik data ke belakang — bulan lalu **dan** bulan sebelum itu — bukan satu titik seperti desain di atas. Lihat bagian 6 untuk keputusan yang masih terbuka soal cara menggabungkan kedua titik itu.

**Peringatan tidak menumpuk jadi dinding.** Bila lebih dari satu janggal, yang ditampilkan yang paling besar simpangannya, dengan jumlah sisanya disebut. Empat baris merah di bawah satu kotak isian membuat kader berhenti membacanya.

## 4. Data & tipe yang berubah

Tidak ada field baru.

```ts
// client/src/lib/kewajaran.ts
export type Kejanggalan = {
    /** 'bb' | 'tinggi' | 'lila' | 'lika' — kotak mana yang ditandai. */
    medan: MedanUkur;
    /** Kalimat siap tampil, sudah menyebut angka dan satuannya. */
    pesan: string;
    /** Seberapa jauh melewati ambang; penentu urutan tampil. */
    simpangan: number;
};

export function periksaKewajaran(
    kini: NilaiUkur,
    sebelumnya: NilaiUkur | null,
    jarakPeriode: number,
    ambang: Ambang,
): Kejanggalan[];
```

`janggal()` di `show.tsx` **dihapus dan digantikan pemanggilan fungsi ini**, bukan dibiarkan berdampingan. Dua salinan aturan kewajaran yang bisa berbeda diam-diam adalah persis jenis kesalahan yang hendak dicegah fitur ini.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/lib/kewajaran.ts` | **Baru.** Fungsi di atas; isinya diangkat dari `janggal()` lalu diperluas ke LILA, LIKA, dan rentang mutlak. |
| `client/test/kewajaran.test.ts` | **Baru.** Kasus 15→13 kg, tinggi menyusut, jeda dua bulan, tanpa pembanding. |
| `client/src/pages/anak/index.tsx` | Peringatan di `EditorBaris`; dua isian baru dari [F05](F05-grafik-enam-indeks.md) ikut diperiksa. |
| `client/src/pages/anak/show.tsx` | `janggal()` dihapus, memanggil `periksaKewajaran()`. |
| `client/demo/DemoApp.tsx` | `ambang` diteruskan ke `DaftarAnak` — selama ini hanya sampai ke Detail anak. |

## 6. Keputusan terbuka

**Jendela pembanding dua bulan (ditambahkan 17 September 2026).** Feedback lapangan minta pembanding memakai **dua** titik data ke belakang, bukan satu seperti dirancang di bagian 3. Yang belum ditentukan adalah cara menggabungkan keduanya — dua opsi wajar:

- Bandingkan simpangan dari titik terdekat (bulan lalu) seperti sekarang, dan gunakan titik kedua (dua bulan lalu) hanya sebagai konteks tambahan di kalimat peringatan.
- Bandingkan terhadap tren/rata-rata kedua titik itu, sehingga satu bulan yang kebetulan ganjil tidak memicu peringatan sendirian.

Perlu diputuskan Bidan/pemilik program sebelum diimplementasikan — kriteria terima bagian 7 belum mencakup kasus dua titik ini.

Selain itu, tidak ada keputusan terbuka lain. Ambang bawaannya sudah berdiri di `PENGATURAN_BAWAAN` dan sudah bisa diubah Bidan dari layar Pengaturan, sehingga angka yang ternyata terlalu ketat atau terlalu longgar tidak menuntut perubahan kode.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Anak yang bulan lalu 15,0 kg, diketik `13` → peringatan muncul **sebelum** disimpan.
- [ ] Anak yang sama diketik `15,2` → tidak ada peringatan.
- [ ] Tombol **Simpan perubahan tetap bisa ditekan** saat peringatan tampil, dan nilainya benar-benar tersimpan.
- [ ] Tinggi diketik lebih kecil dari bulan lalu → peringatan menyebut anak tidak menyusut.
- [ ] LILA diketik `40` → peringatan rentang mutlak, memakai ambang dari layar Pengaturan.
- [ ] Mengubah `turunMax` di Pengaturan mengubah kapan peringatan muncul, tanpa memuat ulang halaman.
- [ ] Anak yang baru pertama ditimbang tidak memunculkan peringatan selisih.
- [ ] Anak yang absen dua bulan: kalimatnya menyebut "dalam 3 bulan", bukan "dalam sebulan".
- [ ] `kewajaran.test.ts` lulus dijalankan.
