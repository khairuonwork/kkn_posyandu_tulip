/**
 * Pengaturan — batas kewajaran, ambang rujukan, standar perhitungan, dan akun.
 */

import { Lock, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import Dialog, { KakiDialog } from '@/components/dialog';
import Halaman from '@/components/halaman';
import { angka, tanggalPanjang } from '@/lib/format';
import { navigate } from '@/lib/nav';
import { BagianAmbang } from './bagian/bagian-ambang';
import { BagianBatas } from './bagian/bagian-batas';
import { BagianPengguna } from './bagian/bagian-pengguna';
import { BagianRiwayat } from './bagian/bagian-riwayat';
import { BagianStandar } from './bagian/bagian-standar';
import { BilahSimpan } from './komponen/bilah-simpan';
import {
    ANGKA,
    BAGIAN,
    keAngka,
    KUNCI_ANGKA,
    RENTANG,
    STANDAR,
} from './tipe';
import type {
    Ambang,
    BarisRiwayatPengaturan,
    DaftarPengguna,
    IsianPengguna,
    Bagian,
    PengaturanProps,
    PosyanduAkun,
    StandarisasiAntropometri,
    WilayahRtAkun,
} from './tipe';

export type {
    Ambang,
    StandarisasiAntropometri,
    BarisRiwayatPengaturan,
    PosyanduAkun,
    WilayahRtAkun,
    DaftarPengguna,
    IsianPengguna,
};

export default function Pengaturan({
    ambang,
    standarVersi,
    barisStandar,
    terakhirDiubah,
    standarisasi,
    onSimpan,
    onSimpanStandarisasi,
    peran,
    pengguna,
    onSimpanPengguna,
    riwayat,
}: PengaturanProps) {
    const [bagian, setBagian] = useState<Bagian>('batas');
    const teksAwal = () =>
        Object.fromEntries(
            KUNCI_ANGKA.map((k) => [k, angka(ambang[k], ANGKA[k].desimal)]),
        ) as Record<keyof Ambang, string>;
    const [teks, setTeks] = useState(teksAwal);
    const [rumus, setRumus] = useState(standarisasi);
    /** Alamat yang dituju saat perubahan belum disimpan. */
    const [tujuan, setTujuan] = useState<string | null>(null);

    const nilai = Object.fromEntries(
        KUNCI_ANGKA.map((k) => [k, keAngka(teks[k])]),
    ) as Record<keyof Ambang, number | null>;
    const salahAngka = KUNCI_ANGKA.filter((k) => nilai[k] === null);
    const salahRentang = RENTANG.filter((r) => {
        const min = nilai[r.min];
        const max = nilai[r.max];

        return min !== null && max !== null && max <= min;
    });
    const diubah = (k: keyof Ambang) =>
        nilai[k] !== null &&
        angka(nilai[k], ANGKA[k].desimal) !==
            angka(ambang[k], ANGKA[k].desimal);

    // Kalimat tiap perubahan, dipakai bilah Simpan dan dialog pindah bagian.
    const perubahan = [
        ...KUNCI_ANGKA.filter(diubah).map(
            (k) =>
                `${ANGKA[k].label} diubah dari ${angka(ambang[k], ANGKA[k].desimal)} menjadi ${angka(nilai[k], ANGKA[k].desimal)} ${ANGKA[k].satuan}.`,
        ),
        ...(rumus.standar !== standarisasi.standar
            ? [
                  `Standar perhitungan diubah menjadi ${STANDAR.find((s) => s.nilai === rumus.standar)?.judul ?? rumus.standar}.`,
              ]
            : []),
        ...(rumus.koreksiPosisiOtomatis !== standarisasi.koreksiPosisiOtomatis
            ? [
                  `Koreksi posisi ukur otomatis ${rumus.koreksiPosisiOtomatis ? 'dinyalakan' : 'dimatikan'}.`,
              ]
            : []),
    ];
    const bisaSimpan =
        onSimpan !== undefined &&
        perubahan.length > 0 &&
        salahAngka.length === 0 &&
        salahRentang.length === 0;

    const simpan = () => {
        if (!bisaSimpan) {
            return;
        }

        onSimpan?.(
            Object.fromEntries(
                KUNCI_ANGKA.map((k) => [k, nilai[k] ?? ambang[k]]),
            ) as Ambang,
        );
        onSimpanStandarisasi?.(rumus);
    };

    const batalkan = () => {
        setTeks(teksAwal());
        setRumus(standarisasi);
    };

    /* Meninggalkan Pengaturan dengan perubahan tertahan ditanyakan dulu. */
    const adaPerubahan = perubahan.length > 0;

    useEffect(() => {
        if (!adaPerubahan) {
            return;
        }

        const tangkapKlik = (e: MouseEvent) => {
            const target = (e.target as HTMLElement | null)?.closest('a');

            if (!target) {
                return;
            }

            const href = target.getAttribute('href');

            if (
                href === null ||
                href.startsWith('http') ||
                href.startsWith('#') ||
                href.startsWith('mailto:') ||
                href.startsWith('tel:')
            ) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            setTujuan(href);
        };

        const tangkapTutup = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };

        document.addEventListener('click', tangkapKlik, true);
        window.addEventListener('beforeunload', tangkapTutup);

        return () => {
            document.removeEventListener('click', tangkapKlik, true);
            window.removeEventListener('beforeunload', tangkapTutup);
        };
    }, [adaPerubahan]);

    const ubahTeks = (k: keyof Ambang, v: string) =>
        setTeks((lama) => ({ ...lama, [k]: v }));
    const info = BAGIAN.find((b) => b.kunci === bagian) ?? BAGIAN[0];

    return (
        <Halaman
            judul="Pengaturan"
            subjudul={`Terakhir diubah ${tanggalPanjang(terakhirDiubah.tanggal)} oleh ${terakhirDiubah.oleh}. Data contoh.`}
        >
            <div className="kartu grid overflow-hidden lg:min-h-0 lg:flex-1 lg:grid-cols-[272px_minmax(0,1fr)]">
                <nav
                    aria-label="Bagian pengaturan"
                    className="flex flex-wrap gap-1 border-b border-border p-3.5 lg:flex-col lg:flex-nowrap lg:border-r lg:border-b-0"
                >
                    {BAGIAN.map((b) => {
                        const Ikon = b.ikon;
                        const aktif = b.kunci === bagian;

                        return (
                            <button
                                key={b.kunci}
                                type="button"
                                aria-current={aktif ? 'true' : undefined}
                                onClick={() => setBagian(b.kunci)}
                                className={`flex min-h-15 items-center gap-3.5 rounded-lg px-4 text-left text-base ${
                                    aktif
                                        ? 'bg-primary font-bold text-primary-foreground'
                                        : 'font-semibold text-[#33403a] hover:bg-surface'
                                }`}
                            >
                                <Ikon
                                    className="size-6 shrink-0"
                                    strokeWidth={2.25}
                                />
                                {b.label}
                            </button>
                        );
                    })}
                    <p className="mt-auto hidden gap-2 border-t border-border px-1.5 pt-3.5 text-sm text-muted-foreground lg:flex">
                        <Lock
                            className="size-5 shrink-0"
                            strokeWidth={2.25}
                            aria-hidden="true"
                        />
                        Menu ini hanya tampil untuk bidan dan admin.
                    </p>
                </nav>

                <section
                    aria-labelledby="judul-bagian"
                    className="flex min-w-0 flex-col lg:min-h-0"
                >
                    <div className="shrink-0 border-b border-border px-7 pt-4.5 pb-3.5">
                        <h2
                            id="judul-bagian"
                            className="text-xl leading-tight font-extrabold"
                        >
                            {info.label}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {info.keterangan}
                        </p>
                    </div>

                    {bagian === 'batas' && (
                        <BagianBatas
                            teks={teks}
                            ambang={ambang}
                            salahRentang={salahRentang}
                            ubahTeks={ubahTeks}
                        />
                    )}

                    {bagian === 'ambang' && (
                        <BagianAmbang
                            teks={teks}
                            ambang={ambang}
                            nilai={nilai}
                            ubahTeks={ubahTeks}
                        />
                    )}

                    {bagian === 'pengguna' && (
                        <BagianPengguna
                            peran={peran}
                            daftar={pengguna}
                            onSimpan={onSimpanPengguna}
                        />
                    )}

                    {bagian === 'standar' && (
                        <BagianStandar
                            rumus={rumus}
                            setRumus={setRumus}
                            standarVersi={standarVersi}
                            barisStandar={barisStandar}
                        />
                    )}

                    {bagian === 'riwayat' && (
                        <BagianRiwayat riwayat={riwayat} />
                    )}

                    {bagian !== 'riwayat' && (
                        <BilahSimpan
                            perubahan={perubahan}
                            bisaSimpan={bisaSimpan}
                            tanpaTempat={onSimpan === undefined}
                            onSimpan={simpan}
                            onBatal={batalkan}
                        />
                    )}
                </section>
            </div>

            {tujuan !== null && (
                <Dialog
                    judul={`${perubahan.length} perubahan belum disimpan.`}
                    keterangan="Perubahan ini hilang bila Anda pindah tanpa menyimpan."
                    lebar="w-[560px]"
                    onTutup={() => setTujuan(null)}
                >
                    <ul className="flex list-disc flex-col gap-1 overflow-y-auto px-7 py-4.5 pl-12 text-base">
                        {perubahan.map((p) => (
                            <li key={p}>{p}</li>
                        ))}
                    </ul>
                    <KakiDialog>
                        <button
                            type="button"
                            onClick={() => {
                                const ke = tujuan;

                                batalkan();
                                setTujuan(null);
                                navigate(ke);
                            }}
                            className="tombol-kedua"
                        >
                            Pindah tanpa menyimpan
                        </button>
                        <button
                            type="button"
                            disabled={!bisaSimpan}
                            onClick={() => {
                                const ke = tujuan;

                                simpan();
                                setTujuan(null);
                                navigate(ke);
                            }}
                            className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                        >
                            <Save
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Simpan pengaturan
                        </button>
                    </KakiDialog>
                </Dialog>
            )}
        </Halaman>
    );
}
