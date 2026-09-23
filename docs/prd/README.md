# PRD — Portal Posyandu Tulip

| | |
|---|---|
| **Jenis** | Kontrak — indeks |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 22 September 2026 |

Semua yang menyatakan **apa yang akan dibangun**. Yang menjelaskan apa yang **sudah** ada tinggal di luar folder ini — mulai dari [Ringkasan](../ringkasan.md).

Pembedaannya perlu karena PRD yang fiturnya sudah dibangun mudah terbaca sebagai deskripsi sistem, padahal kode sesudahnya bergerak dan PRD-nya tidak. Karena itu tiap PRD punya status, dan `selesai` berarti berhenti dijadikan rujukan.

---

## Isinya

| Berkas | Isi |
|---|---|
| [Format penulisan PRD](format-prd.md) | Bentuk baku sembilan bagian. Baca ini sebelum menulis PRD baru |
| [PRD utama](prd-utama.md) | Kontrak produk: tujuan, user stories, aturan data yang mengikat, ukuran keberhasilan, risiko |
| [`dasar/`](dasar/README.md) | PRD fitur **kebutuhan inti** — sembilan fitur, ditulis satu per satu saat dikerjakan |
| [`feedback/`](feedback/README.md) | PRD fitur dari **feedback lapangan** — tiga belas fitur, sudah ditulis, belum tentu dikerjakan |

## Kenapa dasar dan feedback dipisah

Keduanya sama-sama "fitur", tetapi berbeda status keputusannya:

**`dasar/`** adalah kemampuan yang **harus** ada supaya Portal berfungsi sebagai sistem pencatatan — menyimpan hasil hitungan, mencatat riwayat perubahan, menyambungkan layar ke basis data. Tidak ada perdebatan apakah ini dikerjakan; yang ada hanya urutannya.

**`feedback/`** adalah usulan pihak Posyandu setelah mencoba Portal. Isinya bagus dan sudah ditulis lengkap, tetapi **lingkupnya belum diputuskan**. Menaruhnya bersebelahan dengan kebutuhan inti akan membuat pembaca mengira semuanya sudah disepakati.

## Urutan kerja

Ada di [Rencana kerja](../rencana-kerja.md), bukan di sini. Folder ini menyimpan *apa* dan *bagaimana*; *kapan* punya tempatnya sendiri.

## Satu PRD, satu pull request

Satu berkas dikerjakan sampai selesai sebelum yang berikutnya dibuka. PRD-nya ikut di PR fiturnya, bukan PR tersendiri — repo ini *docs-as-code*, jadi status di kepala berkas berubah bersama kodenya.
