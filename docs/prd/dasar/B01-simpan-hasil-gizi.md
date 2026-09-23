# B01 — Menyimpan hasil perhitungan gizi

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | selesai — kodenya berjalan dan teruji; pemakai pertamanya menunggu butir 3 |
| **PR** | `feat/b01-simpan-gizi` |
| **Bergantung pada** | — |
| **Terhambat** | — |
| **Perubahan berarti terakhir** | 22 September 2026 |

## 0. Ringkasan

Sistem sudah bisa menghitung status gizi enam indeks dengan benar, tetapi belum bisa menyimpannya — bagian penyimpanan tertinggal saat pindah dari Laravel. Fitur ini mengembalikannya: satu fungsi yang membaca sebuah pengukuran, menghitung penilaiannya, dan menulis hasilnya ke tabel `penilaian_gizi`. Tidak terlihat kader sama sekali, tetapi delapan pekerjaan berikutnya di [Rencana kerja](../../rencana-kerja.md) menunggunya, karena semuanya butuh tempat menaruh hasil hitungan. Kecil — satu repository, satu service, nol dependensi baru.

## 1. Latar

[ADR-0006](../../adr/0006-pindah-ke-express-react-postgres.md) memindahkan mesin gizi dari PHP ke TypeScript. Yang diport hanya `hitung()`; `simpan()` sengaja ditinggal dengan alasan yang tertulis di kepala `server/src/antropometri/penilaian-gizi.ts`:

> `simpan()` tidak ikut: ia menulis ke basis data, dan itu tugas repository — bukan tugas mesin hitung.

Alasannya benar dan tetap dipertahankan. Yang belum ada adalah repository-nya.

Akibatnya sampai fitur ini dibangun: tabel `penilaian_gizi` beserta *constraint* uniknya sudah berdiri sejak migrasi pertama dan **tidak pernah terisi**. Mesin hitungnya terbukti setara implementasi lama sampai 4,4 × 10⁻¹⁵ pada 2.076 kasus, tetapi tidak satu pun angkanya bertahan setelah proses berakhir.

## 2. Lingkup

**Masuk:**

- Membaca masukan penilaian satu pengukuran dari basis data — tanggal lahir dan jenis kelamin anaknya ikut, karena umur menentukan seluruh z-score.
- Menyimpan hasil enam indeks, satu baris per indeks yang **dapat** dihitung.
- Menghitung ulang: menimpa nilai lama, bukan menambah baris.
- Membersihkan indeks yang tidak lagi dapat dihitung setelah nilai ukurnya dikoreksi.
- Versi borongan satu periode, untuk dipakai impor arsip nanti.

**Sengaja tidak masuk:**

- **Endpoint HTTP.** Belum ada yang memanggilnya dari luar. Menambahkannya sekarang berarti menebak bentuk permintaan sebelum ada layar yang mengirimnya — itu pekerjaan butir 4 dan 5.
- **Jejak audit.** Milik butir 2, dan sengaja dikerjakan tepat sesudah ini supaya tidak ada fitur yang terlanjur dibangun tanpanya.
- **Memicu perhitungan ulang otomatis** saat pengukuran berubah. Tidak ada jalur yang mengubah pengukuran hari ini; pemicunya dipasang bersama jalur itu.
- **Menghitung ulang seluruh basis data** saat versi standar berganti. Kontinjensi [ADR-0005](../../adr/0005-migrasi-metode-zscore.md), bukan kebutuhan sekarang.

## 3. Perilaku yang diharapkan

Fitur ini tidak terlihat kader, jadi perilakunya ditulis dari sudut data.

**Masuk:** sebuah `pengukuran_id`.
**Keluar:** baris `penilaian_gizi` untuk pengukuran itu menjadi persis sama dengan apa yang dihasilkan mesin hitung atas nilai ukur terkininya — tidak lebih, tidak kurang.

| Keadaan | Yang terjadi |
|---|---|
| Nilai ukur lengkap | Enam baris tersimpan, satu per indeks |
| Berat kosong | BB/U, BB/TB, dan IMT/U **tidak menghasilkan baris**; TB/U, LILA/U, LIKA/U tetap |
| Anak tidak hadir, seluruh nilai ukur kosong | Nol baris. Ini hasil yang sah, bukan galat |
| Umur di bawah batas minimum indeks | Indeks itu dilewati — LILA/U hanya berlaku sejak 6 bulan |
| Dihitung ulang, nilai ukur tidak berubah | Angkanya sama, jumlah barisnya sama. Hanya `dihitung_pada` bergeser |
| Dihitung ulang setelah berat dikoreksi menjadi kosong | Baris BB/U yang lama **dihapus**, bukan dibiarkan memuat angka dari berat yang sudah tidak ada |
| `pengukuran_id` tidak ada | Melempar `GalatPengukuranTidakAda` yang menyebut idnya |

**Ketiadaan baris berarti "tidak dapat dihitung".** Ini keputusan yang sudah berdiri di mesin hitung dan diteruskan apa adanya ke penyimpanan. Menyimpan baris ber-`z_score` `NULL` akan membuat setiap pembaca harus ingat membedakan "belum dihitung" dari "tidak dapat dihitung", dan rekap yang lupa membedakannya akan menghitung anak yang tidak punya angka sebagai anak bergizi baik.

**Satu transaksi.** *Upsert* dan penghapusan terjadi bersama. Tanpa itu, rekap yang dibaca tepat di antara keduanya akan memuat baris yang seharusnya sudah hilang.

**Versi standar lain tidak tersentuh** (DR-06). Menghitung ulang `WHO-2006` tidak mengubah baris versi lain, sehingga [ADR-0005](../../adr/0005-migrasi-metode-zscore.md) dapat dilaksanakan nanti tanpa migrasi data.

## 4. Data & tipe yang berubah

**Tidak ada perubahan skema.** Tabel `penilaian_gizi` beserta `CONSTRAINT penilaian_gizi_unik UNIQUE (pengukuran_id, indeks, standar_versi)` sudah ada sejak `001_skema_awal.sql`, dan *constraint* itulah yang membuat *upsert* mungkin.

Satu tipe baru:

| Tipe | Isi |
|---|---|
| `BarisPengukuran` | `PengukuranMasukan` yang sudah ada, ditambah `id`. Bentuk yang dikembalikan query pembacaan |

`tgl_lahir` dan `tanggal_ukur` dikembalikan driver sebagai objek `Date` dalam zona waktu mesin, sedangkan mesin hitung menuntut ISO `YYYY-MM-DD` justru supaya zona waktu tidak pernah ikut menentukan umur. Konversinya dilakukan dari komponen tanggal lokal, **bukan** `toISOString()` — yang terakhir menggeser satu hari di zona waktu timur, dan pergeseran satu hari dapat mengubah umur satu bulan penuh.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `server/src/repositories/penilaian-gizi-repository.ts` | **Baru.** `ambilMasukan()`, `ambilMasukanPeriode()`, `simpanPenilaian()` |
| `server/src/services/gizi-service.ts` | **Baru.** `hitungDanSimpan()`, `hitungDanSimpanPeriode()`, `GalatPengukuranTidakAda` |
| `server/test/gizi-simpan.test.ts` | **Baru.** Lima kasus; dilewati bila `DATABASE_URL` kosong |

Query pembacaan pengukuran sementara tinggal di repository penilaian gizi, karena satu-satunya pemakainya adalah penilaian gizi. Ditandai `ponytail:` untuk dipindahkan ke `pengukuran-repository.ts` saat CRUD pengukuran dibangun (butir 5).

## 6. Keputusan terbuka

Tidak ada yang menahan fitur ini. Dua yang bersinggungan dan sudah punya jawaban sementara:

- **Pembulatan versus interpolasi tabel BB/TB** — pertanyaan nomor 2 pada [Rencana kerja](../../rencana-kerja.md). Tidak menahan: apa pun jawabannya, ia mengubah *mesin hitungnya*, bukan cara menyimpan. Bila nanti berubah, hitung ulang cukup memanggil fungsi yang sama.
- **Kategori LILA/U di bawah −2 SD** ([OI-04](../../pertanyaan-terbuka.md)) — `kategori` disimpan `NULL` untuk LILA/U, meneruskan keputusan mesin hitung apa adanya.

## 7. Kriteria terima

- [x] `npm run types:check` di `server/` lulus
- [x] Angka yang dibaca kembali dari basis data **sama persis** dengan keluaran `hitungPenilaian()` untuk pengukuran yang sama — membuktikan `numeric(6,3)` tidak memotong digit
- [x] Memanggil `hitungDanSimpan()` tiga kali berturut-turut menghasilkan jumlah baris dan angka yang sama
- [x] Mengosongkan `bb_kg` lalu menghitung ulang menghapus baris BB/U, BB/TB, dan IMT/U, sementara TB/U tetap ada
- [x] Baris versi standar `UJI-LAMA` tetap utuh setelah `WHO-2006` dihitung ulang
- [x] `pengukuran_id` yang tidak ada melempar `GalatPengukuranTidakAda`
- [ ] Dipakai sungguhan oleh impor arsip — menunggu butir 3

## 8. Alternatif yang ditolak

| Alternatif | Alasan ditolak |
|---|---|
| Menyimpan baris ber-`z_score` `NULL` untuk indeks yang tidak dapat dihitung | Menuntut setiap pembaca membedakan "belum dihitung" dari "tidak dapat dihitung". Rekap yang tidak membedakannya akan salah menghitung anak tanpa angka, tanpa memunculkan galat apa pun. Skema tetap mengizinkannya (`z_score` *nullable*), jadi pilihan ini masih terbuka bila ternyata dibutuhkan |
| `DELETE` seluruh baris lalu `INSERT` ulang | Lebih pendek, tetapi `id` tiap baris berganti setiap kali dihitung ulang. Jejak audit (butir 2) akan menunjuk baris yang sudah tidak ada, dan setiap perhitungan ulang terbaca sebagai penghapusan massal |
| Menaruh penyimpanan di dalam `penilaian-gizi.ts` | Mesin hitung yang menyentuh basis data tidak dapat diuji tanpa PostgreSQL, sementara 2.076 kasus acuan itu bernilai karena berjalan tanpa basis data |
| Memicu perhitungan ulang lewat *trigger* basis data | Rumus z-score di dalam PL/pgSQL berarti dua implementasi yang harus dijaga tetap setara. Mesin hitungnya sebaiknya tetap satu |
