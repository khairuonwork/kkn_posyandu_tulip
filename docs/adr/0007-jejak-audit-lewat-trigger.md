# ADR-0007 — Jejak audit ditegakkan trigger, identitas pelaku lewat variabel sesi

- **Status:** Accepted
- **Tanggal:** 23 September 2026
- **Terkait:** [ADR-0006](0006-pindah-ke-express-react-postgres.md), [DR-09](../prd/prd-utama.md)

## Konteks

DR-09 mewajibkan rekaman perubahan beserta pelaku, waktu, sumber, dan nilai sebelum/sesudah. Server memakai SQL langsung melalui `pg`; perubahan dapat berasal dari aplikasi, skrip CLI, dan SQL manual. Pembuatan akun, penggantian sandi, serta service gizi sudah mengacu pada helper transaksi yang belum tersedia dalam checkout. Dokumentasi audit sebelumnya juga merujuk migrasi dan ADR yang belum tersedia. Berkas ini menetapkan implementasi yang melengkapi kontrak tersebut.

Database lokal ternyata sudah memakai migrasi 004. Definisi versi terpasang dipulihkan ke repo; migrasi 005 membawa perubahan perilaku berikutnya. Ini menjaga upgrade instalasi lama, sebab runner tidak mengulang migrasi bernama sama.

## Keputusan

**Catat INSERT, UPDATE, dan DELETE dengan trigger AFTER ROW pada tujuh tabel domain; kirim identitas pelaku lewat konfigurasi lokal transaksi PostgreSQL.**

Cakupan tabel dan kolom berlaku ada di [Basis Data — audit](../database.md#audit). `dalamTransaksi()` menyetel `app.pengguna_id` dan `app.sumber` memakai `set_config(..., true)`, lalu menjalankan callback pada koneksi yang sama. Commit maupun rollback mengakhiri konteks pelaku. Mutasi tanpa konteks tetap dicatat dengan pelaku kosong dan sumber `tidak diketahui`.

Snapshot pengguna mengecualikan `kata_sandi_hash`; perubahan sandi tetap menghasilkan peristiwa audit. Sesi dan token tidak disalin. Update tanpa perubahan tidak menghasilkan audit. Perubahan pada data dan catatan audit merupakan satu transaksi: kegagalan audit menggagalkan mutasi.

## Alasan

Trigger mencakup semua jalur SQL biasa tanpa meminta setiap repository menulis catatan audit sendiri. Konteks transaksi menjaga identitas agar tidak terbawa ke pemakai berikutnya pada connection pool. Riwayat baris tetap tersedia setelah data sumber dihapus karena `baris_id` bukan foreign key ke baris sumber.

## Konsekuensi

- Migrasi 004–005 wajib dipasang sebelum memakai implementasi lengkap ini. Data sebelum pemasangan audit tidak mendapat riwayat buatan. Migrasi 005 menghapus hanya kolom hash dari snapshot pengguna lama; peristiwa dan kolom lain dipertahankan.
- Pemanggil aplikasi harus memperoleh identitas dari sesi terverifikasi, bukan dari badan request. Trigger merekam identitas yang diberikan; ia tidak mengautentikasinya.
- Penghapusan akun mengosongkan `pengguna_id` pada audit melalui `ON DELETE SET NULL`. Penghapusan oleh akun itu sendiri tetap tercatat dengan pelaku kosong; snapshot baris pengguna tetap tersedia tanpa hash sandi.
- Audit ini bukan penyimpanan antimanipulasi: pemilik database dapat mengubah audit, mematikan trigger, atau menjalankan TRUNCATE. Operasi tersebut tidak dicakup. Akses baca juga tidak dicatat.
- Snapshot memuat data pribadi domain. Hak akses database dan kebijakan retensi tetap perlu dikelola; retensi menunggu [OI-10](../pertanyaan-terbuka.md#oi-10--kebijakan-retensi-dan-privasi-data). Layar pembaca audit belum dibangun.

## Alternatif yang ditolak

| Alternatif | Alasan |
|---|---|
| Setiap repository menulis audit sendiri | Jalur CLI dan SQL manual mudah terlewat |
| Variabel sesi tanpa batas transaksi | Identitas bisa bocor ke transaksi berikutnya pada koneksi yang dipakai ulang |
| Menyalin seluruh kolom pengguna | Menambah salinan hash sandi tanpa kebutuhan pelacakan perubahan |
| Menyimpan audit setelah commit terpisah | Data dapat berubah tanpa audit ketika pencatatan berikutnya gagal |
