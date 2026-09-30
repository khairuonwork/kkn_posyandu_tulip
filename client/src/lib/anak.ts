import { useEffect, useState } from 'react';

import type { BarisAnak } from '@/pages/anak';

type AnakApi = {
    id: number;
    nik: string | null;
    nama: string;
    tglLahir: string;
    jk: 'L' | 'P';
    rt: string | null;
};

function umurBulan(tanggal: string): number {
    const lahir = new Date(`${tanggal}T00:00:00`);
    const kini = new Date();
    let hasil = (kini.getFullYear() - lahir.getFullYear()) * 12 + kini.getMonth() - lahir.getMonth();
    if (kini.getDate() < lahir.getDate()) hasil--;
    return Math.max(0, hasil);
}

function keBaris(a: AnakApi): BarisAnak {
    return {
        anakId: a.id,
        nama: a.nama,
        nik: a.nik,
        nikLengkap: a.nik?.length === 16,
        jk: a.jk,
        umurBulan: umurBulan(a.tglLahir),
        rt: a.rt,
        namaOrtu: null,
        tanggalUkurTerakhir: null,
        kategoriGizi: null,
        perluPerhatian: false,
        risikoLahir: null,
        indeksPemicu: null,
        kategoriPemicu: null,
        bbKg: null,
        tinggiCm: null,
    };
}

export function useAnakServer(onSesiBerakhir: () => void): BarisAnak[] | null {
    const [anak, setAnak] = useState<BarisAnak[] | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch('/api/v1/anak?halaman=1&ukuran=100', {
            credentials: 'same-origin',
            signal: controller.signal,
        })
            .then(async (res) => {
                if (res.status === 401) {
                    onSesiBerakhir();
                    return null;
                }
                if (!res.ok) throw new Error(`GET /api/v1/anak ${res.status}`);
                return (await res.json()) as { items: AnakApi[] };
            })
            .then((isi) => {
                if (isi !== null) setAnak(isi.items.map(keBaris));
            })
            .catch((galat: unknown) => {
                if ((galat as { name?: string }).name !== 'AbortError') setAnak([]);
            });

        return () => controller.abort();
    }, [onSesiBerakhir]);

    return anak;
}
