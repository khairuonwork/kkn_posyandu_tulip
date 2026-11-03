import { CircleCheck, TriangleAlert } from 'lucide-react';
import { angka, KOSONG } from '@/lib/format';
import { kbmKg } from '@/lib/kategori';

/**
 * Isi kolom "Berat naik?": status arsip N/T/O/B, dengan batas KBM umurnya di
 * bawah "Tidak naik".
 */
export function StatusNaik({
    ntob,
    umurBulan,
    ikon = true,
}: {
    ntob: string | null;
    umurBulan: number | null;
    ikon?: boolean;
}) {
    const huruf = ntob?.toUpperCase() ?? null;

    if (huruf === 'N') {
        return (
            <span className="inline-flex items-center gap-1.5 font-bold whitespace-nowrap text-tone-green">
                {ikon && (
                    <CircleCheck
                        className="size-4 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                )}
                Naik
            </span>
        );
    }

    if (huruf === 'T') {
        const kbm = kbmKg(umurBulan);

        return (
            <>
                <span className="inline-flex items-center gap-1.5 font-bold whitespace-nowrap text-tone-amber">
                    {ikon && (
                        <TriangleAlert
                            className="size-4 shrink-0"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    )}
                    Tidak naik
                </span>
                {kbm !== null && (
                    <span className="block text-sm font-medium text-muted-foreground">
                        kurang dari {angka(kbm, 2)} kg
                    </span>
                )}
            </>
        );
    }

    return (
        <span className="text-muted-foreground">
            {huruf === 'B'
                ? 'Pertama kali ditimbang'
                : huruf === 'O'
                  ? 'Tidak ditimbang bulan lalu'
                  : KOSONG}
        </span>
    );
}
