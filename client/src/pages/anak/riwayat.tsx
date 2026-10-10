/**
 * Detail riwayat penimbangan — seluruh hasil ukur satu balita dalam satu
 * tabel. Dibuka dari kartu Riwayat penimbangan di Detail Balita, yang hanya
 * memuat tanggal, berat, dan naik atau tidaknya.
 */

import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import Halaman from '@/components/halaman';
import StatusGiziBadge from '@/components/status-gizi-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeadUrut,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    KOSONG,
    labelIndeks,
    namaTampil,
    satuan,
    tanggalRingkas,
    umurBulanPada,
    umurRingkas,
    zScore,
} from '@/lib/format';
import { StatusNaik } from '@/pages/anak/show';
import type { AmbangDetail } from '@/pages/anak/show';
import type {
    Anak,
    PenilaianGizi,
    Pengukuran,
    Periode,
} from '@/types/posyandu';

type Props = {
    anak: Anak;
    /** Seluruh pengukuran lintas periode, terbaru di atas. */
    pengukuran: Pengukuran[];
    periode: Periode;
    ambang: AmbangDetail;
    sumberLive?: boolean;
};

type KolomUrut = 'tanggal' | 'umur' | 'berat' | 'tinggi';

/**
 * Sebab baris kosong. Ketidakhadiran bukan berat badan nol (DR-04), dan
 * sebabnya sudah ada di data sejak awal.
 */
const ARTI_KEHADIRAN: Record<string, string> = {
    tidak_hadir: 'Tidak hadir',
    pindah: 'Pindah',
    tidak_dapat_diukur: 'Tidak dapat diukur',
};

export default function RiwayatPenimbangan({
    anak,
    pengukuran,
    periode,
    ambang,
    sumberLive = false,
}: Props) {
    const [urut, setUrut] = useState<{ kolom: KolomUrut; naik: boolean }>({
        kolom: 'tanggal',
        naik: false,
    });
    const umur = umurBulanPada(anak.tglLahir, periode.tanggalKegiatan);
    const berdiri = umur !== null && umur >= 24;
    const jumlahHadir = pengukuran.filter(
        (p) => p.statusKehadiran === 'hadir',
    ).length;

    /**
     * Selisih yang tidak masuk akal terhadap penimbangan sebelumnya. Nilai
     * yang sendiri-sendiri masih wajar bisa salah pada selisihnya — tinggi
     * yang turun 11,5 cm, misalnya.
     */
    const janggal = (urutan: number): string | null => {
        const kini = pengukuran[urutan];
        const lalu = pengukuran
            .slice(urutan + 1)
            .find((p) => p.statusKehadiran === 'hadir');

        if (lalu === undefined) {
            return null;
        }

        if (
            kini.tinggiCm !== null &&
            lalu.tinggiCm !== null &&
            lalu.tinggiCm - kini.tinggiCm > ambang.tinggiBerkurangMax
        ) {
            return `Tinggi berkurang ${satuan(lalu.tinggiCm - kini.tinggiCm, 'cm')} dari penimbangan sebelumnya`;
        }

        if (kini.bbKg !== null && lalu.bbKg !== null) {
            const selisih = kini.bbKg - lalu.bbKg;

            if (selisih > ambang.naikMax) {
                return `Berat naik ${satuan(selisih, 'kg', 2)} dalam sebulan`;
            }

            if (-selisih > ambang.turunMax) {
                return `Berat turun ${satuan(-selisih, 'kg', 2)} dalam sebulan`;
            }
        }

        return null;
    };

    const nilaiUrut = (p: Pengukuran): number | string => {
        switch (urut.kolom) {
            case 'umur':
                return p.umurBulan ?? -1;

            case 'berat':
                return p.bbKg ?? -1;

            case 'tinggi':
                return p.tinggiCm ?? -1;

            default:
                return p.tanggalUkur ?? '';
        }
    };

    const baris = pengukuran
        .map((p, i) => ({ p, peringatan: janggal(i) }))
        .sort((a, b) => {
            const x = nilaiUrut(a.p);
            const y = nilaiUrut(b.p);
            const beda =
                typeof x === 'number' && typeof y === 'number'
                    ? x - y
                    : String(x).localeCompare(String(y));

            return urut.naik ? beda : -beda;
        });

    const kepala = (kolom: KolomUrut, label: string, kanan = false) => (
        <TableHeadUrut
            label={label}
            aktif={urut.kolom === kolom}
            naik={urut.naik}
            pertama={kolom === 'tanggal'}
            kanan={kanan}
            onUrut={() =>
                setUrut({
                    kolom,
                    naik:
                        urut.kolom === kolom ? !urut.naik : kolom !== 'tanggal',
                })
            }
        />
    );

    const keteranganUrut =
        urut.kolom === 'tanggal'
            ? urut.naik
                ? 'terlama di atas'
                : 'terbaru di atas'
            : `urut ${
                  {
                      umur: 'umur',
                      berat: 'berat',
                      tinggi: berdiri ? 'tinggi' : 'panjang',
                  }[urut.kolom]
              } ${urut.naik ? 'naik' : 'turun'}`;

    return (
        <Halaman
            penuh="lg"
            judul="Detail riwayat penimbangan"
            kembali={{
                href: `/balita/${anak.id}`,
                label: 'Detail Balita',
                teks: true,
            }}
            subjudul={`${namaTampil(anak.nama)}${
                umur === null ? '' : ` · ${umurRingkas(umur)}`
            }${sumberLive ? '' : '. Data contoh'}.`}
        >
            <section className="kartu flex flex-col overflow-hidden lg:min-h-0">
                <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3.5 gap-y-1 border-b border-border px-5.5 py-3.5">
                    <h2 className="text-lg leading-tight font-extrabold">
                        Semua hasil ukur
                    </h2>
                    <span className="text-sm text-muted-foreground">
                        {jumlahHadir} kali ditimbang ·{' '}
                        {berdiri
                            ? 'tinggi badan diukur berdiri'
                            : 'panjang badan diukur telentang'}
                    </span>
                </div>

                <Table
                    aria-label={`Riwayat penimbangan ${namaTampil(anak.nama)}`}
                    containerClassName="lg:min-h-0 lg:flex-1"
                >
                    <TableHeader className="sticky top-0 z-10">
                        <TableRow>
                            {kepala('tanggal', 'Tanggal')}
                            {kepala('umur', 'Umur')}
                            {kepala('berat', 'Berat', true)}
                            {kepala(
                                'tinggi',
                                berdiri ? 'Tinggi' : 'Panjang',
                                true,
                            )}
                            <TableHead scope="col">
                                {labelIndeks('BB_TB', umur)} (
                                {berdiri
                                    ? 'berat menurut tinggi'
                                    : 'berat menurut panjang'}
                                )
                            </TableHead>
                            <TableHead scope="col">
                                {labelIndeks('TB_U', umur)} (
                                {berdiri
                                    ? 'tinggi menurut umur'
                                    : 'panjang menurut umur'}
                                )
                            </TableHead>
                            <TableHead scope="col">Berat naik?</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {baris.map(({ p, peringatan }) => {
                            const hadir = p.statusKehadiran === 'hadir';

                            return (
                                <TableRow key={p.periodeId}>
                                    <TableCell className="font-bold whitespace-nowrap">
                                        {tanggalRingkas(p.tanggalUkur)}
                                        {!hadir && (
                                            <span className="block text-sm font-medium text-muted-foreground">
                                                {ARTI_KEHADIRAN[
                                                    p.statusKehadiran
                                                ] ?? 'Tidak ditimbang'}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {umurRingkas(p.umurBulan)}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                                        {satuan(p.bbKg, 'kg', 2)}
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                                        {satuan(p.tinggiCm, 'cm')}
                                        {peringatan !== null && (
                                            <span className="mt-1 flex items-start justify-end gap-1.5 text-sm whitespace-normal text-tone-amber">
                                                <TriangleAlert
                                                    className="mt-0.5 size-4 shrink-0"
                                                    strokeWidth={2.5}
                                                    aria-hidden="true"
                                                />
                                                {peringatan}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <SelZ nilai={p.penilaian.BB_TB} />
                                    </TableCell>
                                    <TableCell>
                                        <SelZ nilai={p.penilaian.TB_U} />
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {hadir ? (
                                            <StatusNaik
                                                ntob={p.ntob}
                                                umurBulan={p.umurBulan}
                                                ikon={false}
                                            />
                                        ) : (
                                            <span className="text-muted-foreground">
                                                {KOSONG}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                <p className="shrink-0 border-t border-border px-5.5 py-3 text-sm text-muted-foreground">
                    Menampilkan{' '}
                    <span className="font-bold text-foreground">
                        {pengukuran.length}
                    </span>{' '}
                    penimbangan · {keteranganUrut}
                </p>
            </section>
        </Halaman>
    );
}

/**
 * Z-score rata kanan selebar tetap, lalu lencana kategorinya — supaya
 * lencana di kolom yang sama berjajar lurus.
 */
function SelZ({ nilai }: { nilai: PenilaianGizi | undefined }) {
    if (nilai === undefined) {
        return <span className="text-muted-foreground">{KOSONG}</span>;
    }

    return (
        <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
            <span className="inline-block min-w-14 text-right font-bold tabular-nums">
                {zScore(nilai.z)}
            </span>
            <StatusGiziBadge kategori={nilai.kategori} rapat />
            {/* Nilai di luar rentang wajar tetap ditampilkan, dengan penanda:
                data yang salah harus terlihat, bukan tersembunyi. */}
            {nilai.tidakWajar && (
                <TriangleAlert
                    className="size-4 shrink-0 text-tone-amber"
                    strokeWidth={2.5}
                    role="img"
                    aria-label="Nilai di luar rentang wajar, perlu diperiksa"
                />
            )}
        </span>
    );
}
