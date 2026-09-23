# ADR-0006 — Pindah ke Express + React + PostgreSQL dengan REST API

- **Status:** Accepted
- **Tanggal:** 2026-09-21
- **Menggantikan:** [ADR-0004](0004-reuse-team-sebagai-rbac.md) — RBAC berbasis tabel `teams` Laravel tidak lagi berlaku
- **Terkait:** [ADR-0002](0002-metode-z-score-who-lms.md) metode LMS WHO · [ADR-0003](0003-batas-portal-vs-aplikasi-tablet.md) batas Portal dan Aplikasi Tablet

## Konteks

Portal dibangun di atas Laravel React *starter kit*: Laravel + Inertia + React + Tailwind + SQLite, dengan autentikasi Fortify dan RBAC hasil pemakaian ulang tabel `teams`.

Keadaan per 21 September 2026:

| Bagian | Keadaan |
|---|---|
| Mesin antropometri `app/Support/Antropometri/` | selesai dan **terverifikasi nol selisih** terhadap master Excel bidan pada 287 baris BB/U, TB/U, LIKA/U |
| Seed standar LMS | 906 baris, nol perbedaan nilai `L`, `M`, `S` terhadap berkas berjalan |
| Autentikasi | selesai — login, registrasi, reset kata sandi, verifikasi surel, 2FA, passkey |
| RBAC | selesai — peran, izin, undangan anggota |
| Halaman Beranda, Data Balita, Detail anak, Laporan, Pengaturan | frontend selesai, **belum punya controller** — props masih dipasok data statis demo |

Pemilik produk memutuskan pindah stack setelah konsekuensinya dipaparkan. Keputusan ini dicatat sebagai ADR karena mahal untuk dibalik, bukan karena masih diperdebatkan.

## Keputusan

**Portal dibangun ulang sebagai SPA React yang terpisah dari REST API Express, dengan PostgreSQL sebagai basis data.**

| Lapisan | Sebelum | Sesudah |
|---|---|---|
| Arsitektur makro | Laravel + Inertia (satu aplikasi) | Decoupled client-server: SPA + REST API |
| Backend | Laravel (PHP) | Express (Node.js) |
| Arsitektur mikro backend | Controller + Service + Repository | **tetap** Controller - Service - Repository |
| Frontend | React via Inertia | React SPA, memanggil REST |
| Styling | Tailwind | **tetap** Tailwind |
| Basis data | SQLite | PostgreSQL |
| Autentikasi | Fortify | dibangun sendiri |
| RBAC | tabel `teams` *starter kit* | dibangun sendiri |

## Alasan

Arsitektur mikro tidak berubah karena bentuknya memang sudah benar: `PenilaianGiziService` dan `StandarLmsRepository` sudah merupakan Service dan Repository dalam arti yang sama. Yang berpindah bahasanya, bukan susunannya.

Pemisahan SPA dan API juga sejalan dengan [ADR-0003](0003-batas-portal-vs-aplikasi-tablet.md): Aplikasi Tablet pada akhirnya memang membutuhkan endpoint JSON. Pemisahan ini membuat kontrak itu ada sejak awal, bukan ditambahkan belakangan.

## Konsekuensi

### Yang harus dibangun ulang dari nol

Ketiganya sebelumnya gratis dari *starter kit*, dan tidak satu pun berisi logika khas Posyandu:

1. **Autentikasi** — sesi, hash kata sandi, reset lewat surel, verifikasi surel. 2FA dan passkey **tidak diikutsertakan** kecuali diminta; keduanya bukan kebutuhan yang pernah disebut pemilik program.
2. **RBAC** — tiga peran (`admin`, `bidan`, `kader`) beserta pembatasan kader ke satu RT binaan. Matriks izinnya tetap yang ada di [arsitektur](../arsitektur.md).
3. **Migrasi skema** — sembilan tabel domain, kini langsung ke PostgreSQL.

### Yang harus diport dengan penjagaan ketat

**Mesin antropometri adalah satu-satunya bagian yang salahnya berakibat pada anak, bukan pada kerapian data.** Port-nya tidak dianggap selesai karena kodenya jalan, melainkan karena angkanya sama.

Syarat terima, mengikat:

| Syarat | Cara membuktikan |
|---|---|
| Nilai `L`, `M`, `S` identik | `who-lms.json` dipakai apa adanya, 906 baris, tanpa konversi ulang |
| Z-score identik | *dataset* uji di `tests/Feature/Antropometri/ZScoreTest.php` diport utuh; selisih terhadap nilai harapan **< 0,000001**, bukan < 0,01 |
| Perilaku tepi tetap | ekstrapolasi WHO di luar ±3 SD, interpolasi BB/TB 0,5 cm, koreksi PB↔TB 0,7 cm, batas rentang mengembalikan kosong dan bukan galat |
| Umur bulan penuh | selisih kalender, bukan pembagian hari — lihat [04 bagian 3.1](../rujukan/antropometri.md) |

Selisih sekecil 0,05 SD dapat memindahkan seorang anak antar kategori gizi. Karena itu syaratnya lebih ketat daripada verifikasi aslinya: yang diuji bukan kecocokan dengan Excel, melainkan **kecocokan dengan implementasi PHP yang sudah diterima**.

Implementasi PHP lama **tidak dihapus sampai syarat di atas terpenuhi**. Selama masa itu ia berfungsi sebagai acuan pembanding.

### Catatan pelaksanaan — langkah 1 dan 2, 21 September 2026

**Acuan tidak dapat diambil dengan menjalankan Laravel.** Mesin ini memakai PHP 8.2 sementara `composer.json` menuntut ^8.3, dan `vendor/` kosong. Jalan keluarnya: kelas `Lms`, `ZScore`, `Kategori`, `StandarLmsRepository`, dan kedua enum dimuat langsung tanpa Composer — keempatnya memang tidak bergantung pada Laravel — dengan model Eloquent diganti stub yang membaca `who-lms.json` pada urutan yang sama. Yang dijalankan tetap kode aslinya, bukan tiruannya. Hasilnya `server/test/acuan-php.json`: 2.076 kombinasi indeks, jenis kelamin, kunci tabel, dan nilai ukur.

**Syarat terima terpenuhi dengan selisih jauh di bawah ambang.** Selisih z terbesar antara TypeScript dan PHP adalah **4,441 × 10⁻¹⁵** atas 2.076 kasus — sekitar sepuluh juta kali lebih kecil daripada 10⁻⁶ yang disyaratkan, dan sudah di tingkat galat pembulatan bilangan pecahan. Seluruh kategori status gizi juga identik. 977 kasus di antaranya berada di luar ±3 SD, jadi jalur ekstrapolasi WHO benar-benar teruji, bukan terlewat.

**Dua cacat ditemukan di `tests/Feature/Antropometri/ZScoreTest.php`, bukan di port.** Keduanya baru terlihat karena port ini menuntut kesetaraan angka, dan keduanya berarti berkas test itu tidak pernah hijau:

| Kasus | Yang dituntut test lama | Kenyataan |
|---|---|---|
| Koreksi di luar +3 SD, BB/TB laki-laki 107,5 cm 24,7 kg | `z < 3,8189`, dengan alasan "nilai terkoreksi harus lebih kecil" | LMS polos memang 3,81886, tetapi hasil terkoreksi **3,91948 — lebih besar**. Di ekor atas, jarak antar SD melebar lebih cepat daripada linear, sehingga ekstrapolasi WHO menaikkan. Arah pertidaksamaannya yang keliru. |
| Dataset master, BB/TB perempuan 61,4 cm 6,24 kg | `z ≈ 0,1993` | 0,1993 adalah nilai pada baris **61,0** — pembacaan tanpa interpolasi. Interpolasi memberi 0,02408. |

Baris kedua bukan cacat perhitungan melainkan [D-02](../riwayat/catatan-tahap-demo.md) yang belum diputuskan, dan sekaligus bukti baru untuknya: angka di dalam test itu sendiri berasal dari pembacaan pembulatan ke bawah. Di suite TypeScript ia berdiri sebagai uji tersendiri yang memeriksa **kedua** pembacaan, supaya keputusan yang tertunda terlihat, bukan tersembunyi sebagai satu baris merah.

**Perubahan nama yang tidak disebut ADR ini semula.** Tabel `teams` menjadi `posyandu`, dan kolom `team_id` menjadi `posyandu_id`. Bagian "Yang ikut berubah" di bawah semula hanya menyatakan kolomnya dipertahankan; yang dimaksud adalah **kolom penanda Posyandu-nya**, bukan namanya. Nama `team` adalah sisa starter kit yang [ADR-0004](0004-reuse-team-sebagai-rbac.md) pertahankan demi diff kecil dan test bawaan — dua alasan yang ikut hilang bersama starter kit-nya.

**Migrasi dan seed — terbukti jalan, 21 September 2026.** Sempat tertahan karena Docker belum menyala; setelah dinyalakan, `001` dan `002` berjalan, seed mengisi 906 baris, dan keduanya idempotent saat diulang.

Pemeriksaannya tidak berhenti di "perintahnya sukses". Yang dibuktikan adalah **z-score yang dihitung dari tabel hasil muat basis data identik dengan yang dihitung dari berkas JSON** pada seluruh 2.076 kasus acuan. Kolom `numeric(10,6)` yang memotong satu digit saja akan menggeser status gizi tanpa memunculkan satu galat pun, jadi kesetaraan itu diuji, bukan diasumsikan. Pengujiannya permanen di `server/test/basis-data.test.ts` dan ikut berjalan di CI lewat *service container*.

**Dua cacat skema ditemukan saat memeriksa hasilnya terhadap PostgreSQL sungguhan**, keduanya terbawa dari skema Laravel dan keduanya diam — tidak memunculkan galat apa pun. Diperbaiki di `003_updated_at_dan_nik_terhapus.sql`:

| Cacat | Akibat | Perbaikan |
|---|---|---|
| `updated_at` tidak pernah berubah pada UPDATE | Eloquent yang dulu mengisinya; tanpa Eloquent kolom itu membeku di waktu insert pada **kesebelas** tabel — sementara layar Pengaturan menampilkannya sebagai "Terakhir diubah ... oleh ..." | trigger `set_updated_at` pada tiap tabel, dengan `WHEN (OLD.* IS DISTINCT FROM NEW.*)` supaya penyimpanan yang tidak mengubah apa pun tidak menggeser stempelnya |
| `UNIQUE (nik)` pada `anak` ikut menghitung baris yang sudah di-*soft-delete* | anak yang profilnya dihapus tidak dapat didaftarkan ulang dengan NIK yang sama; impor arsip akan menabraknya dengan pesan "duplicate key" yang tidak menyebut sedikit pun bahwa penyebabnya baris terhapus | indeks parsial `WHERE deleted_at IS NULL` — keunikan hanya berlaku di antara anak yang masih hidup |

Ditegakkan lewat trigger, bukan diserahkan ke repository: satu repository yang lupa menulis `updated_at` menghasilkan baris yang tampak tidak pernah disentuh, dan itu persis jenis kekeliruan yang baru ketahuan saat ada yang mencari tahu siapa mengubah apa.

**Rantai migrasi terbukti jalan dari nol**, bukan hanya menambal basis data yang kebetulan sudah ada: ketiganya dijalankan terhadap basis data kosong, di-seed, lalu seluruh 124 pengujian lulus di sana.

**Satu jebakan lingkungan yang layak dicatat.** Mesin pengembangan sudah menjalankan PostgreSQL sendiri di port 5432. Docker tetap berhasil menyala — ia kebagian alamat IPv6 sementara layanan lama memegang IPv4 — sehingga sambungan ke `localhost` mendarat di basis data yang salah dan gagal dengan `password authentication failed`. Pesan itu menuduh kredensial, padahal servernya yang berbeda. Kontainer karena itu dipindah ke `127.0.0.1:5433`.

### Catatan pelaksanaan — langkah 3, autentikasi dan RBAC

Dikerjakan bagian yang dapat dibuktikan tanpa basis data, dan itu memang bagian yang risikonya keamanan: `server/src/auth/`, 62 pengujian, seluruhnya murni.

| Keputusan | Alasan |
|---|---|
| **scrypt dari `node:crypto`**, bukan bcrypt atau argon2 | keduanya modul native yang menuntut langkah build saat dipasang, sementara repo menyetel `ignore-scripts=true`. scrypt memang dirancang untuk kata sandi dan sudah ada di pustaka standar. Nol dependensi baru. |
| **Parameter ikut disimpan** di dalam hash (`scrypt$N$r$p$garam$kunci`) | menaikkan N nanti tidak mematikan hash lama, dan `perluHashUlang()` memutakhirkannya saat pemiliknya berhasil masuk |
| **Sesi di basis data**, bukan token yang memuat klaimnya sendiri | sesi harus dapat **dicabut seketika**. Saat Admin menonaktifkan akun di layar Pengaturan, akses yang sedang berjalan harus langsung mati. |
| **Yang disimpan hanya SHA-256 token** | salinan basis data yang bocor tidak memuat satu pun sesi yang dapat dipakai. SHA-256 dan bukan scrypt karena tokennya sudah 256 bit acak — tidak ada yang bisa ditebak dengan kamus, dan scrypt akan membebani **setiap** permintaan dengan 33 MB. |
| **Umur sesi 12 jam** | laptop Posyandu berpindah tangan antar kader dalam satu hari kegiatan; sesi yang hidup sampai pekan depan berarti siapa pun yang membukanya masuk sebagai pemakai terakhir |
| **Tanpa 2FA dan passkey** | sesuai ADR ini di bagian atas: keduanya ada di starter kit lama, tidak pernah disebut sebagai kebutuhan pemilik program |

**Matriks izin diuji lengkap.** [Otorisasi](../arsitektur.md) menuntut "setiap baris pada matriks memiliki test yang memastikan peran di bawahnya menerima 403". Ke-14 aksi × 3 peran diuji satu per satu, ditambah invarian struktural bahwa peran lebih tinggi tidak pernah kehilangan hak peran di bawahnya. Tabel harapan di berkas uji ditulis ulang dari dokumen, **tidak** diimpor dari kode yang diujinya.

**Satu keputusan keamanan yang tidak ada di dokumen mana pun: kader tanpa RT binaan ditolak, bukan diberi akses penuh.** `rtYangBolehDilihat()` melempar alih-alih mengembalikan `null`, karena `null` di sana berarti "seluruh RW" — cara paling sunyi untuk membocorkan data satu RW penuh. Skema ikut menegakkannya lewat `CHECK ((peran = 'kader') = (wilayah_rt_id IS NOT NULL))`, sehingga keadaan itu tidak dapat tersimpan sejak awal.

**Skema pengguna dan sesi terbukti jalan.** `002_pengguna_dan_sesi.sql` sudah dieksekusi, dan kedua penjaganya diuji langsung terhadap PostgreSQL: `pengguna_rt_sesuai_peran` menolak kader tanpa RT maupun bidan dengan RT, dan indeks `lower(email)` menolak email yang sama dengan huruf berbeda. Foreign key `dicatat_oleh` dan `dijalankan_oleh` yang ditunda pada migrasi 001 ikut terpasang.

**Langkah 3 selesai, dan Express masuk di sini — bukan di langkah 4.** Urutan di atas menaruh Express bersama endpoint kelima layar. Itu keliru: autentikasi yang tidak pernah dijalankan lewat HTTP belum terbukti, dan Express adalah infrastruktur, bukan fitur — ia masuk saat pertama kali dibutuhkan.

Yang ditambahkan: `src/repositories/pengguna-repository.ts` dan `sesi-repository.ts`, `src/services/auth-service.ts`, `src/http/` (cookie, pembatas percobaan, middleware, controller, server), serta `db/buat-pengguna.ts` untuk melahirkan akun pertama. Satu dependensi baru: `express`. Tanpa `cookie-parser` (satu cookie base64url, penguraiannya sepuluh baris), tanpa `cors` (dev memakai proxy Vite supaya satu origin seperti rencana produksi), tanpa pustaka uji HTTP (`node:test` + `fetch` bawaan).

Tiga keputusan yang layak dicatat:

| Keputusan | Alasan |
|---|---|
| Kata sandi diverifikasi terhadap **hash umpan** ketika email tidak ditemukan | tanpa itu, selisih waktu jawaban memberi tahu penebak siapa saja yang punya akun |
| Akun nonaktif diperiksa **setelah** kata sandi benar | pesan "akun dinonaktifkan" hanya pantas diterima orang yang memang memegang kata sandinya |
| Pembatas percobaan menahan **kredensial yang benar juga** | menahan hanya yang salah berarti menunda penebak, bukan menghentikannya |

**Porta bawaan 4321, bukan 3000.** Ditemukan saat pembuktian manual: port 3000 di mesin pengembangan sudah dipakai aplikasi lain, dan pada Windows tabrakan itu **tidak berbunyi** — proses kedua tetap dapat mengikat port yang sama, mencetak "server siap", lalu permintaan mendarat di aplikasi yang lain. Gejalanya jauh dari sebabnya: jawaban 403 dengan bentuk galat yang tidak pernah kita tulis. Server kini mengikat `127.0.0.1` saja dan berhenti dengan pesan jelas pada `EADDRINUSE`. Pola yang sama persis dengan bentrokan PostgreSQL di 5432.

**Dibuktikan lewat HTTP sungguhan**, bukan hanya lewat uji: akun dibuat dengan `pengguna:buat`, masuk lewat `curl`, `/api/saya` mengenali sesi beserta RT binaannya, lalu akun dinonaktifkan langsung di basis data — permintaan berikutnya dengan cookie yang sama menjawab 401, dan pulih menjadi 200 setelah diaktifkan lagi. Itulah properti yang membuat sesi disimpan di basis data.

### Yang ikut berubah tanpa diminta

- **Halaman React yang sudah jadi dapat dipakai ulang hampir seluruhnya.** Kelima halaman menerima data lewat props biasa dan tidak memanggil Inertia langsung — titik sambungnya sudah diisolasi di `resources/js/lib/nav.ts`. Yang berubah: `Link`/`Head` menjadi router SPA, dan props dipasok hasil `fetch`, bukan controller.

### Catatan pelaksanaan — entri SPA

Sampai di sini `client/` hanya punya entri demo; aplikasi sungguhannya tidak punya pintu masuk sejak `app.tsx` milik Inertia dibuang. Yang ditambahkan: `client/index.html`, `src/main.tsx`, `src/app.tsx`, `src/lib/sesi.ts`, dan `vite.config.ts`.

**Demo dan aplikasi kini berbagi hampir seluruh kode.** Cangkang, router, penjaga rute, kelima layar, dan layar Masuk pindah ke `src/` dan dipakai keduanya; yang tersisa khusus demo hanya tiga hal — entri, masuk tanpa verifikasi, dan pemilih peran. Akibatnya **apa yang diperagakan tidak dapat berbeda dari apa yang dipakai**, dan demo tetap dapat dibangun tanpa backend untuk peragaan ke Bidan atau dosen.

Arah ketergantungan ikut dibalik: `demo/store.ts` dan berkas hurufnya pindah ke `src/data/contoh/` dan `src/assets/fonts/`, sehingga `src/` tidak pernah lagi mengimpor dari `demo/`.

**`src/layar.tsx` adalah titik ganti tunggal.** Ia satu-satunya pemanggil selektor data contoh di seluruh aplikasi. Saat endpoint data datang, hanya berkas itu yang berubah, dan JSON contoh ikut hilang dari bundel — ditandai komentar `ponytail:` di sana.

Dev memakai proxy Vite `/api` → `127.0.0.1:4321`, bukan `cors`, supaya pengembangan memakai bentuk satu origin yang sama dengan rencana produksi.

**Satu cacat ditemukan dari log jaringan peramban, bukan dari uji:** `POST /api/keluar` sempat `ERR_ABORTED` karena alamat diganti pada saat yang sama permintaannya dikirim. Permintaan keluar yang batal berarti **sesinya tetap hidup di basis data** meski penggunanya merasa sudah keluar. Perpindahan alamat kini menunggu jawaban server.
- **[ADR-0004](0004-reuse-team-sebagai-rbac.md) berhenti berlaku.** Kolom penanda Posyandu pada tabel domain tetap dipertahankan, dengan alasan yang sama seperti semula: dukungan multi-Posyandu nanti tidak menuntut migrasi data. Namanya menjadi `posyandu_id` — lihat catatan pelaksanaan di atas.
- **NFR-09 (migration netral driver) gugur** — skema kini ditulis langsung untuk PostgreSQL.
- **Demo frontend statis (`npm run demo`) tetap jalan** dan tidak terpengaruh; ia memang sudah tidak bergantung pada backend.

### Risiko yang diterima

| Risiko | Mengapa diterima |
|---|---|
| Autentikasi buatan sendiri lebih rawan daripada Fortify | dibatasi dengan memakai pustaka mapan, bukan menulis kriptografi sendiri |
| Pekerjaan yang sudah hijau kembali ke nol | keputusan pemilik produk, diambil dengan konsekuensi yang sudah diketahui |
| Mesin gizi dapat berbeda diam-diam | ditutup oleh syarat terima di atas, dan itulah sebabnya syaratnya diperketat |

### Migrasi ditutup — 21 September 2026

Empat butir terakhir selesai, dan dengan itu fase migrasi punya garis akhir: **aplikasi dapat dijalankan, akun sungguhan dapat masuk, peran ditegakkan server, dan dokumentasi menunjuk berkas yang benar-benar ada.**

| Butir | Hasil |
|---|---|
| Salinan z-score di peramban | diperbaiki dan diikat ke 2.076 kasus acuan yang sama dengan server — selisih 4,441e-15. Swauji lama yang rusak diganti `client/test/z-score.test.ts` |
| Autentikasi lewat HTTP | Express masuk, 13 uji HTTP, dibuktikan manual dengan `curl` |
| Entri SPA | `client/index.html` + `src/main.tsx`; demo dan aplikasi berbagi seluruh `src/` |
| Dokumentasi | ±147 rujukan usang dibetulkan; bab arsitektur SDD ditulis ulang; nol tautan rusak di seluruh repo |

**Satu penyimpangan ditemukan pada salinan z-score peramban**, dan sifatnya bukan "belum diuji" melainkan **sudah berbeda**: client membandingkan kunci tabel sebagai pecahan mentah, sementara server membulatkannya ke satu desimal lebih dulu — port setia dari `number_format($kunci, 1)` di PHP. Tinggi 70,04 cm karena itu diinterpolasi 8% ke arah baris 70,5 di peramban, padahal server memakai baris 70,0 apa adanya. Pratinjau yang dilihat kader berbeda dari angka yang akhirnya tersimpan. Diperbaiki, dan ditutup uji regresi tersendiri.

**Yang tersisa bukan migrasi.** Endpoint data kelima layar, penyambungan layar ke basis data, dan impor arsip Excel **tidak pernah ada di Laravel** — ketiganya pekerjaan baru, dan menjadi pekerjaan pertama projek utama. Sampai itu selesai, kelima layar membaca data contoh yang terbundel, dan `client/src/layar.tsx` adalah satu-satunya berkas yang perlu berubah.

## Urutan pengerjaan

Urutan ini memastikan bagian paling berbahaya dikerjakan saat perhatian masih penuh, dan bagian yang sudah terbukti tidak disentuh sampai penggantinya siap.

1. Skema PostgreSQL + seed 906 baris LMS.
2. **Port mesin antropometri beserta seluruh dataset ujinya.** Tidak lanjut sebelum nol selisih.
3. Autentikasi dan RBAC tiga peran.
4. Endpoint REST untuk lima layar yang frontend-nya sudah ada.
5. Sambungkan SPA ke endpoint tersebut, menggantikan data statis demo.
6. Impor arsip Excel — lihat [`rujukan/migrasi-data.md`](../rujukan/migrasi-data.md).

Langkah 4 adalah pekerjaan yang selama ini tertahan di stack lama juga: kelima halaman sudah jadi dan belum pernah punya controller. Pindah stack tidak menambah maupun mengurangi pekerjaan itu.
