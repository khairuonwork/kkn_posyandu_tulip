/**
 * Beranda — tata letak Prototipe v2 (docs/design/Portal Posyandu - Prototipe v2.dc.html).
 *
 * Susunannya mengikuti artboard Beranda apa adanya: pita kabar tertahan, empat
 * kartu KPI ber-ikon, sepasang kartu Status gizi dan Cakupan enam bulan, lalu
 * tabel Perlu perhatian. Props di sini menjadi kontrak bagi `DashboardController`
 * nanti (bagian 10).
 *
 * Dua hal yang tidak ikut prototipe, karena datanya menuntut demikian:
 * kategori gizi ditampilkan berempat (artboard hanya punya tiga dan tidak
 * memuat sisi lebih), dan angka nol diredupkan alih-alih dicetak merah.
 */

import {
    ChartPie,
    ChevronRight,
    CloudOff,
    House,
    RotateCw,
    Scale,
    TrendingUp,
    Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import StatusGiziBadge from '@/components/status-gizi-badge';
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

/** Tinggi jalur bar cakupan. Dipendekkan dari 43 satuan artboard supaya
 *  daftar Perlu perhatian di bawahnya kebagian ruang pada layar setinggi
 *  jendela. */
const TINGGI_BAR = 'h-24';

/**
 * Dasar sumbu batang cakupan.
 *
 * Artboard menggambar batang dari nol. Dengan data nyata — keenam bulan di
 * 95-100% — keenam batang terukur 163 sampai 172 px dari jalur 172 px, jadi
 * tidak satu pun bisa dibandingkan dengan mata. Bentuk batangnya tetap milik
 * artboard; hanya dasarnya yang dinaikkan, dan pemotongan itu ditulis di layar
 * tepat di bawah grafiknya supaya tidak menipu.
 */
const DASAR_SUMBU = 80;

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
    giziLebih: number;
    /** Ditimbang tapi BB/TB tidak dapat dihitung. */
    belumDinilai: number;
    ditimbang: number;
    /** Sasaran yang tidak hadir. Ini `S - D`, bukan bagian dari D. */
    belumDiukur: number;
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
    // Puncak bersama ketiga deret pada kartu Tren, supaya tinggi batang di
    // baris berbeda menyatakan angka yang sebanding.
    const puncakTren = Math.max(
        1,
        ...trenGizi.flatMap((t) => [t.pendek, t.giziKurang, t.giziLebih]),
    );

    /*
        Empat kategori, bukan tiga. PMK 2/2020 punya enam kategori BB/TB dan
        artboard hanya menampilkan sisi kurangnya — sehingga menulis "0 gizi
        kurang, 0 gizi buruk" tepat di atas daftar berisi tiga anak obesitas.
        Angka-angka ini berjumlah D.
    */
    const sel = [
        {
            label: 'Gizi baik',
            nilai: statusGizi.giziBaik,
            warna: 'text-foreground',
        },
        {
            label: 'Gizi kurang',
            nilai: statusGizi.giziKurang,
            warna: 'text-tone-amber',
        },
        {
            label: 'Gizi buruk',
            nilai: statusGizi.giziBuruk,
            warna: 'text-tone-red',
        },
        {
            label: 'Gizi lebih dan obesitas',
            nilai: statusGizi.giziLebih,
            warna: 'text-tone-amber',
        },
        ...(statusGizi.belumDinilai > 0
            ? [
                  {
                      label: 'Belum dapat dinilai',
                      nilai: statusGizi.belumDinilai,
                      warna: 'text-muted-foreground',
                  },
              ]
            : []),
    ];

    return (
        <Halaman
            ikon={House}
            penuh="lg"
            judul="Beranda"
            /* Caveat periode ditulis satu tempat saja, tidak diulang tiap kartu. */
            subjudul={`${periode.label}, data per ${tanggalTanpaTahun(ringkasan.tanggalUkur)}. Data contoh.`}
        >
            {/* Kabar bahwa data tertahan datang sebelum angka apa pun: sebagian
                angka di bawahnya belum lengkap selama antrean ini ada. */}
            {belumTerkirim !== undefined && belumTerkirim.jumlah > 0 && (
                <div className="mb-4 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-tone-amber bg-tone-amber-bg px-4 py-2.5 shadow-[var(--shadow-card)] sm:px-5">
                    <span
                        aria-hidden="true"
                        className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-card"
                    >
                        <CloudOff
                            className="size-7 text-tone-amber"
                            strokeWidth={2.5}
                        />
                    </span>

                    {/* `min-w-64`, bukan `min-w-0`: dengan `flex-1 min-w-0`
                        kolom teks boleh menyusut sampai lebih sempit daripada
                        satu katanya, dan tombol di sebelahnya tidak pernah
                        turun baris. Pada 375 px kalimat ini jatuh jadi satu
                        kata per baris setinggi tujuh baris. Lebar minimum
                        memaksa tombolnya yang mengalah, bukan kalimatnya. */}
                    <span className="min-w-64 flex-1">
                        <span className="block text-base font-bold text-tone-amber">
                            {belumTerkirim.jumlah} hasil penimbangan belum
                            terkirim
                        </span>
                        {/* Kalimat kedua yang penting: kader perlu tahu ini
                            bukan kehilangan data, hanya tertunda. */}
                        <span className="mt-0.5 block text-base text-pretty">
                            Tersimpan di perangkat sejak {belumTerkirim.sejak}.
                            Tidak ada data yang hilang.
                        </span>
                    </span>

                    <button
                        type="button"
                        onClick={onCobaKirim}
                        className="tombol-kedua shrink-0 text-tone-amber"
                    >
                        <RotateCw className="size-5" strokeWidth={2.5} />
                        Coba kirim lagi
                    </button>
                </div>
            )}

            {memuat && <Skeleton />}

            {!memuat && ringkasan.sasaran === 0 && (
                <EmptyState sebab="Belum ada pengukuran pada periode ini.">
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
                <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
                    {/* Empat KPI artboard, apa adanya. Petak ikonnya berwarna
                        hanya pada dua angka yang menyatakan keberhasilan —
                        Ditimbang dan Naik — supaya barisnya punya arah baca,
                        bukan empat kotak hijau setara. */}
                    <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
                        <Kpi
                            ikon={Users}
                            label="Sasaran (S)"
                            nilai={ringkasan.sasaran}
                            bawah="balita 0 sampai 59 bulan"
                        />
                        <Kpi
                            ikon={Scale}
                            sorot
                            label="Ditimbang (D)"
                            nilai={ringkasan.ditimbang}
                            bawah={`dari ${ringkasan.sasaran} sasaran`}
                        />
                        <Kpi
                            ikon={ChartPie}
                            label="Cakupan penimbangan (D/S)"
                            nilai={`${cakupan}%`}
                            bawah={`${pecahan(ringkasan.ditimbang, ringkasan.sasaran)} sasaran`}
                        />
                        <Kpi
                            ikon={TrendingUp}
                            sorot
                            label="Naik (N)"
                            nilai={ringkasan.naik}
                            bawah={`dari ${ringkasan.ditimbang} yang ditimbang`}
                        />
                    </div>

                    <div className="grid shrink-0 gap-3 lg:grid-cols-[1fr_1.2fr_1.1fr]">
                        <section className="kartu flex flex-col gap-3 p-4">
                            <h2 className="text-xl leading-snug font-extrabold">
                                Status gizi menurut BB/TB
                            </h2>

                            {/*
                                Petak rambut 1 px milik artboard: sel putih di
                                atas latar garis, bukan empat kartu bersarang.

                                Empat kategori, bukan tiga. PMK 2/2020 punya enam
                                kategori BB/TB dan artboard hanya menampilkan sisi
                                kurangnya — sehingga menulis "0 gizi kurang,
                                0 gizi buruk" tepat di atas daftar berisi tiga
                                anak obesitas. Angka-angka ini berjumlah D.
                            */}
                            {/* Latar petak ini adalah warna garis, dan sel
                                putih yang menutupinya — jadi baris terakhir
                                yang tidak penuh akan menyisakan lubang abu.
                                Dua kolom dengan sel terakhir melebar saat
                                jumlahnya ganjil membuatnya selalu penuh. */}
                            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                                {sel.map((s, urutan) => (
                                    <SelGizi
                                        key={s.label}
                                        label={s.label}
                                        nilai={s.nilai}
                                        warna={s.warna}
                                        lebar={
                                            sel.length % 2 === 1 &&
                                            urutan === sel.length - 1
                                        }
                                    />
                                ))}
                            </div>

                            <p className="mt-auto max-w-[75ch] border-t border-border pt-3 text-sm text-pretty text-muted-foreground">
                                Angka di atas berjumlah {statusGizi.ditimbang}{' '}
                                balita yang ditimbang.{' '}
                                {statusGizi.belumDiukur > 0 &&
                                    `${statusGizi.belumDiukur} sasaran lain tidak hadir bulan ini dan tidak masuk hitungan. `}
                                Indeks mengikuti umur balita: BB/PB di bawah 24
                                bulan, BB/TB untuk 24 bulan ke atas.
                            </p>
                        </section>

                        <section className="kartu flex flex-col gap-3 p-4">
                            <h2 className="text-xl leading-snug font-extrabold">
                                Cakupan penimbangan (D/S) enam bulan terakhir
                            </h2>

                            {/* Batang tegak artboard; bulan berjalan diberi
                                warna, sisanya abu. */}
                            <div className="flex items-end gap-3 sm:gap-5">
                                {/* Batang bertanda mengikuti periode yang
                                    dipilih, bukan selalu yang terakhir. Dulu
                                    membuka Februari 2026 tetap menyorot Juni:
                                    judul halaman, keempat KPI, dan grafik ini
                                    menunjuk tiga bulan yang berbeda sekaligus. */}
                                {cakupanEnamBulan.map((c) => (
                                    <Batang
                                        key={c.periodeId}
                                        cakupan={c}
                                        kini={c.periodeId === periode.id}
                                    />
                                ))}
                            </div>

                            <p className="border-t border-border pt-3 text-sm text-pretty text-muted-foreground">
                                Jumlah balita yang ditimbang dibagi sasaran
                                bulan itu. Batang dimulai dari {DASAR_SUMBU}%,
                                bukan 0, supaya selisih tiap bulan terlihat.
                            </p>
                        </section>

                        {/* Kartu ketiga, bukan baris baru: baris ini tingginya
                            tetap dan daftar Perlu perhatian di bawahnya yang
                            menyerap sisa layar, jadi kolom ketiga tidak
                            menambah tinggi halaman sama sekali.

                            Sebelum ini hanya D/S yang punya tren. Seluruh angka
                            status gizi di Portal adalah potret satu bulan, dan
                            tidak ada satu layar pun yang bisa menjawab
                            pertanyaan yang paling sering ditanyakan pembina:
                            membaik atau memburuk. */}
                        <section className="kartu flex flex-col gap-3 p-4">
                            <h2 className="text-xl leading-snug font-extrabold">
                                Tren status gizi, enam bulan
                            </h2>

                            {/* Satu skala untuk ketiga baris. */}
                            <div className="flex flex-col gap-2.5">
                                <BarisTren
                                    puncak={puncakTren}
                                    label="Pendek"
                                    warna="text-tone-amber"
                                    warnaBatang="bg-tone-amber"
                                    nilai={trenGizi.map((t) => t.pendek)}
                                />
                                <BarisTren
                                    puncak={puncakTren}
                                    label="Gizi kurang"
                                    warna="text-tone-red"
                                    warnaBatang="bg-tone-red"
                                    nilai={trenGizi.map((t) => t.giziKurang)}
                                />
                                <BarisTren
                                    puncak={puncakTren}
                                    label="Gizi lebih"
                                    warna="text-tone-amber"
                                    warnaBatang="bg-tone-amber"
                                    nilai={trenGizi.map((t) => t.giziLebih)}
                                />
                            </div>

                            <p className="mt-auto border-t border-border pt-3 text-sm text-pretty text-muted-foreground">
                                Jumlah anak, bukan persen. Penyebutnya yang
                                ditimbang tiap bulan, bukan sasaran: anak yang
                                tidak hadir tidak punya status gizi. Batang
                                terakhir bulan berjalan.
                            </p>
                        </section>
                    </div>

                    <section className="kartu flex flex-col overflow-hidden lg:min-h-0 lg:flex-1">
                        {/* Jumlah anak berada di header tabel, bukan sebagai
                            kartu KPI tersendiri. */}
                        <div className="strip-kepala flex shrink-0 flex-wrap items-center gap-x-3.5 gap-y-2">
                            <h2 className="text-xl font-extrabold">
                                Perlu perhatian
                            </h2>
                            {/* Nol tidak memakai pil. Latar netral di atas
                                strip kepala hanya berbeda 1,08:1 - pil yang
                                tidak terlihat sebagai pil - dan kabar baik
                                memang tidak perlu dibingkai sekeras kabar
                                buruk. */}
                            {perluPerhatian.length === 0 ? (
                                <span className="text-sm font-semibold text-muted-foreground">
                                    tidak ada
                                </span>
                            ) : (
                                <span className="rounded-md bg-tone-red-bg px-3 py-1.5 text-sm font-bold text-tone-red">
                                    {perluPerhatian.length} balita
                                </span>
                            )}
                            {perluPerhatian.length > 1 && (
                                <span className="ml-auto text-sm text-muted-foreground">
                                    Paling mendesak di atas
                                </span>
                            )}
                        </div>

                        {perluPerhatian.length === 0 ? (
                            <p className="px-5 py-6 text-base text-muted-foreground sm:px-6">
                                Tidak ada balita berkategori perlu tindak lanjut
                                pada {periode.label}.
                            </p>
                        ) : (
                            /* Daftarnya yang menggulir, bukan halamannya.
                               `tabIndex` wajib: wadah bergulir yang tidak bisa
                               digeser panah papan tombol melanggar WCAG 2.1.1,
                               dan tujuh dari sepuluh anak ada di bawah lipatan
                               kartu ini. */
                            <ul
                                tabIndex={0}
                                aria-label={`Daftar ${perluPerhatian.length} balita yang perlu perhatian, dapat digulir`}
                                className="gulir-dalam divide-y-2 divide-border lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
                            >
                                {perluPerhatian.map((anak) => (
                                    <li key={anak.anakId}>
                                        <Link
                                            href={`/balita/${anak.anakId}`}
                                            className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 hover:bg-surface-subtle sm:px-5"
                                        >
                                            {/* Petak inisial artboard. Ia
                                                penanda tempat, bukan foto:
                                                tidak ada anak yang punya
                                                potret di arsip. */}
                                            <span
                                                aria-hidden="true"
                                                className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-sm font-bold text-muted-foreground"
                                            >
                                                {inisial(anak.nama)}
                                            </span>

                                            {/* Sama seperti spanduk di atas:
                                                dua `flex-1 min-w-0` bersebelahan
                                                saling memeras sampai 54 px. */}
                                            <span className="min-w-40 flex-1 sm:w-72 sm:flex-none">
                                                <span className="block text-base leading-snug font-bold">
                                                    {namaTampil(anak.nama)}
                                                </span>
                                                <span className="block text-sm text-muted-foreground">
                                                    {umurRingkas(
                                                        anak.umurBulan,
                                                    )}
                                                    {/* Dipadkan dua digit seperti
                                                        di Data Balita, Laporan,
                                                        dan Detail. Beranda satu-
                                                        satunya yang menulis
                                                        "RT 6", dan anak yang sama
                                                        jadi "RT 06" satu klik
                                                        kemudian. */}
                                                    , RT{' '}
                                                    {anak.rt === null
                                                        ? KOSONG
                                                        : anak.rt.padStart(
                                                              2,
                                                              '0',
                                                          )}
                                                </span>
                                            </span>

                                            <StatusGiziBadge
                                                kategori={anak.kategori}
                                            />

                                            {/* Baris alasan wajib ada: angka
                                                tanpa sebab tidak bisa
                                                ditindaklanjuti. */}
                                            <span className="min-w-56 flex-1 text-base text-muted-foreground">
                                                {anak.alasan}
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
                </div>
            )}
        </Halaman>
    );
}

/** Satu kartu KPI: petak ikon 52 px, label, angka 36 px, keterangan. */
function Kpi({
    ikon: Ikon,
    label,
    nilai,
    bawah,
    sorot = false,
}: {
    ikon: ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    nilai: number | string;
    bawah: string;
    sorot?: boolean;
}) {
    return (
        <div className="kartu flex flex-col gap-1.5 p-3">
            <span
                aria-hidden="true"
                className={`flex size-13 items-center justify-center rounded-lg ${
                    sorot ? 'bg-accent' : 'bg-surface'
                }`}
            >
                <Ikon
                    className={`size-7 ${sorot ? 'text-primary' : 'text-muted-foreground'}`}
                    strokeWidth={2.5}
                />
            </span>
            <p className="flex-1 text-sm font-bold text-muted-foreground">
                {label}
            </p>
            <p className="text-3xl leading-none font-extrabold">{nilai}</p>
            <p className="text-sm text-muted-foreground">{bawah}</p>
        </div>
    );
}

/** Satu sel pada petak rambut Status gizi. */
function SelGizi({
    label,
    nilai,
    warna,
    lebar,
}: {
    label: string;
    nilai: number;
    warna: string;
    /** Melebar ke dua kolom supaya baris terakhir tidak menyisakan lubang. */
    lebar: boolean;
}) {
    return (
        <div className={`bg-card px-3 py-2 ${lebar ? 'sm:col-span-2' : ''}`}>
            {/* Nol direndahkan. Nol yang dicetak merah setebal angka sungguhan
                membuat kabar baik terbaca sekeras kabar buruk. */}
            <p
                className={`text-3xl leading-none font-extrabold ${
                    nilai === 0 ? 'text-muted-foreground' : warna
                }`}
            >
                {nilai}
            </p>
            {/* Kategori selalu berupa teks; warna hanya pendukung. */}
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
                {label}
            </p>
        </div>
    );
}

/**
 * Satu baris tren: nama masalah, angka bulan ini, dan enam batang kecil.
 *
 * Angka, bukan persen. Kartu di sebelahnya juga menghitung anak, dan seorang
 * kader menindaklanjuti lima anak — bukan lima persen. Persennya tetap bisa
 * dibaca dari kartu Cakupan di sebelah kanan.
 */
function BarisTren({
    label,
    warna,
    warnaBatang,
    nilai,
    puncak,
}: {
    label: string;
    warna: string;
    warnaBatang: string;
    /** Enam bulan, terlama di kiri. Bulan berjalan yang terakhir. */
    nilai: number[];
    /**
     * Puncak BERSAMA ketiga baris, bukan puncak baris ini sendiri.
     *
     * Diskalakan per baris, batang setinggi sama berarti angka yang berbeda di
     * tiap baris — enam anak pendek dan tiga anak gizi kurang sama-sama
     * menyentuh langit-langit. Satu skala membuat ketiganya bisa dibandingkan
     * dengan mata.
     */
    puncak: number;
}) {
    const kini = nilai[nilai.length - 1];

    return (
        <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm text-pretty">{label}</span>

            {/* Nol diredupkan, sama seperti petak Status gizi di sebelah:
                kabar baik tidak perlu dicetak sekeras kabar buruk. */}
            <span
                className={`w-7 shrink-0 text-right text-2xl leading-none font-extrabold ${
                    kini === 0 ? 'text-muted-foreground' : warna
                }`}
            >
                {kini}
            </span>

            <span className="flex h-11 flex-1 items-end gap-1">
                {nilai.map((n, urutan) => {
                    const terakhir = urutan === nilai.length - 1;

                    return (
                        <span
                            key={urutan}
                            /* Nol digambar sebagai garis dasar 2 px, bukan
                               batang pendek: batang pendek terbaca "sedikit",
                               padahal artinya tidak ada. */
                            className={`flex-1 rounded-t-sm ${
                                n === 0
                                    ? 'bg-border'
                                    : terakhir
                                      ? warnaBatang
                                      : 'bg-border-strong'
                            }`}
                            style={{
                                height:
                                    n === 0 ? '2px' : `${(n / puncak) * 100}%`,
                            }}
                        />
                    );
                })}
            </span>
        </div>
    );
}

/** Satu batang cakupan bulanan: persen di atas, jalur 172 px, bulan di bawah. */
function Batang({ cakupan, kini }: { cakupan: CakupanPeriode; kini: boolean }) {
    const nilai = persenSaja(cakupan.ditimbang, cakupan.sasaran);
    const tinggi = Math.max(
        0,
        ((nilai - DASAR_SUMBU) / (100 - DASAR_SUMBU)) * 100,
    );
    const nada = kini
        ? 'font-bold text-primary'
        : 'font-normal text-muted-foreground';

    return (
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className={`text-sm ${nada}`}>{nilai}%</span>
            <span
                className={`flex w-full ${TINGGI_BAR} items-end justify-center`}
            >
                {/* Judul bawaan peramban memberi pembilang dan penyebutnya saat
                    disentuh tetikus; angkanya sendiri sudah tercetak di atas. */}
                <span
                    title={pecahan(cakupan.ditimbang, cakupan.sasaran)}
                    className={`w-2/5 rounded-t-sm ${kini ? 'bg-primary' : 'bg-border'}`}
                    style={{ height: `${tinggi}%` }}
                />
            </span>
            {/* Tanpa `whitespace-nowrap`: pada 375 px "Februari 2026"
                meluber 3 px keluar kolomnya — satu-satunya luapan tak
                disengaja yang terukur di seluruh Portal. Dibiarkan
                membungkus dua baris, tidak ada informasi yang hilang. */}
            <span className={`text-center text-sm ${nada}`}>
                {cakupan.label}
            </span>
        </div>
    );
}

/** Skeleton berbentuk kartu dan baris, bukan spinner (bagian 6.3). */
function Skeleton() {
    return (
        <div className="flex animate-pulse flex-col gap-7" aria-hidden="true">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="kartu h-44" />
                <div className="kartu h-44" />
                <div className="kartu h-44" />
                <div className="kartu h-44" />
            </div>
            <div className="grid shrink-0 gap-3 lg:grid-cols-[1fr_1.35fr]">
                <div className="kartu h-72" />
                <div className="kartu h-72" />
            </div>
            <div className="kartu h-56" />
        </div>
    );
}
