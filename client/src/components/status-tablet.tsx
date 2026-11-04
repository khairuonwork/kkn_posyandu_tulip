import { Monitor, Tablet, RefreshCw, Search, X } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type Status = 'online' | 'idle' | 'offline';
interface Perangkat {
    id: string;
    deviceId: string;
    namaPerangkat: string;
    jenisPerangkat: 'android' | 'web';
    versiAplikasi: string | null;
    namaPengguna: string;
    username: string;
    namaPosyandu: string | null;
    rw: string | null;
    posyanduId: number | null;
    terakhirAktif: string;
    detikLalu: number;
    status: Status;
    modeKoneksi: string;
    antreanTertunda: number;
    akunAktif: boolean;
}
interface Respons {
    daftarTablet: Perangkat[];
    cakupan: {
        semuaPosyandu: boolean;
        posyandu: { id: number; nama: string; rw: string | null }[];
    };
    waktuServer: string;
}
const LABEL: Record<Status, string> = {
    online: 'Online',
    idle: 'Siaga',
    offline: 'Offline',
};
const WARNA: Record<Status, string> = {
    online: 'bg-tone-green-bg text-tone-green',
    idle: 'bg-tone-amber-bg text-tone-amber',
    offline: 'bg-muted text-muted-foreground',
};
const waktu = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });

export default function StatusTablet() {
    const [data, setData] = useState<Respons | null>(null);
    const [buka, setBuka] = useState(false);
    const [menutup, setMenutup] = useState(false);
    const [membaca, setMembaca] = useState(true);
    const [gagal, setGagal] = useState(false);
    const [cari, setCari] = useState('');
    const [filter, setFilter] = useState('semua');
    const [posisi, setPosisi] = useState<CSSProperties | null>(null);
    const tombol = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDialogElement | null>(null);
    const pasangPanel = useCallback((node: HTMLDialogElement | null) => {
        if (!node) {
            panel.current?.close();
        }

        panel.current = node;

        if (node && !node.open) {
            node.showModal();
            node.focus();
        }
    }, []);
    const hidup = useRef(false);
    const permintaan = useRef<AbortController | null>(null);
    const id = useId();
    useEffect(() => {
        if (!menutup) {
            return;
        }

        const timer = window.setTimeout(
            () => {
                setBuka(false);
                setMenutup(false);
            },
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 0
                : 210,
        );

        return () => window.clearTimeout(timer);
    }, [menutup]);

    const ambil = useCallback(async () => {
        if (permintaan.current) {
            return;
        }

        const kontrol = new AbortController();
        permintaan.current = kontrol;
        const batas = setTimeout(() => kontrol.abort(), 5000);

        try {
            const res = await fetch('/api/v1/perangkat-terhubung', {
                cache: 'no-store',
                signal: kontrol.signal,
            });

            if (!res.ok) {
                throw Error('Status belum tersedia');
            }

            const hasil = (await res.json()) as Respons;

            if (!hasil.cakupan || !Array.isArray(hasil.daftarTablet)) {
                throw Error('Server perangkat perlu diperbarui');
            }

            if (hidup.current && permintaan.current === kontrol) {
                setData(hasil);
                setGagal(false);
            }
        } catch {
            if (hidup.current && permintaan.current === kontrol) {
                setGagal(true);
            }
        } finally {
            clearTimeout(batas);

            if (permintaan.current === kontrol) {
                permintaan.current = null;

                if (hidup.current) {
                    setMembaca(false);
                }
            }
        }
    }, []);
    useEffect(() => {
        hidup.current = true;
        const awal = setTimeout(() => void ambil(), 0);
        const timer = setInterval(() => void ambil(), 6000);

        return () => {
            hidup.current = false;
            clearTimeout(awal);
            clearInterval(timer);
            permintaan.current?.abort();
            permintaan.current = null;
        };
    }, [ambil]);
    useLayoutEffect(() => {
        if (!buka) {
            return;
        }

        const atur = () => {
            const rect = tombol.current?.getBoundingClientRect();

            if (!rect) {
                return;
            }

            const lebar = Math.min(460, innerWidth - 24);
            const atas = rect.top - 20;
            const tinggi = window.visualViewport?.height ?? innerHeight;
            setPosisi({
                inset: 'auto',
                margin: 0,
                width: lebar,
                left: Math.max(
                    12,
                    Math.min(rect.left, innerWidth - lebar - 12),
                ),
                ...(innerWidth >= 640 && atas > 260
                    ? {
                          bottom: innerHeight - rect.top + 8,
                          maxHeight: Math.min(600, atas, tinggi - 24),
                      }
                    : { top: 12, maxHeight: tinggi - 24 }),
            });
        };
        atur();
        window.addEventListener('resize', atur);
        window.visualViewport?.addEventListener('resize', atur);

        return () => {
            window.removeEventListener('resize', atur);
            window.visualViewport?.removeEventListener('resize', atur);
        };
    }, [buka]);
    useEffect(() => {
        if (!buka) {
            return;
        }

        panel.current?.focus();
        const kembali = tombol.current;

        return () => {
            kembali?.focus();
        };
    }, [buka]);

    const daftar = data?.daftarTablet ?? [];
    const online = daftar.filter((p) => p.status === 'online').length;
    const offline = daftar.filter((p) => p.status === 'offline').length;
    const cakupan = data?.cakupan?.semuaPosyandu
        ? 'Semua Posyandu'
        : data?.cakupan?.posyandu
              .map((p) => `${p.nama} · RW ${p.rw ?? '—'}`)
              .join(', ') || 'Wilayah sesuai akun';
    const hasil = daftar.filter(
        (p) =>
            (filter === 'semua' || p.status === filter) &&
            `${p.namaPerangkat} ${p.namaPengguna} ${p.username} ${p.rw ?? ''} ${p.namaPosyandu ?? ''}`
                .toLocaleLowerCase('id')
                .includes(cari.toLocaleLowerCase('id')),
    );

    return (
        <div className="relative">
            <button
                ref={tombol}
                type="button"
                onClick={() => (buka ? setMenutup(true) : setBuka(true))}
                aria-expanded={buka}
                aria-haspopup="dialog"
                aria-controls={buka ? id : undefined}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-primary"
            >
                <Tablet
                    className="size-5 shrink-0 text-primary"
                    aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">
                        {gagal
                            ? 'Status belum diperbarui'
                            : data
                              ? `${online} online · ${offline} offline`
                              : 'Memeriksa perangkat…'}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                        {cakupan}
                    </span>
                </span>
            </button>
            {buka &&
                posisi &&
                createPortal(
                    <>
                        <dialog
                            ref={pasangPanel}
                            id={id}
                            role="dialog"
                            onCancel={(event) => {
                                event.preventDefault();
                                setMenutup(true);
                            }}
                            onClick={(e) => {
                                if (e.target !== e.currentTarget) {
                                    return;
                                }

                                const r =
                                    e.currentTarget.getBoundingClientRect();

                                if (
                                    e.clientX < r.left ||
                                    e.clientX > r.right ||
                                    e.clientY < r.top ||
                                    e.clientY > r.bottom
                                ) {
                                    setMenutup(true);
                                }
                            }}
                            aria-labelledby={`${id}-judul`}
                            tabIndex={-1}
                            style={posisi}
                            className={`fixed z-[61] flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-popover text-popover-foreground shadow-[0_24px_48px_rgba(15,23,20,0.28)] outline-none backdrop:bg-foreground/20 backdrop:backdrop-blur-xs ${menutup ? 'perangkat-keluar' : 'perangkat-masuk'}`}
                        >
                            <div className="flex shrink-0 items-center gap-3 border-b border-border bg-accent/40 px-5 py-3.5">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Tablet
                                        className="size-4.5"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2
                                        id={`${id}-judul`}
                                        className="text-base font-extrabold text-[#0b4f31]"
                                    >
                                        Status perangkat
                                    </h2>
                                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                                        {cakupan}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Segarkan status perangkat"
                                    disabled={membaca}
                                    onClick={() => {
                                        setMembaca(true);
                                        void ambil();
                                    }}
                                    className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                                >
                                    <RefreshCw
                                        className={`size-5 ${membaca ? 'animate-spin motion-reduce:animate-none' : ''}`}
                                    />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Tutup detail perangkat"
                                    onClick={() => setMenutup(true)}
                                    className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                            <div className="shrink-0 space-y-3 border-b border-border p-4">
                                <label className="flex min-h-11 items-center gap-2 rounded-lg border border-input px-3">
                                    <Search className="size-4 shrink-0 text-muted-foreground" />
                                    <input
                                        aria-label="Cari nama perangkat, akun atau RW"
                                        value={cari}
                                        onChange={(e) =>
                                            setCari(e.target.value)
                                        }
                                        placeholder="Cari perangkat, akun, atau RW"
                                        className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none"
                                    />
                                </label>
                                <label className="flex items-center justify-between gap-3 text-sm font-semibold">
                                    Tampilkan
                                    <select
                                        aria-label="Filter status perangkat"
                                        value={filter}
                                        onChange={(e) =>
                                            setFilter(e.target.value)
                                        }
                                        className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm font-normal"
                                    >
                                        <option value="semua">
                                            Semua ({daftar.length})
                                        </option>
                                        <option value="online">Online</option>
                                        <option value="idle">Siaga</option>
                                        <option value="offline">Offline</option>
                                    </select>
                                </label>
                                {gagal && (
                                    <p
                                        role="status"
                                        className="text-sm text-amber-950"
                                    >
                                        Server belum dapat dijangkau. Daftar ini
                                        adalah laporan terakhir, bukan status
                                        terkini.
                                    </p>
                                )}
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                {hasil.length === 0 ? (
                                    <p className="p-5 text-sm text-muted-foreground">
                                        {data === null && membaca
                                            ? 'Memuat laporan perangkat…'
                                            : daftar.length === 0
                                              ? 'Belum ada perangkat yang melapor untuk wilayah akun ini. Perangkat akan muncul setelah login dan berhasil mengirim laporan ke server.'
                                              : 'Tidak ada perangkat yang sesuai pencarian atau filter.'}
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-border">
                                        {hasil.map((p) => {
                                            const Ikon =
                                                p.jenisPerangkat === 'web'
                                                    ? Monitor
                                                    : Tablet;

                                            return (
                                                <li
                                                    key={p.id}
                                                    className="px-4 py-4"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <Ikon
                                                            className="mt-1 size-5 shrink-0 text-muted-foreground"
                                                            aria-hidden="true"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold break-words">
                                                                {
                                                                    p.namaPerangkat
                                                                }
                                                            </p>
                                                            <p className="mt-1 text-sm break-words">
                                                                {p.namaPengguna}{' '}
                                                                <span className="text-muted-foreground">
                                                                    @
                                                                    {p.username}
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <span
                                                            className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${gagal ? WARNA.offline : WARNA[p.status]}`}
                                                        >
                                                            {gagal
                                                                ? 'Belum diketahui'
                                                                : LABEL[
                                                                      p.status
                                                                  ]}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 pl-8 text-xs leading-relaxed text-muted-foreground">
                                                        <p>
                                                            Laporan terakhir:{' '}
                                                            <time
                                                                dateTime={
                                                                    p.terakhirAktif
                                                                }
                                                            >
                                                                {waktu(
                                                                    p.terakhirAktif,
                                                                )}
                                                            </time>
                                                        </p>
                                                        {p.antreanTertunda >
                                                            0 && (
                                                            <p className="mt-1 font-semibold text-amber-950">
                                                                {
                                                                    p.antreanTertunda
                                                                }{' '}
                                                                data tertunda
                                                                pada laporan
                                                                terakhir
                                                            </p>
                                                        )}
                                                        <details className="mt-2">
                                                            <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-primary">
                                                                Rincian
                                                                perangkat
                                                            </summary>
                                                            <p>
                                                                ID{' '}
                                                                {p.deviceId
                                                                    .slice(-6)
                                                                    .toUpperCase()}
                                                            </p>
                                                            <p>
                                                                {p.namaPosyandu
                                                                    ? `${p.namaPosyandu} · RW ${p.rw ?? '—'}`
                                                                    : 'Akun lintas Posyandu'}
                                                            </p>
                                                            <p>
                                                                {p.jenisPerangkat ===
                                                                'web'
                                                                    ? 'Browser web'
                                                                    : 'Aplikasi Android'}{' '}
                                                                ·{' '}
                                                                {p.modeKoneksi ===
                                                                'tailscale'
                                                                    ? 'Tailscale'
                                                                    : p.modeKoneksi ===
                                                                        'tidak_diketahui'
                                                                      ? 'Jalur belum dilaporkan'
                                                                      : p.modeKoneksi ===
                                                                          'lokal'
                                                                        ? 'Jaringan lokal'
                                                                        : 'Internet'}
                                                                {p.versiAplikasi
                                                                    ? ` · ${p.versiAplikasi}`
                                                                    : ''}
                                                            </p>
                                                            {!p.akunAktif && (
                                                                <p>
                                                                    Akun sudah
                                                                    dinonaktifkan.
                                                                </p>
                                                            )}
                                                        </details>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                            <div className="shrink-0 border-t border-border px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                                <p>
                                    Status berdasarkan laporan terakhir, bukan
                                    kepastian semua data sudah tersinkron.
                                </p>
                                <details>
                                    <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-primary">
                                        Arti status perangkat
                                    </summary>
                                    <p>
                                        Online: laporan hingga 45 detik lalu.
                                        Siaga: hingga 2 menit. Offline: lebih
                                        dari 2 menit. Aktivitas tanpa jaringan
                                        baru terlihat setelah perangkat melapor
                                        kembali.
                                    </p>
                                </details>
                            </div>
                        </dialog>
                    </>,
                    document.body,
                )}
        </div>
    );
}
