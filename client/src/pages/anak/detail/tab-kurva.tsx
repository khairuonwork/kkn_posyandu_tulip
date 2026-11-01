import KmsChart from '@/components/kms-chart-sep24';
import { umurPanjang } from '@/lib/format';
import type { Anak, GarisSd, Pengukuran, Periode } from '@/types/posyandu';

export function TabKurva({
    anak,
    nama,
    umur,
    periode,
    terbaru,
    pengukuran,
    garisSd,
    umurDisorot,
    riwayatKurva,
    titikPerluVerifikasi,
    tersembunyi,
}: {
    anak: Anak;
    nama: string;
    umur: number | null;
    periode: Periode;
    terbaru: Pengukuran | null;
    pengukuran: Pengukuran[];
    garisSd: GarisSd[];
    umurDisorot: number | null;
    riwayatKurva: [number, number][];
    titikPerluVerifikasi: number;
    tersembunyi: boolean;
}) {
    return (
        <section
            id="panel-kurva"
            role="tabpanel"
            aria-labelledby="tab-kurva"
            hidden={tersembunyi}
        >
            {riwayatKurva.length === 0 ? (
                <p className="mt-2 text-base text-muted-foreground">
                    Belum ada pengukuran berat yang dapat digambarkan.
                </p>
            ) : (
                anak.jk !== null && (
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-subtle px-4 py-3 sm:px-5">
                            <div>
                                <h2 className="text-xl font-extrabold">
                                    Kartu Menuju Sehat
                                </h2>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Berat badan menurut umur · WHO 2006
                                </p>
                            </div>
                            <p className="text-sm font-semibold text-muted-foreground">
                                {nama} · {umurPanjang(umur)}
                            </p>
                        </div>
                        <div className="px-4 py-4 sm:px-5">
                            <p className="mb-3 text-sm text-muted-foreground">
                                {terbaru === null
                                    ? `Kurva ini hanya menampilkan riwayat; belum ada pengukuran pada ${periode.label}.`
                                    : `Hasil ${periode.label} tersedia pada tab Status Gizi.`}
                                {umur !== null &&
                                    umur > 60 &&
                                    ' Kurva BB/U WHO 2006 ini hanya mencakup usia 0–60 bulan.'}
                                {titikPerluVerifikasi > 0 &&
                                    ` ${titikPerluVerifikasi} titik BB/U yang ditandai tidak wajar disisihkan dari gambar dan tetap tersimpan di Riwayat Ukur.`}
                            </p>
                            <KmsChart
                                kelamin={anak.jk}
                                riwayat={riwayatKurva}
                                garisSd={garisSd}
                                umurDisorot={umurDisorot}
                                detail={pengukuran
                                    .filter(
                                        (
                                            p,
                                        ): p is Pengukuran & {
                                            umurBulan: number;
                                            bbKg: number;
                                        } =>
                                            p.umurBulan !== null &&
                                            p.umurBulan >= 0 &&
                                            p.umurBulan <= 60 &&
                                            p.bbKg !== null &&
                                            p.bbKg > 0 &&
                                            !p.penilaian.BB_U?.tidakWajar,
                                    )
                                    .map((p) => ({
                                        umurBulan: p.umurBulan,
                                        beratKg: p.bbKg,
                                        tanggal: p.tanggalUkur,
                                        z: p.penilaian.BB_U?.z ?? null,
                                        kategori:
                                            p.penilaian.BB_U?.kategori ?? null,
                                    }))}
                            />
                        </div>
                    </div>
                )
            )}
        </section>
    );
}
