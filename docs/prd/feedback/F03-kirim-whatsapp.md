# F03 — Kirim hasil ke WhatsApp

| | |
|---|---|
| **Jenis** | Kontrak — PRD fitur |
| **Status** | draf |
| **PR** | `feat/f03-kirim-wa` |
| **Bergantung pada** | [F01](F01-kontak-whatsapp-ortu.md) nomornya, [F02](F02-edukasi-rujukan-kms.md) kalimat edukasinya |
| **Terhambat** | — |
| **Perubahan berarti terakhir** | 21 September 2026 |

## 1. Latar

> "Request untuk datanya bisa diformat ke WhatsApp"

> "Bisa di forward langsung ke WA yg terdaftar saat itu juga, hasil dari anak tersebut."

Dua kata yang menentukan bentuk fiturnya: **"saat itu juga"**. Bukan rekap yang dikirim malam hari, bukan laporan bulanan — hasil satu anak, diteruskan sementara ibunya masih berdiri di meja.

## 2. Lingkup

**Masuk:**

- Satu tombol di Detail anak yang membuka WhatsApp dengan draf pesan sudah terisi.
- Penyusun pesan: satu fungsi murni, dari `Pengukuran` menjadi teks.
- Keadaan ketika nomor belum ada, dan ketika anak belum ditimbang.

**Sengaja tidak masuk:**

- **Gateway WhatsApp** (Fonnte, Wablas, Twilio). Keputusan pemilik program: tautan `wa.me`. Gateway menuntut backend berjalan, langganan berbayar, dan nomor pengirim resmi — tiga hal yang belum ada, demi menghemat satu ketukan jari kader.
- **Pengiriman otomatis saat simpan.** Kader harus melihat isi pesannya sebelum terkirim. Pesan tentang gizi seorang anak bukan hal yang dikirim diam-diam oleh tombol Simpan.
- **Kirim massal ke seluruh RT.** Tidak diminta, dan `wa.me` memang satu nomor per tautan.
- **Riwayat terkirim.** Portal tidak akan pernah tahu apakah kader benar-benar menekan Kirim di dalam WhatsApp. Mencatat "sudah dikirim" padahal yang terjadi baru "sudah dibuka" adalah catatan yang berbohong.

## 3. Perilaku yang diharapkan

Tombol **Kirim hasil ke WhatsApp** berdiri di bilah aksi Detail anak, bersebelahan dengan Ubah data.

| Keadaan | Yang terjadi |
|---|---|
| Nomor ada, anak sudah ditimbang | Tombol aktif. Ditekan → WhatsApp terbuka di tab baru dengan draf terisi. Kader membaca, lalu menekan Kirim sendiri di dalam WhatsApp |
| Nomor belum tercatat | Tombol **tidak dirender**. Diganti satu baris: nomor WhatsApp belum tercatat, beserta tautan ke tempat mengisinya |
| Anak belum ditimbang periode ini | Tombol tidak dirender. Tidak ada hasil untuk dikirim |
| Angka dari periode sebelumnya | Tombol aktif, dan **pesannya menyebut tanggal ukur itu** — sama seperti kartu [F02](F02-edukasi-rujukan-kms.md) |

Tombol yang tidak berlaku **dihapus dari DOM, bukan dinonaktifkan**. Aturan ini sudah dipegang Portal di dua tempat lain (butir navigasi tanpa hak, pemilih RT untuk kader), dan alasannya sama: kontrol mati yang masih berbentuk kontrol menjanjikan sesuatu lalu menolaknya.

### Bentuk pesan

```text
Halo Ayah/Bunda [Nama Orang Tua],
Berikut hasil penimbangan ananda di Posyandu Tulip.

Nama      : [Nama Anak]
Tanggal   : [13 Juni 2026]
Usia      : [3 tahun 2 bulan]

Hasil pengukuran
- Berat badan     : [12,4] kg
- Panjang/Tinggi  : [94,5] cm
- Lingkar lengan  : [15,2] cm
- Lingkar kepala  : [49,0] cm

Status gizi
- BB/U   : [Berat badan normal]
- TB/U   : [Normal]
- BB/TB  : [Gizi baik]

Catatan
[kalimat edukasi dari F02]

Terima kasih sudah rutin membawa ananda ke Posyandu.
```

Baris yang nilainya tidak ada **dihilangkan seluruhnya**, tidak dicetak sebagai `—`. Tanda pisah itu punya arti di tabel; di dalam pesan untuk orang tua ia hanya membingungkan.

Kalimat pada bagian **Catatan** datang dari `edukasiDari()` milik [F02](F02-edukasi-rujukan-kms.md) — fungsi yang sama persis dengan yang mengisi kartu di layar. Kader tidak boleh membaca satu anjuran di Portal lalu mengirim anjuran yang lain ke ibunya.

## 4. Data & tipe yang berubah

Tidak ada field baru. F01 sudah menyediakan nomornya, F02 kalimatnya.

```ts
// client/src/lib/pesan-wa.ts
export function susunPesan(
    anak: Anak,
    ukur: Pengukuran,
    umurBulan: number | null,
): string;

/** https://wa.me/<nomor>?text=<pesan terkode>. Null bila nomor belum ada. */
export function tautanWa(anak: Anak, pesan: string): string | null;
```

## 5. Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `client/src/lib/pesan-wa.ts` | **Baru.** Kedua fungsi di atas. |
| `client/test/pesan-wa.test.ts` | **Baru.** Baris kosong hilang, nomor null menghasilkan null, teks terkode benar. |
| `client/src/pages/anak/show.tsx` | Tombol pada `aksi`, beserta dua keadaan penggantinya. |

## 6. Keputusan terbuka

Tidak ada yang menghambat. Satu hal yang **harus dinyatakan terang-terangan**, bukan dianggap selesai:

**Isi pesan memang masuk ke URL, dan memang sampai ke pihak ketiga.** Begitulah `wa.me` bekerja: nomor orang tua berada di jalur URL, dan seluruh hasil ukur anak berada di *query string* sebagai `?text=`. Tautan itu dibuka di peramban kader, lalu diteruskan ke WhatsApp — milik Meta. Nama anak, umurnya, berat badannya, dan status gizinya melewati sana.

Itu bukan efek samping yang bisa dihindari dengan perapian kode: itu **memang yang diminta**. Pemilik program meminta hasilnya dikirim lewat WhatsApp, dan mengirim lewat WhatsApp berarti WhatsApp membacanya. Yang bisa dijaga hanya ini:

- Tautan disusun dan dibuka di peramban kader. Portal tidak pernah mengirimkannya ke server mana pun, termasuk servernya sendiri.
- Tidak ada NIK di dalam pesan — tidak anak, tidak orang tua. Nomor identitas tidak menambah apa pun bagi ibu yang sudah tahu anaknya sendiri.
- Teks dikodekan dengan `encodeURIComponent`, sehingga nama berspasi dan baris baru tidak merusak tautan.

Catatan ini menggantikan kalimat pada [PRD utama bagian 12](../prd-utama.md) yang sempat berbunyi nomor tidak pernah masuk URL. Untuk pendekatan `wa.me`, kalimat itu tidak benar, dan baris risikonya sudah diperbaiki agar sesuai. [OI-10](../../pertanyaan-terbuka.md) tetap berlaku dan tetap harus selesai sebelum data sungguhan dipakai.

## 7. Kriteria terima

Diuji dengan `npm run demo` dari `client/`:

- [ ] Menekan tombol membuka `wa.me` dengan nomor baku `62…` dan draf pesan sudah terisi.
- [ ] Anak tanpa data LILA: baris lingkar lengan **hilang** dari pesan, bukan tercetak `—`.
- [ ] Kalimat **Catatan** sama persis dengan isi kartu edukasi di layar, huruf per huruf.
- [ ] Anak tanpa nomor: tombol **tidak ada**, diganti keterangan beserta tautan pengisian.
- [ ] Anak belum ditimbang periode ini: tombol tidak ada.
- [ ] Anak bernama panjang berspasi menghasilkan tautan yang tetap sah.
- [ ] Tidak ada NIK di dalam pesan.
- [ ] `pesan-wa.test.ts` lulus dijalankan.
