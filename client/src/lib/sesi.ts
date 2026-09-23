/**
 * Sesi pengguna di sisi peramban.
 *
 * Token sesinya ada di cookie `httpOnly` — JavaScript tidak pernah bisa
 * membacanya, dan itu disengaja. Yang disimpan di sini hanya jawaban server
 * tentang siapa yang sedang masuk.
 */

import { useCallback, useEffect, useState } from 'react';

import type { Peran } from '@/types/posyandu';

export type PenggunaSesi = {
    id: number;
    peran: Peran;
    rt: string | null;
    aktif: boolean;
};

export type StatusSesi = 'memeriksa' | 'masuk' | 'keluar';

type Sesi =
    | { status: 'memeriksa'; pengguna: null }
    | { status: 'masuk'; pengguna: PenggunaSesi }
    | { status: 'keluar'; pengguna: null };

async function ambilSaya(): Promise<PenggunaSesi | null> {
    const res = await fetch('/api/saya', { credentials: 'same-origin' });

    if (!res.ok) {
        return null;
    }

    const isi = (await res.json()) as { pengguna: PenggunaSesi };

    return isi.pengguna;
}

export function useSesi() {
    // Mulai dari 'memeriksa', bukan 'keluar': cookie mungkin masih sah, dan
    // menampilkan layar Masuk lebih dulu berarti layar itu berkedip sekejap
    // pada setiap muat ulang milik pengguna yang sebenarnya sudah masuk.
    const [sesi, setSesi] = useState<Sesi>({
        status: 'memeriksa',
        pengguna: null,
    });

    useEffect(() => {
        let hidup = true;

        ambilSaya()
            .then((pengguna) => {
                if (!hidup) {
                    return;
                }

                setSesi(
                    pengguna === null
                        ? { status: 'keluar', pengguna: null }
                        : { status: 'masuk', pengguna },
                );
            })
            .catch(() => {
                // Server tidak terjangkau diperlakukan sama seperti belum
                // masuk. Tidak ada pengulangan otomatis: 401 yang diulang
                // terus hanya menjadi lingkaran permintaan gagal.
                if (hidup) {
                    setSesi({ status: 'keluar', pengguna: null });
                }
            });

        return () => {
            hidup = false;
        };
    }, []);

    const masuk = useCallback(
        async (email: string, kataSandi: string): Promise<string | null> => {
            const res = await fetch('/api/masuk', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email, kataSandi }),
            });

            if (!res.ok) {
                const isi = (await res.json().catch(() => ({}))) as {
                    galat?: string;
                };

                return isi.galat ?? 'Tidak dapat masuk. Coba lagi.';
            }

            // Jawaban masuk memuat identitas, tetapi bentuknya berbeda dari
            // `/api/saya`. Satu permintaan tambahan menjaga hanya ada satu
            // bentuk yang perlu dipercaya.
            const pengguna = await ambilSaya();

            if (pengguna === null) {
                return 'Sesi tidak terbentuk. Coba lagi.';
            }

            setSesi({ status: 'masuk', pengguna });

            return null;
        },
        [],
    );

    const keluar = useCallback(async (): Promise<void> => {
        await fetch('/api/keluar', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
        }).catch(() => undefined);

        setSesi({ status: 'keluar', pengguna: null });
    }, []);

    return { ...sesi, masuk, keluar };
}
