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

/* Ditulis utuh, bukan dirakit dari potongan: Tailwind hanya menghasilkan kelas
   yang terbaca sebagai teks lengkap di dalam berkas sumber. */
const KELAS_PENUH = {
    lg: 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:py-4',
    xl: 'xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:py-4',
} as const;

type Props = {
    /** Judul layar. Juga dipakai sebagai judul tab peramban. */
    judul: string;
    /** Satu baris konteks: periode, jumlah, atau peringatan data contoh. */
    subjudul?: ReactNode;
    ikon?: Ikon;
    /**
     * Layar detail menukar petak ikon dengan tombol kembali berpanah. Tujuannya
     * dibacakan dan muncul saat disorot: "Kembali ke Data Balita". Dengan
     * `teks`, kalimat itu ditulis di samping panahnya.
     */
    kembali?: { href: string; label: string; teks?: boolean };
    /** Tombol di ujung kanan bilah. */
    aksi?: ReactNode;
    /**
     * Kabar keadaan di bilah kepala, mis. hasil ukur yang belum terkirim.
     * Di layar lebar duduk di kanan seperti aksi; di bawah 1024 px turun ke
     * barisnya sendiri selebar bilah.
     */
    pita?: ReactNode;
    /**
     * Layar yang mengisi tinggi jendela persis, tanpa menggulir halaman.
     *
     * Isinya menjadi kolom lentur setinggi sisa layar; bagian di dalamnya yang
     * diberi `flex-1 min-h-0` yang menyerap sisa ruang dan menggulir sendiri.
     * Di bawah ambangnya halaman menggulir seperti biasa — di layar sempit
     * tidak ada tinggi tetap yang bisa dibagi.
     *
     * Ambangnya dipilih per layar karena isinya berbeda watak. `lg` (1024 px)
     * untuk layar tabel: menyempitkan kolom tabel hanya menambah gulir mendatar
     * di dalam wadahnya sendiri. `xl` (1280 px) untuk Detail Balita: kolom
     * kurva selebar 634 px ditambah kolom Status dan Riwayat baru muat
     * berdampingan mulai lebar itu — tepat lebar Galaxy Tab A11+ mendatar.
     */
    penuh?: false | 'lg' | 'xl';
    children: ReactNode;
};

export default function Halaman({
    judul,
    subjudul,
    ikon: Ikon,
    kembali,
    aksi,
    pita,
    penuh = false,
    children,
}: Props) {
    return (
        <>
            <Head title={judul} />

            {/* Menempel hanya di layar lebar. Di bawah 1024 px bilah atas
                cangkang sudah menempel di puncak layar; dua bilah lengket di
                koordinat yang sama akan saling menimpa.

                Tinggi minimal 76 px sama dengan pita merek di sidebar, supaya
                garis bawah keduanya menyambung menjadi satu garis. Bantalan
                tegaknya tipis supaya pita Beranda pun muat di 76 px itu. */}
            <header className="z-10 flex min-h-[76px] shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-b border-border bg-card px-4 py-2 sm:px-7 lg:sticky lg:top-0">
                {kembali?.teks === true ? (
                    <Link
                        href={kembali.href}
                        className="inline-flex min-h-13 shrink-0 items-center gap-2 rounded-lg pr-3.5 pl-1 text-base font-bold text-primary"
                    >
                        <ArrowLeft
                            className="size-5.5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Kembali ke {kembali.label}
                    </Link>
                ) : kembali !== undefined ? (
                    <Link
                        href={kembali.href}
                        aria-label={`Kembali ke ${kembali.label}`}
                        title={`Kembali ke ${kembali.label}`}
                        className="flex size-13 shrink-0 items-center justify-center rounded-lg border border-border text-primary"
                    >
                        <ArrowLeft
                            className="size-5.5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
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

                {/* `min-w-60`, bukan `min-w-0`: dengan `min-w-0` tombol aksi
                    tidak pernah turun baris, dan subjudulnya yang terjepit
                    jadi tiga-empat baris selebar satu kata (Kartu Sasaran di
                    tablet, Data Balita di ponsel). Di bawah 210 px, tombolnya
                    yang mengalah ke baris berikutnya. */}
                <div className="flex min-w-60 flex-1 flex-col">
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
                    <div className="flex max-w-full shrink-0 flex-wrap items-center gap-3">
                        {aksi}
                    </div>
                )}

                {pita !== undefined && (
                    <div className="w-full lg:w-auto">{pita}</div>
                )}
            </header>

            <div
                className={`px-4 py-6 sm:px-7 sm:py-7 ${
                    penuh === false ? '' : KELAS_PENUH[penuh]
                }`}
            >
                {children}
            </div>
        </>
    );
}
