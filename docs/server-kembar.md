# Server kembar (twin server)

Dokumen ini mengatur cara menjalankan dua server SIMPATIK sekaligus: **server utama** dan **server kembar** sebagai cadangan operasional. Bila server utama mati, aplikasi dan website tetap berjalan melalui server kembar tanpa kehilangan atau bentrok data.

## Prinsip

1. **Satu sumber data.** Kedua server memakai database PostgreSQL yang sama (`DATABASE_URL` sama). Server tidak menyimpan data operasional di disk lokal, jadi tidak ada data yang perlu disalin atau digabung antarserver.
2. **Server tanpa state (stateless).** Sesi login, antrean, pengukuran, status perangkat, dan sesi pelatihan disimpan di database. Token login dari server utama berlaku di server kembar, dan sebaliknya.
3. **Semua penulisan idempoten.** Pengukuran memakai `id_pengukuran` tetap, antrean memakai ID deterministik (`antrean_<tanggal>_<sasaran>`), dan nomor antrean dikunci dengan advisory lock database. Kiriman ulang ke server mana pun tidak membuat data ganda.
4. **Kode dan konfigurasi identik.** Kedua server menjalankan commit Git yang sama dan rahasia yang sama. Yang berbeda hanya `SERVER_ID` dan alamat publiknya.

```
                ┌──────────── HP/Tablet & browser ────────────┐
                │  daftar server: utama, kembar (failover)     │
                └───────────┬─────────────────────┬───────────┘
                            │ HTTPS               │ HTTPS
                  ┌─────────▼─────────┐  ┌────────▼──────────┐
                  │  Server utama     │  │  Server kembar     │
                  │  SERVER_ID=utama  │  │  SERVER_ID=kembar  │
                  │  API + web :4321  │  │  API + web :4321   │
                  └─────────┬─────────┘  └────────┬──────────┘
                            └──────────┬──────────┘
                              ┌────────▼────────┐
                              │ PostgreSQL       │
                              │ (satu database)  │
                              └─────────────────┘
```

## Jalur akses dan perpindahan

Ada dua cara agar perpindahan berjalan mulus; keduanya dapat dipakai bersamaan.

**A. Satu alamat, dua konektor (disarankan).** Buat satu *named tunnel* Cloudflare pada domain sendiri (misalnya `simpatik.<domain>`), lalu jalankan konektor `cloudflared` untuk tunnel yang sama di kedua server. Cloudflare mengarahkan permintaan ke konektor yang sehat. Bila server utama mati, permintaan langsung diterima server kembar dengan alamat yang sama, sehingga website dan aplikasi tidak perlu berpindah alamat.

**B. Failover di aplikasi.** Aplikasi Android 1.16.0 ke atas menyimpan daftar server. Daftar ini berasal dari `server.properties` saat build (`portalApiUrl`, `portalApiCadangan`) dan dari `GET /api/v1/aplikasi/server`. Bila server aktif tidak menjawab `/api/v1/kesehatan`, aplikasi mencoba server berikutnya tanpa logout. Jalur ini juga melindungi dari pergantian alamat Quick Tunnel.

Atur env berikut **sama persis** di kedua server agar aplikasi mempelajari semua alamat:

```
SERVER_PUBLIK=https://<alamat-utama>/api/v1,https://<alamat-kembar>/api/v1
```

## Konfigurasi per server

| Variabel | Utama | Kembar | Catatan |
| --- | --- | --- | --- |
| `DATABASE_URL` | sama | sama | Database tunggal. Batasi `DB_POOL_MAX` agar total koneksi kedua server muat di kuota pooler. |
| `LEMBAR_RAHASIA` | sama | sama | Wajib identik; tautan Lembar Hasil yang dibuat satu server harus valid di server lain. |
| `PELATIHAN_AKTIF` | sama | sama | Sesi pelatihan ada di database, flag-nya harus seragam. |
| `SERVER_PUBLIK` | sama | sama | Daftar semua alamat publik. |
| `SERVER_ID` | `utama` | `kembar` | Muncul di header `X-Simpatik-Server` untuk diagnosis. |
| `NODE_ENV`, `HOST`, `PORT`, `TRUST_PROXY`, `WEB_DIST` | sama | sama | Lihat `deploy/linux/simpatik.service`. API hanya mendengar `127.0.0.1`. |
| `RILIS_APK_DIR` | folder lokal | folder lokal | Isi folder harus disinkronkan, lihat bagian Rilis APK. |

Rahasia tidak pernah dikirim melalui Git, chat, atau prompt. Salin berkas env melalui SSH/Tailscale langsung dari server utama dengan hak akses `600`.

## Aturan operasional

1. **Migrasi hanya dari server utama.** `db/migrate.ts` dijalankan satu kali, dari server utama, sebelum kode baru dipasang di mana pun. Server kembar tidak pernah menjalankan migrasi, seed, atau utilitas reset.
2. **Migrasi harus kompatibel mundur** (*expand → contract*). Tambahkan kolom/tabel lebih dahulu; hapus kolom lama hanya setelah kedua server menjalankan kode yang tidak lagi memakainya. Dengan begitu kode lama dan kode baru dapat berjalan berdampingan selama pembaruan.
3. **Pembaruan bergiliran.** Urutan: migrasi (utama) → pasang di server kembar → periksa kesehatan → pasang di server utama → periksa kesehatan. Selalu ada satu server sehat selama proses.
4. **Commit sama.** Setelah pembaruan, `git rev-parse HEAD` di kedua server harus sama. Jangan menyunting kode langsung di server.
5. **Rilis APK disinkronkan.** Terbitkan APK di server utama (`npm run rilis:apk`), lalu salin isi folder rilis (`manifest.json` dan berkas APK) ke server kembar dengan `rsync` melalui jaringan privat. Kedua server harus menjawab `/api/v1/aplikasi/versi` dengan `sha256` yang sama.
6. **Jam server sinkron.** Aktifkan NTP di kedua server. Stempel waktu data diambil dari database, tetapi log dan token kedaluwarsa memakai jam lokal.
7. **Tidak ada penemuan UDP di produksi.** `NODE_ENV=production` menonaktifkan discovery LAN di kedua server.

## Batas yang perlu diketahui

- **Database tetap titik tunggal.** Bila database tidak terjangkau, kedua server berhenti melayani data. Aplikasi tetap mencatat offline dan mengirim ulang saat database pulih. Cadangan database dan replikasi berada di luar cakupan dokumen ini.
- **Pembatas percobaan login per server.** Hitungan percobaan login yang salah disimpan di memori tiap server, sehingga batasnya berlaku per server.
- **Folder rilis APK** adalah satu-satunya data di disk; lupa menyinkronkannya membuat kedua server menawarkan versi berbeda.

## Pemeriksaan

```bash
curl -s https://<alamat>/api/v1/kesehatan            # status siap, database terhubung
curl -sI https://<alamat>/api/v1/kesehatan | grep -i x-simpatik-server
curl -s https://<alamat>/api/v1/aplikasi/server      # daftar server sama di kedua server
curl -s https://<alamat>/api/v1/aplikasi/versi       # sha256 sama di kedua server
```

Uji perpindahan: hentikan API di server utama, pastikan aplikasi menampilkan status **Server online** melalui server kembar dan data baru tersimpan, lalu nyalakan kembali server utama.
