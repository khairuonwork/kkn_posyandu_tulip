import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Build aplikasi sungguhan.
 *
 * `/api` di-proxy ke server, bukan dipanggil lintas origin dengan `cors`.
 * Alasannya bukan kenyamanan: rencana produksi adalah **satu origin** —
 * Express menyajikan hasil build ini sekaligus API-nya. Proxy membuat
 * pengembangan memakai bentuk yang sama, sehingga cookie `SameSite=Lax` yang
 * bekerja di sini bekerja juga nanti. Dengan `cors`, cookie-nya akan menuntut
 * `SameSite=None; Secure` yang justru tidak dipakai di produksi.
 */
export default defineConfig({
    plugins: [react(), tailwindcss()],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src/', import.meta.url)),
        },
    },

    server: {
        proxy: {
            // Porta 4321, sama dengan bawaan server. Lihat server/.env.example.
            '/api': {
                target: process.env.API ?? 'http://127.0.0.1:4321',
                changeOrigin: false,
            },
        },
    },

    build: {
        outDir: 'dist',
        emptyOutDir: true,

        // Ambang bawaan 500 kB selalu terlampaui, dan peringatannya menyesatkan
        // di sini: ia mengukur ukuran **mentah** setelah minifikasi, sementara
        // sepertiga bundel ini adalah JSON data contoh yang mampat sangat baik.
        // Terukur 22 September 2026: 727 kB mentah → 146 kB gzip, dan 51 kB di
        // antaranya data (`posyandu.json` 39 kB, `who-lms.json` 11 kB).
        //
        // ponytail: dinaikkan, bukan dipecah. Data contoh hilang dari bundel
        // begitu endpoint data datang — lihat catatan di `src/layar.tsx` dan
        // butir 4 pada docs/rencana-kerja.md. Memecah chunk sekarang berarti
        // membangun sesuatu yang ikut terhapus saat itu.
        //
        // Ambangnya 800 kB, bukan dimatikan: apa pun yang melewatinya sesudah
        // ini adalah pertumbuhan baru dan memang layak berbunyi. Turunkan ke
        // bawaan setelah butir 4 selesai.
        chunkSizeWarningLimit: 800,
    },
});
