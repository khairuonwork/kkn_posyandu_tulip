import { useCallback, useEffect, useState } from 'react';

export type BarisLaporanLive = {
    anakId: number;
    nama: string;
    nik: string | null;
    namaOrtu: string | null;
    tglLahir: string;
    jk: 'L' | 'P';
    rt: string | null;
    periodeId: string;
    tanggalUkur: string | null;
    umurLengkap: string;
    umurHari: number | null;
    bbKg: number | null;
    tinggiCm: number | null;
    lilaCm: number | null;
    likaCm: number | null;
    ntobRaw: string | null;
    statusKehadiran: string;
    penilaian: Record<
        string,
        Record<string, { z?: number | null; kategori?: string | null }>
    >;
    nt: 'N' | 'T' | null;
    kenaikanGram: number | null;
    kbmGram: number | null;
    duaT: boolean;
    jumlahTBerturut?: number;
    status2T?: string;
    sumberRiwayat?: 'arsip' | 'pengukuran';
};
export type LaporanLive = {
    periode: string;
    metodeUmur: string;
    standar: string[];
    ringkasan: {
        anakDiukur: number;
        denganDuaT: number;
        tanpaSkor: number;
        duaTDariArsip?: number;
        belumDapatDinilai?: number;
    };
    keterangan2T?: string;
    bulanan: BarisLaporanLive[];
    riwayat2T: BarisLaporanLive[];
};

export function useLaporanServer(
    periode: string,
    aktif: boolean,
    onSesiBerakhir: () => void,
) {
    const [data, setData] = useState<LaporanLive | null>(null);
    const [status, setStatus] = useState<'memuat' | 'siap' | 'galat'>('memuat');
    const [periodeData, setPeriodeData] = useState('');
    const [pesanGalat, setPesanGalat] = useState<string | null>(null);
    const [versi, setVersi] = useState(0);
    const muatUlang = useCallback(() => setVersi((v) => v + 1), []);
    useEffect(() => {
        if (!aktif || !periode) {
            return;
        }

        const controller = new AbortController();
        void fetch(`/api/v1/laporan?periode=${encodeURIComponent(periode)}`, {
            credentials: 'same-origin',
            cache: 'no-store',
            signal: controller.signal,
        })
            .then(async (res) => {
                if (res.status === 401) {
                    onSesiBerakhir();

                    throw new Error('Sesi telah berakhir.');
                }

                if (!res.ok) {
                    if (res.status === 404) {
                        throw new Error(
                            'Rute laporan belum tersedia pada server API yang aktif. Setelah server diperbarui, muat ulang halaman ini.',
                        );
                    }

                    throw new Error(
                        `Laporan tidak dapat dimuat (HTTP ${res.status}).`,
                    );
                }

                return (await res.json()) as LaporanLive;
            })
            .then((hasil) => {
                setData(hasil);
                setPeriodeData(periode);
                setStatus('siap');
                setPesanGalat(null);
            })
            .catch((error: unknown) => {
                if ((error as Error).name === 'AbortError') {
                    return;
                }

                setPeriodeData(periode);
                setStatus('galat');
                setPesanGalat(
                    error instanceof Error
                        ? error.message
                        : 'Laporan tidak tersedia.',
                );
            });

        return () => controller.abort();
    }, [aktif, periode, onSesiBerakhir, versi]);

    const unduh = useCallback(async (format: 'zscore' | 'f1' = 'zscore') => {
        const res = await fetch(
            `/api/v1/laporan/${format === 'f1' ? 'f1/' : ''}unduh?periode=${encodeURIComponent(periode)}`,
            {
                credentials: 'same-origin',
                cache: 'no-store',
            },
        );

        if (res.status === 401) {
            onSesiBerakhir();

            throw new Error('Sesi telah berakhir.');
        }

        if (res.status === 403) {
            throw new Error('Akun ini belum memiliki izin mengunduh rekap.');
        }

        if (res.status === 404) {
            throw new Error(
                'Rute unduhan laporan belum tersedia pada server API yang aktif. Perbarui server lalu coba lagi.',
            );
        }

        if (!res.ok) {
            const pesan = await res.json().catch(() => null) as {galat?: string} | null;
            if (pesan?.galat) throw new Error(pesan.galat);
            throw new Error(`Berkas tidak dapat dibuat (HTTP ${res.status}).`);
        }

        const url = URL.createObjectURL(await res.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan-${format === 'f1' ? 'f1' : 'posyandu'}-${periode}.xlsx`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }, [periode, onSesiBerakhir]);

    return {
        data: data?.periode === periode ? data : null,
        status: periodeData === periode ? status : ('memuat' as const),
        pesanGalat,
        muatUlang,
        unduh,
    };
}
