import {
    BadgeCheck,
    CircleAlert,
    CircleCheck,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Halaman from '@/components/halaman';
import { ambilAntreanHariIni, konfirmasiSelesaiKms } from '@/lib/antrean-kms';
import type { AntreanKms } from '@/lib/antrean-kms';
import { Link } from '@/lib/nav';

type Props = {
    periodeId: string;
    onSesiBerakhir: () => void;
};

const tanggalHariIni = () =>
    new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

export default function PemeriksaanKms({ periodeId, onSesiBerakhir }: Props) {
    const [items, setItems] = useState<AntreanKms[]>([]);
    const [status, setStatus] = useState<'memuat' | 'siap' | 'galat'>('memuat');
    const [galat, setGalat] = useState<string | null>(null);
    const [sedangKonfirmasi, setSedangKonfirmasi] = useState<string | null>(
        null,
    );
    const [pesan, setPesan] = useState<string | null>(null);
    const [versi, setVersi] = useState(0);
    const muatUlang = useCallback(() => {
        setStatus('memuat');
        setVersi((v) => v + 1);
    }, []);

    useEffect(() => {
        if (!periodeId) {
            return;
        }

        const controller = new AbortController();
        let hidup = true;
        void ambilAntreanHariIni(periodeId, controller.signal, onSesiBerakhir)
            .then((data) => {
                if (!hidup) {
return;
}

                setItems(data);
                setStatus('siap');
                setGalat(null);
            })
            .catch((error: unknown) => {
                if (!hidup || (error as Error).name === 'AbortError') {
return;
}

                setStatus('galat');
                setGalat(
                    error instanceof Error
                        ? error.message
                        : 'Data antrean belum tersedia.',
                );
            });
        const timer = window.setInterval(muatUlang, 20_000);

        return () => {
            hidup = false;
            controller.abort();
            window.clearInterval(timer);
        };
    }, [periodeId, versi, onSesiBerakhir, muatUlang]);

    const menunggu = items.filter((item) => item.status === 'kms_review');
    const selesai = items.filter((item) => item.status === 'done');

    const konfirmasi = async (item: AntreanKms) => {
        setSedangKonfirmasi(item.id);
        setPesan(null);

        try {
            await konfirmasiSelesaiKms(item.id, onSesiBerakhir);
            setPesan(`${item.nama} sudah dikonfirmasi selesai.`);
            muatUlang();
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Konfirmasi belum tersimpan.',
            );
        } finally {
            setSedangKonfirmasi(null);
        }
    };

    return (
        <Halaman
            judul="Pemeriksaan KMS"
            subjudul={`${tanggalHariIni()} · ${menunggu.length} anak menunggu penjelasan`}
            ikon={BadgeCheck}
            penuh="lg"
            aksi={
                <button
                    type="button"
                    onClick={muatUlang}
                    className="tombol-kedua"
                    aria-label="Muat ulang antrean KMS"
                >
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Muat ulang
                </button>
            }
        >
            <div className="flex flex-1 flex-col gap-5">
                <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <h2 className="text-lg font-bold">
                        Anak menunggu penjelasan
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                        Buka profil untuk membaca hasil ukur, status gizi, dan
                        kurva KMS. Setelah hasil dijelaskan kepada orang tua,
                        konfirmasi selesai agar slot antrean dapat dipakai anak
                        berikutnya.
                    </p>
                </section>

                {pesan && (
                    <p
                        role="status"
                        className="flex items-center gap-2 rounded-lg bg-tone-green-bg px-4 py-3 text-sm font-semibold text-tone-green"
                    >
                        <CircleCheck className="size-4" />
                        {pesan}
                    </p>
                )}
                {galat && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-lg border border-tone-amber px-4 py-3 text-sm"
                    >
                        <CircleAlert className="mt-0.5 size-4 shrink-0 text-tone-amber" />
                        <div className="flex-1">
                            <p className="font-semibold">{galat}</p>
                            <button
                                type="button"
                                className="mt-1 font-bold underline underline-offset-2"
                                onClick={muatUlang}
                            >
                                Coba muat ulang
                            </button>
                        </div>
                    </div>
                )}

                {periodeId && status === 'memuat' && (
                    <div
                        aria-live="polite"
                        className="flex min-h-48 items-center justify-center rounded-xl border border-border bg-surface-subtle text-muted-foreground"
                    >
                        Memuat antrean KMS…
                    </div>
                )}
                {!periodeId && (
                    <div
                        role="status"
                        className="rounded-xl border border-tone-amber bg-tone-amber-bg p-5 text-sm text-tone-amber"
                    >
                        Belum ada periode layanan aktif. Minta admin membuat
                        atau membuka periode sebelum pemeriksaan KMS dimulai.
                    </div>
                )}
                {periodeId && status === 'siap' && menunggu.length === 0 && (
                    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-subtle px-6 text-center">
                        <BadgeCheck
                            className="size-9 text-primary"
                            aria-hidden="true"
                        />
                        <h2 className="mt-3 text-lg font-bold">
                            Belum ada anak menunggu KMS
                        </h2>
                        <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                            Anak akan muncul di sini setelah kader menyimpan
                            hasil pengukuran dari aplikasi.
                        </p>
                    </div>
                )}
                {periodeId && status === 'siap' && menunggu.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <ul className="divide-y divide-border">
                            {menunggu.map((item) => (
                                <li
                                    key={item.id}
                                    className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-extrabold text-primary-foreground">
                                                A
                                                {String(item.nomor).padStart(
                                                    2,
                                                    '0',
                                                )}
                                            </span>
                                            <h3 className="truncate font-bold">
                                                {item.nama}
                                            </h3>
                                            <span className="rounded-full bg-tone-amber-bg px-2.5 py-1 text-xs font-semibold text-tone-amber">
                                                Menunggu penjelasan
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {item.rt
                                                ? `RT ${item.rt}`
                                                : 'RT belum tercatat'}
                                            {item.namaOrtu
                                                ? ` · Orang tua: ${item.namaOrtu}`
                                                : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href={`/balita/${item.anakId}`}
                                            className="tombol-kedua"
                                        >
                                            <ExternalLink
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            Lihat analisis
                                        </Link>
                                        <button
                                            type="button"
                                            className="tombol-utama"
                                            disabled={sedangKonfirmasi !== null}
                                            onClick={() =>
                                                void konfirmasi(item)
                                            }
                                        >
                                            <CircleCheck
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            {sedangKonfirmasi === item.id
                                                ? 'Menyimpan…'
                                                : 'Konfirmasi selesai'}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {periodeId && status === 'siap' && selesai.length > 0 && (
                    <section
                        aria-label="Sudah selesai"
                        className="overflow-hidden rounded-xl border border-border bg-card"
                    >
                        <h2 className="border-b border-border px-5 py-3 text-sm font-bold text-muted-foreground">
                            Sudah selesai hari ini · {selesai.length}
                        </h2>
                        <ul className="divide-y divide-border">
                            {selesai.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-center gap-3 px-5 py-3 text-sm"
                                >
                                    <CircleCheck className="size-4 shrink-0 text-tone-green" />
                                    <span className="font-semibold">
                                        A{String(item.nomor).padStart(2, '0')}
                                    </span>
                                    <span>{item.nama}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        Selesai
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </Halaman>
    );
}
