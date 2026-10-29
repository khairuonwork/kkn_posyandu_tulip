import { useId, useMemo, useState } from 'react';
import { nadaKategori } from '@/components/status-gizi-badge';
import { angka, satuan, tanggalRingkas, zScore } from '@/lib/format';
import { periodeGrafikBersambung, warnaGarisSd } from '@/lib/grafik-acuan';
import { labelKategoriGizi } from '@/lib/kategori';
import { nilaiPadaZ, susunTabel } from '@/lib/z-score';
import type { BarisLms } from '@/lib/z-score';
import type { JenisKelamin, Pengukuran } from '@/types/posyandu';

export default function GrafikBeratTinggi({
    kelamin,
    umurBalita,
    pengukuran,
    standar,
}: {
    kelamin: JenisKelamin;
    umurBalita: number | null;
    pengukuran: Pengukuran[];
    standar: BarisLms[];
}) {
    const [jenis, setJenis] = useState<'PB' | 'TB'>(
        (umurBalita ?? 0) < 24 ? 'PB' : 'TB',
    );
    const [pilih, setPilih] = useState<string | null>(null);
    const [sorot, setSorot] = useState<string | null>(null);
    const clipId = useId();
    const tabel = useMemo(() => susunTabel(standar), [standar]);
    const bawahX = jenis === 'PB' ? 45 : 65;
    const atasX = jenis === 'PB' ? 110 : 120;
    const acuan = (tabel.get(`BB_TB|${kelamin}`) ?? []).filter(
        (b) => b.kunci >= bawahX && b.kunci <= atasX,
    );
    const titik = pengukuran
        .filter(
            (p) =>
                p.statusKehadiran === 'hadir' &&
                p.umurBulan !== null &&
                p.umurBulan >= 0 &&
                p.umurBulan <= 60 &&
                (jenis === 'PB' ? p.umurBulan < 24 : p.umurBulan >= 24) &&
                p.tinggiCm !== null &&
                p.tinggiCm >= bawahX &&
                p.tinggiCm <= atasX &&
                p.bbKg !== null &&
                p.bbKg > 0 &&
                p.penilaian.BB_TB?.tidakWajar !== true,
        )
        .sort((a, b) =>
            (a.tanggalUkur ?? '').localeCompare(b.tanggalUkur ?? ''),
        );
    const detail = titik.find(
        (p) => `${p.periodeId}:${p.tanggalUkur}` === (sorot ?? pilih),
    );
    const aktif = detail ?? titik.at(-1);
    const max =
        jenis === 'TB'
            ? 30
            : Math.ceil(
                  Math.max(
                      1,
                      ...acuan.map((b) => nilaiPadaZ(b, 3)),
                      ...titik.map((p) => p.bbKg!),
                  ) / 2,
              ) * 2;
    const min =
        jenis === 'TB'
            ? 6
            : Math.max(
                  0,
                  Math.floor(
                      Math.min(
                          ...acuan.map((b) => nilaiPadaZ(b, -3)),
                          ...titik.map((p) => p.bbKg!),
                          4,
                      ) / 2,
                  ) * 2,
              );
    const x = (v: number) => 62 + ((v - bawahX) / (atasX - bawahX)) * 820;
    const y = (v: number) => 340 - ((v - min) / (max - min || 1)) * 320;
    const sumbuX = Array.from(
        { length: Math.floor((atasX - bawahX) / 5) + 1 },
        (_, i) => bawahX + i * 5,
    );
    const sumbuY = Array.from(
        { length: Math.floor((max - min) / 2) + 1 },
        (_, i) => min + i * 2,
    );
    const kartu =
        detail && detail.bbKg! >= min && detail.bbKg! <= max
            ? {
                  x: x(detail.tinggiCm!),
                  y: y(detail.bbKg!),
                  kiri: Math.max(66, Math.min(x(detail.tinggiCm!) - 150, 578)),
                  atas:
                      y(detail.bbKg!) - 114 >= 24
                          ? y(detail.bbKg!) - 114
                          : y(detail.bbKg!) + 16,
              }
            : null;
    const warnaStatus = {
        merah: 'text-tone-red',
        oranye: 'text-tone-amber',
        hijau: 'text-tone-green',
        biru: 'text-tone-blue',
        netral: 'text-muted-foreground',
    }[nadaKategori(detail?.penilaian.BB_TB?.kategori ?? null)];
    const diLuarRentang = titik.filter((p) => p.bbKg! < min || p.bbKg! > max);
    // Urutan pengukuran dipertahankan; tinggi yang turun tidak boleh mengubah kronologi.
    const segmen: Pengukuran[][] = [];

    for (const p of titik) {
        const akhir = segmen.at(-1);

        if (
            !akhir ||
            !periodeGrafikBersambung(akhir.at(-1)!.periodeId, p.periodeId)
        ) {
            segmen.push([p]);
        } else {
            akhir.push(p);
        }
    }

    return (
        <div className="px-5 py-4 sm:px-6">
            <div
                className="mb-3 flex flex-wrap items-center gap-2"
                role="group"
                aria-label="Acuan panjang atau tinggi badan"
            >
                {(['PB', 'TB'] as const).map((mode) => (
                    <button
                        key={mode}
                        type="button"
                        aria-pressed={jenis === mode}
                        onClick={() => {
                            setJenis(mode);
                            setPilih(null);
                            setSorot(null);
                        }}
                        className={
                            jenis === mode ? 'tombol-utama' : 'tombol-kedua'
                        }
                    >
                        {mode === 'PB'
                            ? 'BB/PB · di bawah 24 bulan'
                            : 'BB/TB · 24–60 bulan'}
                    </button>
                ))}
            </div>
            {acuan.length === 0 ? (
                <p role="status">Acuan BB/{jenis} belum tersedia.</p>
            ) : (
                <div
                    className="overflow-x-auto"
                    tabIndex={0}
                    role="region"
                    aria-label="Grafik berat menurut panjang atau tinggi, dapat digeser mendatar"
                >
                    <svg
                        viewBox="0 0 940 400"
                        className="h-auto w-full min-w-[740px] bg-white"
                        role="img"
                        aria-label={`Grafik BB/${jenis}, berat badan menurut ${jenis === 'PB' ? 'panjang' : 'tinggi'} badan, WHO 2006`}
                    >
                        <defs>
                            <clipPath id={clipId}>
                                <rect x={62} y={20} width={820} height={320} />
                            </clipPath>
                        </defs>
                        {sumbuX.map((v) => (
                            <g key={`x${v}`}>
                                <line
                                    x1={x(v)}
                                    x2={x(v)}
                                    y1={20}
                                    y2={340}
                                    stroke="#D1D6D2"
                                />
                                <text
                                    x={x(v)}
                                    y={360}
                                    textAnchor="middle"
                                    fontSize={12}
                                    fill="#16211C"
                                >
                                    {v}
                                </text>
                            </g>
                        ))}
                        {sumbuY.map((v) => (
                            <g key={`y${v}`}>
                                <line
                                    x1={62}
                                    x2={882}
                                    y1={y(v)}
                                    y2={y(v)}
                                    stroke="#D1D6D2"
                                />
                                <text
                                    x={52}
                                    y={y(v) + 4}
                                    textAnchor="end"
                                    fontSize={12}
                                    fill="#16211C"
                                >
                                    {angka(v, 0)}
                                </text>
                            </g>
                        ))}
                        {[-3, -2, -1, 0, 1, 2, 3].map((z) => (
                            <g key={z}>
                                <polyline
                                    clipPath={`url(#${clipId})`}
                                    points={acuan
                                        .map(
                                            (b) =>
                                                `${x(b.kunci)},${y(nilaiPadaZ(b, z))}`,
                                        )
                                        .join(' ')}
                                    fill="none"
                                    stroke={warnaGarisSd(z)}
                                    strokeWidth={z === 0 ? 2 : 1.5}
                                />
                                <text
                                    x={890}
                                    y={Math.max(
                                        24,
                                        Math.min(
                                            340,
                                            y(nilaiPadaZ(acuan.at(-1)!, z)) + 4,
                                        ),
                                    )}
                                    fontSize={12}
                                    fill={warnaGarisSd(z)}
                                >
                                    {z > 0 ? '+' : ''}
                                    {z} SD
                                </text>
                            </g>
                        ))}
                        {segmen.map((list, i) => (
                            <polyline
                                clipPath={`url(#${clipId})`}
                                key={i}
                                points={list
                                    .map(
                                        (p) =>
                                            `${x(p.tinggiCm!)},${y(p.bbKg!)}`,
                                    )
                                    .join(' ')}
                                fill="none"
                                stroke="#16211C"
                                strokeWidth={2.5}
                                strokeDasharray="5 3"
                            />
                        ))}
                        {titik.map((p) => {
                            const id = `${p.periodeId}:${p.tanggalUkur}`;

                            return (
                                <g key={id}>
                                    <circle
                                        clipPath={`url(#${clipId})`}
                                        cx={x(p.tinggiCm!)}
                                        cy={y(p.bbKg!)}
                                        r={detail === p ? 6 : 5}
                                        fill={
                                            detail === p ? '#16211C' : 'white'
                                        }
                                        stroke="#16211C"
                                        strokeWidth={2}
                                    />
                                    <circle
                                        clipPath={`url(#${clipId})`}
                                        cx={x(p.tinggiCm!)}
                                        cy={y(p.bbKg!)}
                                        r={14}
                                        fill="transparent"
                                        tabIndex={0}
                                        role="button"
                                        aria-pressed={pilih === id}
                                        aria-label={`${tanggalRingkas(p.tanggalUkur)}, ${satuan(p.tinggiCm, 'cm')}, ${satuan(p.bbKg, 'kg')}`}
                                        onClick={() =>
                                            setPilih((lama) =>
                                                lama === id ? null : id,
                                            )
                                        }
                                        onMouseEnter={() => setSorot(id)}
                                        onMouseLeave={() => setSorot(null)}
                                        onFocus={() => setSorot(id)}
                                        onBlur={() => setSorot(null)}
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === 'Enter' ||
                                                e.key === ' '
                                            ) {
                                                e.preventDefault();
                                                setPilih(id);
                                            }

                                            if (e.key === 'Escape') {
                                                setPilih(null);
                                                setSorot(null);
                                            }
                                        }}
                                    />
                                </g>
                            );
                        })}
                        <text
                            x={472}
                            y={390}
                            textAnchor="middle"
                            fontSize={14}
                            fill="#16211C"
                        >
                            {jenis === 'PB' ? 'Panjang' : 'Tinggi'} badan, cm
                        </text>
                        <text
                            transform="translate(18 180) rotate(-90)"
                            textAnchor="middle"
                            fontSize={14}
                            fill="#16211C"
                        >
                            Berat badan, kg
                        </text>
                        {detail && kartu && (
                            <g
                                pointerEvents="none"
                                role="tooltip"
                                aria-label="Detail pengukuran berat dan tinggi"
                            >
                                <line
                                    x1={kartu.x}
                                    x2={kartu.x}
                                    y1={kartu.y}
                                    y2={340}
                                    stroke="#16211C"
                                    strokeDasharray="5 4"
                                />
                                <line
                                    x1={62}
                                    x2={kartu.x}
                                    y1={kartu.y}
                                    y2={kartu.y}
                                    stroke="#16211C"
                                    strokeDasharray="5 4"
                                />
                                <rect
                                    x={kartu.x - 22}
                                    y={344}
                                    width={44}
                                    height={21}
                                    rx={4}
                                    fill="#16211C"
                                />
                                <text
                                    x={kartu.x}
                                    y={359}
                                    textAnchor="middle"
                                    fontSize={12}
                                    fontWeight={700}
                                    fill="white"
                                >
                                    {angka(detail.tinggiCm!, 1)}
                                </text>
                                <rect
                                    x={12}
                                    y={kartu.y - 10}
                                    width={46}
                                    height={21}
                                    rx={4}
                                    fill="#16211C"
                                />
                                <text
                                    x={35}
                                    y={kartu.y + 5}
                                    textAnchor="middle"
                                    fontSize={12}
                                    fontWeight={700}
                                    fill="white"
                                >
                                    {angka(detail.bbKg!, 1)}
                                </text>
                                <rect
                                    x={kartu.kiri}
                                    y={kartu.atas}
                                    width={300}
                                    height={98}
                                    rx={8}
                                    fill="white"
                                    stroke="#16211C"
                                    strokeWidth={1.5}
                                />
                                <text
                                    x={kartu.kiri + 12}
                                    y={kartu.atas + 22}
                                    fontSize={12}
                                    fontWeight={600}
                                    fill="#4A5750"
                                >
                                    {tanggalRingkas(detail.tanggalUkur)} · umur{' '}
                                    {detail.umurBulan} bulan
                                </text>
                                <text
                                    x={kartu.kiri + 12}
                                    y={kartu.atas + 48}
                                    fontSize={14}
                                    fontWeight={800}
                                    fill="#16211C"
                                >
                                    BB {satuan(detail.bbKg, 'kg')} · {jenis}{' '}
                                    {satuan(detail.tinggiCm, 'cm')}
                                </text>
                                <text
                                    x={kartu.kiri + 12}
                                    y={kartu.atas + 76}
                                    fontSize={13}
                                    fontWeight={700}
                                    fill="currentColor"
                                    className={warnaStatus}
                                >
                                    {detail.penilaian.BB_TB
                                        ? `${zScore(detail.penilaian.BB_TB.z)} SD · ${labelKategoriGizi(detail.penilaian.BB_TB.kategori ?? 'Belum dinilai')}`
                                        : 'Belum dinilai'}
                                </text>
                            </g>
                        )}
                    </svg>
                </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
                Hitam ±3 SD · Merah ±2 SD · Jingga ±1 SD · Hijau 0 SD. Garis
                balita putus pada bulan tanpa pengukuran.
            </p>
            {diLuarRentang.length > 0 && (
                <p className="mt-2 text-sm text-tone-amber" role="status">
                    {diLuarRentang.length} pengukuran di luar rentang {min}–
                    {max} kg; rinciannya tetap tersedia pada Riwayat Ukur.
                </p>
            )}
            {aktif ? (
                <p className="mt-3 font-semibold">
                    {tanggalRingkas(aktif.tanggalUkur)} ·{' '}
                    {satuan(aktif.tinggiCm, 'cm')} · {satuan(aktif.bbKg, 'kg')}{' '}
                    ·{' '}
                    {aktif.penilaian.BB_TB
                        ? `${zScore(aktif.penilaian.BB_TB.z)} SD · ${labelKategoriGizi(aktif.penilaian.BB_TB.kategori ?? 'Belum dinilai')}`
                        : 'Belum dinilai'}
                </p>
            ) : (
                <p className="mt-3" role="status">
                    Belum ada pengukuran BB/{jenis} pada rentang ini.
                </p>
            )}
        </div>
    );
}
