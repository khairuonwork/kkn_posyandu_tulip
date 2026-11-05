import { FileText } from 'lucide-react';
import { useState } from 'react';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHeadUrut,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { persenSaja } from '@/lib/format';
import { Link } from '@/lib/nav';
import type { Periode } from '@/types/posyandu';
import type { BarisRekapRt, PropsLaporan, TabPeriode } from './tipe';
type Kolom = 'rt' | 's' | 'd' | 'ds' | 'n' | 'nd' | 't' | 'o' | 'b' | 'bgm';

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

function judulRentang(tab: TabPeriode, periode: Periode): string {
    return tab === 'tahunan' ? 'Januari–Juni 2026' : periode.label;
}
export default function TabSkdn({
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
}: PropsLaporan) {
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
            <nav
                aria-label="Jenis laporan"
                className="mb-5 flex flex-wrap gap-2"
            >
                <Link className="tab" href="/laporan" aria-current="page">
                    Rekap Bulanan
                </Link>
                <Link className="tab" href="/laporan?tab=tumbuh-kembang">
                    Tumbuh Kembang
                </Link>
            </nav>
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
