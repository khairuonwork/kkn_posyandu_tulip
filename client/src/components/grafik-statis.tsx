/**
 * Satu grafik pertumbuhan tanpa interaksi, untuk Lembar Hasil dan PDF-nya.
 *
 * Gambarnya sama dengan `grafik-pertumbuhan.tsx` (pita WHO, garis SD, satu
 * garis balita), tetapi tanpa tombol, hover, dan kartu rincian, serta dengan
 * ukuran yang bisa diatur: dua kolom di A4 tidak boleh memakai kanvas 960 px.
 * Warna, jenis grafik, dan penyusunan titiknya diambil dari berkas itu.
 */

import { angka, zScore } from '@/lib/format';
import { nilaiPadaZ } from '@/lib/z-score';
import type { TabelLms } from '@/lib/z-score';
import type { JenisKelamin, Pengukuran } from '@/types/posyandu';
import {
    GARIS_MERAH,
    PANEL_BULAN,
    PITA_HIJAU_MUDA,
    PITA_HIJAU_TUA,
    PITA_KUNING,
    SPEK,
    susunTitik,
    TEKS_SEKUNDER,
    TINTA,
} from './grafik-pertumbuhan';
import type { JenisGrafik, Titik } from './grafik-pertumbuhan';

type Props = {
    indeks: JenisGrafik;
    kelamin: JenisKelamin;
    pengukuran: Pengukuran[];
    tabel: TabelLms;
    /** Umur awal rentang 12 bulan: 0, 12, 24, 36, atau 48. */
    panel: number;
    lebar: number;
    tinggi: number;
    /** Ukuran huruf angka sumbu; judul sumbu satu tingkat di atasnya. */
    teks?: number;
    /** Tulis z-score di atas tiap titik. */
    labelZ?: boolean;
    /** Panjang badan di bawah 24 bulan; hanya mengubah judul sumbu. */
    berbaring?: boolean;
};

export default function GrafikStatis({
    indeks,
    kelamin,
    pengukuran,
    tabel,
    panel,
    lebar,
    tinggi,
    teks = 12,
    labelZ = false,
    berbaring = false,
}: Props) {
    const spek = SPEK.find((s) => s.indeks === indeks) ?? SPEK[0];
    const baris = tabel.get(`${indeks}|${kelamin}`) ?? [];
    const lms = new Map(baris.map((b) => [b.kunci, b]));
    const kiri = Math.round(teks * 3.2);
    const kanan = Math.round(teks * 2.6);
    const atas = teks + 4;
    const bawah = Math.round(teks * 4);
    const plotLebar = lebar - kiri - kanan;
    const plotTinggi = tinggi - atas - bawah;

    const bulan = Array.from({ length: PANEL_BULAN + 1 }, (_, i) => panel + i);
    const hidup = bulan.filter((u) => u >= spek.mulai && lms.has(u));
    const titik = susunTitik(pengukuran, spek).filter(
        (t) => t.umur >= panel && t.umur <= panel + PANEL_BULAN,
    );

    const batas = [
        ...hidup.flatMap((u) => {
            const b = lms.get(u);

            return b === undefined ? [] : [nilaiPadaZ(b, -3), nilaiPadaZ(b, 3)];
        }),
        ...titik.map((t) => t.nilai),
    ];
    const rendah =
        Math.floor(Math.min(...batas, Infinity) / spek.langkah) * spek.langkah;
    const tertinggi =
        Math.ceil(Math.max(...batas, -Infinity) / spek.langkah) * spek.langkah;
    const rentang = tertinggi > rendah ? tertinggi - rendah : 1;

    const x = (umur: number) =>
        kiri + ((umur - panel) / PANEL_BULAN) * plotLebar;
    const y = (nilai: number) =>
        atas + ((tertinggi - nilai) / rentang) * plotTinggi;
    const garisKe = (t: [number, number][]) =>
        t.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
    const sd = (z: number): [number, number][] =>
        hidup.flatMap((u) => {
            const b = lms.get(u);

            return b === undefined
                ? []
                : [[x(u), y(nilaiPadaZ(b, z))] as [number, number]];
        });
    const pita = (bawahZ: number, atasZ: number, warna: string) => {
        const a = sd(atasZ);
        const b = sd(bawahZ);

        return a.length === 0 || b.length === 0 ? null : (
            <polygon
                key={`${bawahZ}-${atasZ}`}
                points={garisKe([...a, ...b.slice().reverse()])}
                fill={warna}
                opacity={0.5}
            />
        );
    };

    const garis: number[] = [];

    for (let v = rendah; v <= tertinggi + 1e-9; v += spek.langkah) {
        garis.push(v);
    }

    // Pada balita besar rentangnya lebar (BB 10–30 kg): angka dijarangkan
    // supaya tidak bertumpuk, garisnya tetap tiap langkah.
    const lompat = Math.max(
        1,
        Math.ceil(
            garis.length / Math.max(1, Math.floor(plotTinggi / (teks * 1.9))),
        ),
    );
    const segmen: Titik[][] = [];

    for (const t of titik) {
        const akhir = segmen[segmen.length - 1];

        if (akhir === undefined || t.umur - akhir[akhir.length - 1].umur > 1) {
            segmen.push([t]);
        } else {
            akhir.push(t);
        }
    }

    const sumbu =
        spek.indeks === 'TB_U' && berbaring ? 'Panjang badan, cm' : spek.sumbu;
    const sebelumLILA = indeks === 'LILA_U' && panel < spek.mulai;
    const judul =
        spek.indeks === 'TB_U' && berbaring ? 'Panjang badan' : spek.judul;

    return (
        <svg
            viewBox={`0 0 ${lebar} ${tinggi}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Grafik ${judul.toLowerCase()}, rentang ${panel} sampai ${panel + PANEL_BULAN} bulan`}
        >
            {pita(-3, -2, PITA_KUNING)}
            {pita(2, 3, PITA_KUNING)}
            {pita(-2, -1, PITA_HIJAU_MUDA)}
            {pita(1, 2, PITA_HIJAU_MUDA)}
            {pita(-1, 1, PITA_HIJAU_TUA)}

            {sebelumLILA && (
                <rect
                    x={x(panel)}
                    y={atas}
                    width={x(spek.mulai) - x(panel)}
                    height={plotTinggi}
                    fill="#E4E7E2"
                />
            )}

            {garis.map((v) => (
                <line
                    key={`h${v}`}
                    x1={kiri}
                    x2={kiri + plotLebar}
                    y1={y(v)}
                    y2={y(v)}
                    stroke={TINTA}
                    strokeWidth={0.6}
                    opacity={0.35}
                />
            ))}
            {bulan.map((u) => (
                <line
                    key={`b${u}`}
                    x1={x(u)}
                    x2={x(u)}
                    y1={atas}
                    y2={atas + plotTinggi}
                    stroke={TINTA}
                    strokeWidth={1.3}
                    opacity={0.8}
                />
            ))}
            {[-3, -2, -1, 0, 1, 2, 3].map((z) => (
                <polyline
                    key={`sd${z}`}
                    points={garisKe(sd(z))}
                    fill="none"
                    stroke={z === -3 ? GARIS_MERAH : TINTA}
                    strokeWidth={z === -3 ? 2 : z === 0 ? 1.4 : 0.9}
                />
            ))}

            {garis.map((v, i) =>
                i % lompat !== 0 ? null : (
                    <g key={`l${v}`}>
                        <text
                            x={kiri - 6}
                            y={y(v) + teks / 3}
                            textAnchor="end"
                            fontSize={teks}
                            fontWeight={600}
                            fill={TEKS_SEKUNDER}
                        >
                            {angka(v, 0)}
                        </text>
                        <text
                            x={kiri + plotLebar + 6}
                            y={y(v) + teks / 3}
                            fontSize={teks}
                            fontWeight={600}
                            fill={TEKS_SEKUNDER}
                        >
                            {angka(v, 0)}
                        </text>
                    </g>
                ),
            )}
            {bulan.map((u) => (
                <text
                    key={`t${u}`}
                    x={x(u)}
                    y={atas + plotTinggi + teks + 5}
                    textAnchor="middle"
                    fontSize={teks}
                    fontWeight={600}
                    fill={TEKS_SEKUNDER}
                >
                    {u}
                </text>
            ))}
            <text
                x={kiri + plotLebar / 2}
                y={tinggi - 5}
                textAnchor="middle"
                fontSize={teks + 1}
                fontWeight={700}
                fill={TINTA}
            >
                Umur, bulan
            </text>
            <text
                x={-(atas + plotTinggi / 2)}
                y={teks + 1}
                transform="rotate(-90)"
                textAnchor="middle"
                fontSize={teks + 1}
                fontWeight={700}
                fill={TINTA}
            >
                {sumbu}
            </text>

            {segmen.map((bagian) => (
                <g key={`s${bagian[0].umur}`}>
                    <polyline
                        points={garisKe(
                            bagian.map((t) => [x(t.umur), y(t.nilai)]),
                        )}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth={6.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <polyline
                        points={garisKe(
                            bagian.map((t) => [x(t.umur), y(t.nilai)]),
                        )}
                        fill="none"
                        stroke={TINTA}
                        strokeWidth={2.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </g>
            ))}
            {titik.map((t, i) => {
                const akhir = i === titik.length - 1;

                return (
                    <g key={`${t.umur}|${t.tanggal}|${i}`}>
                        {labelZ && t.z !== null && (
                            <text
                                x={x(t.umur)}
                                y={Math.max(atas + teks + 2, y(t.nilai) - 11)}
                                textAnchor="middle"
                                fontSize={teks}
                                fontWeight={700}
                                fill={TINTA}
                                stroke="#FFFFFF"
                                strokeWidth={3.5}
                                strokeLinejoin="round"
                                paintOrder="stroke"
                            >
                                {zScore(t.z)}
                            </text>
                        )}
                        <circle
                            cx={x(t.umur)}
                            cy={y(t.nilai)}
                            r={akhir ? 6 : 4.5}
                            fill={akhir ? TINTA : '#FFFFFF'}
                            stroke={akhir ? '#FFFFFF' : TINTA}
                            strokeWidth={2.5}
                        />
                    </g>
                );
            })}
        </svg>
    );
}
