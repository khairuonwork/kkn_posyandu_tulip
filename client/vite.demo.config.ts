import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Build demo statis — React dan Tailwind saja, tanpa backend.
 *
 * Sejak pindah ke stack baru, demo tidak lagi punya seam khusus. Dulu berkas
 * ini mengalihkan `@/lib/nav` ke versi demo, karena versi produk membungkus
 * Inertia; sekarang `src/lib/nav.tsx` yang berbasis alamat hash itulah versi
 * produknya, jadi demo dan aplikasi memakai navigasi yang sama persis.
 *
 * Alamat relatif supaya hasil build dapat dibuka dari static host mana pun
 * tanpa aturan rewrite (docs/rujukan/layar-demo.md bagian 4.1).
 */
export default defineConfig({
    root: 'demo',
    base: './',

    plugins: [react(), tailwindcss()],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src/', import.meta.url)),
        },
    },

    build: {
        outDir: '../dist-demo',
        emptyOutDir: true,

        // Alasannya berbeda dari `vite.config.ts`. Di sana data contoh bersifat
        // sementara; di sini ia **memang bagian dari produknya** — demo harus
        // berjalan tanpa jaringan sama sekali, dan itu berarti seluruh datanya
        // ikut terbundel selamanya. Terukur 22 September 2026: 728 kB mentah →
        // 146 kB gzip, wajar untuk SPA yang harus berdiri sendiri.
        chunkSizeWarningLimit: 800,
    },
});
