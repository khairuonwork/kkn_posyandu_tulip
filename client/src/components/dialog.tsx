/**
 * Dialog modal asli (<dialog> + showModal): fokus terkurung di dalamnya, Esc
 * menutupnya, dan isi di belakangnya tidak bisa disentuh. Dipasang saat
 * dibutuhkan dan dilepas saat ditutup, sehingga isiannya selalu mulai segar.
 *
 * Kepalanya hijau lembut dengan judul hijau tua, bukan hijau solid, supaya
 * tombol Simpan di kaki tetap yang paling menonjol.
 */

import { CircleAlert, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export default function Dialog({
    judul,
    keterangan,
    lebar,
    ikon: Ikon,
    onTutup,
    berubah = false,
    menyimpan = false,
    galat,
    onTutupGalat,
    onCobaLagi,
    children,
}: {
    judul: string;
    keterangan?: string;
    /** Kelas lebar, mis. `w-[920px]`. */
    lebar: string;
    ikon?: LucideIcon;
    onTutup: () => void;
    berubah?: boolean;
    menyimpan?: boolean;
    galat?: string | null;
    onTutupGalat?: () => void;
    onCobaLagi?: () => void;
    /** Badan dan `KakiDialog`. */
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const idJudul = useId();
    const [konfirmasiTutup, setKonfirmasiTutup] = useState(false);
    const lanjutMengisi = useRef<HTMLButtonElement>(null);
    const fokusSebelumnya = useRef<HTMLElement | null>(null);
    const tombolTutupGalat = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!galat) {
return;
}

        const sebelumnya = document.activeElement as HTMLElement | null;
        tombolTutupGalat.current?.focus();

        return () => {
            requestAnimationFrame(() => {
                if (sebelumnya?.isConnected) {
sebelumnya.focus();
}
            });
        };
    }, [galat]);

    const mintaTutup = () => {
        if (galat) {
            onTutupGalat?.();

            return;
        }

        if (menyimpan) {
            return;
        }

        if (berubah) {
            fokusSebelumnya.current = document.activeElement as HTMLElement;
            setKonfirmasiTutup(true);
        } else {
            onTutup();
        }
    };

    useEffect(() => {
        if (konfirmasiTutup) {
            lanjutMengisi.current?.focus();
        }
    }, [konfirmasiTutup]);

    useEffect(() => {
        ref.current?.showModal();
    }, []);

    return (
        <dialog
            ref={ref}
            aria-labelledby={galat ? `${idJudul}-galat` : idJudul}
            onCancel={(e) => {
                e.preventDefault();

                if (konfirmasiTutup) {
                    setKonfirmasiTutup(false);
                    requestAnimationFrame(() =>
                        fokusSebelumnya.current?.focus(),
                    );
                } else {
                    mintaTutup();
                }
            }}
            onClickCapture={(e) => {
                if ((e.target as Element).closest('[data-tutup-dialog]')) {
                    e.preventDefault();
                    e.stopPropagation();
                    mintaTutup();
                }
            }}
            className={`m-auto max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-0 text-foreground shadow-[0_24px_50px_rgba(15,23,20,0.32)] backdrop:bg-foreground/50 backdrop:backdrop-blur-xs open:flex ${galat ? 'w-[420px]' : lebar}`}
        >
            {galat && (
                <div role="alert" className="state-halaman">
                    <CircleAlert
                        className="size-10 text-tone-red"
                        aria-hidden="true"
                    />
                    <h2 id={`${idJudul}-galat`} className="text-lg font-bold">
                        Perubahan belum tersimpan
                    </h2>
                    <p className="max-w-md text-sm text-muted-foreground">
                        {galat}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Isian tetap ada.
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            className="tombol-kedua"
                            ref={tombolTutupGalat}
                            onClick={onTutupGalat}
                        >
                            Tutup
                        </button>
                        {onCobaLagi && (
                            <button
                                type="button"
                                className="tombol-utama"
                                onClick={onCobaLagi}
                            >
                                Coba simpan lagi
                            </button>
                        )}
                    </div>
                </div>
            )}
            <div
                hidden={!!galat}
                className="shrink-0 border-b border-border bg-accent/70 px-7 py-4"
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                        {Ikon !== undefined && (
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Ikon
                                    className="size-5"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <h2
                                id={idJudul}
                                className="text-xl leading-tight font-extrabold text-[#0b4f31]"
                            >
                                {konfirmasiTutup ? 'Buang perubahan?' : judul}
                            </h2>
                            {!konfirmasiTutup && keterangan !== undefined && (
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    {keterangan}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={mintaTutup}
                        disabled={menyimpan}
                        aria-label="Tutup dialog"
                        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground active:scale-95 disabled:opacity-50"
                    >
                        <X
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    </button>
                </div>
            </div>
            {konfirmasiTutup && (
                <>
                    <p className="px-7 py-5">
                        Perubahan yang belum disimpan akan hilang jika dialog
                        ditutup.
                    </p>
                    <KakiDialog>
                        <button
                            type="button"
                            ref={lanjutMengisi}
                            className="tombol-utama"
                            onClick={() => {
                                setKonfirmasiTutup(false);
                                requestAnimationFrame(() =>
                                    fokusSebelumnya.current?.focus(),
                                );
                            }}
                        >
                            Lanjut mengisi
                        </button>
                        <button
                            type="button"
                            className="tombol-kedua"
                            onClick={onTutup}
                        >
                            Buang perubahan
                        </button>
                    </KakiDialog>
                </>
            )}
            <div className={konfirmasiTutup || galat ? 'hidden' : 'contents'}>
                {children}
            </div>
        </dialog>
    );
}

/** Kaki dialog: tombol di kanan, di atas latar abu muda. */
export function KakiDialog({ children }: { children: ReactNode }) {
    return (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3.5 border-t border-border bg-surface-subtle/80 px-7 py-4">
            {children}
        </div>
    );
}
