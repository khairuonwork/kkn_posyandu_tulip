/**
 * Data Balita — docs/riwayat/layar-demo.md bagian 6.4, tampilan Prototipe v2.
 *
 * Membuktikan bahwa mencari seorang anak butuh beberapa detik, bukan membuka
 * dua belas berkas Excel — dan sejak v2, bahwa memperbaiki satu angka salah
 * tidak perlu meninggalkan daftarnya.
 */

import {
    Baby,
    ClipboardCheck,
    ChevronDown,
    ChevronRight,
    Clock,
    FilterX,
    Pencil,
    RotateCcw,
    Search,
    SearchX,
    TriangleAlert,
    UserPlus,
    RefreshCw,
    Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';
import StatusGiziBadge, { nadaKategori } from '@/components/status-gizi-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeadUrut,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    angka,
    KOSONG,
    labelIndeks,
    namaTampil,
    tanggalRingkas,
    umurRingkas,
    zScore,
} from '@/lib/format';
import { kategoriDariZ } from '@/lib/kategori';
import { Link } from '@/lib/nav';
import { hitungZ, susunTabel } from '@/lib/z-score';
import type { BarisLms } from '@/lib/z-score';
import type { Indeks, JenisKelamin, Peran, Periode } from '@/types/posyandu';

export type BarisAnak = {
    anakId: number;
    aktifPeriode?: boolean;
    nama: string | null;
    nik: string | null;
    nikLengkap: boolean;
    jk: JenisKelamin | null;
    umurBulan: number | null;
    rt: string | null;
    namaOrtu: string | null;
    tanggalUkurTerakhir: string | null;
    /** Kategori BB/TB saja — bukan alasan anak ini ditandai. */
    kategoriGizi: string | null;
    perluPerhatian: boolean;
    /**
     * Risiko yang dibawa sejak lahir, atau null.
     *
     * Berat lahir rendah dan tidak punya Buku KIA — keduanya sudah tercatat di
     * arsip sejak impor dan tidak pernah sekali pun muncul di layar. Keduanya
     * menaikkan kewaspadaan pada anak yang hari ini berstatus gizi baik.
     */
    risikoLahir: string | null;
    /** Indeks yang memicu penanda perhatian: bisa BB/U atau TB/U, bukan BB/TB. */
    indeksPemicu: Indeks | null;
    kategoriPemicu: string | null;
    /** Null berarti tidak ada pengukuran pada periode ini, bukan nol. */
    bbKg: number | null;
    tinggiCm: number | null;
};

/**
 * Perubahan data satu balita. Editor baris di Data Balita mengisi identitas
 * dasar dan angka ukurnya; dialog Ubah data di Detail Balita mengisi identitas
 * lengkap tanpa angka ukur. Kolom yang tidak diisi tidak diubah.
 */
export type PatchAnak = {
    nama: string;
    nik: string;
    namaOrtu: string;
    rt: string;
    bbKg?: number | null;
    tinggiCm?: number | null;
    jk?: JenisKelamin;
    tglLahir?: string;
    anakKe?: number | null;
    bbLahirKg?: number | null;
    bukuKia?: boolean;
    /** Nomor WhatsApp orang tua; belum ada kolomnya di arsip. */
    noWa?: string;
    kbIbu?: boolean | null;
    desil?: number | null;
    periodeId?: string;
};

export type AnakBaru = {
    nama: string;
    tglLahir: string;
    jk: JenisKelamin;
    namaOrtu: string;
    rt: string;
};

type Props = {
    anak: BarisAnak[];
    wilayahRt: string[];
    rw: string;
    peran: Peran;
    /** Kader terkunci ke RT binaannya; null berarti bebas memilih. */
    rtTerkunci: string | null;
    periode: Periode;
    /**
     * Tabel LMS WHO untuk pratinjau z-score saat mengetik. Tanpa ini editor
     * tetap jalan, hanya angka gizinya yang menunggu sampai disimpan.
     */
    standarLms?: BarisLms[];
    onSimpanAnak?: (anakId: number, patch: PatchAnak) => void;
    onTambahAnak?: (baru: AnakBaru) => void;
    sumberData?: 'live' | 'contoh';
    statusMuat?: 'memuat' | 'siap' | 'galat';
    pesanGalat?: string | null;
    onMuatUlang?: () => void;
};

/** `RT 01` … `RT 07`, bukan `RT 1`. */
function labelRt(rt: string): string {
    return `RT ${rt.padStart(2, '0')}`;
}

function tanggalLokalISO(): string {
    const tanggal = new Date();

    return `${tanggal.getFullYear()}-${String(tanggal.getMonth() + 1).padStart(2, '0')}-${String(tanggal.getDate()).padStart(2, '0')}`;
}

/** Titik desimal maupun koma diterima; kader mengetik apa yang tertera di alat. */
function keAngka(teks: string): number | null {
    const bersih = teks.trim().replace(',', '.');

    if (bersih === '') {
        return null;
    }

    const n = Number(bersih);

    return Number.isFinite(n) ? n : null;
}

/**
 * Alasan baris ini ditandai, saat alasannya bukan BB/TB.
 *
 * Kolom `Status terakhir` hanya membaca BB/TB; penanda perhatian membaca ketiga
 * indeks. Tanpa baris ini, menyalakan "Hanya yang perlu perhatian" memulangkan
 * sepuluh anak yang tujuh di antaranya berlabel `Gizi baik` - kolom yang
 * seharusnya menjawab "kenapa dia di sini" justru berkata dia tidak apa-apa,
 * dan penandanya terbaca rusak.
 */
function Pemicu({ baris }: { baris: BarisAnak }) {
    if (
        !baris.perluPerhatian ||
        baris.indeksPemicu === null ||
        baris.indeksPemicu === 'BB_TB' ||
        baris.kategoriPemicu === null
    ) {
        return null;
    }

    return (
        <span className="block text-xs font-semibold text-tone-amber">
            Ditandai: {baris.kategoriPemicu} (
            {labelIndeks(baris.indeksPemicu, baris.umurBulan)})
        </span>
    );
}

/**
 * Risiko sejak lahir pada satu baris.
 *
 * Nada biru, bukan oranye: ini riwayat, bukan vonis bulan ini. Anak BBLR yang
 * hari ini gizi baik tetap gizi baik — yang ditambahkan hanya alasan untuk
 * memperhatikannya lebih lama.
 */
function Risiko({ baris }: { baris: BarisAnak }) {
    if (baris.risikoLahir === null) {
        return null;
    }

    return (
        <span className="inline-flex items-center rounded bg-tone-blue-bg px-2 py-0.5 text-xs font-bold text-tone-blue">
            Riwayat: {baris.risikoLahir.replace(/^Riwayat:\s*/i, '')}
        </span>
    );
}

type KolomUrut = 'nama' | 'umur' | 'rt' | 'tanggal' | 'status';

/** Status riwayat paling mendesak di atas saat kolom diurutkan naik. */
const PERINGKAT_NADA = { merah: 0, oranye: 1, biru: 2, hijau: 3, netral: 4 };

const LABEL_URUT: Record<KolomUrut, string> = {
    nama: 'Nama balita',
    umur: 'Umur',
    rt: 'RT',
    tanggal: 'Tanggal ukur',
    status: 'Status terakhir',
};

function bandingkan(a: BarisAnak, b: BarisAnak, kolom: KolomUrut): number {
    switch (kolom) {
        case 'umur':
            return (a.umurBulan ?? -1) - (b.umurBulan ?? -1);

        case 'rt':
            return Number(a.rt ?? 99) - Number(b.rt ?? 99);

        case 'tanggal':
            return (a.tanggalUkurTerakhir ?? '').localeCompare(
                b.tanggalUkurTerakhir ?? '',
            );

        case 'status':
            return (
                PERINGKAT_NADA[nadaKategori(a.kategoriGizi)] -
                PERINGKAT_NADA[nadaKategori(b.kategoriGizi)]
            );

        default:
            return (a.nama ?? '').localeCompare(b.nama ?? '');
    }
}

export default function DaftarAnak({
    anak,
    wilayahRt,
    rw,
    peran,
    rtTerkunci,
    periode,
    standarLms,
    onSimpanAnak,
    onTambahAnak,
    sumberData = 'contoh',
    statusMuat = 'siap',
    pesanGalat,
    onMuatUlang,
}: Props) {
    const [cariSemua, setCariSemua] = useState('');
    const [cariHariIni, setCariHariIni] = useState('');
    const [tabAktif, setTabAktif] = useState<'hari-ini' | 'semua'>('semua');
    const [rt, setRt] = useState(rtTerkunci ?? '');
    const [lingkup, setLingkup] = useState('aktif');
    const [hanyaPerhatian, setHanyaPerhatian] = useState(false);
    const [hanyaRisiko, setHanyaRisiko] = useState(false);
    const [dibuka, setDibuka] = useState<number | null>(null);
    const [menambah, setMenambah] = useState(false);
    const [urut, setUrut] = useState<{ kolom: KolomUrut; naik: boolean }>({
        kolom: 'nama',
        naik: true,
    });

    // Portal live hanya membaca data induk. Penambahan massal dilakukan lewat
    // Sasaran & Impor, sedangkan pencatatan lapangan dilakukan di Android.
    // Jangan tampilkan editor memori milik demo sebagai tindakan sungguhan.
    const bolehUbah = peran !== 'kader' && sumberData === 'contoh';
    const rtAktif = rtTerkunci ?? rt;
    const kataCari = tabAktif === 'hari-ini' ? cariHariIni : cariSemua;
    const hariIni = tanggalLokalISO();
    // Kader hanya pernah melihat RT binaannya. Menyebut jumlah se-RW di
    // subjudulnya membuat dua angka berbeda berdiri 40 px bersebelahan.
    const terlihat =
        rtTerkunci === null ? anak : anak.filter((b) => b.rt === rtTerkunci);
    const lingkupRt = rtAktif === '' ? 'seluruh RT' : labelRt(rtAktif);
    const adaSaringan =
        kataCari.trim() !== '' ||
        (rtTerkunci === null && rtAktif !== '') ||
        hanyaPerhatian ||
        hanyaRisiko;

    // 906 baris standar hanya perlu disusun sekali, bukan tiap ketukan papan
    // tombol di dalam editor.
    const tabelLms = useMemo(
        () => (standarLms === undefined ? null : susunTabel(standarLms)),
        [standarLms],
    );

    const hasil = useMemo(() => {
        const kunci = kataCari.trim().toLowerCase();

        return anak
            .filter((baris) => {
                if (
                    lingkup === 'aktif' &&
                    !(
                        baris.aktifPeriode ??
                        (baris.umurBulan !== null && baris.umurBulan < 60)
                    )
                ) {
                    return false;
                }

                if (rtAktif !== '' && baris.rt !== rtAktif) {
                    return false;
                }

                if (hanyaPerhatian && !baris.perluPerhatian) {
                    return false;
                }

                if (hanyaRisiko && baris.risikoLahir === null) {
                    return false;
                }

                // Pencarian mencocokkan nama balita maupun nama ibu — itu
                // cara kader mengingat.
                const sasaran =
                    `${baris.nama ?? ''} ${baris.namaOrtu ?? ''}`.toLowerCase();

                return kunci === '' || sasaran.includes(kunci);
            })
            .sort(
                (a, b) =>
                    (urut.naik ? 1 : -1) * bandingkan(a, b, urut.kolom) ||
                    (a.nama ?? '').localeCompare(b.nama ?? ''),
            );
    }, [anak, kataCari, rtAktif, hanyaPerhatian, hanyaRisiko, urut, lingkup]);

    const anakDalamLingkup =
        rtTerkunci !== null
            ? anak.filter((baris) => baris.rt === rtTerkunci)
            : rtAktif === ''
              ? anak
              : anak.filter((baris) => baris.rt === rtAktif);
    const anakLingkupAktif = anakDalamLingkup.filter(
        (baris) =>
            lingkup !== 'aktif' ||
            (baris.aktifPeriode ??
                (baris.umurBulan !== null && baris.umurBulan < 60)),
    );
    const jumlahHariIni = anakLingkupAktif.filter(
        (baris) => baris.tanggalUkurTerakhir === hariIni,
    ).length;
    const jumlahDiukurPeriode = anakLingkupAktif.filter(
        (baris) =>
            periode.id !== '' &&
            baris.tanggalUkurTerakhir !== null &&
            baris.tanggalUkurTerakhir.startsWith(periode.id),
    ).length;
    const jumlahPerhatian = anakLingkupAktif.filter(
        (baris) => baris.perluPerhatian,
    ).length;
    const jumlahRisiko = anakLingkupAktif.filter(
        (baris) => baris.risikoLahir !== null,
    ).length;
    const jumlahAktif = anakDalamLingkup.filter(
        (b) => b.aktifPeriode ?? (b.umurBulan !== null && b.umurBulan < 60),
    ).length;
    const hasilTampil =
        tabAktif === 'hari-ini'
            ? hasil.filter((baris) => baris.tanggalUkurTerakhir === hariIni)
            : hasil;

    const keteranganUrut =
        urut.kolom === 'nama'
            ? `urut nama ${urut.naik ? 'A–Z' : 'Z–A'}`
            : `urut ${LABEL_URUT[urut.kolom].toLowerCase()} ${urut.naik ? 'naik' : 'turun'}`;

    const kepalaUrut = (kolom: KolomUrut) => (
        <TableHeadUrut
            label={LABEL_URUT[kolom]}
            aktif={urut.kolom === kolom}
            naik={urut.naik}
            pertama={kolom === 'nama'}
            onUrut={() =>
                setUrut({
                    kolom,
                    naik: urut.kolom === kolom ? !urut.naik : true,
                })
            }
            className={kolom === 'tanggal' ? 'hidden lg:table-cell' : ''}
        />
    );

    return (
        <Halaman
            ikon={Baby}
            penuh="lg"
            judul="Data Balita"
            subjudul={
                sumberData === 'live'
                    ? statusMuat === 'memuat'
                        ? 'Memuat data balita…'
                        : statusMuat === 'galat'
                          ? 'Data live belum berhasil dimuat.'
                          : rtTerkunci === null
                            ? `${lingkup === 'aktif' ? jumlahAktif : anak.length} balita ${lingkup === 'aktif' ? 'aktif' : 'dalam arsip'} · ${periode.label} · Database live`
                            : `${terlihat.length} balita di ${labelRt(rtTerkunci)}, wilayah binaan Anda · Database live`
                    : `${
                          rtTerkunci === null
                              ? `${anak.length} balita terdaftar di RW ${rw}`
                              : `${terlihat.length} balita di ${labelRt(rtTerkunci)}, wilayah binaan Anda`
                      }. Data contoh.`
            }
            aksi={
                bolehUbah && (
                    <button
                        type="button"
                        onClick={() => {
                            setMenambah((b) => !b);
                            setDibuka(null);
                        }}
                        aria-expanded={menambah}
                        className="tombol-utama"
                    >
                        <UserPlus
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Tambah balita
                    </button>
                )
            }
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <label
                        htmlFor="lingkup-balita"
                        className="text-sm font-bold text-foreground"
                    >
                        Daftar balita
                    </label>
                    <span className="relative inline-flex">
                        <select
                            id="lingkup-balita"
                            className="isian appearance-none bg-card pr-10 font-semibold"
                            value={lingkup}
                            onChange={(e) => setLingkup(e.target.value)}
                        >
                            <option value="aktif">
                                Balita Aktif ({jumlahAktif})
                            </option>
                            <option value="arsip">
                                Semua data / Arsip ({anakDalamLingkup.length})
                            </option>
                        </select>
                        <ChevronDown
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                    </span>
                </div>
                <div className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-rule bg-card px-3.5 py-2 text-sm text-foreground">
                    <ClipboardCheck
                        className="size-4.5 shrink-0 text-primary"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    {tabAktif === 'hari-ini' ? (
                        <span>
                            Sudah ditimbang hari ini:{' '}
                            <strong className="font-extrabold text-primary tabular-nums">
                                {jumlahHariIni}
                            </strong>{' '}
                            dari{' '}
                            <strong className="font-bold tabular-nums">
                                {anakLingkupAktif.length}
                            </strong>{' '}
                            balita
                        </span>
                    ) : (
                        <span>
                            Sudah diukur pada {periode.label}:{' '}
                            <strong className="font-extrabold text-primary tabular-nums">
                                {jumlahDiukurPeriode}
                            </strong>{' '}
                            dari{' '}
                            <strong className="font-bold tabular-nums">
                                {anakLingkupAktif.length}
                            </strong>{' '}
                            balita
                            {anakLingkupAktif.length - jumlahDiukurPeriode >
                                0 && (
                                <span className="ml-1.5 rounded bg-tone-amber-bg px-2 py-0.5 text-xs font-extrabold text-tone-amber tabular-nums">
                                    {anakLingkupAktif.length -
                                        jumlahDiukurPeriode}{' '}
                                    belum ukur
                                </span>
                            )}
                        </span>
                    )}
                </div>
            </div>
            {/* Satu kartu data: saringan di bilah atas, tabel yang digulir di
                dalam kartu, dan jumlah baris di bilah bawah. Halamannya
                sendiri tidak digulir dari 1024 px. */}
            <section className="kartu flex flex-col overflow-hidden lg:min-h-0 lg:flex-1">
                <div
                    role="tablist"
                    aria-label="Daftar balita"
                    className="flex shrink-0 gap-1.5 border-b border-border bg-surface px-4.5 pt-2.5"
                >
                    {(
                        [
                            ['hari-ini', 'Hasil hari ini', jumlahHariIni],
                            [
                                'semua',
                                'Semua balita',
                                lingkup === 'aktif'
                                    ? jumlahAktif
                                    : anakDalamLingkup.length,
                            ],
                        ] as const
                    ).map(([id, label, jumlah]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            id={`tab-anak-${id}`}
                            aria-controls={`panel-anak-${id}`}
                            aria-selected={tabAktif === id}
                            tabIndex={tabAktif === id ? 0 : -1}
                            onClick={() => setTabAktif(id)}
                            className={`-mb-px flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-bold transition-colors sm:px-5 ${tabAktif === id ? 'border-primary bg-accent/65 text-primary' : 'border-transparent text-muted-foreground hover:bg-surface-subtle hover:text-foreground'}`}
                        >
                            {id === 'hari-ini' ? (
                                <ClipboardCheck
                                    className="size-4.5"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Baby className="size-4.5" aria-hidden="true" />
                            )}
                            {label}
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold tabular-nums ${
                                    tabAktif === id
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-surface-alt text-muted-foreground'
                                }`}
                            >
                                {jumlah}
                            </span>
                        </button>
                    ))}
                </div>
                <div
                    role="tabpanel"
                    id={`panel-anak-${tabAktif}`}
                    aria-labelledby={`tab-anak-${tabAktif}`}
                    tabIndex={0}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="flex shrink-0 flex-wrap items-end gap-x-4.5 gap-y-3.5 border-b border-border px-4.5 pt-3.5 pb-4">
                        <div className="min-w-60 flex-1">
                            <label
                                htmlFor="cari-anak"
                                className="block text-sm font-bold text-foreground"
                            >
                                Cari nama balita atau nama ibu
                            </label>
                            {/* `items-stretch`: seluruh tinggi kotak meneruskan
                            sentuhan ke <input>. Ini kotak pertama yang disentuh
                            kader tiap sesi. */}
                            <div className="isian mt-1.5 flex w-full items-stretch gap-2.5 bg-card px-3.5">
                                <Search
                                    className="size-5 shrink-0 self-center text-muted-foreground"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                <input
                                    id="cari-anak"
                                    type="search"
                                    value={kataCari}
                                    placeholder="Ketik nama balita atau nama ibu…"
                                    onChange={(e) =>
                                        tabAktif === 'hari-ini'
                                            ? setCariHariIni(e.target.value)
                                            : setCariSemua(e.target.value)
                                    }
                                    className="min-w-0 flex-1 self-stretch bg-transparent text-base outline-none"
                                />
                            </div>
                        </div>

                        {/* Kader terkunci ke satu RT: keterangan biasa, bukan
                        kontrol mati yang masih berbentuk kontrol. */}
                        {rtTerkunci !== null ? (
                            <p className="flex min-h-14 items-center rounded-lg bg-surface-alt px-3.5 text-base">
                                {labelRt(rtTerkunci)}, wilayah binaan Anda
                            </p>
                        ) : (
                            <div className="w-44">
                                <label
                                    htmlFor="filter-rt"
                                    className="block text-sm font-bold text-foreground"
                                >
                                    Filter RT
                                </label>
                                <div className="relative mt-1.5">
                                    <select
                                        id="filter-rt"
                                        value={rtAktif}
                                        onChange={(e) => setRt(e.target.value)}
                                        className="isian w-full cursor-pointer appearance-none bg-card pr-11 font-semibold"
                                    >
                                        <option value="">Semua RT</option>
                                        {wilayahRt.map((w) => (
                                            <option key={w} value={w}>
                                                {labelRt(w)}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                </div>
                            </div>
                        )}

                        {/* <button aria-pressed>: keadaan tertekannya sampai ke
                        pembaca layar, bukan hanya ke mata. Dua saringan
                        terpisah: "perlu perhatian" membaca hasil ukur terakhir,
                        bukan status periode aktif; yang kedua riwayat lahir. */}
                        <div
                            role="group"
                            aria-label="Tampilkan hanya"
                            className="flex flex-wrap gap-3.5"
                        >
                            <button
                                type="button"
                                aria-pressed={hanyaPerhatian}
                                onClick={() => setHanyaPerhatian((b) => !b)}
                                className={
                                    hanyaPerhatian
                                        ? 'tombol-utama min-h-14'
                                        : 'tombol-kedua min-h-14 bg-surface'
                                }
                            >
                                <TriangleAlert
                                    className={`size-5 shrink-0 ${hanyaPerhatian ? 'text-white' : 'text-tone-amber'}`}
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                Perhatian pada hasil terakhir
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums ${
                                        hanyaPerhatian
                                            ? 'bg-primary-foreground/20 text-primary-foreground'
                                            : 'bg-tone-amber-bg text-tone-amber'
                                    }`}
                                >
                                    {jumlahPerhatian}
                                </span>
                            </button>
                            <button
                                type="button"
                                aria-pressed={hanyaRisiko}
                                onClick={() => setHanyaRisiko((b) => !b)}
                                className={
                                    hanyaRisiko
                                        ? 'tombol-utama min-h-14'
                                        : 'tombol-kedua min-h-14 bg-surface'
                                }
                            >
                                <Baby
                                    className={`size-5 shrink-0 ${hanyaRisiko ? 'text-white' : 'text-tone-blue'}`}
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                BBLR atau tanpa Buku KIA
                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums ${
                                        hanyaRisiko
                                            ? 'bg-primary-foreground/20 text-primary-foreground'
                                            : 'bg-tone-blue-bg text-tone-blue'
                                    }`}
                                >
                                    {jumlahRisiko}
                                </span>
                            </button>
                        </div>
                    </div>

                    {menambah && (
                        <FormTambah
                            wilayahRt={wilayahRt}
                            rtAwal={rtTerkunci ?? ''}
                            onBatal={() => setMenambah(false)}
                            onSimpan={(baru) => {
                                onTambahAnak?.(baru);
                                setMenambah(false);
                            }}
                        />
                    )}

                    {statusMuat === 'memuat' && sumberData === 'live' ? (
                        <StateHalaman
                            jenis="memuat"
                            judul="Memuat data balita…"
                        />
                    ) : statusMuat === 'galat' && sumberData === 'live' ? (
                        <StateHalaman
                            jenis="galat"
                            judul="Data balita belum dapat dimuat"
                            pesan={
                                pesanGalat ?? 'Periksa koneksi, lalu coba lagi.'
                            }
                        >
                            <button
                                type="button"
                                onClick={onMuatUlang}
                                className="tombol-utama mt-4"
                            >
                                <RefreshCw
                                    className="size-5"
                                    aria-hidden="true"
                                />
                                Muat ulang data
                            </button>
                        </StateHalaman>
                    ) : hasilTampil.length === 0 ? (
                        <div className="p-4 sm:p-6 lg:flex-1">
                            {sumberData === 'live' &&
                            anak.length === 0 &&
                            !adaSaringan ? (
                                <EmptyState
                                    ikon={Upload}
                                    warnaIkon="primer"
                                    judul="Belum ada data balita"
                                    sebab="Impor daftar sasaran untuk mulai mencatat pelayanan."
                                >
                                    <Link
                                        href="/sasaran"
                                        className="tombol-utama inline-flex items-center gap-2"
                                    >
                                        <Upload
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                        Buka Sasaran &amp; Impor Data
                                    </Link>
                                </EmptyState>
                            ) : tabAktif === 'hari-ini' && !adaSaringan ? (
                                <EmptyState
                                    ikon={Clock}
                                    warnaIkon="amber"
                                    judul="Belum ada hasil ukur hari ini"
                                    sebab="Hasil pengukuran akan tampil setelah tersimpan ke server."
                                    aksiLabel="Lihat Semua Balita Terdaftar"
                                    aksiIkon={Baby}
                                    onAksi={() => setTabAktif('semua')}
                                />
                            ) : kataCari.trim() !== '' ? (
                                <EmptyState
                                    ikon={SearchX}
                                    warnaIkon="netral"
                                    judul="Tidak ada hasil pencarian"
                                    sebab={
                                        <>
                                            <span className="mb-1 block font-semibold text-foreground/80">
                                                Pencarian di lingkup {lingkupRt}
                                            </span>
                                            Periksa nama atau NIK, atau hapus
                                            pencarian untuk melihat daftar
                                            kembali.
                                        </>
                                    }
                                    aksiLabel="Hapus pencarian"
                                    aksiIkon={RotateCcw}
                                    onAksi={() =>
                                        tabAktif === 'hari-ini'
                                            ? setCariHariIni('')
                                            : setCariSemua('')
                                    }
                                />
                            ) : (
                                <EmptyState
                                    ikon={FilterX}
                                    warnaIkon="netral"
                                    judul="Tidak ada balita yang cocok dengan filter"
                                    sebab={
                                        <>
                                            <span className="mb-1 block font-semibold text-foreground/80">
                                                Saringan aktif di wilayah{' '}
                                                {lingkupRt}
                                            </span>
                                            Ubah pilihan atau reset filter untuk
                                            melihat daftar kembali.
                                        </>
                                    }
                                    aksiLabel="Reset Semua Saringan"
                                    aksiIkon={RotateCcw}
                                    onAksi={() => {
                                        setRt(rtTerkunci ?? '');
                                        setHanyaPerhatian(false);
                                        setHanyaRisiko(false);
                                    }}
                                />
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Di bawah 768 px tabel tujuh kolom butuh geser
                            samping dan kolom Aksi berada di luar layar. Daftar
                            ini menaruh tiap balita dalam satu baris yang bisa
                            disentuh seluruhnya. */}
                            <ul className="md:hidden">
                                {hasilTampil.map((baris) => (
                                    <li
                                        key={baris.anakId}
                                        className="border-b border-rule last:border-b-0"
                                    >
                                        <Link
                                            href={`/balita/${baris.anakId}`}
                                            className="flex min-h-16 items-center gap-3 px-4.5 py-3 hover:bg-surface-subtle"
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-base font-bold text-primary">
                                                    {namaTampil(baris.nama)}
                                                </span>
                                                <span className="mt-0.5 block text-sm text-muted-foreground">
                                                    {umurRingkas(
                                                        baris.umurBulan,
                                                    )}
                                                    {baris.rt !== null &&
                                                        `, ${labelRt(baris.rt)}`}
                                                    {baris.namaOrtu !== null &&
                                                        `, ibu ${baris.namaOrtu}`}
                                                </span>
                                                <span className="mt-2 flex flex-wrap items-center gap-2">
                                                    <StatusGiziBadge
                                                        kategori={
                                                            baris.kategoriGizi
                                                        }
                                                        tenang
                                                    />
                                                    {tabAktif === 'hari-ini' ? (
                                                        <span className="text-sm font-semibold text-foreground">
                                                            BB{' '}
                                                            {baris.bbKg === null
                                                                ? KOSONG
                                                                : `${angka(baris.bbKg, 1)} kg`}
                                                            {' · '}PB/TB{' '}
                                                            {baris.tinggiCm ===
                                                            null
                                                                ? KOSONG
                                                                : `${angka(baris.tinggiCm, 1)} cm`}
                                                        </span>
                                                    ) : (
                                                        baris.tanggalUkurTerakhir !==
                                                            null && (
                                                            <span className="text-sm text-muted-foreground">
                                                                Hasil terakhir{' '}
                                                                {tanggalRingkas(
                                                                    baris.tanggalUkurTerakhir,
                                                                )}
                                                            </span>
                                                        )
                                                    )}
                                                    {!baris.nikLengkap && (
                                                        <span className="text-sm text-tone-amber">
                                                            NIK belum lengkap
                                                        </span>
                                                    )}
                                                </span>
                                                <Pemicu baris={baris} />
                                                <Risiko baris={baris} />
                                            </span>
                                            <ChevronRight
                                                className="size-5 shrink-0 text-muted-foreground"
                                                strokeWidth={2.5}
                                                aria-hidden="true"
                                            />
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                            {/* Kepala kolom `sticky` berlabuh ke wadah gulir ini,
                            jadi ia tetap terbaca sampai baris ke-101. */}
                            <Table
                                aria-label="Daftar balita"
                                containerClassName="hidden md:block lg:min-h-0 lg:flex-1"
                            >
                                <TableHeader className="sticky top-0 z-10">
                                    <TableRow>
                                        {kepalaUrut('nama')}
                                        {kepalaUrut('umur')}
                                        {kepalaUrut('rt')}
                                        {/* Nama ibu tetap dapat dicari, tapi ia
                                        bantuan ingatan, bukan kolom yang
                                        dipindai. Di tablet tegak ia mengalah
                                        supaya tabelnya tidak perlu digeser. */}
                                        <TableHead
                                            scope="col"
                                            className="hidden lg:table-cell"
                                        >
                                            {tabAktif === 'hari-ini'
                                                ? 'Hasil ukur hari ini'
                                                : 'Nama ibu'}
                                        </TableHead>
                                        {kepalaUrut('tanggal')}
                                        {kepalaUrut('status')}
                                        {bolehUbah && (
                                            <TableHead
                                                scope="col"
                                                className="text-right"
                                            >
                                                Aksi
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                {/* Di-key menurut saringan supaya barisnya dipasang
                                ulang, dan jeda bertahapnya terlihat setiap kali
                                hasil berganti (bagian 8.4). */}
                                <TableBody
                                    key={`${kataCari}|${tabAktif}|${rtAktif}|${hanyaPerhatian}|${hanyaRisiko}`}
                                >
                                    {hasilTampil.map((baris, urutan) => {
                                        const terbuka = dibuka === baris.anakId;

                                        return [
                                            <TableRow
                                                key={baris.anakId}
                                                className={`baris-masuk ${terbuka ? 'bg-accent' : ''}`}
                                                style={{
                                                    // Dibatasi delapan baris pertama:
                                                    // lebih dari itu jedanya terasa
                                                    // lambat.
                                                    animationDelay: `${Math.min(urutan, 8) * 20}ms`,
                                                }}
                                            >
                                                {/* Nama adalah jalan ke Detail. Nama
                                                panjang membungkus, tidak dipotong. */}
                                                <TableCell className="py-1.5">
                                                    <Link
                                                        href={`/balita/${baris.anakId}`}
                                                        className="inline-flex min-h-11 items-center gap-1 font-bold text-primary"
                                                    >
                                                        {namaTampil(baris.nama)}
                                                        <ChevronRight
                                                            className="size-4.5 shrink-0"
                                                            strokeWidth={2.5}
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                    {tabAktif === 'hari-ini' &&
                                                        baris.namaOrtu !==
                                                            null && (
                                                            <span className="-mt-1.5 block pb-1 text-xs font-medium text-muted-foreground">
                                                                Ibu:{' '}
                                                                {baris.namaOrtu}
                                                            </span>
                                                        )}
                                                    {!baris.nikLengkap && (
                                                        <span className="-mt-1.5 block pb-1 text-sm text-tone-amber">
                                                            NIK belum lengkap
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {umurRingkas(
                                                        baris.umurBulan,
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {baris.rt === null
                                                        ? KOSONG
                                                        : labelRt(baris.rt)}
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    {tabAktif === 'hari-ini' ? (
                                                        <span className="inline-flex flex-wrap items-center gap-1.5 tabular-nums">
                                                            <span className="rounded-md bg-surface-subtle px-2.5 py-1 text-xs font-bold text-foreground ring-1 ring-border">
                                                                BB{' '}
                                                                {baris.bbKg ===
                                                                null
                                                                    ? KOSONG
                                                                    : `${angka(baris.bbKg, 1)} kg`}
                                                            </span>
                                                            <span className="rounded-md bg-surface-subtle px-2.5 py-1 text-xs font-bold text-foreground ring-1 ring-border">
                                                                {baris.umurBulan !==
                                                                    null &&
                                                                baris.umurBulan <
                                                                    24
                                                                    ? 'PB'
                                                                    : 'TB'}{' '}
                                                                {baris.tinggiCm ===
                                                                null
                                                                    ? KOSONG
                                                                    : `${angka(baris.tinggiCm, 1)} cm`}
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        (baris.namaOrtu ??
                                                        KOSONG)
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden whitespace-nowrap lg:table-cell">
                                                    <div>
                                                        {tanggalRingkas(
                                                            baris.tanggalUkurTerakhir,
                                                        )}
                                                    </div>
                                                    {tabAktif === 'semua' &&
                                                        periode.id !== '' &&
                                                        (baris.tanggalUkurTerakhir ===
                                                            null ||
                                                            !baris.tanggalUkurTerakhir.startsWith(
                                                                periode.id,
                                                            )) && (
                                                            <span className="mt-1 inline-flex items-center rounded bg-tone-amber-bg px-2 py-0.5 text-xs font-bold text-tone-amber">
                                                                Belum ukur{' '}
                                                                {
                                                                    periode.label.split(
                                                                        ' ',
                                                                    )[0]
                                                                }
                                                            </span>
                                                        )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex min-w-0 flex-col items-start gap-1.5 whitespace-normal">
                                                            <StatusGiziBadge
                                                                kategori={
                                                                    baris.kategoriGizi
                                                                }
                                                                tenang
                                                            />
                                                            <Pemicu
                                                                baris={baris}
                                                            />
                                                            <Risiko
                                                                baris={baris}
                                                            />
                                                        </div>
                                                        {!bolehUbah && (
                                                            <Link
                                                                href={`/balita/${baris.anakId}`}
                                                                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-accent px-2.5 py-1.5 text-xs font-extrabold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                                                            >
                                                                Lihat detail
                                                                <ChevronRight
                                                                    className="size-3.5 shrink-0"
                                                                    strokeWidth={
                                                                        2.5
                                                                    }
                                                                    aria-hidden="true"
                                                                />
                                                            </Link>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                {bolehUbah && (
                                                    <TableCell className="py-1 text-right">
                                                        <button
                                                            type="button"
                                                            aria-expanded={
                                                                terbuka
                                                            }
                                                            aria-label={
                                                                terbuka
                                                                    ? `Tutup ubah data ${namaTampil(baris.nama)}`
                                                                    : `Ubah data ${namaTampil(baris.nama)}`
                                                            }
                                                            onClick={() => {
                                                                setDibuka(
                                                                    terbuka
                                                                        ? null
                                                                        : baris.anakId,
                                                                );
                                                                setMenambah(
                                                                    false,
                                                                );
                                                            }}
                                                            className={`tombol-kedua ${
                                                                terbuka
                                                                    ? 'bg-primary text-primary-foreground hover:bg-primary'
                                                                    : ''
                                                            }`}
                                                        >
                                                            {!terbuka && (
                                                                <Pencil
                                                                    className="size-4.5"
                                                                    strokeWidth={
                                                                        2.5
                                                                    }
                                                                    aria-hidden="true"
                                                                />
                                                            )}
                                                            {terbuka
                                                                ? 'Tutup'
                                                                : 'Ubah'}
                                                        </button>
                                                    </TableCell>
                                                )}
                                            </TableRow>,

                                            terbuka && (
                                                <TableRow
                                                    key={`${baris.anakId}-ubah`}
                                                    className="bg-accent"
                                                >
                                                    <TableCell
                                                        colSpan={7}
                                                        className="p-0 first:pl-0 last:pr-0"
                                                    >
                                                        <EditorBaris
                                                            baris={baris}
                                                            periode={periode}
                                                            wilayahRt={
                                                                wilayahRt
                                                            }
                                                            tabelLms={tabelLms}
                                                            onTutup={() =>
                                                                setDibuka(null)
                                                            }
                                                            onSimpan={(
                                                                patch,
                                                            ) => {
                                                                onSimpanAnak?.(
                                                                    baris.anakId,
                                                                    patch,
                                                                );
                                                                setDibuka(null);
                                                            }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        ];
                                    })}
                                </TableBody>
                            </Table>
                        </>
                    )}

                    <p
                        aria-live="polite"
                        className="shrink-0 border-t border-border px-5.5 py-3 text-sm text-muted-foreground"
                    >
                        {statusMuat === 'memuat' && sumberData === 'live' ? (
                            'Menunggu data dari database…'
                        ) : statusMuat === 'galat' && sumberData === 'live' ? (
                            'Data belum tersedia karena pemuatan gagal.'
                        ) : (
                            <>
                                Menampilkan{' '}
                                <span className="font-bold text-foreground">
                                    {hasilTampil.length}
                                </span>{' '}
                                dari{' '}
                                {tabAktif === 'hari-ini'
                                    ? jumlahHariIni
                                    : lingkup === 'aktif'
                                      ? jumlahAktif
                                      : anakDalamLingkup.length}{' '}
                                balita · {keteranganUrut}
                            </>
                        )}
                    </p>
                </div>
            </section>
        </Halaman>
    );
}

/** Satu kotak isian berlabel. Bentuk yang sama dipakai editor dan form tambah. */
function Isian({
    label,
    nilai,
    onGanti,
    tipe = 'text',
    petunjuk,
}: {
    label: string;
    nilai: string;
    onGanti: (v: string) => void;
    tipe?: string;
    petunjuk?: string;
}) {
    const id = `isian-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <label htmlFor={id} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-muted-foreground">
                {label}
            </span>
            <input
                id={id}
                type={tipe}
                value={nilai}
                placeholder={petunjuk}
                onChange={(e) => onGanti(e.target.value)}
                className="isian w-full"
            />
        </label>
    );
}

/** Isian bersatuan: angka rata kanan, satuannya melekat di tepi kotak. */
function IsianUkur({
    label,
    satuan,
    nilai,
    onGanti,
}: {
    label: string;
    satuan: string;
    nilai: string;
    onGanti: (v: string) => void;
}) {
    const id = `ukur-${satuan}`;

    return (
        <label htmlFor={id} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-muted-foreground">
                {label}
            </span>
            <span className="isian flex items-stretch overflow-hidden p-0">
                <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    value={nilai}
                    onChange={(e) => onGanti(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3.5 text-right text-lg font-bold outline-none"
                />
                <span className="flex items-center border-l-2 border-border bg-surface-subtle px-3 text-sm text-muted-foreground">
                    {satuan}
                </span>
            </span>
        </label>
    );
}

/**
 * Editor satu baris.
 *
 * Angka gizi dihitung ulang saat mengetik supaya kader melihat akibat koreksinya
 * sebelum menyimpan — itulah gunanya membuka baris, bukan sekadar mengubah teks.
 * Server tetap yang menghitung ulang dan menyimpan (lib/z-score.ts).
 */
function EditorBaris({
    baris,
    periode,
    wilayahRt,
    tabelLms,
    onTutup,
    onSimpan,
}: {
    baris: BarisAnak;
    periode: Periode;
    wilayahRt: string[];
    tabelLms: ReturnType<typeof susunTabel> | null;
    onTutup: () => void;
    onSimpan: (patch: PatchAnak) => void;
}) {
    const [nama, setNama] = useState(baris.nama ?? '');
    const [nik, setNik] = useState(baris.nik ?? '');
    const [namaOrtu, setNamaOrtu] = useState(baris.namaOrtu ?? '');
    const [rt, setRt] = useState(baris.rt ?? '');
    const [bb, setBb] = useState(
        baris.bbKg === null ? '' : angka(baris.bbKg, 1),
    );
    const [tinggi, setTinggi] = useState(
        baris.tinggiCm === null ? '' : angka(baris.tinggiCm, 1),
    );

    const adaUkuran = baris.bbKg !== null || baris.tinggiCm !== null;
    const bbAngka = keAngka(bb);
    const tinggiAngka = keAngka(tinggi);
    const umur = baris.umurBulan;
    const jk = baris.jk;

    // Ketiga indeks inti, dihitung dari isi kotak saat ini.
    const kartuZ = useMemo(() => {
        if (tabelLms === null || jk === null || umur === null) {
            return null;
        }

        const permintaan: [Indeks, number | null, number | null][] = [
            ['BB_TB', tinggiAngka, bbAngka],
            ['BB_U', umur, bbAngka],
            ['TB_U', umur, tinggiAngka],
        ];

        return permintaan.map(([indeks, kunci, nilai]) => {
            const z =
                kunci === null || nilai === null
                    ? null
                    : hitungZ(tabelLms, indeks, jk, kunci, nilai);

            return {
                indeks,
                label: labelIndeks(indeks, umur),
                z,
                kategori: z === null ? null : kategoriDariZ(indeks, z),
            };
        });
    }, [tabelLms, jk, umur, bbAngka, tinggiAngka]);

    return (
        /* Pita hijau menandai baris yang sedang dibuka; formulirnya sendiri
           berdiri di kartu putih di dalamnya — susunan artboard. Kotak isian
           berlatar --surface tidak terbaca langsung di atas hijau. */
        <div className="border-t-2 border-border px-5 py-6 sm:px-6">
            <div className="kartu flex flex-col gap-6 p-5 sm:p-6">
                <section className="flex flex-col gap-3.5">
                    <h3 className="text-base font-bold">Identitas</h3>
                    {/* Telepon ada di v2 tapi tidak ada kolomnya di basis data
                        (app/Models/OrangTua.php hanya menyimpan nik dan nama).
                        Kotak yang tidak punya tempat menyimpan lebih buruk
                        daripada kotak yang tidak ada. */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Isian
                            label="Nama balita"
                            nilai={nama}
                            onGanti={setNama}
                        />
                        <Isian label="NIK" nilai={nik} onGanti={setNik} />
                        <Isian
                            label="Ibu"
                            nilai={namaOrtu}
                            onGanti={setNamaOrtu}
                        />
                        <label
                            htmlFor="ubah-rt"
                            className="flex flex-col gap-1.5"
                        >
                            <span className="text-sm font-semibold text-muted-foreground">
                                RT
                            </span>
                            <select
                                id="ubah-rt"
                                value={rt}
                                onChange={(e) => setRt(e.target.value)}
                                className="isian w-full"
                            >
                                {wilayahRt.map((w) => (
                                    <option key={w} value={w}>
                                        {labelRt(w)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </section>

                {adaUkuran ? (
                    <section className="flex flex-col gap-3.5 border-t border-border pt-6">
                        <h3 className="text-base font-bold">
                            Pengukuran {periode.label}
                        </h3>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <IsianUkur
                                label="Berat badan"
                                satuan="kg"
                                nilai={bb}
                                onGanti={setBb}
                            />
                            <IsianUkur
                                label={
                                    umur !== null && umur >= 24
                                        ? 'Tinggi badan'
                                        : 'Panjang badan'
                                }
                                satuan="cm"
                                nilai={tinggi}
                                onGanti={setTinggi}
                            />
                        </div>

                        {kartuZ !== null && (
                            <div className="mt-1 rounded-xl border border-border bg-surface p-4 sm:p-5">
                                <h4 className="text-sm font-bold text-muted-foreground">
                                    Hasil hitung WHO 2006
                                </h4>

                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    {kartuZ.map((k) => (
                                        <div
                                            key={k.indeks}
                                            className="rounded-lg border border-border bg-card px-4 py-3"
                                        >
                                            <p className="flex items-baseline gap-1.5">
                                                <span className="text-xl font-extrabold">
                                                    {k.z === null
                                                        ? KOSONG
                                                        : zScore(k.z)}
                                                </span>
                                                {k.z !== null && (
                                                    <span className="text-sm text-muted-foreground">
                                                        SD
                                                    </span>
                                                )}
                                            </p>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                {k.label}
                                            </p>
                                            {k.kategori !== null && (
                                                <p className="mt-1.5">
                                                    <StatusGiziBadge
                                                        kategori={k.kategori}
                                                    />
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-3 text-sm text-pretty text-muted-foreground">
                                    Angka pratinjau. Saat disimpan, server
                                    menghitung ulang dan nilainya itu yang
                                    tercatat. Indeks mengikuti umur anak: BB/PB
                                    di bawah 24 bulan, BB/TB untuk 24 bulan ke
                                    atas.
                                </p>
                            </div>
                        )}
                    </section>
                ) : (
                    <div className="rounded-xl border border-tone-amber bg-tone-amber-bg px-5 py-4">
                        <p className="text-base font-bold text-tone-amber">
                            Belum ada pengukuran {periode.label}
                        </p>
                        <p className="mt-0.5 text-base text-pretty">
                            Identitas tetap bisa diubah. Berat dan tinggi baru
                            bisa dicatat lewat penimbangan.
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
                    <button
                        type="button"
                        onClick={() =>
                            onSimpan({
                                nama: nama.trim(),
                                nik: nik.trim(),
                                namaOrtu: namaOrtu.trim(),
                                rt,
                                bbKg: bbAngka,
                                tinggiCm: tinggiAngka,
                            })
                        }
                        className="tombol-utama"
                    >
                        Simpan perubahan
                    </button>
                    <button
                        type="button"
                        onClick={onTutup}
                        className="tombol-kedua"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Form balita baru. Hanya kolom yang wajib; sisanya diisi lewat penimbangan. */
function FormTambah({
    wilayahRt,
    rtAwal,
    onBatal,
    onSimpan,
}: {
    wilayahRt: string[];
    rtAwal: string;
    onBatal: () => void;
    onSimpan: (baru: AnakBaru) => void;
}) {
    const [nama, setNama] = useState('');
    const [tglLahir, setTglLahir] = useState('');
    const [jk, setJk] = useState<JenisKelamin>('P');
    const [namaOrtu, setNamaOrtu] = useState('');
    const [rt, setRt] = useState(rtAwal === '' ? (wilayahRt[0] ?? '') : rtAwal);

    // Nama dan tanggal lahir menentukan umur, dan umur menentukan seluruh
    // penilaian gizi. Tanpa keduanya baris barunya tidak bisa dibaca siapa pun.
    const lengkap = nama.trim() !== '' && tglLahir !== '';

    return (
        <section className="shrink-0 border-b border-border bg-accent px-4.5 py-5">
            <div className="kartu p-5 sm:p-6">
                <h2 className="text-xl font-extrabold">Tambah balita baru</h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Isian
                        label="Nama balita"
                        nilai={nama}
                        onGanti={setNama}
                        petunjuk="Nama lengkap"
                    />
                    {/* Kotak tanggal bawaan peramban: kalendernya, papan tombolnya,
                    dan pembacaan pembaca layarnya sudah benar tanpa satu baris
                    pun kode kita. */}
                    <Isian
                        label="Tanggal lahir"
                        nilai={tglLahir}
                        onGanti={setTglLahir}
                        tipe="date"
                    />
                    <label
                        htmlFor="tambah-jk"
                        className="flex flex-col gap-1.5"
                    >
                        <span className="text-sm font-semibold text-muted-foreground">
                            Jenis kelamin
                        </span>
                        {/* v2 meminta mengetik "P atau L". Daftar pilihan menutup
                        satu sumber salah ketik yang membelokkan seluruh kurva
                        pertumbuhan anak: tabel WHO berbeda per jenis kelamin. */}
                        <select
                            id="tambah-jk"
                            value={jk}
                            onChange={(e) =>
                                setJk(e.target.value as JenisKelamin)
                            }
                            className="isian w-full"
                        >
                            <option value="P">Perempuan</option>
                            <option value="L">Laki-laki</option>
                        </select>
                    </label>
                    <Isian
                        label="Nama ibu"
                        nilai={namaOrtu}
                        onGanti={setNamaOrtu}
                        petunjuk="Nama lengkap ibu"
                    />
                    <label
                        htmlFor="tambah-rt"
                        className="flex flex-col gap-1.5"
                    >
                        <span className="text-sm font-semibold text-muted-foreground">
                            RT
                        </span>
                        <select
                            id="tambah-rt"
                            value={rt}
                            onChange={(e) => setRt(e.target.value)}
                            className="isian w-full"
                        >
                            {wilayahRt.map((w) => (
                                <option key={w} value={w}>
                                    {labelRt(w)}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <p className="mt-4 max-w-[75ch] text-sm text-pretty text-muted-foreground">
                    Anak baru belum punya pengukuran, jadi statusnya Belum
                    dinilai sampai ditimbang. Sasaran S ikut bertambah.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                    <button
                        type="button"
                        disabled={!lengkap}
                        onClick={() =>
                            onSimpan({
                                nama: nama.trim(),
                                tglLahir,
                                jk,
                                namaOrtu: namaOrtu.trim(),
                                rt,
                            })
                        }
                        className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                        Simpan balita baru
                    </button>
                    <button
                        type="button"
                        onClick={onBatal}
                        className="tombol-kedua"
                    >
                        Batal
                    </button>
                    {!lengkap && (
                        <p className="text-sm text-muted-foreground">
                            Nama balita dan tanggal lahir harus diisi — umurnya
                            dihitung dari tanggal itu.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
