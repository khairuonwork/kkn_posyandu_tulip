/**
 * Pemilih periode di sidebar dan di bilah atas tablet tegak.
 *
 * Daftar pilihannya buatan sendiri (pola combobox + listbox), bukan <select>
 * asli: daftar <select> asli tingginya ditentukan peramban dan bisa menutup
 * seluruh menu sidebar bila periodenya banyak. Di sini tingginya dibatasi dan
 * digulir. Papan tombol tetap lengkap: panah/Home/End berpindah, Enter atau
 * Spasi memilih, Esc menutup.
 *
 * Daftar memakai `position: fixed` karena sidebar `overflow-y-auto` akan
 * memotong daftar yang menjorok keluar.
 *
 * Labelnya ditulis pemanggil. Letaknya berbeda di tiap tempat — di atas kotak
 * pada sidebar, di sebelah kiri pada bilah atas — dan `id` yang berbeda wajib:
 * keduanya ada di DOM sekaligus, satu tersembunyi menurut lebar layar.
 */

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Periode } from '@/types/posyandu';

type Props = {
    id: string;
    periode: Periode[];
    nilai: string;
    onGanti: (id: string) => void;
    className?: string;
};

/** Enam baris penuh (40 px) dan separuh baris ketujuh, supaya jelas bisa digulir. */
const TINGGI_MAKS = 260;

export default function FilterPeriode({
    id,
    periode,
    nilai,
    onGanti,
    className = '',
}: Props) {
    const [buka, setBuka] = useState(false);
    const [aktif, setAktif] = useState(0);
    const [letak, setLetak] = useState({
        top: 0,
        left: 0,
        width: 0,
        tinggi: 0,
    });
    const kotak = useRef<HTMLDivElement>(null);
    const tombol = useRef<HTMLButtonElement>(null);
    const daftar = useRef<HTMLUListElement>(null);
    const terpilih = Math.max(
        0,
        periode.findIndex((p) => p.id === nilai),
    );

    const bukaDaftar = () => {
        const r = tombol.current?.getBoundingClientRect();

        if (r === undefined) {
            return;
        }

        setLetak({
            top: r.bottom + 4,
            left: r.left,
            width: r.width,
            tinggi: Math.min(TINGGI_MAKS, window.innerHeight - r.bottom - 16),
        });
        setAktif(terpilih);
        setBuka(true);
    };

    const pilih = (indeks: number) => {
        const p = periode[indeks];

        setBuka(false);
        tombol.current?.focus();

        if (p !== undefined && p.id !== nilai) {
            onGanti(p.id);
        }
    };

    useEffect(() => {
        if (!buka) {
            return;
        }

        const tutup = (e: Event) => {
            if (!kotak.current?.contains(e.target as Node)) {
                setBuka(false);
            }
        };
        const tutupSaja = () => setBuka(false);

        document.addEventListener('pointerdown', tutup);
        window.addEventListener('resize', tutupSaja);

        return () => {
            document.removeEventListener('pointerdown', tutup);
            window.removeEventListener('resize', tutupSaja);
        };
    }, [buka]);

    // Baris aktif selalu terlihat, termasuk saat daftar baru dibuka.
    useEffect(() => {
        if (buka) {
            daftar.current?.children[aktif]?.scrollIntoView({
                block: 'nearest',
            });
        }
    }, [buka, aktif]);

    const tekan = (e: KeyboardEvent) => {
        const akhir = periode.length - 1;

        if (!buka) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                bukaDaftar();
            }

            return;
        }

        const pindah: Record<string, number> = {
            ArrowDown: Math.min(aktif + 1, akhir),
            ArrowUp: Math.max(aktif - 1, 0),
            Home: 0,
            End: akhir,
        };

        if (e.key in pindah) {
            e.preventDefault();
            setAktif(pindah[e.key]);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pilih(aktif);
        } else if (e.key === 'Escape' || e.key === 'Tab') {
            if (e.key === 'Escape') {
                e.preventDefault();
            }

            setBuka(false);
        }
    };

    return (
        <div ref={kotak} className={`relative ${className}`}>
            <button
                ref={tombol}
                id={id}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={buka}
                aria-controls={`${id}-daftar`}
                aria-activedescendant={buka ? `${id}-${aktif}` : undefined}
                onClick={() => (buka ? setBuka(false) : bukaDaftar())}
                onKeyDown={tekan}
                className="h-14 w-full cursor-pointer rounded-lg border-2 border-border-strong bg-card pr-11 pl-4 text-left text-base font-semibold"
            >
                {periode[terpilih]?.label}
            </button>
            <ChevronDown
                className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2.5}
                aria-hidden="true"
            />
            {buka && (
                <ul
                    ref={daftar}
                    id={`${id}-daftar`}
                    role="listbox"
                    aria-labelledby={id}
                    style={{
                        top: letak.top,
                        left: letak.left,
                        width: letak.width,
                        maxHeight: letak.tinggi,
                    }}
                    className="fixed z-50 overflow-y-auto rounded-lg border-2 border-border-strong bg-card py-1 shadow-[0_8px_18px_rgba(22,33,28,0.18)]"
                >
                    {periode.map((p, i) => (
                        <li
                            key={p.id}
                            id={`${id}-${i}`}
                            role="option"
                            aria-selected={p.id === nilai}
                            // pointerdown, bukan click: fokus tetap di tombol.
                            onPointerDown={(e) => e.preventDefault()}
                            onClick={() => pilih(i)}
                            onPointerMove={() => setAktif(i)}
                            className={`flex h-10 cursor-pointer items-center justify-between gap-2 px-4 text-base ${
                                i === aktif ? 'bg-accent' : ''
                            } ${p.id === nilai ? 'font-bold text-primary' : ''}`}
                        >
                            {p.label}
                            {p.id === nilai && (
                                <Check
                                    className="size-4 shrink-0"
                                    strokeWidth={3}
                                    aria-hidden="true"
                                />
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
