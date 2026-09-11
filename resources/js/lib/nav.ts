/**
 * Titik sambung navigasi — satu-satunya tempat halaman menyentuh router.
 *
 * Halaman mengimpor `Link`, `Head`, dan `navigate` dari sini, bukan langsung
 * dari `@inertiajs/react`. Build Laravel memakai berkas ini apa adanya; build
 * demo mengalihkannya ke demo/nav.tsx lewat `resolve.alias` di
 * vite.demo.config.ts.
 *
 * Akibatnya tidak ada satu pun percabangan "kalau demo" di dalam halaman, dan
 * berkas ini tidak berubah saat backend siap
 * (docs/10-prd-demo-frontend.md bagian 4.1 dan 10).
 */

import { router } from '@inertiajs/react';

export { Head, Link } from '@inertiajs/react';

export function navigate(href: string): void {
    router.visit(href);
}
