import { useId, useState } from 'react';
import { KOSONG, labelIndeks } from '@/lib/format';
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

/**
 * Catatan pendaftaran dan KMS bulan yang dipilih; dua baris, bisa dibuka utuh.
 */
export function Catatan({ baris }: { baris: BarisAnak }) {
    const [utuh, setUtuh] = useState(false);
    const id = useId();
    const isi = [
        ['Pendaftaran', baris.catatanPendaftaran],
        ['KMS', baris.catatanKms],
    ].filter((c): c is [string, string] => Boolean(c[1]));

    if (isi.length === 0) {
        return <span className="text-muted-foreground">{KOSONG}</span>;
    }

    // ponytail: panjang teks sebagai tanda terpotong; ukur overflow bila meleset.
    const panjang = isi.reduce((n, [, t]) => n + t.length, 0) > 70;

    return (
        <div className="max-w-60">
            <p id={id} className={`text-sm ${utuh ? '' : 'line-clamp-2'}`}>
                {isi.map(([label, teks]) => (
                    <span key={label}>
                        <b className="font-bold">{label}:</b> {teks}{' '}
                    </span>
                ))}
            </p>
            {panjang && (
                <button
                    type="button"
                    aria-expanded={utuh}
                    aria-controls={id}
                    onClick={() => setUtuh(!utuh)}
                    className="min-h-11 text-sm font-bold text-primary underline underline-offset-2"
                >
                    {utuh ? 'Tutup' : 'Selengkapnya'}
                </button>
            )}
        </div>
    );
}
