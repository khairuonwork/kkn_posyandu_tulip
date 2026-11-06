/** Grafik pertumbuhan dengan garis acuan KIA. Kurva KMS tetap terpisah.
 * Skor berasal dari hasil penilaian tersimpan; komponen hanya menggambar.
 */

import { BookOpen, CircleCheck } from 'lucide-react';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import GrafikBeratTinggi from '@/components/grafik-berat-tinggi';
import { nadaKategori } from '@/components/status-gizi-badge';
import {
    angka,
    KOSONG,
    labelIndeks,
    satuan,
    tanggalRingkas,
    zScore,
} from '@/lib/format';
import { periodeGrafikBersambung, warnaGarisSd } from '@/lib/grafik-acuan';
import { labelKategoriGizi } from '@/lib/kategori';
import { nilaiPadaZ, susunTabel } from '@/lib/z-score';
import type { BarisLms } from '@/lib/z-score';
import type { JenisKelamin, Pengukuran } from '@/types/posyandu';

export type JenisGrafik = 'BB_U' | 'TB_U' | 'IMT_U' | 'LILA_U' | 'LIKA_U';

export type Spek = {
    indeks: JenisGrafik;
    nama: string;
    /** Judul panjang untuk teks bantu dan label aksesibilitas. */
    judul: string;
    /** Penjelasan praktis fungsi indeks untuk kader. */
    tujuan?: string;
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
        tujuan: 'Deteksi Berat Kurang',
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
        tujuan: 'Deteksi Stunting',
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
        tujuan: 'Deteksi Gizi Lebih',
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
        tujuan: 'Deteksi Risiko KEK',
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
        tujuan: 'Ukuran Kepala & Otak',
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
const KANAN = 88;
const ATAS = 20;
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
    periodeId: string;
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
                p.statusKehadiran !== 'hadir' ||
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
                    periodeId: p.periodeId,
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
        : titik.kategori
          ? labelKategoriGizi(titik.kategori)
          : spek.indeks === 'LILA_U'
            ? 'Belum ada kategori'
            : 'Belum dapat dinilai';

type Props = {
    kelamin: JenisKelamin;
    nama: string;
    /** Umur balita pada periode yang dilihat; menentukan PB/U atau TB/U. */
    umurBalita: number | null;
    /** Kalimat konteks di bawah judul: hubungan grafik dengan periode. */
    keterangan: string;
    pengukuran: Pengukuran[];
    standar: BarisLms[];
    modeKms?: boolean;
    umurDisorot?: number | null;
    aktif: boolean;
};

export default function GrafikPertumbuhan({
    kelamin,
    umurBalita,
    keterangan,
    pengukuran,
    standar,
    modeKms = false,
    umurDisorot = null,
    aktif,
}: Props) {
    const animasiSudahDiputar = useRef(false);
    const idBukaan = useId();
    const bukaan = useRef<SVGRectElement>(null);
    const animasi = useRef<Animation | null>(null);
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

    const [jenis, setJenis] = useState<JenisGrafik | 'BB_TB'>('BB_U');
    const [arahIndeks, setArahIndeks] = useState<'maju' | 'mundur' | null>(
        null,
    );
    const pilihJenis = (pilihan: JenisGrafik | 'BB_TB') => {
        if (pilihan === jenis) {
            return;
        }

        animasi.current?.cancel();
        const urutan = [...SPEK.map((item) => item.indeks), 'BB_TB'];
        setArahIndeks(
            urutan.indexOf(pilihan) > urutan.indexOf(jenis) ? 'maju' : 'mundur',
        );
        setJenis(pilihan);
        setSorot(null);
    };
    const [panel, setPanel] = useState(
        umurDisorot !== null
            ? (panelTersedia.filter((awal) => awal <= umurDisorot).at(-1) ?? 0)
            : (panelTersedia[panelTersedia.length - 1] ?? 0),
    );
    const pilihanTerakhir = useRef(`${jenis}:${panel}`);
    useLayoutEffect(() => {
        if (!aktif) {
            return;
        }

        const pilihan = `${jenis}:${panel}`;
        const berubah = pilihan !== pilihanTerakhir.current;
        pilihanTerakhir.current = pilihan;
        const perluAnimasi = !animasiSudahDiputar.current || berubah;

        if (!perluAnimasi) {
            return;
        }

        animasiSudahDiputar.current = true;

        if (
            !bukaan.current ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        animasi.current = bukaan.current.animate(
            [{ width: '0px' }, { width: `${PLOT_LEBAR + 32}px` }],
            { duration: 700, easing: 'ease-out' },
        );

        return () => {
            animasi.current?.cancel();
            animasi.current = null;
        };
    }, [aktif, jenis, panel, modeKms]);
    // Titik yang diketuk tetap terbuka; titik di bawah tetikus ikut menyala.
    // Panel dan titik yang diketuk tidak ikut berpindah saat indeks diganti.
    const [pin, setPin] = useState<string | null>(
        () =>
            pengukuran.find(
                (p) => umurDisorot !== null && p.umurBulan === umurDisorot,
            )?.periodeId ?? null,
    );
    const [sorot, setSorot] = useState<string | null>(null);

    // Pengukuran terbaru balita untuk indikator status pada masing-masing tombol indeks
    const pengukuranTerbaru = useMemo(() => {
        return (
            pengukuran.find(
                (p) => p.statusKehadiran === 'hadir' && p.umurBulan !== null,
            ) ?? null
        );
    }, [pengukuran]);

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

    const awalTampil = Math.max(panel, spek.mulai);
    const akhirTampil = panel + PANEL_BULAN;
    const bulan = Array.from(
        { length: akhirTampil - awalTampil + 1 },
        (_, i) => awalTampil + i,
    );
    const bulanHidup = bulan.filter((u) => u >= spek.mulai && lms.has(u));
    const dalamPanel = seri.filter(
        (t) => t.umur >= awalTampil && t.umur <= akhirTampil,
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
        KIRI + ((umur - awalTampil) / (akhirTampil - awalTampil)) * PLOT_LEBAR;
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

    const garisUtama: number[] = [];

    for (let v = rendah; v <= tinggi + 1e-9; v += spek.langkah) {
        garisUtama.push(v);
    }

    const garisHalus: number[] = [];

    for (let v = rendah; v <= tinggi + 1e-9; v += spek.halus) {
        garisHalus.push(v);
    }

    // Periode menentukan kesinambungan; umur genap hanya menentukan posisi titik.
    const segmen: Titik[][] = [];

    for (const t of dalamPanel) {
        const akhir = segmen[segmen.length - 1];

        if (
            akhir === undefined ||
            !periodeGrafikBersambung(
                akhir[akhir.length - 1].periodeId,
                t.periodeId,
            )
        ) {
            segmen.push([t]);
        } else {
            akhir.push(t);
        }
    }

    const periodeAktif = sorot ?? pin;
    const titikAktif =
        periodeAktif === null
            ? undefined
            : dalamPanel.find((t) => t.periodeId === periodeAktif);
    const terpilih =
        pin === null
            ? seri[seri.length - 1]
            : (seri.find((t) => t.periodeId === pin) ?? seri.at(-1));
    const duaBulanLalu =
        terpilih === undefined
            ? undefined
            : seri.find((t) => t.umur === terpilih.umur - 2);

    const ketuk = (periodeId: string) =>
        setPin((lama) => (lama === periodeId ? null : periodeId));
    const tekanTombol = (e: KeyboardEvent, periodeId: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ketuk(periodeId);
        }
    };

    const acuan = kelamin === 'P' ? 'perempuan' : 'laki-laki';
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
            <div className="strip-kepala flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                            Standar Baku WHO 2006
                        </span>
                        <span className="rounded-md bg-surface-subtle px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                            Kemenkes RI
                        </span>
                    </div>
                    <h2 className="mt-1 text-xl font-extrabold text-foreground">
                        {modeKms
                            ? 'Kurva KMS'
                            : 'Grafik Pertumbuhan Antropometri'}
                    </h2>
                    <p
                        key={jenis}
                        className={`mt-0.5 text-sm text-muted-foreground ${arahIndeks ? `detail-indeks-${arahIndeks}` : ''}`}
                    >
                        {jenis === 'BB_TB'
                            ? 'Berat badan menurut panjang/tinggi badan (BB/PB atau BB/TB)'
                            : `${judulTampil(spek)} (${kodeIndeks(spek)})`}{' '}
                        · Pemantauan tren kurva Z-score
                    </p>
                    {modeKms && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {keterangan}
                        </p>
                    )}
                </div>
            </div>

            {/* Banner Edukasi & Panduan Ibu Kader */}

            {/* Tombol Pilihan Indeks Pertumbuhan */}
            {!modeKms && (
                <div
                    role="group"
                    aria-label="Pilih jenis grafik pertumbuhan"
                    className="grid grid-cols-2 gap-2.5 px-5 pt-3 sm:px-6 md:grid-cols-3 xl:grid-cols-6"
                >
                    {SPEK.map((s) => {
                        const aktif = s.indeks === jenis;
                        const hasilTerbaru =
                            pengukuranTerbaru?.penilaian[s.indeks];
                        const labelHasil = hasilTerbaru?.kategori
                            ? labelKategoriGizi(hasilTerbaru.kategori)
                            : null;

                        return (
                            <button
                                key={s.indeks}
                                type="button"
                                aria-pressed={aktif}
                                onClick={() => pilihJenis(s.indeks)}
                                className={`detail-pilihan ${aktif && arahIndeks ? `detail-pilihan-${arahIndeks}` : ''} flex min-h-16 flex-col justify-between rounded-xl border p-3 text-left ${
                                    aktif
                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/25'
                                        : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-surface-subtle'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-extrabold">
                                            {kodeIndeks(s)}
                                        </span>
                                        {s.tujuan && (
                                            <span
                                                className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${
                                                    aktif
                                                        ? 'bg-primary-foreground/20 text-primary-foreground'
                                                        : 'bg-surface-subtle text-muted-foreground'
                                                }`}
                                            >
                                                {s.tujuan}
                                            </span>
                                        )}
                                    </div>
                                    <span className="mt-1 block text-sm leading-tight font-bold">
                                        {namaTampil(s)}
                                    </span>
                                </div>
                                <div className="mt-2 border-t border-current/15 pt-1">
                                    {labelHasil ? (
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                                                aktif
                                                    ? 'text-primary-foreground'
                                                    : 'text-tone-green'
                                            }`}
                                        >
                                            <CircleCheck
                                                className="size-3.5 shrink-0"
                                                aria-hidden="true"
                                            />
                                            <span>{labelHasil}</span>
                                        </span>
                                    ) : (
                                        <span
                                            className={`text-[11px] font-semibold ${
                                                aktif
                                                    ? 'text-primary-foreground/70'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            {s.indeks === 'LILA_U'
                                                ? '≥ 6 bulan'
                                                : 'WHO 2006'}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                    {(() => {
                        const aktif = jenis === 'BB_TB';
                        const hasilBbTb = pengukuranTerbaru?.penilaian.BB_TB;
                        const labelBbTb = hasilBbTb?.kategori
                            ? labelKategoriGizi(hasilBbTb.kategori)
                            : null;

                        return (
                            <button
                                type="button"
                                aria-pressed={aktif}
                                onClick={() => pilihJenis('BB_TB')}
                                className={`detail-pilihan ${aktif && arahIndeks ? `detail-pilihan-${arahIndeks}` : ''} flex min-h-16 flex-col justify-between rounded-xl border p-3 text-left ${
                                    aktif
                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/25'
                                        : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-surface-subtle'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-extrabold">
                                            BB/PB · BB/TB
                                        </span>
                                        <span
                                            className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${
                                                aktif
                                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                                    : 'bg-surface-subtle text-muted-foreground'
                                            }`}
                                        >
                                            Deteksi Wasting
                                        </span>
                                    </div>
                                    <span className="mt-1 block text-sm leading-tight font-bold">
                                        Berat &amp; Tinggi
                                    </span>
                                </div>
                                <div className="mt-2 border-t border-current/15 pt-1">
                                    {labelBbTb ? (
                                        <span
                                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                                                aktif
                                                    ? 'text-primary-foreground'
                                                    : 'text-tone-green'
                                            }`}
                                        >
                                            <CircleCheck
                                                className="size-3.5 shrink-0"
                                                aria-hidden="true"
                                            />
                                            <span>{labelBbTb}</span>
                                        </span>
                                    ) : (
                                        <span
                                            className={`text-[11px] font-semibold ${
                                                aktif
                                                    ? 'text-primary-foreground/70'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            Proporsi Tubuh
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })()}
                </div>
            )}
            {jenis === 'BB_TB' ? (
                <div
                    key={jenis}
                    className={arahIndeks ? `detail-indeks-${arahIndeks}` : ''}
                >
                    <GrafikBeratTinggi
                        kelamin={kelamin}
                        umurBalita={umurBalita}
                        pengukuran={pengukuran}
                        standar={standar}
                    />
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 pt-4 pb-3 sm:px-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-xs font-bold text-muted-foreground">
                                Lembar Umur:
                            </span>
                            {panelTersedia.map((awal) => {
                                const jumlah = seri.filter(
                                    (t) =>
                                        t.umur >= awal &&
                                        t.umur <= awal + PANEL_BULAN,
                                ).length;
                                const aktif = panel === awal;

                                return (
                                    <button
                                        key={awal}
                                        type="button"
                                        onClick={() => setPanel(awal)}
                                        aria-pressed={aktif}
                                        className={`detail-pilihan inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold ${
                                            aktif
                                                ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/25'
                                                : 'border border-border bg-surface text-foreground hover:bg-surface-subtle'
                                        }`}
                                    >
                                        <span>
                                            {Math.max(awal, spek.mulai)}–
                                            {awal + PANEL_BULAN} bulan
                                        </span>
                                        <span
                                            className={`py-0.2 rounded-full px-1.5 text-[10px] font-extrabold ${
                                                aktif
                                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {jumlah} data
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <span className="inline-block size-2 rounded-full bg-emerald-500" />
                            Acuan Standar {acuan}, WHO 2006
                        </div>
                    </div>

                    {/* Tanpa satu pun titik, kurva acuan WHO tetap digambar: kader
                melihat bahwa grafiknya ada dan yang kosong adalah ukurannya. */}
                    {seri.length === 0 && (
                        <p
                            className="mx-5 mt-3 rounded-lg bg-surface-subtle px-4 py-3 text-sm font-semibold sm:mx-6"
                            role="status"
                        >
                            Belum ada pengukuran{' '}
                            {namaTampil(spek).toLowerCase()} untuk balita ini;
                            yang tampil hanya kurva acuan WHO.
                            {spek.indeks === 'LILA_U' &&
                                ' Lingkar lengan atas dinilai sejak umur 6 bulan.'}
                        </p>
                    )}
                    <>
                        {/* Grafik menggulir di dalam wadahnya sendiri; badan
                        halaman tidak pernah menggulir mendatar. `tabIndex`
                        membuat wadah bisa digeser dengan panah papan tombol. */}
                        <div
                            key={jenis}
                            className={`mt-2 overflow-x-auto px-5 sm:px-6 ${arahIndeks ? `detail-indeks-${arahIndeks}` : ''}`}
                            tabIndex={0}
                            role="region"
                            aria-label="Grafik pertumbuhan, dapat digeser mendatar"
                        >
                            <svg
                                viewBox={`0 0 ${LEBAR} ${TINGGI}`}
                                className="h-auto w-full min-w-[820px] bg-white"
                                role="img"
                                aria-label={`Grafik ${judulTampil(spek).toLowerCase()}, acuan ${acuan} WHO 2006, rentang ${awalTampil} sampai ${akhirTampil} bulan`}
                            >
                                <defs>
                                    <clipPath
                                        id={idBukaan}
                                        clipPathUnits="userSpaceOnUse"
                                    >
                                        <rect
                                            ref={bukaan}
                                            x={KIRI - 16}
                                            y={0}
                                            width={PLOT_LEBAR + 32}
                                            height={TINGGI}
                                        />
                                    </clipPath>
                                </defs>
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
                                                stroke="#E8ECE9"
                                                strokeWidth={0.5}
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
                                        stroke="#E8ECE9"
                                        strokeWidth={0.5}
                                    />
                                ))}
                                {garisUtama.map((v) => (
                                    <line
                                        key={`u${v}`}
                                        x1={KIRI}
                                        x2={KIRI + PLOT_LEBAR}
                                        y1={y(v)}
                                        y2={y(v)}
                                        stroke="#CAD2CC"
                                        strokeWidth={0.7}
                                    />
                                ))}
                                {bulan.map((u) => (
                                    <line
                                        key={`b${u}`}
                                        x1={x(u)}
                                        x2={x(u)}
                                        y1={ATAS}
                                        y2={ATAS + PLOT_TINGGI}
                                        stroke="#CAD2CC"
                                        strokeWidth={0.7}
                                    />
                                ))}

                                {[-3, -2, -1, 0, 1, 2, 3].map((z) => {
                                    const titik = titikSd(z);
                                    const ujung = titik.at(-1);

                                    return (
                                        <g key={`sd${z}`}>
                                            <polyline
                                                clipPath={`url(#${idBukaan})`}
                                                points={garisKe(titik)}
                                                fill="none"
                                                stroke={warnaGarisSd(z)}
                                                strokeWidth={z === 0 ? 2 : 1.5}
                                            />
                                            {ujung && (
                                                <text
                                                    x={ujung[0] + 10}
                                                    y={ujung[1] + 4}
                                                    fontSize={12}
                                                    fontWeight={700}
                                                    fill={warnaGarisSd(z)}
                                                    stroke="#FFFFFF"
                                                    strokeWidth={3}
                                                    paintOrder="stroke"
                                                >
                                                    {z === 0
                                                        ? 'Median'
                                                        : `${z > 0 ? '+' : '−'}${Math.abs(z)} SD`}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}

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
                                            clipPath={`url(#${idBukaan})`}
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
                                            clipPath={`url(#${idBukaan})`}
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
                                    const dipilih = terpilih === t;
                                    const isTerbaru =
                                        seri.length > 0 &&
                                        t === seri[seri.length - 1];
                                    const sesudah =
                                        dalamPanel[urutan + 1]?.umur === t.umur;
                                    const sebelum =
                                        dalamPanel[urutan - 1]?.umur === t.umur;

                                    return (
                                        <g
                                            key={`${t.umur}|${t.tanggal}|${urutan}`}
                                        >
                                            {/* Cincin ganda hijau untuk titik pengukuran terbaru balita */}
                                            {isTerbaru && (
                                                <circle
                                                    clipPath={`url(#${idBukaan})`}
                                                    cx={x(t.umur)}
                                                    cy={y(t.nilai)}
                                                    r={13}
                                                    fill="none"
                                                    stroke="#10B981"
                                                    strokeWidth={2.5}
                                                    strokeDasharray="4 2"
                                                />
                                            )}
                                            {t.z !== null && (
                                                <text
                                                    x={
                                                        x(t.umur) +
                                                        (sesudah
                                                            ? -12
                                                            : sebelum
                                                              ? 12
                                                              : 0)
                                                    }
                                                    y={Math.max(
                                                        ATAS + 16,
                                                        y(t.nilai) -
                                                            (isTerbaru
                                                                ? 16
                                                                : 12),
                                                    )}
                                                    textAnchor={
                                                        sesudah
                                                            ? 'end'
                                                            : sebelum ||
                                                                t.umur ===
                                                                    awalTampil
                                                              ? 'start'
                                                              : t.umur ===
                                                                  panel +
                                                                      PANEL_BULAN
                                                                ? 'end'
                                                                : 'middle'
                                                    }
                                                    fontSize={
                                                        isTerbaru ? 14 : 13.5
                                                    }
                                                    fontWeight={
                                                        isTerbaru ? 800 : 700
                                                    }
                                                    fill={
                                                        isTerbaru
                                                            ? '#047857'
                                                            : TINTA
                                                    }
                                                    stroke="#FFFFFF"
                                                    strokeWidth={4.5}
                                                    strokeLinejoin="round"
                                                    paintOrder="stroke"
                                                >
                                                    {zScore(t.z)} SD
                                                </text>
                                            )}
                                            <circle
                                                clipPath={`url(#${idBukaan})`}
                                                cx={x(t.umur)}
                                                cy={y(t.nilai)}
                                                r={
                                                    dipilih
                                                        ? 8.5
                                                        : isTerbaru
                                                          ? 7.5
                                                          : 6
                                                }
                                                fill={
                                                    dipilih
                                                        ? TINTA
                                                        : isTerbaru
                                                          ? '#10B981'
                                                          : '#FFFFFF'
                                                }
                                                stroke={
                                                    dipilih
                                                        ? '#FFFFFF'
                                                        : isTerbaru
                                                          ? '#FFFFFF'
                                                          : TINTA
                                                }
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
                                                aria-pressed={
                                                    pin === t.periodeId
                                                }
                                                onClick={() =>
                                                    ketuk(t.periodeId)
                                                }
                                                onKeyDown={(e) =>
                                                    tekanTombol(e, t.periodeId)
                                                }
                                                onMouseEnter={() =>
                                                    setSorot(t.periodeId)
                                                }
                                                onMouseLeave={() =>
                                                    setSorot(null)
                                                }
                                                onFocus={() =>
                                                    setSorot(t.periodeId)
                                                }
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
                                            {tanggalRingkas(titikAktif.tanggal)}{' '}
                                            · umur {titikAktif.umur} bulan
                                        </text>
                                        <text
                                            x={kartu.kiri + 12}
                                            y={kartu.atas + 44}
                                            fontSize={14}
                                            fontWeight={800}
                                            fill={TINTA}
                                        >
                                            {namaTampil(spek)}{' '}
                                            {satuan(
                                                titikAktif.nilai,
                                                spek.unit,
                                            )}
                                        </text>
                                        <text
                                            x={kartu.kiri + 12}
                                            y={kartu.atas + 66}
                                            fontSize={13}
                                            fontWeight={700}
                                            fill="currentColor"
                                            className={
                                                WARNA_NADA[
                                                    nadaKategori(
                                                        titikAktif.kategori,
                                                    )
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
                                className="px-5 pt-2 text-sm text-muted-foreground sm:px-6"
                                role="status"
                            >
                                Belum ada pengukuran pada rentang {awalTampil}–
                                {akhirTampil} bulan.
                            </p>
                        )}

                        {/* Panduan Membaca Warna Garis Baku WHO 2006 */}
                        <div className="mx-5 my-3 rounded-xl border border-border bg-surface-subtle/70 p-3.5 text-xs sm:mx-6">
                            <div className="mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-extrabold tracking-wide text-foreground uppercase">
                                    <BookOpen
                                        className="size-4 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                    <span>Arti Garis Acuan Baku WHO 2006</span>
                                </span>
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                    Kemenkes RI
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-2.5 py-1.5 text-emerald-950">
                                    <span
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0 rounded-xs"
                                        style={{
                                            backgroundColor: warnaGarisSd(0),
                                        }}
                                    />
                                    <div className="text-[11px] leading-tight">
                                        <span className="font-bold">
                                            Garis Hijau (0 SD)
                                        </span>
                                        : Median ideal rata-rata
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-2.5 py-1.5 text-amber-950">
                                    <span
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0 rounded-xs"
                                        style={{
                                            backgroundColor: warnaGarisSd(2),
                                        }}
                                    />
                                    <div className="text-[11px] leading-tight">
                                        <span className="font-bold">
                                            Garis Merah (±2 SD)
                                        </span>
                                        : Rentang wajar
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-red-950">
                                    <span
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0 rounded-xs"
                                        style={{
                                            backgroundColor: warnaGarisSd(3),
                                        }}
                                    />
                                    <div className="text-[11px] leading-tight">
                                        <span className="font-bold">
                                            Garis Hitam (±3 SD)
                                        </span>
                                        : Batas rujukan bahaya
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-slate-950">
                                    <span
                                        aria-hidden="true"
                                        className="size-3.5 shrink-0 rounded-xs bg-[#16211C]"
                                    />
                                    <div className="text-[11px] leading-tight">
                                        <span className="font-bold">
                                            Garis &amp; Titik Balita
                                        </span>
                                        : Hasil ukur bulanan
                                    </div>
                                </div>
                            </div>
                        </div>

                        {terpilih !== undefined && (
                            <div className="border-t border-border bg-surface p-4 sm:p-5">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex size-2 rounded-full bg-primary" />
                                        <h3 className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">
                                            Rincian Titik Ukur Terpilih ·{' '}
                                            {tanggalRingkas(terpilih.tanggal)}{' '}
                                            (Umur {terpilih.umur} Bulan)
                                        </h3>
                                    </div>
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        Ketuk titik mana saja di grafik untuk
                                        berpindah periode
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                                        <span className="text-xs font-bold text-muted-foreground">
                                            Tanggal &amp; Periode
                                        </span>
                                        <p className="mt-1 text-base font-extrabold text-foreground">
                                            {tanggalRingkas(terpilih.tanggal)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Umur {terpilih.umur} bulan (
                                            {terpilih.periodeId})
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                                        <span className="text-xs font-bold text-muted-foreground">
                                            Hasil Ukur {namaTampil(spek)}
                                        </span>
                                        <p className="mt-1 text-base font-extrabold text-primary">
                                            {satuan(terpilih.nilai, spek.unit)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Indeks {kodeIndeks(spek)} · Standar
                                            WHO
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                                        <span className="text-xs font-bold text-muted-foreground">
                                            Nilai Z-Score &amp; Status
                                        </span>
                                        <p
                                            className={`mt-1 text-base font-extrabold ${WARNA_NADA[nadaKategori(terpilih.kategori)]}`}
                                        >
                                            {terpilih.z === null
                                                ? KOSONG
                                                : `${zScore(terpilih.z)} SD`}
                                        </p>
                                        <p
                                            className={`text-xs font-bold ${WARNA_NADA[nadaKategori(terpilih.kategori)]}`}
                                        >
                                            {kategoriTeks(spek, terpilih)}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
                                        <span className="text-xs font-bold text-muted-foreground">
                                            Dibanding 2 Bulan Lalu
                                        </span>
                                        <p className="mt-1 text-base font-extrabold text-foreground">
                                            {duaBulanLalu === undefined
                                                ? 'Tidak dapat dihitung'
                                                : `${terpilih.nilai - duaBulanLalu.nilai >= 0 ? '+' : ''}${satuan(terpilih.nilai - duaBulanLalu.nilai, spek.unit)}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {duaBulanLalu === undefined
                                                ? `Belum ada data umur ${terpilih.umur - 2} bln`
                                                : `Umur ${duaBulanLalu.umur} bln: ${satuan(duaBulanLalu.nilai, spek.unit)}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                </>
            )}
        </div>
    );
}
