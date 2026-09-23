/**
 * Kerangka aplikasi: router, penjaga rute, dan cangkang sidebar.
 *
 * Dipakai bersama aplikasi sungguhan dan demo statis. Keduanya hanya berbeda
 * pada tiga hal — entri, cara masuk, dan perkakas pemilih peran — sehingga
 * apa pun yang terlihat pengguna tidak dapat berbeda antara yang dipresentasikan
 * dan yang dipakai.
 */

import { Baby, FileText, House, Settings } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import FilterPeriode from '@/components/filter-periode';
import { data } from '@/data/contoh/store';
import { Link, useAlamat } from '@/lib/nav';
import type { Peran } from '@/types/posyandu';

export type Rute =
    | { nama: 'beranda' }
    | { nama: 'balita' }
    | { nama: 'detail'; id: number }
    | { nama: 'laporan' }
    | { nama: 'pengaturan' };

/** Router, seluruhnya. Tanpa pustaka: lima alamat dan satu parameter. */
export function bacaRute(alamat: string): Rute {
    const detail = /^\/balita\/(\d+)$/.exec(alamat);

    if (detail !== null) {
        return { nama: 'detail', id: Number(detail[1]) };
    }

    switch (alamat) {
        case '/balita':
            return { nama: 'balita' };

        case '/laporan':
            return { nama: 'laporan' };

        case '/pengaturan':
            return { nama: 'pengaturan' };

        default:
            return { nama: 'beranda' };
    }
}

/**
 * Layar mana yang boleh dibuka peran ini.
 *
 * Ini **tampilan, bukan pengamanan**. Penegakan yang mengikat ada di server,
 * pada `wajibBoleh()` — menyembunyikan menu hanya membuat antarmuka jujur
 * tentang apa yang bisa dilakukan, bukan mencegah siapa pun melakukannya.
 */
export function boleh(rute: Rute, peran: Peran): boolean {
    if (rute.nama === 'pengaturan') {
        return peran !== 'kader';
    }

    return true;
}

type ButirNav = {
    href: string;
    label: string;
    ikon: ComponentType<{ className?: string; strokeWidth?: number }>;
    peran: Peran[];
};

const SEMUA: Peran[] = ['kader', 'bidan', 'admin'];

const NAV: ButirNav[] = [
    { href: '/beranda', label: 'Beranda', ikon: House, peran: SEMUA },
    { href: '/balita', label: 'Data Balita', ikon: Baby, peran: SEMUA },
    { href: '/laporan', label: 'Laporan', ikon: FileText, peran: SEMUA },
    {
        href: '/pengaturan',
        label: 'Pengaturan',
        ikon: Settings,
        peran: ['bidan', 'admin'],
    },
];

type CangkangProps = {
    peran: Peran;
    periodeId: string;
    onPindahPeriode: (id: string) => void;
    /** Isi `main`. */
    children: ReactNode;
    /**
     * Perkakas khusus demo — pemilih peran. Aplikasi sungguhan mengisinya
     * dengan identitas pengguna dan tombol keluar.
     */
    kakiSidebar?: ReactNode;
    /** Versi ponsel dari `kakiSidebar`, turun ke kaki halaman. */
    kakiHalaman?: ReactNode;
};

export function Cangkang({
    peran,
    periodeId,
    onPindahPeriode,
    children,
    kakiSidebar,
    kakiHalaman,
}: CangkangProps) {
    const alamat = useAlamat();

    return (
        /* Dari 1024 px ke atas cangkangnya setinggi jendela dan dokumennya
           tidak pernah menggulir; yang menggulir `main`. Tanpa ini layar yang
           meminta tinggi penuh (`Halaman penuh`) tidak punya tinggi pasti
           untuk dibagi, dan `flex-1` di dalamnya jatuh ke tinggi isinya. */
        <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
            {/* Di bawah 1024 px bilah ini menempel di atas layar sebagai dua
                baris ringkas — merek dengan periode, lalu menu mendatar. */}
            <aside className="sticky top-0 z-20 flex w-full shrink-0 flex-col border-b border-border bg-sidebar lg:h-screen lg:w-64 lg:overflow-y-auto lg:border-r lg:border-b-0">
                <div className="flex items-center justify-between gap-4 px-4 py-3 lg:block lg:px-5 lg:py-4">
                    <div className="min-w-0">
                        <p className="truncate text-base font-extrabold">
                            Portal Posyandu Tulip
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            RW {data.meta.rw} Kelurahan {data.meta.kelurahan}
                        </p>
                    </div>

                    {/* Periode adalah lingkup seluruh aplikasi, bukan milik satu
                        layar — tempatnya bersama navigasi. */}
                    <div className="shrink-0 lg:mt-3">
                        <FilterPeriode
                            periode={data.periode}
                            nilai={periodeId}
                            onGanti={onPindahPeriode}
                        />
                    </div>
                </div>

                {/* Membungkus, bukan menggulir mendatar. Dengan empat butir di
                    layar 375 px, `overflow-x-auto` menyembunyikan Pengaturan
                    di luar tepi layar — persis "gerakan tersembunyi" yang
                    dilarang prinsip P1. Dua baris menampilkan semuanya. */}
                <nav className="flex flex-wrap gap-0.5 px-3 pb-2 lg:flex-col lg:pb-0">
                    {/* Butir yang tidak berhak dihapus dari DOM, bukan dinonaktifkan. */}
                    {NAV.filter((butir) => butir.peran.includes(peran)).map(
                        (butir) => {
                            const aktif = alamat.startsWith(butir.href);
                            const Ikon = butir.ikon;

                            return (
                                <Link
                                    key={butir.href}
                                    href={butir.href}
                                    aria-current={aktif ? 'page' : undefined}
                                    className={`flex min-h-13 shrink-0 items-center gap-2 rounded-lg px-3.5 text-base lg:gap-3 ${
                                        aktif
                                            ? 'bg-primary font-bold text-primary-foreground'
                                            : 'text-foreground'
                                    }`}
                                >
                                    <Ikon
                                        className="size-5 shrink-0"
                                        strokeWidth={2.5}
                                    />
                                    {butir.label}
                                </Link>
                            );
                        },
                    )}
                </nav>

                {kakiSidebar !== undefined && (
                    <div className="hidden lg:mt-auto lg:block">
                        {kakiSidebar}
                    </div>
                )}
            </aside>

            <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
                {/* Tanpa jarak tepi sendiri: bilah kepala tiap layar membentang
                    penuh sampai tepi, dan `Halaman` yang memberi pinggir pada
                    isinya. */}
                <main className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
                    {children}
                </main>

                {kakiHalaman !== undefined && (
                    <div className="border-t border-border bg-sidebar lg:hidden">
                        {kakiHalaman}
                    </div>
                )}
            </div>
        </div>
    );
}
