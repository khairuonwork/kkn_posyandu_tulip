/**
 * Grafik Pertumbuhan — lima kurva berkunci umur dalam satu kartu: BB/U, TB/U
 * (PB/U di bawah 24 bulan), IMT/U, LILA/U, dan LIKA/U.
 *
 * Gayanya sengaja sama dengan kurva KMS (`kms-chart-sep24.tsx`): pita WHO
 * hijau dan kuning, tujuh garis SD, garis −3 SD merah, garis bulan tebal. Yang
 * berbeda hanya isinya — satu garis balita untuk satu indeks, dan pilihan
 * indeks di atasnya.
 *
 * Standar dan rumusnya satu sumber dengan penilaian gizi: parameter LMS WHO
 * dari `standarLms`, z-score dari `penilaian` yang sudah dihitung. Komponen ini
 * tidak menghitung ulang z-score; ia hanya menggambar.
 *
 * LILA/U digambar sejak umur 6 bulan (PMK 2/2020) dan z-score-nya tanpa label
 * kategori sampai OI-04 diputuskan.
 */

import { useMemo, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { nadaKategori } from '@/components/status-gizi-badge';
import {
    angka,
    KOSONG,
    labelIndeks,
    satuan,
    tanggalRingkas,
    umurPanjang,
    zScore,
} from '@/lib/format';
import { nilaiPadaZ, susunTabel } from '@/lib/z-score';
import type { BarisLms } from '@/lib/z-score';
import type { JenisKelamin, Pengukuran } from '@/types/posyandu';

export type JenisGrafik = 'BB_U' | 'TB_U' | 'IMT_U' | 'LILA_U' | 'LIKA_U';

export type Spek = {
    indeks: JenisGrafik;
    nama: string;
    /** Judul panjang untuk teks bantu dan label aksesibilitas. */
    judul: string;
    unit: string;
    sumbu: string;
    /** Umur pertama yang dinilai. LILA/U baru sejak 6 bulan. */
    mulai: number;
    /** Jarak garis utama (berlabel) pada sumbu tegak. */
    langkah: number;
    /** Jarak garis halus pada sumbu tegak. */
    halus: number;
    nilai: (p: Pengukuran) => number | null;
};

export const SPEK: Spek[] = [
    {
        indeks: 'BB_U',
        nama: 'Berat Badan',
        judul: 'Berat badan menurut umur',
        unit: 'kg',
        sumbu: 'Berat badan, kg',
        mulai: 0,
        langkah: 1,
        halus: 0.5,
        nilai: (p) => p.bbKg,
    },
    {
        indeks: 'TB_U',
        nama: 'Tinggi Badan',
        judul: 'Tinggi badan menurut umur',
        unit: 'cm',
        sumbu: 'Tinggi badan, cm',
        mulai: 0,
        langkah: 4,
        halus: 1,
        nilai: (p) => p.tinggiCm,
    },
    {
        indeks: 'IMT_U',
        nama: 'Indeks Massa Tubuh',
        judul: 'Indeks massa tubuh menurut umur',
        unit: 'kg/m²',
        sumbu: 'Indeks massa tubuh, kg/m²',
        mulai: 0,
        langkah: 1,
        halus: 0.5,
        nilai: (p) =>
            p.bbKg !== null && p.tinggiCm !== null && p.tinggiCm > 0
                ? p.bbKg / (p.tinggiCm / 100) ** 2
                : null,
    },
    {
        indeks: 'LILA_U',
        nama: 'Lingkar Lengan Atas',
        judul: 'Lingkar lengan atas menurut umur',
        unit: 'cm',
        sumbu: 'Lingkar lengan atas, cm',
        mulai: 6,
        langkah: 1,
        halus: 0.5,
        nilai: (p) => p.lilaCm,
    },
    {
        indeks: 'LIKA_U',
        nama: 'Lingkar Kepala',
        judul: 'Lingkar kepala menurut umur',
        unit: 'cm',
        sumbu: 'Lingkar kepala, cm',
        mulai: 0,
        langkah: 2,
        halus: 1,
        nilai: (p) => p.likaCm,
    },
];

/** Kartu KMS cetak membagi umur dalam lembar 12 bulan; di sini pun sama. */
export const PANEL_BULAN = 12;
export const PANEL_AWAL = [0, 12, 24, 36, 48];

const LEBAR = 960;
const TINGGI = 340;
const KIRI = 52;
const KANAN = 44;
const ATAS = 14;
const BAWAH = 50;
const PLOT_LEBAR = LEBAR - KIRI - KANAN;
const PLOT_TINGGI = TINGGI - ATAS - BAWAH;

/** Warna pita dan tinta sama dengan kurva KMS; di luar palet aplikasi. */
export const PITA_KUNING = '#F2C300';
export const PITA_HIJAU_MUDA = '#6FB63C';
export const PITA_HIJAU_TUA = '#1E8C34';
export const GARIS_MERAH = '#D92B0C';
export const TINTA = '#16211C';
export const TEKS_SEKUNDER = '#4A5750';

export const WARNA_NADA: Record<string, string> = {
    merah: 'text-tone-red',
    oranye: 'text-tone-amber',
    hijau: 'text-tone-green',
    biru: 'text-tone-blue',
    netral: 'text-muted-foreground',
};

export type Titik = {
    umur: number;
    nilai: number;
    tanggal: string | null;
    z: number | null;
    kategori: string | null;
};

/**
 * Titik yang layak digambar: hadir, berumur 0–60 bulan, bernilai positif, dan
 * tidak ditandai tidak wajar. Urutannya menurut umur, lalu tanggal.
 */
export function susunTitik(pengukuran: Pengukuran[], spek: Spek): Titik[] {
    return pengukuran
        .flatMap((p) => {
            const nilai = spek.nilai(p);
            const penilaian = p.penilaian[spek.indeks];

            if (
                p.umurBulan === null ||
                p.umurBulan < spek.mulai ||
                p.umurBulan > 60 ||
                nilai === null ||
                nilai <= 0 ||
                penilaian?.tidakWajar === true
            ) {
                return [];
            }

            return [
                {
                    umur: p.umurBulan,
                    nilai,
                    tanggal: p.tanggalUkur,
                    z: penilaian?.z ?? null,
                    kategori: penilaian?.kategori ?? null,
                },
            ];
        })
        .sort(
            (a, b) =>
                a.umur - b.umur ||
                (a.tanggal ?? '').localeCompare(b.tanggal ?? ''),
        );
}

const kategoriTeks = (spek: Spek, titik: Titik) =>
    titik.z === null
        ? KOSONG
        : (titik.kategori ??
          (spek.indeks === 'LILA_U'
              ? 'Belum ada kategori'
              : 'Belum dapat dinilai'));

type Props = {
    kelamin: JenisKelamin;
    nama: string;
    /** Umur balita pada periode yang dilihat; menentukan PB/U atau TB/U. */
    umurBalita: number | null;
    /** Kalimat konteks di bawah judul: hubungan grafik dengan periode. */
    keterangan: string;
    pengukuran: Pengukuran[];
    standar: BarisLms[];
};

export default function GrafikPertumbuhan({
    kelamin,
    nama,
    umurBalita,
    keterangan,
    pengukuran,
    standar,
}: Props) {
    const tabel = useMemo(() => susunTabel(standar), [standar]);
    const umurTerakhir = pengukuran.reduce(
        (maks, p) =>
            p.statusKehadiran === 'hadir' && p.umurBulan !== null
                ? Math.max(maks, Math.min(p.umurBulan, 60))
                : maks,
        0,
    );
    // Hanya panel sampai umur pengukuran terakhir yang dapat dituju.
    const panelTersedia = PANEL_AWAL.filter((awal) => awal <= umurTerakhir);

    const [jenis, setJenis] = useState<JenisGrafik>('BB_U');
    const [panel, setPanel] = useState(
        panelTersedia[panelTersedia.length - 1] ?? 0,
    );
    // Titik yang diketuk tetap terbuka; titik di bawah tetikus ikut menyala.
    // Panel dan titik yang diketuk tidak ikut berpindah saat indeks diganti.
    const [pin, setPin] = useState<number | null>(null);
    const [sorot, setSorot] = useState<number | null>(null);

    const spek = SPEK.find((s) => s.indeks === jenis) ?? SPEK[0];
    const berdiri = umurBalita !== null && umurBalita >= 24;
    const namaTampil = (s: Spek) =>
        s.indeks === 'TB_U' && !berdiri ? 'Panjang Badan' : s.nama;
    const judulTampil = (s: Spek) =>
        s.indeks === 'TB_U' && !berdiri
            ? 'Panjang badan menurut umur'
            : s.judul;
    const sumbuTampil =
        spek.indeks === 'TB_U' && !berdiri ? 'Panjang badan, cm' : spek.sumbu;

    const seri = useMemo(
        () => susunTitik(pengukuran, spek),
        [pengukuran, spek],
    );
    const lms = useMemo(
        () =>
            new Map<number, BarisLms>(
                (tabel.get(`${jenis}|${kelamin}`) ?? []).map((b) => [
                    b.kunci,
                    b,
                ]),
            ),
        [tabel, jenis, kelamin],
    );

    const bulan = Array.from({ length: PANEL_BULAN + 1 }, (_, i) => panel + i);
    const bulanHidup = bulan.filter((u) => u >= spek.mulai && lms.has(u));
    const dalamPanel = seri.filter(
        (t) => t.umur >= panel && t.umur <= panel + PANEL_BULAN,
    );

    // Skala tegak mengikuti pita ±3 SD pada panel ini, dilebarkan bila ada
    // titik yang lebih jauh, lalu dibulatkan ke garis utama.
    const batas = [
        ...bulanHidup.flatMap((u) => {
            const baris = lms.get(u);

            return baris === undefined
                ? []
                : [nilaiPadaZ(baris, -3), nilaiPadaZ(baris, 3)];
        }),
        ...dalamPanel.map((t) => t.nilai),
    ];
    const rendah =
        Math.floor(Math.min(...batas, Infinity) / spek.langkah) * spek.langkah;
    const tinggi =
        Math.ceil(Math.max(...batas, -Infinity) / spek.langkah) * spek.langkah;
    const rentang = tinggi > rendah ? tinggi - rendah : 1;

    const x = (umur: number) =>
        KIRI + ((umur - panel) / PANEL_BULAN) * PLOT_LEBAR;
    const y = (nilai: number) =>
        ATAS + ((tinggi - nilai) / rentang) * PLOT_TINGGI;

    const garisKe = (titik: [number, number][]) =>
        titik.map(([px, py]) => `${px},${py}`).join(' ');

    const titikSd = (z: number): [number, number][] =>
        bulanHidup.flatMap((u) => {
            const baris = lms.get(u);

            return baris === undefined
                ? []
                : [[x(u), y(nilaiPadaZ(baris, z))] as [number, number]];
        });

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
                opacity={0.5}
            />
        );
    };

    const garisUtama: number[] = [];

    for (let v = rendah; v <= tinggi + 1e-9; v += spek.langkah) {
        garisUtama.push(v);
    }

    const garisHalus: number[] = [];

    for (let v = rendah; v <= tinggi + 1e-9; v += spek.halus) {
        garisHalus.push(v);
    }

    // Garis balita putus setiap jarak antar titik lebih dari satu bulan: garis
    // lurus melintasi bulan tanpa pengukuran mengarang data.
    const segmen: Titik[][] = [];

    for (const t of dalamPanel) {
        const akhir = segmen[segmen.length - 1];

        if (akhir === undefined || t.umur - akhir[akhir.length - 1].umur > 1) {
            segmen.push([t]);
        } else {
            akhir.push(t);
        }
    }

    const umurAktif = sorot ?? pin;
    const titikAktif =
        umurAktif === null
            ? undefined
            : dalamPanel.find((t) => t.umur === umurAktif);
    const terpilih =
        pin === null
            ? seri[seri.length - 1]
            : (seri.filter((t) => t.umur <= pin).pop() ?? seri[0]);
    const duaBulanLalu =
        terpilih === undefined
            ? undefined
            : seri.find((t) => t.umur === terpilih.umur - 2);

    const ketuk = (umur: number) =>
        setPin((lama) => (lama === umur ? null : umur));
    const tekanTombol = (e: KeyboardEvent, umur: number) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ketuk(umur);
        }
    };

    const acuan = kelamin === 'P' ? 'perempuan' : 'laki-laki';
    const sebelumLILA = spek.indeks === 'LILA_U' && panel < spek.mulai;
    const kodeIndeks = (s: Spek) => labelIndeks(s.indeks, umurBalita);

    // Kartu detail: di atas titik bila muat, di bawahnya bila tidak.
    const kartu = (() => {
        if (titikAktif === undefined) {
            return null;
        }

        const lebar = 252;
        const tinggiKartu = 84;
        const cx = x(titikAktif.umur);
        const cy = y(titikAktif.nilai);
        const kiri = Math.min(
            Math.max(cx - lebar / 2, KIRI + 4),
            KIRI + PLOT_LEBAR - lebar - 4,
        );
        const atas =
            cy - tinggiKartu - 16 > ATAS ? cy - tinggiKartu - 16 : cy + 16;

        return { cx, cy, kiri, atas, lebar, tinggiKartu };
    })();

    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-subtle px-4 py-3 sm:px-5">
                <div>
                    <h2 className="text-xl font-extrabold">
                        Grafik Pertumbuhan
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {judulTampil(spek)} · WHO 2006
                    </p>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">
                    {nama} · {umurPanjang(umurBalita)}
                </p>
            </div>

            <p className="px-4 pt-4 text-sm text-muted-foreground sm:px-5">
                {keterangan}
            </p>

            <div
                role="group"
                aria-label="Jenis grafik"
                className="grid grid-cols-2 gap-2 px-4 pt-3 sm:px-5 md:grid-cols-5"
            >
                {SPEK.map((s) => {
                    const aktif = s.indeks === jenis;

                    return (
                        <button
                            key={s.indeks}
                            type="button"
                            aria-pressed={aktif}
                            onClick={() => {
                                setJenis(s.indeks);
                                setSorot(null);
                            }}
                            className={`flex min-h-13 flex-col items-start justify-center rounded-lg border px-3.5 text-left ${
                                aktif
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border-strong bg-surface'
                            }`}
                        >
                            <span className="text-sm font-bold">
                                {namaTampil(s)}
                            </span>
                            <span
                                className={`text-xs font-semibold ${
                                    aktif
                                        ? 'text-primary-foreground/80'
                                        : 'text-muted-foreground'
                                }`}
                            >
                                {kodeIndeks(s)}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3 sm:px-5">
                <div className="flex flex-wrap gap-2">
                    {panelTersedia.map((awal) => (
                        <button
                            key={awal}
                            type="button"
                            onClick={() => setPanel(awal)}
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
                <p className="text-sm font-semibold text-muted-foreground">
                    Acuan {acuan}, WHO 2006
                </p>
            </div>

            {/* Tanpa satu pun titik, kurva acuan WHO tetap digambar: kader
                melihat bahwa grafiknya ada dan yang kosong adalah ukurannya. */}
            {seri.length === 0 && (
                <p
                    className="mx-4 mt-3 rounded-lg bg-surface-subtle px-4 py-3 text-sm font-semibold sm:mx-5"
                    role="status"
                >
                    Belum ada pengukuran {namaTampil(spek).toLowerCase()} untuk
                    balita ini; yang tampil hanya kurva acuan WHO.
                    {spek.indeks === 'LILA_U' &&
                        ' Lingkar lengan atas dinilai sejak umur 6 bulan.'}
                </p>
            )}
            <>
                {/* Grafik menggulir di dalam wadahnya sendiri; badan
                        halaman tidak pernah menggulir mendatar. `tabIndex`
                        membuat wadah bisa digeser dengan panah papan tombol. */}
                <div
                    className="mt-2 overflow-x-auto px-4 sm:px-5"
                    tabIndex={0}
                    role="region"
                    aria-label="Grafik pertumbuhan, dapat digeser mendatar"
                >
                    <svg
                        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
                        className="h-auto w-full min-w-[820px]"
                        role="img"
                        aria-label={`Grafik ${judulTampil(spek).toLowerCase()}, acuan ${acuan} WHO 2006, rentang ${panel} sampai ${panel + PANEL_BULAN} bulan`}
                    >
                        {pita(-3, -2, PITA_KUNING)}
                        {pita(2, 3, PITA_KUNING)}
                        {pita(-2, -1, PITA_HIJAU_MUDA)}
                        {pita(1, 2, PITA_HIJAU_MUDA)}
                        {pita(-1, 1, PITA_HIJAU_TUA)}

                        {sebelumLILA && (
                            <>
                                <rect
                                    x={x(panel)}
                                    y={ATAS}
                                    width={x(spek.mulai) - x(panel)}
                                    height={PLOT_TINGGI}
                                    fill="#E4E7E2"
                                />
                                <text
                                    x={(x(panel) + x(spek.mulai)) / 2}
                                    y={ATAS + PLOT_TINGGI / 2}
                                    textAnchor="middle"
                                    fontSize={13}
                                    fontWeight={600}
                                    fill={TEKS_SEKUNDER}
                                >
                                    Belum dinilai sebelum umur {spek.mulai}{' '}
                                    bulan
                                </text>
                            </>
                        )}

                        {/* Garis bantu minggu: tiga per bulan. */}
                        {bulan
                            .slice(0, -1)
                            .flatMap((u) =>
                                [0.25, 0.5, 0.75].map((pecahan) => (
                                    <line
                                        key={`m${u}-${pecahan}`}
                                        x1={x(u + pecahan)}
                                        x2={x(u + pecahan)}
                                        y1={ATAS}
                                        y2={ATAS + PLOT_TINGGI}
                                        stroke={TINTA}
                                        strokeWidth={0.5}
                                        opacity={0.25}
                                    />
                                )),
                            )}
                        {garisHalus.map((v) => (
                            <line
                                key={`h${v}`}
                                x1={KIRI}
                                x2={KIRI + PLOT_LEBAR}
                                y1={y(v)}
                                y2={y(v)}
                                stroke={TINTA}
                                strokeWidth={0.5}
                                opacity={0.2}
                            />
                        ))}
                        {garisUtama.map((v) => (
                            <line
                                key={`u${v}`}
                                x1={KIRI}
                                x2={KIRI + PLOT_LEBAR}
                                y1={y(v)}
                                y2={y(v)}
                                stroke={TINTA}
                                strokeWidth={0.7}
                                opacity={0.4}
                            />
                        ))}
                        {bulan.map((u) => (
                            <line
                                key={`b${u}`}
                                x1={x(u)}
                                x2={x(u)}
                                y1={ATAS}
                                y2={ATAS + PLOT_TINGGI}
                                stroke={TINTA}
                                strokeWidth={1.7}
                                opacity={0.9}
                            />
                        ))}

                        {[-3, -2, -1, 0, 1, 2, 3].map((z) => (
                            <polyline
                                key={`sd${z}`}
                                points={garisKe(titikSd(z))}
                                fill="none"
                                stroke={z === -3 ? GARIS_MERAH : TINTA}
                                strokeWidth={
                                    z === -3 ? 2.4 : z === 0 ? 1.7 : 1.1
                                }
                            />
                        ))}

                        {garisUtama.map((v) => (
                            <g key={`l${v}`}>
                                <text
                                    x={KIRI - 8}
                                    y={y(v) + 4}
                                    textAnchor="end"
                                    fontSize={12.5}
                                    fontWeight={600}
                                    fill={TEKS_SEKUNDER}
                                >
                                    {angka(v, 0)}
                                </text>
                                <text
                                    x={KIRI + PLOT_LEBAR + 8}
                                    y={y(v) + 4}
                                    fontSize={12.5}
                                    fontWeight={600}
                                    fill={TEKS_SEKUNDER}
                                >
                                    {angka(v, 0)}
                                </text>
                            </g>
                        ))}
                        {bulan.map((u) => (
                            <text
                                key={`t${u}`}
                                x={x(u)}
                                y={ATAS + PLOT_TINGGI + 19}
                                textAnchor="middle"
                                fontSize={13}
                                fontWeight={600}
                                fill={TEKS_SEKUNDER}
                            >
                                {u}
                            </text>
                        ))}
                        <text
                            x={KIRI + PLOT_LEBAR / 2}
                            y={TINGGI - 6}
                            textAnchor="middle"
                            fontSize={13}
                            fontWeight={700}
                            fill={TINTA}
                        >
                            Umur, bulan
                        </text>
                        <text
                            x={-(ATAS + PLOT_TINGGI / 2)}
                            y={14}
                            transform="rotate(-90)"
                            textAnchor="middle"
                            fontSize={13}
                            fontWeight={700}
                            fill={TINTA}
                        >
                            {sumbuTampil}
                        </text>

                        {segmen.map((bagian) => (
                            <g key={`s${bagian[0].umur}`}>
                                {/* Halo putih supaya garis tetap terbaca di
                                        atas pita berwarna. */}
                                <polyline
                                    points={garisKe(
                                        bagian.map((t) => [
                                            x(t.umur),
                                            y(t.nilai),
                                        ]),
                                    )}
                                    fill="none"
                                    stroke="#FFFFFF"
                                    strokeWidth={8}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <polyline
                                    points={garisKe(
                                        bagian.map((t) => [
                                            x(t.umur),
                                            y(t.nilai),
                                        ]),
                                    )}
                                    fill="none"
                                    stroke={TINTA}
                                    strokeWidth={3.2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </g>
                        ))}

                        {dalamPanel.map((t, urutan) => {
                            const dipilih = terpilih?.umur === t.umur;

                            return (
                                <g key={`${t.umur}|${t.tanggal}|${urutan}`}>
                                    {t.z !== null && (
                                        <text
                                            x={x(t.umur)}
                                            y={Math.max(
                                                ATAS + 16,
                                                y(t.nilai) - 12,
                                            )}
                                            textAnchor={
                                                t.umur === panel
                                                    ? 'start'
                                                    : t.umur ===
                                                        panel + PANEL_BULAN
                                                      ? 'end'
                                                      : 'middle'
                                            }
                                            fontSize={13.5}
                                            fontWeight={700}
                                            fill={TINTA}
                                            stroke="#FFFFFF"
                                            strokeWidth={4}
                                            strokeLinejoin="round"
                                            paintOrder="stroke"
                                        >
                                            {zScore(t.z)} SD
                                        </text>
                                    )}
                                    <circle
                                        cx={x(t.umur)}
                                        cy={y(t.nilai)}
                                        r={dipilih ? 8.5 : 6}
                                        fill={dipilih ? TINTA : '#FFFFFF'}
                                        stroke={dipilih ? '#FFFFFF' : TINTA}
                                        strokeWidth={3}
                                    />
                                    {/* Sasaran sentuh yang lebih lebar dari
                                            titiknya; isi detailnya muncul saat
                                            disorot, diketuk, atau difokus. */}
                                    <circle
                                        cx={x(t.umur)}
                                        cy={y(t.nilai)}
                                        r={15}
                                        fill="transparent"
                                        className="cursor-pointer"
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`${tanggalRingkas(t.tanggal)}, umur ${t.umur} bulan, ${satuan(t.nilai, spek.unit)}${t.z === null ? '' : `, ${zScore(t.z)} SD`}`}
                                        aria-pressed={pin === t.umur}
                                        onClick={() => ketuk(t.umur)}
                                        onKeyDown={(e) =>
                                            tekanTombol(e, t.umur)
                                        }
                                        onMouseEnter={() => setSorot(t.umur)}
                                        onMouseLeave={() => setSorot(null)}
                                        onFocus={() => setSorot(t.umur)}
                                        onBlur={() => setSorot(null)}
                                    />
                                </g>
                            );
                        })}

                        {titikAktif !== undefined && kartu !== null && (
                            <g pointerEvents="none">
                                <line
                                    x1={kartu.cx}
                                    x2={kartu.cx}
                                    y1={kartu.cy}
                                    y2={ATAS + PLOT_TINGGI}
                                    stroke={TINTA}
                                    strokeWidth={1.4}
                                    strokeDasharray="5 4"
                                />
                                <line
                                    x1={KIRI}
                                    x2={kartu.cx}
                                    y1={kartu.cy}
                                    y2={kartu.cy}
                                    stroke={TINTA}
                                    strokeWidth={1.4}
                                    strokeDasharray="5 4"
                                />
                                <rect
                                    x={kartu.cx - 17}
                                    y={ATAS + PLOT_TINGGI + 4}
                                    width={34}
                                    height={21}
                                    rx={4}
                                    fill={TINTA}
                                />
                                <text
                                    x={kartu.cx}
                                    y={ATAS + PLOT_TINGGI + 19}
                                    textAnchor="middle"
                                    fontSize={12.5}
                                    fontWeight={700}
                                    fill="#FFFFFF"
                                >
                                    {titikAktif.umur}
                                </text>
                                <rect
                                    x={KIRI - 48}
                                    y={kartu.cy - 10.5}
                                    width={46}
                                    height={21}
                                    rx={4}
                                    fill={TINTA}
                                />
                                <text
                                    x={KIRI - 25}
                                    y={kartu.cy + 4.5}
                                    textAnchor="middle"
                                    fontSize={12.5}
                                    fontWeight={700}
                                    fill="#FFFFFF"
                                >
                                    {angka(titikAktif.nilai, 1)}
                                </text>
                                <rect
                                    x={kartu.kiri}
                                    y={kartu.atas}
                                    width={kartu.lebar}
                                    height={kartu.tinggiKartu}
                                    rx={8}
                                    fill="#FFFFFF"
                                    stroke={TINTA}
                                    strokeWidth={1.5}
                                />
                                <text
                                    x={kartu.kiri + 12}
                                    y={kartu.atas + 21}
                                    fontSize={12}
                                    fontWeight={600}
                                    fill={TEKS_SEKUNDER}
                                >
                                    {tanggalRingkas(titikAktif.tanggal)} · umur{' '}
                                    {titikAktif.umur} bulan
                                </text>
                                <text
                                    x={kartu.kiri + 12}
                                    y={kartu.atas + 44}
                                    fontSize={14}
                                    fontWeight={800}
                                    fill={TINTA}
                                >
                                    {namaTampil(spek)}{' '}
                                    {satuan(titikAktif.nilai, spek.unit)}
                                </text>
                                <text
                                    x={kartu.kiri + 12}
                                    y={kartu.atas + 66}
                                    fontSize={13}
                                    fontWeight={700}
                                    fill="currentColor"
                                    className={
                                        WARNA_NADA[
                                            nadaKategori(titikAktif.kategori)
                                        ]
                                    }
                                >
                                    {titikAktif.z === null
                                        ? KOSONG
                                        : `${zScore(titikAktif.z)} SD · ${kategoriTeks(spek, titikAktif)}`}
                                </text>
                            </g>
                        )}
                    </svg>
                </div>

                {seri.length > 0 && dalamPanel.length === 0 && (
                    <p
                        className="px-4 pt-2 text-sm text-muted-foreground sm:px-5"
                        role="status"
                    >
                        Belum ada pengukuran pada rentang {panel}–
                        {panel + PANEL_BULAN} bulan.
                    </p>
                )}

                <ul className="flex flex-wrap gap-x-5 gap-y-1.5 px-4 pt-2 pb-3 text-sm sm:px-5">
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
                    <Legenda
                        warna={TINTA}
                        teks="Garis balita, terputus pada bulan tanpa pengukuran"
                    />
                </ul>

                {terpilih !== undefined && (
                    <dl className="grid grid-cols-2 border-t border-border bg-surface lg:grid-cols-4">
                        <Sel judul="Titik terpilih">
                            <span className="text-lg font-extrabold">
                                {tanggalRingkas(terpilih.tanggal)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                Umur {terpilih.umur} bulan. Ketuk titik lain
                                pada grafik.
                            </span>
                        </Sel>
                        <Sel judul={namaTampil(spek)}>
                            <span className="text-lg font-extrabold">
                                {satuan(terpilih.nilai, spek.unit)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {kodeIndeks(spek)} · WHO 2006
                            </span>
                        </Sel>
                        <Sel judul="Z-score">
                            <span
                                className={`text-lg font-extrabold ${WARNA_NADA[nadaKategori(terpilih.kategori)]}`}
                            >
                                {terpilih.z === null
                                    ? KOSONG
                                    : `${zScore(terpilih.z)} SD`}
                            </span>
                            <span
                                className={`text-sm font-bold ${WARNA_NADA[nadaKategori(terpilih.kategori)]}`}
                            >
                                {kategoriTeks(spek, terpilih)}
                            </span>
                        </Sel>
                        <Sel judul="Dibanding 2 bulan sebelumnya">
                            <span className="text-lg font-extrabold">
                                {duaBulanLalu === undefined
                                    ? 'Tidak dapat dihitung'
                                    : `${terpilih.nilai - duaBulanLalu.nilai >= 0 ? '+' : ''}${satuan(terpilih.nilai - duaBulanLalu.nilai, spek.unit)}`}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {duaBulanLalu === undefined
                                    ? `Tidak ada pengukuran pada umur ${terpilih.umur - 2} bulan`
                                    : `Umur ${duaBulanLalu.umur} bulan: ${satuan(duaBulanLalu.nilai, spek.unit)}`}
                            </span>
                        </Sel>
                    </dl>
                )}
            </>
        </div>
    );
}

function Sel({ judul, children }: { judul: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 border-l border-border px-4 py-3 first:border-l-0 max-lg:odd:border-l-0 sm:px-5">
            <dt className="text-xs font-bold text-muted-foreground">{judul}</dt>
            <dd className="flex flex-col gap-0.5">{children}</dd>
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
