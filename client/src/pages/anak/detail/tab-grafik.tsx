import GrafikPertumbuhan from '@/components/grafik-pertumbuhan';
import type { BarisLms } from '@/lib/z-score';
import type { Anak, Pengukuran, Periode } from '@/types/posyandu';

export function TabGrafik({
    anak,
    nama,
    umur,
    periode,
    terbaru,
    pengukuran,
    standarLms,
    tersembunyi,
}: {
    anak: Anak;
    nama: string;
    umur: number | null;
    periode: Periode;
    terbaru: Pengukuran | null;
    pengukuran: Pengukuran[];
    standarLms: BarisLms[];
    tersembunyi: boolean;
}) {
    return (
        <section
            id="panel-grafik"
            role="tabpanel"
            aria-labelledby="tab-grafik"
            hidden={tersembunyi}
        >
            {anak.jk === null ? (
                <p className="mt-2 text-base text-muted-foreground">
                    Jenis kelamin belum tercatat, sehingga grafik belum dapat
                    digambarkan. Lengkapi lewat Ubah data.
                </p>
            ) : (
                <GrafikPertumbuhan
                    aktif={!tersembunyi}
                    kelamin={anak.jk}
                    nama={nama}
                    umurBalita={umur}
                    tglLahir={anak.tglLahir}
                    keterangan={
                        terbaru === null
                            ? `Grafik ini hanya menampilkan riwayat; belum ada pengukuran pada ${periode.label}.`
                            : `Hasil ${periode.label} tersedia pada tab Status Gizi.`
                    }
                    pengukuran={pengukuran}
                    standar={standarLms}
                />
            )}
        </section>
    );
}
