import {
    ArrowUpRight,
    BadgeCheck,
    BookOpen,
    CircleCheck,
    CircleHelp,
    Clock,
    ExternalLink,
    History,
    Megaphone,
    RefreshCw,
    Stethoscope,
    Undo2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import BantuanDetail from '@/components/bantuan-detail';
import DialogGagal from '@/components/dialog-gagal';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';
import type { AntreanKms, CatatanBulanan } from '@/lib/antrean-kms';
import {
    ambilAntreanHariIni,
    ambilRiwayatCatatan,
    konfirmasiSelesaiKms,
    lepasKms,
    panggilKms,
    panggilKmsBerikutnya,
    urutkanAntreanKms,
} from '@/lib/antrean-kms';
import { Link } from '@/lib/nav';

type Props = {
    periodeId: string;
    onSesiBerakhir: () => void;
    demo?: boolean;
    bolehKelola?: boolean;
};

const tanggalHariIni = () =>
    new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

const jam = (iso?: string | null) =>
    iso
        ? new Date(iso).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
          }) + ' WIB'
        : '';

const nomorAntrean = (nomor: number) => `A${String(nomor).padStart(2, '0')}`;

const yaTidak = (nilai: boolean) => (nilai ? 'Ya' : 'Tidak');

/** Label prioritas: 2T+ merah, status gizi kuning. */
function LabelPrioritas({ item }: { item: AntreanKms }) {
    const alasan = item.prioritasKms?.alasan ?? [];

    if (alasan.length === 0) {
        return null;
    }

    return (
        <span className="flex flex-wrap gap-1.5">
            {alasan.map((label) => (
                <span
                    key={label}
                    className={
                        /^\d+T$/.test(label) && label !== '1T'
                            ? 'rounded-full bg-destructive px-2.5 py-0.5 text-xs font-black text-white'
                            : 'rounded-full border border-tone-amber/30 bg-tone-amber-bg px-2.5 py-0.5 text-xs font-bold text-tone-amber'
                    }
                >
                    {label}
                </span>
            ))}
        </span>
    );
}

type Asal = 'pendaftaran' | 'pengukuran' | 'kms';

const ASAL: Record<Asal, { label: string; kelas: string }> = {
    pendaftaran: {
        label: 'Dari pendaftaran',
        kelas: 'border-tone-blue/25 bg-tone-blue-bg text-tone-blue',
    },
    pengukuran: {
        label: 'Dari pengukuran',
        kelas: 'border-tone-amber/30 bg-tone-amber-bg text-tone-amber',
    },
    kms: {
        label: 'Dari KMS',
        kelas: 'border-tone-green/30 bg-tone-green-bg text-tone-green',
    },
};

/** Satu kelompok catatan dengan penanda asal tahapnya. */
function KelompokAsal({
    asal,
    keterangan,
    children,
}: {
    asal: Asal;
    keterangan?: string | null;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface-subtle px-3 py-2">
            <span className="flex flex-wrap items-center gap-2">
                <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-extrabold tracking-wide uppercase ${ASAL[asal].kelas}`}
                >
                    {ASAL[asal].label}
                </span>
                {keterangan && (
                    <span className="text-[11px] text-muted-foreground">
                        {keterangan}
                    </span>
                )}
            </span>
            <div className="flex flex-col gap-1 text-foreground">
                {children}
            </div>
        </div>
    );
}

type IsiPendaftaran = {
    catatan?: string | null;
    masihMenyusui?: boolean | null;
    asiEksklusif?: boolean | null;
    ikutKb?: boolean | null;
    jenisKb?: string | null;
};

const adaPendaftaran = (p: IsiPendaftaran) =>
    !!p.catatan?.trim() ||
    typeof p.masihMenyusui === 'boolean' ||
    typeof p.asiEksklusif === 'boolean' ||
    typeof p.ikutKb === 'boolean';

function IsiPendaftaranKms({ data }: { data: IsiPendaftaran }) {
    const jawaban: string[] = [];

    if (typeof data.masihMenyusui === 'boolean') {
        jawaban.push(`Ibu masih menyusui: ${yaTidak(data.masihMenyusui)}`);
    }

    if (typeof data.asiEksklusif === 'boolean') {
        jawaban.push(`ASI eksklusif: ${yaTidak(data.asiEksklusif)}`);
    }

    if (typeof data.ikutKb === 'boolean') {
        jawaban.push(
            data.ikutKb
                ? `Ibu ber-KB: Ya (${data.jenisKb?.trim() || 'jenis belum diisi'})`
                : 'Ibu ber-KB: Tidak',
        );
    }

    return (
        <>
            {jawaban.length > 0 && (
                <span className="flex flex-wrap gap-1.5">
                    {jawaban.map((teks) => (
                        <span
                            key={teks}
                            className="rounded-full border border-border bg-card px-2.5 py-0.5 font-semibold"
                        >
                            {teks}
                        </span>
                    ))}
                </span>
            )}
            {data.catatan?.trim() && (
                <p>
                    <strong>Catatan:</strong> {data.catatan.trim()}
                </p>
            )}
        </>
    );
}

/** Catatan dari setiap tahap sebelumnya, ditandai asal informasinya. */
function CatatanTahap({
    item,
    ringkas = false,
}: {
    item: AntreanKms;
    ringkas?: boolean;
}) {
    const pencatatan = item.catatanKhusus?.trim();
    const pendaftaran = adaPendaftaran(item);

    if (!pendaftaran && !pencatatan) {
        return ringkas ? null : (
            <p className="text-xs text-muted-foreground">
                Tidak ada catatan dari pendaftaran maupun pengukuran bulan ini.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-2 text-xs sm:text-sm">
            {pendaftaran && (
                <KelompokAsal asal="pendaftaran">
                    <IsiPendaftaranKms data={item} />
                </KelompokAsal>
            )}
            {pencatatan && (
                <KelompokAsal asal="pengukuran">
                    <p>
                        <strong>Catatan / pengamatan khusus:</strong>{' '}
                        {pencatatan}
                    </p>
                </KelompokAsal>
            )}
        </div>
    );
}

const namaBulan = (periode: string) => {
    const [tahun, bulan] = periode.split('-').map(Number);

    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(tahun, bulan - 1, 1)));
};

const CONTOH_RIWAYAT: CatatanBulanan[] = [
    {
        periode: '2026-10',
        tanggal: '2026-10-11',
        pendaftaran: {
            catatan: 'Membawa Buku KIA.',
            masihMenyusui: true,
            asiEksklusif: null,
            ikutKb: true,
            jenisKb: 'Suntik 3 bulan',
        },
        pengukuran: { catatanKhusus: 'BB tidak naik.', catatan: null },
        kms: { catatan: '1T, konseling MP-ASI.', petugasNama: 'Kader KMS 1' },
    },
    {
        periode: '2026-09',
        tanggal: '2026-09-13',
        pendaftaran: {
            catatan: null,
            masihMenyusui: true,
            asiEksklusif: null,
            ikutKb: null,
            jenisKb: null,
        },
        pengukuran: { catatanKhusus: null, catatan: null },
        kms: { catatan: 'Pertumbuhan baik.', petugasNama: null },
    },
];

/** Riwayat catatan per bulan; dimuat saat dibuka agar antrean tetap ringan. */
function RiwayatCatatan({
    anakId,
    onSesiBerakhir,
    demo,
}: {
    anakId: number;
    onSesiBerakhir: () => void;
    demo: boolean;
}) {
    const [terbuka, setTerbuka] = useState(false);
    const [dimuat, setItems] = useState<CatatanBulanan[] | null>(null);
    const [galat, setGalat] = useState<string | null>(null);
    // Mode contoh tidak memanggil server.
    const items = demo ? CONTOH_RIWAYAT : dimuat;

    useEffect(() => {
        if (!terbuka || demo || dimuat !== null) {
            return;
        }

        const kontrol = new AbortController();
        ambilRiwayatCatatan(anakId, kontrol.signal, onSesiBerakhir)
            .then((hasil) => {
                setItems(hasil);
                setGalat(null);
            })
            .catch((error: unknown) => {
                if (kontrol.signal.aborted) {
                    return;
                }

                setGalat(
                    error instanceof Error
                        ? error.message
                        : 'Riwayat catatan gagal dimuat.',
                );
            });

        return () => kontrol.abort();
    }, [terbuka, dimuat, demo, anakId, onSesiBerakhir]);

    return (
        <details
            className="group rounded-xl border border-border bg-card text-xs sm:text-sm"
            onToggle={(e) => setTerbuka(e.currentTarget.open)}
        >
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 font-bold text-foreground">
                <History className="size-4 text-primary" aria-hidden="true" />
                Riwayat catatan per bulan
                <span className="ml-auto text-xs font-semibold text-primary group-open:hidden">
                    Lihat
                </span>
                <span className="ml-auto hidden text-xs font-semibold text-primary group-open:inline">
                    Tutup
                </span>
            </summary>
            <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
                {galat && (
                    <p role="alert" className="text-destructive">
                        {galat}{' '}
                        <button
                            type="button"
                            className="font-bold underline underline-offset-2"
                            onClick={() => {
                                setGalat(null);
                                setItems(null);
                            }}
                        >
                            Coba lagi
                        </button>
                    </p>
                )}
                {!galat && items === null && (
                    <p className="text-muted-foreground">Memuat riwayat…</p>
                )}
                {items?.length === 0 && (
                    <p className="text-muted-foreground">
                        Belum ada catatan di bulan mana pun.
                    </p>
                )}
                {items?.map((bulan) => (
                    <section
                        key={bulan.periode}
                        aria-label={`Catatan ${namaBulan(bulan.periode)}`}
                        className="flex flex-col gap-2"
                    >
                        <h4 className="text-sm font-black text-foreground">
                            {namaBulan(bulan.periode)}
                        </h4>
                        {adaPendaftaran(bulan.pendaftaran) && (
                            <KelompokAsal asal="pendaftaran">
                                <IsiPendaftaranKms data={bulan.pendaftaran} />
                            </KelompokAsal>
                        )}
                        {(bulan.pengukuran.catatanKhusus ||
                            bulan.pengukuran.catatan) && (
                            <KelompokAsal asal="pengukuran">
                                {bulan.pengukuran.catatanKhusus && (
                                    <p>
                                        <strong>
                                            Catatan / pengamatan khusus:
                                        </strong>{' '}
                                        {bulan.pengukuran.catatanKhusus}
                                    </p>
                                )}
                                {bulan.pengukuran.catatan && (
                                    <p>
                                        <strong>Catatan lain:</strong>{' '}
                                        {bulan.pengukuran.catatan}
                                    </p>
                                )}
                            </KelompokAsal>
                        )}
                        {bulan.kms.catatan && (
                            <KelompokAsal
                                asal="kms"
                                keterangan={
                                    bulan.kms.petugasNama
                                        ? `oleh ${bulan.kms.petugasNama}`
                                        : null
                                }
                            >
                                <p>{bulan.kms.catatan}</p>
                            </KelompokAsal>
                        )}
                    </section>
                ))}
            </div>
        </details>
    );
}

function IdentitasAnak({ item }: { item: AntreanKms }) {
    return (
        <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-base font-black text-white shadow-xs">
                {nomorAntrean(item.nomor)}
            </div>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-black text-foreground">
                        {item.nama}
                    </h3>
                    <LabelPrioritas item={item} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    {item.rt ? `RT ${item.rt}` : 'RT belum tercatat'} · Orang
                    tua: {item.namaOrtu ?? '—'}
                </p>
            </div>
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
        catatan: 'Membawa Buku KIA.',
        masihMenyusui: true,
        asiEksklusif: null,
        ikutKb: true,
        jenisKb: 'Pil KB',
        catatanKhusus: 'Anak rewel, batuk pilek sejak 2 hari.',
        prioritasKms: { skor: 1200, jumlahT: 2, alasan: ['2T'] },
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
        kmsPetugasNama: 'Kader KMS 2',
        kmsDipanggilPada: '2026-10-11T08:50:00Z',
        prioritasKms: { skor: 0, jumlahT: 0, alasan: [] },
    },
    {
        id: 'q-demo-4',
        anakId: 4,
        nomor: 4,
        nama: 'Dimas Saputra',
        namaOrtu: 'Ayu Lestari',
        rt: '04',
        status: 'kms_review',
        checkedInAt: '2026-10-11T08:55:00Z',
        prioritasKms: { skor: 200, jumlahT: 0, alasan: ['Gizi kurang'] },
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
        kmsPetugasNama: 'Kader KMS 2',
        catatanKms: '2T, dirujuk ke bidan untuk konseling gizi.',
    },
];

export default function PemeriksaanKms({
    periodeId,
    onSesiBerakhir,
    demo = false,
    bolehKelola = true,
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
    const [sedang, setSedang] = useState<string | null>(null);
    const [pesan, setPesan] = useState<string | null>(null);
    const [versi, setVersi] = useState(0);
    const [itemBerhasil, setItemBerhasil] = useState<string | null>(null);
    // Draf per antrean; tidak ikut terhapus saat daftar dimuat ulang.
    const [catatanKms, setCatatanKms] = useState<Record<string, string>>({});
    const permintaan = useRef(0);
    const aksiAktif = useRef(false);

    const muatUlang = useCallback(() => {
        if (!demo) {
            setVersi((v) => v + 1);
        }
    }, [demo]);

    useEffect(() => {
        if (demo) {
            return;
        }

        const controller = new AbortController();
        let hidup = true;
        const ambil = () => {
            if (aksiAktif.current || document.hidden) {
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
                        aksiAktif.current
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
        // Beberapa petugas KMS bekerja bersamaan; segarkan cukup sering agar
        // status "sedang diperiksa" terlihat oleh kader lain.
        const timer = window.setInterval(ambil, 5_000);

        return () => {
            hidup = false;
            controller.abort();
            window.clearInterval(timer);
        };
    }, [periodeId, versi, onSesiBerakhir, demo]);

    const milikSaya = items.find(
        (item) => item.status === 'kms_review' && item.kmsMilikSaya,
    );
    const menunggu = urutkanAntreanKms(
        items.filter(
            (item) =>
                item.status === 'kms_review' &&
                !item.kmsMilikSaya &&
                !item.kmsPetugasNama,
        ),
    );
    const diperiksaLain = items.filter(
        (item) =>
            item.status === 'kms_review' &&
            !item.kmsMilikSaya &&
            !!item.kmsPetugasNama,
    );
    const selesai = items.filter((item) => item.status === 'done');

    /** Menjalankan aksi satu per satu lalu memuat ulang daftar dari server. */
    const jalankan = async (kunci: string, aksi: () => Promise<void>) => {
        if (aksiAktif.current) {
            return;
        }

        aksiAktif.current = true;
        ++permintaan.current;
        setSedang(kunci);
        setPesan(null);
        setGalat(null);

        try {
            await aksi();
        } catch (error) {
            setGalat(
                (error as Error).message ||
                    'Aksi belum tersimpan. Periksa koneksi, lalu coba lagi.',
            );
        } finally {
            aksiAktif.current = false;
            setSedang(null);
            muatUlang();
        }
    };

    const ubahDemo = (id: string, ubah: Partial<AntreanKms>) =>
        setItems((lama) =>
            lama.map((it) => (it.id === id ? { ...it, ...ubah } : it)),
        );

    const panggil = (item?: AntreanKms) =>
        jalankan(item ? `panggil-${item.id}` : 'berikutnya', async () => {
            if (demo) {
                const target = item ?? menunggu[0];

                if (target) {
                    ubahDemo(target.id, {
                        kmsMilikSaya: true,
                        kmsPetugasNama: 'Anda',
                        kmsDipanggilPada: new Date().toISOString(),
                    });
                }

                return;
            }

            const dipanggil = item
                ? await panggilKms(item.id, onSesiBerakhir)
                : await panggilKmsBerikutnya(periodeId, onSesiBerakhir);
            setPesan(
                dipanggil
                    ? `${nomorAntrean(dipanggil.nomor)} ${dipanggil.nama} dipanggil ke meja KMS Anda.`
                    : 'Tidak ada anak yang menunggu pemeriksaan KMS.',
            );
        });

    const lepas = (item: AntreanKms) =>
        jalankan(`lepas-${item.id}`, async () => {
            if (demo) {
                ubahDemo(item.id, {
                    kmsMilikSaya: false,
                    kmsPetugasNama: null,
                    kmsDipanggilPada: null,
                });

                return;
            }

            await lepasKms(item.id, onSesiBerakhir);
            setPesan(`${item.nama} dikembalikan ke antrean pemeriksaan.`);
        });

    const konfirmasi = (item: AntreanKms) =>
        jalankan(`selesai-${item.id}`, async () => {
            const catatan = catatanKms[item.id]?.trim() ?? '';

            if (demo) {
                ubahDemo(item.id, {
                    status: 'done',
                    kmsMilikSaya: false,
                    catatanKms: catatan || item.catatanKms,
                });
            } else {
                await konfirmasiSelesaiKms(item.id, onSesiBerakhir, catatan);
            }

            setItemBerhasil(item.id);
            setCatatanKms((lama) => {
                const sisa = { ...lama };
                delete sisa[item.id];

                return sisa;
            });
            setPesan(`Pemeriksaan ${item.nama} telah dikonfirmasi selesai.`);
        });

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
                    <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums">
                        <span>
                            Menunggu{' '}
                            <strong className="ml-1">{menunggu.length}</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                            Sedang diperiksa{' '}
                            <strong className="ml-1">
                                {diperiksaLain.length + (milikSaya ? 1 : 0)}
                            </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                            Selesai{' '}
                            <strong className="ml-1">{selesai.length}</strong>
                        </span>
                    </div>

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
                    {status === 'memuat' && (
                        <StateHalaman
                            jenis="memuat"
                            judul="Memuat antrean pemeriksaan…"
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

                    {!bolehKelola && (
                        <p
                            role="status"
                            className="rounded-xl border border-border bg-surface-subtle px-4 py-2.5 text-xs font-medium text-muted-foreground sm:text-sm"
                        >
                            Mode lihat saja untuk Admin Posyandu. Pemanggilan
                            dan konfirmasi selesai pemeriksaan dilakukan oleh
                            petugas KMS.
                        </p>
                    )}
                    {status === 'siap' && bolehKelola && (
                        <section
                            aria-labelledby="judul-meja-saya"
                            className="rounded-2xl border border-primary/30 bg-card p-4.5 shadow-sm sm:p-5"
                        >
                            <div className="mb-3 flex items-center gap-2">
                                <Stethoscope
                                    className="size-4 text-primary"
                                    aria-hidden="true"
                                />
                                <h2
                                    id="judul-meja-saya"
                                    className="text-sm font-extrabold text-foreground"
                                >
                                    Sedang Anda periksa
                                </h2>
                            </div>
                            {milikSaya ? (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <IdentitasAnak item={milikSaya} />
                                        <span className="text-xs text-muted-foreground">
                                            Dipanggil{' '}
                                            {jam(milikSaya.kmsDipanggilPada)}
                                        </span>
                                    </div>
                                    <CatatanTahap item={milikSaya} />
                                    <RiwayatCatatan
                                        key={milikSaya.anakId}
                                        anakId={milikSaya.anakId}
                                        onSesiBerakhir={onSesiBerakhir}
                                        demo={demo}
                                    />
                                    <label className="flex flex-col gap-1.5 text-xs font-bold text-foreground sm:text-sm">
                                        Catatan / pengamatan khusus KMS
                                        <textarea
                                            value={
                                                catatanKms[milikSaya.id] ?? ''
                                            }
                                            onChange={(e) => {
                                                const nilai = e.target.value;
                                                setCatatanKms((lama) => ({
                                                    ...lama,
                                                    [milikSaya.id]: nilai,
                                                }));
                                            }}
                                            maxLength={500}
                                            rows={2}
                                            placeholder="Opsional. Contoh: 2T, 3T, anak sedang sakit, dirujuk ke bidan."
                                            className="min-h-16 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal"
                                        />
                                    </label>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <Link
                                            href={`/balita/${milikSaya.anakId}`}
                                            className="tombol-kedua inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold sm:text-sm"
                                        >
                                            <ExternalLink
                                                className="size-4 text-primary"
                                                aria-hidden="true"
                                            />
                                            Lihat analisis & kurva
                                        </Link>
                                        <button
                                            type="button"
                                            className="tombol-kedua inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold sm:text-sm"
                                            disabled={sedang !== null}
                                            onClick={() =>
                                                void lepas(milikSaya)
                                            }
                                        >
                                            <Undo2
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            Kembalikan ke antrean
                                        </button>
                                        <button
                                            type="button"
                                            className="tombol-utama hover:bg-primary-hover inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-extrabold text-white shadow-sm sm:text-sm"
                                            disabled={sedang !== null}
                                            onClick={() =>
                                                void konfirmasi(milikSaya)
                                            }
                                        >
                                            <CircleCheck
                                                className={`size-4 ${sedang === `selesai-${milikSaya.id}` ? 'motion-safe:animate-spin' : ''}`}
                                                aria-hidden="true"
                                            />
                                            {sedang ===
                                            `selesai-${milikSaya.id}`
                                                ? 'Menyimpan…'
                                                : 'Konfirmasi selesai'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        {menunggu.length > 0
                                            ? 'Panggil anak berikutnya. Anak 2T+ dan dengan status gizi perlu tindak lanjut didahulukan.'
                                            : 'Belum ada anak yang menunggu pemeriksaan KMS.'}
                                    </p>
                                    <button
                                        type="button"
                                        className="tombol-utama hover:bg-primary-hover inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-extrabold text-white shadow-sm"
                                        disabled={
                                            sedang !== null ||
                                            menunggu.length === 0
                                        }
                                        onClick={() => void panggil()}
                                    >
                                        <Megaphone
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        {sedang === 'berikutnya'
                                            ? 'Memanggil…'
                                            : menunggu[0]
                                              ? `Panggil berikutnya · ${nomorAntrean(menunggu[0].nomor)}`
                                              : 'Panggil berikutnya'}
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {status === 'siap' && diperiksaLain.length > 0 && (
                        <section
                            aria-labelledby="judul-diperiksa-lain"
                            className="flex flex-col gap-2.5"
                        >
                            <h2
                                id="judul-diperiksa-lain"
                                className="text-sm font-extrabold text-foreground"
                            >
                                Sedang diperiksa kader lain
                            </h2>
                            {diperiksaLain.map((item) => (
                                <article
                                    key={item.id}
                                    className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <IdentitasAnak item={item} />
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-blue-bg px-3 py-1 text-xs font-bold text-tone-blue">
                                        <Stethoscope
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        Diperiksa {item.kmsPetugasNama}{' '}
                                        {jam(item.kmsDipanggilPada) &&
                                            `· sejak ${jam(item.kmsDipanggilPada)}`}
                                    </span>
                                </article>
                            ))}
                        </section>
                    )}

                    {status === 'siap' && (
                        <section
                            aria-labelledby="judul-antrean-menunggu"
                            className="flex flex-col gap-3"
                        >
                            <h2
                                id="judul-antrean-menunggu"
                                className="text-base font-black text-foreground sm:text-lg"
                            >
                                Antrean pemeriksaan
                            </h2>
                            {menunggu.length === 0 ? (
                                <div className="state-halaman" role="status">
                                    <h3 className="text-lg font-bold">
                                        Belum ada balita dalam antrean
                                    </h3>
                                    <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                                        Anak yang selesai ditimbang dan diukur
                                        akan muncul di sini.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {menunggu.map((item) => (
                                        <article
                                            key={item.id}
                                            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4.5 shadow-xs sm:p-5"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <IdentitasAnak item={item} />
                                                <div className="flex shrink-0 items-center gap-2.5">
                                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                        Menunggu
                                                    </span>
                                                    <Link
                                                        href={`/balita/${item.anakId}`}
                                                        className="tombol-kedua inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold sm:text-sm"
                                                    >
                                                        <ExternalLink
                                                            className="size-3.5 text-primary"
                                                            aria-hidden="true"
                                                        />
                                                        Lihat analisis &amp;
                                                        kurva
                                                    </Link>
                                                    {bolehKelola && (
                                                        <button
                                                            type="button"
                                                            className="tombol-kedua inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold sm:text-sm"
                                                            disabled={
                                                                sedang !==
                                                                    null ||
                                                                !!milikSaya
                                                            }
                                                            title={
                                                                milikSaya
                                                                    ? 'Selesaikan atau kembalikan anak yang sedang Anda periksa terlebih dahulu.'
                                                                    : undefined
                                                            }
                                                            onClick={() =>
                                                                void panggil(
                                                                    item,
                                                                )
                                                            }
                                                        >
                                                            <ArrowUpRight
                                                                className="size-4 text-primary"
                                                                aria-hidden="true"
                                                            />
                                                            Panggil
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <CatatanTahap item={item} ringkas />
                                            <RiwayatCatatan
                                                anakId={item.anakId}
                                                onSesiBerakhir={onSesiBerakhir}
                                                demo={demo}
                                            />
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {status === 'siap' && selesai.length > 0 && (
                        <section
                            aria-labelledby="judul-selesai-kms"
                            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                        >
                            <div className="flex items-center gap-2 border-b border-border bg-surface-subtle px-5 py-3.5">
                                <CircleCheck className="size-4 text-tone-green" />
                                <h2
                                    id="judul-selesai-kms"
                                    className="text-sm font-extrabold text-foreground"
                                >
                                    Sudah selesai diberi penjelasan hari ini (
                                    {selesai.length} balita)
                                </h2>
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
                                                {nomorAntrean(item.nomor)}
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
                                                {item.kmsPetugasNama
                                                    ? `Diperiksa ${item.kmsPetugasNama}`
                                                    : 'Selesai diedukasi'}
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
