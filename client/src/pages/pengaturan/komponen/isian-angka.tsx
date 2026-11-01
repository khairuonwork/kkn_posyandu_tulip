import type { ReactNode } from 'react';
import { angka } from '@/lib/format';
import { ANGKA, keAngka } from '../tipe';
import type { Ambang } from '../tipe';

export function IsiGulir({ children }: { children: ReactNode }) {
    return (
        <div
            tabIndex={0}
            aria-label="Isi pengaturan"
            className="gulir-dalam lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
        >
            {children}
        </div>
    );
}

/**
 * Satu kotak angka bersatuan. Angka yang sudah diubah berbingkai biru dengan
 * nilai lamanya di bawah; yang tidak terbaca sebagai angka berbingkai merah.
 */
export function IsianAngka({
    kunci,
    teks,
    ambang,
    onGanti,
    salah = false,
    berlabel = false,
    sempit = false,
}: {
    kunci: keyof Ambang;
    teks: Record<keyof Ambang, string>;
    ambang: Ambang;
    onGanti: (k: keyof Ambang, v: string) => void;
    /** Bagian dari pasangan rentang yang maksimalnya tidak lebih besar. */
    salah?: boolean;
    /** Label tampil di atas kotak; tanpa ini label hanya dibacakan. */
    berlabel?: boolean;
    sempit?: boolean;
}) {
    const { label, satuan, desimal } = ANGKA[kunci];
    const n = keAngka(teks[kunci]);
    const rusak = n === null;
    const berubah =
        !rusak && angka(n, desimal) !== angka(ambang[kunci], desimal);
    const id = `atur-${kunci}`;

    return (
        <div className={sempit ? 'w-52' : ''}>
            {berlabel && (
                <label
                    htmlFor={id}
                    className="mb-1.5 block text-sm font-semibold text-muted-foreground"
                >
                    {label}
                </label>
            )}
            <div
                className={`isian flex overflow-hidden p-0 ${
                    rusak || salah
                        ? 'border-tone-red'
                        : berubah
                          ? 'border-tone-blue bg-card'
                          : ''
                }`}
            >
                <input
                    id={id}
                    aria-label={berlabel ? undefined : label}
                    aria-invalid={rusak || salah}
                    inputMode="decimal"
                    value={teks[kunci]}
                    onChange={(e) => onGanti(kunci, e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-2.5 text-right font-bold outline-none"
                />
                <span className="flex w-14 shrink-0 items-center justify-center border-l-2 border-border bg-surface-alt text-sm text-muted-foreground">
                    {satuan}
                </span>
            </div>
            {rusak ? (
                <p className="mt-1 text-sm font-semibold text-tone-red">
                    Isi dengan angka.
                </p>
            ) : (
                berubah && (
                    <p className="mt-1 text-sm font-semibold text-tone-blue">
                        Diubah dari {angka(ambang[kunci], desimal)} {satuan}
                    </p>
                )
            )}
        </div>
    );
}
