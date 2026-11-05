import {
    ChevronRight,
    CloudOff,
    Minus,
    RotateCw,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useState } from 'react';
import StatusGiziBadge, {
    IKON,
    KELAS,
    nadaKategori,
} from '@/components/status-gizi-badge';
import {
    inisial,
    KOSONG,
    namaTampil,
    persenSaja,
    umurRingkas,
} from '@/lib/format';
import { Link } from '@/lib/nav';
import type { AnakPerluPerhatian, AntreanKirim, CakupanPeriode } from '../tipe';
/** Pita "belum terkirim" di bilah kepala. */
export function PitaTertahan({
    antrean,
    onKirim,
}: {
    antrean: AntreanKirim;
    onKirim?: () => void;
}) {
    return (
        <div
            role="status"
            className="flex items-center gap-3.5 rounded-lg border border-tone-amber bg-tone-amber-bg py-1.5 pr-1.5 pl-4"
        >
            <CloudOff
                className="size-6 shrink-0 text-tone-amber"
                strokeWidth={2.5}
                aria-hidden="true"
            />
            {/* Kalimat kedua yang penting: kader perlu tahu ini bukan
                kehilangan data, hanya tertunda. */}
            <span className="flex min-w-0 grow flex-col text-sm text-pretty">
                <span className="font-bold text-tone-amber">
                    {antrean.jumlah} hasil ukur belum terkirim
                </span>
                <span>
                    Tersimpan di perangkat ini sejak {antrean.sejak}. Tidak ada
                    yang hilang.
                </span>
            </span>
            <button
                type="button"
                onClick={onKirim}
                className="tombol-kedua shrink-0 border-tone-amber px-4 font-bold text-tone-amber"
            >
                <RotateCw
                    className="size-5"
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
                Kirim ulang
            </button>
        </div>
    );
}

/**
 * Cakupan bulan ini dibanding bulan sebelumnya pada deret enam bulan, sebagai
 * keterangan pendek. Undefined bila periode ini yang pertama atau bulan lalu
 * tanpa sasaran.
 */
export function bandingBulanLalu(
    deret: CakupanPeriode[],
    periodeId: string,
    cakupan: number,
): string | undefined {
    const i = deret.findIndex((c) => c.periodeId === periodeId);
    const lalu = i > 0 ? deret[i - 1] : undefined;

    if (lalu === undefined || lalu.sasaran === 0) {
        return undefined;
    }

    const persenLalu = persenSaja(lalu.ditimbang, lalu.sasaran);

    if (cakupan === persenLalu) {
        return `sama dengan ${namaBulan(lalu.label)}`;
    }

    return `${cakupan > persenLalu ? 'naik' : 'turun'} dari ${persenLalu}%`;
}

/** Satu KPI ramping: petak ikon, label, angka, dan keterangan pendek. */
export function Kpi({
    ikon: Ikon,
    label,
    nilai,
    keterangan,
    nada = 'hijau',
}: {
    ikon: ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    nilai: number | string;
    keterangan: string;
    nada?: 'hijau' | 'netral' | 'oranye';
}) {
    const kelasIkon =
        nada === 'netral'
            ? 'bg-surface-alt text-muted-foreground'
            : nada === 'oranye'
              ? 'bg-tone-amber-bg text-tone-amber'
              : 'bg-accent text-primary';

    return (
        <section className="flex min-w-0 items-start gap-3 px-5 sm:px-7">
            <span
                aria-hidden="true"
                className={`mt-0.5 hidden size-8 shrink-0 items-center justify-center rounded-lg sm:flex ${kelasIkon}`}
            >
                <Ikon className="size-4.5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
                <h2 className="text-sm leading-snug font-semibold text-muted-foreground">
                    {label}
                </h2>
                {/* Membungkus di kartu sempit (tablet tegak): keterangannya
                    turun ke bawah angka, bukan meluber keluar kartu. */}
                <p className="mt-3 flex flex-col gap-2">
                    <span className="text-4xl leading-none font-bold tracking-tight tabular-nums">
                        {nilai}
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {keterangan}
                    </span>
                </p>
            </div>
        </section>
    );
}

/** Judul kartu dengan keterangan redup di kanannya. */
export function KepalaKartu({ judul, sub }: { judul: string; sub: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <h2 className="text-lg font-extrabold">{judul}</h2>
            <span className="text-sm text-muted-foreground">{sub}</span>
        </div>
    );
}

/** "Juni 2026" menjadi "Juni". */
export function namaBulan(label: string): string {
    return label.split(' ')[0];
}

/**
 * "Januari – Juni 2026", atau lengkap kedua ujungnya bila tahunnya berbeda.
 * Label periode berbentuk "<bulan> <tahun>".
 */
export function rentangBulan(label: string[]): string {
    if (label.length === 0) {
        return '';
    }

    const awal = label[0];
    const akhir = label[label.length - 1];
    const [bulanAwal, tahunAwal] = awal.split(' ');

    return tahunAwal === akhir.split(' ')[1]
        ? `${bulanAwal} – ${akhir}`
        : `${awal} – ${akhir}`;
}

/**
 * Satu petak Status gizi. Nada dan ikonnya dari lencana kategori, supaya
 * petak dan lencana di daftar sebelahnya tidak pernah berbeda warna. Nol pada
 * kategori masalah adalah kabar baik: abu, tanpa warna peringatan.
 */
export function PetakGizi({ label, nilai }: { label: string; nilai: number }) {
    const nada = nadaKategori(label);
    const Ikon = IKON[nada];
    const kelas =
        nilai === 0 && nada !== 'hijau'
            ? 'bg-surface text-muted-foreground'
            : KELAS[nada];

    return (
        <li className="flex min-h-12 items-center justify-between gap-3 py-3">
            <span className="flex items-center gap-3">
                <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-md ${kelas}`}
                >
                    <Ikon
                        className="size-4"
                        strokeWidth={2}
                        aria-hidden="true"
                    />
                </span>
                <span className="text-sm font-medium">{label}</span>
            </span>
            <span className="text-lg font-bold tabular-nums">{nilai}</span>
        </li>
    );
}

/** Warna angka dan batang bulan berjalan pada kartu Tren. */
export const WARNA_TREN = {
    amber: { teks: 'text-tone-amber', batang: 'bg-[#c77f0a]' },
    merah: { teks: 'text-tone-red', batang: 'bg-tone-red' },
};

/**
 * Satu baris tren: nama masalah dengan selisih dari bulan lalu, lalu enam
 * batang kecil. Angka bulan berjalan dicetak lebih besar dan berwarna.
 *
 * Angka, bukan persen: seorang kader menindaklanjuti lima anak, bukan lima
 * persen.
 */
export function BarisTren({
    label,
    nilai,
    bulan,
    puncak,
    warna,
}: {
    label: string;
    /** Enam bulan, terlama di kiri. Bulan berjalan yang terakhir. */
    nilai: number[];
    /** Nama bulan tiap nilai, untuk teks alternatif grafiknya. */
    bulan: string[];
    /**
     * Puncak BERSAMA ketiga baris, bukan puncak baris ini sendiri: batang
     * setinggi sama harus berarti angka yang sama di baris mana pun.
     */
    puncak: number;
    warna: { teks: string; batang: string };
}) {
    const kini = nilai[nilai.length - 1];
    const selisih = nilai.length > 1 ? kini - nilai[nilai.length - 2] : null;
    const bulanLalu = bulan[bulan.length - 2] ?? '';

    // Untuk masalah gizi, bertambah berarti memburuk: merah saat naik.
    const bulanPendek = bulanLalu.slice(0, 3);
    const [kelasSelisih, IkonSelisih, teksSelisih] =
        selisih === null
            ? [null, null, null]
            : selisih > 0
              ? [
                    'bg-tone-red-bg text-tone-red',
                    TrendingUp,
                    `Naik ${selisih} anak dari ${bulanPendek}`,
                ]
              : selisih < 0
                ? [
                      'bg-tone-green-bg text-tone-green',
                      TrendingDown,
                      `Turun ${-selisih} anak dari ${bulanPendek}`,
                  ]
                : [
                      'bg-surface-alt text-muted-foreground',
                      Minus,
                      `Tetap (${kini} anak) sejak ${bulanPendek}`,
                  ];

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_144px] items-end gap-3 border-b border-rule pb-3 sm:grid-cols-[minmax(0,1fr)_222px]">
            <div className="min-w-0">
                <p className="text-base leading-tight font-bold">{label}</p>
                {IkonSelisih !== null && (
                    <span
                        className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${kelasSelisih}`}
                    >
                        <IkonSelisih
                            className="size-3.5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        {teksSelisih}
                    </span>
                )}
            </div>

            <div
                role="img"
                aria-label={`${label}: ${nilai.map((n, i) => `${bulan[i]} ${n}`).join(', ')}`}
                className="grid h-20 items-end gap-[5px]"
                style={{
                    gridTemplateColumns: `repeat(${Math.max(1, nilai.length)}, minmax(0, 1fr))`,
                }}
            >
                {nilai.map((n, urutan) => {
                    const terakhir = urutan === nilai.length - 1;

                    return (
                        <div
                            key={urutan}
                            className="flex h-full flex-col items-center justify-end pt-7"
                        >
                            {/* Nol digambar sebagai garis dasar 2 px, bukan
                                batang pendek: batang pendek terbaca
                                "sedikit", padahal artinya tidak ada. Tinggi
                                lainnya dalam persen ruang batang; `pt-7`
                                menyisakan tempat untuk angka di atasnya. */}
                            <span
                                className={`relative w-full max-w-[24px] rounded-t-[3px] ${
                                    terakhir ? warna.batang : 'bg-input'
                                }`}
                                style={{
                                    height:
                                        n === 0
                                            ? '2px'
                                            : `${(n / puncak) * 100}%`,
                                }}
                            >
                                <span
                                    className={`absolute bottom-full left-1/2 mb-px -translate-x-1/2 leading-tight tabular-nums ${
                                        terakhir
                                            ? `text-lg font-extrabold ${n === 0 ? 'text-muted-foreground' : warna.teks}`
                                            : 'text-sm font-semibold text-muted-foreground'
                                    }`}
                                >
                                    {n}
                                </span>
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/** Empat prioritas ditampilkan awal; seluruh daftar tetap dapat dibuka. */
export function DaftarPerhatian({ anak }: { anak: AnakPerluPerhatian[] }) {
    const [semua, setSemua] = useState(false);
    const terlihat = semua ? anak : anak.slice(0, 4);

    return (
        <section
            aria-labelledby="judul-perlu"
            className="beranda-perhatian kartu flex min-w-0 flex-col overflow-hidden"
        >
            <div className="flex flex-col gap-1.5 border-b border-rule px-5 py-5 sm:px-6">
                <h2 id="judul-perlu" className="text-lg font-extrabold">
                    Perlu perhatian
                </h2>
                {anak.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                        {anak.length} balita
                        {anak.length > 1 && ' · paling mendesak di atas'}
                    </span>
                )}
            </div>

            {anak.length === 0 ? (
                <p className="px-5.5 py-6 text-base text-muted-foreground">
                    Tidak ada balita yang perlu perhatian bulan ini.
                </p>
            ) : (
                <ul
                    id="daftar-perhatian"
                    aria-label={`${terlihat.length} dari ${anak.length} balita yang perlu perhatian`}
                >
                    {terlihat.map((a) => (
                        <li
                            key={a.anakId}
                            className="border-b border-rule last:border-b-0"
                        >
                            <Link
                                href={`/balita/${a.anakId}`}
                                className="flex min-h-20 items-center gap-3.5 px-5 py-4 hover:bg-surface-subtle sm:px-6"
                            >
                                {/* Penanda tempat, bukan foto: tidak ada anak
                                    yang punya potret di arsip. */}
                                <span
                                    aria-hidden="true"
                                    className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-tone-amber-bg text-sm font-extrabold text-tone-amber sm:flex"
                                >
                                    {inisial(a.nama)}
                                </span>

                                <span className="flex min-w-0 grow flex-col gap-1">
                                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                        <span className="text-base font-extrabold break-words">
                                            {namaTampil(a.nama)}
                                        </span>
                                        <StatusGiziBadge
                                            kategori={a.kategori}
                                        />
                                    </span>
                                    {/* Baris alasan wajib ada: angka tanpa
                                        sebab tidak bisa ditindaklanjuti. RT
                                        dua digit, sama dengan layar lain. */}
                                    <span className="text-sm">
                                        <span className="text-muted-foreground">
                                            {umurRingkas(a.umurBulan)}, RT{' '}
                                            {a.rt === null
                                                ? KOSONG
                                                : a.rt.padStart(2, '0')}{' '}
                                            ·
                                        </span>{' '}
                                        {a.alasan}
                                    </span>
                                </span>

                                <span
                                    aria-hidden="true"
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/25 bg-accent px-3 py-1.5 text-xs font-extrabold text-primary"
                                >
                                    Lihat detail
                                    <ChevronRight
                                        className="size-4"
                                        strokeWidth={2.5}
                                    />
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            {anak.length > 4 && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule px-5 py-3 sm:px-6">
                    <span className="text-sm text-muted-foreground">
                        {terlihat.length} dari {anak.length} balita
                    </span>
                    <button
                        type="button"
                        aria-expanded={semua}
                        aria-controls="daftar-perhatian"
                        onClick={() => setSemua(!semua)}
                        className="min-h-11 rounded-lg px-2 text-sm font-bold text-primary hover:bg-accent"
                    >
                        {semua
                            ? 'Ringkas daftar'
                            : `Lihat semua (${anak.length})`}
                    </button>
                </div>
            )}
        </section>
    );
}
