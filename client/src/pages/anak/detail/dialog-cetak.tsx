import { ArrowRight, Info, Printer } from 'lucide-react';
import Dialog, { KakiDialog } from '@/components/dialog';
import KartuBalita, { LembarCetak } from '@/components/kartu-balita';
import { kodeKartuSasaran } from '@/lib/kartu-sasaran';
import { Link } from '@/lib/nav';
import type { Anak } from '@/types/posyandu';

export function DialogCetak({
    anak,
    lembaga,
    onTutup,
}: {
    anak: Anak;
    lembaga: string;
    onTutup: () => void;
}) {
    const kartu = {
        nama: anak.nama,
        tglLahir: anak.tglLahir,
        rt: anak.rt,
        namaIbu: anak.namaOrtu,
        nik: anak.nik,
        id: anak.id,
        kode: kodeKartuSasaran(anak),
    };

    return (
        <Dialog
            animasiDetail
            judul="Cetak kartu balita"
            keterangan="Periksa isi kartu sebelum dicetak."
            lebar="w-[900px]"
            onTutup={onTutup}
        >
            <div className="flex min-h-0 flex-wrap gap-7 overflow-y-auto px-7 py-4.5">
                <figure className="shrink-0">
                    <div className="flex justify-center rounded-lg bg-surface-alt p-5.5">
                        <KartuBalita kartu={kartu} lembaga={lembaga} />
                    </div>
                    <figcaption className="mt-2 text-sm text-muted-foreground">
                        Ukuran asli 85,6 × 54 mm, seukuran KTP. Garis
                        putus-putus adalah garis potong.
                    </figcaption>
                </figure>

                <div className="flex min-w-60 flex-1 flex-col gap-3.5">
                    <div>
                        <h3 className="text-base font-extrabold">
                            Ingin mencetak beberapa kartu sekaligus?
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Satu lembar A4 memuat 8 kartu. Pilih balita lain di
                            halaman Kartu Balita agar kertas tidak terbuang.
                        </p>
                    </div>
                    <Link
                        href={`/kartu-sasaran/${anak.id}`}
                        className="tombol-kedua"
                    >
                        <ArrowRight
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Buka Kartu Balita
                    </Link>
                    <div className="flex gap-2.5 rounded-lg bg-tone-blue-bg px-4 py-3.5">
                        <Info
                            className="mt-px size-5 shrink-0 text-tone-blue"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        <p className="text-sm">
                            Saat jendela cetak muncul, pilih kertas{' '}
                            <span className="font-bold">A4</span> dan skala{' '}
                            <span className="font-bold">100%</span> agar ukuran
                            kartu tepat.
                        </p>
                    </div>
                </div>
            </div>

            <KakiDialog>
                <button
                    type="button"
                    data-tutup-dialog
                    onClick={onTutup}
                    className="tombol-kedua px-5.5"
                >
                    Batal
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="tombol-utama px-5.5"
                >
                    <Printer
                        className="size-5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Cetak 1 kartu
                </button>
            </KakiDialog>

            <LembarCetak kartu={[kartu]} lembaga={lembaga} />
        </Dialog>
    );
}
