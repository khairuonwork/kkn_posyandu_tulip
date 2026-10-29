/**
 * Laporan — rekap SKDN per RT, mengikuti mockup yang disetujui 26 September
 * 2026 (rancangan awal: docs/riwayat/layar-demo.md bagian 6.6).
 *
 * Rentang laporan dipilih di bilah kepala: bulan yang sedang dibuka, atau
 * enam bulan terakhir. Satu kartu tabel berisi saringan RT, kolom yang bisa
 * diurutkan, dan baris Total. Dari 1024 px tabelnya yang menggulir, bukan
 * halamannya.
 *
 * Tombol Unduh CSV dan Cetak A4 dicabut atas permintaan pemilik produk
 * (docs/riwayat/teks-dicabut-dari-layar.md bagian B). `csvLaporan()` di
 * data/contoh/store.ts sengaja dibiarkan utuh supaya mengembalikan tombolnya
 * cukup satu blok JSX.
 */

import { Download, FileText, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import StatusGiziBadge from '@/components/status-gizi-badge';
import { kesimpulanZScore } from '@/lib/kategori';
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
import type { useLaporanServer } from '@/lib/laporan';
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
            />
        );
    }

    const angka = (r: BarisRekapRt) => [
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
            judul="Laporan"
            subjudul={`Rekap penimbangan per RT · RW ${rw} Kelurahan ${kelurahan}. Data contoh.`}
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
                        {/* Kader hanya punya satu RT; saringannya tidak perlu. */}
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
                        {/* Lebar tetap: tanpa ini kolom O, B, dan BGM melebar
                            mengikuti keterangannya yang panjang, dan jarak
                            antarangka jadi tidak rata. */}
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
                                    {angka(r).map((n, i) => (
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
                                    {angka(total).map((n, i) => (
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
                            {/* Pada enam bulan, S dan D adalah jumlah
                                penimbangan, bukan cacah balita; tanpa kalimat
                                ini 633 terbaca sebagai jumlah anak. */}
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

function umurUntukLaporan(umurLengkap: string, hanyaTahunBulan = false): string {
    const lengkap = /^(\d+)Thn(\d+)Bln(?:(\d+)Hari)?$/.exec(umurLengkap ?? '');

    if (lengkap !== null) {
        if (hanyaTahunBulan) {
            return `${Number(lengkap[1])} thn ${Number(lengkap[2])} bln`;
        }
        return `${Number(lengkap[1])} thn ${Number(lengkap[2])} bln${lengkap[3] ? ` ${Number(lengkap[3])} hari` : ''}`;
    }

    // Tetap terbaca bila API yang berjalan masih memakai keluaran antara.
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
}: {
    periode: Periode;
    laporan: ReturnType<typeof useLaporanServer>;
    bolehUnduh: boolean;
}) {
    const [tab, setTab] = useState<'zscore' | '2t'>('zscore');
    const [indeks, setIndeks] = useState('BB_U');
    const [standar, setStandar] = useState('PERMENKES-2-2020');
    const [galatUnduh, setGalatUnduh] = useState<string | null>(null);
    const [mengunduhF1, setMengunduhF1] = useState(false);
    const data = laporan.data;
    const daftarIndeks = [
        ['BB_U', 'BB/U'],
        ['TB_U', 'TB/U'],
        ['BB_TB', 'BB/TB'],
        ['IMT_U', 'IMT/U'],
        ['LILA_U', 'LILA/U'],
        ['LIKA_U', 'LIKA/U'],
    ];

    // Di website: tampilkan anak 2T+ serta anak 1T pada bulan laporan agar tabel tidak kosong
    const daftarT = useMemo(() => {
        const riwayat = data?.riwayat2T ?? [];
        const anakRiwayat = new Set(riwayat.map((r) => r.anakId));
        const anakSatuT = (data?.bulanan ?? [])
            .filter((r) => !anakRiwayat.has(r.anakId) && (r.nt === 'T' || (r.jumlahTBerturut && r.jumlahTBerturut >= 1)))
            .map((r) => ({
                ...r,
                status2T: r.status2T ?? (r.jumlahTBerturut ? `${r.jumlahTBerturut}T` : '1T'),
                jumlahTBerturut: r.jumlahTBerturut ?? 1,
                sumberRiwayat: r.sumberRiwayat ?? 'pengukuran',
            }));
        return [...riwayat, ...anakSatuT];
    }, [data?.riwayat2T, data?.bulanan]);

    const jumlahDuaT = data?.ringkasan.denganDuaT ?? 0;
    const jumlahSatuT = useMemo(() => {
        const anakRiwayat = new Set((data?.riwayat2T ?? []).map((r) => r.anakId));
        return (data?.bulanan ?? []).filter(
            (r) => !anakRiwayat.has(r.anakId) && (r.nt === 'T' || (r.jumlahTBerturut && r.jumlahTBerturut >= 1)),
        ).length;
    }, [data?.riwayat2T, data?.bulanan]);
    const totalT = jumlahDuaT + jumlahSatuT;

    const baris =
        tab === 'zscore' ? (data?.bulanan ?? []) : daftarT;

    return (
        <Halaman
            ikon={FileText}
            judul="Laporan"
            subjudul={`Rekap live Posyandu · ${periode.label}. Data berasal dari catatan ukur dan penilaian tersimpan.`}
            aksi={
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="tombol-kedua"
                        onClick={laporan.muatUlang}
                    >
                        <RefreshCw className="size-4.5" aria-hidden="true" /> Perbarui
                    </button>
                    {bolehUnduh && (
                        <button
                            type="button"
                            className="tombol-kedua"
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
                            <Download className="size-4.5" aria-hidden="true" /> Excel Z-score & 2T
                        </button>
                    )}
                    {bolehUnduh && (
                        <button type="button" className="tombol-utama" disabled={mengunduhF1}
                            onClick={async () => {
                                setMengunduhF1(true); setGalatUnduh(null);
                                try { await laporan.unduh('f1'); }
                                catch (e) { setGalatUnduh(e instanceof Error ? e.message : 'Unduhan F1 gagal.'); }
                                finally { setMengunduhF1(false); }
                            }}>
                            <Download className="size-4.5" aria-hidden="true" /> {mengunduhF1 ? 'Menyiapkan F1…' : 'Unduh F1 Excel'}
                        </button>
                    )}
                </div>
            }
        >
            <div className="grid gap-3 sm:grid-cols-3">
                <article className="kartu p-4">
                    <p className="text-sm text-muted-foreground">
                        Balita diukur
                    </p>
                    <p className="mt-1 text-2xl font-extrabold">
                        {data?.ringkasan.anakDiukur ?? '—'}
                    </p>
                </article>
                <article className="kartu p-4">
                    <p className="text-sm text-muted-foreground">
                        Pemantauan 1T & 2T+
                    </p>
                    <p className="mt-1 text-2xl font-extrabold">
                        {totalT > 0 ? (
                            <>
                                <span>{jumlahDuaT} (2T+)</span>
                                {jumlahSatuT > 0 && (
                                    <span className="ml-1 text-base font-normal text-muted-foreground">
                                        · {jumlahSatuT} (1T)
                                    </span>
                                )}
                            </>
                        ) : data && (data.ringkasan.belumDapatDinilai ?? 0) > 0 ? (
                            'Belum cukup data'
                        ) : (
                            '0'
                        )}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {totalT > 0
                            ? `${totalT} balita tidak naik (1T & 2T+) bulan ini`
                            : 'Tidak ada balita tidak naik bulan ini'}
                    </p>
                </article>
                <article className="kartu p-4">
                    <p className="text-sm text-muted-foreground">
                        Standar tersedia
                    </p>
                    <p className="mt-1 text-lg font-extrabold">
                        {data?.standar
                            .map((s) =>
                                s === 'PERMENKES-2-2020'
                                    ? 'Permenkes 2/2020'
                                    : s === 'WHO-2006'
                                      ? 'WHO 2006'
                                      : s,
                            )
                            .join(', ') || '—'}
                    </p>
                </article>
            </div>
            <section className="kartu mt-4 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                    <div
                        className="bilah-tab"
                        role="tablist"
                        aria-label="Jenis laporan"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'zscore'}
                            onClick={() => setTab('zscore')}
                            className="tab"
                        >
                            Rekap Z-score
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === '2t'}
                            onClick={() => setTab('2t')}
                            className="tab"
                        >
                            Riwayat 1T & 2T+
                        </button>
                    </div>
                    {tab === 'zscore' && (
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                Standar
                                <select
                                    className="isian"
                                    value={standar}
                                    onChange={(e) => setStandar(e.target.value)}
                                >
                                    {(data?.standar ?? [standar]).map(
                                        (value) => (
                                            <option key={value} value={value}>
                                                {value === 'PERMENKES-2-2020'
                                                    ? 'Permenkes 2/2020'
                                                    : value === 'WHO-2006'
                                                      ? 'WHO 2006'
                                                      : value}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                Indeks
                                <select
                                    className="isian"
                                    value={indeks}
                                    onChange={(e) => setIndeks(e.target.value)}
                                >
                                    {daftarIndeks.map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    )}
                </div>
                {tab === '2t' && data?.keterangan2T && (
                    <p className="border-b border-border bg-muted/30 px-5 py-3 text-sm text-muted-foreground">
                        {data.keterangan2T}
                    </p>
                )}
                {laporan.status === 'memuat' ? (
                    <div
                        className="space-y-3 p-5"
                        role="status"
                        aria-live="polite"
                    >
                        <span className="sr-only">Memuat data laporan…</span>
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-12 animate-pulse rounded-lg bg-surface-subtle"
                            />
                        ))}
                    </div>
                ) : laporan.status === 'galat' ? (
                    <div className="p-6">
                        <p role="alert">{laporan.pesanGalat}</p>
                        <button
                            className="tombol-kedua mt-3"
                            onClick={laporan.muatUlang}
                        >
                            Coba lagi
                        </button>
                    </div>
                ) : (
                    <div
                        className="gulir-dalam w-full overflow-x-auto"
                        tabIndex={0}
                        role="region"
                        aria-label="Tabel laporan, geser ke samping untuk melihat semua kolom"
                    >
                        {baris.length === 0 ? (
                            <p className="p-6 text-muted-foreground">
                                {tab === 'zscore'
                                    ? `Belum ada pengukuran hadir pada ${periode.label}.`
                                    : (data?.ringkasan.belumDapatDinilai ?? 0) >
                                        0
                                      ? `Riwayat 1T & 2T+ ${periode.label} belum dapat ditentukan karena data pembanding belum lengkap.`
                                      : `Tidak ada anak berstatus 1T maupun 2T+ pada ${periode.label}.`}
                            </p>
                        ) : (
                            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                                <thead className="bg-muted/60">
                                    <tr>
                                        {(tab === 'zscore'
                                            ? [
                                                  'Nama',
                                                  'RT',
                                                  'Umur lengkap',
                                                  'Tanggal ukur',
                                                  'BB (kg)',
                                                  'TB/PB (cm)',
                                                  'Z-score',
                                                  'Kesimpulan Status Gizi',
                                              ]
                                            : [
                                                  'Nama',
                                                  'RT',
                                                  'Periode',
                                                  'Umur',
                                                  'BB (kg)',
                                                  'Kenaikan (g)',
                                                  'KBM (g)',
                                                  'N/T',
                                                  'Status tidak naik',
                                                  'Sumber',
                                              ]
                                        ).map((h) => (
                                            <th
                                                key={h}
                                                className="sticky top-0 px-4 py-3.5 font-bold whitespace-nowrap first:pl-5 last:pr-5"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {baris.map((row, index) => {
                                        const assessment =
                                            row.penilaian[standar]?.[indeks];

                                        return (
                                            <tr
                                                key={`${row.anakId}-${row.periodeId}-${index}`}
                                                className="border-t border-border"
                                            >
                                                <td className="px-4 py-3.5 pl-5 font-semibold whitespace-nowrap">
                                                    {row.nama}
                                                </td>
                                                <td className="px-4 py-3.5 tabular-nums">
                                                    {row.rt
                                                        ? `RT ${row.rt}`
                                                        : '—'}
                                                </td>
                                                {tab === 'zscore' ? (
                                                    <>
                                                        <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                                                            {umurUntukLaporan(
                                                                row.umurLengkap,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                                                            {tanggalRingkas(
                                                                row.tanggalUkur ??
                                                                    null,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 tabular-nums">
                                                            {angka(
                                                                row.bbKg ??
                                                                    null,
                                                                1,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 tabular-nums">
                                                            {angka(
                                                                row.tinggiCm ??
                                                                    null,
                                                                1,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 font-semibold tabular-nums">
                                                            {zScore(
                                                                typeof assessment?.z ===
                                                                    'number'
                                                                    ? assessment.z
                                                                    : null,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 pr-5 font-semibold">
                                                            <StatusGiziBadge
                                                                kategori={kesimpulanZScore(assessment?.kategori, assessment?.z)}
                                                                rapat
                                                            />
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-4 py-3.5 tabular-nums">
                                                            {row.periodeId}
                                                        </td>
                                                        <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                                                            {umurUntukLaporan(
                                                                row.umurLengkap,
                                                                true,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 tabular-nums">
                                                            {angka(
                                                                row.bbKg ??
                                                                    null,
                                                                1,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 tabular-nums">
                                                            {angka(
                                                                row.kenaikanGram ??
                                                                    null,
                                                                0,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 tabular-nums">
                                                            {angka(
                                                                row.kbmGram ??
                                                                    null,
                                                                0,
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 font-bold">
                                                            {row.nt ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5 font-bold">
                                                            <span
                                                                className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-bold ${
                                                                    (row.jumlahTBerturut ?? 0) >= 2 || row.duaT || (row.status2T && row.status2T !== '1T')
                                                                        ? 'bg-tone-red-bg text-tone-red'
                                                                        : 'bg-tone-amber-bg text-tone-amber'
                                                                }`}
                                                            >
                                                                {row.status2T ?? (row.jumlahTBerturut ? `${row.jumlahTBerturut}T` : row.duaT ? '2T+' : '1T')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 pr-5 whitespace-nowrap">
                                                            {row.sumberRiwayat ===
                                                            'arsip'
                                                                ? 'Arsip Bu Sri'
                                                                : 'Pengukuran aplikasi'}
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
                )}
                {galatUnduh && (
                    <p
                        className="border-t border-border px-5 py-3 text-sm text-destructive"
                        role="alert"
                    >
                        {galatUnduh}
                    </p>
                )}
                <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-muted-foreground">
                    {data?.metodeUmur ??
                        'Z-score laporan adalah estimasi umur hari yang diinterpolasi di antara titik standar bulanan, bukan pengganti penilaian resmi. '}
                    KBM dan penetapan N/T tetap mengikuti kelompok umur pada
                    KMS. Rekap N/T tidak menimpa catatan historis dan perlu
                    ditinjau petugas.
                </p>
            </section>
        </Halaman>
    );
}
