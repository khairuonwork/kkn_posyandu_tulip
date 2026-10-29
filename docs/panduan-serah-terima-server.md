# Panduan serah-terima server

Panduan ini untuk tim yang menyiapkan, menjalankan, dan memelihara REST API SIMPATIK. Server aplikasi adalah satu-satunya jalur dari website dan Android menuju PostgreSQL; kredensial database hanya berada di lingkungan server.

## Peta komponen

```text
Website / aplikasi Android
          │ HTTP(S), JSON
          ▼
server/src/http/       Express, middleware, controller dan kontrak HTTP
          │
          ▼
server/src/services/   aturan kasus penggunaan; mengatur alur data
          │
          ├── server/src/antropometri/   rumus domain dan data standar
          ▼
server/src/repositories/ query PostgreSQL dan pemetaan record
          │
          ▼
server/src/db/         pool koneksi dan transaksi/audit
          │
          ▼
PostgreSQL (lokal atau Supabase)
```

Tanggung jawab per lapisan:

- `http/*-controller.ts`: validasi input HTTP, izin, kode status dan bentuk respons. Jangan menaruh SQL atau rumus klinis di sini.
- `services/`: orkestrasi aturan aplikasi. Logika hitung yang murni sebaiknya dapat diuji tanpa jaringan/database.
- `repositories/`: akses SQL terparameterisasi dan pemetaan data. Jangan membentuk respons Express di sini.
- `antropometri/`: rumus dan standar penilaian; perubahan harus disertai uji acuan serta tinjauan petugas kesehatan.
- `db/`: pool, transaksi, migrasi dan utilitas operasi. Migrasi live harus melalui persetujuan dan cadangan.

Contoh pemisahan laporan: `http/laporan-controller.ts` → `services/laporan-service.ts` → `repositories/laporan-repository.ts`; perhitungan berada di `services/laporan-perhitungan.ts`, sedangkan Excel di `services/laporan-export.ts`.

## Menyiapkan host

1. Pasang Git, Node.js 24+, npm, dan akses jaringan ke PostgreSQL.
2. Clone branch yang disepakati tim (saat ini `development`) dan pasang dependensi dengan `npm --prefix server ci` serta `npm --prefix client ci`.
3. Buat `server/.env` dari `server/.env.example` atau gunakan `scripts/buat-env-supabase.cjs`. Isikan `DATABASE_URL` dan nilai lokal lain yang diwajibkan. Jangan menyalin kredensial ke frontend, APK, dokumen, tiket, atau log.
4. Verifikasi koneksi dengan `npm --prefix server run db:verify`.
5. Pastikan target database dan backup benar sebelum migrasi. Tinjau SQL di `server/db/migrations/`, lalu jalankan `npm --prefix server run migrate` hanya dengan persetujuan pemilik database.
6. Untuk jaringan lokal, ikuti [`menjalankan-server-lan.md`](menjalankan-server-lan.md). Untuk akses publik, gunakan HTTPS/reverse proxy atau tunnel yang disetujui; jangan buka port database ke internet.

## Menjalankan dan memeriksa

Mode lokal pengembangan (API dan Vite di terminal terpisah):

```powershell
npm --prefix server run dev
npm --prefix client run dev
```

Pemeriksaan sebelum rilis/perubahan server:

```powershell
npm --prefix server test
npm --prefix server run types:check
npm --prefix client test
npm --prefix client run types:check
npm --prefix client run lint:check
npm --prefix client run build
```

Health check API: `GET /api/v1/kesehatan` harus menjawab `status: siap` dan `database: terhubung`. Endpoint ini tidak boleh mengembalikan DSN atau secret. Cek juga login, satu endpoint baca, satu endpoint tulis yang aman di lingkungan QA, sinkronisasi Android, dan export laporan sesuai peran.

Port bawaan API `4321` di loopback (`127.0.0.1`); untuk LAN, skrip QA mengikat host ke antarmuka jaringan. Jangan menjalankan dua instance pada port yang sama. `EADDRINUSE` berarti port telah dipakai—identifikasi proses sebelum mengubah atau menghentikannya.

## Konfigurasi dan keamanan

- Rahasia disimpan pada secret manager atau `server/.env` lokal yang diabaikan Git. Bila secret pernah dibagikan di chat atau repo, rotasi dari dashboard penyedia.
- Android dan browser hanya menerima URL API publik serta token/sesi sesuai mekanisme autentikasi; tidak menerima `DATABASE_URL`, password PostgreSQL, service-role/secret key.
- Gunakan akun DB berhak minimum yang dibutuhkan aplikasi. Pisahkan kredensial migrasi bila penyedia dan rancangan deployment mendukungnya.
- Jangan mencatat kata sandi, token, cookie, isi pengukuran, atau query berisi data pribadi. Endpoint login saat ini hanya mencatat metadata aman yang dipilih.
- Periksa izin di server (`wajibMasuk`, `wajibBoleh`); menyembunyikan tombol di UI bukan kontrol akses.
- Untuk perubahan data, gunakan `dalamTransaksi()` dan pelaku audit yang berasal dari sesi terverifikasi. Jangan menggunakan `pool.query()` di tengah transaksi yang bergantung pada konteks audit.
- Backup, retensi, pemulihan, TLS, pemantauan, rotasi kredensial dan jadwal deployment harus ditetapkan oleh operator server sebelum penggunaan operasional.

## Saat ada kegagalan

- `404` pada API: pastikan versi server yang berjalan sudah memuat route tersebut dan reverse proxy meneruskan `/api` ke instance yang benar.
- `500`: periksa log server yang sudah disanitasi, status PostgreSQL, migrasi, dan kesesuaian versi aplikasi. Jangan menampilkan stack trace/SQL ke klien.
- `401/403`: periksa sesi aktif, akun aktif, peran dan izin endpoint.
- Setelah deploy, lakukan health check dan smoke test. Jangan mematikan instance live sebelum instance pengganti siap atau ada jendela pemeliharaan yang disepakati.

## Batas yang perlu diketahui

Database menyimpan data pribadi dan kesehatan anak. Gunakan hanya data QA yang diizinkan, batasi akses operator, serta dokumentasikan siapa yang menyetujui ekspor atau pemulihan data. Rumus dan klasifikasi kesehatan tidak boleh diubah sebagai sekadar refactor struktural.
