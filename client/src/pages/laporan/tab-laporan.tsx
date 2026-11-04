import { useLayoutEffect, useRef } from 'react';
import { Link } from '@/lib/nav';

type Jenis = 'zscore' | '2t' | 'tumbuh-kembang';
const jenis: Jenis[] = ['zscore', '2t', 'tumbuh-kembang'];
let sebelumnya: Jenis | null = null;

export default function TabLaporan({
    aktif,
    totalT,
}: {
    aktif: Jenis;
    totalT?: number;
}) {
    const bilah = useRef<HTMLDivElement>(null);
    const penanda = useRef<HTMLSpanElement>(null);

    useLayoutEffect(() => {
        const bar = bilah.current;
        const marker = penanda.current;

        if (!bar || !marker) {
            return;
        }

        const pindah = (nilai: Jenis) => {
            const tombol = bar.querySelector<HTMLElement>(
                `[data-jenis="${nilai}"]`,
            );

            if (!tombol) {
                return;
            }

            marker.style.width = `${tombol.offsetWidth}px`;
            marker.style.transform = `translate(${tombol.offsetLeft}px, ${tombol.offsetTop}px)`;
            marker.style.height = `${tombol.offsetHeight}px`;
        };
        marker.style.transition = 'none';
        pindah(sebelumnya ?? aktif);
        marker.getBoundingClientRect();
        marker.style.transition = '';
        pindah(aktif);
        sebelumnya = aktif;
        const observer = new ResizeObserver(() => pindah(aktif));
        observer.observe(bar);

        return () => observer.disconnect();
    }, [aktif]);

    const awal = useRef<{ x: number; y: number } | null>(null);

    return (
        <div
            ref={bilah}
            className="bilah-tab laporan-tab"
            aria-label="Jenis laporan"
            onTouchStart={(e) => {
                awal.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                };
            }}
            onTouchEnd={(e) => {
                if (!awal.current) {
                    return;
                }

                const dx = e.changedTouches[0].clientX - awal.current.x;
                const dy = e.changedTouches[0].clientY - awal.current.y;
                awal.current = null;

                if (Math.abs(dx) < 70 || Math.abs(dx) <= Math.abs(dy)) {
                    return;
                }

                const next =
                    jenis[
                        Math.max(
                            0,
                            Math.min(
                                2,
                                jenis.indexOf(aktif) + (dx < 0 ? 1 : -1),
                            ),
                        )
                    ];

                if (next !== aktif) {
                    window.location.hash =
                        next === 'zscore' ? '/laporan' : `/laporan?tab=${next}`;
                }
            }}
        >
            <span
                ref={penanda}
                className="laporan-tab-penanda"
                aria-hidden="true"
            />
            {jenis.map((item) => (
                <Link
                    key={item}
                    data-jenis={item}
                    href={
                        item === 'zscore' ? '/laporan' : `/laporan?tab=${item}`
                    }
                    aria-current={aktif === item ? 'page' : undefined}
                    className="tab laporan-tab-item"
                >
                    {item === 'zscore'
                        ? 'Rekap Z-score Bulanan'
                        : item === '2t'
                          ? `Riwayat 1T & 2T+${totalT === undefined ? '' : ` (${totalT})`}`
                          : 'Tumbuh Kembang'}
                </Link>
            ))}
        </div>
    );
}
