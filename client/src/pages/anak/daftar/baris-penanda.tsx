import { labelIndeks } from '@/lib/format';
import type { BarisAnak } from './tipe';

/**
 * Alasan baris ini ditandai, saat alasannya bukan BB/TB.
 */
export function Pemicu({ baris }: { baris: BarisAnak }) {
    if (
        !baris.perluPerhatian ||
        baris.indeksPemicu === null ||
        baris.indeksPemicu === 'BB_TB' ||
        baris.kategoriPemicu === null
    ) {
        return null;
    }

    return (
        <span className="mt-1 block text-sm text-tone-amber">
            Ditandai: {baris.kategoriPemicu} (
            {labelIndeks(baris.indeksPemicu, baris.umurBulan)})
        </span>
    );
}

/**
 * Risiko sejak lahir pada satu baris.
 */
export function Risiko({ baris }: { baris: BarisAnak }) {
    if (baris.risikoLahir === null) {
        return null;
    }

    return (
        <span className="mt-1 block text-sm text-tone-blue">
            {baris.risikoLahir}
        </span>
    );
}
