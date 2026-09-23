# F13 — Checklist stimulasi perkembangan

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | ditahan — menunggu naskah pertanyaan |
| **PR** | belum dibuka |
| **Bergantung pada** | — |
| **Terhambat** | [OI-18](../../pertanyaan-terbuka.md) |
| **Perubahan berarti terakhir** | 21 September 2026 |

PRD ini ditulis lebih dulu tanpa PR implementasi, berbeda dari F01–F12. Sebabnya: naskah pertanyaannya belum ada, sehingga tidak ada kode yang bisa menemaninya — sementara **bentuk datanya** perlu disepakati sebelum Bidan menyusun naskah itu. Yang ditetapkan di sini strukturnya; isinya menyusul.

## 1. Latar

> "Request untuk menambahkan variabel data stimulasi (disesuaikan dengan umur (kemampuan anak memiliki batasan ukuran yang berbeda-beda tergantung dengan usia anaknya, dari data stimulasi tersebut akan diketahui apakah stimulasinya tercapai atau tidak))"

Yang diminta bukan sekadar kolom baru, melainkan **penilaian yang ambangnya bergeser mengikuti umur**. Pertanyaan yang benar untuk anak 9 bulan adalah pertanyaan yang salah untuk anak 4 tahun, dan sebaliknya.

Ini indeks ketujuh dalam arti tertentu: Portal sudah menilai enam indeks antropometri — seluruhnya tentang **tubuh** anak. Tidak satu pun tentang apa yang **bisa dilakukan** anak.

## 2. Lingkup

**Masuk:**

- Sembilan kelompok umur, empat aspek penilaian, 3–4 pertanyaan per aspek.
- Pengisian saat kader membuka baris anak, sama tempatnya dengan pengukuran.
- Satu status ringkas per pengisian: **Tercapai** atau **Perlu stimulasi tambahan**.
- Riwayat lintas periode, sejajar dengan riwayat pengukuran.

**Sengaja tidak masuk:**

- **Instrumen KPSP resmi Kemenkes lengkap** (9–10 pertanyaan per interval, skoring S/M/P). Keputusan pemilik program: checklist ringkas dulu. KPSP penuh menuntut naskah resmi, pelatihan kader, dan waktu pengisian yang tidak tersedia di meja Posyandu.
- **Vonis "Penyimpangan"**. Checklist ringkas tidak berhak mengeluarkan vonis perkembangan — itu wewenang instrumen resmi dan tenaga terlatih. Yang dikeluarkan hanya anjuran stimulasi tambahan dan, bila perlu, anjuran pemeriksaan lanjutan.
- **Grafik tren perkembangan.** Belum ada bentuk yang disepakati, dan data satu-dua periode tidak layak digambar sebagai garis.

## 3. Perilaku yang diharapkan

Kader membuka baris anak. Di bawah bagian Pengukuran muncul bagian **Stimulasi**, berisi pertanyaan yang **sudah tersaring menurut umur anak pada periode itu** — kader tidak pernah memilih kelompok umur sendiri, karena umur sudah dihitung sistem dari tanggal lahir (DR-03).

Tiap pertanyaan dijawab **Bisa** atau **Belum**. Tidak ada "tidak tahu": kalau kader tidak sempat menanyakan, seluruh bagian dilewat dan hasilnya kosong — bukan dijawab asal.

Hasilnya satu kalimat di bawah checklist:

| Keadaan | Yang ditampilkan |
|---|---|
| Semua aspek terpenuhi | **Tercapai.** Anjuran mempertahankan stimulasi sesuai tahapan umur. |
| Ada aspek belum terpenuhi | **Perlu stimulasi tambahan**, menyebut **aspek mana** — bukan sekadar "belum tercapai". Kader perlu tahu apa yang harus dilatih. |
| Belum diisi | Tidak ada vonis. Baris kosong, bukan "Tercapai". |
| Umur di luar 0–60 bulan | Bagian ini tidak dirender sama sekali. |

Keadaan yang harus dijaga: **anak yang belum diisi tidak boleh terbaca sebagai anak yang tercapai.** Ini pengulangan DR-04 pada wilayah baru — kosong bukan nol, dan kosong juga bukan normal.

## 4. Data & tipe yang berubah

```ts
// client/src/types/posyandu.ts

/** Empat aspek perkembangan, mengikuti pengelompokan Kemenkes. */
export type AspekStimulasi =
    'gerak_kasar' | 'gerak_halus' | 'bicara' | 'kemandirian';

/** Satu pertanyaan checklist. `kunci` stabil lintas versi naskah. */
export type ButirStimulasi = {
    kunci: string;
    aspek: AspekStimulasi;
    /** Batas bawah kelompok umur, dalam bulan penuh. */
    umurMin: number;
    umurMax: number;
    pertanyaan: string;
};

/** Jawaban satu anak pada satu periode. Kunci yang tidak ada = belum dijawab. */
export type Stimulasi = {
    anakId: number;
    periodeId: string;
    jawaban: Record<string, boolean>;
    /** Naskah versi berapa yang dipakai — sama alasannya dengan DR-06. */
    naskahVersi: string;
};
```

`naskahVersi` bukan hiasan. Naskah pertanyaan akan direvisi, dan jawaban lama harus tetap terbaca terhadap pertanyaan yang benar-benar diajukan saat itu. Alasannya persis sama dengan DR-06 pada versi standar antropometri.

Kelompok umur yang dipakai, mengikuti Kemenkes:

`0–3` · `3–6` · `6–9` · `9–12` · `12–18` · `18–24` · `24–36` · `36–48` · `48–60` bulan.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/lib/stimulasi.ts` | **Baru.** Naskah pertanyaan + `butirUntukUmur()` + `nilaiStimulasi()`. |
| `client/test/stimulasi.test.ts` | **Baru.** Pemeriksaan `assert`: penyaringan umur, dan keadaan kosong tidak menghasilkan "Tercapai". |
| `client/src/types/posyandu.ts` | Tipe di atas. |
| `client/src/pages/anak/index.tsx` | Bagian Stimulasi di editor baris. |
| `client/src/pages/anak/show.tsx` | Status stimulasi pada riwayat. |
| `client/src/data/contoh/posyandu.json` | Jawaban contoh. |
| `client/src/data/contoh/store.ts` | Selektor `stimulasiAnak()`. |

## 6. Keputusan terbuka

**[OI-18](../../pertanyaan-terbuka.md) — naskah pertanyaan stimulasi.** Yang dibutuhkan dari Bidan: 3–4 pertanyaan per aspek untuk tiap kelompok umur, memakai kalimat yang biasa dipakai kader saat bertanya ke ibu. Total 9 kelompok × 4 aspek × 3–4 butir.

**Sementara jawabannya belum ada:** fitur ini tidak dikerjakan. Struktur di bagian 4 bisa dibangun tanpa naskah, tetapi checklist kosong yang tidak menanyakan apa pun bukan fitur setengah jadi — ia layar yang menjanjikan sesuatu lalu menolaknya. Portal sudah punya aturan sendiri soal itu ([`rujukan/layar-demo.md`](../../rujukan/layar-demo.md) bagian 14, dan lihat komentar yang mencabut tombol `window.alert("Belum tersedia di demo")` pada `anak/show.tsx`).

**Belum diputuskan dan tidak menghambat:** apakah hasil stimulasi ikut ke pesan WhatsApp (F03) dan ke rekap F1 (F09). Keduanya bisa ditambahkan kemudian tanpa mengubah bentuk data.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Anak umur 8 bulan mendapat pertanyaan kelompok `6–9`, bukan kelompok lain. Anak 8 bulan dan anak 4 tahun tidak pernah melihat pertanyaan yang sama.
- [ ] Anak umur 61 bulan tidak merender bagian Stimulasi sama sekali.
- [ ] Menjawab seluruh butir "Bisa" → **Tercapai**.
- [ ] Satu butir dijawab "Belum" → **Perlu stimulasi tambahan**, dan **nama aspeknya disebut**.
- [ ] Anak yang belum diisi menampilkan baris kosong, **bukan** "Tercapai".
- [ ] Riwayat menampilkan status stimulasi tiap periode, sejajar dengan riwayat pengukuran.
- [ ] `stimulasi.test.ts` lulus dijalankan.
