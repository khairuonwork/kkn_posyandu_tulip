# Teks keterangan yang dicabut dari layar Pengaturan

Berkas ini menampung kalimat keterangan yang sebelumnya tercetak di
`resources/js/pages/pengaturan/index.tsx`, lalu dicabut atas permintaan pemilik
produk supaya seluruh layar muat dalam satu jendela.

Sama seperti `docs/12-...` dan `docs/13-...`: **ini penampungan, bukan keputusan
akhir.** Bagian "Risiko setelah dicabut" mencatat apa yang hilang.

Layar ini punya sifat yang membedakannya dari Detail dan Laporan: isinya bukan
data yang dibaca, melainkan **dua belas angka yang bisa diubah dan berakibat ke
alur penimbangan**. Keterangan di layar semacam ini bukan hiasan — ia yang
memberi tahu apa yang terjadi setelah tombol Simpan ditekan.

---

## 1. Pita biru: apa yang dilakukan batas ini

> Batas ini hanya memicu pertanyaan konfirmasi. Kader tidak pernah diblokir.
> Perubahan berlaku untuk pengukuran baru, data lama tidak dihitung ulang.

**Dulu di:** pita biru di puncak halaman, di atas semua kartu.

**Gunanya:** tiga pernyataan sekaligus, dan ketiganya menjawab pertanyaan yang
pasti muncul sebelum seseorang berani mengubah angka:

1. Batasnya **memicu pertanyaan**, bukan penolakan.
2. Kader **tidak pernah diblokir** — ini keputusan produk, bukan detail teknis.
3. Perubahan **tidak menghitung ulang data lama**.

**Risiko setelah dicabut:** paling besar di antara semuanya. Bidan yang
menaikkan batas berat maksimal sekarang tidak punya cara tahu apakah
pengukuran bulan lalu ikut dinilai ulang atau tidak. Poin 2 juga satu-satunya
tempat janji "kader tidak pernah diblokir" tertulis di antarmuka.

**Jalan keluar termurah:** kembalikan sebagai satu baris di dekat tombol
Simpan, tempat akibatnya paling relevan.

## 2. Keterangan "Rentang wajar pengukuran"

> Angka di luar rentang ini memunculkan peringatan sebelum disimpan.

**Dulu di:** strip kepala kartu "Rentang wajar pengukuran".

**Gunanya:** menyatakan bahwa yang diatur adalah **ambang peringatan**, bukan
batas penolakan.

**Risiko setelah dicabut:** judul kartunya berbunyi "Rentang wajar pengukuran"
— tanpa kalimat ini, ia terbaca seperti batas keras yang menolak angka di
luarnya.

## 3. Keterangan "Ambang selisih antar bulan"

> Selisih yang melebihi batas memunculkan pertanyaan, Yakin dengan angka ini?

**Dulu di:** strip kepala kartu "Ambang selisih antar bulan".

**Gunanya:** sama dengan poin 2, dan sekaligus mengutip kalimat persis yang
akan dilihat kader di Aplikasi Tablet.

**Risiko setelah dicabut:** sedang. Kata "ambang" sendiri tidak memberi tahu
apa yang terjadi saat ambangnya terlampaui.

## 4. Dasar hukum ambang z-score

> Ditetapkan Permenkes No. 2 Tahun 2020, tidak bisa diubah dari aplikasi.

**Dulu di:** strip kepala kartu "Ambang z-score, terkunci".

**Gunanya:** menyebut dasar hukum kenapa empat ambang itu tidak bisa disentuh.

**Risiko setelah dicabut:** kecil sampai sedang. Judul kartu masih berbunyi
"terkunci" dan ikon gemboknya masih ada, jadi keadaan terkuncinya tetap
terbaca — yang hilang cuma **alasannya**. Bidan yang bertanya "kenapa saya
tidak boleh mengubah ini" tidak lagi menemukan jawabannya di layar.

## 5. Jejak audit

> Setiap perubahan dicatat dengan nama dan waktu.

**Dulu di:** kaki kartu "Siapa boleh mengubah batas".

**Gunanya:** menyatakan bahwa perubahan meninggalkan jejak. Ini pernyataan tata
kelola, bukan penjelasan antarmuka.

**Risiko setelah dicabut:** sedang. Subjudul halaman masih menyebut "Terakhir
diubah {tanggal} oleh {nama}", jadi buktinya masih terlihat sekali walaupun
janjinya tidak lagi tertulis.

---

## 6. Kartu "Batas z-score, terkunci" — SELURUH KARTU dicabut

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

**Gunanya:** rujukan yang bisa dibaca bidan — empat ambang PMK No. 2 Tahun 2020
apa adanya, dan penegasan bahwa tidak satu pun dapat diubah dari aplikasi. Tiap
chip memuat teks, bukan warna saja, karena laporan Posyandu dicetak hitam-putih.

**Alasan dicabut:** keputusan pemilik produk — ini informasi aplikasi, bukan
pengaturan. Layar Pengaturan sebaiknya hanya memuat yang benar-benar bisa
diatur. Ruangnya (203 px dari anggaran 910 px pada 1920x1080) diberikan ke
kartu Kelola pengguna.

**Risiko setelah dicabut:** dasar hukum Permenkes No. 2 Tahun 2020 sekarang
**tidak muncul di mana pun dalam produk** — keterangannya sudah dicabut lebih
dulu (bagian 4 berkas ini), dan sekarang datanya ikut. Ambangnya tetap dipakai
sistem (`resources/js/lib/kategori.ts` dan `App\Support\Antropometri\Kategori`);
yang hilang hanya pernyataannya di layar. Untuk demo ke Puskesmas, pernyataan
"kami mengikuti PMK 2/2020" adalah sinyal kepercayaan yang sekarang tidak
tertulis di mana pun.

**Jalan keluar termurah kalau ditinjau ulang:** satu baris di kaki layar
Pengaturan atau di layar Tentang, berbunyi `Ambang z-score mengikuti Permenkes
No. 2 Tahun 2020, tabel standar WHO-2006.`

## 7. Kartu "Siapa boleh mengubah apa" — SELURUH KARTU dicabut

> | Peran | Izin |
> | --- | --- |
> | Bidan | Boleh mengubah batas |
> | Admin | Boleh mengubah batas dan pengguna |
> | Kader | Menu ini tidak tampil |

**Dulu di:** kolom kanan layar Pengaturan, kartu kedua.

**Gunanya:** menyatakan matriks izin di tempat izin itu berlaku.

**Alasan dicabut:** sama — informasi aplikasi, bukan pengaturan.

**Risiko setelah dicabut:** kecil, dan mengecil lagi sejak kartu Kelola pengguna
ada. Matriksnya sekarang terlihat langsung sebagai perilaku: kolom Peran pada
tiap baris akun, dan kartu Kelola pengguna itu sendiri yang hanya tampil untuk
Admin. Keterangan peran di kartu Masuk dan di sidebar juga menyebutkannya.
Yang hilang hanya baris `Kader — Menu ini tidak tampil`, yang memang tidak
pernah dibaca kader (mereka tidak bisa membuka layar ini).

---

## Yang sengaja TIDAK dicabut

| Teks                                                                            | Tempat           | Alasan dipertahankan                                                                                     |
| ------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| Ada perubahan yang belum disimpan. / Semua perubahan tersimpan.                 | bilah simpan     | Umpan balik langsung (`aria-live`), bukan keterangan. Tanpa ini tidak ada tanda ada yang belum tersimpan |
| Belum ada tempat menyimpannya: tabel pengaturan_ambang belum ada di basis data. | bilah simpan     | Muncul hanya saat `onSimpan` tidak ada; menjelaskan tombol Simpan yang nonaktif                          |
| Terakhir diubah {tanggal} oleh {nama}                                           | subjudul halaman | Fakta, bukan keterangan desain                                                                           |
