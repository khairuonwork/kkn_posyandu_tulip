# PRD Fitur — Tingkat 3

| | |
|---|---|
| **Jenis** | Kontrak — indeks PRD fitur |
| **Status** | hidup — fiturnya belum tentu jadi dikerjakan |
| **Perubahan berarti terakhir** | 22 September 2026 |

Dokumentasi produk Portal Posyandu Tulip berdiri di **tiga tingkat**. Folder ini yang paling bawah.

| Tingkat | Dokumen | Menjawab |
|---|---|---|
| 1 | [`prd-utama.md`](../prd-utama.md) | Produk ini apa, untuk siapa, dan batasnya di mana |
| 2 | [`rujukan/layar-demo.md`](../../rujukan/layar-demo.md) | Layar apa saja, dan bentuk tiap layar seperti apa |
| **3** | **`prd_feedback/Fnn-*.md`** (folder ini) | **Satu fitur: perilakunya, datanya, dan kapan dianggap selesai** |

Tingkat 1 dan 2 menjawab *"sistemnya seperti apa"*. Tingkat 3 menjawab *"perubahan ini selesainya kapan"* — dan ditulis satu berkas per fitur supaya bisa dikerjakan **fokus satu per satu**, tanpa membuka dokumen 64 KB untuk mencari tiga paragraf yang relevan.

## Daftar fitur

Seluruhnya berasal dari feedback lapangan pihak Posyandu. Lingkup dan alasannya ada di [Fitur](../../fitur.md); peta layarnya di [`rujukan/layar-demo.md` bagian 15](../../rujukan/layar-demo.md).

Urutannya menurut **dampak lapangan dibagi ongkos**, bukan menurut nomor butir feedback. Satu baris = satu PRD = satu *pull request*.

| Kode | Fitur | Cabang | Bergantung | Terhambat |
|---|---|---|---|---|
| [F01](F01-kontak-whatsapp-ortu.md) | Kontak WhatsApp orang tua | `feat/f01-kontak-wa` | — | — |
| [F02](F02-edukasi-rujukan-kms.md) | Edukasi & anjuran rujukan di KMS | `feat/f02-edukasi-kms` | — | [OI-16](../../pertanyaan-terbuka.md) |
| [F03](F03-kirim-whatsapp.md) | Kirim hasil ke WhatsApp | `feat/f03-kirim-wa` | F01, F02 | — |
| [F04](F04-validasi-kewajaran-ukur.md) | Validasi kewajaran input pengukuran | `feat/f04-validasi-ukur` | — | — |
| [F05](F05-grafik-enam-indeks.md) | Pengukuran & grafik indeks WHO | `feat/f05-grafik-6-indeks` | — | [OI-04](../../pertanyaan-terbuka.md) sebagian |
| [F06](F06-status-ntob.md) | Status pertumbuhan N/T/O/B terhitung | `feat/f06-ntob` | — | [OI-01](../../pertanyaan-terbuka.md) sebagian |
| [F07](F07-skrining-pendaftaran.md) | Skrining awal pendaftaran | `feat/f07-skrining-daftar` | F01 | [OI-15](../../pertanyaan-terbuka.md) sebagian |
| [F08](F08-desil-gakin.md) | Atribut sosio-ekonomi: desil & Gakin | `feat/f08-desil-gakin` | — | [OI-17](../../pertanyaan-terbuka.md) |
| [F09](F09-laporan-f1.md) | Rekap F1 & ekspor laporan | `feat/f09-laporan-f1` | F06, F08 | [OI-07](../../pertanyaan-terbuka.md) |
| [F10](F10-lembar-cetak.md) | Lembar bukti fisik siap cetak | `feat/f10-lembar-cetak` | F09 | — |
| [F11](F11-aksesibilitas-tampilan.md) | Mode teks besar & mikro-interaksi | `feat/f11-aksesibilitas` | — | — |
| [F12](F12-manajemen-sasaran.md) | Manajemen sasaran dinamis | `feat/f12-manajemen-sasaran` | — | — |
| [F13](F13-stimulasi-perkembangan.md) | Checklist stimulasi perkembangan | *belum dibuka* | — | [OI-18](../../pertanyaan-terbuka.md) — **menahan seluruhnya** |

**Empat fitur tidak bergantung pada apa pun dan tidak terhambat apa pun** — F01, F04, F11, F12. Salah satunya bisa dimulai kapan saja.

**F13 satu-satunya yang ditahan.** Naskah pertanyaannya belum ada, jadi tidak ada yang bisa dibangun. PRD-nya tetap ditulis karena bentuk datanya perlu disepakati sebelum Bidan menyusun naskahnya.

### Di luar putaran ini

| Butir | Sebab |
|---|---|
| Scan ID Card / QR sasaran | Ditandai *pending* oleh pemilik program. [Fitur](../../fitur.md) no. 4 sudah menempatkannya di Aplikasi Tablet, bukan Portal. |
| Skrining **imunisasi** | Berkas yang dipakai demo tidak memuat kolom imunisasi. Sejak 21 September 2026 diketahui berkas **data sasaran** memuatnya lengkap per antigen beserta tanggalnya ([OI-15](../../pertanyaan-terbuka.md), [06 bagian 10](../../rujukan/migrasi-data.md)) — jadi yang dibutuhkan impor, bukan pengumpulan data baru. Tabel `layanan` siap menampungnya. [F07](F07-skrining-pendaftaran.md) tetap jalan untuk kelengkapan identitas. |

## Aturan

### Urutan pengerjaan

Satu berkas di folder ini dikerjakan sampai selesai sebelum yang berikutnya dibuka. Kolom **Bergantung** menentukan urutan yang mungkin; selebihnya bebas.

Aturan penulisannya — satu PRD satu *pull request*, status di kepala berkas, dan larangan menggeser nomor bagian dokumen lama — ada di [`../`panduan-penulisan.md`](../../panduan-penulisan.md).

### Aturan yang mengikat seluruh fitur

Ditulis sekali di sini, tidak diulang di tiap PRD:

| Aturan | Isi |
|---|---|
| **Kontrak props tetap** | Bentuk props tiap halaman adalah kontrak untuk endpoint REST nanti ([`rujukan/layar-demo.md`](../../rujukan/layar-demo.md) bagian 10). Field baru masuk ke `client/src/types/posyandu.ts` — tidak diketik ulang di tiap halaman. |
| **Kosong bukan nol** | DR-04. Anak tanpa data LiKA menampilkan kurva kosong berkalimat, bukan garis di angka nol. Berlaku untuk seluruh nilai ukur, z-score, dan agregat. |
| **Kader tidak diblokir** | Peringatan, bukan penolakan. Nilai janggal yang tersimpan masih bisa diperbaiki bulan depan; nilai yang gagal disimpan hilang bersama orang tuanya yang sudah pulang. |
| **Asumsi tidak ditebak diam-diam** | Setiap asumsi yang belum dikonfirmasi pemilik program masuk ke [`pertanyaan-terbuka.md`](../../pertanyaan-terbuka.md) dan ditautkan dari bagian *Keputusan terbuka* PRD-nya. |
| **Logika non-sepele meninggalkan pemeriksaan** | Satu berkas uji bergaya `assert` memakai `node:test` bawaan Node, mengikuti pola [`client/test/z-score.test.ts`](../../../client/test/z-score.test.ts) atau [`server/test/`](../../../server/test). Bukan kerangka uji baru. Fitur yang isinya tampilan saja tidak perlu — F10 dan F11 tidak punya. |

### Client atau server?

PRD di folder ini ditulis saat seluruh kode tinggal di satu aplikasi Laravel, sehingga daftar **Berkas yang disentuh** menyebut berkas frontend untuk hampir semua hal. Setelah pindah stack ([ADR-0006](../../adr/0006-pindah-ke-express-react-postgres.md)), daftar itu sudah dibetulkan path-nya tetapi **belum ditinjau ulang pembagiannya** — perlakukan sebagai petunjuk, bukan ketetapan.

Aturan pembaginya satu kalimat: **apa pun yang hasilnya mengikat dihitung di `server/`.** Status gizi, status pertumbuhan, angka rekap, dan validasi yang menentukan boleh-tidaknya tersimpan adalah milik server. Client boleh menghitung salinannya hanya untuk pratinjau seketika — dan bila itu dilakukan, salinannya wajib diikat ke acuan yang sama, seperti `client/test/z-score.test.ts` mengikat pratinjau z-score ke 2.076 kasus milik server.

Sebelum PR ditutup, selain kriteria terima PRD-nya sendiri:

```bash
cd client && npm test && npm run types:check && npm run lint:check && npm run format:check
```

```bash
cd server && npm test && npm run types:check
```

## Template

Bentuk baku PRD fitur — sembilan bagian beserta penjelasan tiap bagiannya — ada di [`../`panduan-penulisan.md` bagian 3](../../panduan-penulisan.md).

Ketiga belas PRD di folder ini ditulis sebelum panduan itu ada, jadi memakai tujuh bagian tanpa *Ringkasan* dan *Alternatif yang ditolak*. Nomor bagian 1–7 sama persis, sehingga rujukan lama tetap berlaku. Berkas lama **tidak** ditulis ulang.
