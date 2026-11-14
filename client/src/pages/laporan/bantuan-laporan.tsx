import { AlertTriangle, BookOpen } from 'lucide-react';
import BantuanDetail from '@/components/bantuan-detail';
import type { Periode } from '@/types/posyandu';
import type { TabRekap } from './tipe';
export default function BantuanLaporan({
    tab,
    bantuanTerbuka,
    onTutup,
    periode,
}: {
    tab: TabRekap;
    bantuanTerbuka: boolean;
    onTutup: () => void;
    periode: Periode;
}) {
    return (
        <BantuanDetail
            bagian={tab === 'zscore' ? 'laporan-zscore' : 'laporan-2t'}
            sop="admin"
            terbuka={bantuanTerbuka}
            onTutup={onTutup}
        >
            {tab === 'zscore' ? (
                <>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-5 text-sky-950 shadow-sm sm:p-6">
                        <div className="flex items-start gap-3.5">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                                <BookOpen
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-extrabold text-sky-950 sm:text-lg">
                                        Panduan Ibu Kader: Cara Membaca &
                                        Menggunakan Laporan F1 Z-Score
                                    </h3>
                                    <span className="rounded-full bg-sky-200/80 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                                        Pelaporan Puskesmas
                                    </span>
                                </div>
                                <p className="mt-1 text-sm leading-relaxed text-sky-800">
                                    Laporan ini menghitung z-score klinis setiap
                                    balita berdasarkan hasil ukur berat dan
                                    tinggi badan bulan {periode.label}:
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-xs">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-sky-100 text-xs font-extrabold text-sky-800">
                                                1
                                            </span>
                                            <h4 className="text-xs font-extrabold tracking-wider text-sky-950 uppercase">
                                                Pilih Indeks Ukur
                                            </h4>
                                        </div>
                                        <p className="text-xs leading-normal text-sky-700">
                                            Ganti indeks antara{' '}
                                            <strong>BB/U</strong> (Gizi),{' '}
                                            <strong>TB/U</strong> (Stunting),
                                            atau <strong>BB/TB</strong>{' '}
                                            (Wasting) melalui dropdown indeks di
                                            bawah.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-xs">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-sky-100 text-xs font-extrabold text-sky-800">
                                                2
                                            </span>
                                            <h4 className="text-xs font-extrabold tracking-wider text-sky-950 uppercase">
                                                Cek Status & Z-Score
                                            </h4>
                                        </div>
                                        <p className="text-xs leading-normal text-sky-700">
                                            Lihat kolom kesimpulan status gizi
                                            berwarna. Skor Z di bawah -2 SD
                                            otomatis ditandai untuk rujukan
                                            gizi.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-xs">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-sky-100 text-xs font-extrabold text-sky-800">
                                                3
                                            </span>
                                            <h4 className="text-xs font-extrabold tracking-wider text-sky-950 uppercase">
                                                Unduh Format F1
                                            </h4>
                                        </div>
                                        <p className="text-xs leading-normal text-sky-700">
                                            Klik tombol hijau{' '}
                                            <em>Unduh F1 Excel</em> untuk
                                            mengunduh rekap format resmi
                                            pelaporan bulanan ke Bidan Desa.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/85 p-5 text-amber-950 shadow-sm sm:p-6">
                        <div className="flex items-start gap-3.5">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
                                <AlertTriangle
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-extrabold text-amber-950 sm:text-lg">
                                        Panduan Ibu Kader: Alur Deteksi Dini &
                                        Rujukan Balita Tidak Naik (1T & 2T+)
                                    </h3>
                                    <span className="rounded-full border border-rose-300 bg-rose-200/90 px-2.5 py-0.5 text-xs font-extrabold text-rose-900">
                                        Wajib Rujukan Medis
                                    </span>
                                </div>
                                <p className="mt-1 text-sm leading-relaxed text-amber-900">
                                    Daftar balita yang berat badannya tidak naik
                                    atau kenaikannya di bawah KBM (Kenaikan
                                    Berat Minimal) bulan {periode.label}:
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-xl border border-amber-200/80 bg-white/95 p-3.5 shadow-xs">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-100 text-xs font-extrabold text-amber-800">
                                                1
                                            </span>
                                            <h4 className="text-xs font-extrabold tracking-wider text-amber-950 uppercase">
                                                Kenali Simbol N vs T
                                            </h4>
                                        </div>
                                        <p className="text-xs leading-normal text-amber-900">
                                            <strong>N (Naik)</strong> jika
                                            kenaikan BB ≥ KBM.{' '}
                                            <strong>T (Tidak Naik)</strong> jika
                                            BB tetap, turun, atau kenaikan di
                                            bawah KBM target umur.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-rose-200 bg-white/95 p-3.5 shadow-xs">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-rose-100 text-xs font-extrabold text-rose-800">
                                                2
                                            </span>
                                            <h4 className="text-xs font-extrabold tracking-wider text-rose-950 uppercase">
                                                Bahaya 2T+ (Kritis)
                                            </h4>
                                        </div>
                                        <p className="text-xs leading-normal text-rose-900">
                                            Balita <strong>2T / 2T+</strong> (2
                                            kali berturut-turut T) berada pada
                                            fase gagal tumbuh (
                                            <em>growth faltering</em>) yang
                                            memicu stunting akut jika terlambat
                                            ditangani.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-amber-200/80 bg-white/95 p-3.5 shadow-xs">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-100 text-xs font-extrabold text-amber-800">
                                                3
                                            </span>
                                            <h4 className="text-xs font-extrabold tracking-wider text-amber-950 uppercase">
                                                Alur Rujukan Meja 4 & Nakes
                                            </h4>
                                        </div>
                                        <p className="text-xs leading-normal text-amber-900">
                                            Arahkan orang tua ke{' '}
                                            <strong>
                                                Meja 4 (Konseling KMS)
                                            </strong>{' '}
                                            untuk pemeriksaan penyebab, edukasi
                                            PMT, dan rujukan prioritas ke Bidan
                                            Desa atau Puskesmas.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </BantuanDetail>
    );
}
