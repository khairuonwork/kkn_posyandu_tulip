# Format Penulisan PRD

| | |
|---|---|
| **Jenis** | Rujukan |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 22 September 2026 |

Bentuk baku PRD fitur di proyek ini. Aturan penulisan yang berlaku untuk **seluruh** dokumen — jenis dokumen, bahasa, blok status, template ADR — ada di [Panduan penulisan](../panduan-penulisan.md).

---

Satu fitur, satu berkas, satu *pull request*. PRD-nya ikut di PR fiturnya — repo ini *docs-as-code*, jadi status di kepala berkas berubah di PR yang sama dengan kodenya.

Sembilan bagian, urutannya tetap. **Bagian yang tidak berlaku ditulis "tidak ada", bukan dihapus** — supaya pembaca tahu itu sudah dipikirkan, bukan terlupakan.

```markdown
# Fnn — <Judul fitur>

| | |
|---|---|
| **Jenis** | Kontrak |
| **Status** | draf / dikerjakan / selesai |
| **PR** | <nama cabang> |
| **Bergantung pada** | Fnn, atau — |
| **Terhambat** | OI-nn, atau — |
| **Perubahan berarti terakhir** | <tanggal> |

## 0. Ringkasan
Satu paragraf, maksimal lima kalimat, yang bisa dibaca berdiri sendiri:
fitur ini apa, untuk siapa, kenapa sekarang, dan kira-kira sebesar apa.
Ditulis terakhir, dibaca pertama.

## 1. Latar
Butir feedback aslinya, dikutip apa adanya — bukan parafrase. Kalimat pemilik
program adalah sumber kebenaran tentang apa yang ia minta. Sebutkan juga apa
yang sudah ada di repo, supaya tidak dibangun dua kali.

## 2. Lingkup
Yang masuk, dan yang sengaja tidak masuk. Bagian kedua sama pentingnya:
tanpa itu, fitur melebar diam-diam saat dikerjakan.

## 3. Perilaku yang diharapkan
Dari sudut kader di meja Posyandu, bukan dari sudut kode. Untuk pekerjaan yang
tidak terlihat kader — penyimpanan, impor, jejak audit — tulis dari sudut data:
apa yang masuk, apa yang tersimpan, dan apa yang terjadi bila gagal di tengah.
Sebutkan juga keadaan kosong, keadaan salah, dan keadaan ekstrem.

## 4. Data & tipe yang berubah
Field baru, bentuknya, dan dari mana nilainya datang.

## 5. Berkas yang disentuh
Daftar jalur berkas beserta apa yang berubah di masing-masing.

## 6. Keputusan terbuka
Tautan ke `pertanyaan-terbuka.md`, beserta apa yang dikerjakan sementara jawabannya
belum ada. Bila tidak ada, tulis "tidak ada".

## 7. Kriteria terima
Checklist yang benar-benar bisa diuji dan ditunjuk. Bukan "fitur berjalan
baik", melainkan angka dan layar yang bisa dilihat.

## 8. Alternatif yang ditolak
Pendekatan lain yang dipertimbangkan, dan kenapa tidak dipilih. Bila tidak
ada, tulis "tidak ada".
```

### Kenapa bentuk ini

Ini bukan standar yang diimpor bulat-bulat. Tujuh bagian di tengah sudah dipakai 13 PRD di [`prd_feedback/`](feedback/README.md) dan kebetulan praktis sebuah **RFC** — bentuk yang dipakai Rust, Oxide, dan *design doc* Google — ditambah satu bagian karangan sendiri yang justru bagus dan tidak ada di RFC mana pun: **Berkas yang disentuh**.

Dua bagian baru menutup lubang yang nyata:

**Bagian 0** ada karena orang yang baru masuk tim perlu memahami seluruh produk tanpa membaca sembilan berkas utuh. Sepuluh PRD berarti sepuluh paragraf.

**Bagian 8** ada karena tanpa itu, ide yang sudah ditolak akan diusulkan ulang enam bulan lagi dan tidak ada yang ingat kenapa ditolak. ADR di repo ini sudah punya bagian ini dan terbukti berguna — [`ADR-0002`](../adr/0002-metode-z-score-who-lms.md) menolak tiga alternatif, dan [`ADR-0005`](../adr/0005-migrasi-metode-zscore.md) tiga tahun kemudian bisa menjelaskan kenapa keputusannya **tidak** bertentangan, justru karena penolakan itu tercatat beserta alasannya.

Keduanya sengaja ditaruh di **ujung** — nomor 0 dan 8, bukan disisipkan di tengah — supaya rujukan "bagian 3" pada 13 PRD lama tetap menunjuk hal yang sama.

### Tidak retroaktif

Ketiga belas PRD di [`prd_feedback/`](feedback/README.md) **tidak ditulis ulang**. Semuanya berasal dari feedback lapangan yang belum tentu jadi dikerjakan; menambahkan dua bagian ke dokumen yang mungkin tidak pernah dibangun adalah pekerjaan tanpa pembaca.

### Contoh nyata tiap bagian

[`F04 — Validasi kewajaran input pengukuran`](feedback/F04-validasi-kewajaran-ukur.md) adalah contoh terbaik yang ada. Tiga bagiannya layak ditiru:

**Bagian 1 — Latar** mengutip pemilik program apa adanya, lalu menemukan hal yang tidak ia katakan: *"Contoh yang diberikan pemilik program justru menunjukkan letak persoalannya: 13 kg dan 15 kg dua-duanya angka yang wajar. Yang salah adalah selisihnya."* Ia juga menunjuk fungsi yang **sudah ada** di repo, sehingga tidak dibangun dua kali.

**Bagian 2 — Lingkup** menolak tiga hal secara eksplisit beserta alasannya, termasuk satu yang menggoda: ambang berbasis delta z-score, ditolak karena *"1,0 SD per bulan tidak punya arti bagi kader yang memegang timbangan."*

**Bagian 3 — Perilaku** menuliskan kalimat peringatannya persis seperti yang akan dibaca kader, bukan menggambarkannya. Lalu mempertahankan satu keputusan yang tampak longgar — peringatan, bukan penolakan — dengan alasan lapangan: *"Peringatan yang diabaikan tetap meninggalkan data; penolakan tidak meninggalkan apa-apa."*

Dua bagian yang F04 belum punya karena ditulis sebelum panduan ini ada:

- **Bagian 0** belum ditulis. Kira-kira bentuknya: *"Memindahkan pemeriksaan kewajaran angka ukur dari tabel riwayat ke kotak isian, supaya kader tahu ada yang janggal selagi anaknya masih di depan meja. Dua jenis pemeriksaan: rentang mutlak dan selisih antar bulan. Peringatan, tidak pernah memblokir. Kecil — ambangnya sudah ada di layar Pengaturan dan logikanya sudah ada di layar Detail; yang dikerjakan adalah memindahkannya."*
- **Bagian 8** belum ada, tetapi bahan mentahnya sudah ada di dalam Bagian 2 — tiga hal yang "sengaja tidak masuk" itu sebagian memang alternatif yang ditolak. Bedanya: Bagian 2 membatasi **lingkup**, Bagian 8 mencatat **cara lain mencapai tujuan yang sama**.

### Aturan lain seputar PRD

Aturan yang mengikat isi fitur — kontrak props, "kosong bukan nol", kader tidak diblokir, pembagian client/server — tinggal di [`prd_feedback/README.md`](feedback/README.md). Itu aturan **produk**, bukan aturan penulisan, jadi tempatnya bukan di sini.

---
