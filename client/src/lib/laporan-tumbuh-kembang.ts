import { useCallback, useEffect, useState } from 'react';
import { laporanDemo } from '@/data/contoh/store';

export type SurveiTumbuhKembang = {
    surveiId: number;
    tanggal: string;
    umurBulan: number;
    kelompokId: string;
    kelompokLabel: string;
    kemampuan: {
        pertanyaanId: string;
        pertanyaan: string;
        keterangan: string;
    }[];
};
export type LaporanTumbuhKembang = {
    periode: string;
    balita: { anakId: number; nama: string; survei: SurveiTumbuhKembang[] }[];
};

const sesiBerakhirKosong = () => {};

export function useLaporanTumbuhKembang(
    periode: string,
    modeLive: boolean,
    onSesiBerakhir = sesiBerakhirKosong,
) {
    const [versi, setVersi] = useState(0);
    const [hasil, setHasil] = useState<{
        periode: string;
        versi: number;
        data: LaporanTumbuhKembang | null;
        pesan: string | null;
    } | null>(null);
    const muatUlang = useCallback(() => setVersi((v) => v + 1), []);

    useEffect(() => {
        if (!modeLive) {
            return;
        }

        const controller = new AbortController();
        void fetch(
            `/api/v1/laporan/tumbuh-kembang?periode=${encodeURIComponent(periode)}`,
            {
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
            },
        )
            .then(async (res) => {
                if (res.status === 401) {
                    onSesiBerakhir();

                    throw new Error('Sesi telah berakhir.');
                }

                if (!res.ok) {
                    throw new Error(
                        `Laporan tumbuh kembang tidak dapat dimuat (HTTP ${res.status}).`,
                    );
                }

                return (await res.json()) as LaporanTumbuhKembang;
            })
            .then((data) => {
                if (controller.signal.aborted) {
                    return;
                }

                if (data.periode !== periode) {
                    throw new Error(
                        'Periode laporan tidak sesuai. Coba muat ulang.',
                    );
                }

                setHasil({ periode, versi, data, pesan: null });
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                setHasil({
                    periode,
                    versi,
                    data: null,
                    pesan:
                        error instanceof Error
                            ? error.message
                            : 'Laporan tidak tersedia.',
                });
            });

        return () => controller.abort();
    }, [periode, modeLive, onSesiBerakhir, versi]);

    const terkini = hasil?.periode === periode && hasil.versi === versi;

    return {
        data: !modeLive ? { periode, balita: laporanDemo(periode).bulanan.slice(0, 2).map((anak, i) => ({ anakId: anak.anakId, nama: anak.nama, survei: [{ surveiId: i + 1, tanggal: anak.tanggalUkur ?? `${periode}-01`, umurBulan: Math.floor((anak.umurHari ?? 0) / 30), kelompokId: 'contoh', kelompokLabel: 'Simulasi', kemampuan: [{ pertanyaanId: 'contoh', pertanyaan: 'Contoh', keterangan: 'Contoh jawaban simulasi untuk dibahas bersama keluarga.' }] }] })) } : terkini ? hasil.data : null,
        status: !modeLive
            ? ('siap' as const)
            : !terkini
              ? ('memuat' as const)
              : hasil.pesan
                ? ('galat' as const)
                : ('siap' as const),
        pesanGalat: terkini ? hasil.pesan : null,
        muatUlang,
    };
}
