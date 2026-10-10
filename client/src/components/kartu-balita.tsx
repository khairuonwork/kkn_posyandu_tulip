/**
 * Kartu balita — satu desain untuk tampilan di layar dan lembar cetak.
 *
 * Dipakai dialog Cetak kartu di Detail Balita dan panel Tampilan kartu di
 * Kartu Balita, jadi yang dilihat petugas sebelum mencetak sama persis dengan
 * yang keluar dari printer. Ukurannya ditulis dalam px pada skala 428 × 270
 * (5 px per mm); layar dan kertas menyesuaikannya lewat `zoom`.
 *
 * QR-nya berisi payload kartu dari `lib/kartu-sasaran.ts`, format yang sama
 * dengan pemindai Android v1.6. Kodenya juga tercetak sebagai teks di kaki
 * kartu, untuk diketik bila kamera tidak tersedia.
 */

import { QRCodeSVG } from 'qrcode.react';
import { createPortal } from 'react-dom';
import { KOSONG, nik, tanggalRingkas } from '@/lib/format';
import { payloadKartuSasaran } from '@/lib/kartu-sasaran';

export type DataKartu = {
    nama: string | null;
    tglLahir: string | null;
    rt: string | null;
    namaIbu: string | null;
    nik: string | null;
    id: number;
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
            className="flex h-[270px] w-[428px] shrink-0 flex-col overflow-hidden rounded-[16px] border border-dashed border-border-strong bg-card leading-snug text-foreground shadow-[0_2px_8px_rgba(22,33,28,0.08)] print:shadow-none"
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
                {/* Dua modul tepi putih; sisanya dari latar kartu. */}
                <QRCodeSVG
                    value={payloadKartuSasaran(kartu)}
                    level="M"
                    marginSize={2}
                    aria-hidden="true"
                    className="size-[120px] shrink-0"
                />
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
