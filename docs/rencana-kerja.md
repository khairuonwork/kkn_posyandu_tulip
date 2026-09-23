# Backlog Fitur Dasar

| | |
|---|---|
| **Jenis** | Penjelasan |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 21 September 2026 |

Daftar pekerjaan untuk menyelesaikan **kebutuhan inti** Portal Posyandu Tulip — kemampuan yang membuat aplikasi ini berfungsi sebagai sistem pencatatan Posyandu.

Ini **bukan** daftar fitur hasil feedback lapangan. Ketiga belas fitur itu punya daftarnya sendiri di [`prd_feedback/README.md`](prd/feedback/README.md) dan dikerjakan setelah dasarnya berdiri.

Disusun 21 September 2026, setelah migrasi teknologi selesai ([ADR-0006](adr/0006-pindah-ke-express-react-postgres.md)).

---

## Keadaan saat ini

Daftar kemampuan beserta statusnya ada di **[Fitur](fitur.md)** — satu tabel, satu tempat. Tidak diulang di sini: status yang ditulis di dua berkas selalu berakhir berbeda di salah satunya.

Ringkasnya: **tampilannya sudah jadi, mesin hitungnya sudah benar, bagian tengahnya yang kosong.** Kesembilan butir di bawah adalah bagian tengah itu, diurutkan.

---

## Backlog

### 1. Menyimpan hasil perhitungan gizi — **selesai 22 September 2026**

Sistem sudah lama bisa menghitung status gizi dengan benar, tetapi bagian penyimpanannya tertinggal saat pemindahan teknologi — itulah yang dikerjakan di sini.

Kecil, dan harus paling dulu: semua pekerjaan di bawahnya butuh tempat menaruh hasil hitungan.

**Hasilnya:** `hitungDanSimpan(pool, pengukuranId)` membaca satu pengukuran, menghitung enam indeksnya, dan menyimpannya dalam satu transaksi. Menghitung ulang menimpa, bukan menambah; indeks yang tidak lagi terhitung setelah nilai ukur dikoreksi ikut dihapus; versi standar lain tidak pernah tersentuh. Rinciannya di [B01](prd/dasar/B01-simpan-hasil-gizi.md).

Yang **belum** ada dan sengaja ditunda: endpoint HTTP-nya (menunggu butir 4 dan 5, supaya bentuk permintaannya tidak ditebak) dan pemicu otomatis saat pengukuran berubah (menunggu ada jalur yang mengubahnya).

### 2. Pencatatan riwayat perubahan — **selesai 23 September 2026**

Setiap perubahan data anak, koreksi nilai pengukuran, penggabungan profil, dan pemasukan data harus mencatat siapa yang mengubah, kapan, serta nilai sebelum dan sesudahnya.

Dikerjakan sekarang, bukan nanti: kalau ditunda, setiap fitur yang terlanjur dibuat harus dibongkar ulang satu per satu untuk menambahkan pencatatan ini.

**Hasilnya:** tabel `audit` diisi trigger basis data pada tujuh tabel yang isinya diketik manusia, jadi tidak ada jalur mutasi yang bisa lupa mencatat — termasuk perubahan lewat `psql` langsung. Identitas pelakunya dikirim aplikasi lewat variabel sesi transaksi. Rinciannya di [B02](prd/dasar/B02-jejak-audit.md), keputusannya di [ADR-0007](adr/0007-jejak-audit-lewat-trigger.md).

Yang **belum** ada: layar untuk membacanya (menunggu butir 4) dan kebijakan retensi (menunggu [OI-10](pertanyaan-terbuka.md)).

### 3. Memasukkan data arsip Excel

Memindahkan data 2025–2026 dari berkas Excel ke dalam sistem — dua bentuk berkas yang berbeda, penyeragaman nilai, pencocokan identitas anak, dan penanganan baris yang meragukan.

Prinsipnya: baris yang bersih tetap masuk, baris yang meragukan masuk daftar tunggu untuk diperiksa manusia. Sistem tidak pernah menebak.

Dikerjakan sebelum layar disambungkan, karena basis datanya sekarang kosong — menyambungkan layar ke tempat kosong membuat kita tidak bisa tahu apakah sambungannya benar-benar bekerja.

> Bila ingin melihat hasil lebih cepat, alternatifnya memasukkan sepuluh sampai dua puluh anak contoh dulu, kerjakan nomor 4, baru pemasukan data penuh. Lebih cepat terlihat, tetapi nomor 3 tetap harus dikerjakan.

### 4. Menyambungkan kelima layar ke basis data

Saat aplikasi menjadi nyata. Kelima layar berhenti menampilkan data contoh dan mulai menampilkan data sungguhan: daftar balita, pencarian dan penyaringan, detail anak beserta kurva pertumbuhannya, rekap per RT, cakupan penimbangan, dan daftar anak yang perlu perhatian.

Lompatan yang paling terlihat hasilnya. Di sisi tampilan hanya satu berkas yang berubah — memang dirancang begitu sejak awal.

### 5. Menyimpan perubahan dari layar

Mengoreksi profil anak, mengoreksi angka pengukuran, dan menambah balita baru. Tampilannya sudah lama selesai, tinggal disambungkan.

Setelah nomor 1 dan 2 berdiri, setiap koreksi otomatis menghitung ulang status gizinya dan tercatat riwayatnya.

### 6. Menangani profil ganda

Sistem menandai anak yang kemungkinan punya dua profil — misalnya karena namanya pernah salah ketik antar bulan — lalu Bidan dapat menggabungkannya menjadi satu tanpa kehilangan riwayat penimbangan.

### 7. Mengelola wilayah RT dan periode kegiatan

Menambah dan mengubah daftar RT, serta mengelola periode kegiatan bulanan. Halaman periode pernah dirancang tetapi belum pernah dibuat.

### 8. Mencatat layanan: imunisasi, Vitamin A, dan obat cacing

Jauh lebih murah daripada perkiraan semula. Dokumen lama menyatakan datanya tidak ada sehingga harus dikumpulkan dari nol; ternyata sudah tercatat lengkap di berkas data sasaran milik Bidan, per jenis vaksin beserta tanggalnya. Tinggal dimasukkan.

Aturan penyimpanannya sudah disepakati feedback: anak yang lulus atau pindah tidak dihapus, statusnya diubah, dan riwayatnya tetap tersimpan. Sistem sudah membangunnya begitu.

### 9. Mengunduh rekap ke Excel

Fiturnya pernah dibuat dan berfungsi, lalu tombolnya dicabut atas permintaan pemilik produk. Perlu keputusan sebelum dikerjakan ulang — lihat pertanyaan nomor 11 di bawah.

---

## Pertanyaan yang belum terjawab

Seluruh pertanyaan di bawah sudah dicek terhadap dokumen feedback dan **tidak terjawab di sana**. Dua pertanyaan lain yang sempat ada sudah dicoret karena feedback menjawabnya: arti kolom Gakin/Non-Gakin pada blangko F1, dan aturan retensi data anak yang lulus atau pindah.

### Menahan pekerjaan

**1. Berapa kenaikan berat minimal untuk bayi umur tiga bulan?**

Berkas Bidan menuliskan 600 gram; tabel Kemenkes yang umum beredar menyebut 800 gram. Angka ini menentukan vonis naik atau tidak naik untuk setiap bayi berumur tiga bulan.

*Menahan:* status pertumbuhan, dan rekap yang memakainya.

**2. Untuk tinggi badan yang jatuh di antara dua baris tabel, dibaca yang mana?**

Tabel standar berlangkah setengah sentimeter, sedangkan tinggi anak sering di antaranya. Ada dua cara membaca, dan keduanya sedang dipakai: Excel mengambil baris terdekat ke bawah, aplikasi menaksir di antara dua baris. Selisihnya kecil, tetapi cukup memindahkan anak yang tepat berada di garis batas antara satu kategori dan kategori berikutnya.

*Menahan:* kecocokan angka aplikasi dengan Excel saat dibandingkan berdampingan.

**3. Apa label kategori untuk lingkar lengan atas di bawah −2 SD?**

Aplikasi menghitung angkanya tetapi sengaja tidak memberi label, karena label untuk rentang gizi akut tidak boleh ditebak. Data yang ada tidak memuat satu pun kasus di rentang itu, jadi tidak bisa disimpulkan sendiri.

*Menahan:* kelengkapan tampilan enam indeks.

**4. Apakah baris kosong pada kolom pertumbuhan berarti huruf O?**

Di seluruh arsip, huruf O tidak pernah muncul sekali pun. Berkas pertumbuhan memberi petunjuk: anak yang penimbangan sebelumnya absen dikosongkan barisnya, bukan diberi huruf O. Perlu dipastikan sebelum sistem menghitungnya sendiri.

*Menahan:* ketepatan angka O pada rekap.

**5. Dari mana data desil dan status Gakin berasal?**

Apakah ikut dalam berkas dari Puskesmas, atau diisi kader saat pendaftaran. Pencarian menyeluruh di semua arsip tidak menemukan satu pun kolomnya — padahal blangko F1 menuntut pemecahan itu.

Feedback juga menanyakan hal yang sama, jadi memang belum pernah terjawab.

*Menahan:* laporan F1.

**6. Apakah kelompok desil ditampilkan di F1, atau di laporan terpisah?**

Feedback meminta F1 dipecah tiga arah: jenis kelamin, Gakin, dan kelompok desil. Blangko F1 yang ada hanya punya dua — jenis kelamin dan Gakin, tanpa kolom desil.

*Menahan:* bentuk akhir laporan F1.

### Menahan keputusan lingkup

**7. Apa itu "Atas Garis Oranye"?**

Istilah ini muncul di blangko Buku 7 berdampingan dengan "di bawah garis merah", sebagai lawan dari naik. Tidak ada di aturan Kemenkes maupun di sistem, dan ambangnya belum diketahui.

**8. Apa kepanjangan "Balita Bersinar", dan perlukah dicatat?**

Sudah diketahui bahwa itu daftar hasil kegiatan Bulan Penimbangan Balita, bukan kategori gizi. Yang belum jelas: perlukah keikutsertaannya dicatat per anak, atau cukup dianggap kegiatan tahunan di luar lingkup Portal.

**9. Checklist perkembangan: tampung yang sudah ada, atau buat sendiri?**

Pertanyaan ini berubah bentuk setelah temuan terbaru. Feedback menawarkan pilihan antara checklist ringkas buatan sendiri atau instrumen KPSP lengkap — tetapi ternyata **KPSP sudah dipakai dan hasilnya sudah dicatat** di berkas Bidan.

Jadi pertanyaannya sekarang: cukup menampung hasil KPSP yang sudah ada, atau tetap perlu checklist tersendiri di dalam aplikasi?

**10. Apakah Buku 7 masuk lingkup?**

Format laporan wajib ini ditemukan saat membedah arsip dan belum masuk daftar kebutuhan mana pun — bukan kebutuhan inti, bukan pula fitur feedback. Perlu diputuskan sebelum muncul mendadak di akhir.

**11. Tombol unduh rekap dikembalikan atau tidak?**

Dicabut atas permintaan pemilik produk. Kodenya masih ada dan berfungsi.

### Menahan rilis, bukan pekerjaan sekarang

**12. Di mana sistem ini akan dipasang?**

Belum diputuskan antara server sendiri, layanan hosting, atau layanan awan. Menentukan bentuk pemasangan dan panduan operasionalnya.

**13. Berapa lama data disimpan, dan siapa yang boleh mengekspornya?**

Aturan untuk anak yang lulus atau pindah sudah dijawab feedback dan sudah dibangun. Yang belum: berapa lama data disimpan secara keseluruhan, siapa yang berhak mengunduhnya, dan apa yang terjadi pada data pribadi setelah anak tidak lagi menjadi sasaran.

Harus selesai sebelum sistem menyimpan data sungguhan di server yang dapat diakses dari internet.

---

## Yang sudah bisa kita jawab balik

Dokumen feedback mengajukan lima pertanyaan. Tiga di antaranya kini sudah ada jawabannya, dan sebaiknya ikut dikirim agar percakapannya timbal balik:

1. **Ambang anjuran ke fasilitas kesehatan** — sudah dijawab dan ditutup pada 17 September 2026.
2. **Apakah Posyandu punya format F1 resmi** — ya, ada. Ditemukan di arsip pada 21 September 2026, lengkap 22 butir beserta kodenya. Tercatat di [`rujukan/format-laporan-f1.md`](rujukan/format-laporan-f1.md).
3. **Mode pengembangan** — terjawab oleh keadaan; migrasi teknologi sudah dikerjakan.
