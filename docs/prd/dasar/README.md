# PRD Fitur Dasar

| | |
|---|---|
| **Jenis** | Kontrak — indeks |
| **Status** | hidup — dua dari sembilan PRD sudah ditulis |
| **Perubahan berarti terakhir** | 22 September 2026 |

Tempat PRD untuk **kebutuhan inti** — kemampuan yang membuat Portal berfungsi sebagai sistem pencatatan Posyandu. Berbeda dari [`../feedback/`](../feedback/README.md), yang berisi usulan lapangan dan belum tentu dikerjakan.

Baru ada dua PRD di sini. PRD ditulis bersama fiturnya, bukan di depan.

---

## Kenapa baru dua

PRD di sini ditulis **saat fiturnya mau dikerjakan**, satu per satu, dan ikut di *pull request* fiturnya. B01 ditulis begitu: bersama kodenya, bukan berbulan-bulan sebelumnya.

Alasannya sudah terbukti di folder sebelah: ketiga belas PRD feedback ditulis di depan sekaligus, dan sebagian sudah salah sebelum satu baris kodenya dibuat — karena keputusan yang menentukan bentuk fitur baru ketahuan saat mengerjakannya. Menulis sembilan PRD untuk fitur yang belum disentuh akan mengulang hal yang sama, dengan ongkos sehari kerja dan hasil yang perlu direvisi.

## Daftar dan urutannya

Kesembilan fiturnya, alasan urutannya, dan pertanyaan yang menahannya ada di **[Rencana kerja](../../rencana-kerja.md)** — tidak diulang di sini, supaya urutan kerja hanya punya satu tempat.

| # | Fitur | PRD |
|---|---|---|
| 1 | Menyimpan hasil perhitungan gizi | [B01](B01-simpan-hasil-gizi.md) — **selesai** |
| 2 | Pencatatan riwayat perubahan | [B02](B02-jejak-audit.md) — **selesai** |
| 3 | Memasukkan data arsip Excel | belum ditulis |
| 4 | Menyambungkan kelima layar ke basis data | belum ditulis |
| 5 | Menyimpan perubahan dari layar | belum ditulis |
| 6 | Menangani profil ganda | belum ditulis |
| 7 | Mengelola wilayah RT dan periode | belum ditulis |
| 8 | Mencatat layanan: imunisasi, Vitamin A, obat cacing | belum ditulis |
| 9 | Mengunduh rekap ke Excel | belum ditulis |

## Cara menambah satu

1. Baca [Format penulisan PRD](../format-prd.md) — sembilan bagian, urutannya tetap.
2. Beri nama `Bnn-<judul-ringkas>.md`, dengan `nn` mengikuti nomor di tabel atas.
3. Tulis PRD-nya, lalu kerjakan fiturnya di *pull request* yang sama.
4. Perbarui kolom PRD di tabel atas dan status di [Rencana kerja](../../rencana-kerja.md).
