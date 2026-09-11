# Dokumentasi Portal Posyandu Tulip

Dokumentasi teknis dan produk untuk **Portal Posyandu Tulip** — sistem pencatatan, pemantauan, dan pelaporan status gizi balita Posyandu Tulip RW 18, Kelurahan Citeureup.

## Konvensi

- Bahasa dokumen: **Indonesia**. Istilah teknis (*primary key*, *migration*, *controller*, *z-score*) tetap bahasa Inggris agar cocok dengan nama di kode.
- Setiap keputusan arsitektural yang mahal untuk dibalik ditulis sebagai **ADR** di `adr/`, bukan dikubur di dalam dokumen panjang.
- Setiap asumsi yang belum dikonfirmasi pemilik program masuk ke [`99-open-issues.md`](99-open-issues.md) — **tidak ditebak diam-diam di dalam kode**.
- Diagram memakai Mermaid agar ter-render langsung di GitHub dan tetap bisa di-*diff*.

## Daftar dokumen

| No | Dokumen | Untuk siapa | Status |
|---|---|---|---|
| 01 | [PRD Produk](01-prd.md) | Pemilik program, dosen pembimbing, tim pengembang | selesai |
| 02 | [Software Requirements Specification](02-srs.md) | Pengembang, QA | selesai |
| 03 | [Software Design Document](03-sdd.md) | Pengembang | selesai |
| 04 | [Spesifikasi Antropometri & Z-Score](04-spesifikasi-antropometri.md) | Pengembang, Bidan/TPG | selesai |
| 05 | [UI/UX Specification](05-uiux-spec.md) | Pengembang frontend, designer | sebagian — menunggu [OI-08](99-open-issues.md) |
| 06 | [Migrasi Data Arsip Excel](06-migrasi-data.md) | Pengembang, pemilik data | selesai |
| 07 | Test Plan | QA, pengembang | belum ditulis (Fase 5) |
| 08 | Panduan Operasional | Admin sistem | belum ditulis (Fase 5) |
| 09 | Manual Kader | Kader, Bidan | belum ditulis (Fase 5) |
| 10 | [PRD Demo Frontend](10-prd-demo-frontend.md) | Tim pengembang, presenter demo | selesai |
| 99 | [Open Issues](99-open-issues.md) | Semua | hidup |

### Architecture Decision Records

| ADR | Judul | Status |
|---|---|---|
| [0001](adr/0001-primary-key-strategy.md) | Surrogate ID sebagai primary key, NIK sebagai natural key | Accepted |
| [0002](adr/0002-metode-z-score-who-lms.md) | Z-score dihitung dengan metode WHO LMS | Accepted |
| [0003](adr/0003-batas-portal-vs-aplikasi-tablet.md) | Batas tanggung jawab Portal dan Aplikasi Tablet | Accepted |
| [0004](adr/0004-reuse-team-sebagai-rbac.md) | Reuse tabel `teams`/`Membership` sebagai RBAC single-tenant | Accepted |

## Glosarium

Istilah lapangan yang muncul di data dan dokumen. Definisi yang **belum dikonfirmasi** ditandai dengan ⚠️ dan dicatat di [`99-open-issues.md`](99-open-issues.md).

| Istilah | Arti |
|---|---|
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
| **NTOB** ⚠️ | Kode gabungan status penimbangan pada data sumber. Dugaan: **N**aik / **T**idak naik / **O** tidak ditimbang bulan lalu / **B**aru pertama kali. **Belum dikonfirmasi.** |
| **1T / 2T / 3T** ⚠️ | Berat badan tidak naik 1×, 2×, atau 3× berturut-turut. Ambang tindak lanjut. **Aturan resmi belum dikonfirmasi.** |
| **Balita Bersinar** ⚠️ | Kategori khusus pada laporan Juni 2026. **Arti belum dikonfirmasi.** |
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

## Menjalankan dokumentasi ini

Dokumen ini adalah *docs-as-code*: ikut versi git bersama kode. Perubahan spesifikasi dan perubahan implementasi masuk dalam satu *pull request* yang sama, sehingga dokumen tidak pernah tertinggal dari kode.
