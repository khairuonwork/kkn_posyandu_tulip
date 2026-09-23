# F06 — Status pertumbuhan N/T/O/B terhitung

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f06-ntob` |
| **Bergantung pada** | — |
| **Terhambat** | [OI-01](../../pertanyaan-terbuka.md) — tabel KBM, untuk N dan T saja |
| **Perubahan berarti terakhir** | 21 September 2026 |
| **Membuka jalan bagi** | [F09](F09-laporan-f1.md) |

## 1. Latar

> "BB, TB, Lila, Lika, N/T OB (referensi kenaikan/penurunannya dilihat dari data 2 bulan kebelakang)"

Hari ini keempat huruf itu **dibaca mentah dari arsip Excel**, tidak dihitung sama sekali. `pengukuran.ntob_raw` menyimpan apa pun yang tertulis di sana — termasuk `" N"` berspasi — dan Portal menampilkannya apa adanya.

Akibatnya arsip bisa membantah dirinya sendiri tanpa ada yang tahu. Satu contoh nyata sudah tercatat di [`client/src/data/contoh/store.ts`](../../../client/src/data/contoh/store.ts): arsip Januari 2026 memuat satu baris ber-`ntob: 'T'` yang status kehadirannya `tidak_hadir` — hasil penimbangan untuk anak yang tidak ditimbang, di lembar yang ditandatangani bidan dan dikirim ke Puskesmas.

## 2. Lingkup

**Masuk:**

- **O** dan **B** dihitung sistem dari kehadiran.
- Perbandingan hitungan terhadap nilai arsip, dilaporkan sebagai satu angka, bukan per baris.
- Badge tren di Detail anak memakai nilai terhitung untuk O dan B.

**Sengaja tidak masuk:**

- **N dan T.** Terikat DR-08 sampai tabel KBM datang. Lihat bagian 6 — ini pembatasan yang disengaja, bukan pekerjaan yang belum selesai.
- **1T / 2T / 3T.** Aturan berturut-turutnya belum dikonfirmasi ([OI-01](../../pertanyaan-terbuka.md)), dan salah menandai anak dua arah sama merugikannya.
- **Menimpa nilai arsip.** Nilai mentah tetap tersimpan dan tetap terbaca. Perbedaan dilaporkan, tidak dihapus.

## 3. Perilaku yang diharapkan

Keempat huruf punya arti yang sudah dipakai Portal di tiga layar:

| Huruf | Arti | Dihitung dari |
|---|---|---|
| **N** | Naik memenuhi KBM | *tertahan* — butuh tabel KBM |
| **T** | Tidak naik | *tertahan* — butuh tabel KBM |
| **O** | Bulan lalu tidak ditimbang, bulan ini ditimbang | `status_kehadiran`, dua periode |
| **B** | Baru pertama kali ditimbang | tidak ada penimbangan sebelumnya sama sekali |

**B mendahului O.** Anak yang baru pertama ditimbang juga secara harfiah "tidak ditimbang bulan lalu", jadi tanpa urutan yang tegas ia akan terhitung dua kali dan rekap `N+T+O+B` melampaui `D`.

**"Bulan lalu" berarti periode sebelumnya, bukan bulan kalender sebelumnya.** Posyandu Tulip berkegiatan sekali sebulan, tetapi tanggalnya bergeser — Januari tanggal 10, Februari tanggal 14. Yang dibandingkan periode yang berurutan di dalam data, bukan selisih tanggal.

**Anak yang tidak hadir tidak mendapat huruf apa pun.** Keempatnya menggambarkan hasil penimbangan; baris tanpa penimbangan tidak berhak atas satu pun. Aturan ini sudah dipegang `hitungNtob()` dan tetap berlaku.

**Perbedaan dilaporkan sekali, bukan per baris.** Bila hitungan O/B tidak sependapat dengan arsip, Portal tidak menimpa dan tidak pula menaburkan tanda seru di seratus baris. Satu keterangan di layar Laporan menyebut jumlahnya beserta tautan ke daftarnya. Yang dilaporkan adalah mutu arsip, dan tempat yang tepat untuk itu adalah layar yang memang tentang rekap.

## 4. Data & tipe yang berubah

```ts
// client/src/lib/ntob.ts
export type Ntob = 'N' | 'T' | 'O' | 'B';

/**
 * Huruf yang dapat dipastikan dari kehadiran saja. Mengembalikan null untuk
 * anak hadir yang bukan B dan bukan O — di sanalah N dan T berada, dan
 * keduanya belum boleh dihitung (DR-08).
 */
export function ntobDariKehadiran(
    riwayat: Pengukuran[],
    periodeId: string,
): Ntob | null;

/** Nilai arsip yang tidak sependapat dengan hitungan O/B. */
export function selisihArsip(
    riwayat: Pengukuran[],
): { anakId: number; periodeId: string; arsip: string; hitung: Ntob }[];
```

`Pengukuran.ntob` tetap memuat nilai arsip dan tidak diubah. Nilai terhitung adalah turunan, bukan pengganti.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/lib/ntob.ts` | **Baru.** Kedua fungsi di atas. |
| `client/test/ntob.test.ts` | **Baru.** B mendahului O; `O+B ≤ D`; anak tidak hadir tidak berhuruf; jeda dua periode. |
| `client/src/pages/anak/show.tsx` | Kolom `Pertumbuhan` memakai nilai terhitung untuk O dan B; nilai arsip tampil sebagai keterangan bila berbeda. |
| `client/src/data/contoh/store.ts` | `hitungNtob()` memakai `ntobDariKehadiran()` untuk O dan B; N dan T tetap dari arsip. |
| `client/src/pages/laporan/index.tsx` | Satu baris keterangan jumlah selisih arsip. |

## 6. Keputusan terbuka

**[OI-01](../../pertanyaan-terbuka.md) — tabel KBM per umur, dan aturan 1T/2T/3T.**

DR-08 pada [PRD utama](../prd-utama.md) melarang definisi `NTOB` diaktifkan otomatis sebelum dikonfirmasi pemilik program. Itu aturan mengikat yang diverifikasi lewat *test*, bukan imbauan.

**DR-11 mengecualikan O dan B**, dan alasannya ditulis di sana: keduanya hanya menyatakan **apakah anak ditimbang** — terbaca langsung dari `status_kehadiran`, tanpa satu pun ambang yang diperdebatkan. Yang ditunggu OI-01 adalah tabel KBM, dan KBM hanya memisahkan N dari T. Menahan O dan B ikut menunggu berarti menahan angka yang sudah pasti benar.

**Sementara N dan T belum boleh dihitung:** keduanya tetap dibaca dari arsip persis seperti hari ini, dan layar tidak berpura-pura tahu lebih banyak.

Bila tabel KBM datang, yang perlu dikerjakan tinggal: tabel KBM per kelompok umur, satu percabangan di `ntobDariKehadiran()`, dan pencabutan pengecualian di DR-11. Bentuk data dan tempat pemanggilannya tidak berubah.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Jumlah **O + B** hasil hitung **sama persis** dengan cacah manual dari `statusKehadiran` pada periode yang sama.
- [ ] `N + T + O + B` **tidak pernah melampaui D** di satu pun RT, di satu pun periode.
- [ ] Anak yang pertama kali ditimbang berhuruf **B**, bukan O.
- [ ] Anak yang absen Mei lalu hadir Juni berhuruf **O**.
- [ ] Anak yang tidak hadir tidak berhuruf sama sekali — termasuk baris Januari yang di arsip tertulis `T`.
- [ ] Kolom **N** dan **T** pada Laporan **tidak berubah** dari nilai arsip.
- [ ] Baris keterangan selisih arsip muncul di Laporan dan menyebut angka yang benar.
- [ ] `ntob.test.ts` lulus dijalankan.
