# Glosarium

| | |
|---|---|
| **Jenis** | Orientasi |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 29 September 2026 |

Istilah lapangan yang muncul di data, dokumen, dan kode. Tanpa daftar ini, sebagian besar kalimat di dokumen lain tidak terbaca.

Definisi yang **belum dikonfirmasi** ditandai ⚠️ dan dicatat di [Pertanyaan terbuka](pertanyaan-terbuka.md).

---

| Istilah | Arti |
|---|---|
| **SIMPATIK Posyandu** | Nama aplikasi ini di layar sejak 24 September 2026. Dokumen yang lebih lama menyebutnya Portal Posyandu Tulip. |
| **Portal** | Sebutan internal untuk aplikasi web ini, untuk membedakannya dari Aplikasi Tablet. |
| **Aplikasi Tablet** | Aplikasi Android terpisah untuk meja penimbangan pada hari Posyandu. Pemindai kartunya (v1.6) sudah dipakai; batasnya dengan Portal di [ADR-0003](adr/0003-batas-portal-vs-aplikasi-tablet.md). |
| **Kode kartu** | `SPT-` dan id balita delapan digit, dicetak di kartu balita, misalnya `SPT-00000110`. QR di kartu memuat id dan NIK balita dengan format `SIMPATIK:SASARAN:1:<id>:<NIK>` ([format](arsitektur.md#kartu-balita)). |
| **Posyandu** | Pos Pelayanan Terpadu. Unit layanan kesehatan dasar berbasis masyarakat di tingkat RW. |
| **Kader** | Relawan masyarakat yang menjalankan kegiatan Posyandu, termasuk penimbangan dan pencatatan. |
| **TPG** | Tenaga Pelaksana Gizi di Puskesmas. |
| **Balita** | Anak Bawah Lima Tahun (0–59 bulan). |
| **Sasaran (S)** | Jumlah seluruh balita yang terdaftar di wilayah kerja Posyandu pada satu periode. |
| **Ditimbang (D)** | Jumlah balita yang benar-benar hadir dan ditimbang pada periode tersebut. |
| **D/S** | Rasio kehadiran = `D ÷ S`. Indikator utama partisipasi masyarakat. |
| **SKDN** | Set indikator cakupan Posyandu: **S**asaran, **K**epemilikan KMS, **D**itimbang, **N**aik berat badannya. |
| **KMS** | Kartu Menuju Sehat. Kartu berisi kurva pertumbuhan anak terhadap garis standar. |
| **Buku KIA** | Buku Kesehatan Ibu dan Anak, tempat KMS berada. |
| **KBM** | Kenaikan Berat badan Minimum. Ambang kenaikan berat per bulan menurut umur. |
| **N** | Berat badan **N**aik, yaitu kenaikan ≥ KBM dibanding penimbangan sebelumnya. |
| **T** | Berat badan **T**idak naik (kenaikan < KBM, tetap, atau turun). |
| **NTOB** | Kode status penimbangan pada data sumber: **N** naik memenuhi KBM · **T** tidak naik · **O** ditimbang bulan ini tetapi tidak bulan lalu · **B** baru pertama kali ditimbang. Definisinya dari berkas pemilik program; satu angka KBM masih dikonfirmasi ([OI-01](pertanyaan-terbuka.md#oi-01--definisi-ntob-dan-aturan-1t2t3t)). |
| **1T / 2T / 3T** ⚠️ | Berat badan tidak naik 1, 2, atau 3 kali penimbangan berturut-turut. Blangko F1 hanya memakai 2T. **Tindak lanjutnya belum diputuskan** ([OI-01](pertanyaan-terbuka.md#oi-01--definisi-ntob-dan-aturan-1t2t3t)). |
| **Balita Bersinar** ⚠️ | Kategori khusus pada laporan Juni 2026. **Arti belum dikonfirmasi.** |
| **BGM** | Bawah Garis Merah: berat badan menurut umur di bawah −3 SD, garis merah pada KMS. |
| **F1 Gizi** | Format laporan bulanan gizi dari Posyandu ke Puskesmas. |
| **Buku 7** | Buku register agregasi sasaran dan kehadiran per bulan. |
| **Z-score** | Simpangan nilai ukur anak dari median populasi rujukan, dinyatakan dalam satuan standar deviasi. |
| **LMS** | Tiga parameter distribusi rujukan WHO: **L** (Box-Cox power), **M** (median), **S** (coefficient of variation). |
| **BB/U** | Indeks Berat Badan menurut Umur → deteksi *underweight*. |
| **TB/U**, **PB/U** | Indeks Tinggi (atau Panjang) Badan menurut Umur → deteksi *stunting*. |
| **BB/TB**, **BB/PB** | Indeks Berat Badan menurut Tinggi/Panjang Badan → deteksi *wasting* dan *overweight*. |
| **IMT/U** | Indeks Massa Tubuh menurut Umur. |
| **LILA** | Lingkar Lengan Atas. |
| **LIKA** | Lingkar Kepala. |
| **PB vs TB** | **P**anjang **B**adan diukur telentang (< 24 bulan); **T**inggi **B**adan diukur berdiri (≥ 24 bulan). Selisih konversi 0,7 cm. |
| **PMK 2/2020** | Peraturan Menteri Kesehatan No. 2 Tahun 2020 tentang Standar Antropometri Anak. Sumber ambang kategori status gizi. |
| **IMD** | Inisiasi Menyusu Dini. |
| **e-PPGBM** | Elektronik Pencatatan dan Pelaporan Gizi Berbasis Masyarakat (sistem Kemenkes). Di luar lingkup MVP. |
