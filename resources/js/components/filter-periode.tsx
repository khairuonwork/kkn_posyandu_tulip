/**
 * Pemilih periode, dipakai ulang di header, Beranda, dan Laporan
 * (docs/10-prd-demo-frontend.md bagian 8.3).
 *
 * Memakai <select> asli, bukan tiruan berbasis <div>: papan tombol, pembaca
 * layar, dan gulir daftar panjang sudah benar tanpa satu baris pun kode
 * tambahan.
 */

import { ChevronDown } from 'lucide-react';
import type { Periode } from '@/types/posyandu';

type Props = {
    periode: Periode[];
    nilai: string;
    onGanti: (id: string) => void;
};

export default function FilterPeriode({ periode, nilai, onGanti }: Props) {
    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* Di ponsel kata "Periode" disembunyikan secara visual: pilihannya
                sendiri sudah berbunyi `Juni 2026`, dan bilah atas cuma punya
                ruang untuk satu di antara keduanya. Pembaca layar tetap
                mendapat labelnya. */}
            <label
                htmlFor="filter-periode"
                className="sr-only text-sm font-semibold text-muted-foreground sm:not-sr-only"
            >
                Periode
            </label>
            <div className="relative">
                <select
                    id="filter-periode"
                    value={nilai}
                    onChange={(e) => onGanti(e.target.value)}
                    className="h-12 appearance-none rounded-lg border border-border-strong bg-background pr-10 pl-3.5 text-base"
                >
                    {periode.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.label}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}
