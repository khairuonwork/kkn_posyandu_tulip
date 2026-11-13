import { ChartLine } from 'lucide-react';
import GrafikPertumbuhan from '@/components/grafik-pertumbuhan';
import StateHalaman from '@/components/state-halaman';
import { useRef } from 'react';
import { tanggalPanjang } from '@/lib/format';
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
    tanggalUkurTerakhir,
    onLihatRiwayat,
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
    tanggalUkurTerakhir?: string | null;
    onLihatRiwayat: () => void;
    tersembunyi: boolean;
}) {
    const animasiSudahDiputar = useRef(false);
    const keterangan = `${terbaru === null ? `Kurva ini hanya menampilkan riwayat; belum ada pengukuran pada ${periode.label}.` : `Hasil ${periode.label} tersedia pada tab Status Gizi.`}${titikPerluVerifikasi > 0 ? ` ${titikPerluVerifikasi} titik yang perlu diverifikasi tetap tersedia di Riwayat Ukur.` : ''}`;

    return (
        <section
            id="panel-kurva"
            role="tabpanel"
            aria-labelledby="tab-kurva"
            hidden={tersembunyi}
        >
            {riwayatKurva.length === 0 ? (
                <div className="kartu">
                    <StateHalaman
                        jenis="kosong"
                        ikonKosong={ChartLine}
                        judul="Kurva KMS belum tersedia"
                        pesan={tanggalUkurTerakhir
                            ? `Belum ada data berat badan yang bisa ditampilkan pada kurva. Pengukuran terakhir: ${tanggalPanjang(tanggalUkurTerakhir)}.`
                            : 'Belum ada data berat badan yang bisa ditampilkan pada kurva.'}
                    >
                        {pengukuran.length > 0 && (
                            <button type="button" className="tombol-kedua" onClick={onLihatRiwayat}>
                                Lihat riwayat ukur
                            </button>
                        )}
                    </StateHalaman>
                </div>
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
                    animasiSudahDiputar={animasiSudahDiputar}
                    umurDisorot={umurDisorot}
                    kelamin={anak.jk}
                    nama={nama}
                    umurBalita={umur}
                    tglLahir={anak.tglLahir}
                    keterangan={keterangan}
                    pengukuran={pengukuran}
                    standar={standarLms}
                />
            )}
        </section>
    );
}
