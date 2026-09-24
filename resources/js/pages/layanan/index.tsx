import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import {
    Camera,
    CheckCircle2,
    CircleAlert,
    ClipboardCheck,
    ScanLine,
    UserRoundCheck,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Halaman from '@/components/halaman';
import { bacaIdKartuSasaran, kodeKartuSasaran } from '@/lib/kartu-sasaran';

export type SasaranLayanan = {
    id: number | string;
    nama: string | null;
    nik: string | null;
    nikLengkap: boolean;
    namaIbu: string | null;
    nikOrtu: string | null;
    rt: string | null;
    umur: string;
    tglLahir: string | null;
    jk: 'L' | 'P' | null;
    anakKe: number | null;
    bbLahirKg: number | null;
    pbLahirCm: number | null;
    bukuKia: boolean;
    imd: boolean;
    imunisasiLengkap?: boolean | null;
    beratTerakhir: number | null;
    tanggalUkurTerakhir: string | null;
};

type Props = { sasaran: SasaranLayanan[] };
type Antrean = {
    sasaranId: string;
    nomor: number;
    tanggal: string;
    masukPada: string;
};
const KUNCI_ANTREAN = 'SIMPATIK_ANTREAN_WEB_V1';

function tanggalHariIni(): string {
    const kini = new Date();

    return `${kini.getFullYear()}-${String(kini.getMonth() + 1).padStart(2, '0')}-${String(kini.getDate()).padStart(2, '0')}`;
}

function bacaAntrean(): Antrean[] {
    try {
        const nilai = JSON.parse(localStorage.getItem(KUNCI_ANTREAN) ?? '[]');

        return Array.isArray(nilai) ? nilai : [];
    } catch {
        return [];
    }
}

export default function LayananPosyandu({ sasaran }: Props) {
    const [kode, setKode] = useState('');
    const [hasil, setHasil] = useState<SasaranLayanan | null>(null);
    const [pesan, setPesan] = useState('');
    const [kameraAktif, setKameraAktif] = useState(false);
    const [antrean, setAntrean] = useState<Antrean[]>(bacaAntrean);
    const videoRef = useRef<HTMLVideoElement>(null);
    const kontrolRef = useRef<IScannerControls | null>(null);
    const hariIni = tanggalHariIni();

    const hentikanKamera = useCallback(() => {
        kontrolRef.current?.stop();
        kontrolRef.current = null;
        setKameraAktif(false);
    }, []);

    const cari = useCallback(
        (nilai: string) => {
            const bersih = nilai.trim();
            const id = bacaIdKartuSasaran(bersih);
            const ditemukan = sasaran.find(
                (anak) =>
                    (id !== null && String(anak.id) === id) ||
                    anak.nik === bersih.replace(/\D/g, '') ||
                    kodeKartuSasaran(anak).toLowerCase() ===
                        bersih.replace(/\s/g, '').toLowerCase(),
            );
            setKode(bersih);
            setHasil(ditemukan ?? null);
            setPesan(
                ditemukan
                    ? ''
                    : 'Kartu tidak ditemukan pada sasaran yang sudah diterbitkan.',
            );

            return ditemukan ?? null;
        },
        [sasaran],
    );

    const mulaiKamera = () => {
        setPesan('');
        setKameraAktif(true);
    };

    useEffect(() => {
        if (!kameraAktif || videoRef.current === null) {
            return;
        }

        let dibatalkan = false;
        const pembaca = new BrowserQRCodeReader();

        void pembaca
            .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
                if (result !== undefined && cari(result.getText()) !== null) {
                    hentikanKamera();
                }
            })
            .then((kontrol) => {
                if (dibatalkan) {
                    kontrol.stop();
                } else {
                    kontrolRef.current = kontrol;
                }
            })
            .catch(() => {
                if (dibatalkan) {
                    return;
                }

                setKameraAktif(false);
                setPesan(
                    'Kamera tidak dapat dibuka. Izinkan akses kamera atau gunakan kode kartu manual.',
                );
            });

        return () => {
            dibatalkan = true;
            kontrolRef.current?.stop();
            kontrolRef.current = null;
        };
    }, [kameraAktif, cari, hentikanKamera]);
    useEffect(
        () => localStorage.setItem(KUNCI_ANTREAN, JSON.stringify(antrean)),
        [antrean],
    );

    const antreanHariIni = useMemo(
        () => antrean.filter((item) => item.tanggal === hariIni),
        [antrean, hariIni],
    );
    const sudahAntre = hasil
        ? antreanHariIni.some((item) => item.sasaranId === String(hasil.id))
        : false;
    const kekurangan = hasil === null ? [] : kekuranganIdentitas(hasil);

    const masukkanAntrean = () => {
        if (hasil === null || sudahAntre) {
            return;
        }

        const nomor =
            antreanHariIni.reduce(
                (terbesar, item) => Math.max(terbesar, item.nomor),
                0,
            ) + 1;
        setAntrean((lama) => [
            ...lama,
            {
                sasaranId: String(hasil.id),
                nomor,
                tanggal: hariIni,
                masukPada: new Date().toISOString(),
            },
        ]);
    };

    return (
        <Halaman
            ikon={ClipboardCheck}
            judul="Pendaftaran layanan"
            subjudul="Pindai kartu sasaran, periksa kekurangan identitas, lalu masukkan anak ke antrean hari ini."
        >
            <div className="grid max-w-[1180px] gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                    <section className="kartu overflow-hidden">
                        <div className="strip-kartu px-5 py-5 sm:px-6">
                            <h2 className="text-xl font-extrabold">
                                Pindai kartu sasaran
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Kamera membaca QR yang diterbitkan dari menu
                                Kartu sasaran.
                            </p>
                        </div>
                        <div className="space-y-4 p-5 sm:p-6">
                            {kameraAktif && (
                                <div className="relative overflow-hidden rounded-xl bg-foreground">
                                    <video
                                        ref={videoRef}
                                        className="aspect-video w-full object-cover"
                                        muted
                                        playsInline
                                    />
                                    <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/90" />
                                    <button
                                        type="button"
                                        onClick={hentikanKamera}
                                        className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white"
                                        aria-label="Tutup kamera"
                                    >
                                        <X className="size-5" />
                                    </button>
                                </div>
                            )}
                            <div className="flex flex-wrap items-end gap-3">
                                <label className="min-w-64 flex-1">
                                    <span className="text-sm font-semibold text-muted-foreground">
                                        Kode kartu atau NIK
                                    </span>
                                    <input
                                        value={kode}
                                        onChange={(event) => {
                                            setKode(event.target.value);
                                            setHasil(null);
                                            setPesan('');
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                cari(kode);
                                            }
                                        }}
                                        placeholder="Contoh SPT-00000110"
                                        className="isian mt-1.5 w-full"
                                    />
                                </label>
                                <button
                                    type="button"
                                    className="tombol-kedua"
                                    onClick={mulaiKamera}
                                    disabled={kameraAktif}
                                >
                                    <Camera className="size-5" /> Kamera
                                </button>
                                <button
                                    type="button"
                                    className="tombol-utama"
                                    onClick={() => cari(kode)}
                                    disabled={kode.trim() === ''}
                                >
                                    <ScanLine className="size-5" /> Periksa
                                </button>
                            </div>
                            {pesan !== '' && (
                                <p className="flex gap-2 rounded-xl bg-tone-amber/10 p-3 text-sm font-semibold text-tone-amber">
                                    <CircleAlert className="size-5 shrink-0" />{' '}
                                    {pesan}
                                </p>
                            )}
                        </div>
                    </section>

                    {hasil !== null && (
                        <section className="kartu overflow-hidden">
                            <div className="strip-kartu flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
                                <div>
                                    <p className="text-sm font-bold text-primary">
                                        {kodeKartuSasaran(hasil)}
                                    </p>
                                    <h2 className="text-2xl font-extrabold">
                                        {hasil.nama ?? 'Nama belum dicatat'}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {hasil.namaIbu ?? 'Wali belum dicatat'}{' '}
                                        · RT {hasil.rt ?? '—'} · {hasil.umur}
                                    </p>
                                </div>
                                <UserRoundCheck className="size-10 text-primary" />
                            </div>
                            <div className="space-y-4 p-5 sm:p-6">
                                <div>
                                    <h3 className="font-extrabold">
                                        Skrining awal
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Kekurangan bulan sebelumnya ditampilkan
                                        sebelum check-in.
                                    </p>
                                </div>
                                {kekurangan.length === 0 ? (
                                    <p className="flex gap-2 rounded-xl bg-primary/10 p-4 font-semibold text-primary">
                                        <CheckCircle2 className="size-5" />{' '}
                                        Identitas dasar lengkap.
                                    </p>
                                ) : (
                                    <ul className="grid gap-2 sm:grid-cols-2">
                                        {kekurangan.map((item) => (
                                            <li
                                                key={item}
                                                className="flex gap-2 rounded-xl border border-tone-amber/30 bg-tone-amber/10 p-3 text-sm font-semibold"
                                            >
                                                <CircleAlert className="size-5 shrink-0 text-tone-amber" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                <button
                                    type="button"
                                    onClick={masukkanAntrean}
                                    disabled={sudahAntre}
                                    className="tombol-utama w-full justify-center disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                    <CheckCircle2 className="size-5" />
                                    {sudahAntre
                                        ? 'Sudah masuk antrean hari ini'
                                        : 'Konfirmasi dan masukkan antrean'}
                                </button>
                            </div>
                        </section>
                    )}
                </div>

                <section className="kartu h-fit overflow-hidden">
                    <div className="strip-kartu px-5 py-5">
                        <h2 className="text-xl font-extrabold">
                            Antrean pemeriksaan
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {antreanHariIni.length} anak terdaftar hari ini.
                        </p>
                    </div>
                    {antreanHariIni.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                            Belum ada kartu yang dikonfirmasi.
                        </div>
                    ) : (
                        <ol className="divide-y divide-border">
                            {antreanHariIni.map((item) => {
                                const anak = sasaran.find(
                                    (target) =>
                                        String(target.id) === item.sasaranId,
                                );

                                return (
                                    <li
                                        key={`${item.tanggal}-${item.sasaranId}`}
                                        className="flex items-center gap-4 px-5 py-4"
                                    >
                                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-white">
                                            {String(item.nomor).padStart(
                                                2,
                                                '0',
                                            )}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-extrabold">
                                                {anak?.nama ??
                                                    'Sasaran tidak ditemukan'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {anak
                                                    ? kodeKartuSasaran(anak)
                                                    : item.sasaranId}{' '}
                                                · RT {anak?.rt ?? '—'}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-tone-amber/10 px-3 py-1 text-xs font-bold text-tone-amber">
                                            Menunggu
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>
            </div>
        </Halaman>
    );
}

function kekuranganIdentitas(anak: SasaranLayanan): string[] {
    const hasil: string[] = [];

    if (!anak.nikLengkap) {
        hasil.push('NIK anak belum lengkap');
    }

    if (anak.tglLahir === null) {
        hasil.push('Tanggal lahir belum tercatat');
    }

    if (anak.jk === null) {
        hasil.push('Jenis kelamin belum tercatat');
    }

    if (anak.namaIbu === null) {
        hasil.push('Nama orang tua belum tercatat');
    }

    if (anak.nikOrtu === null) {
        hasil.push('NIK orang tua belum tercatat');
    }

    if (anak.rt === null) {
        hasil.push('RT belum tercatat');
    }

    if (anak.anakKe === null) {
        hasil.push('Urutan anak belum tercatat');
    }

    if (anak.bbLahirKg === null) {
        hasil.push('Berat lahir belum tercatat');
    }

    if (anak.pbLahirCm === null) {
        hasil.push('Panjang lahir belum tercatat');
    }

    if (!anak.bukuKia) {
        hasil.push('Buku KIA belum dikonfirmasi');
    }

    if (!anak.imd) {
        hasil.push('IMD belum dikonfirmasi');
    }

    if (anak.imunisasiLengkap !== true) {
        hasil.push('Status imunisasi perlu dikonfirmasi');
    }

    return hasil;
}
