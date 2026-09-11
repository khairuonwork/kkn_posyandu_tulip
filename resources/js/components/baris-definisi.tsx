/**
 * Satu baris daftar definisi: label di kiri, isi di kanan.
 *
 * Dulu komponen ini ada dua kali kata demi kata - di `pages/anak/show.tsx` dan
 * di `pages/pengaturan/index.tsx`.
 */

import type { ReactNode } from 'react';

type Props = { label: string; children: ReactNode };

export default function BarisDefinisi({ label, children }: Props) {
    return (
        <div className="flex gap-3 border-b border-border py-2">
            <dt className="w-40 shrink-0 text-sm font-semibold text-muted-foreground">
                {label}
            </dt>
            <dd className="text-base">{children}</dd>
        </div>
    );
}
