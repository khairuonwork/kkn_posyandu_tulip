/**
 * Versi demo dari `@/lib/nav`.
 *
 * vite.demo.config.ts mengalihkan `@/lib/nav` ke berkas ini, sehingga halaman di
 * resources/js/pages/** berjalan tanpa Inertia dan tanpa satu baris pun kode
 * khusus demo di dalamnya.
 *
 * Alamat berbentuk hash (`#/balita/12`) supaya hasil build dapat dibuka
 * langsung dari `file://` maupun static host mana pun tanpa aturan rewrite
 * (docs/rujukan/layar-demo.md bagian 4.1).
 */

import { useEffect, useState } from 'react';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string;
    children?: ReactNode;
};

/** Alamat tanpa tanda pagar, selalu diawali garis miring. */
export function alamatSekarang(): string {
    const hash = window.location.hash.replace(/^#/, '');

    return hash === '' ? '/' : hash;
}

export function navigate(href: string): void {
    window.location.hash = href;
}

/** Alamat yang sedang aktif, ikut berubah saat tombol kembali peramban ditekan. */
export function useAlamat(): string {
    const [alamat, setAlamat] = useState(alamatSekarang);

    useEffect(() => {
        const dengar = () => setAlamat(alamatSekarang());

        window.addEventListener('hashchange', dengar);

        return () => window.removeEventListener('hashchange', dengar);
    }, []);

    return alamat;
}

export function Link({ href, onClick, ...props }: LinkProps) {
    // href tetap ditulis di atribut anchor, bukan hanya ditangani onClick, agar
    // tautan dapat dibuka di tab baru dan alamatnya terlihat di bilah status.
    const tangani = (peristiwa: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(peristiwa);
    };

    return <a href={`#${href}`} onClick={tangani} {...props} />;
}

type HeadProps = { title?: string; children?: ReactNode };

/** Cukup menetapkan judul tab; demo tidak punya meta lain yang perlu diatur. */
export function Head({ title }: HeadProps) {
    useEffect(() => {
        if (title !== undefined) {
            document.title = `${title} — Portal Posyandu Tulip`;
        }
    }, [title]);

    return null;
}
