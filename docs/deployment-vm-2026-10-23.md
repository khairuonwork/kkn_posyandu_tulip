# Pemindahan web/API ke VM — 23 Oktober 2026

Target SSH: hafizh@100.127.247.109 (ubuntu-headless-daffa). IP tersebut privat Tailscale. Jalur publik memakai Cloudflare Quick Tunnel; URL final dicatat setelah pengujian deployment.

## Lokasi dan batas perubahan

- Sumber: clone GitHub branch development ke /home/hafizh/simpatik.
- Node.js 24: /home/hafizh/simpatik-runtime/node; unduhan resmi diverifikasi SHA-256.
- Rahasia: /home/hafizh/.config/simpatik/server.env, hak akses 600; dikirim melalui SSH, tidak melalui Git/APK.
- Unit: deploy/linux/simpatik.service dan simpatik-tunnel.service, dipasang ke /etc/systemd/system/.
- Express melayani hasil build client/dist dan /api pada satu origin, terikat 127.0.0.1:4321.
- Database tetap Supabase yang sama. Pemindahan host tidak menjalankan seed, reset antrean, atau mengubah kata sandi.
- Produksi tidak membuka UDP discovery atau Vite. Layanan lain di VM tidak diubah.

## Operasional setelah unit dipasang

Gunakan SSH, lalu:

```sh
systemctl status simpatik simpatik-tunnel --no-pager
journalctl -u simpatik -n 60 --no-pager
journalctl -u simpatik-tunnel -n 60 --no-pager
curl --fail http://127.0.0.1:4321/api/v1/kesehatan
sudo systemctl restart simpatik
```

Kedua unit diaktifkan saat boot. Restart API saja mempertahankan URL tunnel yang sedang berjalan. Quick Tunnel memakai URL acak; restart proses tunnel/VM dapat menghasilkan URL baru dan endpoint Android perlu disesuaikan. Gunakan named tunnel + domain milik sendiri atau Tailscale Funnel yang disetujui pemilik tailnet untuk alamat tetap.

## Pembaruan berikutnya

Push perubahan ke GitHub, catat commit, lalu fetch/fast-forward branch development di VM; pasang dependensi dengan npm ci dan build frontend sebelum restart API. Catat commit sebelumnya untuk rollback. Jangan jalankan utilitas reset data sebagai bagian deployment.

## Pemeriksaan rilis

Android: 41 tes regresi lulus. Frontend: 71 tes lulus dan TypeScript lulus. Pengujian server memakai Node 24 sesuai engines proyek; fixture disesuaikan dengan kontrak keanggotaan Posyandu dan tes login dipindahkan ke schema sementara. Hasil akhir server dan alamat publik dicatat setelah deploy.
