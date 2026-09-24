import { CreditCard, Download, Printer, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useMemo, useState } from 'react';
import Halaman from '@/components/halaman';
import { kodeKartuSasaran, payloadKartuSasaran } from '@/lib/kartu-sasaran';

export type SasaranKartu = {
    id: number | string;
    nama: string | null;
    nik: string | null;
    namaIbu: string | null;
    tglLahir: string;
    rt: string | null;
};

type Props = { sasaran: SasaranKartu[]; terpilihAwal?: number };

export default function KartuSasaran({ sasaran, terpilihAwal }: Props) {
    const [cari, setCari] = useState('');
    const [pilihan, setPilihan] = useState<Set<number>>(
        () => new Set(terpilihAwal === undefined ? [] : [terpilihAwal]),
    );
    const [pratinjau, setPratinjau] = useState(false);
    const tampil = useMemo(() => {
        const kata = cari.trim().toLowerCase();

        return kata === ''
            ? sasaran
            : sasaran.filter((a) =>
                  `${a.nama} ${a.nik ?? ''}`.toLowerCase().includes(kata),
              );
    }, [cari, sasaran]);

    const halaman = Math.max(1, Math.ceil(pilihan.size / 8));
    const ubah = (id: number) =>
        setPilihan((lama) => {
            const baru = new Set(lama);

            if (baru.has(id)) {
                baru.delete(id);
            } else {
                baru.add(id);
            }

            return baru;
        });
    const pilihSemua = () =>
        setPilihan(new Set(tampil.map((anak) => sasaran.indexOf(anak))));

    return (
        <Halaman
            ikon={CreditCard}
            judul="Kartu sasaran"
            subjudul="Pilih satu atau beberapa anak, lalu cetak kartu berukuran 85,6 × 54 mm. Satu lembar A4 memuat maksimal 8 kartu."
            aksi={
                <>
                    <button
                        type="button"
                        className="tombol-kedua"
                        onClick={() => window.print()}
                    >
                        <Download className="size-5" strokeWidth={2.5} /> Simpan
                        / ekspor PDF
                    </button>
                    <button
                        type="button"
                        className="tombol-utama"
                        onClick={() => setPratinjau(true)}
                    >
                        <Printer className="size-5" strokeWidth={2.5} /> Cetak{' '}
                        {pilihan.size || 0} kartu · {halaman} lembar A4
                    </button>
                </>
            }
        >
            <div className="max-w-6xl">
                <div className="mb-7 flex flex-wrap items-end gap-3">
                    <label className="min-w-70 flex-1">
                        <span className="text-sm font-semibold text-muted-foreground">
                            Cari anak atau NIK
                        </span>
                        <input
                            value={cari}
                            onChange={(e) => setCari(e.target.value)}
                            placeholder="Ketik nama anak…"
                            className="isian mt-1.5 w-full"
                        />
                    </label>
                    <button
                        type="button"
                        className="tombol-kedua"
                        onClick={pilihSemua}
                    >
                        Pilih semua hasil ({tampil.length})
                    </button>
                    <button
                        type="button"
                        className="tombol-kedua"
                        onClick={() => setPilihan(new Set())}
                    >
                        Kosongkan pilihan
                    </button>
                </div>
                <p className="mb-5 text-sm text-muted-foreground">
                    {pilihan.size} kartu dipilih · otomatis {halaman} lembar A4
                    · susunan cetak 2 kolom × 4 baris.
                </p>
                {pratinjau && (
                    <section className="fixed inset-0 z-50 flex flex-col items-center overflow-auto bg-black/55 p-6 sm:p-10">
                        <div className="mx-auto min-h-[297mm] w-[210mm] bg-[#f5f6f2] p-[16mm] shadow-[0_12px_32px_rgba(22,33,28,0.18)]">
                            <p className="mb-3 text-center text-[10px] font-bold tracking-[0.12em] text-muted-foreground">
                                PRATINJAU CETAK A4 · 2 KOLOM × 4 BARIS
                            </p>
                            <div className="grid grid-cols-[85.6mm_85.6mm] gap-x-[6mm] gap-y-[4mm]">
                                {Array.from({ length: 8 }, (_, i) => {
                                    const anak = sasaran.filter((_, id) =>
                                        pilihan.has(id),
                                    )[i];

                                    return (
                                        <div
                                            key={i}
                                            className="h-[53.98mm] w-[85.6mm] rounded-[3mm] border border-dashed border-[#9bbba2] bg-[#eef1ec] p-[3mm]"
                                        >
                                            {anak && (
                                                <div className="grid h-full grid-cols-[1fr_24mm] gap-[3mm]">
                                                    <div className="flex min-w-0 flex-col justify-between">
                                                        <div>
                                                            <span className="inline-flex rounded-full bg-primary px-[2mm] py-[0.7mm] text-[6px] font-extrabold tracking-[0.1em] text-white">
                                                                KARTU SASARAN
                                                            </span>
                                                            <p className="mt-[1.4mm] text-[7px] font-bold text-primary">
                                                                SIMPATIK
                                                                POSYANDU
                                                            </p>
                                                            <p className="mt-[2mm] truncate text-[10px] font-extrabold">
                                                                {anak.nama ??
                                                                    'Nama belum dicatat'}
                                                            </p>
                                                            <p className="mt-[1mm] text-[7px] text-muted-foreground">
                                                                NIK:{' '}
                                                                {anak.nik ??
                                                                    '—'}
                                                            </p>
                                                            <p className="text-[7px] text-muted-foreground">
                                                                Wali:{' '}
                                                                {anak.namaIbu ??
                                                                    '—'}
                                                            </p>
                                                            <p className="text-[7px] text-muted-foreground">
                                                                {anak.tglLahir}{' '}
                                                                ·{' '}
                                                                {anak.rt
                                                                    ? `RT ${anak.rt}`
                                                                    : 'RT —'}
                                                            </p>
                                                        </div>
                                                        <p className="border-t border-[#b9cbbb] pt-[1mm] text-[7px] font-bold text-primary">
                                                            {kodeKartuSasaran(
                                                                anak,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <QrSasaran
                                                        payload={payloadKartuSasaran(
                                                            anak,
                                                        )}
                                                        label={kodeKartuSasaran(
                                                            anak,
                                                        )}
                                                        ukuran="w-[24mm]"
                                                        tinggi="h-[24mm]"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                className="tombol-kedua bg-white"
                                onClick={() => setPratinjau(false)}
                            >
                                Kembali
                            </button>
                            <button
                                type="button"
                                className="tombol-utama"
                                onClick={() => window.print()}
                            >
                                <Printer className="size-5" /> Lanjutkan cetak
                            </button>
                        </div>
                    </section>
                )}
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {tampil.map((anak, i) => {
                        const id = sasaran.indexOf(anak);

                        const kode = kodeKartuSasaran(anak);
                        const aktif = pilihan.has(id);

                        return (
                            <button
                                key={`${kode}-${i}`}
                                type="button"
                                onClick={() => ubah(id)}
                                className={`overflow-hidden rounded-xl border-2 text-left transition ${aktif ? 'border-primary shadow-[0_12px_24px_rgba(15,110,68,0.18)]' : 'border-[#c7cec5] hover:border-primary'}`}
                            >
                                <div className="flex aspect-[85.6/53.98] bg-[#f1f3ef]">
                                    <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                                        <div>
                                            <div className="flex items-center gap-2 text-primary">
                                                <ShieldCheck className="size-4" />
                                                <span className="text-xs font-extrabold">
                                                    SIMPATIK POSYANDU
                                                </span>
                                            </div>
                                            <h2 className="mt-3 truncate text-lg font-extrabold">
                                                {anak.nama ??
                                                    'Nama belum dicatat'}
                                            </h2>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {anak.namaIbu ??
                                                    'Wali belum tercatat'}{' '}
                                                ·{' '}
                                                {anak.rt
                                                    ? `RT ${anak.rt.padStart(2, '0')}`
                                                    : 'RT —'}
                                            </p>
                                        </div>
                                        <p className="text-xs font-bold text-primary">
                                            {kode}
                                        </p>
                                    </div>
                                    <div className="flex w-[36%] flex-col items-center justify-center border-l border-[#c7cec5] bg-[#e6eee8] p-5">
                                        <QrSasaran
                                            payload={payloadKartuSasaran(anak)}
                                            label={kode}
                                            ukuran="w-24"
                                        />
                                        <span className="mt-2 text-center text-[10px] font-bold text-primary">
                                            PINDAI
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </Halaman>
    );
}

function QrSasaran({
    payload,
    label,
    ukuran = 'w-40',
    tinggi,
}: {
    payload: string;
    label: string;
    ukuran?: string;
    tinggi?: string;
}) {
    return (
        <div
            aria-label={`QR kartu ${label}`}
            className={`${ukuran} ${tinggi ?? 'aspect-square'} shrink-0 self-start bg-white p-2`}
        >
            <QRCodeSVG
                value={payload}
                level="M"
                marginSize={0}
                className="h-full w-full"
                title={`Kartu sasaran ${label}`}
            />
        </div>
    );
}
