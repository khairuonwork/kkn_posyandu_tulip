# Kartu Sasaran dan Antrean

Perubahan 24 September 2026:

- Kartu sasaran kini menghasilkan QR standar yang benar-benar dapat dipindai.
- Payload kartu berversi `SIMPATIK:SASARAN:1:<id>:<nik>` dan kode pendek `SPT-<id 8 digit>`.
- Halaman Pendaftaran layanan dapat membuka kamera laptop, mencari seluruh sasaran, menampilkan skrining kekurangan identitas, dan memasukkan anak ke antrean harian.
- Antrean browser mencegah sasaran yang sama masuk dua kali pada tanggal yang sama.
- Format kartu sama dengan pemindai Android v1.6.

Implementasi pada branch ini masih demo frontend. Antrean disimpan di `localStorage`; controller, endpoint, tabel antrean server, otorisasi wilayah, serta sinkronisasi realtime lintas perangkat belum tersedia.
