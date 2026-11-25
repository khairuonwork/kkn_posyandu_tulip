import { MessageCircle } from 'lucide-react';
import { useId, useState } from 'react';
import JenisKelaminTeks from '@/components/jenis-kelamin';
import { KOSONG, labelIndeks } from '@/lib/format';
import type { BarisAnak } from './tipe';

/**
 * Baris kedua di bawah nama: jenis kelamin dan status kiriman WhatsApp.
 * WhatsApp berwarna menurut keadaannya, karena itu yang ditindaklanjuti kader.
 */
export function InfoBaris({ baris }: { baris: BarisAnak }) {
    const wa =
        baris.waTerkirim == null
            ? { teks: 'Status belum tersedia', warna: 'text-muted-foreground' }
            : baris.waTerkirim
              ? {
                    teks: 'Sudah dikirim, dikonfirmasi kader',
                    warna: 'text-tone-green',
                }
              : { teks: 'Belum dikonfirmasi', warna: 'text-tone-amber' };

    return (
        // Dua baris bertumpuk: kolom nama sempit di laptop, jadi satu baris
        // berpemisah selalu patah dan pemisahnya menggantung.
        <span className="flex flex-col gap-0.5 pb-1 text-sm text-muted-foreground">
            <JenisKelaminTeks jk={baris.jk} />
            <span className={`inline-flex items-center gap-1.5 ${wa.warna}`}>
                <MessageCircle
                    className="size-3.5 shrink-0"
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
                <span>
                    <span className="sr-only">WhatsApp: </span>
                    {wa.teks}
                </span>
            </span>
        </span>
    );
}

/**
 * Alasan baris ini ditandai, saat alasannya bukan BB/TB. `menjorok` meluruskan
 * teks dengan status di atasnya yang berikon.
 */
export function Pemicu({
    baris,
    menjorok = false,
}: {
    baris: BarisAnak;
    menjorok?: boolean;
}) {
    if (
        !baris.perluPerhatian ||
        baris.indeksPemicu === null ||
        baris.indeksPemicu === 'BB_TB' ||
        baris.kategoriPemicu === null
    ) {
        return null;
    }

    return (
        <span
            className={`mt-1 block text-sm text-tone-amber ${menjorok ? 'pl-5.5' : ''}`}
        >
            Ditandai: {baris.kategoriPemicu} (
            {labelIndeks(baris.indeksPemicu, baris.umurBulan)})
        </span>
    );
}

/**
 * Risiko sejak lahir pada satu baris.
 */
export function Risiko({
    baris,
    menjorok = false,
}: {
    baris: BarisAnak;
    menjorok?: boolean;
}) {
    if (baris.risikoLahir === null) {
        return null;
    }

    return (
        <span
            className={`mt-1 block text-sm text-tone-blue ${menjorok ? 'pl-5.5' : ''}`}
        >
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
