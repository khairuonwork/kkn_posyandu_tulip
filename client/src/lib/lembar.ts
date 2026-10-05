/**
 * Lembar Hasil di sisi peramban: membuat tautan (petugas, wajib masuk) dan
 * membacanya (orang tua, tanpa masuk). Server: server/src/http/lembar-controller.ts.
 */

import { useEffect, useState } from 'react';
import type { Pengukuran } from '@/types/posyandu';

export type LembarApi = {
    anak: { namaDepan: string; jk: 'L' | 'P' };
    periodeId: string;
    /** ISO; sesudah ini server menjawab 410. */
    kedaluwarsa: string;
    pengukuran: Pick<
        Pengukuran,
        | 'periodeId'
        | 'tanggalUkur'
        | 'umurBulan'
        | 'bbKg'
        | 'tinggiCm'
        | 'lilaCm'
        | 'likaCm'
        | 'statusKehadiran'
        | 'penilaian'
    >[];
};

export type StatusLembar =
    | { status: 'memuat' }
    | { status: 'tidak-sah' }
    | { status: 'kedaluwarsa' }
    | { status: 'galat' }
    | { status: 'siap'; data: LembarApi };

/**
 * Alamat portal yang ditulis di tautan. `VITE_ALAMAT_PUBLIK` (client/.env.local)
 * mengalahkan alamat yang sedang dibuka petugas; tanpa itu, petugas yang
 * membuka portal lewat `localhost` menghasilkan tautan yang tidak bisa dibuka
 * dari ponsel orang tua, dan WhatsApp pun tidak menjadikannya tautan.
 */
const alamatPortal = () =>
    (import.meta.env.VITE_ALAMAT_PUBLIK ?? '').trim().replace(/\/+$/, '') ||
    window.location.origin;

/**
 * Membuat tautan untuk satu balita dan satu periode. Null bila server belum
 * siap (mis. rahasia belum diisi); pesan WhatsApp tetap bisa dikirim tanpanya.
 *
 * Pada QA LAN tautan hanya terbuka bagi ponsel yang satu Wi-Fi dengan
 * komputer server.
 */
export async function buatTautanLembar(
    anakId: number,
    periodeId: string,
): Promise<string | null> {
    try {
        const res = await fetch('/api/v1/lembar', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anakId, periodeId }),
        });

        if (!res.ok) {
            return null;
        }

        const { token } = (await res.json()) as { token: string };

        return `${alamatPortal()}/#/hasil/${token}`;
    } catch {
        return null;
    }
}

export function useLembar(token: string): StatusLembar {
    const [state, setState] = useState<StatusLembar>({ status: 'memuat' });

    useEffect(() => {
        const controller = new AbortController();

        fetch(`/api/v1/lembar/${encodeURIComponent(token)}`, {
            signal: controller.signal,
        })
            .then(async (res) => {
                if (res.status === 410) {
                    setState({ status: 'kedaluwarsa' });
                } else if (res.status === 404) {
                    setState({ status: 'tidak-sah' });
                } else if (!res.ok) {
                    setState({ status: 'galat' });
                } else {
                    setState({
                        status: 'siap',
                        data: (await res.json()) as LembarApi,
                    });
                }
            })
            .catch((galat: unknown) => {
                if ((galat as { name?: string }).name !== 'AbortError') {
                    setState({ status: 'galat' });
                }
            });

        return () => controller.abort();
    }, [token]);

    return state;
}
