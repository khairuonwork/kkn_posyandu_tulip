/**
 * Keadaan kosong yang dirancang, bukan kebetulan.
 *
 * Butir K5 pada docs/riwayat/layar-demo.md bagian 3 adalah kriteria yang
 * paling sering gagal saat demo: layar kosong tanpa penjelasan. Karena itu
 * komponen ini **mewajibkan** sebuah sebab, dan menawarkan jalan keluar bila
 * ada — bukan sekadar menulis "tidak ada data"
 * (docs/rujukan/ui-ux.md bagian 9).
 */

import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type WarnaIkon = 'primer' | 'amber' | 'sukses' | 'netral';

type Props = {
    /** Menjelaskan sebabnya secara menenangkan, mis. `Data balita tetap tersimpan di database...` */
    sebab: ReactNode;
    /** Judul tebal keadaan kosong (opsional) */
    judul?: ReactNode;
    /** Ikon pendukung keadaan kosong */
    ikon?: LucideIcon;
    /** Pilihan warna ikon & wadah (default 'netral') */
    warnaIkon?: WarnaIkon;
    /** Tombol atau tautan khusus */
    children?: ReactNode;
    /** Label tombol aksi cepat */
    aksiLabel?: string;
    /** Ikon untuk tombol aksi cepat */
    aksiIkon?: LucideIcon;
    /** Handler tombol aksi cepat */
    onAksi?: () => void;
    /** Tambahan class container */
    className?: string;
};

const WARNA_IKON: Record<WarnaIkon, { wadah: string; ikon: string }> = {
    netral: {
        wadah: 'bg-muted/70 text-muted-foreground border-border/60',
        ikon: 'text-muted-foreground',
    },
    primer: {
        wadah: 'bg-primary/10 text-primary border-primary/20',
        ikon: 'text-primary',
    },
    amber: {
        wadah: 'bg-tone-amber-bg text-tone-amber border-tone-amber/20',
        ikon: 'text-tone-amber',
    },
    sukses: {
        wadah: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
        ikon: 'text-emerald-700',
    },
};

export default function EmptyState({
    sebab,
    judul,
    ikon: Ikon = Inbox,
    warnaIkon = 'netral',
    children,
    aksiLabel,
    aksiIkon: AksiIkon,
    onAksi,
    className = '',
}: Props) {
    const palet = WARNA_IKON[warnaIkon];

    return (
        <div className={`state-halaman ${className}`}>
            {Ikon && (
                <div
                    className="mb-1 flex items-center justify-center"
                    aria-hidden="true"
                >
                    <Ikon className={`size-10 ${palet.ikon}`} />
                </div>
            )}

            {judul && (
                <h3 className="text-base font-bold text-foreground sm:text-lg">
                    {judul}
                </h3>
            )}

            <div className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
                {sebab}
            </div>

            {(children !== undefined || (aksiLabel && onAksi)) && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    {children}
                    {aksiLabel && onAksi && (
                        <button
                            type="button"
                            onClick={onAksi}
                            className="tombol-kedua inline-flex items-center gap-2 text-sm"
                        >
                            {AksiIkon && (
                                <AksiIkon
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            )}
                            {aksiLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
