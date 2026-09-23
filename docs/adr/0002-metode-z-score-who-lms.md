# ADR-0002 — Z-score dihitung dengan metode WHO LMS

- **Status:** Accepted
- **Tanggal:** 2026-09-09
- **Menggantikan:** rancangan `STANDAR_ANTROPOMETRI` bergaya tabel SD pada ERD v1.0

> **Catatan 22 September 2026.** Metodenya **tetap berlaku utuh**. Dua jalur berkas yang disebut di bagian Konsekuensi sudah pindah sejak [ADR-0006](0006-pindah-ke-express-react-postgres.md): *seed* kini di `server/db/data/who-lms.json`, dan rumusnya di `server/src/antropometri/`. Kesetaraan dengan implementasi PHP lama dibekukan di `server/test/acuan-php.json` — 2.076 kasus, selisih terbesar 4,4 × 10⁻¹⁵.

## Konteks

File referensi `ref kemenkes & who.xlsx` yang dipelihara pemilik program berisi **dua** bentuk standar sekaligus untuk indeks yang sama:

1. **Tabel SD Permenkes** — kolom `-3 SD`, `-2 SD`, `-1 SD`, `Median`, `+1 SD`, `+2 SD`, `+3 SD` per umur atau per panjang badan.
2. **Tabel LMS WHO** — kolom `L`, `M`, `S` per umur atau per panjang badan.

Keduanya tersedia untuk BB/U, TB/U, BB/TB, IMT/U, LILA/U, dan LIKA/U, masing-masing untuk laki-laki dan perempuan. Keberadaan file `6_JUNI 2026_MASTER Z SCORE_PERMENKES vs WHO.xlsx` menunjukkan pemilik program sudah sadar keduanya bisa memberi angka yang sedikit berbeda.

ERD v1.0 merancang tabel standar bergaya SD dan rumus interpolasi dua cabang:

```text
Jika X < M:  Z = (X - M) / (M - SD-1)
Jika X >= M: Z = (X - M) / (SD+1 - M)
```

Rumus itu adalah pendekatan: ia mengasumsikan distribusi simetris di antara dua garis SD terdekat, padahal distribusi antropometri anak miring (*skewed*), terutama pada indeks berbasis berat.

## Keputusan

**Z-score dihitung dengan metode LMS WHO. Ambang kategori tetap mengikuti PMK 2/2020.**

Perhitungan:

```text
L != 0 :  Z = ((X / M)^L - 1) / (L * S)
L == 0 :  Z = ln(X / M) / S
```

Untuk indeks berbasis berat (BB/U, BB/TB, IMT/U), bila hasilnya berada di luar rentang ±3, WHO menetapkan koreksi ekstrapolasi linear. Koreksi ini **diterapkan**, tidak disederhanakan. Rinciannya di [`rujukan/antropometri.md`](../rujukan/antropometri.md).

Tabel referensi berpindah dari kolom `-3sd … +3sd` menjadi kolom `l`, `m`, `s` pada tabel `standar_lms`.

## Alasan

| Pertimbangan | LMS | Tabel SD + interpolasi |
|---|---|---|
| Ketepatan pada distribusi miring | Tepat menurut definisi. `L` justru parameter yang menangani kemiringan. | Pendekatan; makin jauh dari median makin melenceng. |
| Ukuran data referensi | 3 kolom per baris | 7 kolom per baris |
| Kompleksitas kode | Satu rumus | Dua cabang plus interpolasi antar garis SD |
| Nilai di luar ±3 SD | Ditangani aturan WHO yang eksplisit | Tidak terdefinisi; harus diekstrapolasi sendiri |
| Kecocokan dengan laporan resmi | Sama, karena **ambang kategorinya identik** | Sama |

Poin terakhir yang membuat keputusan ini aman: PMK 2/2020 memang menurunkan tabel SD-nya dari standar WHO yang sama, dan **ambang kategorinya identik** (`< -3 SD`, `-3 SD sampai < -2 SD`, dan seterusnya). Yang berbeda hanya cara sampai ke angka z-score, bukan cara membaca angka itu menjadi label. Karena itu label pada laporan tetap cocok dengan yang diharapkan Puskesmas.

## Konsekuensi

- Tabel `standar_lms` menyimpan `l`, `m`, `s`. Seed diekstrak dari `ref kemenkes & who.xlsx` ke `database/data/who-lms.json` yang di-*commit* ke repo, sehingga aplikasi tidak bergantung pada file Excel yang berada di luar repo.
- Setiap baris `penilaian_gizi` menyimpan `standar_versi` (nilai awal: `WHO-2006`), sesuai DR-06.
- Selisih kecil terhadap angka pada file `PERMENKES vs WHO.xlsx` dapat terjadi pada kolom Permenkes-nya. Yang dijadikan *acceptance test* adalah **kolom WHO** pada file tersebut, dengan toleransi 0,01.
- Bila suatu saat Puskesmas menuntut angka Permenkes secara eksplisit, metode kedua dapat ditambahkan sebagai `standar_versi` baru tanpa mengubah data lama.

## Alternatif yang ditolak

| Alternatif | Alasan ditolak |
|---|---|
| Interpolasi tabel SD (ERD v1.0) | Kurang tepat pada distribusi miring, justru pada kasus gizi buruk dan obesitas yang paling penting akurasinya. |
| Menghitung kedua metode berdampingan | Menggandakan baris `penilaian_gizi` dan menimbulkan pertanyaan "yang mana yang benar" di setiap layar. Ditunda sampai ada kebutuhan nyata. |
| Kader memilih status secara manual | Menghilangkan alasan utama keberadaan sistem ini. |
