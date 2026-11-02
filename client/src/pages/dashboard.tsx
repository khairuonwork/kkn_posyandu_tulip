/**
 * Beranda — ringkasan periode dan tindak lanjut menjadi fokus awal.
 * Grafik riwayat berada di tab Statistik & Tren, tanpa tinggi layar paksa.
 *
 * Props di sini menjadi kontrak bagi `DashboardController` nanti (bagian 10).
 */

import {
    ChartPie,
    ChevronDown,
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
import { useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import CakupanPenimbangan, {
    FormKehadiranHariH,
} from '@/components/cakupan-penimbangan';
import type {
    KehadiranHariH,
    IsianHariH,
} from '@/components/cakupan-penimbangan';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';
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
    tidakNaik?: number;
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
    hadirHariH?: number | null;
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
    bbKurang?: number;
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
    kehadiranHariH?: KehadiranHariH[];
    bolehUbahHariH?: boolean;
    onSimpanHariH?: (items: IsianHariH[]) => Promise<void>;
    rtPilihan?: string;
    wilayahRt?: string[];
    onPilihRt?: (rt: string) => void;
    statusBbU?: { label: string; jumlah: number }[];
    statusTbU?: { label: string; jumlah: number }[];
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
    sumberLive?: boolean;
    sasaranHistoris?: boolean;
};

export default function Dashboard({
    kehadiranHariH = [],
    bolehUbahHariH = false,
    onSimpanHariH,
    rtPilihan = '',
    wilayahRt = [],
    onPilihRt,
    statusBbU = [],
    statusTbU = [],
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
    sumberLive = false,
    sasaranHistoris = false,
}: Props) {
    const [formHariH, setFormHariH] = useState(false);
    const [tabAktif, setTabAktif] = useState<'ringkasan' | 'statistik'>(
        'ringkasan',
    );
    const cakupan = persenSaja(ringkasan.ditimbang, ringkasan.sasaran);
    const absen = ringkasan.sasaran - ringkasan.ditimbang;
    const rentang = rentangBulan(cakupanEnamBulan.map((c) => c.label));
    // Puncak bersama ketiga deret pada kartu Tren, supaya tinggi batang di
    // baris berbeda menyatakan angka yang sebanding.
    const puncakTren = Math.max(
        1,
        ...trenGizi.flatMap((t) => [
            t.pendek,
            t.giziKurang,
            t.giziLebih,
            t.bbKurang ?? 0,
        ]),
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
            judul="Beranda"
            penuh={memuat ? 'lg' : false}
            /* Caveat periode ditulis satu tempat saja, tidak diulang tiap kartu. */
            subjudul={
                memuat
                    ? `${periode.label} · Memuat data…`
                    : sumberLive
                      ? `${periode.label} · ${ringkasan.tanggalUkur === null ? 'belum ada pengukuran' : `data ukur terakhir ${tanggalTanpaTahun(ringkasan.tanggalUkur)}`} · Database live`
                      : `${periode.label}, data per ${tanggalTanpaTahun(ringkasan.tanggalUkur)}. Data contoh.`
            }
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
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div
                    role="tablist"
                    aria-label="Tampilan Beranda"
                    className="bilah-tab"
                >
                    {(
                        [
                            ['ringkasan', 'Ringkasan'],
                            ['statistik', 'Statistik & Tren'],
                        ] as const
                    ).map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            id={`beranda-tab-${id}`}
                            aria-controls={`beranda-panel-${id}`}
                            aria-selected={tabAktif === id}
                            tabIndex={tabAktif === id ? 0 : -1}
                            onClick={() => setTabAktif(id)}
                            onKeyDown={(event) => {
                                if (
                                    ![
                                        'ArrowLeft',
                                        'ArrowRight',
                                        'Home',
                                        'End',
                                    ].includes(event.key)
                                ) {
                                    return;
                                }

                                event.preventDefault();
                                const berikut =
                                    event.key === 'Home'
                                        ? 'ringkasan'
                                        : event.key === 'End'
                                          ? 'statistik'
                                          : id === 'ringkasan'
                                            ? 'statistik'
                                            : 'ringkasan';
                                setTabAktif(berikut);
                                event.currentTarget.parentElement
                                    ?.querySelector<HTMLButtonElement>(
                                        `#beranda-tab-${berikut}`,
                                    )
                                    ?.focus();
                            }}
                            className="tab"
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {onPilihRt && (
                    <div className="flex flex-wrap items-center gap-2.5">
                        <label
                            htmlFor="beranda-rt"
                            className="text-sm font-bold text-foreground"
                        >
                            Filter RT
                        </label>
                        <span className="relative inline-flex">
                            <select
                                id="beranda-rt"
                                className="isian appearance-none bg-card pr-10 font-semibold"
                                value={rtPilihan}
                                onChange={(e) => onPilihRt(e.target.value)}
                            >
                                <option value="">Semua RT</option>
                                {wilayahRt.map((rt) => (
                                    <option key={rt} value={rt}>
                                        RT {rt}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                        </span>
                    </div>
                )}
            </div>
            {!memuat && sasaranHistoris && (
                <p
                    role="note"
                    className="mb-6 rounded-lg bg-tone-amber-bg px-4 py-3 text-sm leading-relaxed text-tone-amber"
                >
                    Daftar sasaran periode ini belum diunggah. Angka S berasal
                    dari anak yang punya rekam pada bulan ini; cakupan belum
                    dapat dianggap cakupan sasaran resmi.
                </p>
            )}
            {memuat && <StateHalaman jenis="memuat" judul="Memuat beranda…" />}

            {!memuat && tabAktif === 'ringkasan' && ringkasan.sasaran === 0 && (
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

            {!memuat && (
                <div className="flex min-w-0 flex-col gap-7">
                    <div
                        role="tabpanel"
                        id="beranda-panel-ringkasan"
                        aria-labelledby="beranda-tab-ringkasan"
                        tabIndex={0}
                        hidden={tabAktif !== 'ringkasan'}
                        className={
                            tabAktif === 'ringkasan'
                                ? 'beranda-ringkas flex min-w-0 flex-col gap-4'
                                : 'hidden'
                        }
                    >
                        {ringkasan.sasaran > 0 && (
                            <>
                                {/* KPI ramping: petak ikon, label, angka, dan satu
                        keterangan pendek di sebelah angkanya. */}
                                <div
                                    aria-label="Ringkasan periode"
                                    className="beranda-kpi kartu grid grid-cols-2 gap-y-4 py-4 xl:grid-cols-5 xl:divide-x xl:divide-border"
                                >
                                    <Kpi
                                        ikon={Users}
                                        nada="netral"
                                        label="Sasaran (S)"
                                        nilai={ringkasan.sasaran}
                                        keterangan={
                                            sasaranHistoris
                                                ? 'rekam periode ini'
                                                : 'terdaftar periode ini'
                                        }
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
                                            pecahan(
                                                ringkasan.ditimbang,
                                                ringkasan.sasaran,
                                            )
                                        }
                                    />
                                    <Kpi
                                        ikon={TrendingUp}
                                        label="Berat naik (N)"
                                        nilai={ringkasan.naik}
                                        keterangan={`${persenSaja(ringkasan.naik, ringkasan.ditimbang)}% dari D`}
                                    />
                                    <Kpi
                                        ikon={TrendingDown}
                                        nada={
                                            (ringkasan.tidakNaik ?? 0) > 0
                                                ? 'oranye'
                                                : 'netral'
                                        }
                                        label="Berat tidak naik (T)"
                                        nilai={ringkasan.tidakNaik ?? 0}
                                        keterangan={`${persenSaja(ringkasan.tidakNaik ?? 0, ringkasan.ditimbang)}% dari D`}
                                    />
                                </div>

                                <div className="beranda-status grid gap-4 lg:grid-cols-2">
                                    {[
                                        {
                                            judul: 'Status gizi BB/U',
                                            sub: `Berat badan menurut umur · ${ringkasan.ditimbang} ditimbang`,
                                            rows: statusBbU,
                                        },
                                        {
                                            judul: 'Status gizi PB/U atau TB/U',
                                            sub: `Tinggi/panjang badan menurut umur · ${ringkasan.ditimbang} ditimbang`,
                                            rows: statusTbU,
                                        },
                                    ].map(({ judul, sub, rows }) => {
                                        const belumDinilai = Math.max(
                                            0,
                                            ringkasan.ditimbang -
                                                rows.reduce(
                                                    (sum, r) => sum + r.jumlah,
                                                    0,
                                                ),
                                        );

                                        return (
                                            <section
                                                key={judul}
                                                className="kartu p-5 sm:p-6"
                                            >
                                                <KepalaKartu
                                                    judul={judul}
                                                    sub={sub}
                                                />
                                                <ul className="mt-4 divide-y divide-rule">
                                                    {rows.map((row) => (
                                                        <PetakGizi
                                                            key={row.label}
                                                            label={row.label}
                                                            nilai={row.jumlah}
                                                        />
                                                    ))}
                                                    <PetakGizi
                                                        label="Belum dinilai"
                                                        nilai={belumDinilai}
                                                    />
                                                </ul>
                                            </section>
                                        );
                                    })}
                                </div>
                                <div className="beranda-status grid items-start gap-4 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.5fr)]">
                                    <section className="kartu min-w-0 p-5 sm:p-6">
                                        <KepalaKartu
                                            judul="Status gizi BB/PB atau BB/TB"
                                            sub={`Berat menurut tinggi/panjang badan · ${statusGizi.ditimbang} ditimbang`}
                                        />

                                        <ul className="mt-4 divide-y divide-rule">
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
                                                    {statusGizi.belumDinilai}{' '}
                                                    belum dapat dinilai
                                                </li>
                                            )}
                                        </ul>
                                    </section>
                                    <DaftarPerhatian
                                        key={periode.id}
                                        anak={perluPerhatian}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                    <div
                        role="tabpanel"
                        id="beranda-panel-statistik"
                        aria-labelledby="beranda-tab-statistik"
                        tabIndex={0}
                        hidden={tabAktif !== 'statistik'}
                        className={
                            tabAktif === 'statistik'
                                ? 'min-w-0 space-y-6'
                                : 'hidden'
                        }
                    >
                        <div className="grid items-start gap-6 xl:grid-cols-2">
                            <section className="kartu flex min-w-0 flex-col p-5 sm:p-6">
                                <KepalaKartu
                                    judul="Cakupan penimbangan (D/S)"
                                    sub={`${rentang} · Total ditimbang dibanding yang datang saat hari buka`}
                                />

                                <CakupanPenimbangan
                                    rows={cakupanEnamBulan}
                                    periodeId={periode.id}
                                />
                                {bolehUbahHariH &&
                                    onSimpanHariH &&
                                    kehadiranHariH.length > 0 && (
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Catat jumlah balita yang hadir
                                                langsung pada hari buka
                                                Posyandu:
                                            </span>
                                            <button
                                                type="button"
                                                className="tombol-kedua shrink-0 font-bold"
                                                aria-expanded={formHariH}
                                                onClick={() =>
                                                    setFormHariH((old) => !old)
                                                }
                                            >
                                                {formHariH
                                                    ? 'Tutup isian hari H'
                                                    : 'Isi kehadiran hari H'}
                                            </button>
                                        </div>
                                    )}
                                {formHariH &&
                                    bolehUbahHariH &&
                                    onSimpanHariH && (
                                        <FormKehadiranHariH
                                            key={`${periode.id}:${rtPilihan}`}
                                            rows={kehadiranHariH.filter(
                                                (r) =>
                                                    rtPilihan === '' ||
                                                    r.rt === rtPilihan,
                                            )}
                                            onSimpan={onSimpanHariH}
                                            onTutup={() => setFormHariH(false)}
                                        />
                                    )}
                            </section>

                            {/* Seluruh angka status gizi lain adalah potret
                                    satu bulan; kartu ini yang menjawab
                                    pertanyaan pembina: membaik atau memburuk. */}
                            <section className="kartu flex min-w-0 flex-col p-5 sm:p-6">
                                <KepalaKartu
                                    judul="Tren status gizi (jumlah balita)"
                                    sub={`${rentang} · Angka makin turun berarti makin membaik`}
                                />

                                <div className="mt-4 flex flex-col gap-4">
                                    <BarisTren
                                        label="BB Kurang dan BB Sangat Kurang"
                                        nilai={trenGizi.map(
                                            (t) => t.bbKurang ?? 0,
                                        )}
                                        bulan={bulanTren}
                                        puncak={puncakTren}
                                        warna={WARNA_TREN.amber}
                                    />
                                    <BarisTren
                                        label="Pendek"
                                        nilai={trenGizi.map((t) => t.pendek)}
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
                                        nilai={trenGizi.map((t) => t.giziLebih)}
                                        bulan={bulanTren}
                                        puncak={puncakTren}
                                        warna={WARNA_TREN.amber}
                                    />

                                    {bulanTren.length > 0 && (
                                        <div
                                            aria-hidden="true"
                                            className="grid grid-cols-[minmax(0,1fr)_144px] gap-3 text-xs sm:grid-cols-[minmax(0,1fr)_222px]"
                                        >
                                            <span className="text-muted-foreground">
                                                Urutan 6 bulan terakhir:
                                            </span>
                                            <span
                                                className="grid gap-[5px] text-center"
                                                style={{
                                                    gridTemplateColumns: `repeat(${bulanTren.length}, minmax(0, 1fr))`,
                                                }}
                                            >
                                                {bulanTren.map((b, idx) => {
                                                    const terakhir =
                                                        idx ===
                                                        bulanTren.length - 1;

                                                    return (
                                                        <span
                                                            key={idx}
                                                            className={
                                                                terakhir
                                                                    ? 'rounded bg-accent py-0.5 font-extrabold text-primary'
                                                                    : 'py-0.5 font-semibold text-muted-foreground'
                                                            }
                                                        >
                                                            {b.slice(0, 3)}
                                                        </span>
                                                    );
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
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
function KepalaKartu({ judul, sub }: { judul: string; sub: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
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
function DaftarPerhatian({ anak }: { anak: AnakPerluPerhatian[] }) {
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
