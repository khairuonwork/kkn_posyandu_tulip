import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { warnaGarisSd } from '@/lib/grafik-acuan';

type Garis = { z: number; titik: [number, number][] };

export default function GrafikDenganAcuan({
    children,
    garis,
    tinggi,
    label,
    revisi,
}: {
    children: ReactNode;
    garis: Garis[];
    tinggi: number;
    label: string;
    revisi: string;
}) {
    const wadah = useRef<HTMLDivElement>(null);
    const [posisi, setPosisi] = useState({ x: 0, tinggi: 0 });

    useLayoutEffect(() => {
        const area = wadah.current;
        const svg = area?.querySelector('svg');
        if (!area || !svg) return;

        const ukur = () => {
            const batas = area.getBoundingClientRect();
            const gambar = svg.getBoundingClientRect();
            if (gambar.width === 0) return;
            const x = ((batas.right - gambar.left) / gambar.width) * svg.viewBox.baseVal.width;
            setPosisi((lama) => lama.x === x && lama.tinggi === gambar.height
                ? lama : { x, tinggi: gambar.height });
        };
        const pengamat = new ResizeObserver(ukur);
        pengamat.observe(area);
        pengamat.observe(svg);
        area.addEventListener('scroll', ukur, { passive: true });
        ukur();
        return () => {
            pengamat.disconnect();
            area.removeEventListener('scroll', ukur);
        };
    }, [revisi]);

    return (
        <div className="flex min-w-0 items-start">
            <div ref={wadah} className="min-w-0 flex-1 overflow-x-auto" tabIndex={0} role="region" aria-label={label}>
                {children}
            </div>
            <svg aria-hidden="true" className="w-[76px] shrink-0 bg-white" style={{ height: posisi.tinggi }} viewBox={`0 0 76 ${tinggi}`} preserveAspectRatio="none">
                {garis.map(({ z, titik }) => {
                    const akhir = titik.at(-1);
                    if (!akhir || !Number.isFinite(posisi.x) || posisi.x < titik[0][0]) return null;
                    const x = Math.min(posisi.x, akhir[0]);
                    const kanan = titik.findIndex((t) => t[0] >= x);
                    const a = titik[Math.max(0, kanan - 1)];
                    const b = titik[kanan];
                    const y = a[0] === b[0] ? a[1] : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
                    return <text key={z} x={4} y={y + 4} fontSize={12} fontWeight={700} fill={warnaGarisSd(z)} stroke="white" strokeWidth={3} paintOrder="stroke">{z === 0 ? 'Median' : `${z > 0 ? '+' : '−'}${Math.abs(z)} SD`}</text>;
                })}
            </svg>
        </div>
    );
}
