import { useCallback, useEffect, useState } from 'react';

import type {
    KehadiranHariH,
    IsianHariH,
} from '@/components/cakupan-penimbangan';
import type {
    AnakPerluPerhatian,
    CakupanPeriode,
    RingkasanBeranda,
    SebaranStatusGizi,
    TitikTren,
} from '@/pages/dashboard';
import type { Periode } from '@/types/posyandu';

export type DataBeranda = {
    kehadiranHariH?: KehadiranHariH[];
    bolehUbahHariH?: boolean;
    ringkasan: RingkasanBeranda;
    wilayahRt?: string[];
    statusBbU?: { label: string; jumlah: number }[];
    statusTbU?: { label: string; jumlah: number }[];
    sasaranHistoris: boolean;
    statusGizi: SebaranStatusGizi;
    cakupanEnamBulan: CakupanPeriode[];
    trenGizi: TitikTren[];
    perluPerhatian: AnakPerluPerhatian[];
};

type DaftarPeriode = { periode: Periode[]; periodeTerisi: Periode | null };

async function jsonLive<T>(
    url: string,
    signal: AbortSignal,
    onSesiBerakhir: () => void,
): Promise<T> {
    const res = await fetch(url, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
    });

    if (res.status === 401) {
        onSesiBerakhir();

        throw new Error('Sesi telah berakhir.');
    }

    if (!res.ok) {
        throw new Error(
            'Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.',
        );
    }

    return (await res.json()) as T;
}

/** Beranda segar saat kembali ke tab dan tiap 30 detik selama layar terbuka. */
export function useBerandaServer(
    periodePilihan: string,
    aktif: boolean,
    onSesiBerakhir: () => void,
) {
    const [rtPilihan, setRtPilihan] = useState('');
    const [daftar, setDaftar] = useState<DaftarPeriode>({
        periode: [],
        periodeTerisi: null,
    });
    const [statusPeriode, setStatusPeriode] = useState<
        'memuat' | 'siap' | 'galat'
    >('memuat');
    const [data, setData] = useState<DataBeranda | null>(null);
    const [status, setStatus] = useState<'memuat' | 'siap' | 'galat'>('memuat');
    const [periodeData, setPeriodeData] = useState('');
    const [pesanGalat, setPesanGalat] = useState<string | null>(null);
    const [versi, setVersi] = useState(0);
    const muatUlang = useCallback(() => setVersi((lama) => lama + 1), []);
    const periodeId = daftar.periode.some((p) => p.id === periodePilihan)
        ? periodePilihan
        : (daftar.periodeTerisi?.id ?? daftar.periode.at(-1)?.id ?? '');

    useEffect(() => {
        const controller = new AbortController();
        const ambil = () => {
            void jsonLive<DaftarPeriode>(
                '/api/v1/periode',
                controller.signal,
                onSesiBerakhir,
            )
                .then((hasil) => {
                    setDaftar(hasil);
                    setStatusPeriode('siap');
                })
                .catch((galat: unknown) => {
                    if ((galat as Error).name !== 'AbortError') {
                        setStatusPeriode('galat');
                        setPesanGalat(
                            galat instanceof TypeError
                                ? 'Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.'
                                : galat instanceof Error
                                  ? galat.message
                                  : 'Periode tidak tersedia.',
                        );
                    }
                });
        };
        ambil();
        const segarkan = () => {
            if (!document.hidden) {
                ambil();
            }
        };
        window.addEventListener('focus', segarkan);

        return () => {
            controller.abort();
            window.removeEventListener('focus', segarkan);
        };
    }, [onSesiBerakhir, versi]);

    useEffect(() => {
        if (
            !aktif ||
            periodeId === '' ||
            !daftar.periode.some((p) => p.id === periodeId)
        ) {
            return;
        }

        const controller = new AbortController();
        const ambil = () => {
            void jsonLive<DataBeranda>(
                `/api/v1/beranda?periode=${encodeURIComponent(periodeId)}&rt=${encodeURIComponent(rtPilihan)}`,
                controller.signal,
                onSesiBerakhir,
            )
                .then((hasil) => {
                    if (controller.signal.aborted) {
                        return;
                    }

                    setData(hasil);
                    setPeriodeData(`${periodeId}:${rtPilihan}`);
                    setStatus('siap');
                    setPesanGalat(null);
                })
                .catch((galat: unknown) => {
                    if ((galat as Error).name !== 'AbortError') {
                        setPeriodeData(`${periodeId}:${rtPilihan}`);
                        setStatus('galat');
                        setPesanGalat(
                            galat instanceof TypeError
                                ? 'Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.'
                                : galat instanceof Error
                                  ? galat.message
                                  : 'Beranda tidak tersedia.',
                        );
                    }
                });
        };
        ambil();
        const timer = window.setInterval(ambil, 30_000);
        window.addEventListener('focus', ambil);
        document.addEventListener('visibilitychange', ambil);

        return () => {
            controller.abort();
            window.clearInterval(timer);
            window.removeEventListener('focus', ambil);
            document.removeEventListener('visibilitychange', ambil);
        };
    }, [aktif, periodeId, daftar.periode, onSesiBerakhir, versi, rtPilihan]);

    const simpanHariH = async (items: IsianHariH[]) => {
        const response = await fetch('/api/v1/beranda/hari-h', {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ periode: periodeId, items }),
        });

        if (response.status === 401) {
            onSesiBerakhir();
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));

            throw new Error(
                error.galat ?? 'Kehadiran hari H belum tersimpan. Coba lagi.',
            );
        }

        muatUlang();
    };

    return {
        simpanHariH,
        ...daftar,
        rtPilihan,
        setRtPilihan,
        periodeAktif: periodeId,
        statusPeriode,
        data,
        status:
            periodeData === `${periodeId}:${rtPilihan}`
                ? status
                : ('memuat' as const),
        pesanGalat,
        muatUlang,
    };
}
