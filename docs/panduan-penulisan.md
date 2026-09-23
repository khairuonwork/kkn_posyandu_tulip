# Panduan Penulisan Dokumentasi & PRD

| | |
|---|---|
| **Jenis** | Rujukan |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 22 September 2026 |

Berkas ini menetapkan **cara menulis dokumen** di repo Portal Posyandu Tulip: jenis dokumennya apa saja, bahasanya bagaimana, dan bentuk baku PRD serta ADR.

Ia tidak berisi satu pun keputusan produk. Kalau yang kamu cari adalah *apa yang dibangun*, mulai dari [`README.md`](README.md).

Aturan di sini **mengikat dokumen baru**. Dokumen lama tidak ditulis ulang untuk mematuhinya — ia menyesuaikan saat kebetulan disunting. Menulis ulang 7.847 baris demi keseragaman adalah pekerjaan yang paling mudah disamarkan sebagai kemajuan.

---

## 1. Jenis dokumen di proyek ini

Penyebab paling umum dokumentasi susah dibaca bukan bahasanya, melainkan **dua jenis dokumen yang dijejalkan ke satu berkas**. Pembaca yang mencari nama folder terpaksa melewati paragraf argumentasi; pembaca yang ingin paham alasannya terpaksa menyaring tabel. Dua-duanya pergi dengan tangan kosong.

Ada empat jenis, dibedakan dari **apa yang sedang dilakukan pembacanya**:

| Jenis | Pembacanya sedang | Menjawab | Berkas di repo ini |
|---|---|---|---|
| **Orientasi** | baru datang | "Bagaimana saya memulai?" | [`README.md`](README.md) (peta), [`ringkasan.md`](ringkasan.md), [`fitur.md`](fitur.md), [`glosarium.md`](glosarium.md), [`../README.md`](../README.md) (cara menjalankan) |
| **Panduan** | sedang bekerja | "Bagaimana cara melakukan X?" | *belum ada* — Panduan Operasional dan Manual Kader |
| **Rujukan** | sedang mencari | "Apa persisnya aturan atau nilai Y?" | seluruh isi [`rujukan/`](rujukan), ditambah [`arsitektur.md`](arsitektur.md), [`database.md`](database.md), dan berkas ini |
| **Penjelasan** | ingin paham | "Kenapa dirancang begini?" | [`adr/`](adr), [`rencana-kerja.md`](rencana-kerja.md), [`pertanyaan-terbuka.md`](pertanyaan-terbuka.md) |

**Satu berkas = satu jenis.** Kalau sebuah dokumen butuh dua, pecah jadi dua dan saling tautkan. Contoh yang benar sudah ada: [`rujukan/antropometri.md`](rujukan/antropometri.md) berisi rumus dan ambang (rujukan), sedangkan alasan memilih metode LMS ada di [`ADR-0002`](adr/0002-metode-z-score-who-lms.md) (penjelasan). Dua berkas, dua pembaca, tidak saling mengganggu.

### Dua kategori lain yang sering tertukar dengan dokumentasi

**Kontrak / rencana** — seluruh isi [`prd/`](prd/README.md), ditambah [`rujukan/layar-demo.md`](rujukan/layar-demo.md). Tiga tingkat: produk, layar, fitur.

Ini **bukan dokumentasi.** Dokumentasi menjelaskan apa yang *sudah* ada; PRD menjelaskan apa yang *akan* ada. Keduanya mudah tertukar: PRD yang fiturnya sudah dibangun akan terbaca sebagai deskripsi sistem, padahal kode sesudahnya bergerak dan PRD-nya tidak. Karena itu tiap PRD wajib punya status, dan status `selesai` berarti **beku** — bukan "sudah benar", melainkan "berhenti dijadikan rujukan; yang berlaku sekarang ada di kode dan di dokumen rujukan".

**Sejarah** — seluruh isi [`riwayat/`](riwayat).

Isinya benar ketika ditulis dan tidak diperbarui lagi. Wajar bila menyebut hal yang sekarang sudah tidak ada — merekam keadaan waktu itu memang gunanya. Yang wajib: status `beku` di kepalanya, supaya pembaca tahu ia sedang membaca masa lalu.

---

## 2. Cara menulis

### Bahasa

Bahasa Indonesia. Istilah teknis tetap Inggris **bila itu nama yang muncul di kode** — *primary key*, *migration*, *controller*, *z-score*. Menerjemahkannya justru memutus hubungan dokumen dengan kode yang dijelaskannya.

Tulis untuk orang yang pintar tetapi belum tahu konteksnya. Itu berarti: jelaskan singkatan pada kemunculan pertama, sebutkan angka daripada kata sifat, dan jangan berasumsi pembaca mengikuti percakapan yang melahirkan dokumen itu.

Kalimat yang menjelaskan **kenapa** lebih berharga daripada kalimat yang menjelaskan **apa**. Yang "apa" bisa dibaca dari kode; yang "kenapa" hilang bersama orang yang menulisnya.

### Satu fakta hidup di tepat satu berkas

Berkas lain **menautnya**, tidak menyalinnya.

Aturan ini mudah dilanggar tanpa sadar. Contoh nyata di repo ini: ambang KBM (kenaikan berat minimum) muncul di [`04`](rujukan/antropometri.md), [`16`](rencana-kerja.md), [`99`](pertanyaan-terbuka.md), dan PRD F06. Empat tempat. Saat Bidan akhirnya menjawab 600 atau 800 gram, keempatnya harus berubah bersamaan — dan yang terlewat akan berbohong kepada pembaca berikutnya tanpa satu pun tanda bahwa ia salah.

Kalau sebuah fakta terasa perlu ditulis di dua tempat, itu tandanya satu dari keduanya seharusnya berisi tautan.

### Nomor bagian tidak pernah digeser

Rujukan dari dalam kode berbentuk `docs/`rujukan/layar-demo.md` bagian 6.4` — terpaku ke **nomor**, bukan ke judul. Hitungan saat ini:

```
docs/`rujukan/layar-demo.md` bagian 6.4       25 rujukan dari kode
docs/`rujukan/ui-ux.md` bagian 8                 15 rujukan
docs/`rujukan/antropometri.md` bagian 2  12 rujukan
```

Menyisipkan bagian baru di tengah membuat 25 komentar kode menunjuk tempat yang salah, dengan nol perubahan fungsional. **Tambahan baru ditaruh di ujung.** Bagian yang sudah tidak berlaku ditandai usang, bukan dihapus — nomornya tetap terpakai supaya tidak ada yang mewarisinya.

### Asumsi tidak ditebak diam-diam

Setiap hal yang belum dikonfirmasi pemilik program masuk ke [`pertanyaan-terbuka.md`](pertanyaan-terbuka.md) dan ditautkan dari dokumen yang membutuhkannya. Yang dilarang bukan menebak — kadang harus. Yang dilarang adalah menebak **tanpa meninggalkan jejak bahwa itu tebakan**.

### Angka dan tanggal ditulis absolut

"21 September 2026", bukan "bulan lalu". "2.076 kasus uji", bukan "ribuan". Dokumen dibaca pada waktu yang tidak bisa kamu duga.

### Diagram memakai Mermaid

Agar ter-*render* langsung di GitHub dan tetap bisa di-*diff*. Gambar hasil ekspor tidak bisa disunting orang berikutnya.

### Blok status di kepala setiap dokumen baru

Tiga baris, tepat di bawah judul:

```markdown
| | |
|---|---|
| **Jenis** | Orientasi / Panduan / Rujukan / Penjelasan / Kontrak / Sejarah |
| **Status** | draf / hidup / selesai / beku |
| **Perubahan berarti terakhir** | <tanggal> |
```

| Status | Artinya |
|---|---|
| `draf` | sedang disusun, belum boleh dijadikan rujukan |
| `hidup` | berlaku, dan akan terus berubah |
| `selesai` | isinya final untuk lingkupnya; perubahan berarti butuh alasan |
| `beku` | tidak diperbarui lagi; isinya merekam keadaan pada saat ditulis |

Alasannya konkret: [`10`](rujukan/layar-demo.md) dan [`11`](riwayat/catatan-tahap-demo.md) bersama-sama berisi 2.590 baris yang sebagian besar sudah lewat, dan tidak ada satu pun penanda yang memberi tahu pembaca baru hal itu. Tiga baris di kepala berkas akan mencegahnya terulang.

*"Perubahan berarti"* artinya isinya berubah, bukan salah ketik yang diperbaiki.

---

## 3. Template PRD fitur

Pindah ke [`prd/format-prd.md`](prd/format-prd.md) pada 22 September 2026, supaya bentuk PRD tinggal bersama PRD-nya. Nomor bagian ini dipertahankan agar rujukan "panduan bagian 3" tetap mendarat.

Ringkasnya: sembilan bagian, urutannya tetap, bagian yang tidak berlaku ditulis "tidak ada" dan bukan dihapus.

---

## 4. Template ADR

**ADR** = *Architecture Decision Record*. Satu berkas untuk satu keputusan yang **mahal kalau dibalik**. Isinya bukan cara kerja sistem, melainkan kenapa jalan A dipilih dan jalan B tidak.

```markdown
# ADR-nnnn — <Judul keputusan>

- **Status:** Proposed / Accepted / Superseded oleh ADR-nnnn
- **Tanggal:** <tanggal>
- **Menggantikan / Terkait:** <ADR lain, bila ada>

## Konteks
Keadaan yang memaksa keputusan ini diambil. Fakta, bukan pendapat — angka,
berkas, dan batasan yang nyata. Pembaca harus bisa menyimpulkan sendiri bahwa
keputusan ini memang perlu diambil.

## Keputusan
Satu kalimat tebal, lalu rinciannya.

## Alasan
Kenapa itu yang dipilih. Bila ada pesaing yang serius, pakai tabel
perbandingan — satu baris per pertimbangan.

## Konsekuensi
Akibatnya, yang menguntungkan maupun tidak. Bagian inilah yang biasanya
dicari orang berikutnya, jadi tulis selengkap yang kamu tahu.

## Alternatif yang ditolak
Tabel dua kolom: alternatif | alasan ditolak.
```

**Kapan sesuatu layak jadi ADR.** Hanya bila membalikkannya mahal. Memilih nama variabel bukan ADR. Memilih basis data, metode perhitungan, atau batas tanggung jawab antar sistem — iya. Kalau ragu: bayangkan orang baru enam bulan lagi mengubahnya tanpa tahu ada alasannya. Kalau itu terdengar berbahaya, tulis ADR.

**ADR tidak pernah dihapus atau ditulis ulang.** Yang sudah tidak berlaku ditandai `Superseded oleh ADR-nnnn`, berkasnya tetap ada. Lihat [`ADR-0004`](adr/0004-reuse-team-sebagai-rbac.md): keputusannya salah sekarang, tetapi jejaknya justru isinya — dulu begini, lalu berubah karena ini.

**Bila keputusannya masih berlaku tetapi rinciannya sudah usang**, tambahkan **catatan bertanggal** tepat di bawah blok metadata — jangan menyunting isinya. Bentuknya:

```markdown
> **Catatan <tanggal>.** <Apa yang tetap berlaku>. <Apa yang sudah berubah, dan karena ADR mana>.
```

Ini sering terjadi: keputusannya bertahan, tetapi nama berkas, nama tabel, atau nama teknologi di sekelilingnya bergerak. Menyunting badan ADR akan menghapus rekaman apa yang diketahui penulisnya saat itu, dan rekaman itulah isi sebuah ADR. Catatan bertanggal menjaga keduanya: badannya utuh, catatannya mencegah pembaca memakai rincian yang sudah usang. ADR [0001](adr/0001-primary-key-strategy.md), [0002](adr/0002-metode-z-score-who-lms.md), [0003](adr/0003-batas-portal-vs-aplikasi-tablet.md), dan [0004](adr/0004-reuse-team-sebagai-rbac.md) memakai pola ini.

**ADR lama boleh tidak lengkap.** Template di atas baru ditulis 22 September 2026; ADR yang lebih tua kadang tidak punya bagian *Alasan* atau *Alternatif yang ditolak* karena isinya menyatu di *Konteks*. Itu **tidak** dibetulkan surut — memisahkannya sekarang berarti menyusun ulang penalaran orang lain dari ingatan. Template berlaku untuk ADR baru.

**Nomor tidak pernah dipakai ulang**, bahkan bila sebuah ADR dibatalkan sebelum sempat diterima.

---

## 5. Kapan tidak usah menulis dokumen

Dokumen yang tidak punya pembaca adalah beban, bukan aset — ia tetap harus dijaga tetap benar.

- Perilaku yang sudah jelas dari kode dan punya uji → cukup ujinya.
- Keputusan yang murah dibalik → cukup komentar di kode.
- Hal yang sudah ditulis di berkas lain → cukup tautannya.
- Fitur yang belum diputuskan akan dibangun → cukup satu baris di [`rencana-kerja.md`](rencana-kerja.md) atau [`pertanyaan-terbuka.md`](pertanyaan-terbuka.md).

Yang selalu layak ditulis: alasan di balik hal yang tampak aneh. Kode menunjukkan apa yang dilakukannya, tetapi tidak kenapa cara yang tampak lebih jelas ternyata tidak dipakai.
