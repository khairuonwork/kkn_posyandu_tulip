/**
 * Kurva pertumbuhan KMS — docs/10-prd-demo-frontend.md bagian 6.5.
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

import { useState } from 'react';
import { satuan, tanggalRingkas, zScore } from '@/lib/format';
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
const GARIS_MERAH = '#D92B0C';
const TINTA = '#16211C';
const TEKS_SEKUNDER = '#4A5750';

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
    panelAwal: number;
    skalaMax: number;
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
    const [panel, setPanel] = useState(panelAwal);
    const gantiPanel = (awal: number) => {
        setPanel(awal);
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
    const skala = Math.max(skalaMax, Math.ceil(sdTertinggi));

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
    const dalamPanel = riwayat
        .filter(([u]) => u >= panel && u <= panel + PANEL_BULAN)
        .sort((a, b) => a[0] - b[0]);
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

    const petaDetail = new Map(
        detail.map((d) => [kunciTitik(d.umurBulan, d.beratKg), d]),
    );
    const acuan = kelamin === 'P' ? 'perempuan' : 'laki-laki';

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-base font-bold">
                        Timbanglah Anak Anda Setiap Bulan
                    </p>
                    <p className="text-base font-bold">
                        Anak Sehat, Tambah Umur, Tambah Berat, Tambah Pandai
                    </p>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">
                    Acuan {acuan}, WHO 2006
                </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {panelTampil.map((awal) => (
                    <button
                        key={awal}
                        type="button"
                        onClick={() => gantiPanel(awal)}
                        aria-pressed={panel === awal}
                        className={`min-h-10 rounded-lg px-3.5 text-sm font-semibold ${
                            panel === awal
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-muted-foreground text-foreground'
                        }`}
                    >
                        {awal}-{awal + PANEL_BULAN} bulan
                    </button>
                ))}
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
                                stroke={z === -3 ? GARIS_MERAH : TINTA}
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
                                fontSize={16}
                                fontWeight={600}
                                fill={TEKS_SEKUNDER}
                            >
                                {kg}
                            </text>
                            <text
                                x={KIRI + PLOT_LEBAR + 10}
                                y={y(kg) + 5}
                                fontSize={16}
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
                        y={TINGGI - 24}
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
                            const d = petaDetail.get(kunciTitik(umur, kg));
                            const labelY = Math.max(
                                ATAS + 16,
                                y(kg) - (urutan % 2 === 0 ? 16 : 42),
                            );
                            const nilaiTitik =
                                d?.z === null || d?.z === undefined
                                    ? null
                                    : `${zScore(d.z)} SD`;

                            return (
                                <g key={`${kunciTitik(umur, kg)}|${urutan}`}>
                                    {nilaiTitik !== null && (
                                        <text
                                            x={x(umur)}
                                            y={labelY}
                                            textAnchor="middle"
                                            fontSize={15}
                                            fontWeight={700}
                                            fill={TINTA}
                                            stroke="#FFFFFF"
                                            strokeWidth={4}
                                            paintOrder="stroke"
                                        >
                                            {nilaiTitik}
                                        </text>
                                    )}
                                    <circle
                                        cx={x(umur)}
                                        cy={y(kg)}
                                        r={umur === umurDisorot ? 10 : 7}
                                        fill="#FFFFFF"
                                        stroke={TINTA}
                                        strokeWidth={3.5}
                                    >
                                        {/* <title> memberi tooltip asli
                                            peramban tanpa JS, dan ikut terbaca
                                            pembaca layar. */}
                                        <title>
                                            {[
                                                tanggalRingkas(
                                                    d?.tanggal ?? null,
                                                ),
                                                satuan(kg, 'kg', 2),
                                                nilaiTitik,
                                                `${umur} bulan`,
                                                d?.kategori ?? null,
                                            ]
                                                .filter((b) => b !== null)
                                                .join(' · ')}
                                        </title>
                                    </circle>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                <Legenda warna={PITA_HIJAU_TUA} teks="−1 sampai +1 SD" />
                <Legenda
                    warna={PITA_HIJAU_MUDA}
                    teks="−2 sampai −1 dan +1 sampai +2 SD"
                />
                <Legenda
                    warna={PITA_KUNING}
                    teks="−3 sampai −2 dan +2 sampai +3 SD"
                />
                <Legenda warna={GARIS_MERAH} teks="Garis merah, −3 SD" />
            </ul>

            <p className="mt-2 text-sm text-muted-foreground">
                Garis anak terputus pada bulan tanpa penimbangan. Pita mengikuti
                standar WHO 2006 yang dipakai KMS Buku KIA.
            </p>
        </div>
    );
}

function Legenda({ warna, teks }: { warna: string; teks: string }) {
    return (
        <li className="flex items-center gap-2">
            <span
                aria-hidden="true"
                className="inline-block size-4 rounded-xs"
                style={{ backgroundColor: warna }}
            />
            {teks}
        </li>
    );
}
