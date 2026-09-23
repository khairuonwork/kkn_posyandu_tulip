# F01 — Kontak WhatsApp orang tua

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f01-kontak-wa` |
| **Bergantung pada** | — |
| **Terhambat** | — |
| **Perubahan berarti terakhir** | 21 September 2026 |
| **Membuka jalan bagi** | [F03](F03-kirim-whatsapp.md), [F07](F07-skrining-pendaftaran.md) |

## 1. Latar

> "Tambahin nomor kontak person orang tua (untuk membiasakan orangtua dengan data perbulan, menghindari miskomunikasi karena mayoritas orang tua tidak membaca output dari buku posyandu)"

Alasannya disebut sendiri oleh pemilik program, dan itu yang menentukan bentuk fiturnya: **buku Posyandu tidak dibaca.** Angka yang benar di buku yang tertutup sama tidak bergunanya dengan angka yang salah.

Kotak nomor telepon sebenarnya pernah ada di prototipe v2, lalu sengaja dicabut. Alasannya masih tertulis di [`anak/index.tsx`](../../../client/src/pages/anak/index.tsx):

> *"Telepon ada di v2 tapi tidak ada kolomnya di basis data (tabel `orang_tua` hanya menyimpan nik dan nama). Kotak yang tidak punya tempat menyimpan lebih buruk daripada kotak yang tidak ada."*

Skemanya kini ada di [`server/db/migrations/001_skema_awal.sql`](../../../server/db/migrations/001_skema_awal.sql), dan keadaannya belum berubah: `orang_tua` tetap tanpa kolom telepon.

F01 menutup alasan itu: tempat menyimpannya dibuat lebih dulu, kotaknya menyusul.

## 2. Lingkup

**Masuk:**

- Satu nomor WhatsApp per anak, melekat pada orang tuanya.
- Normalisasi saat disimpan, penyajian yang mudah dibaca saat ditampilkan.
- Muncul di tiga tempat: editor baris Data Balita, form Tambah balita, dan blok Identitas Detail anak.
- Keadaan **belum tercatat** yang eksplisit — bukan string kosong yang menyamar sebagai nomor.

**Sengaja tidak masuk:**

- **Mengirim apa pun.** Menyusun dan meneruskan pesan adalah [F03](F03-kirim-whatsapp.md). F01 hanya menyediakan nomornya.
- **Verifikasi nomor aktif.** Tidak ada cara memeriksanya tanpa mengirim pesan, dan mengirim pesan percobaan ke orang tua balita bukan hal yang pantas dilakukan diam-diam.
- **Lebih dari satu nomor per anak.** Belum ada permintaannya. Kolom tunggal bisa dipecah kemudian; struktur banyak-nomor yang tidak pernah terpakai tidak bisa disederhanakan kembali dengan murah.
- **Nomor ayah terpisah dari ibu.** Arsip hanya memuat satu nama orang tua per anak ([OI-09](../../pertanyaan-terbuka.md)), jadi kolom kedua tidak punya pemilik yang jelas.

## 3. Perilaku yang diharapkan

Kader mengetik nomor apa adanya seperti tertulis di buku atau di ponselnya — `0812-3456-7890`, `0812 3456 7890`, atau `+62 812 3456 7890`. Ketiganya diterima dan menghasilkan satu nilai tersimpan yang sama.

| Keadaan | Yang terjadi |
|---|---|
| Nomor sah | Disimpan `6281234567890`, ditampilkan `+62 812-3456-7890` |
| Kotak dikosongkan | Tersimpan `null`, ditampilkan `—` seperti sel kosong lain (DR-04) |
| Kurang dari 9 atau lebih dari 15 digit | Peringatan di bawah kotak, **isian tidak diblokir** |
| Ada huruf di dalamnya | Huruf diabaikan saat normalisasi; bila sisanya bukan nomor sah, berlaku baris di atas |

Peringatan, bukan penolakan. Alasannya sama dengan yang sudah dipegang layar Pengaturan: *batas ditetapkan bersama, dan kader tidak pernah diblokir oleh sistem.* Nomor aneh yang tercatat masih bisa diperbaiki bulan depan; nomor yang gagal disimpan hilang bersama orang tuanya yang sudah pulang.

Aturan normalisasi, seluruhnya:

| Masukan | Tersimpan | Sebab |
|---|---|---|
| `0812…` | `62812…` | Nol di depan diganti kode negara |
| `+62812…` | `62812…` | Tanda plus dibuang, sudah berkode negara |
| `62812…` | `62812…` | Sudah baku |
| `812…` | `62812…` | Nol pun tidak ditulis; tetap nomor Indonesia |
| spasi, `-`, `(`, `)` | dibuang | Kader menyalin apa yang tertera |

## 4. Data & tipe yang berubah

```ts
// client/src/types/posyandu.ts — pada type Anak, sebaris dengan namaOrtu
/** Nomor WhatsApp orang tua, baku 62xxx. Null berarti belum tercatat. */
noWaOrtu: string | null;
```

Menempel pada `Anak`, bukan pada tipe orang tua tersendiri — mengikuti `namaOrtu` dan `nikOrtu` yang sudah lebih dulu didatarkan begitu di demo.

**Untuk backend nanti:** kolomnya milik `orang_tua`, bukan `anak` — dua kakak-adik berbagi satu nomor ibu. Bentuk propsnya tetap seperti di atas; yang berubah hanya dari mana controller mengambilnya.

**Data demo.** Arsip Excel **tidak memuat satu pun nomor telepon**, jadi nilainya dibuat di `extract-demo-data.py`, sederet dengan `nik_palsu()` yang sudah ada. Sebagian sengaja dibiarkan `null`: keadaan "belum tercatat" harus punya wujud di layar sejak awal, dan [F07](F07-skrining-pendaftaran.md) menjadikannya salah satu butir skrining.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/lib/telepon.ts` | **Baru.** `bakukanNomor()`, `tampilkanNomor()`, `nomorSah()`. |
| `client/test/telepon.test.ts` | **Baru.** Tabel masukan → keluaran pada bagian 3. |
| `client/src/types/posyandu.ts` | Field `noWaOrtu` pada `Anak`. |
| `client/src/pages/anak/index.tsx` | Kotak isian di `EditorBaris` dan `FormTambah`; field pada `PatchAnak` dan `AnakBaru`; komentar pencabutan v2 dihapus. |
| `client/src/pages/anak/show.tsx` | Satu `BarisDefinisi` di blok Identitas, sesudah `Ibu`. |
| `client/demo/DemoApp.tsx` | `terapkanKoreksi()` dan `keBaris()` meneruskan field baru. |
| `client/src/data/contoh/extract-demo-data.py` | Nomor contoh, sebagian `null`. |
| `client/src/data/contoh/posyandu.json` | Dibangkitkan ulang. |

## 6. Keputusan terbuka

**[OI-10](../../pertanyaan-terbuka.md) — kebijakan retensi dan privasi.** F01 menambah jenis data pribadi yang sebelumnya tidak pernah disimpan sistem: kontak seluruh orang tua balita satu RW. Isu ini sudah menyatakan harus selesai **sebelum sistem menyimpan data sungguhan di server yang dapat diakses dari internet** — dan F01 menaikkan taruhannya, bukan menciptakannya.

**Tidak menghambat:** demo memakai nomor buatan, jadi F01 boleh dikerjakan sekarang. Yang tidak boleh adalah memuat nomor sungguhan sebelum OI-10 selesai.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] `0812-3456-7890`, `+62 812 3456 7890`, dan `812 3456 7890` menghasilkan nilai tersimpan yang sama persis.
- [ ] Nomor tersimpan ditampilkan `+62 812-3456-7890`, bukan `6281234567890` telanjang.
- [ ] Mengosongkan kotak menghasilkan `—` di Identitas, bukan string kosong dan bukan `0`.
- [ ] Mengetik 5 digit memunculkan peringatan, dan tombol **Simpan perubahan tetap bisa ditekan**.
- [ ] Ada anak di data contoh yang nomornya `null`, terlihat sebagai `—`.
- [ ] `telepon.test.ts` lulus dijalankan.
