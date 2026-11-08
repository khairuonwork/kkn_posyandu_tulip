import {
    BadgeCheck,
    BookOpen,
    CircleCheck,
    CircleHelp,
    Clock,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import BantuanDetail from '@/components/bantuan-detail';
import DialogGagal from '@/components/dialog-gagal';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';
import type { AntreanKms } from '@/lib/antrean-kms';
import { ambilAntreanHariIni, konfirmasiSelesaiKms } from '@/lib/antrean-kms';
import { Link } from '@/lib/nav';

type Props = {
    periodeId: string;
    onSesiBerakhir: () => void;
    demo?: boolean;
};

const tanggalHariIni = () =>
    new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

const yaTidak = (nilai: boolean) => (nilai ? 'Ya' : 'Tidak');

/** Jawaban pendaftaran dan catatan pencatatan dari APK. */
function InfoPendaftaran({ item }: { item: AntreanKms }) {
    const catatan = item.catatanKhusus?.trim();

    if (
        typeof item.masihMenyusui !== 'boolean' &&
        typeof item.asiEksklusif !== 'boolean' &&
        !catatan
    ) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2 text-xs sm:text-sm">
            <div className="flex flex-wrap gap-2 empty:hidden">
                {typeof item.masihMenyusui === 'boolean' && (
                    <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 font-semibold">
                        Ibu masih menyusui:{' '}
                        <strong>{yaTidak(item.masihMenyusui)}</strong>
                    </span>
                )}
                {typeof item.asiEksklusif === 'boolean' && (
                    <span className="rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 font-semibold">
                        ASI eksklusif:{' '}
                        <strong>{yaTidak(item.asiEksklusif)}</strong>
                    </span>
                )}
            </div>
            {catatan && (
                <p className="rounded-xl border border-tone-amber/20 bg-tone-amber-bg px-3 py-2 text-foreground">
                    <strong>Catatan pencatatan:</strong> {catatan}
                </p>
            )}
        </div>
    );
}

const CONTOH_ANTREAN_KMS: AntreanKms[] = [
    {
        id: 'q-demo-1',
        anakId: 2,
        nomor: 1,
        nama: 'Bima Arya Pratama',
        namaOrtu: 'Dewi Lestari',
        rt: '02',
        status: 'kms_review',
        checkedInAt: '2026-10-11T08:30:00Z',
        masihMenyusui: true,
        asiEksklusif: null,
        catatanKhusus: 'Anak rewel, batuk pilek sejak 2 hari.',
    },
    {
        id: 'q-demo-2',
        anakId: 3,
        nomor: 2,
        nama: 'Citra Kirana Putri',
        namaOrtu: 'Rina Marlina',
        rt: '01',
        status: 'kms_review',
        checkedInAt: '2026-10-11T08:42:00Z',
    },
    {
        id: 'q-demo-3',
        anakId: 1,
        nomor: 3,
        nama: 'Aisyah Putri Rahmawati',
        namaOrtu: 'Siti Aminah',
        rt: '01',
        status: 'done',
        checkedInAt: '2026-10-11T08:15:00Z',
        catatanKms: '2T, dirujuk ke bidan untuk konseling gizi.',
    },
];

export default function PemeriksaanKms({
    periodeId,
    onSesiBerakhir,
    demo = false,
}: Props) {
    const [bantuanTerbuka, setBantuanTerbuka] = useState(false);
    const tombolBantuan = useRef<HTMLButtonElement>(null);
    const [items, setItems] = useState<AntreanKms[]>(
        demo ? CONTOH_ANTREAN_KMS : [],
    );
    const [status, setStatus] = useState<'memuat' | 'siap' | 'galat'>(
        demo ? 'siap' : 'memuat',
    );
    const [galat, setGalat] = useState<string | null>(null);
    const [sedangKonfirmasi, setSedangKonfirmasi] = useState<string | null>(
        null,
    );
    const [pesan, setPesan] = useState<string | null>(null);
    const [versi, setVersi] = useState(0);
    const [itemBerhasil, setItemBerhasil] = useState<string | null>(null);
    // Draf per antrean; tidak ikut terhapus saat daftar dimuat ulang tiap 20 detik.
    const [catatanKms, setCatatanKms] = useState<Record<string, string>>({});
    const permintaan = useRef(0);
    const konfirmasiAktif = useRef(false);

    const muatUlang = useCallback(() => {
        if (demo) {
            return;
        }

        setVersi((v) => v + 1);
    }, [demo]);

    useEffect(() => {
        if (demo) {
            return;
        }

        const controller = new AbortController();
        let hidup = true;
        const ambil = () => {
            if (konfirmasiAktif.current) {
                return;
            }

            const urutan = ++permintaan.current;
            void ambilAntreanHariIni(
                periodeId,
                controller.signal,
                onSesiBerakhir,
            )
                .then((data) => {
                    if (
                        !hidup ||
                        urutan !== permintaan.current ||
                        konfirmasiAktif.current
                    ) {
                        return;
                    }

                    setItems(data);
                    setStatus('siap');
                })
                .catch((error: unknown) => {
                    if (
                        !hidup ||
                        urutan !== permintaan.current ||
                        (error as Error).name === 'AbortError'
                    ) {
                        return;
                    }

                    setStatus((lama) => (lama === 'siap' ? lama : 'galat'));
                });
        };
        ambil();
        const timer = window.setInterval(ambil, 20_000);

        return () => {
            hidup = false;
            controller.abort();
            window.clearInterval(timer);
        };
    }, [periodeId, versi, onSesiBerakhir, demo]);

    const menunggu = items.filter((item) => item.status === 'kms_review');
    const selesai = items.filter((item) => item.status === 'done');

    const konfirmasi = async (item: AntreanKms) => {
        if (konfirmasiAktif.current) {
            return;
        }

        konfirmasiAktif.current = true;
        ++permintaan.current;
        setSedangKonfirmasi(item.id);
        setPesan(null);
        setGalat(null);

        if (demo) {
            setItems((lama) =>
                lama.map((it) =>
                    it.id === item.id
                        ? {
                              ...it,
                              status: 'done' as const,
                              catatanKms:
                                  catatanKms[item.id]?.trim() || it.catatanKms,
                          }
                        : it,
                ),
            );
            setPesan(`Simulasi pemeriksaan ${item.nama} selesai.`);
            setItemBerhasil(item.id);
            setSedangKonfirmasi(null);
            konfirmasiAktif.current = false;

            return;
        }

        try {
            const catatan = catatanKms[item.id]?.trim() ?? '';
            await konfirmasiSelesaiKms(item.id, onSesiBerakhir, catatan);
            setItems((lama) =>
                lama.map((it) =>
                    it.id === item.id
                        ? {
                              ...it,
                              status: 'done',
                              catatanKms: catatan || it.catatanKms,
                          }
                        : it,
                ),
            );
            setCatatanKms((lama) => {
                const sisa = { ...lama };
                delete sisa[item.id];

                return sisa;
            });
            setItemBerhasil(item.id);
            setPesan(`Pemeriksaan ${item.nama} telah dikonfirmasi selesai.`);
        } catch {
            setGalat(
                'Konfirmasi belum tersimpan. Periksa koneksi, lalu coba lagi.',
            );
        } finally {
            konfirmasiAktif.current = false;
            setSedangKonfirmasi(null);
        }
    };

    return (
        <Halaman
            judul="Pemeriksaan KMS"
            subjudul={tanggalHariIni()}
            ikon={BadgeCheck}
            penuh="lg"
            aksi={
                <>
                    <button
                        type="button"
                        ref={tombolBantuan}
                        aria-expanded={bantuanTerbuka}
                        aria-controls="bantuan-detail"
                        className="tombol-kedua"
                        onClick={() => setBantuanTerbuka(!bantuanTerbuka)}
                    >
                        <CircleHelp className="size-4" aria-hidden="true" />
                        Bantuan
                    </button>
                    <button
                        type="button"
                        onClick={muatUlang}
                        className="tombol-kedua inline-flex items-center gap-2"
                        aria-label="Muat ulang antrean KMS"
                    >
                        <RefreshCw
                            className={`size-4 ${status === 'memuat' ? 'motion-safe:animate-spin' : ''}`}
                            aria-hidden="true"
                        />
                        <span>Muat ulang antrean</span>
                    </button>
                </>
            }
        >
            <div
                className={
                    bantuanTerbuka
                        ? 'detail-area kms-area bantuan-terbuka'
                        : 'detail-area kms-area'
                }
            >
                <div className="detail-utama flex flex-1 flex-col gap-5">
                    {/* Ringkasan antrean hari ini */}
                    <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums">
                        <span>
                            Menunggu{' '}
                            <strong className="ml-1">{menunggu.length}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                            Selesai{' '}
                            <strong className="ml-1">{selesai.length}</strong>
                        </span>
                    </div>

                    {/* Notifikasi Status Aksi */}
                    {pesan && (
                        <div
                            role="status"
                            className="pesan-masuk flex items-center gap-3 rounded-xl border border-tone-green/20 bg-tone-green-bg px-4.5 py-3 text-sm font-semibold text-tone-green shadow-2xs"
                        >
                            <CircleCheck className="size-5 shrink-0" />
                            <span className="flex-1">{pesan}</span>
                        </div>
                    )}
                    {galat && status === 'siap' && (
                        <DialogGagal
                            pesan={galat}
                            onTutup={() => setGalat(null)}
                            animasiDialog
                        />
                    )}
                    {status === 'galat' && (
                        <StateHalaman
                            jenis="galat"
                            judul="Antrean belum dapat dimuat"
                            pesan="Periksa koneksi, lalu coba lagi."
                        >
                            <button
                                type="button"
                                className="mt-1 font-bold text-tone-amber underline underline-offset-2 hover:opacity-80"
                                onClick={muatUlang}
                            >
                                Coba muat ulang
                            </button>
                        </StateHalaman>
                    )}

                    {/* Antrean Anak Menunggu Penjelasan */}
                    <section
                        aria-labelledby="judul-antrean-menunggu"
                        className="flex flex-col gap-3"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h2
                                    id="judul-antrean-menunggu"
                                    className="text-base font-black text-foreground sm:text-lg"
                                >
                                    Antrean pemeriksaan
                                </h2>
                            </div>
                        </div>

                        {status === 'memuat' && (
                            <StateHalaman
                                jenis="memuat"
                                judul="Memuat antrean pemeriksaan…"
                            />
                        )}

                        {status === 'siap' && menunggu.length === 0 && (
                            <div className="state-halaman" role="status">
                                <h3 className="text-lg font-bold">
                                    Belum ada balita dalam antrean
                                </h3>
                                <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                                    Anak yang selesai ditimbang dan diukur akan
                                    muncul di sini.
                                </p>
                            </div>
                        )}

                        {status === 'siap' && menunggu.length > 0 && (
                            <div className="grid gap-3.5">
                                {menunggu.map((item) => (
                                    <article
                                        key={item.id}
                                        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4.5 shadow-xs transition-shadow hover:shadow-md sm:p-5"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-start gap-4">
                                                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-base font-black text-white shadow-xs">
                                                    A
                                                    {String(
                                                        item.nomor,
                                                    ).padStart(2, '0')}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="truncate text-base font-black text-foreground">
                                                            {item.nama}
                                                        </h3>
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-tone-amber/20 bg-tone-amber-bg px-2.5 py-0.5 text-xs font-bold text-tone-amber">
                                                            <Clock className="size-3" />
                                                            Menunggu penjelasan
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                                                        <span className="font-semibold text-foreground">
                                                            {item.rt
                                                                ? `RT ${item.rt}`
                                                                : 'RT belum tercatat'}
                                                        </span>
                                                        <span>·</span>
                                                        <span>
                                                            Orang tua:{' '}
                                                            {item.namaOrtu ??
                                                                '—'}
                                                        </span>
                                                        <span>·</span>
                                                        <span className="text-[11px] text-muted-foreground/80">
                                                            Check-in:{' '}
                                                            {new Date(
                                                                item.checkedInAt,
                                                            ).toLocaleTimeString(
                                                                'id-ID',
                                                                {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                },
                                                            )}{' '}
                                                            WIB
                                                        </span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-border pt-2 sm:border-t-0 sm:pt-0">
                                                <Link
                                                    href={`/balita/${item.anakId}`}
                                                    className="tombol-kedua inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold sm:text-sm"
                                                >
                                                    <ExternalLink
                                                        className="size-4 text-primary"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        Lihat analisis & kurva
                                                    </span>
                                                </Link>
                                                <button
                                                    type="button"
                                                    className="tombol-utama hover:bg-primary-hover inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-all active:scale-95 sm:text-sm"
                                                    disabled={
                                                        sedangKonfirmasi !==
                                                        null
                                                    }
                                                    onClick={() =>
                                                        void konfirmasi(item)
                                                    }
                                                >
                                                    <CircleCheck
                                                        className={`size-4 ${sedangKonfirmasi === item.id ? 'motion-safe:animate-spin' : ''}`}
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        {sedangKonfirmasi ===
                                                        item.id
                                                            ? 'Menyimpan…'
                                                            : 'Konfirmasi selesai'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                        <InfoPendaftaran item={item} />
                                        <label className="flex flex-col gap-1.5 text-xs font-bold text-foreground sm:text-sm">
                                            Catatan / pengamatan khusus KMS
                                            <textarea
                                                value={
                                                    catatanKms[item.id] ?? ''
                                                }
                                                onChange={(e) => {
                                                    const nilai =
                                                        e.target.value;
                                                    setCatatanKms((lama) => ({
                                                        ...lama,
                                                        [item.id]: nilai,
                                                    }));
                                                }}
                                                maxLength={500}
                                                rows={2}
                                                placeholder="Opsional. Contoh: 2T, 3T, anak sedang sakit, dirujuk ke bidan."
                                                className="min-h-16 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal"
                                            />
                                            <span className="text-[11px] font-normal text-muted-foreground">
                                                Tersimpan saat Konfirmasi
                                                selesai. Catatan tumbuh kembang
                                                tetap diisi di kartu balita.
                                            </span>
                                        </label>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Selesai Diberi Penjelasan Hari Ini */}
                    {status === 'siap' && selesai.length > 0 && (
                        <section
                            aria-labelledby="judul-selesai-kms"
                            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                        >
                            <div className="flex items-center justify-between border-b border-border bg-surface-subtle px-5 py-3.5">
                                <div className="flex items-center gap-2">
                                    <CircleCheck className="size-4 text-tone-green" />
                                    <h2
                                        id="judul-selesai-kms"
                                        className="text-sm font-extrabold text-foreground"
                                    >
                                        Sudah Selesai Diberi Penjelasan Hari Ini
                                        ({selesai.length} Balita)
                                    </h2>
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground">
                                    Terverifikasi Meja 4
                                </span>
                            </div>
                            <ul className="divide-y divide-border">
                                {selesai.map((item) => (
                                    <li
                                        key={item.id}
                                        className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-surface-subtle/50 ${itemBerhasil === item.id ? 'kms-item-berhasil' : ''}`}
                                        onAnimationEnd={() =>
                                            setItemBerhasil((id) =>
                                                id === item.id ? null : id,
                                            )
                                        }
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface-subtle text-xs font-extrabold text-foreground">
                                                A
                                                {String(item.nomor).padStart(
                                                    2,
                                                    '0',
                                                )}
                                            </span>
                                            <span className="font-bold text-foreground">
                                                {item.nama}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                (
                                                {item.rt
                                                    ? `RT ${item.rt}`
                                                    : 'RT —'}{' '}
                                                · Orang tua:{' '}
                                                {item.namaOrtu ?? '—'})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-tone-green-bg px-2.5 py-0.5 text-xs font-bold text-tone-green">
                                                <CircleCheck className="size-3" />
                                                Selesai diedukasi
                                            </span>
                                            <Link
                                                href={`/balita/${item.anakId}`}
                                                className="ml-2 text-xs font-bold text-primary underline underline-offset-2 hover:opacity-80"
                                            >
                                                Buka kartu
                                            </Link>
                                        </div>
                                        {item.catatanKms && (
                                            <p className="w-full text-xs text-muted-foreground">
                                                <strong className="text-foreground">
                                                    Catatan KMS:
                                                </strong>{' '}
                                                {item.catatanKms}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
                <BantuanDetail
                    bagian="kms"
                    terbuka={bantuanTerbuka}
                    onTutup={() => {
                        setBantuanTerbuka(false);
                        tombolBantuan.current?.focus();
                    }}
                >
                    <section
                        aria-labelledby="judul-panduan-kms"
                        className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/5 via-primary/3 to-transparent p-5 shadow-xs sm:p-6"
                    >
                        <div className="flex items-start gap-4">
                            <div className="hidden shrink-0 rounded-xl bg-primary/10 p-3 text-primary sm:flex">
                                <BookOpen
                                    className="size-6"
                                    strokeWidth={2.25}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h2
                                        id="judul-panduan-kms"
                                        className="text-base font-black tracking-tight text-foreground sm:text-lg"
                                    >
                                        Panduan Praktis Kader Meja 4 (Penyuluhan
                                        & Penjelasan KMS)
                                    </h2>
                                    <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
                                        Meja 4
                                    </span>
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                    Meja 4 bertugas menjelaskan arah garis
                                    pertumbuhan anak pada grafik KMS buku KIA,
                                    memberikan konseling pemenuhan gizi seimbang
                                    serta PMT lokal, dan mencatat rujukan jika
                                    balita terindikasi tidak naik bobot badannya
                                    (1T / 2T+).
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
                                        <div className="flex items-center gap-2">
                                            <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                                                1
                                            </span>
                                            <p className="text-xs font-bold text-foreground">
                                                Baca Grafik & Status Gizi
                                            </p>
                                        </div>
                                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                            Buka profil balita untuk meninjau
                                            arah garis kurva KMS (N: Naik / T:
                                            Tidak Naik) serta indeks Z-score
                                            BB/U, TB/U, dan BB/TB terkini.
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
                                        <div className="flex items-center gap-2">
                                            <span className="flex size-6 items-center justify-center rounded-lg bg-tone-amber-bg text-xs font-black text-tone-amber">
                                                2
                                            </span>
                                            <p className="text-xs font-bold text-foreground">
                                                Konseling & Edukasi Ortu
                                            </p>
                                        </div>
                                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                            Jelaskan tren berat badan secara
                                            ramah, anjurkan variasi protein
                                            hewani / ASI eksklusif, serta
                                            diskusikan langkah pemulihan jika 1T
                                            atau 2T+.
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
                                        <div className="flex items-center gap-2">
                                            <span className="flex size-6 items-center justify-center rounded-lg bg-tone-green-bg text-xs font-black text-tone-green">
                                                3
                                            </span>
                                            <p className="text-xs font-bold text-foreground">
                                                Konfirmasi Selesai Antrean
                                            </p>
                                        </div>
                                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                            Setelah penjelasan dan buku KIA
                                            terisi tuntas, tekan tombol{' '}
                                            <strong>Konfirmasi Selesai</strong>{' '}
                                            agar slot antrean berpindah ke anak
                                            berikutnya.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </BantuanDetail>
            </div>
        </Halaman>
    );
}
