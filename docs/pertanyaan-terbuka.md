# Pertanyaan terbuka

| | |
|---|---|
| **Jenis** | Rujukan — isu terbuka |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 29 September 2026 |

Daftar hal yang **belum diputuskan** dan sengaja tidak ditebak di dalam kode. Setiap isu punya pemilik, dampak bila tidak selesai, dan apa yang dilakukan sistem sementara ini. Nomor isu disebut `OI-nn` (*open issue*).

Status: `terbuka` · `menunggu konfirmasi` · `sebagian selesai`. Isu yang sudah terjawab dipindah ke [Pertanyaan yang sudah terjawab](riwayat/pertanyaan-terjawab.md); nomornya tidak dipakai ulang.

---

## OI-01 — Definisi `NTOB` dan aturan `1T/2T/3T`

| | |
|---|---|
| **Status** | **sebagian selesai** — 21 September 2026; tersisa satu angka dan tiga pertanyaan tindak lanjut (26 September 2026) |
| **Pemilik** | Bidan / pemilik program |
| **Menghambat** | FR-26 (daftar tindak lanjut otomatis) dan kalimat vonis kartu Status di Detail Balita |

Kolom `NTOB` muncul di seluruh berkas arsip dengan nilai seperti `N`, `T`, dan `" N"` (berspasi). Dugaan yang wajar: **N**aik, **T**idak naik, **O** tidak ditimbang bulan lalu, **B**aru pertama kali. `1T/2T/3T` diduga berarti berat tidak naik satu, dua, atau tiga kali berturut-turut.

Dugaan ini **belum dikonfirmasi**, dan konsekuensi salah tebak bersifat dua arah: menandai anak sehat sebagai bermasalah akan menimbulkan kecemasan orang tua yang tidak perlu, sedangkan gagal menandai anak bermasalah akan menunda intervensi.

**Pembaruan 9 September 2026.** Prototipe desain Portal di `docs/design/` memakai definisi ini secara langsung, persis seperti dugaan di atas: chip `N, naik` · `T, tidak naik` · `O, tidak ditimbang bulan lalu` · `B, baru pertama`. Layar Laporan bahkan sudah memuat kolom `N T O B` per RT beserta `BGM`, dengan keterangan bahwa BGM dihitung dari BB/U.

Artboard `Portal Posyandu - Layar Kader` menguatkannya lagi: layar Laporan memuat kolom `N T O B` per RT dengan baris `Total`, dan kartu KPI `Naik, N` diberi keterangan eksplisit **`Berat naik memenuhi KBM dibanding bulan lalu`** — jadi KBM memang dasar penentuannya.

Ini menguatkan dugaan, tetapi **belum menutup isunya**: yang belum ada tetap tabel KBM per umur yang dipakai, dan apakah 1T/2T/3T dihitung dari penimbangan berturut-turut atau bulan kalender berturut-turut. Dua anak yang sama-sama "tidak naik dua kali" bisa berbeda artinya bila salah satunya bolong sebulan.

**Pembaruan 21 September 2026 — ketiga pertanyaan terjawab dari berkas pemilik program.** Ditemukan saat membedah `Output Laporan/`. Rinciannya di [04 bagian 10](rujukan/antropometri.md); ringkasnya:

| Yang ditanyakan | Jawaban | Sumber |
|---|---|---|
| Definisi resmi tiap huruf | `N` naik memenuhi KBM atau mengikuti garis pertumbuhan · `T` sebaliknya · `O` ditimbang bulan ini tetapi tidak bulan lalu · `B` baru pertama kali ditimbang | `FILE PERTUMBUHAN ANAK 2025-2026.xlsx` sheet `DATA ANAK`; `F1 revised format proposal.xlsx` butir 3–6 |
| Tabel KBM per umur | 1 bln 800 g · 2 bln 900 g · 3 bln 600 g · 4 bln 600 g · 5 bln 500 g · 6 bln 400 g · 7–10 bln 300 g · 11–60 bln 200 g | sheet `DATA ANAK` baris 16 dan 28 |
| 1T/2T/3T — penimbangan atau bulan kalender? | **penimbangan berturut-turut.** Blangko F1 hanya mengenal `2T`; `1T` dan `3T` tidak muncul sama sekali | `F1 revised format proposal.xlsx` butir 10 |

Ikut ditemukan, dan lebih berguna daripada yang ditanyakan: blangko F1 butir 7 menyatakan **`D = N + T + O + B`**. Keempat status saling lepas dan menutup, sehingga rekap punya pemeriksaan mandiri yang murah.

Petunjuk soal `O` yang tidak pernah muncul di arsip: pada sheet `DATA ANAK`, anak yang penimbangan sebelumnya absen **dikosongkan** baris `N/T`-nya, bukan diberi huruf `O`. Sebagian dari 13 baris `NTOB` kosong di arsip kemungkinan kasus `O`. Belum dikonfirmasi, tidak dipakai mengisi data.

**Sementara ini:** `pengukuran.ntob_raw` menyimpan nilai mentah setelah di-*trim*, dan prototipe desain menampilkannya apa adanya di kolom `Pertumbuhan`. Tidak ada logika turunan sama sekali. Daftar tindak lanjut disusun dari kategori status gizi saja. Aturannya kini diketahui tetapi **belum diterapkan** — penerapannya menunggu satu angka di bawah.

**Yang masih dibutuhkan — satu angka.** KBM bulan ke-3 tertulis **600 g** di berkas, sedangkan tabel Kemenkes yang lazim beredar menyebut **800 g** (pola 800 · 900 · 800 · 600 · 500 · 400). Angka ini menentukan vonis `N`/`T` setiap bayi berumur tiga bulan. Perlu konfirmasi apakah 600 disengaja atau salah ketik.

**Dua hal kecil yang menyertainya.** Cabang "mengikuti garis pertumbuhan" pada definisi `N` menuntut pembacaan bentuk kurva dan tidak akan diterjemahkan menjadi kode — implementasi memakai cabang KBM saja, dan perbedaannya dicatat di [04 bagian 10.4](rujukan/antropometri.md). Buku 7 juga memakai istilah **"Atas Garis Oranye"** berdampingan dengan BGM sebagai lawan `Naik (N)`; istilah itu tidak ada di PMK 2/2020 maupun di kode, dan ambangnya belum ditanyakan.

**Pembaruan 26 September 2026 — tiga pertanyaan baru dari peninjauan teks mockup.** Muncul saat meninjau teks antarmuka mockup Portal di Claude Design. Pada data contoh, satu balita tercatat `T` di arsip pada penimbangan Mei dan Juni 2026 — jadi `2T` menurut aturan di atas — sementara status gizinya `Gizi baik`. Kartu Status di mockup Detail Balita berbunyi *"Tidak perlu tindak lanjut bulan ini"*, karena vonisnya disusun dari status gizi saja. Pengguna memutuskan pada tanggal yang sama: kalimat vonis dan isi Beranda **tidak diubah** sampai Bidan menjawab.

| Pertanyaan | Mengapa perlu dijawab | Usulan |
|---|---|---|
| Apa tindak lanjut untuk balita `2T` yang status gizinya baik? | Menentukan kalimat vonis kartu Status di Detail Balita. Kalimat sekarang menyatakan tidak perlu tindak lanjut. | *"Berat tidak naik 2 kali berturut-turut. Perlu diperiksa bidan."* dengan kotak kuning, atau *"Rujuk ke Puskesmas."* bila itu aturannya. Terkait [OI-14](#oi-14--rujukan-ke-puskesmas-belum-ada-di-mana-pun). |
| Apakah balita `2T` masuk daftar `Perlu perhatian` di Beranda? | Daftar itu kini disusun dari kategori status gizi saja, padahal rancangan Beranda tahap demo ([`riwayat/layar-demo.md`](riwayat/layar-demo.md) bagian 6.3) sudah mencontohkan alasan serupa: *"Berat sama dua bulan berturut"*. | Ditambahkan dengan alasan *"Berat tidak naik 2 kali berturut-turut"*. |
| Bila arsip menandai `N` padahal kenaikannya di bawah KBM, layar mengikuti arsip atau tabel KBM? | Pada balita yang sama, penimbangan April 2026 tertulis `N` dengan kenaikan 0,27 kg pada umur 6 bulan — di bawah KBM umur itu ([04 bagian 10.2](rujukan/antropometri.md)). Kemungkinan kader membaca bentuk kurva, cabang yang sengaja tidak diterjemahkan ke kode ([04 bagian 10.4](rujukan/antropometri.md)). | Layar tetap menampilkan nilai arsip apa adanya sampai dijawab. |

---

## OI-02 — Arti kategori "Balita Bersinar"

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | Bidan / pemilik program |
| **Menghambat** | tidak ada di MVP |

Kategori ini muncul di `6-JUNI GIZI 2026.xlsx` berdampingan dengan "balita khusus" dan pemberian obat cacing. Belum jelas apakah ini kategori status gizi, penanda program lokal, atau daftar penerima intervensi.

**Pembaruan 21 September 2026 — bukan kategori status gizi.** Sheet `BALITA BERSINAR JUNI 2026` berjudul *"Data Balita Hasil Bulan Penimbangan Balita (BPB)"*. Isinya daftar anak beserta BB, TB, IMT, dan keempat kategori indeks — jadi ini **daftar hasil kegiatan BPB**, bukan label gizi tersendiri. Kolom `TAMBAHAN KETERANGAN` memuat penanda keikutsertaan seperti `BARU` dan `MULAI MEI`.

Yang perlu diperhatikan: sheet itu memakai kosakata label yang berbeda lagi — `BB Normal` untuk BB/U dan **`Gemuk`** untuk IMT/U, sedangkan aplikasi memakai `Berat badan normal` dan `Gizi lebih`/`Obesitas`. Ini menambah satu baris lagi pada tabel perbedaan kosakata di [OI-11](#oi-11--kosakata-label-status-berbeda-dari-master-excel).

**Sementara ini:** tidak dimodelkan. Bila ternyata merupakan penanda per anak per periode, tabel `layanan` sudah dapat menampungnya tanpa migrasi skema.

**Yang masih dibutuhkan:** kepanjangan "Bersinar" dan apakah keikutsertaan BPB perlu dicatat per anak, atau cukup sebagai kegiatan tahunan di luar lingkup Portal.

---

## OI-03 — Mekanisme aliran data Portal ↔ Aplikasi Tablet

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | pemilik program + tim pengembang |
| **Menghambat** | perencanaan Fase berikutnya, bukan MVP |

Tiga kemungkinan: basis data bersama, impor berkala, atau API sinkronisasi. Rinciannya di [ADR-0003](adr/0003-batas-portal-vs-aplikasi-tablet.md).

**Sementara ini:** data model dibuat netral. `pengukuran.sumber` sudah menyediakan nilai `tablet`, dan *constraint* `unique(anak_id, periode_id)` membuat pengiriman ulang bersifat *idempotent* apa pun jalurnya.

**Perlu diputuskan sebelum** pembangunan Aplikasi Tablet dimulai, karena menentukan apakah kontrak API perlu dirancang.

---

## OI-04 — Kategori status untuk LILA/U

| | |
|---|---|
| **Status** | menunggu konfirmasi |
| **Pemilik** | Bidan / TPG Puskesmas |
| **Menghambat** | FR-17 untuk indeks `LILA_U` saja |

PMK 2/2020 menyediakan tabel standar LILA menurut umur, tetapi praktik lapangan umumnya memakai ambang LILA **absolut** — misalnya di bawah 11,5 cm sebagai gizi buruk akut — dan bukan kategori berbasis z-score.

Pemeriksaan sheet `JUN_LILA_U` pada master Juni 2026 menunjukkan pemilik program **memang memakai pendekatan z-score** dan memberi label, tetapi hanya dua label yang muncul pada data:

| Label | Jumlah baris | Rentang z teramati |
|---|---:|---|
| Normal | 76 | −1,681 … 1,777 |
| Gemuk | 13 | 2,161 … 4,588 |

Ambang atasnya jelas berada di sekitar `+2 SD`. Ambang bawahnya **tidak dapat disimpulkan** karena tidak ada satu pun anak ber-z di bawah −1,7 pada periode itu — persis rentang yang paling penting (gizi akut).

Sheet yang sama juga membatasi indeks ini pada umur ≥ 6 bulan; anak di bawahnya ditandai `USIA <6BLN`. Batas itu sudah diterapkan di `Indeks::umurMinimum()`.

**Sementara ini:** z-score `LILA_U` dihitung dan ditampilkan sebagai angka. Kolom `kategori` dibiarkan `NULL`. Menebak label untuk rentang gizi akut dari data yang tidak memuat satu pun kasusnya bukan pilihan yang aman.

**Yang dibutuhkan:** label untuk rentang di bawah −2 SD beserta ambangnya, atau konfirmasi bahwa ambang LILA absolut yang dipakai untuk kasus gizi akut.

---

## OI-05 — Kolom `L` konstan pada tabel LMS BB/TB

| | |
|---|---|
| **Status** | menunggu konfirmasi |
| **Pemilik** | pemilik berkas standar |
| **Menghambat** | akurasi `BB_TB`, dan kriteria keberhasilan S1 |

Verifikasi isi `ref kemenkes & who.xlsx` menunjukkan kolom `L` bernilai konstan sepanjang seluruh 151 baris pada kedua tabel BB/TB:

| Tabel | Nilai `L` | Rentang |
|---|---|---|
| `LMS_BB_PER_TB_L` (laki-laki) | −0,3521 pada semua baris | 45,0–120,0 cm |
| `LMS_BB_PER_TB_P` (perempuan) | −0,3833 pada semua baris | 45,0–120,0 cm |

Standar WHO memisahkan indeks ini menjadi dua kurva — *weight-for-length* (telentang, 45–110 cm) dan *weight-for-height* (berdiri, 65–120 cm) — dengan parameter `L` yang berbeda. Kolom `M` dan `S` pada berkas berubah sepanjang baris sebagaimana mestinya; hanya `L` yang konstan. Pola ini konsisten dengan satu nilai yang tersalin ke seluruh kolom.

**Sementara ini:** *seed* mengambil berkas apa adanya, tanpa koreksi. Berkas ini adalah standar yang sedang dipakai program, dan kriteria S1 justru menuntut kecocokan dengan perhitungan yang berjalan. Mengoreksinya sepihak akan membuat angka aplikasi berbeda dari laporan yang sudah disahkan.

Skema `standar_lms` menyimpan `l` per baris, sehingga koreksi nanti cukup dilakukan dengan *seed* versi standar baru — tanpa perubahan skema maupun kode.

**Yang dibutuhkan:** konfirmasi apakah nilai `L` memang disengaja, atau perlu diganti dengan nilai per-kurva dari sumber WHO resmi. Bila diganti, hasil historis tetap aman karena setiap penilaian menyimpan versi standarnya (DR-06).

---

## OI-06 — Target deployment

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | pemilik program |
| **Menghambat** | Panduan Operasional (Fase 5) |

Belum diputuskan antara VPS, *shared hosting*, atau PaaS. Untuk saat ini sistem berjalan lokal: server Node pada porta 4321 dan PostgreSQL lewat Docker.

**Sementara ini:** panduan operasional ditulis generik terhadap *tempat* pemasangan, bukan terhadap basis datanya. Basis datanya sendiri sudah tidak netral: PostgreSQL adalah satu-satunya yang didukung, dan migrasi memang memakai fitur khasnya (NFR-09, [ADR-0006](adr/0006-pindah-ke-express-react-postgres.md)). Yang perlu dipastikan dari calon tempat pemasangan karena itu adalah ketersediaan PostgreSQL 17.

**Perlu diputuskan sebelum** data sungguhan disimpan, karena menyangkut lokasi *backup* dan tanggung jawab keamanan data pribadi anak.

---

## OI-07 — Struktur format F1 Gizi dan Buku 7

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | tim pengembang |
| **Menghambat** | fitur Fase 2, bukan MVP |

Export F1 dan Buku 7 ditunda dari MVP karena strukturnya belum dibedah. Berkas rujukan: `1-JANUARI F1 2026.xlsx` sampai `4-APRIL F1 2026_FINAL.xlsx`, `F1 revised format proposal.xlsx`, dan `3_rekap buku 7_shared.xlsx`.

Catatan penting: `F1 revised format proposal.xlsx` menunjukkan formatnya sedang direvisi. Membangun *export* terhadap format yang masih berubah akan menghasilkan pekerjaan yang segera usang.

Desainer sendiri menyatakan hal yang sama pada artboard `Portal Posyandu - Layar Kader`, tertulis di atas layar Laporan: *"Rekap yang saya rancang dari model data Anda, bukan format baku. Kalau Puskesmas punya format resmi yang harus diikuti, kirim kolomnya dan saya sesuaikan."*

Jadi bentuk rekap per RT yang ada sekarang — `S D D/S N T O B BGM` — adalah rancangan, bukan salinan format resmi. Kebetulan bentuknya memang menyerupai Buku 7, tetapi kecocokan kolomnya belum diverifikasi ke Puskesmas.

**Pembaruan 21 September 2026 — strukturnya sudah dibedah.** Kedua blangko kini tercatat penuh di [`rujukan/format-laporan-f1.md`](rujukan/format-laporan-f1.md): F1 dengan 22 butir beserta kodenya, dan Buku 7 beserta **sumber data tiap butir** yang ditulis sendiri oleh pengisinya.

Tiga hal yang mengubah rancangan, bukan sekadar melengkapinya:

1. **F1 memecah angka tiga arah** — lima kelompok umur (`0–5`, `6–11`, `12–23`, `24–35`, `36–59` bulan) × `G`/`NG` × `L`/`P`. Rekap Portal saat ini dipecah per RT, dan RT sama sekali tidak muncul di F1.
2. **Gizi buruk dan gizi kurang di F1 dihitung dari `BB/U`**, sedangkan kartu Beranda Portal memakai `BB/TB`. Angkanya akan berbeda, dan laporan tidak boleh mengambil dari kartu itu.
3. **Buku 7 memakai pengelompokan umur yang lain lagi** (`0–6 bln` dan `≥6 bln–6 thn`) dan mencakup APRAS sampai 6 tahun — melewati batas 59 bulan yang dipakai definisi sasaran Portal.

Peringatan bahwa formatnya masih berubah **tetap berlaku**: berkasnya masih bernama `revised format proposal`. Yang berubah hanyalah bahwa strukturnya kini diketahui, sehingga keputusan menunda dapat diambil dengan sadar.

**Sementara ini:** MVP menyediakan rekap dan *export* CSV generik yang memuat seluruh data mentah yang dibutuhkan untuk menyusun F1 secara manual.

---

## OI-09 — Nama orang tua dalam satu sel

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | tim pengembang |
| **Menghambat** | tidak ada di MVP |

Kolom `NAMA ORTU` kadang memuat dua nama sekaligus, dipisah tanda hubung — bentuknya `NAMA AYAH - NAMA IBU`. (Contoh sungguhan dari arsip sengaja tidak disalin ke sini; lihat [OI-10](#oi-10--kebijakan-retensi-dan-privasi-data).) Belum jelas apakah sistem perlu memisahkan ayah dan ibu menjadi dua entitas.

**Sementara ini:** disimpan apa adanya sebagai satu `orang_tua.nama`. Pemisahan ditunda sampai ada kebutuhan yang benar-benar menuntutnya — memecah nama berdasarkan tanda hubung akan salah pada nama yang memang mengandung tanda hubung.

---

## OI-10 — Kebijakan retensi dan privasi data

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | pemilik program / Puskesmas |
| **Menghambat** | rilis produksi |

Sistem menyimpan NIK anak dan orang tua serta data kesehatan anak. Belum ada kebijakan tertulis mengenai berapa lama data disimpan, siapa yang berhak mengekspornya, dan apa yang terjadi saat anak lulus dari Posyandu.

**Sementara ini:** akses dibatasi autentikasi dan peran (FR-33, FR-34), seluruh perubahan tercatat di jejak audit (FR-35), dan `anak.status` sudah membedakan `aktif` dari `lulus`, `pindah`, dan `meninggal`.

**Perlu diselesaikan sebelum** sistem menyimpan data sungguhan di server yang dapat diakses dari internet.

---

## OI-11 — Kosakata label status berbeda dari master Excel

| | |
|---|---|
| **Status** | menunggu konfirmasi |
| **Pemilik** | Bidan / pemilik program |
| **Menghambat** | keterbacaan laporan oleh Puskesmas, bukan kebenaran perhitungan |

Verifikasi terhadap master Juni 2026 memperlihatkan label status yang dipakai berkas berjalan tidak seluruhnya sama dengan PMK 2/2020 yang dipakai aplikasi.

| Indeks | Label di master Excel | Label aplikasi (PMK 2/2020) | Catatan |
|---|---|---|---|
| BB/U | `BB Kurang`, `BB Normal`, `BB Lebih` | `Berat badan kurang`, `Berat badan normal`, `Risiko berat badan lebih` | Perbedaan penulisan. `BB Lebih` dipakai untuk `z > +1`, padahal PMK menyebutnya *risiko* berat badan lebih. |
| TB/U | `Pendek`, `Tinggi` | `Sangat pendek`, `Pendek`, `Normal`, `Tinggi` | **Perbedaan ambang, bukan sekadar penulisan.** Lihat di bawah. |
| BB/TB | `B-Gizi Baik`, `RGL-Resiko Gizi Lebih`, `GL-Gizi Lebih`, `O-Obesitas` | `Gizi baik`, `Berisiko gizi lebih`, `Gizi lebih`, `Obesitas` | Sama, hanya berawalan kode. |
| IMT/U | `Gizi Kurang`, `Gizi Baik`, `Beresiko Gizi Lebih`, `Gizi Lebih`, `Obesitas` | sama | Cocok. |
| LIKA/U | `Normal`, `Lebih` | `Normal`, `Makrosefali` | Perbedaan penulisan. |

### Temuan yang perlu perhatian: ambang "Tinggi" pada TB/U

Pada sheet `JUN_TB_U`, empat anak diberi label `Tinggi` dengan z-score **+1,16 sampai +1,76**. PMK 2/2020 menetapkan `Tinggi` untuk `z > +3 SD`; pada rentang +1,16 sampai +1,76 kategorinya adalah **Normal**.

Perbedaan ini tidak mempengaruhi deteksi *stunting* — label `Pendek` pada berkas itu konsisten dengan `z < -2` dan sudah benar. Namun laporan yang memakai ambang tersebut akan melaporkan anak bertubuh normal sebagai bertubuh tinggi.

**Sementara ini:** aplikasi memakai ambang PMK 2/2020 sebagaimana ditetapkan [ADR-0002](adr/0002-metode-z-score-who-lms.md). Label aplikasi karena itu **akan berbeda** dari master Excel untuk keempat anak tersebut.

**Yang dibutuhkan:** konfirmasi bahwa ambang PMK yang dipakai, dan keputusan apakah penulisan label aplikasi perlu disesuaikan dengan kebiasaan Puskesmas (mis. `BB Kurang` alih-alih `Berat badan kurang`). Penyesuaian penulisan cukup mengubah `server/src/antropometri/kategori.ts` — satu berkas, tanpa migrasi data.

---

## OI-12 — Privasi data demo pada link publik

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | pemilik program |
| **Menghambat** | deploy demo ke link publik, bukan demo di laptop |

Data demo mengganti nama dan NIK, tetapi mempertahankan tanggal lahir, RT, jenis kelamin, dan seluruh nilai ukur — karena menggesernya akan mengubah umur, dan umur menentukan seluruh z-score. Kecocokan angka dengan arsip adalah bukti terkuat saat demo.

Untuk demo di laptop di hadapan pemilik data, ini tidak bermasalah. Untuk link yang dapat dibuka siapa saja, kombinasi tanggal lahir + RT + jenis kelamin pada satu RW masih berpeluang ditelusuri oleh orang setempat.

**Sementara ini:** demo hanya dijalankan lokal — diputuskan 9 September 2026. Selama demo berjalan dari laptop di hadapan pemilik data, isu ini tidak mengikat. Yang mengikat baru muncul saat link dibagikan.

Build statis tetap bisa dihasilkan kapan pun (`npm run demo:build` di `client/`), tetapi tidak diunggah ke mana pun.

**Yang dibutuhkan:** pilih salah satu — link berkata sandi (dianjurkan, gratis di Netlify/Vercel), deploy terbuka dengan izin pemilik program, atau dataset kedua yang digeser khusus untuk publik.

Rinciannya di [Data contoh](rujukan/data-contoh.md#2-anonimisasi).

---

## OI-13 — Dua penyimpangan pada prototipe desain Portal

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | tim pengembang |
| **Menghambat** | kebenaran status gizi pada prototipe desain, bukan pada backend |

Ditemukan saat membaca `docs/design/portal-prototipe.html`. Keduanya ada di prototipe desain, bukan di mesin hitung server.

**1. `wflClass()` tidak punya cabang Obesitas.** Fungsinya berhenti di `Gizi lebih` untuk seluruh `z > +2`:

```js
if (z <= 2) return { label: 'Berisiko gizi lebih', ... };
return { label: 'Gizi lebih', ... };   // tidak ada cabang z > 3
```

Sistem desainnya sendiri mencantumkan `Obesitas` untuk di atas +3 SD dengan nada merah, jadi ini kelalaian kode, bukan keputusan desain. Data Juni 2026 memuat **tiga anak obesitas** — di prototipe desain mereka terbaca `Gizi lebih`, satu tingkat lebih ringan dari keadaan sebenarnya.

**2. Nada warna prototipe desain tidak cocok dengan sistem desainnya.** `wazClass()` memakai oranye untuk `Risiko berat badan lebih` dan `wflClass()` memakai oranye untuk `Berisiko gizi lebih`, sedangkan sistem desain menetapkan biru untuk keduanya. Akibatnya kategori yang sekadar perlu dicatat terbaca sebagai perlu perhatian.

**Keputusan:** implementasi mengikuti tabel pada [`rujukan/ui-ux.md`](rujukan/ui-ux.md) bagian 3 — yaitu sistem desain dan PMK 2/2020 — bukan kode prototipe desain. Mesin hitung server (`server/src/antropometri/kategori.ts`) sudah benar.

**Yang dibutuhkan:** konfirmasi bahwa perbedaan ini memang kekeliruan prototipe desain, lalu perbaiki di Claude Design agar prototipe desain dan implementasi tidak berselisih.

---

## OI-14 — Rujukan ke Puskesmas belum ada di mana pun

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | Bidan / pemilik program |
| **Menghambat** | tidak ada di demo, tetapi berakibat pada anak di produk nyata |

Butir T1 pada `Catatan Posyandu - Daftar Temuan`. Desainer menempatkannya di urutan pertama dan memberinya catatan yang tidak diberikan pada butir lain:

> *"Satu-satunya kekurangan yang berakibat pada anaknya, bukan pada kerapian data."*

Isinya: tombol rujuk di detail anak dan di form ukur, penanda sudah dirujuk atau belum, dan daftar yang harus dikejar bulan depan. Saat ini gizi buruk, BGM, dan 2T berhenti sebagai chip berwarna — sistem menandai masalahnya, lalu diam.

**Keputusan 9 September 2026: tidak masuk demo.** Demo berfokus pada membaca dan melaporkan.

**Sementara ini:** daftar `Perlu perhatian` di Beranda tetap menampilkan anak bermasalah beserta alasannya, sehingga informasinya sampai — hanya tindak lanjutnya yang belum tercatat di sistem.

**Yang dibutuhkan:** keputusan apakah rujukan masuk lingkup produk, dan bila ya, siapa yang menandai serta apa yang terjadi setelahnya. Ini pertanyaan alur kerja Posyandu, bukan pertanyaan teknis.

---

## OI-15 — Imunisasi: dicatat dari aplikasi atau tetap di buku?

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | Bidan |
| **Menghambat** | lingkup produk, bukan demo |

Butir P3 pada daftar temuan desainer. Saat ini imunisasi hanya **disebut** di layar: Detail Balita menulis `Imunisasi: belum diperiksa`, dan Penimbangan mengingatkan `Imunisasi: periksa Buku KIA`. Rincian per vaksin tetap di Buku KIA fisik.

Pertanyaannya: apakah aplikasi perlu bisa mencatatnya, atau cukup menampilkan dan biarkan bidan memegangnya di buku sendiri.

**Sementara ini:** tabel `layanan` pada [Basis Data](database.md) sudah dapat menampung pencatatan per jenis bila nanti dibutuhkan, jadi keputusan ini tidak menuntut migrasi skema.

**Catatan lama, kini keliru:** *"berkas impor utama tidak memuat kolom imunisasi sama sekali"*. Benar untuk `REKAP TAHUN 2026/` yang dipakai demo, salah untuk arsip secara keseluruhan.

**Pembaruan 21 September 2026 — datanya ada, dan lebih rinci dari yang dibayangkan.** `Output Laporan/00_DATA SASARAN JAN_JUNI 2026 .xlsx` mencatat imunisasi **per antigen beserta tanggal pemberiannya**: HepB, BCG, Polio 1–4, DPT-HB-Hib 1–3, RV 1–3, PCV 1–3, IPV 1–2, MR, serta DPT-HB-Hib dan MR lanjutan. Daftar kolom lengkapnya di [06 bagian 10](rujukan/migrasi-data.md).

Ini mengubah bentuk pertanyaannya. Semula: "perlu dicatat di aplikasi atau tetap di buku?" Sekarang: **sudah dicatat, di berkas Excel tersendiri** — jadi yang ditanyakan adalah apakah pencatatan itu pindah ke Portal, atau Portal cukup mengimpornya.

Dua hal yang perlu ikut diputuskan bila jawabannya "pindah":

- Kolomnya berisi tanggal, bukan ya/tidak — sehingga status "lengkap sesuai umur" dapat **dihitung**, bukan disalin. Itu jauh lebih berguna, dan juga lebih mahal.
- Penolakan orang tua adalah keadaan tersendiri. Berkasnya memuat `TIDAK PERNAH IMUNISASI (ORTU MENOLAK)` dan `ORANG TUA MENOLAK IMUNISASI`; menyamakannya dengan sel kosong akan menghapus informasi yang justru paling perlu ditindaklanjuti.

Yang mendesakkan keputusan ini: **Buku 7 menuntut angka imunisasi**, dan keterangan di berkasnya menyebut angka itu *"mulai diisi bulan Mei dengan menanyakan kepada ortu pada waktu kegiatan posyandu"* — artinya saat ini dikumpulkan lisan, per kegiatan.

---

## OI-17 — Sumber data status desil dan kategori Gakin

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | Bidan / Puskesmas |
| **Menghambat** | [F08](prd/feedback/README.md) atribut sosio-ekonomi, [F09](prd/feedback/README.md) rekap F1 |

Feedback lapangan meminta rekap F1 dipecah menurut **status desil**, **jenis kelamin**, dan **kategori Gakin / Non-Gakin**.

**Konfirmasi pengguna, 23 September 2026, dalam percakapan peninjauan dokumentasi:** arti `G`/`NG` belum dikonfirmasi oleh Bidan/Puskesmas; sumber data desil dan status Gakin setiap keluarga belum diputuskan. Jawaban ini menetapkan keadaan pertanyaannya, bukan mengesahkan pemetaan kolom atau memilih sumber data.

| Pertanyaan | Status | Dampak |
|---|---|---|
| Apakah `G` = Gakin dan `NG` = Non-Gakin pada blangko F1? | Belum dikonfirmasi | Pemetaan kategori F08 ke kolom resmi F1 pada F09 belum dapat ditetapkan |
| Dari mana nilai desil dan Gakin setiap keluarga diperoleh, serta siapa yang mengisinya? | Belum diputuskan | Jalur pengisian/impor dan pihak yang berwenang memelihara data F08 belum dapat ditetapkan; sumber kedua atribut boleh berbeda |

Kedua pertanyaan diputuskan secara terpisah. Mengetahui arti kolom tidak menyediakan data untuk mengisinya. Ketika salah satunya terjawab, perbarui baris terkait beserta sumber dan tanggal keputusan; OI-17 tetap terbuka sampai keduanya selesai.

Jenis kelamin sudah ada di data sejak impor. Dua yang lain **tidak ada sama sekali** — tidak di berkas arsip mana pun, tidak di master Juni 2026.

**Pembaruan 21 September 2026 — permintaannya bukan sekadar permintaan pemilik program, melainkan tuntutan blangko.** Blangko F1 memecah butir 1–12 menurut kolom `G` dan `NG` pada tiap kelompok umur ([15 bagian 2.2](rujukan/format-laporan-f1.md)). Kedua huruf itu **tidak diberi keterangan** di berkas mana pun; pembacaan `Gakin` / `Non-Gakin` masuk akal tetapi tetap dugaan.

Pencarian menyeluruh atas ketiga folder arsip untuk kata `gakin`, `desil`, `miskin`, dan `non-g` **tidak menemukan satu pun kecocokan**. Jadi blangkonya menuntut pemecahan yang datanya belum pernah dikumpulkan — konsisten dengan dugaan bahwa selama ini kolom itu diisi tangan atau dikosongkan.

Satu pertanyaan tambahan karena itu: konfirmasi bahwa `G`/`NG` memang Gakin/Non-Gakin, sebelum kolom apa pun dibuat atas dasar tebakan.

Pertanyaannya bukan teknis melainkan alur kerja: **siapa yang tahu angkanya.**

| Kemungkinan | Akibatnya pada rancangan |
|---|---|
| Ikut berkas data sasaran dari Puskesmas | Kolom hanya dibaca, kader tidak pernah mengubahnya. Butuh satu berkas contoh untuk tahu bentuk kolomnya. |
| Diisi kader saat pendaftaran | Kolom dapat diubah, butuh isian di editor baris, dan butuh keadaan "belum tercatat" yang berbeda dari "Non-Gakin". |
| Campuran | Perlu penanda asal per baris, supaya isian kader tidak tertimpa impor berikutnya. |

**Sementara ini:** pilihan campuran dalam draf F08 tetap merupakan asumsi rancangan, bukan keputusan sumber data atau izin input. Nilai yang belum tersedia tetap "belum tercatat", bukan Non-Gakin. Pemetaan ke kolom `G`/`NG` tidak boleh dinyatakan final, dan data contoh tidak boleh dianggap sebagai nilai keluarga yang sudah diverifikasi.

Catatan yang menyertai: desil dan status kemiskinan adalah data sosio-ekonomi keluarga, bukan data kesehatan anak. [OI-10](#oi-10--kebijakan-retensi-dan-privasi-data) berlaku padanya.

**Yang dibutuhkan:** konfirmasi makna `G`/`NG` dari Bidan/Puskesmas; keputusan sumber desil dan Gakin beserta pihak yang mengisi atau memperbaruinya. Bila sumbernya Puskesmas, minta contoh struktur berkas dan nama kolom. Catat pemberi keputusan serta tanggalnya ketika tersedia. Rencana kerja, F08, F09, dan rujukan blangko menautkan catatan ini sebagai sumber status keputusan.

---

## OI-18 — Naskah pertanyaan checklist stimulasi

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | Bidan |
| **Menghambat** | [F13](prd/feedback/F13-stimulasi-perkembangan.md), sepenuhnya |

Pemilik program meminta variabel stimulasi perkembangan yang menyesuaikan umur anak. Bentuk yang disepakati: **checklist ringkas**, bukan instrumen KPSP resmi Kemenkes — 3–4 pertanyaan per aspek, empat aspek, sembilan kelompok umur.

Struktur datanya sudah ditetapkan di [F13](prd/feedback/F13-stimulasi-perkembangan.md). **Isinya belum ada.**

Yang dibutuhkan: 9 kelompok umur × 4 aspek × 3–4 butir pertanyaan, memakai kalimat yang biasa dipakai kader saat bertanya kepada ibu — bukan kalimat buku.

| Kelompok umur (bulan) | Gerak kasar | Gerak halus | Bicara & bahasa | Kemandirian & sosialisasi |
|---|---|---|---|---|
| 0–3, 3–6, 6–9, 9–12, 12–18, 18–24, 24–36, 36–48, 48–60 | ? | ? | ? | ? |

**Pembaruan 21 September 2026 — KPSP sudah dipakai dan hasilnya sudah dicatat.** `Output Laporan/00_DATA SASARAN JAN_JUNI 2026 .xlsx` memuat kolom `JENIS DETEKSI DINI TUMBUH KEMBANG` dengan dua sub-kolom: `PENYIMPANGAN PERTUMBUHAN` (diisi status gizi BB/TB) dan `PENYIMPANGAN PERKEMBANGAN` (diisi `KPSP`). Blangko Buku 7 juga menuntut butir `Balita dengan Ceklis Perkembangan: Lengkap / Tidak Lengkap`.

Artinya instrumen resminya **sudah berjalan di lapangan**, dan yang belum ada hanyalah naskah pertanyaan untuk versi ringkas yang diminta pemilik program.

Ini juga mempertajam catatan lingkup di bawah: karena KPSP resmi sudah dipakai dan hasilnya dicatat, checklist ringkas Portal berisiko dibaca sebagai penggantinya. Perlu dipastikan keduanya tidak bersaing — kemungkinan besar Portal cukup **menampung hasil KPSP yang sudah ada**, bukan membuat instrumen kedua.

**Sementara ini:** F13 tidak dikerjakan. Membangun checklist yang tidak menanyakan apa pun akan menghasilkan layar yang menjanjikan sesuatu lalu menolaknya — hal yang sudah pernah dicabut dari Portal sekali.

**Catatan lingkup:** checklist ini tidak berhak mengeluarkan vonis "Penyimpangan". Vonis perkembangan adalah wewenang instrumen resmi dan tenaga terlatih; yang dikeluarkan Portal hanya anjuran stimulasi tambahan.

---

## OI-19 — Persetujuan fitur feedback dan target rilis

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | pemilik program |
| **Menghambat** | penetapan fitur feedback yang dijanjikan pada MVP |

Pada pemeriksaan 23 September 2026, PRD utama menyatakan lingkup diperluas dan memberi prioritas Must pada sejumlah feedback. Indeks PRD menyatakan lingkup feedback belum diputuskan. Daftar tugas awal di [`riwayat/backlog-feedback.md`](riwayat/backlog-feedback.md) memuat permintaan dan rekomendasi prioritas, tetapi tidak menyelesaikan pertentangan persetujuan tersebut.

**Yang dibutuhkan:** untuk F01–F13, tentukan disetujui, usulan, atau ditunda; sebutkan target rilis serta nama/peran penyetuju dan tanggal keputusannya. Konfirmasi juga catatan persetujuan kebutuhan inti yang belum menyebut penyetuju dan tanggal.

**Sementara ini:** status yang dapat ditelusuri dicatat di [PRD utama bagian 13](prd/prd-utama.md#13-status-lingkup). Nilai Must/Should pada feedback tetap dibaca sebagai prioritas usulan. Keputusan aturan rinci yang sudah tercatat tidak dibatalkan, tetapi tidak dianggap sebagai persetujuan seluruh fitur masuk MVP.

## OI-20 — Input lapangan dan hak kader di Portal

| | |
|---|---|
| **Status** | terbuka |
| **Pemilik** | pemilik program / Bidan |
| **Menghambat** | persona, alur input, dan hak akses F04 serta F07 |

[ADR-0003](adr/0003-batas-portal-vs-aplikasi-tablet.md) menempatkan pencatatan saat kegiatan pada aplikasi Tablet. Sebaliknya, US-16 dan US-17 menggambarkan kader mengetik angka atau melengkapi pendaftaran di lokasi. Matriks otorisasi Portal membatasi perubahan profil dan pengukuran pada Bidan/Admin.

**Yang dibutuhkan:** tentukan apakah kebutuhan input tersebut milik Tablet, koreksi oleh Bidan di Portal, atau perluasan Portal untuk input kader saat kegiatan. Jika Portal diperluas, sebutkan tindakan kader yang diizinkan dan pihak yang memeriksa koreksinya.

**Keadaan sejak 26 September 2026:** Portal punya layar **Penimbangan** (cari balita, catat berat dan tinggi) dari mockup yang disetujui pemilik produk, dan menunya tampil bagi ketiga peran. Hasil ukurnya belum dikirim ke server, jadi layar itu belum memberi hak tulis apa pun; isu ini yang menentukan apakah nanti boleh.

**Sementara ini:** batas yang tercatat di ADR-0003 dan [otorisasi yang sudah diterapkan](arsitektur.md#otorisasi) tetap berlaku. User story feedback dipertahankan sebagai usulan; kalimatnya tidak memberikan hak tulis baru. Setelah keputusan tersedia, selaraskan persona, PRD fitur, dan matriks izin sebelum implementasi.
