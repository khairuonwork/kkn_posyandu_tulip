import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Build demo frontend — React dan Tailwind saja.
 *
 * vite.config.ts milik jalur Laravel tidak disentuh, dan tetap berfungsi begitu
 * PHP 8.3 tersedia. Berkas ini tidak memuat laravel-vite-plugin, Inertia, maupun
 * Wayfinder, yang ketiganya menuntut `php artisan`
 * (docs/10-prd-demo-frontend.md bagian 4.3).
 */
export default defineConfig({
    root: 'demo',

    // Alamat relatif supaya hasil build dapat dibuka langsung dari file://
    // maupun static host mana pun tanpa aturan rewrite (bagian 4.1).
    base: './',

    plugins: [react(), tailwindcss()],

    resolve: {
        // Urutan penting: aturan pertama yang cocok yang dipakai. Hanya
        // `@/lib/nav` yang dialihkan; sisanya tetap menunjuk resources/js.
        // Inilah keseluruhan titik sambung antara halaman produk dan demo.
        alias: [
            {
                find: /^@\/lib\/nav$/,
                replacement: fileURLToPath(
                    new URL('./demo/nav.tsx', import.meta.url),
                ),
            },
            {
                find: /^@\//,
                replacement: fileURLToPath(
                    new URL('./resources/js/', import.meta.url),
                ),
            },
        ],
    },

    build: {
        outDir: '../dist-demo',
        emptyOutDir: true,
    },
});
