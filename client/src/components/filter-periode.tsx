/**
 * Pemilih periode di sidebar dan di bilah atas tablet tegak.
 *
 * Memakai <select> asli, bukan tiruan berbasis <div>: papan tombol, pembaca
 * layar, dan gulir daftar panjang sudah benar tanpa satu baris pun kode
 * tambahan.
 *
 * Labelnya ditulis pemanggil. Letaknya berbeda di tiap tempat — di atas kotak
 * pada sidebar, di sebelah kiri pada bilah atas — dan `id` yang berbeda wajib:
 * keduanya ada di DOM sekaligus, satu tersembunyi menurut lebar layar.
 */

import { ChevronDown } from 'lucide-react';
import type { Periode } from '@/types/posyandu';

type Props = {
    id: string;
    periode: Periode[];
    nilai: string;
    onGanti: (id: string) => void;
    className?: string;
};

export default function FilterPeriode({
    id,
    periode,
    nilai,
    onGanti,
    className = '',
}: Props) {
    return (
        <div className={`relative ${className}`}>
            <select
                id={id}
                value={nilai}
                onChange={(e) => onGanti(e.target.value)}
                className="h-14 w-full cursor-pointer appearance-none rounded-lg border-2 border-border bg-card pr-11 pl-4 text-base font-semibold"
            >
                {periode.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2.5}
                aria-hidden="true"
            />
        </div>
    );
}
