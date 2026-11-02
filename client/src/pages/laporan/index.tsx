import {
    AlertTriangle,
    CircleHelp,
    ArrowRight,
    BarChart3,
    BookOpen,
    Download,
    FileText,
    Filter,
    Info,
    RefreshCw,
    RotateCcw,
    Search,
    SearchX,
    X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import BantuanDetail from '@/components/bantuan-detail';
/**
 * Laporan — rekap SKDN per RT dan Rekap Z-Score / 2T live posyandu.
 */

import DialogGagal from '@/components/dialog-gagal';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import Pilih from '@/components/pilih';
import StateHalaman from '@/components/state-halaman';
import StatusGiziBadge from '@/components/status-gizi-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHeadUrut,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { angka, persenSaja, tanggalRingkas, zScore } from '@/lib/format';
import { kesimpulanZScore } from '@/lib/kategori';
import type { useLaporanServer } from '@/lib/laporan';
import { Link } from '@/lib/nav';
import type { Periode } from '@/types/posyandu';

export type BarisRekapRt = {
    rt: string;
    s: number;
    d: number;
    n: number;
    t: number;
    o: number;
    b: number;
    bgm: number;
};

export type TabPeriode = 'bulanan' | 'tahunan';

type Kolom = 'rt' | 's' | 'd' | 'ds' | 'n' | 'nd' | 't' | 'o' | 'b' | 'bgm';

/** Kolom SKDN: kode di baris pertama kepala tabel, artinya di baris kedua. */
const KOLOM: { kunci: Kolom; kode: string; arti: string }[] = [
    { kunci: 'rt', kode: 'RT', arti: 'Wilayah' },
    { kunci: 's', kode: 'S', arti: 'Sasaran' },
    { kunci: 'd', kode: 'D', arti: 'Ditimbang' },
    { kunci: 'ds', kode: 'D/S', arti: 'Cakupan' },
    { kunci: 'n', kode: 'N', arti: 'Berat naik' },
    { kunci: 'nd', kode: 'N/D', arti: '% naik' },
    { kunci: 't', kode: 'T', arti: 'Tidak naik' },
    { kunci: 'o', kode: 'O', arti: 'Tidak ditimbang bulan lalu' },
    { kunci: 'b', kode: 'B', arti: 'Pertama kali ditimbang' },
    { kunci: 'bgm', kode: 'BGM', arti: 'Bawah garis merah' },
];

/** Kolom yang keterangannya paling panjang, diberi ruang lebih. */
const LEBAR_KETERANGAN = new Set<Kolom>(['o', 'b', 'bgm']);

function nilaiKolom(r: BarisRekapRt, kunci: Kolom): number {
    switch (kunci) {
        case 'rt':
            return Number(r.rt);

        case 'ds':
            return persenSaja(r.d, r.s);

        case 'nd':
            return persenSaja(r.n, r.d);

        default:
            return r[kunci];
    }
}

/**
 * Rentang waktu yang sedang ditampilkan, apa adanya. Arsip demo hanya memuat
 * enam bulan; menyebutnya "tahun 2026" berarti salah lapor ke Puskesmas.
 */
function judulRentang(tab: TabPeriode, periode: Periode): string {
    return tab === 'tahunan' ? 'Januari–Juni 2026' : periode.label;
}

type Props = {
    periode: Periode;
    tab: TabPeriode;
    onGantiTab: (tab: TabPeriode) => void;
    rekapPerRt: BarisRekapRt[];
    total: BarisRekapRt;
    wilayahRt: string[];
    rw: string;
    kelurahan: string;
    periodeTerisi: Periode | null;
    onPindahPeriode?: (id: string) => void;
    laporanLive?: ReturnType<typeof useLaporanServer>;
    bolehUnduh?: boolean;
};

export default function Laporan({
    periode,
    tab,
    onGantiTab,
    rekapPerRt,
    total,
    wilayahRt,
    rw,
    kelurahan,
    periodeTerisi,
    onPindahPeriode,
    laporanLive,
    bolehUnduh = false,
}: Props) {
    const [rt, setRt] = useState('');
    const [urut, setUrut] = useState<{ kolom: Kolom; naik: boolean }>({
        kolom: 'rt',
        naik: true,
    });

    const tampil = (
        rt === '' ? rekapPerRt : rekapPerRt.filter((r) => r.rt === rt)
    )
        .slice()
        .sort(
            (a, b) =>
                (urut.naik ? 1 : -1) *
                    (nilaiKolom(a, urut.kolom) - nilaiKolom(b, urut.kolom)) ||
                Number(a.rt) - Number(b.rt),
        );

    const keteranganUrut =
        urut.kolom === 'rt'
            ? `urut nomor RT${urut.naik ? '' : ', terbesar dulu'}`
            : `urut ${KOLOM.find((k) => k.kunci === urut.kolom)?.kode} ${urut.naik ? 'naik' : 'turun'}`;

    if (laporanLive !== undefined) {
        return (
            <LaporanDataLive
                periode={periode}
                laporan={laporanLive}
                bolehUnduh={bolehUnduh}
                wilayahRt={wilayahRt}
            />
        );
    }

    const angkaDaftar = (r: BarisRekapRt) => [
        r.s,
        r.d,
        `${persenSaja(r.d, r.s)}%`,
        r.n,
        `${persenSaja(r.n, r.d)}%`,
        r.t,
        r.o,
        r.b,
        r.bgm,
    ];

    return (
        <Halaman
            ikon={FileText}
            penuh="lg"
            judul="Laporan & Rekapitulasi SKDN"
            subjudul={`Rekap penimbangan per RT · RW ${rw} Kelurahan ${kelurahan}.`}
            aksi={
                <div
                    role="group"
                    aria-label="Rentang laporan"
                    className="bilah-tab"
                >
                    {(['bulanan', 'tahunan'] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            aria-pressed={tab === t}
                            onClick={() => onGantiTab(t)}
                            className="tab"
                        >
                            {t === 'bulanan'
                                ? periode.label
                                : '6 bulan terakhir'}
                        </button>
                    ))}
                </div>
            }
        >
            {total.s === 0 ? (
                <EmptyState
                    sebab={`Belum ada penimbangan di ${periode.label}.`}
                >
                    {periodeTerisi !== null && (
                        <button
                            type="button"
                            onClick={() => onPindahPeriode?.(periodeTerisi.id)}
                            className="tombol-utama"
                        >
                            Lihat {periodeTerisi.label}
                        </button>
                    )}
                </EmptyState>
            ) : (
                <section className="kartu flex flex-col overflow-hidden lg:min-h-0">
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4.5 gap-y-3 border-b border-border px-5.5 py-4">
                        <h2 className="text-xl leading-tight font-extrabold">
                            Rekap SKDN per RT, {judulRentang(tab, periode)}
                        </h2>
                        {wilayahRt.length > 1 && (
                            <div
                                role="group"
                                aria-label="Pilih RT"
                                className="bilah-tab"
                            >
                                {['', ...wilayahRt].map((w) => (
                                    <button
                                        key={w}
                                        type="button"
                                        aria-pressed={rt === w}
                                        onClick={() => setRt(w)}
                                        className="tab"
                                    >
                                        {w === ''
                                            ? 'Semua RT'
                                            : `RT ${w.padStart(2, '0')}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <Table
                        aria-label={`Rekap SKDN per RT, ${judulRentang(tab, periode)}`}
                        containerClassName="lg:min-h-0 lg:flex-1"
                        className="table-fixed"
                    >
                        <colgroup>
                            {KOLOM.map((k) => (
                                <col
                                    key={k.kunci}
                                    className={
                                        LEBAR_KETERANGAN.has(k.kunci)
                                            ? 'w-[12.33%]'
                                            : 'w-[9%]'
                                    }
                                />
                            ))}
                        </colgroup>
                        <TableHeader className="sticky top-0 z-10">
                            <TableRow>
                                {KOLOM.map((k, i) => (
                                    <TableHeadUrut
                                        key={k.kunci}
                                        label={k.kode}
                                        keterangan={k.arti}
                                        aktif={urut.kolom === k.kunci}
                                        naik={urut.naik}
                                        pertama={i === 0}
                                        terakhir={i === KOLOM.length - 1}
                                        kanan={i > 0}
                                        onUrut={() =>
                                            setUrut({
                                                kolom: k.kunci,
                                                naik:
                                                    urut.kolom === k.kunci
                                                        ? !urut.naik
                                                        : true,
                                            })
                                        }
                                    />
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tampil.map((r) => (
                                <TableRow key={r.rt}>
                                    <TableCell className="font-bold whitespace-nowrap">
                                        RT {r.rt.padStart(2, '0')}
                                    </TableCell>
                                    {angkaDaftar(r).map((n, i) => (
                                        <TableCell
                                            key={i}
                                            className="text-right tabular-nums"
                                        >
                                            {n}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                        {rt === '' && (
                            <TableFooter className="border-t-0 [&_td]:sticky [&_td]:bottom-0 [&_td]:z-10 [&_td]:bg-surface [&_td]:shadow-[inset_0_2px_0_var(--border-strong)]">
                                <TableRow className="border-b-0">
                                    <TableCell>Total</TableCell>
                                    {angkaDaftar(total).map((n, i) => (
                                        <TableCell
                                            key={i}
                                            className="text-right tabular-nums"
                                        >
                                            {n}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableFooter>
                        )}
                    </Table>

                    <div className="flex shrink-0 flex-wrap justify-between gap-x-4.5 gap-y-1 border-t border-border px-5.5 py-3 text-sm text-muted-foreground">
                        <p>
                            Menampilkan{' '}
                            <span className="font-bold text-foreground">
                                {tampil.length}
                            </span>{' '}
                            RT · {keteranganUrut}
                        </p>
                        <p>
                            {tab === 'tahunan' &&
                                'S dan D adalah jumlah enam bulan, bukan jumlah balita. '}
                            BGM dihitung dari BB/U, jadi bisa berbeda dari
                            status gizi di Beranda. D = N + T + O + B.
                        </p>
                    </div>
                </section>
            )}
        </Halaman>
    );
}

function umurUntukLaporan(
    umurLengkap: string,
    hanyaTahunBulan = false,
): string {
    const lengkap = /^(\d+)Thn(\d+)Bln(?:(\d+)Hari)?$/.exec(umurLengkap ?? '');

    if (lengkap !== null) {
        if (hanyaTahunBulan) {
            return `${Number(lengkap[1])} thn ${Number(lengkap[2])} bln`;
        }

        return `${Number(lengkap[1])} thn ${Number(lengkap[2])} bln${lengkap[3] ? ` ${Number(lengkap[3])} hari` : ''}`;
    }

    const bulanHari = /^(\d+) bulan(?: (\d+) hari)?$/.exec(umurLengkap ?? '');

    if (bulanHari !== null) {
        const bulan = Number(bulanHari[1]);

        if (hanyaTahunBulan) {
            return `${Math.floor(bulan / 12)} thn ${bulan % 12} bln`;
        }

        return `${Math.floor(bulan / 12)} thn ${bulan % 12} bln${bulanHari[2] ? ` ${Number(bulanHari[2])} hari` : ''}`;
    }

    const umurArsip = /^(\d+)Thn(\d+)Bln/.exec(umurLengkap ?? '');

    if (umurArsip) {
        return `${umurArsip[1]} thn ${umurArsip[2]} bln`;
    }

    return umurLengkap || '—';
}

function LaporanDataLive({
    periode,
    laporan,
    bolehUnduh,
    wilayahRt = [],
}: {
    periode: Periode;
    laporan: ReturnType<typeof useLaporanServer>;
    bolehUnduh: boolean;
    wilayahRt?: string[];
}) {
    const [bantuanTerbuka, setBantuanTerbuka] = useState(false);
    const tombolBantuan = useRef<HTMLButtonElement>(null);
    const [tab, setTab] = useState<'zscore' | '2t'>(() => {
        if (
            typeof window !== 'undefined' &&
            window.location.hash.toLowerCase().includes('2t')
        ) {
            return '2t';
        }

        return 'zscore';
    });
    const [kategoriT, setKategoriT] = useState<'semua' | '2t' | '1t'>('semua');
    const [indeks, setIndeks] = useState('BB_U');
    const [standar, setStandar] = useState('PERMENKES-2-2020');
    const [rtDipilih, setRtDipilih] = useState<string>('semua');
    const [cari, setCari] = useState('');
    const [galatUnduh, setGalatUnduh] = useState<string | null>(null);
    const [mengunduhF1, setMengunduhF1] = useState(false);

    const gantiTab = (t: 'zscore' | '2t') => {
        setTab(t);

        if (typeof window !== 'undefined') {
            const baseUrl = window.location.hash.split('?')[0] || '#/laporan';
            window.location.hash = t === '2t' ? `${baseUrl}?tab=2t` : baseUrl;
        }
    };

    const data = laporan.data;

    const daftarIndeks = [
        ['BB_U', 'BB/U — Berat per Umur'],
        ['TB_U', 'TB/U — Panjang/Tinggi per Umur (Stunting)'],
        ['BB_TB', 'BB/TB — Berat per Tinggi (Gizi/Wasting)'],
        ['IMT_U', 'IMT/U — Indeks Massa Tubuh per Umur'],
        ['LILA_U', 'LILA/U — Lingkar Lengan Atas per Umur'],
        ['LIKA_U', 'LIKA/U — Lingkar Kepala per Umur'],
    ];

    const daftarT = useMemo(() => {
        const riwayat = data?.riwayat2T ?? [];
        const anakRiwayat = new Set(riwayat.map((r) => r.anakId));
        const anakSatuT = (data?.bulanan ?? [])
            .filter(
                (r) =>
                    !anakRiwayat.has(r.anakId) &&
                    (r.nt === 'T' ||
                        (r.jumlahTBerturut && r.jumlahTBerturut >= 1)),
            )
            .map((r) => ({
                ...r,
                status2T:
                    r.status2T ??
                    (r.jumlahTBerturut ? `${r.jumlahTBerturut}T` : '1T'),
                jumlahTBerturut: r.jumlahTBerturut ?? 1,
                sumberRiwayat: r.sumberRiwayat ?? 'pengukuran',
            }));

        return [...riwayat, ...anakSatuT];
    }, [data?.riwayat2T, data?.bulanan]);

    const jumlahDuaT = data?.ringkasan.denganDuaT ?? 0;
    const jumlahSatuT = useMemo(() => {
        const anakRiwayat = new Set(
            (data?.riwayat2T ?? []).map((r) => r.anakId),
        );

        return (data?.bulanan ?? []).filter(
            (r) =>
                !anakRiwayat.has(r.anakId) &&
                (r.nt === 'T' || (r.jumlahTBerturut && r.jumlahTBerturut >= 1)),
        ).length;
    }, [data?.riwayat2T, data?.bulanan]);
    const totalT = jumlahDuaT + jumlahSatuT;

    const daftarRtTersedia = useMemo(() => {
        if (wilayahRt.length > 0) {
            return wilayahRt;
        }

        const setRt = new Set<string>();

        for (const item of data?.bulanan ?? []) {
            if (item.rt) {
                setRt.add(item.rt);
            }
        }

        return Array.from(setRt).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );
    }, [data?.bulanan, wilayahRt]);

    const daftarTersaring = useMemo(() => {
        let list = tab === 'zscore' ? (data?.bulanan ?? []) : daftarT;

        if (tab === '2t' && kategoriT !== 'semua') {
            if (kategoriT === '2t') {
                list = list.filter(
                    (r) =>
                        (r.jumlahTBerturut ?? 0) >= 2 ||
                        r.duaT ||
                        (r.status2T && r.status2T !== '1T'),
                );
            } else if (kategoriT === '1t') {
                list = list.filter(
                    (r) =>
                        !(
                            (r.jumlahTBerturut ?? 0) >= 2 ||
                            r.duaT ||
                            (r.status2T && r.status2T !== '1T')
                        ),
                );
            }
        }

        if (rtDipilih !== 'semua') {
            list = list.filter((item) => (item.rt ?? '') === rtDipilih);
        }

        if (cari.trim() !== '') {
            const q = cari.trim().toLocaleLowerCase('id-ID');
            list = list.filter(
                (item) =>
                    item.nama.toLocaleLowerCase('id-ID').includes(q) ||
                    (item.nik ?? '').includes(q) ||
                    (item.namaOrtu ?? '')
                        .toLocaleLowerCase('id-ID')
                        .includes(q),
            );
        }

        return list;
    }, [tab, data?.bulanan, daftarT, rtDipilih, cari, kategoriT]);

    if (laporan.status !== 'siap') {
        return (
            <Halaman
                ikon={FileText}
                judul="Laporan"
                subjudul={periode.label}
                penuh="lg"
            >
                <StateHalaman
                    jenis={laporan.status === 'memuat' ? 'memuat' : 'galat'}
                    judul={
                        laporan.status === 'memuat'
                            ? 'Memuat laporan…'
                            : 'Laporan belum dapat dimuat'
                    }
                    pesan={
                        laporan.status === 'galat'
                            ? 'Periksa koneksi, lalu coba lagi.'
                            : undefined
                    }
                >
                    {laporan.status === 'galat' && (
                        <button
                            type="button"
                            className="tombol-utama"
                            onClick={laporan.muatUlang}
                        >
                            Coba lagi
                        </button>
                    )}
                </StateHalaman>
            </Halaman>
        );
    }

    return (
        <Halaman
            ikon={FileText}
            judul={
                tab === 'zscore'
                    ? 'Laporan & Rekapitulasi Gizi Posyandu'
                    : 'Laporan Pemantauan Balita Tidak Naik (1T & 2T+)'
            }
            subjudul={
                tab === 'zscore'
                    ? 'Rekapitulasi lengkap status gizi balita berdasarkan 6 indeks antropometri standar Permenkes No. 2/2020 dan pemantauan balita tidak naik (1T & 2T+).'
                    : 'Deteksi dini balita tidak naik berat badan (1T) dan kritis tidak naik berturut-turut (2T+) untuk intervensi PMT Pemulihan serta rujukan Puskesmas.'
            }
            aksi={
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="tombol-kedua"
                        ref={tombolBantuan}
                        aria-expanded={bantuanTerbuka}
                        aria-controls="bantuan-detail"
                        onClick={() => setBantuanTerbuka((v) => !v)}
                    >
                        <CircleHelp className="size-4" aria-hidden="true" />
                        Bantuan
                    </button>
                    <button
                        type="button"
                        className="tombol-kedua text-xs font-bold"
                        onClick={laporan.muatUlang}
                    >
                        <RefreshCw className="size-3.5" aria-hidden="true" />{' '}
                        Perbarui Data
                    </button>
                    {bolehUnduh && (
                        <button
                            type="button"
                            className="tombol-kedua text-xs font-bold"
                            onClick={() =>
                                void laporan
                                    .unduh()
                                    .catch((e: unknown) =>
                                        setGalatUnduh(
                                            e instanceof Error
                                                ? e.message
                                                : 'Unduhan gagal.',
                                        ),
                                    )
                            }
                        >
                            <Download className="size-3.5" aria-hidden="true" />{' '}
                            Excel Z-score & 2T
                        </button>
                    )}
                    <button
                        type="button"
                        className="tombol-utama text-xs font-extrabold shadow-sm"
                        disabled={mengunduhF1}
                        onClick={async () => {
                            setMengunduhF1(true);
                            setGalatUnduh(null);

                            try {
                                await laporan.unduh('f1');
                            } catch (e) {
                                setGalatUnduh(
                                    e instanceof Error
                                        ? e.message
                                        : 'Unduhan F1 gagal.',
                                );
                            } finally {
                                setMengunduhF1(false);
                            }
                        }}
                    >
                        <Download className="size-3.5" aria-hidden="true" />{' '}
                        {mengunduhF1 ? 'Menyiapkan F1…' : 'Unduh F1 Excel'}
                    </button>
                </div>
            }
        >
            <div
                className={
                    bantuanTerbuka
                        ? 'detail-area bantuan-terbuka'
                        : 'detail-area'
                }
            >
                <div className="detail-utama w-full space-y-6">
                    {/* Banner Edukasi Panduan Ibu Kader (Disesuaikan per Tab) */}

                    {/* Strip 3 Kartu Ringkasan Metrik (Disesuaikan per Tab) */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        {tab === 'zscore' ? (
                            <>
                                <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                Balita Diukur
                                            </p>
                                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                                                Meja 2–4
                                            </span>
                                        </div>
                                        <p className="mt-2 text-3xl font-extrabold text-foreground tabular-nums">
                                            {data?.ringkasan.anakDiukur ?? 0}
                                        </p>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                                        Balita hadir dan tercatat pengukurannya
                                        di periode {periode.label}.
                                    </p>
                                </article>

                                <article className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold tracking-wider text-amber-900 uppercase">
                                                Pemantauan 1T & 2T+
                                            </p>
                                            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                                                Perlu Perhatian
                                            </span>
                                        </div>
                                        <p className="mt-2 text-3xl font-extrabold text-amber-950 tabular-nums">
                                            {totalT > 0 ? (
                                                <>
                                                    <span>
                                                        {jumlahDuaT}{' '}
                                                        <span className="text-lg font-bold text-tone-red">
                                                            (2T+)
                                                        </span>
                                                    </span>
                                                    {jumlahSatuT > 0 && (
                                                        <span className="ml-2 text-lg font-bold text-amber-800">
                                                            · {jumlahSatuT} (1T)
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                '0'
                                            )}
                                        </p>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-amber-900">
                                        {totalT > 0
                                            ? `${totalT} balita tidak naik berat badan bulan ini.`
                                            : 'Seluruh balita yang diukur mengalami kenaikan berat badan.'}
                                    </p>
                                </article>

                                <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                Standar Antropometri
                                            </p>
                                            <span className="rounded-full border border-border bg-surface-subtle px-2 py-0.5 text-[10px] font-extrabold text-foreground">
                                                Baku Kemenkes
                                            </span>
                                        </div>
                                        <p className="mt-2 text-lg font-extrabold text-foreground">
                                            Permenkes RI No. 2/2020
                                        </p>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                                        Tabel parameter LMS WHO 2006 resmi untuk
                                        perhitungan 6 indeks z-score.
                                    </p>
                                </article>
                            </>
                        ) : (
                            <>
                                <article className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold tracking-wider text-amber-900 uppercase">
                                                Total Tidak Naik (T)
                                            </p>
                                            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                                                1T & 2T+
                                            </span>
                                        </div>
                                        <p className="mt-2 text-3xl font-extrabold text-amber-950 tabular-nums">
                                            {totalT}{' '}
                                            <span className="text-sm font-semibold text-amber-800">
                                                balita
                                            </span>
                                        </p>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-amber-900">
                                        {persenSaja(
                                            totalT,
                                            data?.ringkasan.anakDiukur ?? 1,
                                        )}{' '}
                                        dari total{' '}
                                        {data?.ringkasan.anakDiukur ?? 0} balita
                                        yang ditimbang periode {periode.label}.
                                    </p>
                                </article>

                                <article className="flex flex-col justify-between rounded-2xl border border-rose-300 bg-rose-50/60 p-5 shadow-sm">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold tracking-wider text-rose-900 uppercase">
                                                Kategori Kritis: 2T+
                                            </p>
                                            <span className="rounded-full border border-rose-300 bg-rose-200 px-2 py-0.5 text-[10px] font-extrabold text-rose-900">
                                                Wajib Rujuk Segera
                                            </span>
                                        </div>
                                        <p className="mt-2 text-3xl font-extrabold text-rose-950 tabular-nums">
                                            {jumlahDuaT}{' '}
                                            <span className="text-sm font-semibold text-rose-800">
                                                balita
                                            </span>
                                        </p>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-rose-900">
                                        ≥ 2 kali berturut-turut tidak naik.
                                        Prioritas investigasi infeksi & PMT
                                        Pemulihan.
                                    </p>
                                </article>

                                <article className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-card p-5 shadow-sm">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                Kategori Waspada: 1T
                                            </p>
                                            <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                                                Konseling Meja 4
                                            </span>
                                        </div>
                                        <p className="mt-2 text-3xl font-extrabold text-foreground tabular-nums">
                                            {jumlahSatuT}{' '}
                                            <span className="text-sm font-semibold text-muted-foreground">
                                                balita
                                            </span>
                                        </p>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-muted-foreground">
                                        1 kali kenaikan di bawah KBM. Perlu
                                        evaluasi pola asuh makan & ASI
                                        eksklusif.
                                    </p>
                                </article>
                            </>
                        )}
                    </div>

                    {/* Kontainer Utama Tabel Laporan */}
                    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        {/* Bilah Tab Utama & Selektor Kontrol */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface-subtle/60 px-5 py-4 sm:px-6">
                            <div
                                className="bilah-tab"
                                role="tablist"
                                aria-label="Jenis laporan"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === 'zscore'}
                                    onClick={() => gantiTab('zscore')}
                                    className={`tab inline-flex items-center gap-1.5 font-extrabold ${tab === 'zscore' ? 'bg-primary text-white shadow-xs' : ''}`}
                                >
                                    <BarChart3
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Rekap Z-score Bulanan</span>
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === '2t'}
                                    onClick={() => gantiTab('2t')}
                                    className={`tab inline-flex items-center gap-1.5 font-extrabold ${tab === '2t' ? 'bg-primary text-white shadow-xs' : ''}`}
                                >
                                    <AlertTriangle
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>Riwayat 1T & 2T+ ({totalT})</span>
                                </button>
                            </div>

                            {tab === 'zscore' ? (
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                                        <span>Standar:</span>
                                        <Pilih
                                            id="laporan-standar"
                                            value={standar}
                                            onChange={setStandar}
                                            className="isian min-h-9 min-w-[140px] rounded-lg border-border-strong text-xs font-semibold"
                                        >
                                            {(data?.standar ?? [standar]).map(
                                                (value) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {value ===
                                                        'PERMENKES-2-2020'
                                                            ? 'Permenkes 2/2020'
                                                            : value ===
                                                                'WHO-2006'
                                                              ? 'WHO 2006'
                                                              : value}
                                                    </option>
                                                ),
                                            )}
                                        </Pilih>
                                    </label>
                                    <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                                        <span>Indeks Antropometri:</span>
                                        <Pilih
                                            id="laporan-indeks"
                                            value={indeks}
                                            onChange={setIndeks}
                                            className="isian min-h-9 max-w-[300px] rounded-lg border-border-strong text-xs font-bold text-primary"
                                        >
                                            {daftarIndeks.map(
                                                ([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ),
                                            )}
                                        </Pilih>
                                    </label>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="mr-1 text-xs font-bold text-muted-foreground">
                                        Saring Status:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setKategoriT('semua')}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                            kategoriT === 'semua'
                                                ? 'bg-foreground text-background shadow-xs'
                                                : 'border border-border bg-surface text-muted-foreground hover:bg-surface-subtle'
                                        }`}
                                    >
                                        Semua ({totalT})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setKategoriT('2t')}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                            kategoriT === '2t'
                                                ? 'bg-rose-600 text-white shadow-xs'
                                                : 'border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                                        }`}
                                    >
                                        <AlertTriangle
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Kritis 2T+ ({jumlahDuaT})</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setKategoriT('1t')}
                                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                            kategoriT === '1t'
                                                ? 'bg-amber-600 text-white shadow-xs'
                                                : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                        }`}
                                    >
                                        <AlertTriangle
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Waspada 1T ({jumlahSatuT})</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Bilah Filter RT & Pencarian Cepat */}
                        <div className="border-b border-border bg-surface-subtle/30 px-5 py-3.5 sm:px-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex max-w-sm min-w-[260px] flex-1 items-center gap-2.5 rounded-xl border border-border-strong bg-surface px-3 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-ring">
                                    <Search
                                        className="size-3.5 shrink-0 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <input
                                        value={cari}
                                        onChange={(e) =>
                                            setCari(e.target.value)
                                        }
                                        placeholder={
                                            tab === 'zscore'
                                                ? 'Cari nama balita, NIK, atau nama ibu...'
                                                : 'Cari balita 1T/2T, NIK, atau nama ibu...'
                                        }
                                        className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground"
                                    />
                                    {cari !== '' && (
                                        <button
                                            type="button"
                                            onClick={() => setCari('')}
                                            className="inline-flex items-center text-muted-foreground hover:text-foreground"
                                            aria-label="Hapus pencarian"
                                        >
                                            <X
                                                className="size-3.5 shrink-0"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="mr-1 flex items-center gap-1 text-xs font-bold text-muted-foreground">
                                        <Filter
                                            className="size-3"
                                            aria-hidden="true"
                                        />
                                        RT:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setRtDipilih('semua')}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                            rtDipilih === 'semua'
                                                ? 'bg-primary text-white shadow-xs'
                                                : 'border border-border bg-surface text-muted-foreground hover:bg-surface-subtle'
                                        }`}
                                    >
                                        Semua RT (
                                        {tab === 'zscore'
                                            ? (data?.bulanan.length ?? 0)
                                            : daftarT.length}
                                        )
                                    </button>
                                    {daftarRtTersedia.map((rt) => {
                                        const hitungRt = (
                                            tab === 'zscore'
                                                ? (data?.bulanan ?? [])
                                                : daftarT
                                        ).filter((i) => i.rt === rt).length;

                                        return (
                                            <button
                                                key={rt}
                                                type="button"
                                                onClick={() => setRtDipilih(rt)}
                                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                                    rtDipilih === rt
                                                        ? 'bg-primary text-white shadow-xs'
                                                        : 'border border-border bg-surface text-muted-foreground hover:bg-surface-subtle'
                                                }`}
                                            >
                                                RT {rt} ({hitungRt})
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Counter Info */}
                            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                <p>
                                    Menampilkan{' '}
                                    <strong className="text-foreground">
                                        {daftarTersaring.length}
                                    </strong>{' '}
                                    balita
                                    {rtDipilih !== 'semua' &&
                                        ` · Saringan RT ${rtDipilih}`}
                                    {cari !== '' && ` · Kata kunci: "${cari}"`}
                                    {tab === 'zscore' &&
                                        ` · Indeks: ${daftarIndeks.find((d) => d[0] === indeks)?.[1] ?? indeks}`}
                                    {tab === '2t' &&
                                        kategoriT !== 'semua' &&
                                        ` · Kategori: ${kategoriT === '2t' ? 'Kritis 2T+' : 'Waspada 1T'}`}
                                </p>
                            </div>
                        </div>

                        {tab === '2t' && (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-rose-200 bg-rose-50/80 px-5 py-3 text-xs text-rose-950">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle
                                        className="size-4 shrink-0 text-rose-600"
                                        aria-hidden="true"
                                    />
                                    <span className="font-extrabold text-rose-900">
                                        Perhatian Klinis:
                                    </span>
                                    <span>
                                        {data?.keterangan2T ??
                                            'Daftar balita dengan pemantauan kenaikan berat badan tidak naik (1T) dan berturut-turut (2T+) yang memerlukan konfirmasi rujukan dan pendampingan gizi kader.'}
                                    </span>
                                </div>
                                <span className="rounded-full border border-rose-300 bg-rose-200/80 px-2 py-0.5 text-[11px] font-extrabold text-rose-900">
                                    Target KBM Buku KIA 2024
                                </span>
                            </div>
                        )}

                        {/* Tabel Data Z-Score & 1T/2T */}
                        <div
                            className="gulir-dalam max-h-[520px] w-full overflow-x-auto"
                            tabIndex={0}
                            role="region"
                            aria-label="Tabel laporan z-score, geser ke samping untuk melihat semua kolom"
                        >
                            {daftarTersaring.length === 0 ? (
                                <div className="p-6 sm:p-10">
                                    <EmptyState
                                        ikon={SearchX}
                                        warnaIkon="netral"
                                        judul={
                                            cari.trim() !== ''
                                                ? `Balita “${cari.trim()}” Tidak Ditemukan`
                                                : 'Tidak Ada Data Balita yang Sesuai Saringan'
                                        }
                                        sebab={
                                            cari.trim() !== '' ? (
                                                <>
                                                    <span className="mb-1 block font-semibold text-foreground/80">
                                                        Pencarian pada periode{' '}
                                                        {periode.label} (RT:{' '}
                                                        {rtDipilih === 'semua'
                                                            ? 'Semua RT'
                                                            : `RT ${rtDipilih}`}
                                                        )
                                                    </span>
                                                    Data pengukuran posyandu
                                                    tetap aman di database. Coba
                                                    periksa ejaan nama atau
                                                    bersihkan filter untuk
                                                    menampilkan seluruh balita.
                                                </>
                                            ) : (
                                                <>
                                                    <span className="mb-1 block font-semibold text-foreground/80">
                                                        Filter aktif:{' '}
                                                        {rtDipilih === 'semua'
                                                            ? 'Semua RT'
                                                            : `RT ${rtDipilih}`}
                                                    </span>
                                                    Tidak ada catatan balita
                                                    yang sesuai dengan filter
                                                    wilayah atau status gizi
                                                    pada periode ini.
                                                </>
                                            )
                                        }
                                        aksiLabel="Hapus Pencarian & Reset Filter"
                                        aksiIkon={RotateCcw}
                                        onAksi={() => {
                                            setCari('');
                                            setRtDipilih('semua');
                                        }}
                                    />
                                </div>
                            ) : (
                                <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                                    <thead className="sticky top-0 z-10 border-b border-border bg-surface-subtle text-muted-foreground shadow-2xs">
                                        <tr>
                                            {(tab === 'zscore'
                                                ? [
                                                      'Balita',
                                                      'RT',
                                                      'Umur',
                                                      'Tgl Ukur',
                                                      'BB (kg)',
                                                      'TB/PB (cm)',
                                                      'Z-Score',
                                                      'Kesimpulan Status Gizi',
                                                  ]
                                                : [
                                                      'Balita',
                                                      'RT',
                                                      'Periode',
                                                      'Umur',
                                                      'BB Aktual',
                                                      'Kenaikan vs KBM',
                                                      'Status KIA',
                                                      'Tingkat Risiko',
                                                      'Aksi / Rujukan',
                                                      'Sumber Data',
                                                  ]
                                            ).map((h, i) => (
                                                <th
                                                    key={h}
                                                    className={`px-4 py-3.5 font-extrabold whitespace-nowrap text-foreground ${
                                                        i === 0 ? 'pl-5' : ''
                                                    } ${i >= 4 && i <= 6 && tab === 'zscore' ? 'text-center' : ''}`}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {daftarTersaring.map((row, index) => {
                                            const assessment =
                                                row.penilaian?.[standar]?.[
                                                    indeks
                                                ];
                                            const zVal =
                                                typeof assessment?.z ===
                                                'number'
                                                    ? assessment.z
                                                    : null;
                                            const isNormal =
                                                zVal !== null &&
                                                zVal >= -2 &&
                                                zVal <= 1;
                                            const isWarning =
                                                zVal !== null &&
                                                ((zVal >= -3 && zVal < -2) ||
                                                    (zVal > 1 && zVal <= 2));
                                            const isDanger =
                                                zVal !== null &&
                                                (zVal < -3 || zVal > 2);

                                            const isDuaT =
                                                (row.jumlahTBerturut ?? 0) >=
                                                    2 ||
                                                row.duaT ||
                                                (row.status2T &&
                                                    row.status2T !== '1T');
                                            const kenaikan =
                                                row.kenaikanGram ?? null;
                                            const kbm = row.kbmGram ?? null;
                                            const selisih =
                                                kenaikan !== null &&
                                                kbm !== null
                                                    ? kenaikan - kbm
                                                    : null;

                                            return (
                                                <tr
                                                    key={`${row.anakId}-${row.periodeId}-${index}`}
                                                    className={`transition-colors ${
                                                        tab === '2t' && isDuaT
                                                            ? 'bg-rose-50/25 hover:bg-rose-50/50'
                                                            : 'hover:bg-surface-subtle/60'
                                                    }`}
                                                >
                                                    <td className="px-4 py-3.5 pl-5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <Link
                                                                href={`/balita/${row.anakId}`}
                                                                className="font-extrabold text-foreground underline-offset-4 hover:text-primary hover:underline"
                                                            >
                                                                {row.nama}
                                                            </Link>
                                                            <span
                                                                className={`py-0.2 rounded px-1.5 text-[10px] font-extrabold ${
                                                                    row.jk ===
                                                                    'L'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-pink-100 text-pink-800'
                                                                }`}
                                                            >
                                                                {row.jk}
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                                            {row.nik ??
                                                                'NIK belum tercatat'}{' '}
                                                            · Ibu:{' '}
                                                            {row.namaOrtu ??
                                                                '—'}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3.5 tabular-nums">
                                                        <span className="rounded-md bg-surface-subtle px-2 py-1 text-xs font-bold text-foreground">
                                                            RT {row.rt ?? '—'}
                                                        </span>
                                                    </td>
                                                    {tab === 'zscore' ? (
                                                        <>
                                                            <td className="px-4 py-3.5 text-xs font-semibold whitespace-nowrap text-foreground tabular-nums">
                                                                {umurUntukLaporan(
                                                                    row.umurLengkap,
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                                                                {tanggalRingkas(
                                                                    row.tanggalUkur ??
                                                                        null,
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center font-bold text-foreground tabular-nums">
                                                                {angka(
                                                                    row.bbKg ??
                                                                        null,
                                                                    1,
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center font-bold text-foreground tabular-nums">
                                                                {angka(
                                                                    row.tinggiCm ??
                                                                        null,
                                                                    1,
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center font-bold tabular-nums">
                                                                <span
                                                                    className={`inline-flex items-center rounded-lg px-2.5 py-1 font-mono text-xs font-extrabold shadow-2xs ${
                                                                        isNormal
                                                                            ? 'border border-emerald-300 bg-emerald-100 text-emerald-900'
                                                                            : isWarning
                                                                              ? 'border border-amber-300 bg-amber-100 text-amber-900'
                                                                              : isDanger
                                                                                ? 'border border-rose-300 bg-rose-100 text-rose-900'
                                                                                : 'bg-surface-subtle text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    {zScore(
                                                                        zVal,
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5 pr-5 font-semibold">
                                                                <StatusGiziBadge
                                                                    kategori={kesimpulanZScore(
                                                                        assessment?.kategori,
                                                                        assessment?.z,
                                                                    )}
                                                                    rapat
                                                                />
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-4 py-3.5 text-xs font-bold text-foreground tabular-nums">
                                                                {row.periodeId}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-xs font-semibold whitespace-nowrap text-foreground tabular-nums">
                                                                {umurUntukLaporan(
                                                                    row.umurLengkap,
                                                                    true,
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-xs font-bold text-foreground tabular-nums">
                                                                {angka(
                                                                    row.bbKg ??
                                                                        null,
                                                                    1,
                                                                )}{' '}
                                                                kg
                                                            </td>
                                                            <td className="px-4 py-3.5 text-xs tabular-nums">
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-1 font-bold">
                                                                        <span
                                                                            className={
                                                                                kenaikan !==
                                                                                    null &&
                                                                                kenaikan <
                                                                                    0
                                                                                    ? 'font-extrabold text-rose-600'
                                                                                    : 'text-foreground'
                                                                            }
                                                                        >
                                                                            {kenaikan !==
                                                                            null
                                                                                ? `${kenaikan > 0 ? '+' : ''}${kenaikan} g`
                                                                                : '—'}
                                                                        </span>
                                                                        <span className="text-[11px] font-normal text-muted-foreground">
                                                                            /
                                                                            KBM{' '}
                                                                            {kbm !==
                                                                            null
                                                                                ? `${kbm} g`
                                                                                : '—'}
                                                                        </span>
                                                                    </div>
                                                                    {selisih !==
                                                                        null && (
                                                                        <span
                                                                            className={`text-[10px] font-bold ${
                                                                                selisih <
                                                                                0
                                                                                    ? 'text-rose-600'
                                                                                    : 'text-emerald-700'
                                                                            }`}
                                                                        >
                                                                            {selisih <
                                                                            0
                                                                                ? `Kurang ${Math.abs(selisih)} g`
                                                                                : `Lebih ${selisih} g`}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3.5 font-bold">
                                                                <span
                                                                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-extrabold shadow-2xs ${
                                                                        row.nt ===
                                                                        'N'
                                                                            ? 'border border-emerald-300 bg-emerald-100 text-emerald-900'
                                                                            : row.nt ===
                                                                                'T'
                                                                              ? 'border border-rose-300 bg-rose-100 text-rose-900'
                                                                              : 'bg-surface-subtle text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    {row.nt ===
                                                                    'N'
                                                                        ? 'N · Naik'
                                                                        : row.nt ===
                                                                            'T'
                                                                          ? 'T · Tidak Naik'
                                                                          : (row.nt ??
                                                                            '—')}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5 font-bold">
                                                                <span
                                                                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold shadow-2xs ${
                                                                        isDuaT
                                                                            ? 'border border-rose-300 bg-rose-100 text-rose-950'
                                                                            : 'border border-amber-300 bg-amber-100 text-amber-950'
                                                                    }`}
                                                                >
                                                                    {isDuaT ? (
                                                                        <>
                                                                            <AlertTriangle
                                                                                className="size-3 shrink-0 text-rose-600"
                                                                                aria-hidden="true"
                                                                            />
                                                                            <span>
                                                                                2T+
                                                                                (Kritis)
                                                                            </span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <span className="size-1.5 rounded-full bg-amber-500" />
                                                                            <span>
                                                                                1T
                                                                                (Waspada)
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Link
                                                                        href={`/balita/${row.anakId}`}
                                                                        className="inline-flex items-center rounded-lg border border-border px-2 py-1 text-[11px] font-bold text-foreground transition-colors hover:bg-surface-subtle"
                                                                    >
                                                                        <span>
                                                                            Detail
                                                                        </span>
                                                                    </Link>
                                                                    <Link
                                                                        href="/kms"
                                                                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                                                                            isDuaT
                                                                                ? 'bg-rose-600 text-white shadow-2xs hover:bg-rose-700'
                                                                                : 'bg-primary/10 text-primary hover:bg-primary/20'
                                                                        }`}
                                                                    >
                                                                        <span>
                                                                            {isDuaT
                                                                                ? 'Rujuk Meja 4'
                                                                                : 'Konseling'}
                                                                        </span>
                                                                        <ArrowRight
                                                                            className="size-3"
                                                                            aria-hidden="true"
                                                                        />
                                                                    </Link>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3.5 pr-5 text-xs whitespace-nowrap text-muted-foreground">
                                                                <span className="rounded-md border border-border bg-surface-subtle px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                                                    {row.sumberRiwayat ===
                                                                    'arsip'
                                                                        ? 'Arsip Bu Sri'
                                                                        : 'Pengukuran Posyandu'}
                                                                </span>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {galatUnduh && (
                            <DialogGagal
                                judul="Laporan belum dapat diunduh"
                                pesan={galatUnduh}
                                onTutup={() => setGalatUnduh(null)}
                            />
                        )}

                        <div className="border-t border-border bg-surface-subtle/50 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
                            {tab === 'zscore' ? (
                                <p className="flex items-start gap-1.5">
                                    <Info
                                        className="mt-0.5 size-4 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        <strong>Keterangan Klinis:</strong>{' '}
                                        Z-score dihitung berdasarkan baku
                                        Permenkes RI No. 2/2020. Ambang normal:
                                        -2 SD sampai +1 SD (BB/U) atau +2 SD
                                        (TB/U). KBM dan status N/T mengacu pada
                                        pedoman Buku KIA Kemenkes RI.
                                    </span>
                                </p>
                            ) : (
                                <p className="flex items-start gap-1.5">
                                    <Info
                                        className="mt-0.5 size-4 shrink-0 text-amber-600"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        <strong>
                                            Pedoman Klinis Pemantauan 1T & 2T+
                                            (Buku KIA Kemenkes RI):
                                        </strong>{' '}
                                        KBM (Kenaikan Berat Minimal) merupakan
                                        acuan minimal kenaikan gram berat badan
                                        balita sesuai kelompok umur. Balita
                                        dengan status T wajib dievaluasi pola
                                        makan & asupan gizi. Balita 2T+ (dua
                                        kali berturut-turut tidak naik) wajib
                                        dirujuk ke Puskesmas/Fasilitas Kesehatan
                                        untuk pemeriksaan komprehensif.
                                    </span>
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Bilah Navigasi Langkah Antar Layar */}
                    <></>
                </div>
                <BantuanDetail
                    bagian={tab === 'zscore' ? 'laporan-zscore' : 'laporan-2t'}
                    terbuka={bantuanTerbuka}
                    onTutup={() => {
                        setBantuanTerbuka(false);
                        tombolBantuan.current?.focus();
                    }}
                >
                    {tab === 'zscore' ? (
                        <>
                            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-5 text-sky-950 shadow-sm sm:p-6">
                                <div className="flex items-start gap-3.5">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                                        <BookOpen
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-extrabold text-sky-950 sm:text-lg">
                                                Panduan Ibu Kader: Cara Membaca
                                                & Menggunakan Laporan F1 Z-Score
                                            </h3>
                                            <span className="rounded-full bg-sky-200/80 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                                                Pelaporan Puskesmas
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm leading-relaxed text-sky-800">
                                            Laporan ini menghitung z-score
                                            klinis setiap balita berdasarkan
                                            hasil ukur berat dan tinggi badan
                                            bulan {periode.label}:
                                        </p>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-xs">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-sky-100 text-xs font-extrabold text-sky-800">
                                                        1
                                                    </span>
                                                    <h4 className="text-xs font-extrabold tracking-wider text-sky-950 uppercase">
                                                        Pilih Indeks Ukur
                                                    </h4>
                                                </div>
                                                <p className="text-xs leading-normal text-sky-700">
                                                    Ganti indeks antara{' '}
                                                    <strong>BB/U</strong>{' '}
                                                    (Gizi),{' '}
                                                    <strong>TB/U</strong>{' '}
                                                    (Stunting), atau{' '}
                                                    <strong>BB/TB</strong>{' '}
                                                    (Wasting) melalui dropdown
                                                    indeks di bawah.
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-xs">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-sky-100 text-xs font-extrabold text-sky-800">
                                                        2
                                                    </span>
                                                    <h4 className="text-xs font-extrabold tracking-wider text-sky-950 uppercase">
                                                        Cek Status & Z-Score
                                                    </h4>
                                                </div>
                                                <p className="text-xs leading-normal text-sky-700">
                                                    Lihat kolom kesimpulan
                                                    status gizi berwarna. Skor Z
                                                    di bawah -2 SD otomatis
                                                    ditandai untuk rujukan gizi.
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-xs">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-sky-100 text-xs font-extrabold text-sky-800">
                                                        3
                                                    </span>
                                                    <h4 className="text-xs font-extrabold tracking-wider text-sky-950 uppercase">
                                                        Unduh Format F1
                                                    </h4>
                                                </div>
                                                <p className="text-xs leading-normal text-sky-700">
                                                    Klik tombol hijau{' '}
                                                    <em>Unduh F1 Excel</em>{' '}
                                                    untuk mengunduh rekap format
                                                    resmi pelaporan bulanan ke
                                                    Bidan Desa.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/85 p-5 text-amber-950 shadow-sm sm:p-6">
                                <div className="flex items-start gap-3.5">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
                                        <AlertTriangle
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-extrabold text-amber-950 sm:text-lg">
                                                Panduan Ibu Kader: Alur Deteksi
                                                Dini & Rujukan Balita Tidak Naik
                                                (1T & 2T+)
                                            </h3>
                                            <span className="rounded-full border border-rose-300 bg-rose-200/90 px-2.5 py-0.5 text-xs font-extrabold text-rose-900">
                                                Wajib Rujukan Medis
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm leading-relaxed text-amber-900">
                                            Daftar balita yang berat badannya
                                            tidak naik atau kenaikannya di bawah
                                            KBM (Kenaikan Berat Minimal) bulan{' '}
                                            {periode.label}:
                                        </p>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                            <div className="rounded-xl border border-amber-200/80 bg-white/95 p-3.5 shadow-xs">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-100 text-xs font-extrabold text-amber-800">
                                                        1
                                                    </span>
                                                    <h4 className="text-xs font-extrabold tracking-wider text-amber-950 uppercase">
                                                        Kenali Simbol N vs T
                                                    </h4>
                                                </div>
                                                <p className="text-xs leading-normal text-amber-900">
                                                    <strong>N (Naik)</strong>{' '}
                                                    jika kenaikan BB ≥ KBM.{' '}
                                                    <strong>
                                                        T (Tidak Naik)
                                                    </strong>{' '}
                                                    jika BB tetap, turun, atau
                                                    kenaikan di bawah KBM target
                                                    umur.
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-rose-200 bg-white/95 p-3.5 shadow-xs">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-rose-100 text-xs font-extrabold text-rose-800">
                                                        2
                                                    </span>
                                                    <h4 className="text-xs font-extrabold tracking-wider text-rose-950 uppercase">
                                                        Bahaya 2T+ (Kritis)
                                                    </h4>
                                                </div>
                                                <p className="text-xs leading-normal text-rose-900">
                                                    Balita{' '}
                                                    <strong>2T / 2T+</strong> (2
                                                    kali berturut-turut T)
                                                    berada pada fase gagal
                                                    tumbuh (
                                                    <em>growth faltering</em>)
                                                    yang memicu stunting akut
                                                    jika terlambat ditangani.
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-amber-200/80 bg-white/95 p-3.5 shadow-xs">
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-100 text-xs font-extrabold text-amber-800">
                                                        3
                                                    </span>
                                                    <h4 className="text-xs font-extrabold tracking-wider text-amber-950 uppercase">
                                                        Alur Rujukan Meja 4 &
                                                        Nakes
                                                    </h4>
                                                </div>
                                                <p className="text-xs leading-normal text-amber-900">
                                                    Arahkan orang tua ke{' '}
                                                    <strong>
                                                        Meja 4 (Konseling KMS)
                                                    </strong>{' '}
                                                    untuk pemeriksaan penyebab,
                                                    edukasi PMT, dan rujukan
                                                    prioritas ke Bidan Desa atau
                                                    Puskesmas.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </BantuanDetail>
            </div>
        </Halaman>
    );
}
