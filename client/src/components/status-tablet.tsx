import { Tablet, Wifi, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    const [sedangMuat, setSedangMuat] = useState(false);

    const ambilStatus = async () => {
        setSedangMuat(true);
        try {
            const res = await fetch('/api/v1/perangkat-terhubung', {
                cache: 'no-store',
            });
            if (res.ok) {
                const hasil = (await res.json()) as ResponsPerangkat;
                setData(hasil);
            }
        } catch {
            // Server offline atau tidak terjangkau
        } finally {
            setSedangMuat(false);
        }
    };

    useEffect(() => {
        void ambilStatus();
        const interval = setInterval(ambilStatus, 6000);
        return () => clearInterval(interval);
    }, []);

    const daftarTablet = data?.daftarTablet ?? [];
    const tabletOnline = daftarTablet.filter((t) => t.status === 'online');
    const adaTablet = tabletOnline.length > 0;
    const ipServerUtama = data?.serverIp?.[0] ?? '127.0.0.1';

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setBukaDetail((v) => !v)}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                    adaTablet
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-950 hover:bg-emerald-500/15'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-950 hover:bg-amber-500/15'
                }`}
                title="Status koneksi Tablet Android & Jaringan Lokal"
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
                        {adaTablet
                            ? `${tabletOnline.length} Tablet Terhubung`
                            : 'Menunggu Tablet...'}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                        {adaTablet
                            ? tabletOnline[0]?.namaPerangkat ?? tabletOnline[0]?.ip
                            : `IP PC: ${ipServerUtama}`}
                    </p>
                </div>

                <Tablet className="size-4 shrink-0 text-muted-foreground" />
            </button>

            {bukaDetail && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setBukaDetail(false)}
                    />
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-2xl border border-border bg-popover p-4 shadow-xl text-popover-foreground">
                        <div className="flex items-center justify-between border-b border-border pb-2.5">
                            <div className="flex items-center gap-2 font-bold text-sm">
                                <Wifi className="size-4 text-primary" />
                                <span>Koneksi Jaringan Lokal</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => void ambilStatus()}
                                className="rounded-md p-1 hover:bg-muted text-muted-foreground"
                                title="Segarkan status"
                            >
                                <RefreshCw
                                    className={`size-3.5 ${sedangMuat ? 'animate-spin' : ''}`}
                                />
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
                                            Belum ada tablet yang terhubung. Buka aplikasi di tablet pada jaringan Wi-Fi/Hotspot yang sama.
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
                                                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                                                        <span className="font-bold truncate text-[11px]">
                                                            {tablet.namaPerangkat}
                                                        </span>
                                                    </div>
                                                    <p className="font-mono text-[10px] text-muted-foreground">
                                                        IP: {tablet.ip}
                                                    </p>
                                                </div>
                                                <div className="text-right text-[10px] shrink-0 text-muted-foreground">
                                                    <span className="font-semibold text-emerald-600">Online</span>
                                                    <p>{tablet.detikLalu}s lalu</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
