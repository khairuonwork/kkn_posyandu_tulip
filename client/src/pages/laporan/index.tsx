/**
 * Laporan — docs/rujukan/layar-demo.md bagian 6.6.
 *
 * Agregat SKDN per RT, bentuk yang dipakai laporan Posyandu.
 *
 * Layar ini dibatasi tinggi jendela: tabelnya yang menggulir, bukan halamannya.
 *
 * Tombol Unduh CSV dan Cetak A4 dicabut atas permintaan pemilik produk, begitu
 * pula empat kalimat keterangan — legenda SKDN termasuk. Semuanya beserta
 * risikonya tercatat di docs/riwayat/teks-dicabut-dari-layar.md bagian B. `csvLaporan()`
 * di demo/store.ts sengaja dibiarkan utuh supaya mengembalikan tombolnya cukup
 * satu blok JSX.
 */

import { FileText } from 'lucide-react';
import { useState } from 'react';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { KOSONG, pecahan, persenSaja, tanggalPanjang } from '@/lib/format';
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

/** Satu RT dengan D/S-nya sepanjang enam bulan. */
export type BarisTrenRt = {
    rt: string;
    ds: (number | null)[];
    rerata: number | null;
};

export type TabPeriode = 'harian' | 'bulanan' | 'tahunan';

const TAB: { nilai: TabPeriode; label: string }[] = [
    { nilai: 'harian', label: 'Harian' },
    { nilai: 'bulanan', label: 'Bulanan' },
    { nilai: 'tahunan', label: 'Tahunan' },
];

/**
 * Rentang waktu yang sedang ditampilkan, apa adanya.
 *
 * `Tahunan` dulu berbunyi "Tahun 2026" padahal arsip demo hanya memuat enam
 * bulan — angkanya terbaca sebagai setahun penuh, dan kalau dipakai melapor ke
 * Puskesmas itu salah lapor. `Harian` dulu tidak menyebut satu tanggal pun,
 * sehingga tab yang isinya sama persis dengan Bulanan terbaca seperti tab
 * rusak; arsip memang hanya punya satu tanggal ukur per periode, dan
 * menuliskannya membuat tab itu punya arti.
 */
function judulRentang(tab: TabPeriode, periode: Periode): string {
    if (tab === 'tahunan') {
        return 'Januari–Juni 2026';
    }

    if (tab === 'harian' && periode.tanggalKegiatan !== null) {
        return `Sesi penimbangan ${tanggalPanjang(periode.tanggalKegiatan)}`;
    }

    return periode.label;
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
    trenRt: BarisTrenRt[];
    semuaPeriode: { periodeId: string; label: string }[];
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
    trenRt,
    semuaPeriode,
}: Props) {
    const [rt, setRt] = useState('');
    const [tampilan, setTampilan] = useState<'skdn' | 'tren'>('skdn');
    const tampil =
        rt === '' ? rekapPerRt : rekapPerRt.filter((r) => r.rt === rt);

    return (
        <Halaman
            ikon={FileText}
            penuh="lg"
            judul="Laporan"
            subjudul={`${judulRentang(tab, periode)}. RW ${rw} Kelurahan ${kelurahan}. Data contoh.`}
        >
            <div className="flex shrink-0 flex-wrap items-end gap-3">
                {/* Grup tab dulu tidak berlabel sementara pemilih RT di
                    sebelahnya punya, sehingga pada `items-end` kata "RT"
                    menggantung sendirian di atas garis tab. Labelnya juga
                    menutup `role="tablist"` yang selama ini tanpa nama. */}
                <div className="flex flex-col gap-1">
                    <span
                        id="label-rentang"
                        className="text-sm font-semibold text-muted-foreground"
                    >
                        Rentang waktu
                    </span>
                    <div
                        className="flex flex-wrap gap-2"
                        role="tablist"
                        aria-labelledby="label-rentang"
                    >
                        {TAB.map((t) => (
                            <button
                                key={t.nilai}
                                type="button"
                                role="tab"
                                aria-selected={tab === t.nilai}
                                onClick={() => onGantiTab(t.nilai)}
                                className={`min-h-13 rounded-lg px-4.5 text-base font-semibold ${
                                    tab === t.nilai
                                        ? 'bg-primary font-bold text-primary-foreground'
                                        : 'border border-border-strong bg-card'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Saring RT berdiri di samping tab, bukan sendirian di dalam
                    kartu setinggi 80 px yang isinya satu kotak pilih. */}
                <label
                    htmlFor="rekap-rt"
                    className="flex flex-col gap-1 text-sm font-semibold text-muted-foreground"
                >
                    RT
                    <select
                        id="rekap-rt"
                        value={rt}
                        onChange={(e) => setRt(e.target.value)}
                        className="isian font-semibold text-foreground"
                    >
                        <option value="">Semua RT</option>
                        {wilayahRt.map((w) => (
                            <option key={w} value={w}>
                                RT {w.padStart(2, '0')}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {total.s === 0 ? (
                <div className="mt-6">
                    <EmptyState
                        sebab={`Belum ada pengukuran pada ${periode.label}.`}
                    >
                        {periodeTerisi !== null && (
                            <button
                                type="button"
                                onClick={() =>
                                    onPindahPeriode?.(periodeTerisi.id)
                                }
                                className="tombol-utama"
                            >
                                Lihat {periodeTerisi.label}
                            </button>
                        )}
                    </EmptyState>
                </div>
            ) : (
                <div className="flex flex-col lg:min-h-0 lg:flex-1">
                    {/* Pita rambut artboard: angka besar dan labelnya berdiri
                        sebaris pada garis dasar yang sama, bukan lima kartu
                        identik berjejer. */}
                    <div className="kartu mt-4 grid shrink-0 grid-cols-1 gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-cols-5">
                        {/* Pada tab Tahunan, S dan D adalah jumlah enam bulan,
                            bukan cacah balita — 633 di RW yang berisi 123 anak.
                            Aritmetikanya benar (D/S kumulatif memang begitu
                            dihitung); yang menyesatkan adalah angka telanjang
                            tanpa keterangan. */}
                        <Angka
                            nilai={total.s}
                            label="Sasaran (S)"
                            bawah={
                                tab === 'tahunan'
                                    ? 'jumlah 6 bulan, bukan jumlah balita'
                                    : undefined
                            }
                        />
                        <Angka
                            nilai={total.d}
                            label="Ditimbang (D)"
                            warna="text-tone-green"
                            bawah={
                                tab === 'tahunan'
                                    ? 'jumlah penimbangan 6 bulan'
                                    : undefined
                            }
                        />
                        <Angka
                            nilai={`${persenSaja(total.d, total.s)}%`}
                            label="Cakupan (D/S)"
                            warna="text-tone-green"
                            bawah={`${pecahan(total.d, total.s)} sasaran`}
                        />
                        <Angka
                            nilai={`${persenSaja(total.n, total.d)}%`}
                            label="Naik (N/D)"
                            bawah={`${pecahan(total.n, total.d)} ditimbang`}
                        />
                        <Angka
                            nilai={total.bgm}
                            label="BGM"
                            warna={total.bgm > 0 ? 'text-tone-red' : undefined}
                            bawah="di bawah garis merah"
                        />
                    </div>

                    <div className="kartu mt-4 flex flex-col overflow-hidden lg:min-h-0 lg:flex-1">
                        <div className="strip-kepala shrink-0">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <h2 className="text-xl font-extrabold">
                                    {tampilan === 'skdn'
                                        ? 'Rekap per RT'
                                        : 'Cakupan per RT, enam bulan'}
                                </h2>

                                {/* Pengalih isi, bukan kartu kedua: pada 1280 px
                                    kartu ini hanya menyisakan 89 px kosong di
                                    bawah tabelnya, jadi tabel kedua tidak muat.
                                    Mengganti isi tidak menambah tinggi sama
                                    sekali. */}
                                <div
                                    className="ml-auto flex flex-wrap gap-2"
                                    role="tablist"
                                    aria-label="Tampilan rekap"
                                >
                                    {(['skdn', 'tren'] as const).map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            role="tab"
                                            aria-selected={tampilan === t}
                                            onClick={() => setTampilan(t)}
                                            className={`min-h-13 rounded-lg px-4 text-sm font-semibold ${
                                                tampilan === t
                                                    ? 'bg-primary font-bold text-primary-foreground'
                                                    : 'border border-border-strong bg-card'
                                            }`}
                                        >
                                            {t === 'skdn'
                                                ? 'SKDN'
                                                : 'Enam bulan'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tampilan enam bulan selalu memakai keenam periode
                                dan tidak mengikuti Rentang waktu di atas;
                                dikatakan, bukan dibiarkan ditebak. */}
                            {tampilan === 'tren' && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Januari–Juni 2026, tidak mengikuti Rentang
                                    waktu di atas.
                                </p>
                            )}
                            {/* Petunjuk geser dipertahankan: ia instruksi
                                pemakaian, bukan keterangan data, dan hanya
                                muncul di layar yang memang lebih sempit
                                daripada tabelnya. Kolom yang disebut mengikuti
                                tabel yang sedang tampil. */}
                            <p className="mt-1 text-sm text-muted-foreground md:hidden">
                                Tabel ini lebih lebar daripada layar. Geser ke
                                samping untuk melihat kolom{' '}
                                {tampilan === 'skdn'
                                    ? 'N, T, O, B, dan BGM'
                                    : 'bulan berikutnya dan Rerata'}
                                .
                            </p>
                        </div>

                        {tampilan === 'tren' && (
                            <TabelTrenRt
                                baris={
                                    rt === ''
                                        ? trenRt
                                        : trenRt.filter((r) => r.rt === rt)
                                }
                                periode={semuaPeriode}
                            />
                        )}

                        {tampilan === 'skdn' && (
                            <Table containerClassName="lg:min-h-0 lg:flex-1">
                                <TableHeader>
                                    {/* Legenda SKDN dicabut atas permintaan pemilik
                                    produk (docs/13 bagian 1), meninggalkan
                                    sembilan kolom berjudul satu huruf tanpa satu
                                    pun keterangan. `title` adalah jalan keluar
                                    yang disebut dokumen itu sendiri: arti kolom
                                    kembali terjangkau, tanpa memakan satu piksel
                                    pun dari layar yang memang harus muat sekali
                                    tampil. */}
                                    <TableRow>
                                        <TableHead scope="col">RT</TableHead>
                                        <TableHead
                                            scope="col"
                                            title="Sasaran: balita 0 sampai 59 bulan di wilayah"
                                        >
                                            S
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            title="Ditimbang bulan ini"
                                        >
                                            D
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            title="Cakupan penimbangan: D dibagi S"
                                        >
                                            D/S
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            title="Naik: berat naik sesuai garis pertumbuhan"
                                        >
                                            N
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            title="Tidak naik"
                                        >
                                            T
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            title="Tidak ditimbang bulan lalu"
                                        >
                                            O
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            title="Baru pertama kali ditimbang"
                                        >
                                            B
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            title="Di bawah garis merah pada KMS, dihitung dari BB/U"
                                        >
                                            BGM
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tampil.map((r) => (
                                        <TableRow key={r.rt}>
                                            <TableCell className="font-semibold">
                                                RT {r.rt.padStart(2, '0')}
                                            </TableCell>
                                            <TableCell>{r.s}</TableCell>
                                            <TableCell>{r.d}</TableCell>
                                            <TableCell>
                                                {persenSaja(r.d, r.s)}%
                                            </TableCell>
                                            <TableCell>{r.n}</TableCell>
                                            <TableCell>{r.t}</TableCell>
                                            <TableCell>{r.o}</TableCell>
                                            <TableCell>{r.b}</TableCell>
                                            <TableCell>{r.bgm}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell>Total</TableCell>
                                        <TableCell>{total.s}</TableCell>
                                        <TableCell>{total.d}</TableCell>
                                        <TableCell>
                                            {persenSaja(total.d, total.s)}%
                                        </TableCell>
                                        <TableCell>{total.n}</TableCell>
                                        <TableCell>{total.t}</TableCell>
                                        <TableCell>{total.o}</TableCell>
                                        <TableCell>{total.b}</TableCell>
                                        <TableCell>{total.bgm}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        )}
                    </div>
                </div>
            )}
        </Halaman>
    );
}

/**
 * Tabel D/S tiap RT sepanjang enam bulan.
 *
 * Rekap SKDN di sebelahnya memotret satu bulan, sehingga RT yang tertinggal
 * terus-menerus tidak bisa dibedakan dari RT yang kebetulan jeblok sekali.
 * Kolom rerata di ujung kanan yang menjawab itu, dan ia dihitung dari total D
 * dibagi total S — bukan rata-rata dari enam persen, yang akan memberi bobot
 * sama pada bulan dengan 7 sasaran dan bulan dengan 44.
 */
function TabelTrenRt({
    baris,
    periode,
}: {
    baris: BarisTrenRt[];
    periode: { periodeId: string; label: string }[];
}) {
    return (
        <Table containerClassName="lg:min-h-0 lg:flex-1">
            <TableHeader>
                <TableRow>
                    <TableHead scope="col">RT</TableHead>
                    {periode.map((p) => (
                        <TableHead
                            key={p.periodeId}
                            scope="col"
                            title={p.label}
                        >
                            {/* Hanya nama bulannya: enam kali "2026" pada satu
                                baris kepala tidak menambah satu pun informasi,
                                dan subjudul halaman sudah menyebut tahunnya. */}
                            {p.label.replace(/\s+\d{4}$/, '')}
                        </TableHead>
                    ))}
                    <TableHead
                        scope="col"
                        title="Rerata enam bulan: total ditimbang dibagi total sasaran"
                    >
                        Rerata
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {baris.map((r) => (
                    <TableRow key={r.rt}>
                        <TableCell className="font-semibold">
                            RT {r.rt.padStart(2, '0')}
                        </TableCell>
                        {r.ds.map((n, urutan) => (
                            <TableCell key={urutan}>
                                {/* Tanpa sasaran bukan nol persen. Em dash,
                                    sama seperti sel kosong di seluruh Portal. */}
                                {n === null ? (
                                    <span className="text-muted-foreground">
                                        {KOSONG}
                                    </span>
                                ) : (
                                    `${n}%`
                                )}
                            </TableCell>
                        ))}
                        <TableCell className="font-bold">
                            {r.rerata === null ? (
                                <span className="text-muted-foreground">
                                    {KOSONG}
                                </span>
                            ) : (
                                `${r.rerata}%`
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

/** Satu sel pita ringkasan. Latarnya kartu; garis pemisahnya celah 1px grid. */
function Angka({
    nilai,
    label,
    bawah,
    warna,
}: {
    nilai: number | string;
    label: string;
    bawah?: string;
    warna?: string;
}) {
    return (
        <div className="bg-card px-5 py-4.5">
            {/* Angka dan labelnya sebaris pada garis dasar yang sama — bentuk
                pita pada artboard Laporan. */}
            <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span className={`text-2xl font-extrabold ${warna ?? ''}`}>
                    {nilai}
                </span>
                <span className="text-sm text-muted-foreground">{label}</span>
            </p>
            {bawah !== undefined && (
                <p className="mt-1 text-sm text-muted-foreground">{bawah}</p>
            )}
        </div>
    );
}
