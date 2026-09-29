/**
 * Kurva pertumbuhan KMS — mengikuti mockup Detail Balita yang disetujui
 * 26 September 2026.
 *
 * SVG langsung, tanpa pustaka grafik: yang dibutuhkan hanya beberapa pita dan
 * garis SD serta sederet titik (docs/rujukan/ui-ux.md bagian 4).
 *
 * **Indeksnya hanya satu: berat badan menurut umur**, sama dengan KMS di Buku
 * KIA yang dipegang ibu. Warna pita **dikecualikan dari palet aplikasi**
 * karena tujuannya menyamai buku cetak, bukan menyamai aplikasi.
 *
 * Di dekat tiap titik hanya angka berat tanpa satuan. Rinciannya — tanggal,
 * umur, panjang, naik atau tidak, dan status BB/PB — muncul saat titik
 * disorot tetikus, difokus papan tombol, atau diketuk di tablet.
 */

import {
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { IKON, KELAS, nadaKategori } from '@/components/status-gizi-badge';
import {
    angka,
    labelIndeks,
    tanggalPanjang,
    tanggalRingkas,
    zScore,
} from '@/lib/format';
import type { GarisSd, JenisKelamin } from '@/types/posyandu';

/* Geometri dalam px pada lebar 600: kotak kurva dan tempat teks sumbunya.
   Ukuran teks di dalam SVG sama dengan teks halaman (12 dan 14 px) selama
   kurvanya tayang selebar aslinya. */
const LEBAR = 600;
const TINGGI = 268;
const X0 = 56;
const X1 = 556;
const Y0 = 12;
const Y1 = 220;

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

/** Kurva halus melalui titik-titiknya (Catmull-Rom menjadi Bézier kubik). */
function halus(p: [number, number][], awal = true): string {
    if (p.length === 0) {
        return '';
    }

    let d = `${awal ? 'M' : 'L'}${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;

    for (let i = 0; i < p.length - 1; i++) {
        const a = p[Math.max(0, i - 1)];
        const b = p[i];
        const c = p[i + 1];
        const e = p[Math.min(p.length - 1, i + 2)];
        const k = [
            b[0] + (c[0] - a[0]) / 6,
            b[1] + (c[1] - a[1]) / 6,
            c[0] - (e[0] - b[0]) / 6,
            c[1] - (e[1] - b[1]) / 6,
            c[0],
            c[1],
        ];

        d += ` C${k.map((v) => v.toFixed(1)).join(' ')}`;
    }

    return d;
}

/** Satu titik penimbangan beserta isi rinciannya. */
export type TitikKms = {
    /** Umur tepat dalam bulan, pecahan, dari tanggal lahir dan tanggal ukur. */
    umur: number;
    beratKg: number;
    tanggal: string | null;
    /** Umur dalam bulan penuh, untuk teks. */
    umurBulan: number | null;
    tinggiCm: number | null;
    /** Status arsip N/T/O/B apa adanya (OI-01). */
    naik: string | null;
    /** Selisih berat dari penimbangan sebelumnya. */
    selisihKg: number | null;
    /** Kenaikan berat minimal untuk umurnya, bila ada. */
    kbmKg: number | null;
    zBbTb: number | null;
    kategoriBbTb: string | null;
};

type Props = {
    judul: string;
    namaAnak: string;
    kelamin: JenisKelamin;
    /** Parameter LMS BB/U untuk pita SD. */
    garisSd: GarisSd[];
    /** Terlama di depan. */
    titik: TitikKms[];
    panelAwal: number;
};

export default function KmsChart({
    judul,
    namaAnak,
    kelamin,
    garisSd,
    titik,
    panelAwal,
}: Props) {
    const [panel, setPanel] = useState(panelAwal);
    const [aktif, setAktif] = useState<number | null>(null);

    const umurTerakhir = titik.reduce((m, t) => Math.max(m, t.umur), 0);
    // Hanya rentang yang sudah dicapai balita ini yang ditawarkan, dan
    // dijelajahi dengan panah: sampai lima tombol rentang untuk balita empat
    // tahun terlalu ramai (keputusan pemilik produk, 28 September 2026).
    const panelTampil = PANEL_AWAL.filter((awal) => awal <= umurTerakhir);
    const urutanPanel = panelTampil.indexOf(panel);
    const panelSebelum = urutanPanel > 0 ? panelTampil[urutanPanel - 1] : null;
    const panelSesudah =
        urutanPanel >= 0 && urutanPanel < panelTampil.length - 1
            ? panelTampil[urutanPanel + 1]
            : null;
    const pindahPanel = (awal: number | null) => {
        if (awal !== null) {
            setPanel(awal);
            setAktif(null);
        }
    };
    const acuan = kelamin === 'P' ? 'perempuan' : 'laki-laki';

    const lms = new Map(
        garisSd.filter((g) => g.jk === kelamin).map((g) => [g.umurBulan, g]),
    );
    const bulanPanel = Array.from(
        { length: PANEL_BULAN + 1 },
        (_, i) => panel + i,
    );
    const dalamPanel = titik
        .map((t, i) => ({ ...t, i }))
        .filter((t) => t.umur >= panel && t.umur <= panel + PANEL_BULAN);

    /* Rentang berat mengikuti pita panel ini dan berat balitanya sendiri,
       seperti lembar KMS cetak yang berbeda rentangnya tiap umur. */
    const sd = (bulan: number, z: number) => {
        const baris = lms.get(bulan);

        return baris === undefined ? null : nilaiPadaZ(baris, z);
    };
    const bawah = Math.min(
        ...bulanPanel.map((b) => sd(b, -3) ?? Infinity),
        ...dalamPanel.map((t) => t.beratKg),
    );
    const atas = Math.max(
        ...bulanPanel.map((b) => sd(b, 3) ?? 0),
        ...dalamPanel.map((t) => t.beratKg + 0.5),
    );
    const kgMin = Math.max(0, Math.floor(bawah) - 1);
    const kgMax = Math.ceil(atas);
    const langkahKg = Math.ceil(40 / ((Y1 - Y0) / (kgMax - kgMin)));

    const x = (umur: number) => X0 + ((X1 - X0) * (umur - panel)) / PANEL_BULAN;
    const y = (kg: number) => Y1 - ((Y1 - Y0) * (kg - kgMin)) / (kgMax - kgMin);

    const titikSd = (z: number) =>
        bulanPanel
            .map((b) => {
                const kg = sd(b, z);

                return kg === null ? null : ([x(b), y(kg)] as [number, number]);
            })
            .filter((t): t is [number, number] => t !== null);

    const pita = (zBawah: number, zAtas: number, warna: string) => {
        const a = titikSd(zAtas);
        const b = titikSd(zBawah).reverse();

        return a.length === 0 ? null : (
            <path
                key={`${zBawah}-${zAtas}`}
                d={`${halus(a)} ${halus(b, false)} Z`}
                fill={warna}
            />
        );
    };

    /* Garis kurva dipecah bila ada bulan yang terlewat: garis lurus melintasi
       bulan tanpa penimbangan akan mengarang data. */
    const segmen: (typeof dalamPanel)[] = [];

    for (const t of dalamPanel) {
        const akhir = segmen[segmen.length - 1];
        const sebelum = akhir?.[akhir.length - 1];

        if (sebelum === undefined || t.umur - sebelum.umur > 1.6) {
            segmen.push([t]);
        } else {
            akhir.push(t);
        }
    }

    const kgLabel: number[] = [];

    for (let kg = kgMin; kg <= kgMax; kg += langkahKg) {
        kgLabel.push(kg);
    }

    const terakhir = titik.length - 1;
    const pilih = aktif === null ? null : (titik[aktif] ?? null);

    /* Kotak rincian di atas titiknya, boleh menimpa kepala kartu seperti di
       mockup. Digeser ke dalam bila titiknya dekat tepi, dan pindah ke bawah
       hanya bila titiknya begitu tinggi sampai kotaknya keluar dari kartu. */
    const posisi =
        pilih === null
            ? null
            : {
                  kiri: Math.min(Math.max(x(pilih.umur), 132), LEBAR - 132),
                  atas: y(pilih.beratKg) > 75,
                  tinggi: y(pilih.beratKg),
              };

    return (
        <section className="kartu px-4.5 pt-3.5 pb-3.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2">
                <div className="min-w-0">
                    <h2 className="text-lg leading-tight font-extrabold">
                        {judul}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Acuan {acuan}, WHO 2006
                    </p>
                </div>
                {panelTampil.length > 0 && (
                    /* Satu kesatuan seperti penggeser bulan di kalender:
                       labelnya teks biasa, bukan hijau pekat, supaya tidak
                       disangka tombol. Panah di ujung memudar, bingkainya
                       tetap. */
                    <div
                        role="group"
                        aria-label="Rentang umur"
                        className="flex min-h-13 items-stretch rounded-lg border border-border-strong bg-card"
                    >
                        <button
                            type="button"
                            aria-label="Rentang umur sebelumnya"
                            disabled={panelSebelum === null}
                            onClick={() => pindahPanel(panelSebelum)}
                            className="flex w-13 items-center justify-center rounded-l-lg border-r border-border text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:text-border-strong disabled:hover:bg-transparent"
                        >
                            <ChevronLeft
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        </button>
                        {/* Dibacakan saat berganti, supaya pengguna pembaca
                            layar tahu rentang mana yang sekarang tampil. */}
                        <p
                            aria-live="polite"
                            className="flex min-w-[9.5rem] items-center justify-center gap-2 px-3.5 text-sm font-bold whitespace-nowrap text-foreground"
                        >
                            {panel}–{panel + PANEL_BULAN} bulan
                            {urutanPanel >= 0 && (
                                <span className="font-medium text-muted-foreground">
                                    {urutanPanel + 1} dari {panelTampil.length}
                                </span>
                            )}
                        </p>
                        <button
                            type="button"
                            aria-label="Rentang umur berikutnya"
                            disabled={panelSesudah === null}
                            onClick={() => pindahPanel(panelSesudah)}
                            className="flex w-13 items-center justify-center rounded-r-lg border-l border-border text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:text-border-strong disabled:hover:bg-transparent"
                        >
                            <ChevronRight
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        </button>
                    </div>
                )}
            </div>

            {/* Di ponsel kurva tidak diperkecil sampai teksnya tak terbaca;
                wadahnya yang digeser mendatar. Dari 640 px wadahnya tidak
                memotong apa pun, supaya kotak rincian boleh keluar dari
                bidang kurva. */}
            <div className="gulir-dalam mt-2 max-sm:overflow-x-auto">
                <div className="relative w-full max-w-[600px] min-w-[520px]">
                    <svg
                        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
                        className="block h-auto w-full"
                        role="img"
                        aria-label={`Kurva berat badan ${namaAnak}, rentang umur ${panel}–${panel + PANEL_BULAN} bulan${
                            dalamPanel.length === 0
                                ? '.'
                                : `: ${dalamPanel
                                      .map(
                                          (t) =>
                                              `${tanggalRingkas(t.tanggal)} ${angka(t.beratKg, 2)} kg`,
                                      )
                                      .join('; ')}.`
                        }`}
                    >
                        <defs>
                            <clipPath id="kms-bidang">
                                <rect
                                    x={X0}
                                    y={Y0}
                                    width={X1 - X0}
                                    height={Y1 - Y0}
                                />
                            </clipPath>
                        </defs>

                        <rect
                            x={X0}
                            y={Y0}
                            width={X1 - X0}
                            height={Y1 - Y0}
                            fill="#FFFFFF"
                        />
                        <g clipPath="url(#kms-bidang)">
                            {pita(-3, -2, PITA_KUNING)}
                            {pita(-2, -1, PITA_HIJAU_MUDA)}
                            {pita(-1, 1, PITA_HIJAU_TUA)}
                            {pita(1, 2, PITA_HIJAU_MUDA)}
                            {pita(2, 3, PITA_KUNING)}

                            <path
                                d={Array.from(
                                    { length: kgMax - kgMin + 1 },
                                    (_, i) =>
                                        `M${X0} ${y(kgMin + i).toFixed(1)} H${X1}`,
                                ).join(' ')}
                                fill="none"
                                stroke={TINTA}
                                strokeWidth={0.6}
                                strokeOpacity={0.3}
                            />
                            <path
                                d={bulanPanel
                                    .map(
                                        (b) =>
                                            `M${x(b).toFixed(1)} ${Y0} V${Y1}`,
                                    )
                                    .join(' ')}
                                fill="none"
                                stroke={TINTA}
                                strokeOpacity={0.55}
                            />
                            {[-2, -1, 0, 1, 2, 3].map((z) => (
                                <path
                                    key={`sd${z}`}
                                    d={halus(titikSd(z))}
                                    fill="none"
                                    stroke={TINTA}
                                    strokeWidth={z === 0 ? 1.6 : 1.2}
                                />
                            ))}
                            <path
                                d={halus(titikSd(-3))}
                                fill="none"
                                stroke={GARIS_MERAH}
                                strokeWidth={2.4}
                            />
                        </g>
                        <rect
                            x={X0}
                            y={Y0}
                            width={X1 - X0}
                            height={Y1 - Y0}
                            fill="none"
                            stroke={TINTA}
                            strokeWidth={1.2}
                        />

                        <g clipPath="url(#kms-bidang)">
                            {segmen.map((bagian, i) => {
                                const d = `M${bagian
                                    .map(
                                        (t) =>
                                            `${x(t.umur).toFixed(1)} ${y(t.beratKg).toFixed(1)}`,
                                    )
                                    .join(' L')}`;

                                return (
                                    <g key={`seg${i}`}>
                                        {/* Halo putih supaya kurva terbaca di
                                            atas pita berwarna. */}
                                        <path
                                            d={d}
                                            fill="none"
                                            stroke="#FFFFFF"
                                            strokeWidth={8}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d={d}
                                            fill="none"
                                            stroke={TINTA}
                                            strokeWidth={3.5}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </g>
                                );
                            })}

                            {pilih !== null &&
                                dalamPanel.some((t) => t.i === aktif) && (
                                    <circle
                                        cx={x(pilih.umur)}
                                        cy={y(pilih.beratKg)}
                                        r={13}
                                        fill="#FFFFFF"
                                        fillOpacity={0.6}
                                        stroke="#0F6E44"
                                        strokeWidth={3}
                                    />
                                )}

                            {dalamPanel.map((t) => (
                                <circle
                                    key={`t${t.i}`}
                                    cx={x(t.umur)}
                                    cy={y(t.beratKg)}
                                    r={6}
                                    fill={t.i === terakhir ? TINTA : '#FFFFFF'}
                                    stroke={
                                        t.i === terakhir ? '#FFFFFF' : TINTA
                                    }
                                    strokeWidth={t.i === terakhir ? 2 : 3}
                                />
                            ))}

                            {/* Berat tanpa satuan, bergantian di bawah dan di
                                atas titik supaya angka yang berdekatan tidak
                                bertumpuk. */}
                            {dalamPanel.map((t, urutan) => (
                                <text
                                    key={`l${t.i}`}
                                    x={x(t.umur)}
                                    y={Math.min(
                                        Math.max(
                                            urutan % 2 === 0
                                                ? y(t.beratKg) + 24
                                                : y(t.beratKg) - 14,
                                            Y0 + 14,
                                        ),
                                        Y1 - 6,
                                    )}
                                    textAnchor="middle"
                                    fontSize={12}
                                    fontWeight={800}
                                    fill={TINTA}
                                    stroke="#FFFFFF"
                                    strokeWidth={4}
                                    strokeLinejoin="round"
                                    paintOrder="stroke"
                                >
                                    {angka(t.beratKg, 2)}
                                </text>
                            ))}
                        </g>

                        {bulanPanel.map((b) => (
                            <text
                                key={`b${b}`}
                                x={x(b)}
                                y={Y1 + 20}
                                textAnchor="middle"
                                fontSize={14}
                                fontWeight={600}
                                fill={TEKS_SEKUNDER}
                            >
                                {b}
                            </text>
                        ))}
                        <text
                            x={(X0 + X1) / 2}
                            y={Y1 + 44}
                            textAnchor="middle"
                            fontSize={14}
                            fontWeight={700}
                            fill={TINTA}
                        >
                            Umur, bulan
                        </text>
                        {/* Angka kg di kiri dan kanan sekaligus, supaya mata
                            tidak perlu menyeberangi seluruh lebar kurva. */}
                        {kgLabel.map((kg) => (
                            <g key={`kg${kg}`}>
                                <text
                                    x={X0 - 8}
                                    y={y(kg) + 5}
                                    textAnchor="end"
                                    fontSize={14}
                                    fontWeight={600}
                                    fill={TEKS_SEKUNDER}
                                >
                                    {kg}
                                </text>
                                <text
                                    x={X1 + 8}
                                    y={y(kg) + 5}
                                    fontSize={14}
                                    fontWeight={600}
                                    fill={TEKS_SEKUNDER}
                                >
                                    {kg}
                                </text>
                            </g>
                        ))}
                        <text
                            transform={`translate(14 ${(Y0 + Y1) / 2}) rotate(-90)`}
                            textAnchor="middle"
                            fontSize={14}
                            fontWeight={700}
                            fill={TINTA}
                        >
                            Berat badan, kg
                        </text>

                        {/* Sasaran sentuh selebar jari di atas tiap titik. */}
                        {dalamPanel.map((t) => (
                            <circle
                                key={`s${t.i}`}
                                cx={x(t.umur)}
                                cy={y(t.beratKg)}
                                r={24}
                                fill="#FFFFFF"
                                fillOpacity={0}
                                role="button"
                                tabIndex={0}
                                aria-label={`${tanggalPanjang(t.tanggal)}, ${angka(t.beratKg, 2)} kg`}
                                onMouseEnter={() => setAktif(t.i)}
                                onMouseLeave={() => setAktif(null)}
                                onFocus={() => setAktif(t.i)}
                                onBlur={() => setAktif(null)}
                                onClick={() => setAktif(t.i)}
                                className="cursor-pointer outline-none focus-visible:stroke-primary focus-visible:stroke-2"
                            />
                        ))}
                    </svg>

                    {pilih !== null && posisi !== null && (
                        <Rincian
                            titik={pilih}
                            style={{
                                left: `${(posisi.kiri / LEBAR) * 100}%`,
                                top: `${((posisi.atas ? posisi.tinggi - 20 : posisi.tinggi + 20) / TINGGI) * 100}%`,
                                transform: `translate(-50%, ${posisi.atas ? '-100%' : '0'})`,
                            }}
                        />
                    )}
                </div>
            </div>

            <p className="mt-1.5 text-sm font-semibold">
                {titik.length === 1
                    ? 'Baru satu kali ditimbang. Garis muncul setelah penimbangan berikutnya.'
                    : 'Angka di titik adalah berat badan dalam kg. Pilih titik untuk melihat rinciannya.'}
            </p>
            <ul className="mt-1 flex flex-wrap gap-x-4.5 gap-y-1 text-sm text-muted-foreground">
                <Legenda warna={PITA_HIJAU_TUA} teks="−1 sampai +1 SD" />
                <Legenda warna={PITA_HIJAU_MUDA} teks="±1 sampai ±2 SD" />
                <Legenda warna={PITA_KUNING} teks="±2 sampai ±3 SD" />
                <Legenda warna={GARIS_MERAH} teks="Garis merah −3 SD" garis />
            </ul>
        </section>
    );
}

/** Kotak rincian satu titik. */
function Rincian({
    titik: t,
    style,
}: {
    titik: TitikKms;
    style: CSSProperties;
}) {
    const berdiri = t.umurBulan !== null && t.umurBulan >= 24;
    const nada = nadaKategori(t.kategoriBbTb);
    const IkonKategori = IKON[nada];
    const selisih =
        t.selisihKg === null
            ? null
            : `${t.selisihKg >= 0 ? '+' : '−'}${angka(Math.abs(t.selisihKg), 2)} kg dari bulan lalu`;

    return (
        <div
            role="status"
            style={style}
            className="pointer-events-none absolute z-10 w-[264px] rounded-lg border-2 border-foreground bg-card px-3.5 py-2.5 leading-snug shadow-[0_8px_20px_rgba(22,33,28,0.18)]"
        >
            <p className="text-sm font-semibold text-muted-foreground">
                {tanggalPanjang(t.tanggal)}
                {t.umurBulan !== null && ` · umur ${t.umurBulan} bulan`}
            </p>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-xl font-extrabold">
                    {angka(t.beratKg, 2)} kg
                </span>
                {t.tinggiCm !== null && (
                    <span className="text-sm text-muted-foreground">
                        {berdiri ? 'tinggi' : 'panjang'} {angka(t.tinggiCm, 1)}{' '}
                        cm
                    </span>
                )}
            </p>
            {t.naik === 'N' || t.naik === 'T' ? (
                <p
                    className={`mt-1 flex flex-wrap items-center gap-x-1.5 text-sm font-bold ${
                        t.naik === 'N' ? 'text-tone-green' : 'text-tone-amber'
                    }`}
                >
                    {t.naik === 'N' ? (
                        <CircleCheck
                            className="size-4"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    ) : (
                        <TriangleAlert
                            className="size-4"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    )}
                    {t.naik === 'N' ? 'Naik' : 'Tidak naik'}
                    {selisih !== null && (
                        <span className="font-medium text-muted-foreground">
                            {selisih}
                            {t.naik === 'T' && t.kbmKg !== null && (
                                <>
                                    ,{' '}
                                    <span className="whitespace-nowrap">
                                        kurang dari {angka(t.kbmKg, 2)} kg
                                    </span>
                                </>
                            )}
                        </span>
                    )}
                </p>
            ) : (
                t.naik !== null && (
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                        {t.naik === 'B'
                            ? 'Pertama kali ditimbang'
                            : 'Tidak ditimbang bulan lalu'}
                    </p>
                )
            )}
            {t.zBbTb !== null && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    {labelIndeks('BB_TB', t.umurBulan)} {zScore(t.zBbTb)} SD
                    {t.kategoriBbTb !== null && (
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-bold whitespace-nowrap ${KELAS[nada]}`}
                        >
                            <IkonKategori
                                className="size-4"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            {t.kategoriBbTb}
                        </span>
                    )}
                </p>
            )}
        </div>
    );
}

function Legenda({
    warna,
    teks,
    garis = false,
}: {
    warna: string;
    teks: string;
    garis?: boolean;
}) {
    return (
        <li className="flex items-center gap-1.5">
            <span
                aria-hidden="true"
                className={garis ? 'h-[3px] w-4' : 'h-3 w-4 rounded-[4px]'}
                style={{ backgroundColor: warna }}
            />
            {teks}
        </li>
    );
}
