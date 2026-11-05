import {
    ChartPie,
    ChevronDown,
    House,
    Scale,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
    IsianHariH,
    KehadiranHariH,
} from '@/components/cakupan-penimbangan';
import CakupanPenimbangan, {
    FormKehadiranHariH,
} from '@/components/cakupan-penimbangan';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';
import { pecahan, persenSaja, tanggalTanpaTahun } from '@/lib/format';
import type { Periode } from '@/types/posyandu';
import {
    WARNA_TREN,
    bandingBulanLalu,
    BarisTren,
    DaftarPerhatian,
    KepalaKartu,
    Kpi,
    namaBulan,
    PetakGizi,
    PitaTertahan,
    rentangBulan,
} from './komponen/ringkasan-dan-tren';
import type {
    AnakPerluPerhatian,
    AntreanKirim,
    CakupanPeriode,
    RingkasanBeranda,
    SebaranStatusGizi,
    TitikTren,
} from './tipe';
export type {
    AnakPerluPerhatian,
    AntreanKirim,
    CakupanPeriode,
    RingkasanBeranda,
    SebaranStatusGizi,
    TitikTren,
} from './tipe';
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
    const [formMenutup, setFormMenutup] = useState(false);
    const [pesanHariH, setPesanHariH] = useState(false);
    const [tabAktif, setTabAktif] = useState<'ringkasan' | 'statistik'>(
        'ringkasan',
    );
    const konten = useRef<HTMLDivElement>(null);
    const tabSebelumnya = useRef(tabAktif);
    useEffect(() => {
        if (tabAktif === tabSebelumnya.current) {
            return;
        }

        tabSebelumnya.current = tabAktif;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const panel = document.getElementById(`beranda-panel-${tabAktif}`);
        panel?.animate(
            [
                {
                    opacity: 0,
                    transform: `translateX(${tabAktif === 'statistik' ? 28 : -28}px)`,
                },
                { opacity: 1, transform: 'none' },
            ],
            { duration: 210, easing: 'ease-out' },
        );
    }, [tabAktif]);
    const filterTerakhir = useRef(`${periode.id}:${rtPilihan}`);
    useEffect(() => {
        const filter = `${periode.id}:${rtPilihan}`;

        if (memuat || filter === filterTerakhir.current) {
            return;
        }

        filterTerakhir.current = filter;

        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            konten.current
                ?.getAnimations()
                .forEach((animasi) => animasi.cancel());
            konten.current?.animate([{ opacity: 0 }, { opacity: 1 }], {
                duration: 210,
                easing: 'ease-out',
            });
        }
    }, [periode.id, rtPilihan, memuat]);
    useEffect(() => {
        if (!formMenutup) {
            return;
        }

        const timer = window.setTimeout(
            () => {
                setFormHariH(false);
                setFormMenutup(false);
            },
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 0
                : 180,
        );

        return () => window.clearTimeout(timer);
    }, [formMenutup]);
    const tutupForm = () => setFormMenutup(true);
    const pilihTab = (id: 'ringkasan' | 'statistik') => {
        if (id !== tabAktif) {
            setTabAktif(id);
        }
    };
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
                            onClick={() => pilihTab(id)}
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
                                pilihTab(berikut);
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
                <div ref={konten} className="flex min-w-0 flex-col gap-7">
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
                                                    formHariH
                                                        ? tutupForm()
                                                        : setFormHariH(true)
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
                                        <div
                                            className={
                                                formMenutup
                                                    ? 'beranda-form-keluar'
                                                    : 'beranda-form-masuk'
                                            }
                                            inert={formMenutup}
                                        >
                                            <FormKehadiranHariH
                                                key={`${periode.id}:${rtPilihan}`}
                                                rows={kehadiranHariH.filter(
                                                    (r) =>
                                                        rtPilihan === '' ||
                                                        r.rt === rtPilihan,
                                                )}
                                                onSimpan={async (items) => {
                                                    setPesanHariH(false);
                                                    await onSimpanHariH(items);
                                                    setPesanHariH(true);
                                                }}
                                                onTutup={tutupForm}
                                            />
                                        </div>
                                    )}
                                {pesanHariH && (
                                    <p
                                        role="status"
                                        className="pesan-masuk mt-4 text-sm font-semibold text-primary"
                                    >
                                        Kehadiran hari H tersimpan.
                                    </p>
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
