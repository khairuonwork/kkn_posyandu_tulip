/**
 * Beranda — satu layar, mengikuti mockup yang disetujui 26 September 2026.
 *
 * Empat KPI ramping berikon dalam satu baris. Di bawahnya dua kolom: kiri
 * Status gizi di atas grafik Cakupan dan Tren, kanan daftar Perlu perhatian
 * yang digulir di dalam kartunya sendiri. Dari 1024 px halaman tidak digulir;
 * di bawahnya kolom-kolom itu bertumpuk dan halamannya yang menggulir.
 *
 * Props di sini menjadi kontrak bagi `DashboardController` nanti (bagian 10).
 */

import {
    ChartPie,
    ChevronRight,
    CloudOff,
    House,
    Minus,
    RotateCw,
    Scale,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import StatusGiziBadge, {
    IKON,
    KELAS,
    nadaKategori,
} from '@/components/status-gizi-badge';
import {
    inisial,
    KOSONG,
    namaTampil,
    pecahan,
    persenSaja,
    tanggalTanpaTahun,
    umurRingkas,
} from '@/lib/format';
import { Link } from '@/lib/nav';
import type { Periode } from '@/types/posyandu';

export type RingkasanBeranda = {
    sasaran: number;
    ditimbang: number;
    naik: number;
    tanggalUkur: string | null;
};

export type SebaranStatusGizi = {
    giziBaik: number;
    giziKurang: number;
    giziBuruk: number;
    berisikoLebih: number;
    giziLebih: number;
    obesitas: number;
    /** Ditimbang tapi BB/TB tidak dapat dihitung. */
    belumDinilai: number;
    ditimbang: number;
};

export type CakupanPeriode = {
    periodeId: string;
    label: string;
    sasaran: number;
    ditimbang: number;
};

/** Satu bulan pada kartu Tren status gizi. */
export type TitikTren = {
    periodeId: string;
    label: string;
    ditimbang: number;
    pendek: number;
    giziKurang: number;
    /** Gizi lebih dan obesitas, tanpa yang baru berisiko. */
    giziLebih: number;
};

export type AnakPerluPerhatian = {
    anakId: number;
    nama: string | null;
    umurBulan: number | null;
    rt: string | null;
    kategori: string;
    alasan: string;
};

/**
 * Hasil penimbangan yang masih tertahan di perangkat kader.
 *
 * Dipasok Aplikasi Tablet lewat antrean kirimnya (ADR-0003). Portal hanya
 * melaporkan keberadaannya; tidak ada yang hilang selama angka ini muncul.
 */
export type AntreanKirim = { jumlah: number; sejak: string };

type Props = {
    periode: Periode;
    ringkasan: RingkasanBeranda;
    statusGizi: SebaranStatusGizi;
    cakupanEnamBulan: CakupanPeriode[];
    trenGizi: TitikTren[];
    perluPerhatian: AnakPerluPerhatian[];
    /** Periode terakhir yang berisi data, jalan keluar dari keadaan kosong. */
    periodeTerisi: Periode | null;
    /** Tidak dirender bila tidak ada yang tertahan. */
    belumTerkirim?: AntreanKirim;
    onCobaKirim?: () => void;
    onPindahPeriode?: (id: string) => void;
    /**
     * Selalu false di demo karena datanya sinkron. Dirancang sekarang supaya
     * tidak perlu dirancang ulang saat controller memasoknya lewat Inertia.
     */
    memuat?: boolean;
};

export default function Dashboard({
    periode,
    ringkasan,
    statusGizi,
    cakupanEnamBulan,
    trenGizi,
    perluPerhatian,
    periodeTerisi,
    belumTerkirim,
    onCobaKirim,
    onPindahPeriode,
    memuat = false,
}: Props) {
    const cakupan = persenSaja(ringkasan.ditimbang, ringkasan.sasaran);
    const absen = ringkasan.sasaran - ringkasan.ditimbang;
    const rentang = rentangBulan(cakupanEnamBulan.map((c) => c.label));
    // Puncak bersama ketiga deret pada kartu Tren, supaya tinggi batang di
    // baris berbeda menyatakan angka yang sebanding.
    const puncakTren = Math.max(
        1,
        ...trenGizi.flatMap((t) => [t.pendek, t.giziKurang, t.giziLebih]),
    );
    const bulanTren = trenGizi.map((t) => namaBulan(t.label));

    /* Keenam kategori BB/TB PMK 2/2020, urut dari z terendah ke tertinggi.
       Angka-angka ini berjumlah D. */
    const petak: { label: string; nilai: number }[] = [
        { label: 'Gizi buruk', nilai: statusGizi.giziBuruk },
        { label: 'Gizi kurang', nilai: statusGizi.giziKurang },
        { label: 'Gizi baik', nilai: statusGizi.giziBaik },
        { label: 'Berisiko gizi lebih', nilai: statusGizi.berisikoLebih },
        { label: 'Gizi lebih', nilai: statusGizi.giziLebih },
        { label: 'Obesitas', nilai: statusGizi.obesitas },
    ];

    return (
        <Halaman
            ikon={House}
            penuh="lg"
            judul="Beranda"
            /* Caveat periode ditulis satu tempat saja, tidak diulang tiap kartu. */
            subjudul={`${periode.label}, data per ${tanggalTanpaTahun(ringkasan.tanggalUkur)}. Data contoh.`}
            /* Kabar bahwa data tertahan duduk di bilah kepala, sebelum angka
               apa pun: sebagian angka di bawahnya belum lengkap selama
               antrean ini ada. */
            pita={
                belumTerkirim !== undefined && belumTerkirim.jumlah > 0 ? (
                    <PitaTertahan
                        antrean={belumTerkirim}
                        onKirim={onCobaKirim}
                    />
                ) : undefined
            }
        >
            {memuat && <Skeleton />}

            {!memuat && ringkasan.sasaran === 0 && (
                <EmptyState
                    sebab={`Belum ada hasil ukur untuk ${periode.label}.`}
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
            )}

            {!memuat && ringkasan.sasaran > 0 && (
                <div className="flex flex-col gap-3.5 lg:min-h-0 lg:flex-1">
                    {/* KPI ramping: petak ikon, label, angka, dan satu
                        keterangan pendek di sebelah angkanya. */}
                    <div className="grid shrink-0 grid-cols-2 gap-3.5 md:grid-cols-4">
                        <Kpi
                            ikon={Users}
                            netral
                            label="Sasaran (S)"
                            nilai={ringkasan.sasaran}
                            keterangan="0–59 bulan"
                        />
                        <Kpi
                            ikon={Scale}
                            label="Ditimbang (D)"
                            nilai={ringkasan.ditimbang}
                            keterangan={
                                absen > 0
                                    ? `${absen} belum datang`
                                    : 'semua datang'
                            }
                        />
                        <Kpi
                            ikon={ChartPie}
                            label="Cakupan (D/S)"
                            nilai={`${cakupan}%`}
                            keterangan={
                                bandingBulanLalu(
                                    cakupanEnamBulan,
                                    periode.id,
                                    cakupan,
                                ) ??
                                pecahan(ringkasan.ditimbang, ringkasan.sasaran)
                            }
                        />
                        <Kpi
                            ikon={TrendingUp}
                            label="Berat naik (N)"
                            nilai={ringkasan.naik}
                            keterangan={`${persenSaja(ringkasan.naik, ringkasan.ditimbang)}% dari D`}
                        />
                    </div>

                    <div className="grid gap-4.5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                        <div className="flex min-w-0 flex-col gap-3.5 lg:min-h-0">
                            <section className="kartu shrink-0 px-4.5 py-3.5">
                                <KepalaKartu
                                    judul="Status gizi (BB/PB atau BB/TB)"
                                    sub={`${periode.label} · ${statusGizi.ditimbang} ditimbang`}
                                />

                                <ul className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                                    {petak.map((p) => (
                                        <PetakGizi
                                            key={p.label}
                                            label={p.label}
                                            nilai={p.nilai}
                                        />
                                    ))}
                                    {/* Ditimbang, tetapi BB/TB-nya tidak dapat
                                        dihitung. Bukan nol, bukan sehat. */}
                                    {statusGizi.belumDinilai > 0 && (
                                        <li className="col-span-full rounded-lg bg-surface px-2.5 py-1.5 text-sm font-semibold text-muted-foreground">
                                            {statusGizi.belumDinilai} belum
                                            dapat dinilai
                                        </li>
                                    )}
                                </ul>
                            </section>

                            <div className="grid gap-3.5 sm:grid-cols-2 lg:min-h-0 lg:flex-1">
                                <section className="kartu flex min-w-0 flex-col px-4 py-3.5">
                                    <KepalaKartu
                                        judul="Cakupan penimbangan (D/S)"
                                        sub={rentang}
                                    />

                                    <div
                                        role="img"
                                        aria-label={`Cakupan penimbangan: ${cakupanEnamBulan
                                            .map(
                                                (c) =>
                                                    `${namaBulan(c.label)} ${persenSaja(c.ditimbang, c.sasaran)}%`,
                                            )
                                            .join(', ')}`}
                                        className="mt-2 grid h-[128px] grid-cols-6 items-end gap-2 border-b-2 border-border-strong px-0.5 sm:h-auto sm:min-h-[128px] sm:flex-1"
                                    >
                                        {/* Batang bertanda mengikuti periode
                                            yang dipilih, bukan selalu yang
                                            terakhir: judul halaman, KPI, dan
                                            grafik ini harus menunjuk bulan yang
                                            sama. */}
                                        {cakupanEnamBulan.map((c) => (
                                            <BatangCakupan
                                                key={c.periodeId}
                                                cakupan={c}
                                                kini={
                                                    c.periodeId === periode.id
                                                }
                                            />
                                        ))}
                                    </div>
                                    <div
                                        aria-hidden="true"
                                        className="mt-1 grid grid-cols-6 gap-2 px-0.5 text-center text-sm"
                                    >
                                        {cakupanEnamBulan.map((c) => (
                                            <span
                                                key={c.periodeId}
                                                className={
                                                    c.periodeId === periode.id
                                                        ? 'font-extrabold'
                                                        : 'text-muted-foreground'
                                                }
                                            >
                                                {c.label.slice(0, 3)}
                                            </span>
                                        ))}
                                    </div>
                                </section>

                                {/* Seluruh angka status gizi lain adalah potret
                                    satu bulan; kartu ini yang menjawab
                                    pertanyaan pembina: membaik atau memburuk. */}
                                <section className="kartu flex min-w-0 flex-col px-4 py-3.5">
                                    <KepalaKartu
                                        judul="Tren status gizi"
                                        sub={rentang}
                                    />

                                    {/* Di layar lebar ketiga baris berbagi sisa
                                        tinggi kartu, dan batangnya ikut
                                        memanjang; tanpa ini separuh kartu
                                        kosong. */}
                                    <div className="mt-2 flex flex-col gap-1.5 lg:flex-1">
                                        <BarisTren
                                            label="Pendek"
                                            nilai={trenGizi.map(
                                                (t) => t.pendek,
                                            )}
                                            bulan={bulanTren}
                                            puncak={puncakTren}
                                            warna={WARNA_TREN.amber}
                                        />
                                        <BarisTren
                                            label="Gizi kurang"
                                            nilai={trenGizi.map(
                                                (t) => t.giziKurang,
                                            )}
                                            bulan={bulanTren}
                                            puncak={puncakTren}
                                            warna={WARNA_TREN.merah}
                                        />
                                        <BarisTren
                                            label="Gizi lebih dan obesitas"
                                            nilai={trenGizi.map(
                                                (t) => t.giziLebih,
                                            )}
                                            bulan={bulanTren}
                                            puncak={puncakTren}
                                            warna={WARNA_TREN.amber}
                                        />

                                        {/* Hanya ujung sumbu: enam label di
                                            lajur 88 px saling berimpit. */}
                                        {bulanTren.length > 0 && (
                                            <div
                                                aria-hidden="true"
                                                className="grid grid-cols-[minmax(0,1fr)_88px] gap-2.5 text-sm 2xl:grid-cols-[minmax(0,1fr)_160px]"
                                            >
                                                <span />
                                                <span className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        {bulanTren[0].slice(
                                                            0,
                                                            3,
                                                        )}
                                                    </span>
                                                    <span className="font-extrabold">
                                                        {bulanTren[
                                                            bulanTren.length - 1
                                                        ].slice(0, 3)}
                                                    </span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <DaftarPerhatian anak={perluPerhatian} />
                    </div>
                </div>
            )}
        </Halaman>
    );
}

/** Pita "belum terkirim" di bilah kepala. */
function PitaTertahan({
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
function bandingBulanLalu(
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
function Kpi({
    ikon: Ikon,
    label,
    nilai,
    keterangan,
    netral = false,
}: {
    ikon: ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    nilai: number | string;
    keterangan: string;
    /** Petak ikon abu untuk Sasaran; angka hasil kegiatan berpetak hijau. */
    netral?: boolean;
}) {
    return (
        <section className="kartu flex min-w-0 items-center gap-3.5 px-4 py-3">
            <span
                aria-hidden="true"
                className={`flex size-11.5 shrink-0 items-center justify-center rounded-[12px] ${
                    netral
                        ? 'bg-surface-alt text-muted-foreground'
                        : 'bg-accent text-primary'
                }`}
            >
                <Ikon className="size-6" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
                <h2 className="truncate text-sm leading-snug font-bold text-muted-foreground">
                    {label}
                </h2>
                {/* Membungkus di kartu sempit (tablet tegak): keterangannya
                    turun ke bawah angka, bukan meluber keluar kartu. */}
                <p className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-3xl leading-[1.1] font-extrabold tracking-tight tabular-nums">
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
function KepalaKartu({ judul, sub }: { judul: string; sub: ReactNode }) {
    return (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3.5 gap-y-0.5">
            <h2 className="text-lg font-extrabold">{judul}</h2>
            <span className="text-sm text-muted-foreground">{sub}</span>
        </div>
    );
}

/** "Juni 2026" menjadi "Juni". */
function namaBulan(label: string): string {
    return label.split(' ')[0];
}

/**
 * "Januari – Juni 2026", atau lengkap kedua ujungnya bila tahunnya berbeda.
 * Label periode berbentuk "<bulan> <tahun>".
 */
function rentangBulan(label: string[]): string {
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
function PetakGizi({ label, nilai }: { label: string; nilai: number }) {
    const nada = nadaKategori(label);
    const Ikon = IKON[nada];
    const kelas =
        nilai === 0 && nada !== 'hijau'
            ? 'bg-surface text-muted-foreground'
            : KELAS[nada];

    return (
        <li
            className={`flex flex-col gap-0.5 rounded-lg px-2.5 py-1.5 ${kelas}`}
        >
            <span className="flex items-center gap-1.5 text-2xl leading-tight font-extrabold tabular-nums">
                <Ikon
                    className="size-5 shrink-0"
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
                {nilai}
            </span>
            {/* Kategori selalu berupa teks; warna dan ikon hanya pendukung. */}
            <span className="text-sm leading-tight font-semibold">{label}</span>
        </li>
    );
}

/** Batang cakupan bulanan: persen di atas, batang di bawahnya. */
function BatangCakupan({
    cakupan,
    kini,
}: {
    cakupan: CakupanPeriode;
    kini: boolean;
}) {
    const nilai = persenSaja(cakupan.ditimbang, cakupan.sasaran);

    // Tinggi dalam persen ruang grafik, bukan px, supaya batang ikut
    // memanjang bersama kartunya. Dari 0%, bukan dari sumbu yang dinaikkan:
    // panjang batang sebanding dengan angkanya, jadi grafik ini tidak butuh
    // catatan peringatan, dan bulan dengan cakupan rendah tetap punya batang.
    // `pt-6` menyisakan tempat untuk angka di atas batang 100%.
    return (
        <div className="flex h-full flex-col items-center justify-end pt-6">
            {/* Judul bawaan peramban memberi pembilang dan penyebutnya saat
                disentuh tetikus; angkanya sendiri sudah tercetak di atas. */}
            <span
                title={pecahan(cakupan.ditimbang, cakupan.sasaran)}
                className={`relative w-full max-w-[40px] rounded-t-[8px] ${kini ? 'bg-primary' : 'bg-input'}`}
                style={{ height: `${Math.min(nilai, 100)}%` }}
            >
                <span
                    className={`absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-sm whitespace-nowrap tabular-nums ${
                        kini
                            ? 'font-extrabold text-primary'
                            : 'font-bold text-muted-foreground'
                    }`}
                >
                    {nilai}%
                </span>
            </span>
        </div>
    );
}

/** Warna angka dan batang bulan berjalan pada kartu Tren. */
const WARNA_TREN = {
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
function BarisTren({
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
    const [kelasSelisih, IkonSelisih, teksSelisih] =
        selisih === null
            ? [null, null, null]
            : selisih > 0
              ? [
                    'bg-tone-red-bg text-tone-red',
                    TrendingUp,
                    `+${selisih} dari ${bulanLalu}`,
                ]
              : selisih < 0
                ? [
                      'bg-tone-green-bg text-tone-green',
                      TrendingDown,
                      `−${-selisih} dari ${bulanLalu}`,
                  ]
                : [
                      'bg-surface-alt text-muted-foreground',
                      Minus,
                      `Sama dengan ${bulanLalu}`,
                  ];

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_88px] items-end gap-2.5 border-b border-rule pb-1.5 lg:flex-1 2xl:grid-cols-[minmax(0,1fr)_160px]">
            <div className="min-w-0">
                <p className="text-base leading-tight font-bold">{label}</p>
                {IkonSelisih !== null && (
                    <span
                        className={`mt-0.5 inline-flex items-center gap-1 rounded-md px-2 text-sm font-bold whitespace-nowrap ${kelasSelisih}`}
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
                className="grid h-[56px] grid-cols-6 items-end gap-[5px] lg:h-full lg:min-h-[56px]"
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

/** Daftar Perlu perhatian: kepala tetap, isinya digulir di dalam kartu. */
function DaftarPerhatian({ anak }: { anak: AnakPerluPerhatian[] }) {
    return (
        <section
            aria-labelledby="judul-perlu"
            className="kartu flex min-w-0 flex-col overflow-hidden lg:min-h-0"
        >
            <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3.5 gap-y-1 border-b-2 border-border-strong bg-surface px-5.5 py-3.5">
                <h2 id="judul-perlu" className="text-xl font-extrabold">
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
                /* `tabIndex` wajib: wadah bergulir yang tidak bisa digeser
                   panah papan tombol melanggar WCAG 2.1.1. */
                <ul
                    tabIndex={0}
                    aria-label={`Daftar ${anak.length} balita yang perlu perhatian, gulir untuk melihat semua`}
                    className="gulir-dalam lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
                >
                    {anak.map((a) => (
                        <li key={a.anakId} className="border-b border-rule">
                            <Link
                                href={`/balita/${a.anakId}`}
                                className="flex min-h-[64px] items-center gap-3.5 py-2.5 pr-4.5 pl-5.5 hover:bg-surface-subtle"
                            >
                                {/* Penanda tempat, bukan foto: tidak ada anak
                                    yang punya potret di arsip. */}
                                <span
                                    aria-hidden="true"
                                    className="flex size-11.5 shrink-0 items-center justify-center rounded-full bg-surface-alt text-sm font-bold text-muted-foreground"
                                >
                                    {inisial(a.nama)}
                                </span>

                                <span className="flex min-w-0 grow flex-col gap-1">
                                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                        <span className="text-base font-bold">
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

                                <ChevronRight
                                    className="size-5 shrink-0 text-muted-foreground"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** Skeleton berbentuk kartu dan baris, bukan spinner (bagian 6.3). */
function Skeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-3.5" aria-hidden="true">
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
                <div className="kartu h-19" />
                <div className="kartu h-19" />
                <div className="kartu h-19" />
                <div className="kartu h-19" />
            </div>
            <div className="grid gap-4.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div className="flex flex-col gap-3.5">
                    <div className="kartu h-36" />
                    <div className="kartu h-64" />
                </div>
                <div className="kartu h-100" />
            </div>
        </div>
    );
}
