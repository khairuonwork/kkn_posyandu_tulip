import { Tablet, Wifi, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, useId } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface TabletInfo {
    deviceId: string;
    namaPerangkat: string;
    versiAplikasi?: string;
    ip: string;
    baterai?: number | null;
    antreanTertunda?: number;
    terakhirAktif: string;
    detikLalu: number;
    status: 'online' | 'idle';
}

interface ResponsPerangkat {
    serverIp: string[];
    daftarTablet: TabletInfo[];
}

export default function StatusTablet() {
    const [data, setData] = useState<ResponsPerangkat | null>(null);
    const [bukaDetail, setBukaDetail] = useState(false);
    const [sedangMuat, setSedangMuat] = useState(true);
    const [gagalMemeriksa, setGagalMemeriksa] = useState(false);
    const tombolRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const panelId = useId();
    const [posisiPanel, setPosisiPanel] = useState<CSSProperties | null>(null);

    useLayoutEffect(() => {
        if (!bukaDetail) return;
        const aturPosisi = () => {
            const tombol = tombolRef.current;
            if (!tombol) return;
            const rect = tombol.getBoundingClientRect();
            const width = Math.min(360, window.innerWidth - 24);
            const ruangAtas = rect.top - 20;
            setPosisiPanel({
                width,
                left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
                ...(ruangAtas >= 200
                    ? { bottom: window.innerHeight - rect.top + 8, maxHeight: Math.min(480, ruangAtas) }
                    : { top: 12, maxHeight: window.innerHeight - 24 }),
            });
        };
        aturPosisi();
        window.addEventListener('resize', aturPosisi);
        window.addEventListener('scroll', aturPosisi, true);
        return () => {
            window.removeEventListener('resize', aturPosisi);
            window.removeEventListener('scroll', aturPosisi, true);
        };
    }, [bukaDetail]);

    useEffect(() => {
        if (!bukaDetail) return;
        panelRef.current?.focus();
        const tutupDenganEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setBukaDetail(false);
        };
        window.addEventListener('keydown', tutupDenganEscape);
        const tombol = tombolRef.current;
        return () => {
            window.removeEventListener('keydown', tutupDenganEscape);
            tombol?.focus();
        };
    }, [bukaDetail]);

    const ambilStatus = async () => {
        setSedangMuat(true);
        try {
            const res = await fetch('/api/v1/perangkat-terhubung', {
                cache: 'no-store',
            });
            if (res.ok) {
                const hasil = (await res.json()) as ResponsPerangkat;
                setData(hasil);
                setGagalMemeriksa(false);
            } else {
                setGagalMemeriksa(true);
            }
        } catch {
            // Server offline atau tidak terjangkau
            setGagalMemeriksa(true);
        } finally {
            setSedangMuat(false);
        }
    };

    useEffect(() => {
        void ambilStatus();
        const interval = setInterval(ambilStatus, 6000);
        return () => clearInterval(interval);
    }, []);

    const daftarTablet = gagalMemeriksa ? [] : (data?.daftarTablet ?? []);
    const tabletOnline = daftarTablet.filter((t) => t.status === 'online');
    const adaTablet = tabletOnline.length > 0;
    const ipServerUtama = data?.serverIp?.[0] ?? '127.0.0.1';

    return (
        <div className="relative">
            <button
                ref={tombolRef}
                type="button"
                onClick={() => setBukaDetail((v) => !v)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                    adaTablet && !gagalMemeriksa
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 hover:bg-emerald-500/15'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-950 hover:bg-amber-500/15'
                }`}
                title="Status koneksi Tablet Android & Jaringan Lokal"
                aria-expanded={bukaDetail}
                aria-controls={bukaDetail ? panelId : undefined}
                aria-haspopup="dialog"
            >
                <div className="relative flex size-2.5 items-center justify-center">
                    {adaTablet ? (
                        <>
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
                        </>
                    ) : (
                        <span className="inline-flex size-2 rounded-full bg-amber-500" />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                        {gagalMemeriksa
                            ? 'Status server tidak tersedia'
                            : data === null && sedangMuat
                            ? 'Mendeteksi tablet…'
                            : adaTablet
                              ? `${tabletOnline.length} tablet terhubung`
                              : 'Belum ada tablet terhubung'}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                        {gagalMemeriksa
                            ? 'Coba segarkan untuk memeriksa ulang'
                            : adaTablet
                            ? daftarTablet.length > tabletOnline.length
                                ? `${daftarTablet.length - tabletOnline.length} siaga · ${tabletOnline[0]?.namaPerangkat ?? tabletOnline[0]?.ip}`
                                : tabletOnline[0]?.namaPerangkat ?? tabletOnline[0]?.ip
                            : data === null && sedangMuat
                              ? 'Memeriksa koneksi ke server'
                              : `Server: ${ipServerUtama}`}
                    </p>
                </div>

                <Tablet className="size-4 shrink-0 text-muted-foreground" />
            </button>

            {bukaDetail && posisiPanel && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[60]"
                        aria-hidden="true"
                        onClick={() => setBukaDetail(false)}
                    />
                    <div
                        ref={panelRef}
                        id={panelId}
                        role="dialog"
                        aria-labelledby={`${panelId}-judul`}
                        tabIndex={-1}
                        style={posisiPanel}
                        className="fixed z-[61] overflow-y-auto overscroll-contain rounded-2xl bg-popover p-4 text-popover-foreground shadow-xl outline-none"
                    >
                        <div className="flex items-center justify-between border-b border-border pb-2.5">
                            <div className="flex min-w-0 flex-1 items-center gap-2 font-bold text-sm">
                                <Wifi className="size-4 shrink-0 text-primary" />
                                <span id={`${panelId}-judul`}>Koneksi Jaringan Lokal</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => void ambilStatus()}
                                className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-muted text-muted-foreground focus-visible:outline-2 focus-visible:outline-primary"
                                title="Segarkan status"
                                aria-label="Segarkan status perangkat"
                            >
                                <RefreshCw
                                    className={`size-3.5 ${sedangMuat ? 'animate-spin' : ''}`}
                                />
                            </button>
                            <button
                                type="button"
                                onClick={() => setBukaDetail(false)}
                                aria-label="Tutup detail perangkat"
                                className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-3 space-y-3 text-xs">
                            {/* Info IP PC */}
                            <div className="rounded-lg bg-muted/50 p-2.5">
                                <p className="font-semibold text-muted-foreground text-[11px]">
                                    Alamat IP Server PC saat ini:
                                </p>
                                <div className="mt-1 font-mono font-bold text-foreground">
                                    {data?.serverIp && data.serverIp.length > 0 ? (
                                        data.serverIp.map((ip) => (
                                            <span
                                                key={ip}
                                                className="mr-1 inline-block rounded bg-background px-1.5 py-0.5 border"
                                            >
                                                {ip}:4321
                                            </span>
                                        ))
                                    ) : (
                                        <span>127.0.0.1:4321</span>
                                    )}
                                </div>
                                <p className="mt-1.5 text-[10px] text-muted-foreground leading-tight">
                                    Auto-Discovery aktif. Tablet akan otomatis menemukan IP ini di Wi-Fi/Hotspot mana pun.
                                </p>
                            </div>

                            {/* Daftar Tablet */}
                            <div>
                                <p className="font-bold text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">
                                    Perangkat Tablet Terhubung
                                </p>

                                {daftarTablet.length === 0 ? (
                                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-muted-foreground">
                                        <AlertCircle className="size-4 shrink-0 text-amber-500" />
                                        <p className="text-[11px] leading-tight">
                                            {gagalMemeriksa
                                                ? 'Server tidak dapat dihubungi saat ini. Segarkan status setelah koneksi kembali.'
                                                : 'Belum ada tablet yang memberi sinyal koneksi. Buka aplikasi Android dan pastikan tersambung ke server.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {daftarTablet.map((tablet) => (
                                            <div
                                                key={tablet.deviceId}
                                                className="flex items-center justify-between rounded-lg border border-border bg-card p-2 text-card-foreground"
                                            >
                                                <div className="min-w-0 flex-1 pr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle2 className={`size-3.5 shrink-0 ${tablet.status === 'online' ? 'text-emerald-600' : 'text-amber-600'}`} />
                                                        <span className="font-bold truncate text-[11px]">
                                                            {tablet.namaPerangkat}
                                                        </span>
                                                    </div>
                                                    <p className="font-mono text-[10px] text-muted-foreground">
                                                        IP: {tablet.ip}
                                                    </p>
                                                </div>
                                                <div className="text-right text-[10px] shrink-0 text-muted-foreground">
                                                    <span className={`font-semibold ${tablet.status === 'online' ? 'text-emerald-600' : 'text-amber-700'}`}>
                                                        {tablet.status === 'online' ? 'Online' : 'Siaga'}
                                                    </span>
                                                    <p>{tablet.detikLalu}s lalu</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>,
                document.body,
            )}
        </div>
    );
}
