/**
 * Kartu balita — satu desain untuk tampilan di layar dan lembar cetak.
 *
 * Dipakai dialog Cetak kartu di Detail Balita dan panel Tampilan kartu di
 * Kartu Balita, jadi yang dilihat petugas sebelum mencetak sama persis dengan
 * yang keluar dari printer. Ukurannya ditulis dalam px pada skala 428 × 270
 * (5 px per mm); layar dan kertas menyesuaikannya lewat `zoom`.
 *
 * QR-nya contoh, bukan kode yang bisa dipindai: pembuat QR sungguhan butuh
 * pustaka, dan kodenya sendiri sudah tercetak sebagai teks di kaki kartu.
 */

import { createPortal } from 'react-dom';
import { KOSONG, nik, tanggalRingkas } from '@/lib/format';

export type DataKartu = {
    nama: string | null;
    tglLahir: string | null;
    rt: string | null;
    namaIbu: string | null;
    nik: string | null;
    kode: string;
};

/** 85,6 mm pada 96 dpi dibagi lebar desain 428 px. */
const ZOOM_CETAK = (85.6 * 96) / 25.4 / 428;

type Props = {
    kartu: DataKartu;
    /** Mis. "Posyandu Tulip · RW 18 Citeureup". */
    lembaga: string;
    /** Perbesaran di layar; 1 berarti 428 × 270 px. */
    skala?: number;
};

export default function KartuBalita({ kartu, lembaga, skala = 1 }: Props) {
    return (
        <div
            role="img"
            aria-label={`Tampilan kartu balita ${kartu.nama ?? ''}, kode ${kartu.kode}`}
            style={{ zoom: skala }}
            className="flex h-[270px] w-[428px] shrink-0 flex-col overflow-hidden rounded-[16px] border border-dashed border-border-strong bg-card leading-snug text-foreground shadow-[0_2px_8px_rgba(22,33,28,0.08)]"
        >
            <div className="flex h-11 shrink-0 items-center justify-between gap-3 bg-primary px-[18px] text-primary-foreground">
                <span className="text-[13px] font-extrabold tracking-[0.08em]">
                    KARTU BALITA
                </span>
                <span className="truncate text-[12px] font-semibold">
                    {lembaga}
                </span>
            </div>

            <div className="flex min-h-0 flex-1 items-center gap-4 px-[18px]">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[24px] leading-tight font-extrabold">
                        {kartu.nama ?? KOSONG}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5">
                        <Isi label="Tanggal lahir">
                            {tanggalRingkas(kartu.tglLahir)}
                        </Isi>
                        <Isi label="RT">
                            {kartu.rt === null
                                ? KOSONG
                                : kartu.rt.padStart(2, '0')}
                        </Isi>
                        <Isi label="Nama ibu" lebar>
                            {kartu.namaIbu ?? KOSONG}
                        </Isi>
                    </dl>
                </div>
                <QrContoh kode={kartu.kode} className="size-[120px] shrink-0" />
            </div>

            <div className="mx-[18px] flex h-11 shrink-0 items-center justify-between gap-3 border-t border-border">
                <span className="text-[13px] font-semibold text-muted-foreground">
                    NIK {nik(kartu.nik)}
                </span>
                <span className="text-[16px] font-extrabold tracking-[0.02em] text-primary">
                    {kartu.kode}
                </span>
            </div>
        </div>
    );
}

function Isi({
    label,
    lebar = false,
    children,
}: {
    label: string;
    lebar?: boolean;
    children: string;
}) {
    return (
        <div className={lebar ? 'col-span-2 min-w-0' : 'min-w-0'}>
            <dt className="text-[12px] font-semibold text-muted-foreground">
                {label}
            </dt>
            <dd className="mt-0.5 truncate text-[16px] font-bold">
                {children}
            </dd>
        </div>
    );
}

/**
 * Pola QR contoh 25 × 25: tiga penanda sudut, isinya dari kode kartu, jadi
 * tiap kartu tampak berbeda.
 */
export function QrContoh({
    kode,
    className,
}: {
    kode: string;
    className?: string;
}) {
    const n = 25;
    const hitam = (r: number, c: number) => {
        for (const [y, x] of [
            [0, 0],
            [0, n - 7],
            [n - 7, 0],
        ]) {
            if (r >= y - 1 && r <= y + 7 && c >= x - 1 && c <= x + 7) {
                const a = r - y;
                const b = c - x;

                return (
                    a >= 0 &&
                    a <= 6 &&
                    b >= 0 &&
                    b <= 6 &&
                    (a === 0 ||
                        a === 6 ||
                        b === 0 ||
                        b === 6 ||
                        (a >= 2 && a <= 4 && b >= 2 && b <= 4))
                );
            }
        }

        const i = r * n + c;

        return (i * 17 + kode.charCodeAt(i % kode.length) * 7 + r * 13) % 9 < 4;
    };
    let d = '';

    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (hitam(r, c)) {
                d += `M${c} ${r}h1v1h-1z`;
            }
        }
    }

    return (
        <svg
            viewBox={`0 0 ${n} ${n}`}
            shapeRendering="crispEdges"
            aria-hidden="true"
            className={className}
        >
            <rect width={n} height={n} fill="#ffffff" />
            <path d={d} fill="#16211c" />
        </svg>
    );
}

/**
 * Lembar A4 untuk dicetak: dua kolom × empat baris kartu berukuran asli.
 *
 * Dipasang di `body` dan tersembunyi di layar; saat mencetak, justru hanya
 * lembar ini yang tampil (aturan `.lembar-cetak` di app.css).
 */
export function LembarCetak({
    kartu,
    lembaga,
}: {
    kartu: DataKartu[];
    lembaga: string;
}) {
    const lembar = Array.from({ length: Math.ceil(kartu.length / 8) }, (_, i) =>
        kartu.slice(i * 8, i * 8 + 8),
    );

    return createPortal(
        <div className="lembar-cetak" aria-hidden="true">
            {lembar.map((isi, i) => (
                <section key={i} className="halaman-a4">
                    {isi.map((k) => (
                        <KartuBalita
                            key={k.kode}
                            kartu={k}
                            lembaga={lembaga}
                            skala={ZOOM_CETAK}
                        />
                    ))}
                </section>
            ))}
        </div>,
        document.body,
    );
}
