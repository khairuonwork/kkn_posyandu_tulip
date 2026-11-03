import { FileText, RefreshCw } from 'lucide-react';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';
import { tanggalPanjang } from '@/lib/format';
import { useLaporanTumbuhKembang } from '@/lib/laporan-tumbuh-kembang';
import { Link } from '@/lib/nav';
import type { Periode } from '@/types/posyandu';

export default function TabTumbuhKembang({
    periode,
    modeLive,
    onSesiBerakhir,
}: {
    periode: Periode;
    modeLive: boolean;
    onSesiBerakhir?: () => void;
}) {
    const laporan = useLaporanTumbuhKembang(
        periode.id,
        modeLive,
        onSesiBerakhir,
    );

    return (
        <Halaman
            ikon={FileText}
            judul="Laporan Bulanan Tumbuh Kembang"
            subjudul={periode.label}
            penuh="lg"
            aksi={
                <button
                    type="button"
                    className="tombol-kedua"
                    onClick={laporan.muatUlang}
                >
                    <RefreshCw className="size-4" aria-hidden="true" /> Perbarui
                    data
                </button>
            }
        >
            <nav
                aria-label="Jenis laporan"
                className="mb-5 flex flex-wrap gap-2"
            >
                <Link className="tab" href="/laporan">
                    Rekap Z-score Bulanan
                </Link>
                <Link className="tab" href="/laporan?tab=2t">
                    Riwayat 1T &amp; 2T+
                </Link>
                <Link
                    className="tab bg-primary text-primary-foreground"
                    href="/laporan?tab=tumbuh-kembang"
                    aria-current="page"
                >
                    Tumbuh Kembang
                </Link>
            </nav>
            <p className="mb-5 text-sm text-muted-foreground">
                Semua survei perkembangan pada {periode.label} yang memiliki
                jawaban “Tidak”, termasuk catatan yang belum selesai dibahas.
                Usia mengikuti saat survei dicatat.
            </p>
            {laporan.status !== 'siap' ? (
                <StateHalaman
                    jenis={laporan.status === 'galat' ? 'galat' : 'memuat'}
                    judul={
                        laporan.status === 'galat'
                            ? 'Laporan tumbuh kembang belum dapat dimuat'
                            : 'Memuat laporan tumbuh kembang…'
                    }
                    pesan={laporan.pesanGalat ?? undefined}
                >
                    {laporan.status === 'galat' && (
                        <button
                            type="button"
                            className="tombol-utama"
                            onClick={laporan.muatUlang}
                        >
                            Coba lagi
                        </button>
                    )}
                </StateHalaman>
            ) : laporan.data?.balita.length === 0 ? (
                <p
                    role="status"
                    className="rounded-xl border border-border bg-card p-6"
                >
                    Tidak ada balita dengan jawaban ‘Tidak’ pada survei tumbuh
                    kembang bulan ini.
                </p>
            ) : (
                <div className="space-y-5">
                    {laporan.data?.balita.map((anak) => (
                        <section
                            key={anak.anakId}
                            aria-labelledby={`survei-anak-${anak.anakId}`}
                            className="overflow-hidden rounded-xl border border-border bg-card"
                        >
                            <h2
                                id={`survei-anak-${anak.anakId}`}
                                className="border-b border-border bg-surface-subtle px-5 py-4 text-lg font-bold break-words"
                            >
                                <Link
                                    href={`/balita/${anak.anakId}`}
                                    className="text-primary underline underline-offset-4"
                                >
                                    {anak.nama}
                                </Link>
                            </h2>
                            <div className="divide-y divide-border">
                                {anak.survei.map((survei) => (
                                    <article
                                        key={survei.surveiId}
                                        className="p-5"
                                    >
                                        <h3 className="font-bold">
                                            {tanggalPanjang(survei.tanggal)}
                                        </h3>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Usia saat survei: {survei.umurBulan}{' '}
                                            bulan · Kelompok{' '}
                                            {survei.kelompokLabel}
                                        </p>
                                        <ul className="mt-3 list-disc space-y-2 pl-5">
                                            {survei.kemampuan.map((k) => (
                                                <li
                                                    key={k.pertanyaanId}
                                                    className="break-words"
                                                >
                                                    {k.keterangan}
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </Halaman>
    );
}
