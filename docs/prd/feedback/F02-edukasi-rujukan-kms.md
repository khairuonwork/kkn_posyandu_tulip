# F02 — Edukasi & anjuran rujukan di KMS

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f02-edukasi-kms` |
| **Bergantung pada** | — |
| **Terhambat** | — |
| **Perubahan berarti terakhir** | 21 September 2026 |
| **Membuka jalan bagi** | [F03](F03-kirim-whatsapp.md) |

## 1. Latar

> "di KMS muncul : kata2 edukasi untuk pengarahan kepada sasaran, disesuaikan dg hasil nya"

> "Termasuk : kalau sudah diatas -1,96 = silahkan hubungi faskes dan dokter terdekat"

Hari ini Portal berhenti tepat sebelum bagian yang berguna. Ia menghitung z-score, memberinya warna, menuliskan kategorinya — lalu diam. Kader yang berdiri di depan ibu harus menerjemahkan sendiri `−2,6 SD · Gizi kurang` menjadi kalimat yang bisa diucapkan.

Masalah yang sama sudah tercatat di [OI-14](../../pertanyaan-terbuka.md), dengan catatan desainer yang tidak diberikan pada butir lain: *"Satu-satunya kekurangan yang berakibat pada anaknya, bukan pada kerapian data."*

F02 bukan sistem rujukan penuh — OI-14 tetap terbuka. Yang ditutupnya lebih kecil dan lebih mendesak: **memberi kader kalimat untuk diucapkan.**

## 2. Lingkup

**Masuk:**

- Satu kartu di bawah kurva KMS pada Detail anak, isinya menyesuaikan hasil ukur anak itu.
- Tiga nada: **rujuk** (merah), **waspada** (oranye), **baik** (hijau).
- Satu fungsi murni yang bisa dipakai ulang oleh [F03](F03-kirim-whatsapp.md), sehingga kalimat di layar dan kalimat di WhatsApp tidak pernah berbeda.

**Sengaja tidak masuk:**

- **Pencatatan rujukan** — siapa dirujuk, kapan, sudah berangkat atau belum. Itu [OI-14](../../pertanyaan-terbuka.md), dan pertanyaannya alur kerja Posyandu, bukan teknis.
- **Nama atau alamat faskes tertentu.** Portal tidak tahu Puskesmas mana yang terdekat, dan menebaknya lebih buruk daripada menulis "faskes terdekat".
- **Anjuran medis rinci** — dosis, jenis makanan, jadwal. Portal bukan tenaga kesehatan. Yang keluar hanya arahan umum dan anjuran memeriksakan.
- **Nada keempat.** Tiga sudah menutup seluruh keadaan; yang keempat hanya membuat kader ragu mana yang lebih genting.

## 3. Perilaku yang diharapkan

Kartu berdiri tepat di bawah kurva, tempat mata kader jatuh setelah membaca titik terakhir.

**Satu anak mendapat tepat satu nada.** Seorang anak bisa sekaligus pendek dan gizi kurang; kartunya tidak boleh menjadi dua. Yang memimpin adalah vonis terberat — aturan yang sudah dipakai `show.tsx` lewat `URUT_NADA`, dan dipakai ulang di sini alih-alih ditulis lagi.

| Nada | Kapan | Isi kartu |
|---|---|---|
| **Rujuk** (merah) | Ada indeks di luar pita normal — lihat bagian 6 | Sebut indeks dan kategorinya, lalu anjuran menghubungi faskes atau dokter terdekat |
| **Waspada** (oranye) | Masih di dalam pita normal, tetapi berat tidak naik | Anjuran evaluasi pemberian makan dan memeriksa penyakit penyerta. **Tanpa** anjuran rujukan |
| **Baik** (hijau) | Selebihnya | Apresiasi, dan anjuran mempertahankan sesuai tahapan umur |
| **Tidak ada kartu** | Belum ditimbang pada periode ini, atau tidak satu pun indeks dapat dihitung | Layar sudah punya spanduk "Belum ditimbang pada …"; kartu kedua hanya mengulang |

Dua hal yang harus dijaga:

**Angka yang basi tidak boleh berbicara seolah baru.** Layar ini sudah menandai pengukuran dari periode sebelumnya lewat spanduk oranye. Kartu edukasi mengikuti angka yang sama, jadi kalimatnya menyebut tanggal ukurnya — bukan berbicara seolah anak baru saja ditimbang.

**Kategori kosong bukan kategori baik.** LILA/U tidak punya label ([OI-04](../../pertanyaan-terbuka.md)) dan anak tanpa data tidak punya z-score. Keduanya tidak pernah menghasilkan nada hijau; mereka tidak menghasilkan apa-apa.

## 4. Data & tipe yang berubah

Tidak ada field baru. Seluruh masukannya sudah ada di `Pengukuran`.

```ts
// client/src/lib/edukasi.ts
export type NadaEdukasi = 'rujuk' | 'waspada' | 'baik';

export type Edukasi = {
    nada: NadaEdukasi;
    /** Satu baris: apa yang terbaca dari angkanya. */
    ringkas: string;
    /** Dua sampai tiga kalimat: apa yang sebaiknya dilakukan. */
    anjuran: string;
};

export function edukasiDari(
    ukur: Pengukuran,
    umurBulan: number | null,
): Edukasi | null;
```

Yang dipakai ulang, bukan ditulis ulang:

| Dari | Untuk |
|---|---|
| `nadaKategori()` dan `PERLU_TINDAK_LANJUT` di [`status-gizi-badge.tsx`](../../../client/src/components/status-gizi-badge.tsx) | Menentukan indeks terberat dan warnanya |
| `labelIndeks()` di [`lib/format.ts`](../../../client/src/lib/format.ts) | Menyebut PB/U atau TB/U sesuai umur |
| `kategoriDariZ()` di [`lib/kategori.ts`](../../../client/src/lib/kategori.ts) | Ambang PMK 2/2020 |

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/lib/edukasi.ts` | **Baru.** Fungsi di atas beserta naskah kalimatnya. |
| `client/test/edukasi.test.ts` | **Baru.** Satu nada per anak, kategori kosong tidak menghasilkan hijau, ambang OI-16 berdiri di satu tempat. |
| `client/src/components/kartu-edukasi.tsx` | **Baru.** Penyaji kartu, memakai token nada yang sudah ada. |
| `client/src/pages/anak/show.tsx` | Kartu dipasang di bawah `KmsChart`. |

## 6. Keputusan yang sudah diambil

**[OI-16](../../pertanyaan-terbuka.md) — arah ambang "−1,96", dikonfirmasi 17 September 2026.** Kalimat aslinya berbunyi *"di atas −1,96"*, yang dibaca harfiah justru mencakup anak normal dan gemuk. Dikonfirmasi bahwa maksudnya klinis: anak yang melewati ambang itu **ke bawah** (dan sisi gizi lebih/obesitas ikut berlaku, lihat tabel di bawah).

**Dikonfirmasi 17 September 2026**, dan inilah yang menentukan nada rujuk:

| Indeks | Ambang rujuk |
|---|---|
| BB/U, TB/U (PB/U) | `z < −2` |
| BB/TB (BB/PB), IMT/U | `z < −2` **atau** `z > +2` |
| LILA/U | tidak memicu rujukan — belum punya label ([OI-04](../../pertanyaan-terbuka.md)) |
| LIKA/U | `z < −2` atau `z > +2`, kategorinya sudah ada |

Ambangnya **berdiri di satu konstanta**, bukan tersebar sebagai angka `-2` di banyak percabangan. Koreksi nanti mengubah satu baris, dan `edukasi.test.ts` yang membuktikan tidak ada salinan lain yang tertinggal.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Anak ber-`BB/TB −2,6` mendapat kartu **merah** yang menyebut faskes.
- [ ] Anak ber-`BB/TB −0,4` dan berat naik mendapat kartu **hijau**, tanpa kata faskes.
- [ ] Anak sekaligus `Pendek` dan `Gizi kurang` mendapat **satu** kartu, bukan dua.
- [ ] Anak obesitas (`z > +3`) mendapat kartu merah — bukan hijau karena "bukan kurang".
- [ ] Anak yang belum ditimbang periode ini tidak mendapat kartu sama sekali.
- [ ] Anak dengan angka dari bulan sebelumnya: kartunya menyebut tanggal ukur itu.
- [ ] `edukasi.test.ts` lulus dijalankan.
