import { useCallback, useEffect, useState } from 'react';

import { umurBulanPada } from '@/lib/format';
import { kodeKartuSasaran } from '@/lib/kartu-sasaran';
import type { BarisAnak } from '@/pages/anak';
import type { PatchAnak } from '@/pages/anak';
import type { BalitaKartu } from '@/pages/kartu-sasaran';
import type {
    Anak,
    GarisSd,
    Pengukuran,
    StatusKehadiran,
} from '@/types/posyandu';

type AnakApi = {
    id: number;
    nik: string | null;
    nama: string;
    tglLahir: string;
    jk: 'L' | 'P';
    rt: string | null;
    namaOrtu: string | null;
    status: string;
    pengukuranTerakhir: string | null;
    bbKg: number | null;
    tinggiCm: number | null;
    kategoriGizi: string | null;
    perluPerhatian: boolean;
    risikoLahir: string | null;
    indeksPemicu: BarisAnak['indeksPemicu'];
    kategoriPemicu: string | null;
};

export type DataAnakServer = {
    status: 'memuat' | 'siap' | 'galat';
    baris: BarisAnak[];
    kartu: BalitaKartu[];
    pesanGalat: string | null;
    muatUlang: () => void;
};

type AnakDetailApi = AnakApi & {
    nikOrtu: string | null;
    noWa: string | null;
    anakKe: number | null;
    bbLahirKg: number | null;
    pbLahirCm: number | null;
    bukuKia: boolean;
    imd: boolean;
};

type PengukuranApi = {
    periodeId: string;
    tanggalUkur: string;
    bbKg: number | null;
    tinggiCm: number | null;
    lilaCm: number | null;
    likaCm: number | null;
    statusKehadiran: StatusKehadiran;
    catatan: string | null;
    ntob: string | null;
    penilaian: Pengukuran['penilaian'];
};

export type DetailAnakServerState =
    | { status: 'memuat' }
    | { status: 'tidak-ada' }
    | {
          status: 'siap';
          anak: Anak;
          pengukuran: Pengukuran[];
          garisSd: GarisSd[];
      };

function umurBulan(tanggal: string): number {
    const lahir = new Date(`${tanggal}T00:00:00`);
    const kini = new Date();
    let hasil =
        (kini.getFullYear() - lahir.getFullYear()) * 12 +
        kini.getMonth() -
        lahir.getMonth();

    if (kini.getDate() < lahir.getDate()) {
        hasil--;
    }

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
        namaOrtu: a.namaOrtu,
        tanggalUkurTerakhir: a.pengukuranTerakhir?.slice(0, 10) ?? null,
        kategoriGizi: a.kategoriGizi,
        perluPerhatian: a.perluPerhatian,
        risikoLahir: a.risikoLahir,
        indeksPemicu: a.indeksPemicu,
        kategoriPemicu: a.kategoriPemicu,
        bbKg: a.bbKg,
        tinggiCm: a.tinggiCm,
    };
}

function keKartu(a: AnakApi): BalitaKartu {
    const umur = umurBulan(a.tglLahir);

    return {
        anakId: a.id,
        nama: a.nama,
        tglLahir: a.tglLahir,
        rt: a.rt,
        namaIbu: a.namaOrtu,
        nik: a.nik,
        kode: kodeKartuSasaran(a),
        umurBulan: umur,
        aktif: a.status !== 'pindah' && umur < 60,
    };
}

export function useAnakServer(
    onSesiBerakhir: () => void,
    aktif = true,
): DataAnakServer {
    const [versi, setVersi] = useState(0);
    const [state, setState] = useState<Omit<DataAnakServer, 'muatUlang'>>({
        status: 'memuat',
        baris: [],
        kartu: [],
        pesanGalat: null,
    });
    const muatUlang = useCallback(() => {
        setState({ status: 'memuat', baris: [], kartu: [], pesanGalat: null });
        setVersi((nilai) => nilai + 1);
    }, []);

    useEffect(() => {
        if (!aktif) {
            return;
        }

        const controller = new AbortController();

        const ambilHalaman = async (halaman: number) => {
            const res = await fetch(
                `/api/v1/anak?halaman=${halaman}&ukuran=100`,
                {
                    credentials: 'same-origin',
                    signal: controller.signal,
                },
            );

            if (res.status === 401) {
                onSesiBerakhir();

                return null;
            }

            if (!res.ok) {
                throw new Error(`Server menjawab HTTP ${res.status}.`);
            }

            return (await res.json()) as { items: AnakApi[]; total: number };
        };

        ambilHalaman(1)
            .then(async (awal) => {
                if (awal === null) {
                    return null;
                }

                const jumlahHalaman = Math.ceil(awal.total / 100);
                const sisanya = await Promise.all(
                    Array.from(
                        { length: Math.max(0, jumlahHalaman - 1) },
                        (_, i) => ambilHalaman(i + 2),
                    ),
                );

                if (sisanya.some((halaman) => halaman === null)) {
                    return null;
                }

                return [awal, ...sisanya].flatMap(
                    (halaman) => halaman?.items ?? [],
                );
            })
            .then((items) => {
                if (items !== null) {
                    setState({
                        status: 'siap',
                        baris: items.map(keBaris),
                        kartu: items.map(keKartu),
                        pesanGalat: null,
                    });
                }
            })
            .catch((galat: unknown) => {
                if ((galat as { name?: string }).name !== 'AbortError') {
                    setState({
                        status: 'galat',
                        baris: [],
                        kartu: [],
                        pesanGalat:
                            galat instanceof Error
                                ? galat.message
                                : 'Data balita tidak dapat dimuat.',
                    });
                }
            });

        return () => controller.abort();
    }, [aktif, onSesiBerakhir, versi]);

    return { ...state, muatUlang };
}

function keDetail(a: AnakDetailApi): Anak {
    return {
        id: a.id,
        nama: a.nama,
        nik: a.nik,
        nikLengkap: a.nik?.length === 16,
        jk: a.jk,
        tglLahir: a.tglLahir,
        anakKe: a.anakKe,
        bbLahirKg: a.bbLahirKg,
        bbLahirMeragukan: false,
        pbLahirCm: a.pbLahirCm,
        bukuKia: a.bukuKia,
        imd: a.imd,
        rt: a.rt,
        rw: '18',
        namaOrtu: a.namaOrtu,
        nikOrtu: a.nikOrtu,
        noWa: a.noWa,
    };
}

export async function simpanProfilAnak(
    anakId: number,
    patch: PatchAnak,
    onSesiBerakhir: () => void,
): Promise<void> {
    let response: Response;
    try {
        response = await fetch(`/api/v1/anak/${anakId}`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(patch),
        });
    } catch {
        throw new Error(
            'Tidak dapat terhubung ke server. Periksa sambungan lalu coba lagi.',
        );
    }
    if (response.status === 401) {
        onSesiBerakhir();
        throw new Error('Sesi telah berakhir. Silakan masuk kembali.');
    }
    if (!response.ok) {
        const isi = (await response.json().catch(() => ({}))) as {
            galat?: string;
        };
        throw new Error(isi.galat ?? 'Profil anak tidak dapat disimpan.');
    }
}

function kePengukuran(anak: Anak, p: PengukuranApi): Pengukuran {
    return {
        anakId: anak.id,
        periodeId: p.periodeId,
        tanggalUkur: p.tanggalUkur,
        umurBulan: umurBulanPada(anak.tglLahir, p.tanggalUkur),
        bbKg: p.bbKg,
        tinggiCm: p.tinggiCm,
        lilaCm: p.lilaCm,
        likaCm: p.likaCm,
        ntob: p.ntob,
        statusKehadiran: p.statusKehadiran,
        catatanUkur: p.catatan === null ? null : { catatan: p.catatan },
        penilaian: p.penilaian ?? {},
    };
}

export function useDetailAnakServer(
    anakId: number | null,
    onSesiBerakhir: () => void,
): DetailAnakServerState {
    const [state, setState] = useState<DetailAnakServerState>({
        status: 'memuat',
    });

    useEffect(() => {
        if (anakId === null) {
            return;
        }

        const controller = new AbortController();
        let aktif = true;

        queueMicrotask(() => {
            if (aktif) {
                setState({ status: 'memuat' });
            }
        });
        Promise.all([
            fetch(`/api/v1/anak/${anakId}`, {
                credentials: 'same-origin',
                signal: controller.signal,
            }),
            fetch(`/api/v1/anak/${anakId}/pengukuran`, {
                credentials: 'same-origin',
                signal: controller.signal,
            }),
        ])
            .then(async ([resAnak, resUkur]) => {
                if (resAnak.status === 401 || resUkur.status === 401) {
                    onSesiBerakhir();

                    return null;
                }

                if (resAnak.status === 404 || resUkur.status === 404) {
                    return { tidakAda: true } as const;
                }

                if (!resAnak.ok || !resUkur.ok) {
                    throw new Error('Detail anak tidak dapat dimuat.');
                }

                const detail = (await resAnak.json()) as {
                    anak: AnakDetailApi;
                };
                const riwayat = (await resUkur.json()) as {
                    pengukuran: PengukuranApi[];
                    garisSd: GarisSd[];
                };

                return { tidakAda: false, detail, riwayat } as const;
            })
            .then((hasil) => {
                if (hasil === null) {
                    return;
                }

                if (hasil.tidakAda) {
                    setState({ status: 'tidak-ada' });

                    return;
                }

                const anak = keDetail(hasil.detail.anak);
                setState({
                    status: 'siap',
                    anak,
                    pengukuran: hasil.riwayat.pengukuran.map((p) =>
                        kePengukuran(anak, p),
                    ),
                    garisSd: hasil.riwayat.garisSd,
                });
            })
            .catch((galat: unknown) => {
                if ((galat as { name?: string }).name !== 'AbortError') {
                    setState({ status: 'tidak-ada' });
                }
            });

        return () => {
            aktif = false;
            controller.abort();
        };
    }, [anakId, onSesiBerakhir]);

    return state;
}
