# Pemulihan API — 31 Oktober 2026

Proses API berhenti karena event error koneksi idle pg.Pool (EHOSTUNREACH)
tidak ditangani. Listener kini mencatat kode galat tanpa mencetak objek driver
yang dapat mengandung kredensial. Driver membuang koneksi rusak; permintaan
berikutnya dapat memakai koneksi lain atau membuka koneksi baru. TCP keepalive
diaktifkan. Galat query tetap ditangani melalui alur permintaan HTTP.

VM menggunakan Node dan config yang sama untuk unit sistem dan unit pengguna.
Unit pengguna tersedia pada `deploy/linux/simpatik-user.service` dan dipasang ke
`~/.config/systemd/user/simpatik-user.service`.

```sh
loginctl enable-linger hafizh
systemctl --user daemon-reload
systemctl --user enable --now simpatik-user.service
systemctl --user status simpatik-user.service
journalctl --user -u simpatik-user.service -n 30
```

Hentikan proses sementara pemilik porta 4321 sebelum memulai unit pengguna.
Unit pengguna memakai Restart=always. Saat mulai, unit ini memberi jalan bila
unit sistem simpatik.service sudah aktif agar keduanya tidak berebut porta.
Unit sistem tetap enabled untuk boot berikutnya. Linger memungkinkan unit
pengguna bertahan setelah sesi SSH berakhir.

Jangan restart tunnel Cloudflare untuk pembaruan API; Quick Tunnel dapat
mengganti alamat bila proses tunnel dimulai ulang. Periksa endpoint
`/api/v1/kesehatan` melalui loopback dan HTTPS setelah pembaruan.

Perubahan ini tidak menjalankan migrasi atau mengubah data pengukuran.
