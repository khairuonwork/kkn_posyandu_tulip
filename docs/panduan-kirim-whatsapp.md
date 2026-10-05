# Panduan: Menyiapkan Kirim ke WhatsApp dan Lembar Hasil

| | |
|---|---|
| **Jenis** | Panduan |
| **Status** | hidup |
| **Perubahan berarti terakhir** | 5 Oktober 2026 |

Panduan ini menjelaskan **cara menyiapkan** tombol **Kirim ke WhatsApp** di Detail Balita dan tautan **Lembar Hasil** yang dikirim bersamanya. Isinya langkah demi langkah, untuk orang yang menyiapkan atau menjalankan portal.

Alasan rancangannya ada di [F03 — Kirim hasil ke WhatsApp](prd/feedback/F03-kirim-whatsapp.md). Cara menjalankan portal secara umum ada di [`README.md`](../README.md).

## Cara kerjanya, singkat

1. Petugas membuka Detail Balita dan menekan **Kirim ke WhatsApp**.
2. Portal membuat tautan Lembar Hasil, lalu menampilkan pesan yang bisa dibaca dan diubah.
3. Petugas menekan **Buka WhatsApp**, lalu menekan Kirim di dalam WhatsApp.
4. Orang tua membuka tautan di ponselnya. Halaman itu berisi hasil, grafik, dan tombol untuk menyimpan PDF.

Tautan **berlaku 20 hari**. Sesudah itu orang tua melihat pesan "Tautan ini sudah tidak berlaku".

## Sebelum mulai

- Portal sudah bisa dijalankan (lihat [`README.md`](../README.md)).
- Tidak ada pustaka baru yang dipasang dan tidak ada migrasi basis data.
- Server dan klien perlu dijalankan ulang setelah pengaturan di bawah diisi.

## Langkah 1 — Buat kunci tautan di server

Kunci ini dipakai untuk menandatangani tautan, sehingga tautan tidak bisa dipalsukan.

Buat kunci acak dengan perintah ini:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Salin hasilnya ke `server/.env`:

```text
LEMBAR_RAHASIA=tempel-hasil-perintah-di-sini
```

Hal yang perlu diperhatikan:

- Panjangnya minimal 32 karakter. Hasil perintah di atas sudah 64 karakter.
- Berkas `.env` tidak ikut Git. Isi kunci ini **di setiap komputer atau server** yang menjalankan portal.
- Menyimpan kunci yang sama di server yang sama membuat tautan lama tetap berlaku. **Mengganti kuncinya mencabut semua tautan yang pernah dikirim.**
- Tanpa kunci ini, tombol **Kirim ke WhatsApp** tetap bisa dipakai, tetapi pesan tidak memuat tautan.

## Langkah 2 — Atur alamat dan nomor uji di klien

Salin `client/.env.example` menjadi `client/.env.local`, lalu isi dua baris ini:

```text
VITE_WA_NOMOR_UJI=6283184447563
VITE_ALAMAT_PUBLIK=http://192.168.1.20:5173
```

| Pengaturan | Fungsinya | Kapan diisi |
|---|---|---|
| `VITE_WA_NOMOR_UJI` | Semua pesan dikirim ke nomor ini, bukan ke nomor orang tua. Jendela pratinjau menandainya "Mode uji". | Hanya selama pengujian. **Kosongkan sebelum dipakai sungguhan.** |
| `VITE_ALAMAT_PUBLIK` | Alamat portal yang ditulis di tautan. Harus alamat yang bisa dibuka dari ponsel orang tua. | Saat portal dipakai lewat jaringan lokal atau alamat publik. |

Aturan penulisan:

- Nomor uji ditulis `62` di depan, tanpa `+`, spasi, atau tanda hubung.
- Alamat portal ditulis lengkap dengan `http://` dan nomor porta, **tanpa garis miring di akhir**.
- Pada jaringan lokal, isi alamat dengan alamat IP komputer server. Skrip `mulai-qa-lan.ps1` mencetak alamat itu saat dijalankan.
- Alamat IP bisa berganti saat Wi-Fi berpindah atau komputer dinyalakan ulang. Jika tautan tiba-tiba tidak terbuka, periksa dulu apakah alamat ini masih sama.

Berkas `.env.local` tidak ikut Git.

## Langkah 3 — Jalankan ulang

Server API dan server klien harus dimulai ulang agar membaca isian baru. Pengaturan berawalan `VITE_` hanya dibaca saat server klien dimulai.

Jika memakai mode QA satu Wi-Fi, hentikan lalu jalankan lagi:

```powershell
.\hentikan-qa-lan.ps1
```

```powershell
.\mulai-qa-lan.ps1
```

## Langkah 4 — Izinkan ponsel menjangkau komputer

Ponsel hanya bisa membuka tautan bila:

- ponsel dan komputer server berada di **Wi-Fi yang sama**;
- **Windows Firewall** mengizinkan Node.js untuk jaringan Private, sebagaimana diminta skrip QA; dan
- jaringan tidak memakai *client isolation*. Jika memakai AP kantor atau kampus yang menerapkannya, gunakan router atau hotspot pribadi.

Selama portal hanya berjalan di jaringan lokal, **tautan hanya terbuka dari ponsel yang berada di jaringan yang sama.** Orang tua yang membukanya dari rumah dengan data seluler tidak akan berhasil. Untuk itu portal perlu alamat publik.

## Cek bahwa semuanya berjalan

1. Masuk ke portal sebagai petugas.
2. Buka balita yang **punya pengukuran pada periode yang dipilih**. Balita yang belum ditimbang pada periode itu tidak mendapat tombol kirim.
3. Tekan **Kirim ke WhatsApp**.
4. Pastikan tiga hal ini:
   - jendela pratinjau memuat tautan yang berawalan alamat dari `VITE_ALAMAT_PUBLIK`;
   - selama pengujian, jendela itu menampilkan "Mode uji" dan nomor uji;
   - pesan masuk ke nomor uji setelah menekan Kirim di WhatsApp.
5. Ketuk tautan di ponsel yang satu Wi-Fi. Halaman hasil harus terbuka, dan tombol **Unduh hasil lengkap (PDF)** membuka jendela cetak.

## Sebelum dipakai sungguhan

- Kosongkan `VITE_WA_NOMOR_UJI`, atau hapus `client/.env.local`. Pengaturan `VITE_` ikut tertanam di aplikasi hasil build, sehingga nomor uji yang tertinggal akan membelokkan semua pesan.
- Pastikan ambang "perlu diperiksa" sudah disahkan Puskesmas. Ambang itu menentukan kalimat yang diterima orang tua.
- Pastikan ada persetujuan orang tua untuk dikirimi hasil anaknya.
- Pastikan portal punya alamat yang bisa dijangkau orang tua dan isi `VITE_ALAMAT_PUBLIK` dengan alamat itu.

## Jika ada kendala

| Gejala | Penyebab | Yang dilakukan |
|---|---|---|
| Tautan di WhatsApp tidak berwarna biru dan tidak bisa diketuk | Tautan berawalan `localhost`, yang tidak dikenali WhatsApp | Isi `VITE_ALAMAT_PUBLIK` dengan alamat IP komputer, atau buka portal lewat alamat IP, lalu mulai ulang klien |
| Tautan diketuk tetapi tidak terbuka di ponsel | Ponsel tidak satu Wi-Fi, firewall menahan, atau alamat IP berganti | Periksa langkah 4 dan alamat IP |
| Pesan terkirim ke nomor yang bukan nomor orang tua | `VITE_WA_NOMOR_UJI` masih terisi | Kosongkan lalu mulai ulang klien |
| Pesan tidak memuat tautan, atau jendela menulis "Tautan hasil lengkap belum dapat dibuat" | `LEMBAR_RAHASIA` belum diisi, atau server belum dimulai ulang | Isi kuncinya (langkah 1) lalu mulai ulang server |
| Tombol **Kirim ke WhatsApp** tidak ada | Balita belum diukur pada periode itu, hasilnya ditandai tidak wajar, atau nomor orang tua belum diisi | Baca keterangan di bawah judul Detail Balita |
| Halaman hasil menulis "Tautan ini sudah tidak berlaku" | Sudah lewat 20 hari | Buat tautan baru lewat **Kirim ke WhatsApp** |
| Halaman hasil menulis "Tautan tidak dikenali" | Tautan terpotong, atau `LEMBAR_RAHASIA` diganti sesudah tautan dibuat | Buat tautan baru |

## Batasan yang perlu diketahui

- **Tautan tidak bisa dicabut satu per satu.** Satu-satunya cara mencabut adalah mengganti `LEMBAR_RAHASIA`, yang mencabut semuanya.
- **Isi halaman dibaca langsung dari basis data** saat tautan dibuka, bukan salinan saat dikirim. Jika data dikoreksi setelah dikirim, orang tua melihat angka yang sudah dikoreksi.
- **Tombol PDF membuka jendela cetak peramban.** Orang tua memilih **Simpan sebagai PDF**. Berkas PDF tidak dibuat oleh server. Nama berkasnya otomatis, misalnya `Laporan Pertumbuhan Aditama - Agustus 2025 - Posyandu Tulip.pdf`.
- **Hanya nama depan** yang dikirim ke halaman publik. Tidak ada NIK, alamat, nama orang tua, maupun tanggal lahir.
- Tidak ada catatan "sudah dikirim". Portal tidak bisa mengetahui apakah petugas benar-benar menekan Kirim di WhatsApp.
