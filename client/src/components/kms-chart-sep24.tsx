/**
 * Desain KMS dipulihkan dari commit 710035c (11 September 2026).
 * Integrasi data live dan perlindungan titik di luar skala tetap dipertahankan.
 *
 * SVG langsung, tanpa pustaka grafik: yang dibutuhkan hanya beberapa `path`
 * garis SD dan sederet titik, sedangkan membuat pustaka chart menggambar
 * overlay SD menuntut kustomisasi yang lebih panjang daripada SVG-nya sendiri
 * (docs/05-uiux-spec.md bagian 4.3).
 *
 * **Indeksnya hanya satu: berat badan menurut umur.** KMS pada Buku KIA memang
 * kartu berat-menurut-umur, dan menyamakannya membuat grafik di layar dapat
 * dibandingkan langsung dengan buku yang dipegang ibu.
 *
 * Warna pita **dikecualikan dari palet aplikasi**. Ini satu-satunya tempat
 * warna di luar token bagian 8 dibolehkan, karena tujuannya justru menyamai
 * buku cetak, bukan menyamai aplikasi.
 */

import { CircleCheck, Lightbulb, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { nadaKategori } from '@/components/status-gizi-badge';
import { angka, KOSONG, satuan, tanggalRingkas, zScore } from '@/lib/format';
import { warnaGarisSd } from '@/lib/grafik-acuan';
import type { GarisSd, JenisKelamin } from '@/types/posyandu';

const LEBAR = 1500;
const TINGGI = 500;
const KIRI = 64;
const KANAN = 64;
const ATAS = 12;
const BAWAH = 60;

const PLOT_LEBAR = LEBAR - KIRI - KANAN;
const PLOT_TINGGI = TINGGI - ATAS - BAWAH;

/** Satu panel memuat jendela 12 bulan, sama seperti lembar KMS Buku KIA. */
const PANEL_BULAN = 12;
const PANEL_AWAL = [0, 12, 24, 36, 48];

/** Warna Buku KIA, sengaja di luar palet aplikasi. */
const PITA_KUNING = '#F2C300';
const PITA_HIJAU_MUDA = '#6FB63C';
const PITA_HIJAU_TUA = '#1E8C34';
const TINTA = '#16211C';
const TEKS_SEKUNDER = '#4A5750';

const WARNA_NADA: Record<string, string> = {
    merah: 'text-tone-red',
    oranye: 'text-tone-amber',
    hijau: 'text-tone-green',
    biru: 'text-tone-blue',
    netral: 'text-muted-foreground',
};

const EPSILON_L = 1e-7;

/** M × (1 + L×S×z)^(1/L) — rumus yang sama dengan ZScore::nilaiPadaZ. */
function nilaiPadaZ(baris: GarisSd, z: number): number {
    if (Math.abs(baris.l) < EPSILON_L) {
        return baris.m * Math.exp(baris.s * z);
    }

    return baris.m * (1 + baris.l * baris.s * z) ** (1 / baris.l);
}

export type TitikDetail = {
    umurBulan: number;
    beratKg: number;
    tanggal: string | null;
    z: number | null;
    kategori: string | null;
};

/**
 * Kunci pencarian detail titik: umur dan berat sekaligus.
 *
 * Empat belas anak pada arsip punya dua penimbangan yang jatuh pada umur bulan
 * penuh yang sama, karena tanggal ukurnya bergeser terhadap tanggal lahir.
 * Satu anak bahkan punya dua penimbangan beruntun dengan berat yang persis
 * sama, sehingga kedua titiknya benar-benar berimpit di kartu. Karena itu kunci
 * React memakai urutan, bukan nilai — lihat pemakaiannya di bawah.
 */
const kunciTitik = (umur: number, kg: number) => `${umur}|${kg}`;

type Props = {
    kelamin: JenisKelamin;
    panelAwal?: number;
    skalaMax?: number;
    /** Pasangan [umurBulan, beratKg]. */
    riwayat: [number, number][];
    /**
     * Parameter LMS BB/U. Tidak ada di kontrak artboard, tetapi pita SD tidak
     * dapat digambar tanpanya — lihat D-06 di docs/11-catatan-tahap-demo.md.
     */
    garisSd: GarisSd[];
    /** Isi tooltip titik. Opsional supaya kontrak empat props tetap berlaku. */
    detail?: TitikDetail[];
    /** Titik yang sedang disorot dari tabel riwayat. */
    umurDisorot?: number | null;
    onGantiPanel?: (awal: number) => void;
};

export default function KmsChart({
    kelamin,
    panelAwal,
    skalaMax,
    riwayat,
    garisSd,
    detail = [],
    umurDisorot = null,
    onGantiPanel,
}: Props) {
    const [panel, setPanel] = useState(
        panelAwal ??
            Math.min(
                48,
                Math.floor(Math.max(0, ...riwayat.map(([umur]) => umur)) / 12) *
                    12,
            ),
    );
    // Urutan titik di panel aktif: yang disorot tetikus dan yang diketuk.
    const [sorot, setSorot] = useState<number | null>(null);
    const [pin, setPin] = useState<number | null>(null);
    const gantiPanel = (awal: number) => {
        setPanel(awal);
        setSorot(null);
        setPin(null);
        onGantiPanel?.(awal);
    };

    const umurTerakhir = riwayat.reduce((maks, [u]) => Math.max(maks, u), 0);
    // Hanya panel sampai umur pengukuran terakhir yang ditampilkan.
    const panelTampil = PANEL_AWAL.filter((awal) => awal <= umurTerakhir);

    const lms = new Map(
        garisSd.filter((g) => g.jk === kelamin).map((g) => [g.umurBulan, g]),
    );

    const bulanPanel = Array.from(
        { length: PANEL_BULAN + 1 },
        (_, i) => panel + i,
    );

    // `skalaMax` diperlakukan sebagai batas bawah, bukan batas mati. Pada panel
    // 48-60 bulan garis +3 SD sudah melewati 25 kg, sehingga skala tetap 18 kg
    // akan membuang pita atas ke luar kartu dan menimpa judul sumbu. Kartu KMS
    // cetak pun memakai rentang berat berbeda untuk tiap lembar umur.
    const sdTertinggi = bulanPanel.reduce((maks, bulan) => {
        const baris = lms.get(bulan);

        return baris === undefined
            ? maks
            : Math.max(maks, nilaiPadaZ(baris, 3));
    }, 0);
    const skala = Math.max(
        skalaMax ?? 18,
        Math.ceil(sdTertinggi),
        Math.ceil(Math.max(0, ...riwayat.map(([, kg]) => kg))) + 2,
    );

    const x = (umur: number) =>
        KIRI + ((umur - panel) / PANEL_BULAN) * PLOT_LEBAR;
    const y = (kg: number) => ATAS + (1 - (kg - 1) / (skala - 1)) * PLOT_TINGGI;

    const kgPanel = Array.from({ length: skala }, (_, i) => i + 1);

    /** Titik sepanjang satu garis SD di dalam panel aktif. */
    const titikSd = (z: number) =>
        bulanPanel
            .map((bulan) => {
                const baris = lms.get(bulan);

                return baris === undefined
                    ? null
                    : ([x(bulan), y(nilaiPadaZ(baris, z))] as [number, number]);
            })
            .filter((t): t is [number, number] => t !== null);

    const garisKe = (titik: [number, number][]) =>
        titik.map(([px, py]) => `${px},${py}`).join(' ');

    /** Pita antara dua garis SD, digambar sebagai satu bidang tertutup. */
    const pita = (bawah: number, atas: number, warna: string) => {
        const a = titikSd(atas);
        const b = titikSd(bawah);

        if (a.length === 0 || b.length === 0) {
            return null;
        }

        return (
            <polygon
                key={`${bawah}-${atas}`}
                points={garisKe([...a, ...b.slice().reverse()])}
                fill={warna}
                opacity={0.55}
            />
        );
    };

    // Kurva dipecah setiap kali selisih umur antar pengukuran lebih dari satu
    // bulan: garis lurus melintasi bulan tanpa penimbangan akan mengarang data.
    const kunjungan = (
        detail.length > 0
            ? detail
            : riwayat.map(([umurBulan, beratKg]) => ({
                  umurBulan,
                  beratKg,
                  tanggal: null,
                  z: null,
                  kategori: null,
              }))
    )
        .filter(
            (d) => d.umurBulan >= panel && d.umurBulan <= panel + PANEL_BULAN,
        )
        .toSorted(
            (a, b) =>
                a.umurBulan - b.umurBulan ||
                (a.tanggal ?? '').localeCompare(b.tanggal ?? ''),
        );
    const dalamPanel = kunjungan.map(
        (d) => [d.umurBulan, d.beratKg] as [number, number],
    );
    const segmen: [number, number][][] = [];

    for (const titik of dalamPanel) {
        const terakhir = segmen[segmen.length - 1];
        const sebelum = terakhir?.[terakhir.length - 1];

        if (
            terakhir === undefined ||
            sebelum === undefined ||
            titik[0] - sebelum[0] > 1
        ) {
            segmen.push([titik]);
        } else {
            terakhir.push(titik);
        }
    }

    const acuan = kelamin === 'P' ? 'perempuan' : 'laki-laki';

    // Kartu rincian: di atas titik bila muat, di bawahnya bila tidak.
    const urutanAktif = sorot ?? pin;
    const aktif = urutanAktif === null ? undefined : kunjungan[urutanAktif];
    const kartu = (() => {
        if (aktif === undefined) {
            return null;
        }

        const lebar = 380;
        const tinggi = 112;
        const cx = x(aktif.umurBulan);
        const cy = y(aktif.beratKg);
        const kiri = Math.min(
            Math.max(cx - lebar / 2, KIRI + 6),
            KIRI + PLOT_LEBAR - lebar - 6,
        );
        const atas = cy - tinggi - 22 > ATAS ? cy - tinggi - 22 : cy + 22;

        return { cx, cy, kiri, atas, lebar, tinggi };
    })();

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-accent/45 px-4 py-3">
                <div>
                    <p className="text-base font-extrabold text-foreground">
                        Timbanglah Anak Anda Setiap Bulan
                    </p>
                    <p className="text-sm font-bold text-primary">
                        Anak Sehat, Tambah Umur, Tambah Berat, Tambah Pandai
                    </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground">
                    <Lightbulb
                        className="size-3.5 shrink-0 text-amber-600"
                        aria-hidden="true"
                    />
                    <span>
                        Ketuk titik pada grafik untuk melihat rincian tanggal,
                        berat &amp; Z-score
                    </span>
                </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
                        Lembar Usia Buku KIA:
                    </span>
                    {panelTampil.map((awal) => {
                        const jumlahTitik = riwayat.filter(
                            ([u]) => u >= awal && u <= awal + PANEL_BULAN,
                        ).length;

                        return (
                            <button
                                key={awal}
                                type="button"
                                onClick={() => gantiPanel(awal)}
                                aria-pressed={panel === awal}
                                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3.5 text-sm font-extrabold transition-colors ${
                                    panel === awal
                                        ? 'bg-primary text-primary-foreground shadow-2xs'
                                        : 'border border-border-strong bg-surface text-foreground hover:bg-surface-subtle'
                                }`}
                            >
                                <span>
                                    {awal}–{awal + PANEL_BULAN} bulan
                                </span>
                                <span
                                    className={`rounded-md px-1.5 py-0.5 text-xs font-extrabold tabular-nums ${
                                        panel === awal
                                            ? 'bg-white/20 text-primary-foreground'
                                            : 'bg-surface-subtle text-muted-foreground'
                                    }`}
                                >
                                    {jumlahTitik} titik
                                </span>
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs font-bold text-muted-foreground">
                    Standar acuan {acuan}, WHO 2006 ({dalamPanel.length}{' '}
                    kunjungan di lembar ini)
                </p>
            </div>

            {/* Grafik menggulir di dalam wadahnya sendiri; badan halaman tidak
                pernah menggulir mendatar (docs/05-uiux-spec.md bagian 7).
                `tabIndex` membuat wadah yang menggulir bisa digeser dengan
                panah papan tombol, bukan hanya dengan jari. */}
            <div
                className="mt-3 overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label="Kurva pertumbuhan, dapat digeser mendatar"
            >
                <svg
                    viewBox={`0 0 ${LEBAR} ${TINGGI}`}
                    className="h-auto w-full min-w-[820px]"
                    role="img"
                    aria-label={`Kurva berat badan menurut umur, acuan ${acuan} WHO 2006, panel ${panel} sampai ${panel + PANEL_BULAN} bulan`}
                >
                    <defs>
                        <clipPath id="kms-bidang">
                            <rect
                                x={KIRI}
                                y={ATAS}
                                width={PLOT_LEBAR}
                                height={PLOT_TINGGI}
                            />
                        </clipPath>
                    </defs>

                    <g clipPath="url(#kms-bidang)">
                        {pita(-3, -2, PITA_KUNING)}
                        {pita(2, 3, PITA_KUNING)}
                        {pita(-2, -1, PITA_HIJAU_MUDA)}
                        {pita(1, 2, PITA_HIJAU_MUDA)}
                        {pita(-1, 1, PITA_HIJAU_TUA)}

                        {/* Garis bantu minggu: tiga per bulan. */}
                        {bulanPanel
                            .slice(0, -1)
                            .flatMap((bulan) =>
                                [0.25, 0.5, 0.75].map((pecahan) => (
                                    <line
                                        key={`m${bulan}-${pecahan}`}
                                        x1={x(bulan + pecahan)}
                                        x2={x(bulan + pecahan)}
                                        y1={ATAS}
                                        y2={ATAS + PLOT_TINGGI}
                                        stroke={TINTA}
                                        strokeWidth={0.6}
                                        opacity={0.35}
                                    />
                                )),
                            )}

                        {kgPanel.map((kg) => (
                            <line
                                key={`kg${kg}`}
                                x1={KIRI}
                                x2={KIRI + PLOT_LEBAR}
                                y1={y(kg)}
                                y2={y(kg)}
                                stroke={TINTA}
                                strokeWidth={0.6}
                                opacity={0.3}
                            />
                        ))}

                        {bulanPanel.map((bulan) => (
                            <line
                                key={`b${bulan}`}
                                x1={x(bulan)}
                                x2={x(bulan)}
                                y1={ATAS}
                                y2={ATAS + PLOT_TINGGI}
                                stroke={TINTA}
                                strokeWidth={1.6}
                            />
                        ))}

                        {[-3, -2, -1, 0, 1, 2, 3].map((z) => (
                            <polyline
                                key={`sd${z}`}
                                points={garisKe(titikSd(z))}
                                fill="none"
                                stroke={warnaGarisSd(z)}
                                strokeWidth={
                                    z === -3 ? 2.4 : z === 0 ? 1.6 : 1.2
                                }
                            />
                        ))}
                    </g>

                    {/* Label kg di kiri dan kanan sekaligus, supaya mata tidak
                        perlu menyeberangi seluruh lebar kartu. */}
                    {kgPanel.map((kg) => (
                        <g key={`lkg${kg}`}>
                            <text
                                x={KIRI - 10}
                                y={y(kg) + 5}
                                textAnchor="end"
                                fontSize={12}
                                fontWeight={600}
                                fill={TEKS_SEKUNDER}
                            >
                                {kg}
                            </text>
                            <text
                                x={KIRI + PLOT_LEBAR + 10}
                                y={y(kg) + 5}
                                fontSize={12}
                                fontWeight={600}
                                fill={TEKS_SEKUNDER}
                            >
                                {kg}
                            </text>
                        </g>
                    ))}

                    {bulanPanel.map((bulan) => (
                        <text
                            key={`lb${bulan}`}
                            x={x(bulan)}
                            y={ATAS + PLOT_TINGGI + 26}
                            textAnchor="middle"
                            fontSize={17}
                            fontWeight={600}
                            fill={TEKS_SEKUNDER}
                        >
                            {bulan}
                        </text>
                    ))}

                    <text
                        x={KIRI + PLOT_LEBAR / 2}
                        y={TINGGI - 5}
                        textAnchor="middle"
                        fontSize={17}
                        fontWeight={700}
                        fill={TINTA}
                    >
                        Umur, bulan
                    </text>
                    <text
                        x={-(ATAS + PLOT_TINGGI / 2)}
                        y={22}
                        transform="rotate(-90)"
                        textAnchor="middle"
                        fontSize={17}
                        fontWeight={700}
                        fill={TINTA}
                    >
                        Berat badan, kg
                    </text>

                    <g clipPath="url(#kms-bidang)">
                        {segmen.map((bagian, i) => (
                            <g key={`seg${i}`}>
                                {/* Halo putih supaya kurva tetap terbaca di atas
                                pita berwarna. */}
                                <polyline
                                    points={garisKe(
                                        bagian.map(([u, kg]) => [x(u), y(kg)]),
                                    )}
                                    fill="none"
                                    stroke="#FFFFFF"
                                    strokeWidth={8}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <polyline
                                    points={garisKe(
                                        bagian.map(([u, kg]) => [x(u), y(kg)]),
                                    )}
                                    fill="none"
                                    stroke={TINTA}
                                    strokeWidth={3.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </g>
                        ))}

                        {dalamPanel.map(([umur, kg], urutan) => {
                            const d = kunjungan[urutan];
                            const titikTerbaru =
                                urutan === dalamPanel.length - 1;
                            const adaTitikSamaDiAtas =
                                urutan < dalamPanel.length - 1 &&
                                dalamPanel[urutan + 1][0] === umur;
                            // Label menumpang pada koordinat titik yang sama,
                            // bukan dua baris berselang yang tampak terpisah.
                            const labelY = adaTitikSamaDiAtas
                                ? Math.min(ATAS + PLOT_TINGGI - 8, y(kg) + 22)
                                : Math.max(ATAS + 18, y(kg) - 15);
                            const nilaiTitik =
                                d?.z === null || d?.z === undefined
                                    ? null
                                    : `${zScore(d.z)} SD`;
                            const labelKg = `${angka(kg, 1)} kg`;

                            return (
                                <g key={`${kunciTitik(umur, kg)}|${urutan}`}>
                                    <text
                                        x={x(umur)}
                                        y={labelY}
                                        textAnchor={
                                            umur === panel
                                                ? 'start'
                                                : umur === panel + PANEL_BULAN
                                                  ? 'end'
                                                  : 'middle'
                                        }
                                        fontSize={titikTerbaru ? 15 : 14}
                                        fontWeight={800}
                                        fill={TINTA}
                                        stroke="#FFFFFF"
                                        strokeWidth={4.5}
                                        strokeLinejoin="round"
                                        paintOrder="stroke"
                                    >
                                        {labelKg}
                                    </text>
                                    <circle
                                        cx={x(umur)}
                                        cy={y(kg)}
                                        r={
                                            umur === umurDisorot
                                                ? 10
                                                : titikTerbaru
                                                  ? 8.5
                                                  : 7
                                        }
                                        fill={
                                            titikTerbaru ? '#1E8C34' : '#FFFFFF'
                                        }
                                        stroke={
                                            titikTerbaru ? '#FFFFFF' : TINTA
                                        }
                                        strokeWidth={3.5}
                                    />
                                    {titikTerbaru && (
                                        <circle
                                            cx={x(umur)}
                                            cy={y(kg)}
                                            r={11.5}
                                            fill="none"
                                            stroke={TINTA}
                                            strokeWidth={2}
                                        />
                                    )}
                                    {/* Sasaran sentuh yang lebih lebar dari
                                        titiknya. Rinciannya muncul saat
                                        disorot tetikus, diketuk, atau difokus
                                        papan tombol, dan ikut terbaca pembaca
                                        layar lewat aria-label. */}
                                    <circle
                                        cx={x(umur)}
                                        cy={y(kg)}
                                        r={22}
                                        fill="transparent"
                                        className="cursor-pointer"
                                        tabIndex={0}
                                        role="button"
                                        aria-label={[
                                            tanggalRingkas(d?.tanggal ?? null),
                                            `umur ${umur} bulan`,
                                            satuan(kg, 'kg', 2),
                                            nilaiTitik,
                                            d?.kategori ?? null,
                                        ]
                                            .filter((b) => b !== null)
                                            .join(', ')}
                                        aria-pressed={pin === urutan}
                                        onClick={() =>
                                            setPin((lama) =>
                                                lama === urutan ? null : urutan,
                                            )
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === 'Enter' ||
                                                e.key === ' '
                                            ) {
                                                e.preventDefault();
                                                setPin((lama) =>
                                                    lama === urutan
                                                        ? null
                                                        : urutan,
                                                );
                                            }
                                        }}
                                        onMouseEnter={() => setSorot(urutan)}
                                        onMouseLeave={() => setSorot(null)}
                                        onFocus={() => setSorot(urutan)}
                                        onBlur={() => setSorot(null)}
                                    />
                                </g>
                            );
                        })}
                    </g>

                    {/* Kartu rincian dan garis bantu ke kedua sumbu. Digambar
                        di luar klip supaya kartunya tidak terpotong. */}
                    {kartu !== null && aktif !== undefined && (
                        <g pointerEvents="none">
                            <line
                                x1={kartu.cx}
                                x2={kartu.cx}
                                y1={kartu.cy}
                                y2={ATAS + PLOT_TINGGI}
                                stroke={TINTA}
                                strokeWidth={2}
                                strokeDasharray="7 6"
                            />
                            <line
                                x1={KIRI}
                                x2={kartu.cx}
                                y1={kartu.cy}
                                y2={kartu.cy}
                                stroke={TINTA}
                                strokeWidth={2}
                                strokeDasharray="7 6"
                            />
                            <rect
                                x={kartu.cx - 24}
                                y={ATAS + PLOT_TINGGI + 6}
                                width={48}
                                height={28}
                                rx={5}
                                fill={TINTA}
                            />
                            <text
                                x={kartu.cx}
                                y={ATAS + PLOT_TINGGI + 26}
                                textAnchor="middle"
                                fontSize={17}
                                fontWeight={700}
                                fill="#FFFFFF"
                            >
                                {aktif.umurBulan}
                            </text>
                            <rect
                                x={KIRI - 60}
                                y={kartu.cy - 14}
                                width={56}
                                height={28}
                                rx={5}
                                fill={TINTA}
                            />
                            <text
                                x={KIRI - 32}
                                y={kartu.cy + 6}
                                textAnchor="middle"
                                fontSize={17}
                                fontWeight={700}
                                fill="#FFFFFF"
                            >
                                {angka(aktif.beratKg, 1)}
                            </text>
                            <rect
                                x={kartu.kiri}
                                y={kartu.atas}
                                width={kartu.lebar}
                                height={kartu.tinggi}
                                rx={10}
                                fill="#FFFFFF"
                                stroke={TINTA}
                                strokeWidth={2}
                            />
                            <text
                                x={kartu.kiri + 16}
                                y={kartu.atas + 30}
                                fontSize={16}
                                fontWeight={600}
                                fill={TEKS_SEKUNDER}
                            >
                                {tanggalRingkas(aktif.tanggal)} · umur{' '}
                                {aktif.umurBulan} bulan
                            </text>
                            <text
                                x={kartu.kiri + 16}
                                y={kartu.atas + 62}
                                fontSize={21}
                                fontWeight={800}
                                fill={TINTA}
                            >
                                Berat badan {satuan(aktif.beratKg, 'kg', 2)}
                            </text>
                            <text
                                x={kartu.kiri + 16}
                                y={kartu.atas + 94}
                                fontSize={18}
                                fontWeight={700}
                                fill="currentColor"
                                className={
                                    WARNA_NADA[nadaKategori(aktif.kategori)]
                                }
                            >
                                {aktif.z === null
                                    ? KOSONG
                                    : `${zScore(aktif.z)} SD${aktif.kategori === null ? '' : ` · ${aktif.kategori}`}`}
                            </text>
                        </g>
                    )}
                </svg>
            </div>

            {dalamPanel.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground" role="status">
                    Belum ada pengukuran pada rentang {panel}–
                    {panel + PANEL_BULAN} bulan.
                </p>
            )}

            <div className="mt-4 rounded-xl border border-border bg-surface-subtle/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
                        Arti Warna Pita KMS Buku KIA (Standar WHO 2006):
                    </p>
                    <span className="text-xs font-semibold text-muted-foreground">
                        ● Titik hijau = penimbangan terakhir · ○ Titik putih =
                        bulan sebelumnya
                    </span>
                </div>
                <ul className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Legenda
                        warna={PITA_HIJAU_TUA}
                        judul="Pita Hijau Tua (Ideal)"
                        teks="−1 s/d +1 SD · Berat sangat ideal"
                    />
                    <Legenda
                        warna={PITA_HIJAU_MUDA}
                        judul="Pita Hijau Muda (Normal)"
                        teks="−2 s/d −1 & +1 s/d +2 SD · Normal"
                    />
                    <Legenda
                        warna={PITA_KUNING}
                        judul="Pita Kuning (Waspada)"
                        teks="−3 s/d −2 (Kurang) · +2 s/d +3 SD (Lebih)"
                    />
                    <Legenda
                        warna={warnaGarisSd(2)}
                        judul="Garis Merah (−2 dan +2 SD)"
                        teks="Garis ±1 SD cokelat, median hijau, ±3 SD hitam. BGM tetap di bawah −3 SD."
                    />
                </ul>

                <div className="mt-3 grid gap-2.5 border-t border-rule pt-3 text-xs sm:grid-cols-2">
                    <div className="rounded-lg border border-primary/25 bg-accent/55 px-3 py-2">
                        <strong className="mb-0.5 flex items-center gap-1 font-extrabold text-tone-green">
                            <CircleCheck
                                className="size-3.5 shrink-0 text-tone-green"
                                aria-hidden="true"
                            />
                            <span>Naik (N):</span>
                        </strong>
                        <span className="font-medium text-foreground">
                            Garis pertumbuhan naik mengikuti pita warna atau
                            berpindah ke pita di atasnya.
                        </span>
                    </div>
                    <div className="rounded-lg border border-tone-amber/30 bg-tone-amber-bg/55 px-3 py-2">
                        <strong className="mb-0.5 flex items-center gap-1 font-extrabold text-tone-amber">
                            <TriangleAlert
                                className="size-3.5 shrink-0 text-tone-amber"
                                aria-hidden="true"
                            />
                            <span>Tidak Naik (T):</span>
                        </strong>
                        <span className="font-medium text-foreground">
                            Garis mendatar, menurun, atau naik tetapi pindah ke
                            pita di bawahnya. Garis putus bila bulan tidak
                            ditimbang.
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Legenda({
    warna,
    judul,
    teks,
}: {
    warna: string;
    judul: string;
    teks: string;
}) {
    return (
        <li className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <span
                aria-hidden="true"
                className="mt-0.5 inline-block size-4 shrink-0 rounded-xs"
                style={{ backgroundColor: warna }}
            />
            <div>
                <p className="font-extrabold text-foreground">{judul}</p>
                <p className="mt-0.5 text-muted-foreground">{teks}</p>
            </div>
        </li>
    );
}
