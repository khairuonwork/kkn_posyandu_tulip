/**
 * Kerangka satu layar — Prototipe v2.
 *
 * v2 memberi keenam layar bilah kepala yang sama: petak ikon 52 px, judul, satu
 * baris keterangan, lalu aksi di kanan. Sebelumnya tiap halaman membuka dengan
 * `<h1>` telanjang dan menyalin susunan yang sama enam kali.
 *
 * Komponen ini juga memegang jarak tepi isi halaman, sehingga bilah kepala bisa
 * membentang penuh sampai tepi sementara isinya tetap punya pinggir — dua hal
 * yang tidak mungkin dipenuhi satu `padding` di `<main>`.
 */

import { ArrowLeft } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { Head, Link } from '@/lib/nav';

type Ikon = ComponentType<{ className?: string; strokeWidth?: number }>;

type Props = {
    /** Judul layar. Juga dipakai sebagai judul tab peramban. */
    judul: string;
    /** Satu baris konteks: periode, jumlah, atau peringatan data contoh. */
    subjudul?: ReactNode;
    ikon?: Ikon;
    /**
     * Layar detail menukar petak ikon dengan jalan kembali. Labelnya ditulis
     * lengkap, bukan panah sendirian — prinsip P1, tidak ada ikon tanpa teks.
     */
    kembali?: { href: string; label: string };
    /** Tombol di ujung kanan bilah. */
    aksi?: ReactNode;
    children: ReactNode;
};

export default function Halaman({
    judul,
    subjudul,
    ikon: Ikon,
    kembali,
    aksi,
    children,
}: Props) {
    return (
        <>
            <Head title={judul} />

            {/* Menempel hanya di layar lebar. Di bawah 1024 px sidebar demo
                sudah menempel di puncak layar; dua bilah lengket di koordinat
                yang sama akan saling menimpa. */}
            <header className="z-10 flex min-h-19 flex-wrap items-center gap-x-5 gap-y-3 border-b border-border bg-card px-4 py-3.5 sm:px-7 lg:sticky lg:top-0">
                {kembali !== undefined ? (
                    <Link
                        href={kembali.href}
                        className="inline-flex min-h-13 shrink-0 items-center gap-2 rounded-lg pr-3 text-base font-semibold text-primary"
                    >
                        <ArrowLeft
                            className="size-5 shrink-0"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        {kembali.label}
                    </Link>
                ) : (
                    Ikon !== undefined && (
                        <span
                            aria-hidden="true"
                            className="flex size-13 shrink-0 items-center justify-center rounded-lg bg-accent"
                        >
                            <Ikon
                                className="size-7 text-primary"
                                strokeWidth={2.5}
                            />
                        </span>
                    )
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    <h1 className="text-2xl leading-tight font-extrabold tracking-tight">
                        {judul}
                    </h1>
                    {subjudul !== undefined && (
                        <p className="text-sm text-pretty text-muted-foreground">
                            {subjudul}
                        </p>
                    )}
                </div>

                {aksi !== undefined && (
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                        {aksi}
                    </div>
                )}
            </header>

            <div className="px-4 py-6 sm:px-7 sm:py-7">{children}</div>
        </>
    );
}
