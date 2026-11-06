import GrafikPertumbuhan from '@/components/grafik-pertumbuhan';
import type { BarisLms } from '@/lib/z-score';
import type { Anak, Pengukuran, Periode } from '@/types/posyandu';

export function TabKurva({
    anak,
    nama,
    umur,
    periode,
    terbaru,
    pengukuran,
    standarLms,
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
    standarLms: BarisLms[];
    umurDisorot: number | null;
    riwayatKurva: [number, number][];
    titikPerluVerifikasi: number;
    tersembunyi: boolean;
}) {
    const keterangan = `${terbaru === null ? `Kurva ini hanya menampilkan riwayat; belum ada pengukuran pada ${periode.label}.` : `Hasil ${periode.label} tersedia pada tab Status Gizi.`}${titikPerluVerifikasi > 0 ? ` ${titikPerluVerifikasi} titik yang perlu diverifikasi tetap tersedia di Riwayat Ukur.` : ''}`;

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
            ) : anak.jk === null ? (
                <p className="mt-2 text-base text-muted-foreground">
                    Jenis kelamin belum tercatat. Lengkapi lewat Ubah data
                    balita.
                </p>
            ) : (
                <GrafikPertumbuhan
                    key={umurDisorot ?? 'terakhir'}
                    modeKms
                    aktif={!tersembunyi}
                    umurDisorot={umurDisorot}
                    kelamin={anak.jk}
                    nama={nama}
                    umurBalita={umur}
                    keterangan={keterangan}
                    pengukuran={pengukuran}
                    standar={standarLms}
                />
            )}
        </section>
    );
}
