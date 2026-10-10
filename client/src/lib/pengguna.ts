/**
 * Kelola akun di aplikasi sungguhan, lewat `/api/pengguna`.
 *
 * Demo memakai daftar contoh di memori; keduanya memberi layar Pengaturan
 * bentuk yang sama. Aturannya — nama pengguna unik, kader wajib punya RT, admin aktif
 * terakhir — ditegakkan server. Layar hanya memeriksanya lebih awal supaya
 * galat terlihat sebelum dikirim.
 */

import { useEffect, useState } from 'react';

import type { DaftarPengguna, IsianPengguna } from '@/pages/pengaturan/index';
import type { Pengguna } from '@/types/posyandu';

/**
 * `aktif` selama admin membuka Pengaturan: daftar dimuat ulang setiap kali
 * layar itu dibuka, supaya perubahan dari admin lain ikut terlihat.
 *
 * `onSesiBerakhir` dipanggil saat server menjawab 401: sesi admin ini dicabut
 * karena akunnya dinonaktifkan, perannya diubah, atau kata sandinya diganti
 * admin lain — atau karena ia mengubah perannya sendiri lewat layar ini.
 * Harus stabil antar-render.
 */
export function usePenggunaServer(aktif: boolean, onSesiBerakhir: () => void) {
    const [daftar, setDaftar] = useState<DaftarPengguna>({ status: 'memuat' });
    /** Dinaikkan untuk memuat ulang: sesudah menyimpan, atau lewat Ulangi. */
    const [muatKe, setMuatKe] = useState(0);

    useEffect(() => {
        if (!aktif) {
            return;
        }

        let hidup = true;

        fetch('/api/pengguna', { credentials: 'same-origin' })
            .then(async (res) => {
                if (res.status === 401) {
                    onSesiBerakhir();

                    return;
                }

                if (!res.ok) {
                    throw new Error(`GET /api/pengguna ${res.status}`);
                }

                const isi = (await res.json()) as {
                    pengguna: Pengguna[];
                    wilayahRt: string[];
                };

                if (hidup) {
                    setDaftar({ status: 'siap', ...isi });
                }
            })
            .catch(() => {
                if (hidup) {
                    setDaftar({
                        status: 'gagal',
                        ulangi: () => {
                            setDaftar({ status: 'memuat' });
                            setMuatKe((n) => n + 1);
                        },
                    });
                }
            });

        return () => {
            hidup = false;
        };
    }, [aktif, muatKe, onSesiBerakhir]);

    const simpan = async (
        id: number | null,
        isian: IsianPengguna,
    ): Promise<string | null> => {
        let res: Response;

        try {
            res = await fetch(
                id === null ? '/api/pengguna' : `/api/pengguna/${id}`,
                {
                    method: id === null ? 'POST' : 'PATCH',
                    credentials: 'same-origin',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(isian),
                },
            );
        } catch {
            return 'Tidak dapat terhubung ke server. Periksa sambungan, lalu simpan kembali.';
        }

        if (res.status === 401) {
            onSesiBerakhir();

            return 'Sesi telah berakhir. Silakan masuk kembali.';
        }

        if (!res.ok) {
            const isi = (await res.json().catch(() => ({}))) as {
                galat?: string;
            };

            return (
                isi.galat ??
                'Perubahan tidak dapat disimpan. Silakan coba lagi.'
            );
        }

        // Dimuat ulang dari server, bukan ditambal di sini: server satu-satunya
        // sumber, termasuk untuk perubahan admin lain di antara dua simpan.
        setMuatKe((n) => n + 1);

        return null;
    };

    return { daftar, simpan };
}
