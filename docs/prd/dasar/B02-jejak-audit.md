# B02 — Pencatatan riwayat perubahan

| | |
|---|---|
| **Jenis** | Kontrak |
| **Status** | selesai |
| **PR** | Belum dibuat; perubahan di cabang `design` |
| **Bergantung pada** | Skema 001–003 dan autentikasi |
| **Terhambat** | — |
| **Perubahan berarti terakhir** | 23 September 2026 |

## 0. Ringkasan

Melengkapi audit perubahan data agar jalur aplikasi, CLI, dan SQL manual meninggalkan riwayat. Trigger menulis nilai sebelum/sesudah dalam transaksi yang sama dengan perubahan. Helper transaksi mengirim identitas pelaku tanpa meninggalkannya di koneksi pool. Kontrak ini selesai; rujukan implementasi yang terus diperbarui ada di [Basis Data](../../database.md#audit) dan [Arsitektur](../../arsitektur.md#transaksi-dan-audit).

## 1. Latar

[DR-09](../prd-utama.md) mewajibkan pelaku, waktu, sumber, serta nilai sebelum/sesudah pada perubahan data. Audit telah ditandai selesai di dokumentasi, tetapi migrasi, helper transaksi, dan pengujiannya belum tersedia di checkout; tiga pemakai helper sudah ada dan gagal type-check. Fitur ini melengkapi bagian yang hilang tersebut.

Pemeriksaan database lokal menemukan migrasi 004 sudah terpasang. Definisi skemanya dipulihkan ke repo dari database; perbaikan perilaku ditempatkan di migrasi 005 agar instalasi yang sudah memakai 004 juga diperbarui.

## 2. Lingkup

Masuk: trigger tujuh tabel yang ditetapkan [kamus data](../../database.md#audit), helper transaksi, atribusi perubahan akun dari CLI/autentikasi, dan uji PostgreSQL.

Di luar lingkup: layar pembaca audit, endpoint mutasi domain yang belum ada, audit akses baca, retensi otomatis, perlindungan dari administrator database, serta pencatatan TRUNCATE. Perhitungan gizi tetap memakai helper transaksi, tetapi hasil turunannya tidak diaudit.

## 3. Perilaku yang diharapkan

- Insert menyimpan snapshot sesudah; delete menyimpan snapshot sebelum; update menyimpan keduanya.
- Update tanpa perubahan tidak menambah catatan. Perubahan sandi tetap dicatat, tanpa hash sandi lama maupun baru.
- Kegagalan data atau audit membatalkan keduanya. Koneksi dilepas setelah selesai; bila rollback gagal, koneksi dibuang dari pool.
- SQL tanpa konteks pelaku tetap tercatat. Identitas antartransaksi tidak tertukar.
- Menghapus data sumber tidak menghapus riwayatnya. Menghapus pengguna mengosongkan rujukan pelaku, bukan menghapus riwayat.
- Migrasi mempertahankan data yang sudah ada dan tidak membuat riwayat sebelum fitur dipasang.

## 4. Data & tipe yang berubah

Tabel `audit` beserta indeksnya ada pada migrasi 004. `Pelaku` berbentuk `{ pengguna: number | null; sumber: string }`. Kontrak kolom lengkap hanya dipelihara di [Basis Data](../../database.md#audit).

Migrasi 005 mengecualikan hash sandi pada snapshot baru dan menyunting hanya kolom hash pada snapshot lama. Peristiwa, timestamp lama, dan data domain lain dipertahankan.

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `server/db/migrations/004_audit.sql` | Tabel, fungsi, dan trigger audit |
| `server/db/migrations/005_audit_tanpa_hash_sandi.sql` | Perbaikan snapshot, waktu peristiwa baru, dan penghapusan akun sendiri |
| `server/src/db/transaksi.ts` | Konteks pelaku, commit, rollback, pelepasan koneksi |
| `server/src/repositories/pengguna-repository.ts` | Atribusi saat login dan pembaruan hash |
| `server/test/audit.test.ts` | Uji SQL, transaksi, upgrade, serta CLI sampai login/reset |
| `docs/adr/0007-jejak-audit-lewat-trigger.md` | Keputusan dan batas audit |
| `README.md`, `docs/database.md`, `docs/arsitektur.md`, indeks fitur/PRD dan rencana kerja | Petunjuk verifikasi dan status yang sesuai implementasi |

Pemakai yang sudah ada: `db/buat-pengguna.ts`, `db/ganti-sandi.ts`, dan `src/services/gizi-service.ts`.

## 6. Keputusan terbuka

Retensi menunggu [OI-10](../../pertanyaan-terbuka.md#oi-10--kebijakan-retensi-dan-privasi-data). Sementara itu tidak ada penghapusan audit otomatis. Keputusan ini tidak menahan pencatatan perubahan.

## 7. Kriteria terima

- [x] Type-check server lolos.
- [x] Insert/update/delete pada seluruh tujuh tabel memiliki snapshot, waktu, sumber, dan pelaku yang benar.
- [x] Rollback menghapus perubahan data dan audit; kegagalan penulisan audit menolak mutasi.
- [x] Pelaku tidak bocor setelah commit/rollback maupun tertukar antartransaksi.
- [x] SQL langsung dan CLI tanpa akun sesi tetap tercatat.
- [x] Hash sandi tidak muncul pada snapshot; reset sandi tetap tercatat.
- [x] Riwayat bertahan setelah data atau akun pelaku dihapus.
- [x] Database versi 003 dapat menerima migrasi 004 tanpa kehilangan data lama.
- [x] Upgrade 004 ke 005 membuang hanya hash pada snapshot pengguna lama, mempertahankan isi lain dan seluruh peristiwa.
- [x] Migrasi database kosong, seed, dan migrasi ulang berhasil.
- [x] Akun dibuat lewat CLI, login HTTP berhasil, reset mencabut sesi lama, sandi baru dapat dipakai.
- [x] Seluruh pengujian server, termasuk penyimpanan gizi, lolos dengan PostgreSQL.

## 8. Alternatif yang ditolak

Dicatat di [ADR-0007](../../adr/0007-jejak-audit-lewat-trigger.md#alternatif-yang-ditolak).
