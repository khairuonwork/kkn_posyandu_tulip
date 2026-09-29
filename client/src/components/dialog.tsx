/**
 * Dialog modal asli (<dialog> + showModal): fokus terkurung di dalamnya, Esc
 * menutupnya, dan isi di belakangnya tidak bisa disentuh. Dipasang saat
 * dibutuhkan dan dilepas saat ditutup, sehingga isiannya selalu mulai segar.
 *
 * Kepalanya hijau lembut dengan judul hijau tua, bukan hijau solid, supaya
 * tombol Simpan di kaki tetap yang paling menonjol.
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export default function Dialog({
    judul,
    keterangan,
    lebar,
    onTutup,
    children,
}: {
    judul: string;
    keterangan?: string;
    /** Kelas lebar, mis. `w-[920px]`. */
    lebar: string;
    onTutup: () => void;
    /** Badan dan `KakiDialog`. */
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        ref.current?.showModal();
    }, []);

    return (
        <dialog
            ref={ref}
            aria-labelledby="judul-dialog"
            onClose={onTutup}
            className={`m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border-0 bg-card p-0 text-foreground shadow-[0_24px_48px_rgba(22,33,28,0.28)] backdrop:bg-foreground/45 open:flex ${lebar}`}
        >
            <div className="shrink-0 border-b border-border bg-accent px-7 pt-3.5 pb-3">
                <h2
                    id="judul-dialog"
                    className="text-xl leading-tight font-extrabold text-[#0b4f31]"
                >
                    {judul}
                </h2>
                {keterangan !== undefined && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {keterangan}
                    </p>
                )}
            </div>
            {children}
        </dialog>
    );
}

/** Kaki dialog: tombol di kanan, di atas latar abu muda. */
export function KakiDialog({ children }: { children: ReactNode }) {
    return (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3.5 border-t border-border bg-surface px-7 py-3.5">
            {children}
        </div>
    );
}
