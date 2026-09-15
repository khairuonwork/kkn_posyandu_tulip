# Teks keterangan yang dicabut dari layar Detail Anak

Berkas ini menampung kalimat-kalimat keterangan yang sebelumnya tercetak di
`resources/js/pages/anak/show.tsx` dan `resources/js/components/kms-chart.tsx`,
lalu dicabut atas permintaan pemilik produk supaya layarnya bersih.

**Ini penampungan, bukan keputusan akhir.** Isinya bukan hiasan: lima dari enam
kalimat di bawah menyatakan asumsi sistem atau batas data, dan prinsip P4
(`docs/05-uiux-spec.md`) menuntut asumsi semacam itu terlihat di antarmuka,
bukan hanya di basis data. Mencabutnya memindahkan beban itu ke pelatihan dan
dokumen, bukan menghapusnya. Kolom "Risiko setelah dicabut" mencatat apa yang
hilang, supaya keputusannya bisa ditinjau ulang saat produksi.

Jalan keluar yang lebih murah daripada mengembalikannya sebagai paragraf:
taruh sebagai `title`/tooltip pada elemen yang bersangkutan, atau kumpulkan di
satu panel "Tentang angka ini" yang bisa dibuka-tutup.

---

## 1. Acuan perhitungan z-score

> Acuan standar pertumbuhan WHO 2006, dihitung dari parameter LMS. Nilainya
> sama dengan tabel Permenkes No. 2 Tahun 2020. Indeks mengikuti umur anak:
> BB/PB di bawah 24 bulan, BB/TB untuk 24 bulan ke atas.

**Dulu di:** bawah tiga kartu indeks, bagian "Status pengukuran".

**Gunanya:** menjawab dua pertanyaan yang pasti muncul saat bidan membandingkan
angka aplikasi dengan tabel cetak — acuannya apa, dan kenapa label indeksnya
berubah-ubah antar anak.

**Risiko setelah dicabut:** label kartu berganti sendiri antara BB/PB dan BB/TB
menurut umur anak tanpa satu pun keterangan. Perbedaan dengan tabel Permenkes
yang dipegang bidan tidak lagi punya penjelasan di layar.

## 2. Asumsi cara ukur

> Cara ukur {jenisUkur}: panjang badan, telentang. Berkas sumber tidak
> mencatatnya.
>
> (atau "tinggi badan, berdiri" untuk anak 24 bulan ke atas)

**Dulu di:** paragraf terakhir bagian "Status pengukuran", hanya muncul bila
`catatanUkur.jenisUkur` ada.

**Gunanya:** menyatakan bahwa cara ukur **disimpulkan dari umur**, bukan dibaca
dari arsip. Panjang badan telentang dan tinggi badan berdiri berbeda sekitar
0,7 cm, dan selisih itu masuk ke z-score.

**Risiko setelah dicabut:** ini satu-satunya tempat asumsi tersebut terlihat.
Setelah dicabut, angka hasil asumsi tidak bisa dibedakan dari angka hasil
pencatatan — persis yang dilarang prinsip P4.

## 3. Arti kolom Pertumbuhan

> Kolom Pertumbuhan menampilkan huruf N, T, O, dan B apa adanya dari arsip.
> Aturan 1T/2T/3T belum diterapkan karena definisinya masih dikonfirmasi.

**Dulu di:** bawah tabel "Riwayat pengukuran".

**Gunanya:** menyatakan bahwa huruf N/T/O/B diteruskan apa adanya, dan bahwa
aturan lanjutannya belum jalan. Terkait OI-01 di `docs/99-open-issues.md`.

**Risiko setelah dicabut:** tabel menampilkan "T, tidak naik" berturut-turut
tanpa memberi tahu bahwa aplikasi belum menghitung 2T atau 3T. Kader bisa
menyangka sistem sudah menandainya.

## 4. Imunisasi dan catatan bidan

> Belum ada catatan imunisasi maupun catatan bidan untuk anak ini. Detail per
> vaksin ada di Buku KIA fisik; aplikasi hanya menyimpan status ringkas.

**Dulu di:** kaki halaman, di luar blok pengukuran.

**Gunanya:** menjelaskan ketiadaan dua bagian yang ada di artboard Prototipe v2
tetapi tidak punya kolom di basis data.

**Risiko setelah dicabut:** paling kecil di antara keenamnya. Bagian yang tidak
pernah dirender tidak meninggalkan lubang yang terlihat. Cabut permanen begitu
kolom imunisasi benar-benar diputuskan tidak akan ada.

## 5. Keterangan kurva KMS

> Garis anak terputus pada bulan tanpa penimbangan. Pita mengikuti standar
> WHO 2006 yang dipakai KMS Buku KIA.

**Dulu di:** bawah legenda pita SD, di dalam `KmsChart`.

**Gunanya:** menjelaskan putusnya garis. Tanpa ini, garis terputus terbaca
sebagai galat render, bukan sebagai bulan anak tidak hadir.

**Risiko setelah dicabut:** cukup besar. Dua puluh dua dari 101 anak punya
bulan bolong, jadi garis terputus adalah keadaan yang sering terlihat.

---

## Yang sengaja TIDAK dicabut

Ketiganya instruksi pemakaian, bukan keterangan data. Mencabutnya menghilangkan
satu-satunya tanda bahwa sebuah kontrol bisa dipakai, dan itu melanggar prinsip
P1 — tidak boleh ada gerakan tersembunyi.

| Teks                                                      | Tempat                                    | Alasan dipertahankan                                  |
| --------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| Pilih tanggal untuk menyorot titiknya pada kurva di atas. | strip kepala Riwayat                      | Satu-satunya tanda bahwa tanggal di tabel bisa diklik |
| Geser kurva ke samping untuk melihat bulan berikutnya.    | atas kurva, hanya di bawah 640 px         | Di ponsel kurva lebih lebar daripada layar            |
| Tabel ini lebih lebar daripada layar. Geser ke samping …  | atas tabel Riwayat, hanya di bawah 768 px | Sama, untuk kolom z-score                             |
