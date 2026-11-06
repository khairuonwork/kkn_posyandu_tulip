import PendampinganKia from '@/components/pendampingan-kia';
import { tanggalPanjang, zScore } from '@/lib/format';
import type { DiskusiKiaWa } from '@/lib/pesan-wa';
import type {
    Anak,
    Pengukuran,
    PenilaianGizi,
    Periode,
    Peran,
} from '@/types/posyandu';
import { KartuIndeks } from './kartu-indeks';
import type { AmbangDetail } from './tipe';

export function TabStatus({
    anak,
    terbaru,
    hasilTerakhir,
    periode,
    peran,
    terurut,
    indeks,
    indeksTidakWajar,
    perluRujukan,
    perluWaspada,
    perluTindakLanjut,
    edukasiKms,
    ambang,
    umur,
    sumberLive = false,
    alasanTanpaDataWa,
    tersembunyi,
    onInfoKiaChange,
    onBukaWa,
}: {
    anak: Anak;
    terbaru: Pengukuran | null;
    hasilTerakhir?: Pengukuran;
    periode: Periode;
    peran: Peran;
    terurut: { label: string; nilai: PenilaianGizi | undefined }[];
    indeks: { label: string; nilai: PenilaianGizi | undefined }[];
    indeksTidakWajar: string[];
    perluRujukan: boolean;
    perluWaspada: boolean;
    perluTindakLanjut: boolean;
    edukasiKms: string;
    ambang: AmbangDetail;
    umur: number | null;
    sumberLive?: boolean;
    alasanTanpaDataWa: string | null;
    tersembunyi: boolean;
    onInfoKiaChange: (info: DiskusiKiaWa | null) => void;
    onBukaWa: (info: DiskusiKiaWa | null) => void;
}) {
    return (
        <>
            {terbaru === null && (
                <section
                    id="panel-status"
                    role="tabpanel"
                    aria-labelledby="tab-status"
                    hidden={tersembunyi}
                    className="kartu px-6 py-6"
                >
                    <h2 className="text-xl font-extrabold">
                        Belum ada penilaian untuk {periode.label}
                    </h2>
                    <p className="mt-2 max-w-[72ch] text-base text-muted-foreground">
                        Pengukuran dari periode lain tidak dipakai sebagai
                        status bulan ini.
                        {hasilTerakhir !== undefined &&
                            ` Riwayat terakhir tercatat ${tanggalPanjang(hasilTerakhir.tanggalUkur)}; lihat Kurva KMS atau Riwayat Ukur untuk konteksnya.`}
                    </p>
                </section>
            )}

            {terbaru !== null && (
                <section
                    id="panel-status"
                    role="tabpanel"
                    aria-labelledby="tab-status"
                    hidden={tersembunyi}
                >
                    <h2 className="text-xl font-extrabold">
                        Status pengukuran {tanggalPanjang(terbaru.tanggalUkur)}
                    </h2>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {terurut.map((i) => (
                            <KartuIndeks
                                key={i.label}
                                label={i.label}
                                nilai={i.nilai}
                            />
                        ))}
                    </div>

                    {indeksTidakWajar.length > 0 && (
                        <p className="mt-4 rounded-xl bg-tone-amber-bg p-4 text-sm font-semibold text-tone-amber">
                            {indeksTidakWajar.join(', ')} ditandai tidak wajar
                            dalam arsip dan tidak dipakai untuk penilaian.
                            Periksa ulang hasil ukur sebelum memberi arahan.
                        </p>
                    )}

                    <p className="mt-4 text-base font-bold">
                        {indeksTidakWajar.length > 0
                            ? 'Sebagian hasil perlu verifikasi ulang sebelum keputusan tindak lanjut.'
                            : indeks.every((i) => i.nilai === undefined)
                              ? 'Belum dapat dinilai dari data periode ini.'
                              : perluTindakLanjut
                                ? 'Perlu tindak lanjut bulan ini.'
                                : 'Lanjutkan pemantauan bulanan dan diskusi perkembangan sesuai usia.'}
                    </p>

                    <div
                        className={`mt-5 rounded-xl p-5 ${
                            perluRujukan
                                ? 'bg-tone-red-bg text-tone-red'
                                : 'bg-surface-subtle text-foreground'
                        }`}
                    >
                        <h3 className="text-base font-extrabold">
                            Diskusikan hasil gizi dengan keluarga
                        </h3>
                        <p className="mt-1 max-w-[76ch] text-base text-pretty">
                            {edukasiKms}
                        </p>
                        {perluRujukan && (
                            <p className="mt-2 text-sm font-semibold">
                                Ambang kerja rujukan: z-score ≤{' '}
                                {zScore(ambang.ambangRujukan)} SD. Perlu
                                pengesahan Puskesmas sebelum digunakan sebagai
                                aturan produksi.
                            </p>
                        )}
                        {perluWaspada && !perluRujukan && (
                            <p className="mt-2 text-sm font-semibold">
                                Zona waspada dimulai pada z-score ≤{' '}
                                {zScore(ambang.ambangWaspada)} SD.
                            </p>
                        )}
                    </div>

                    <p className="mt-2 max-w-[80ch] text-sm text-pretty text-muted-foreground">
                        Acuan standar pertumbuhan WHO 2006, dihitung dari
                        parameter LMS. Nilainya sama dengan tabel Permenkes No.
                        2 Tahun 2020. Indeks mengikuti umur anak: BB/PB di bawah
                        24 bulan, BB/TB untuk 24 bulan ke atas.
                    </p>

                    {terbaru.catatanUkur?.jenisUkur !== undefined && (
                        <p className="mt-2 max-w-[80ch] text-sm text-muted-foreground">
                            Cara ukur {terbaru.catatanUkur.jenisUkur}:{' '}
                            {umur !== null && umur < 24
                                ? 'panjang badan, telentang'
                                : 'tinggi badan, berdiri'}
                            . Berkas sumber tidak mencatatnya.
                        </p>
                    )}
                </section>
            )}

            {!tersembunyi && (
                <PendampinganKia
                    key={anak.id}
                    anakId={anak.id}
                    sumberLive={sumberLive}
                    alasanTanpaWa={
                        peran === 'kms' ? undefined : alasanTanpaDataWa
                    }
                    onInfoKiaChange={onInfoKiaChange}
                    onKirimWa={peran === 'kms' ? undefined : onBukaWa}
                />
            )}
        </>
    );
}
