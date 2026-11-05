import { persenSaja } from '@/lib/format';
import type { LaporanLive } from '@/lib/laporan';
import type { Periode } from '@/types/posyandu';
import type { TabRekap } from './tipe';
export default function RingkasanLaporan({
    tab,
    data,
    periode,
    totalT,
    jumlahDuaT,
    jumlahSatuT,
}: {
    tab: TabRekap;
    data: LaporanLive | null;
    periode: Periode;
    totalT: number;
    jumlahDuaT: number;
    jumlahSatuT: number;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            {tab === 'zscore' ? (
                <>
                    <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Balita Diukur
                                </p>
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                                    Meja 2–4
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-extrabold text-foreground tabular-nums">
                                {data?.ringkasan.anakDiukur ?? 0}
                            </p>
                        </div>
                        <p className="mt-2 text-xs font-medium text-muted-foreground">
                            Balita hadir dan tercatat pengukurannya di periode{' '}
                            {periode.label}.
                        </p>
                    </article>

                    <article className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                        <div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold tracking-wider text-amber-900 uppercase">
                                    Pemantauan 1T & 2T+
                                </p>
                                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                                    Perlu Perhatian
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-extrabold text-amber-950 tabular-nums">
                                {totalT > 0 ? (
                                    <>
                                        <span>
                                            {jumlahDuaT}{' '}
                                            <span className="text-lg font-bold text-tone-red">
                                                (2T+)
                                            </span>
                                        </span>
                                        {jumlahSatuT > 0 && (
                                            <span className="ml-2 text-lg font-bold text-amber-800">
                                                · {jumlahSatuT} (1T)
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    '0'
                                )}
                            </p>
                        </div>
                        <p className="mt-2 text-xs font-medium text-amber-900">
                            {totalT > 0
                                ? `${totalT} balita tidak naik berat badan bulan ini.`
                                : 'Seluruh balita yang diukur mengalami kenaikan berat badan.'}
                        </p>
                    </article>

                    <article className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm">
                        <div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Standar Antropometri
                                </p>
                                <span className="rounded-full border border-border bg-surface-subtle px-2 py-0.5 text-[10px] font-extrabold text-foreground">
                                    Baku Kemenkes
                                </span>
                            </div>
                            <p className="mt-2 text-lg font-extrabold text-foreground">
                                Permenkes RI No. 2/2020
                            </p>
                        </div>
                        <p className="mt-2 text-xs font-medium text-muted-foreground">
                            Tabel parameter LMS WHO 2006 resmi untuk perhitungan
                            6 indeks z-score.
                        </p>
                    </article>
                </>
            ) : (
                <>
                    <article className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                        <div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold tracking-wider text-amber-900 uppercase">
                                    Total Tidak Naik (T)
                                </p>
                                <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                                    1T & 2T+
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-extrabold text-amber-950 tabular-nums">
                                {totalT}{' '}
                                <span className="text-sm font-semibold text-amber-800">
                                    balita
                                </span>
                            </p>
                        </div>
                        <p className="mt-2 text-xs font-medium text-amber-900">
                            {persenSaja(
                                totalT,
                                data?.ringkasan.anakDiukur ?? 1,
                            )}{' '}
                            dari total {data?.ringkasan.anakDiukur ?? 0} balita
                            yang ditimbang periode {periode.label}.
                        </p>
                    </article>

                    <article className="flex flex-col justify-between rounded-2xl border border-rose-300 bg-rose-50/60 p-5 shadow-sm">
                        <div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold tracking-wider text-rose-900 uppercase">
                                    Kategori Kritis: 2T+
                                </p>
                                <span className="rounded-full border border-rose-300 bg-rose-200 px-2 py-0.5 text-[10px] font-extrabold text-rose-900">
                                    Wajib Rujuk Segera
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-extrabold text-rose-950 tabular-nums">
                                {jumlahDuaT}{' '}
                                <span className="text-sm font-semibold text-rose-800">
                                    balita
                                </span>
                            </p>
                        </div>
                        <p className="mt-2 text-xs font-medium text-rose-900">
                            ≥ 2 kali berturut-turut tidak naik. Prioritas
                            investigasi infeksi & PMT Pemulihan.
                        </p>
                    </article>

                    <article className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-card p-5 shadow-sm">
                        <div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Kategori Waspada: 1T
                                </p>
                                <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                                    Konseling Meja 4
                                </span>
                            </div>
                            <p className="mt-2 text-3xl font-extrabold text-foreground tabular-nums">
                                {jumlahSatuT}{' '}
                                <span className="text-sm font-semibold text-muted-foreground">
                                    balita
                                </span>
                            </p>
                        </div>
                        <p className="mt-2 text-xs font-medium text-muted-foreground">
                            1 kali kenaikan di bawah KBM. Perlu evaluasi pola
                            asuh makan & ASI eksklusif.
                        </p>
                    </article>
                </>
            )}
        </div>
    );
}
