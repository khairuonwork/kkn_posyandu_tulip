# Fitur

| | |
|---|---|
| **Jenis** | Orientasi |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 22 September 2026 |

Seluruh kemampuan Portal Posyandu Tulip beserta keadaannya hari ini. Untuk tahu **apa yang sudah bisa dipakai**, baca tabel pertama saja.

Urutan pengerjaan yang berlaku ada di [Rencana kerja](rencana-kerja.md). Perilaku rinci tiap fitur ada di [PRD](prd/README.md).

---

## Keadaan hari ini

| Kemampuan | Keadaan |
|---|---|
| Perhitungan status gizi enam indeks (WHO LMS) | **Berjalan dan terbukti** — setara perhitungan lama sampai 4,4 × 10⁻¹⁵ pada 2.076 kasus uji |
| Perhitungan umur, skema basis data, aturan integritasnya | **Berjalan** |
| Login, tiga peran, pembatasan kader ke RT binaan | **Berjalan** — ditegakkan server, bukan antarmuka |
| Kelima layar: Beranda, Data Balita, Detail anak, Laporan, Pengaturan | **Tampilannya jadi** — masih menampilkan data contoh |
| Jalur dari basis data ke layar | **Belum ada** |
| Penyimpanan hasil perhitungan gizi | **Berjalan** — `hitungDanSimpan()`, lihat [B01](prd/dasar/B01-simpan-hasil-gizi.md) |
| Pencatatan riwayat perubahan (audit) | **Berjalan** — ditegakkan trigger, lihat [B02](prd/dasar/B02-jejak-audit.md) |
| Pemasukan data arsip Excel | **Belum ada** |

Ringkasnya: **tampilannya sudah jadi, mesin hitungnya sudah benar, bagian tengahnya yang kosong.**

---

## Modul MVP

| Modul | Isi |
|---|---|
| **M1 — Master data** | CRUD anak, orang tua, dan wilayah RT. Pencarian berdasarkan nama, NIK, atau RT. Koreksi ejaan nama. Penandaan kandidat duplikat. |
| **M2 — Profil anak dan KMS** | Halaman detail anak: riwayat pengukuran dengan kolom z-score per indeks, kurva pertumbuhan dengan garis SD sebagai latar, riwayat layanan, form koreksi pengukuran. |
| **M3 — Status gizi** | Perhitungan otomatis z-score dan kategori untuk BB/U, TB/U, BB/TB, IMT/U, LILA/U, dan LIKA/U dengan metode WHO LMS. |
| **M4 — Dashboard** | Ringkasan periode berjalan: sasaran dan kehadiran (D/S), sebaran status gizi, tren stunting per RT dan periode, daftar anak yang perlu tindak lanjut. |
| **M5 — Periode dan rekap** | Pengelolaan periode kegiatan bulanan. Rekap per RT dan periode dengan kolom z-score. Export CSV/Excel. |
| **M6 — Layanan** | Pencatatan dan tampilan imunisasi, Vitamin A, dan obat cacing pada profil anak. |
| **M7 — Impor arsip** | Perintah impor untuk memuat arsip 2025–2026, lengkap dengan laporan konflik dan mode uji-coba. Rancangannya di [`rujukan/migrasi-data.md`](rujukan/migrasi-data.md); perintahnya belum ada di stack baru. |
| **M8 — Akun dan peran** | Autentikasi, pengelolaan akun kader, penetapan peran. Mesinnya sudah berdiri di [`server/src/auth/`](../server/src/auth) — kata sandi di-*hash* scrypt, sesi tersimpan di basis data dan dapat dicabut seketika, matriks peran ditegakkan server. Layar pengelolaan akunnya belum ada. |
| **M9 — Komunikasi orang tua** | Nomor WhatsApp orang tua pada profil. Kartu edukasi dan anjuran rujukan yang menyesuaikan hasil ukur anak. Penyusun pesan hasil pengukuran yang dapat langsung diteruskan ke WhatsApp orang tua. |
| **M10 — Skrining dan validasi meja** | Peringatan angka tidak wajar saat kader mengetik, dibandingkan terhadap pengukuran bulan sebelumnya. Skrining kelengkapan identitas saat pendaftaran. Status pertumbuhan N/T/O/B. |
| **M11 — Aksesibilitas kader** | Mode tampilan teks besar. Lembar cetak A4 sebagai bukti fisik kegiatan. |

M9–M11 berasal dari feedback lapangan, bukan dari analisis arsip seperti M1–M8. Ketiganya menjawab keluhan yang sama dari arah berbeda: **data yang benar di layar tidak berarti apa-apa kalau tidak sampai ke orang tua, tidak tertangkap saat salah ketik, dan tidak punya wujud di atas kertas.**

## Fase berikutnya
Diurutkan menurut nilai, bukan kemudahan:

1. ~~**Export F1 Gizi dan Buku 7**~~ → **diangkat ke lingkup aktif**, lihat [F09](prd/feedback/README.md). Blangko resminya masih belum ada ([OI-07](pertanyaan-terbuka.md)), jadi bentuknya dirancang dulu dari breakdown yang diminta Puskesmas lalu disesuaikan.
2. ~~**Aturan tindak lanjut otomatis** 1T/2T/3T~~ → **diangkat sebagian**, lihat [F06](prd/feedback/README.md) dan DR-11. Hanya O dan B; N dan T tetap menunggu tabel KBM.
3. **Aplikasi Tablet** dan mekanisme aliran datanya.
4. **Kartu barcode/QR per anak** untuk mempercepat antrean. Ini milik Aplikasi Tablet.
5. **Modul impor in-app** dengan *staging* dan antrean verifikasi, bila arsip Excel ternyata menjadi jalur data rutin dan bukan migrasi sekali jalan.
6. **KPSP dan deteksi dini tumbuh kembang** → **diangkat sebagian** sebagai checklist ringkas, bukan instrumen KPSP resmi: lihat [F13](prd/feedback/F13-stimulasi-perkembangan.md). Pemeriksaan gigi dan rujukan tetap di fase berikutnya ([OI-14](pertanyaan-terbuka.md)).
7. **Portal orang tua**, setelah kebijakan privasi dan *consent* tersedia.

Nomor urut di atas **tidak diubah** meski tiga butirnya sudah diangkat — dokumen lain merujuknya menurut nomor. Butir 3, 4, dan 5 tetap di fase berikutnya; kartu barcode/QR (no. 4) sudah ditandai *pending* oleh pemilik program dan tetap milik Aplikasi Tablet, bukan Portal.

---

## Fitur dari feedback lapangan

Pihak Posyandu mencoba Portal dan memberi feedback. Lingkupnya bertambah pada tiga arah yang belum tersentuh MVP: komunikasi ke orang tua, pencegahan salah input di meja, dan bukti fisik cetak — itulah modul M9, M10, dan M11 di atas.

Ketiga belas fiturnya punya PRD masing-masing di [`prd/feedback/`](prd/feedback/README.md), lengkap dengan urutan, ketergantungan, dan mana yang masih tertahan pertanyaan terbuka.

**Belum tentu semuanya dikerjakan.** Ketiga belasnya usulan lapangan yang belum diputuskan lingkupnya, dan sengaja dipisahkan dari kebutuhan inti supaya tidak terbaca sebagai sudah disepakati.
