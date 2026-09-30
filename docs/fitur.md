# Fitur

| | |
|---|---|
| **Jenis** | Orientasi |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 1 Oktober 2026 |

Seluruh kemampuan SIMPATIK Posyandu beserta keadaannya hari ini. Untuk tahu **apa yang sudah bisa dipakai**, baca tabel pertama saja.

Urutan pengerjaan yang berlaku ada di [Rencana kerja](rencana-kerja.md). Perilaku rinci tiap fitur ada di [PRD](prd/README.md).

---

## Keadaan hari ini

| Kemampuan | Keadaan |
|---|---|
| Perhitungan status gizi enam indeks (WHO LMS) | **Berjalan dan terbukti** — setara perhitungan lama sampai 4,4 × 10⁻¹⁵ pada 2.076 kasus uji |
| Perhitungan umur, skema basis data, aturan integritasnya | **Berjalan** |
| Login, tiga peran, pembatasan kader ke RT binaan | **Berjalan** — ditegakkan server, bukan antarmuka |
| Kelola akun di Pengaturan › Pengguna dan peran | **Berjalan** — tersimpan ke basis data lewat `/api/pengguna`, khusus admin, tercatat di audit. Wajib ganti kata sandi awal saat pertama masuk belum ada |
| Delapan layar web: Beranda, Data Balita, Detail Balita, Detail riwayat penimbangan, Kartu Balita, Laporan, Sasaran & Impor, Pengaturan ([peta layar](mulai-di-sini.md#peta-layar)) | **Tampilannya jadi** — Data Balita memakai REST API live; sebagian layar lain masih menampilkan [data contoh](rujukan/data-contoh.md). Fitur input Penimbangan web diarsipkan karena menjadi tanggung jawab aplikasi Android |
| Kartu balita ber-QR dan pemindaiannya | **Berjalan** — kartu dibuat/cetak dari Portal dan QR dipindai aplikasi Android ([format](arsitektur.md#kartu-balita)) |
| Jalur dari basis data ke layar | **Baru untuk daftar akun** — data balita, pengukuran, dan laporan belum |
| Penyimpanan hasil perhitungan gizi | **Berjalan** — `hitungDanSimpan()`, lihat [B01](prd/dasar/B01-simpan-hasil-gizi.md) |
| Pencatatan riwayat perubahan (audit) | **Berjalan setelah migrasi 004–005** — trigger tujuh tabel; cakupan dan batasnya di [Basis Data](database.md#audit), kontrak selesai di [B02](prd/dasar/B02-jejak-audit.md) |
| Pemasukan data arsip Excel | **Belum ada** |

Ringkasnya: **tampilannya sudah jadi, mesin hitungnya sudah benar, bagian tengahnya yang kosong.**

---

## Modul MVP

Tabel ini memetakan kemampuan inti dan perluasan yang diusulkan. Judul modul tidak menetapkan persetujuan atau target rilis; keduanya ada di [PRD utama bagian 13](prd/prd-utama.md#13-status-lingkup).

| Modul | Isi |
|---|---|
| **M1 — Master data** | CRUD anak, orang tua, dan wilayah RT. Pencarian berdasarkan nama, NIK, atau RT. Koreksi ejaan nama. Penandaan kandidat duplikat. |
| **M2 — Profil anak dan KMS** | Halaman detail anak: riwayat pengukuran dengan kolom z-score per indeks, kurva pertumbuhan dengan garis SD sebagai latar, riwayat layanan, form koreksi pengukuran. |
| **M3 — Status gizi** | Perhitungan otomatis z-score dan kategori untuk BB/U, TB/U, BB/TB, IMT/U, LILA/U, dan LIKA/U dengan metode WHO LMS. |
| **M4 — Dashboard** | Ringkasan periode berjalan: sasaran dan kehadiran (D/S), sebaran status gizi, tren stunting per RT dan periode, daftar anak yang perlu tindak lanjut. |
| **M5 — Periode dan rekap** | Pengelolaan periode kegiatan bulanan. Rekap per RT dan periode dengan kolom z-score. Export CSV/Excel. |
| **M6 — Layanan** | Pencatatan dan tampilan imunisasi, Vitamin A, dan obat cacing pada profil anak. |
| **M7 — Impor arsip** | Perintah impor untuk memuat arsip 2025–2026, lengkap dengan laporan konflik dan mode uji-coba. Rancangannya di [`rujukan/migrasi-data.md`](rujukan/migrasi-data.md); perintahnya belum ada di stack baru. |
| **M8 — Akun dan peran** | Autentikasi, pengelolaan akun kader, penetapan peran. Mesinnya sudah berdiri di [`server/src/auth/`](../server/src/auth) — kata sandi di-*hash* scrypt, sesi tersimpan di basis data dan dapat dicabut seketika, matriks peran ditegakkan server. Layar pengelolaannya, Pengaturan › Pengguna dan peran, tersambung ke basis data sejak 28 September 2026. Wajib ganti kata sandi awal saat pertama masuk belum ada. |
| **M9 — Komunikasi orang tua** | Nomor WhatsApp orang tua pada profil. Kartu edukasi dan anjuran rujukan yang menyesuaikan hasil ukur anak. Penyusun pesan hasil pengukuran yang dapat langsung diteruskan ke WhatsApp orang tua. |
| **M10 — Skrining dan validasi meja** | Peringatan angka tidak wajar di aplikasi Android saat kader mengetik, dibandingkan terhadap pengukuran bulan sebelumnya. Skrining kelengkapan identitas saat pendaftaran. Status pertumbuhan N/T/O/B. |
| **M11 — Aksesibilitas kader** | Mode tampilan teks besar. Lembar cetak A4 sebagai bukti fisik kegiatan. |

M9–M11 berasal dari feedback lapangan, bukan dari analisis arsip seperti M1–M8. Ketiganya menjawab keluhan yang sama dari arah berbeda: **data yang benar di layar tidak berarti apa-apa kalau tidak sampai ke orang tua, tidak tertangkap saat salah ketik, dan tidak punya wujud di atas kertas.**

## Fase berikutnya
Diurutkan menurut nilai, bukan kemudahan:

1. **Export F1 Gizi dan Buku 7** — usulan perluasan dicatat pada [F09](prd/feedback/README.md). Status lingkup mengikuti PRD utama bagian 13; perkembangan format ada di [OI-07](pertanyaan-terbuka.md).
2. **Aturan tindak lanjut otomatis** 1T/2T/3T — usulan fitur di [F06](prd/feedback/README.md). Keputusan aturan data O/B pada DR-11 tetap berlaku; persetujuan rilis fitur mengikuti PRD utama bagian 13.
3. **Aplikasi Tablet** — pemindai Android v1.6 sudah dipakai; yang belum adalah mekanisme aliran datanya ke Portal ([OI-03](pertanyaan-terbuka.md#oi-03--mekanisme-aliran-data-portal--aplikasi-tablet)).
4. **Kartu barcode/QR per anak** untuk mempercepat antrean. Kartu dan pemindaiannya sudah ada di Portal dan pemindai Android; yang tersisa menyambungkannya ke data sungguhan.
5. **Modul impor in-app** dengan *staging* dan antrean verifikasi, bila arsip Excel ternyata menjadi jalur data rutin dan bukan migrasi sekali jalan.
6. **KPSP dan deteksi dini tumbuh kembang** — usulan checklist ringkas ada di [F13](prd/feedback/F13-stimulasi-perkembangan.md). Persetujuan lingkup mengikuti PRD utama bagian 13; naskahnya tertahan OI-18. Pemeriksaan gigi dan rujukan tetap di fase berikutnya ([OI-14](pertanyaan-terbuka.md)).
7. **Portal orang tua**, setelah kebijakan privasi dan *consent* tersedia.

Nomor urut di atas **tidak diubah**, karena dokumen lain merujuknya menurut nomor. Butir 3 dan 5 tetap di fase berikutnya, dan butir 4 sebagian sudah dikerjakan. Catatan keputusan kartu barcode/QR (no. 4) ada di PRD utama bagian 13.

---

## Fitur dari feedback lapangan

Pihak Posyandu mencoba Portal dan mengusulkan perluasan pada komunikasi ke orang tua, pencegahan salah input di meja, dan bukti fisik cetak — itulah modul M9, M10, dan M11 di atas.

Ketiga belas fiturnya punya PRD masing-masing di [`prd/feedback/`](prd/feedback/README.md), lengkap dengan urutan, ketergantungan, dan mana yang masih tertahan pertanyaan terbuka.

Persetujuan dan target rilis ketiga belas fitur hanya dipelihara di [PRD utama bagian 13](prd/prd-utama.md#13-status-lingkup). Perbedaan antara input lapangan dan koreksi di Portal dicatat di [OI-20](pertanyaan-terbuka.md#oi-20--input-lapangan-dan-hak-kader-di-portal).
