/**
 * Satu baris daftar definisi: label di kiri, isi di kanan.
 *
 * Dulu komponen ini ada dua kali kata demi kata - di `pages/anak/show.tsx` dan
 * di `pages/pengaturan/index.tsx`.
 */

import type { ReactNode } from 'react';

type Props = {
    label: string;
    children: ReactNode;
    /**
     * Label di atas isinya, bukan di sampingnya.
     *
     * Bentuk bersanding memakai label selebar 160 px tetap. Begitu barisnya
     * berdiri di kolom yang lebih sempit daripada itu — di Detail anak
     * kolomnya 111 px — labelnya meluber menimpa kolom sebelahnya. Bentuk
     * bertumpuk tidak punya lebar tetap sama sekali, jadi tidak bisa meluber.
     */
    tumpuk?: boolean;
};

export default function BarisDefinisi({
    label,
    children,
    tumpuk = false,
}: Props) {
    if (tumpuk) {
        /* Tanpa garis bawah. Delapan garis selebar kolom di atas data
           baca-saja terbaca sebagai borang isian — afordansi yang keliru,
           karena tidak ada satu pun yang bisa diketik di situ. Pemisahnya
           tipografi label dan jaraknya saja; docs/rujukan/layar-demo.md
           bagian 6.5 pun menyebut daftar ini "tanpa kotak". */
        return (
            <div>
                <dt className="text-sm font-semibold text-muted-foreground">
                    {label}
                </dt>
                <dd className="text-base">{children}</dd>
            </div>
        );
    }

    return (
        <div className="flex gap-3 border-b border-border py-2">
            <dt className="w-40 shrink-0 text-sm font-semibold text-muted-foreground">
                {label}
            </dt>
            <dd className="text-base">{children}</dd>
        </div>
    );
}
