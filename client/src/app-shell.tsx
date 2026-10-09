/**
 * Kerangka aplikasi: router, penjaga rute, dan cangkang sidebar.
 *
 * Dipakai bersama aplikasi sungguhan dan demo statis. Keduanya hanya berbeda
 * pada tiga hal — entri, cara masuk, dan perkakas pemilih peran — sehingga
 * apa pun yang terlihat pengguna tidak dapat berbeda antara yang dipresentasikan
 * dan yang dipakai.
 */

import {
    Baby,
    BadgeCheck,
    CreditCard,
    FileText,
    House,
    LogOut,
    Menu as MenuIcon,
    Settings,
    Upload,
    X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ComponentType, ReactNode } from 'react';
import FilterPeriode from '@/components/filter-periode';
import StatusTablet from '@/components/status-tablet';
import { data } from '@/data/contoh/store';
import { tanggalPanjang } from '@/lib/format';
import { Link, useAlamat } from '@/lib/nav';
import type { Peran, Periode } from '@/types/posyandu';

export type Rute =
    | { nama: 'beranda' }
    | { nama: 'balita' }
    | { nama: 'detail'; id: number }
    | { nama: 'riwayat'; id: number }
    | { nama: 'laporan' }
    | { nama: 'sasaran' }
    | { nama: 'kartu-sasaran'; id?: number }
    | { nama: 'pengaturan' }
    | { nama: 'kms' };

/** Router portal, seluruhnya, tanpa pustaka tambahan. */
export function bacaRute(alamat: string): Rute {
    const detail = /^\/balita\/(\d+)$/.exec(alamat);
    const riwayat = /^\/balita\/(\d+)\/riwayat$/.exec(alamat);
    const kartu = /^\/kartu-sasaran\/(\d+)$/.exec(alamat);

    if (detail !== null) {
        return { nama: 'detail', id: Number(detail[1]) };
    }

    if (riwayat !== null) {
        return { nama: 'riwayat', id: Number(riwayat[1]) };
    }

    if (kartu !== null) {
        return { nama: 'kartu-sasaran', id: Number(kartu[1]) };
    }

    switch (alamat) {
        case '/balita':
            return { nama: 'balita' };

        case '/laporan':
            return { nama: 'laporan' };

        case '/sasaran':
            return { nama: 'sasaran' };

        case '/kartu-sasaran':
            return { nama: 'kartu-sasaran' };

        case '/pengaturan':
            return { nama: 'pengaturan' };

        case '/kms':
            return { nama: 'kms' };

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
    if (peran === 'kms') {
        return rute.nama === 'kms' || rute.nama === 'detail' || rute.nama === 'riwayat';
    }

    if (rute.nama === 'kms') {
        return false;
    }

    if (rute.nama === 'pengaturan' || rute.nama === 'kartu-sasaran') {
        return peran !== 'kader';
    }

    if (rute.nama === 'sasaran') {
        return peran === 'admin';
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
    {
        href: '/kartu-sasaran',
        label: 'Kartu Balita',
        ikon: CreditCard,
        peran: ['bidan', 'admin'],
    },
    { href: '/laporan', label: 'Laporan', ikon: FileText, peran: SEMUA },
    {
        href: '/sasaran',
        label: 'Sasaran & Impor',
        ikon: Upload,
        peran: ['admin'],
    },
    {
        href: '/pengaturan',
        label: 'Pengaturan',
        ikon: Settings,
        peran: ['bidan', 'admin'],
    },
    {
        href: '/kms',
        label: 'Pemeriksaan KMS',
        ikon: BadgeCheck,
        peran: ['kms'],
    },
];

type CangkangProps = {
    peran: Peran;
    periodeId: string;
    periode?: Periode[];
    onPindahPeriode: (id: string) => void;
    /** Isi `main`. */
    children: ReactNode;
    /**
     * Kaki sidebar dan laci menu: identitas pengguna dengan tombol Keluar, atau
     * pemilih peran di demo. Dirender dua kali — di sidebar dan di laci —
     * jadi isinya tidak boleh memakai `id`.
     */
    kakiSidebar?: ReactNode;
};

/** Laci menu ditutup sendiri begitu layar melebar melewati ambang sidebar. */
const LEBAR_SIDEBAR = '(min-width: 64rem)';

export function Cangkang({
    peran,
    periodeId,
    periode = data.periode,
    onPindahPeriode,
    children,
    kakiSidebar,
}: CangkangProps) {
    const alamat = useAlamat();
    const laci = useRef<HTMLDialogElement>(null);
    const tanggalKegiatan =
        periode.find((p) => p.id === periodeId)?.tanggalKegiatan ?? null;

    // Tablet yang diputar dari tegak ke mendatar dengan laci terbuka akan
    // menampilkan sidebar dan laci sekaligus.
    useEffect(() => {
        const lebar = window.matchMedia(LEBAR_SIDEBAR);
        const tutup = () => laci.current?.close();

        lebar.addEventListener('change', tutup);

        return () => lebar.removeEventListener('change', tutup);
    }, []);

    const menu = (
        <nav aria-label="Menu utama" className="flex flex-col gap-0.5">
            {/* Butir yang tidak berhak dihapus dari DOM, bukan dinonaktifkan. */}
            {NAV.filter((butir) => butir.peran.includes(peran)).map((butir) => {
                const aktif = alamat.startsWith(butir.href);
                const Ikon = butir.ikon;

                return (
                    <Link
                        key={butir.href}
                        href={butir.href}
                        aria-current={aktif ? 'page' : undefined}
                        // Memilih menu berarti selesai dengan laci, termasuk
                        // saat menu yang dipilih adalah layar yang sedang
                        // terbuka. Di sidebar, `close()` tidak berbuat apa-apa.
                        onClick={() => laci.current?.close()}
                        className={`flex min-h-13 items-center gap-3.5 rounded-lg px-3.5 text-base pendek:pointer-fine:min-h-10 ${
                            aktif
                                ? 'bg-primary font-bold text-primary-foreground'
                                : 'font-medium text-foreground'
                        }`}
                    >
                        <Ikon className="size-5 shrink-0" strokeWidth={2.5} />
                        {butir.label}
                    </Link>
                );
            })}
        </nav>
    );

    return (
        /* Dari 1024 px ke atas cangkangnya setinggi jendela dan dokumennya
           tidak pernah menggulir; yang menggulir `main`. Tanpa ini layar yang
           meminta tinggi penuh (`Halaman penuh`) tidak punya tinggi pasti
           untuk dibagi, dan `flex-1` di dalamnya jatuh ke tinggi isinya. */
        <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row lg:overflow-hidden">
            {/* Di bawah 1024 px sidebar diganti bilah atas: tombol Menu yang
                membuka laci, merek, dan periode. Lacinya menimpa isi, tidak
                mendorongnya. */}
            <div className="sticky top-0 z-20 flex items-center gap-3.5 border-b border-border bg-sidebar px-4 py-2.5 lg:hidden">
                <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => laci.current?.showModal()}
                    className="tombol-kedua shrink-0 px-4 font-bold"
                >
                    <MenuIcon
                        className="size-5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Menu
                </button>

                <div className="hidden min-w-0 flex-1 sm:block">
                    <Merek />
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <label
                        htmlFor="periode-atas"
                        className="text-sm font-semibold text-muted-foreground max-sm:sr-only"
                    >
                        Periode
                    </label>
                    <FilterPeriode
                        id="periode-atas"
                        periode={periode}
                        nilai={periodeId}
                        onGanti={onPindahPeriode}
                        className="w-50"
                    />
                </div>
            </div>

            {/* <dialog> asli: fokus terkurung di dalam laci, Esc menutupnya,
                dan isi di belakangnya tidak bisa disentuh selama terbuka. */}
            <dialog
                ref={laci}
                aria-label="Menu"
                // Ketukan di luar laci jatuh ke <dialog> itu sendiri, karena
                // isinya memenuhi seluruh tinggi dan lebarnya.
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        e.currentTarget.close();
                    }
                }}
                className="fixed inset-y-0 left-0 m-0 h-full max-h-none w-[18rem] max-w-[calc(100vw-3rem)] border-0 border-r border-border bg-sidebar p-0 text-foreground shadow-[12px_0_28px_rgba(22,33,28,0.2)] backdrop:bg-foreground/45"
            >
                <div className="flex h-full flex-col px-3.5 pt-4.5 pb-4.5">
                    <div className="flex items-center justify-between gap-2 pl-2">
                        <Merek />
                        <button
                            type="button"
                            onClick={() => laci.current?.close()}
                            className="tombol-kedua shrink-0 px-3.5"
                        >
                            <X
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Tutup
                        </button>
                    </div>

                    <div className="mt-5.5">{menu}</div>

                    <div className="mt-auto space-y-2.5 pt-4">
                        <StatusTablet />
                        {kakiSidebar !== undefined && kakiSidebar}
                    </div>
                </div>
            </dialog>

            <aside className="hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar px-3.5 pb-4.5 lg:flex pendek:pointer-fine:pb-3">
                {/* Pita merek selebar sidebar, setinggi bilah kepala halaman,
                    supaya garis bawah keduanya menyambung. */}
                <div className="-mx-3.5 flex min-h-[76px] shrink-0 flex-col justify-center border-b border-border bg-accent px-5.5 py-3.5">
                    <p className="text-lg leading-tight font-extrabold text-[#0b4f31]">
                        SIMPATIK Posyandu
                    </p>
                    <p className="mt-0.5 text-sm text-[#2f6b4d]">
                        RW {data.meta.rw} Kelurahan {data.meta.kelurahan}
                    </p>
                </div>

                {/* Periode adalah lingkup seluruh aplikasi, bukan milik satu
                    layar — tempatnya bersama navigasi. */}
                <div className="px-2 pt-4.5 pendek:pointer-fine:pt-3">
                    <label
                        htmlFor="periode-sisi"
                        className="block text-sm font-semibold text-muted-foreground"
                    >
                        Periode
                    </label>
                    <FilterPeriode
                        id="periode-sisi"
                        periode={periode}
                        nilai={periodeId}
                        onGanti={onPindahPeriode}
                        className="mt-1.5"
                    />
                    {tanggalKegiatan !== null && (
                        <p className="mt-1.5 text-sm text-muted-foreground">
                            Data terakhir {tanggalPanjang(tanggalKegiatan)}
                        </p>
                    )}
                </div>

                <div className="mt-5.5 pendek:pointer-fine:mt-3">{menu}</div>

                <div className="mt-auto space-y-2.5 pt-4 pendek:pointer-fine:pt-2.5">
                    <StatusTablet />
                    {kakiSidebar !== undefined && kakiSidebar}
                </div>
            </aside>

            {/* Tanpa jarak tepi sendiri: bilah kepala tiap layar membentang
                penuh sampai tepi, dan `Halaman` yang memberi pinggir pada
                isinya. */}
            <main className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
                {children}
            </main>
        </div>
    );
}

/** "Bidan Posyandu Tulip" menjadi "BP"; nama satu kata cukup satu huruf. */
function inisial(nama: string): string {
    const kata = nama.trim().split(/\s+/).filter(Boolean);

    return (kata[0]?.[0] ?? '?') + (kata[1]?.[0] ?? '');
}

/**
 * Kartu akun di kaki sidebar: inisial, nama dan peran, lalu tombol Keluar.
 *
 * Keluar berupa ikon saja, dengan label untuk pembaca layar dan tooltip saat
 * disorot, supaya nama mendapat ruang di sidebar selebar 224 px. Nama yang
 * tetap terlalu panjang dipotong dengan "…"; nama lengkapnya muncul saat
 * disorot. Warnanya mengikuti pita merek di puncak sidebar, jadi keduanya
 * membingkai menu.
 */
export function KartuAkun({
    nama,
    peran,
    onKeluar,
}: {
    nama: string;
    /** Teks peran, atau di demo: kotak pilihan peran. */
    peran: ReactNode;
    onKeluar: () => void;
}) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl bg-accent px-3 py-2.5">
            <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground uppercase"
            >
                {inisial(nama)}
            </span>
            <div className="min-w-0 flex-1">
                <p
                    title={nama}
                    className="truncate text-base leading-tight font-bold text-[#0b4f31]"
                >
                    {nama}
                </p>
                <div className="mt-0.5 truncate text-sm text-[#2f6b4d]">
                    {peran}
                </div>
            </div>
            {/* Setinggi sasaran sentuh di layar sentuh, ringkas bila memakai
                tetikus. */}
            <button
                type="button"
                onClick={onKeluar}
                aria-label="Keluar"
                title="Keluar"
                className="flex size-13 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-card text-[#0b4f31] hover:bg-surface pointer-fine:size-9"
            >
                <LogOut
                    className="size-4.5"
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
            </button>
        </div>
    );
}

/** Merek polos untuk bilah atas dan laci; sidebar memakai versi berpita. */
function Merek() {
    return (
        <div className="min-w-0">
            <p className="truncate text-lg leading-tight font-extrabold">
                SIMPATIK Posyandu
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
                RW {data.meta.rw} Kelurahan {data.meta.kelurahan}
            </p>
        </div>
    );
}
