import { TriangleAlert } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import ZScoreCell from '@/components/z-score-cell';
import {
    KOSONG,
    labelIndeks,
    satuan,
    tanggalRingkas,
    umurRingkas,
} from '@/lib/format';
import type { Pengukuran } from '@/types/posyandu';
import { ARTI_KEHADIRAN, ARTI_NTOB } from './tipe';

export function TabRiwayat({
    pengukuran,
    umur,
    umurDisorot,
    setUmurDisorot,
    janggal,
    tersembunyi,
}: {
    pengukuran: Pengukuran[];
    umur: number | null;
    umurDisorot: number | null;
    setUmurDisorot: (umur: number | null) => void;
    janggal: (urutan: number) => string | null;
    tersembunyi: boolean;
}) {
    return (
        <section
            id="panel-riwayat"
            role="tabpanel"
            aria-labelledby="tab-riwayat"
            hidden={tersembunyi}
        >
            <div className="kartu overflow-hidden">
                <div className="strip-kepala">
                    <h2 className="text-xl font-extrabold">
                        Riwayat pengukuran
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Pilih tanggal untuk menyorot titiknya saat membuka tab
                        Kurva KMS.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground md:hidden">
                        Tabel ini lebih lebar daripada layar. Geser ke samping
                        untuk melihat kolom z-score.
                    </p>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead scope="col">Tanggal</TableHead>
                            <TableHead
                                scope="col"
                                className="hidden lg:table-cell"
                            >
                                Umur
                            </TableHead>
                            <TableHead scope="col">Berat</TableHead>
                            <TableHead scope="col">
                                Panjang atau Tinggi
                            </TableHead>
                            <TableHead scope="col">BB/U</TableHead>
                            <TableHead scope="col">
                                {labelIndeks('BB_TB', umur)}
                            </TableHead>
                            <TableHead scope="col">
                                {labelIndeks('TB_U', umur)}
                            </TableHead>
                            <TableHead
                                scope="col"
                                className="hidden md:table-cell"
                            >
                                Pertumbuhan
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pengukuran.map((p, urutan) => {
                            const sebab =
                                p.statusKehadiran === 'hadir'
                                    ? null
                                    : (ARTI_KEHADIRAN[p.statusKehadiran] ??
                                      null);
                            const peringatan = janggal(urutan);

                            return (
                                <TableRow
                                    key={p.periodeId}
                                    aria-current={
                                        p.umurBulan === umurDisorot
                                            ? 'true'
                                            : undefined
                                    }
                                    className={
                                        p.umurBulan === umurDisorot
                                            ? 'bg-accent'
                                            : ''
                                    }
                                >
                                    <TableCell className="py-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setUmurDisorot(p.umurBulan)
                                            }
                                            className="inline-flex min-h-13 items-center rounded-lg px-3 font-semibold text-primary underline"
                                        >
                                            {tanggalRingkas(p.tanggalUkur)}
                                        </button>
                                        {sebab !== null && (
                                            <span className="block px-3 pb-1 text-sm text-muted-foreground">
                                                {sebab}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden whitespace-nowrap lg:table-cell">
                                        {umurRingkas(p.umurBulan)}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        {satuan(p.bbKg, 'kg', 2)}
                                    </TableCell>
                                    <TableCell>
                                        {satuan(p.tinggiCm, 'cm')}
                                        {p.tinggiCm !== null && (
                                            <span className="block text-sm text-muted-foreground">
                                                {p.umurBulan !== null &&
                                                p.umurBulan < 24
                                                    ? 'panjang badan'
                                                    : 'tinggi badan'}
                                            </span>
                                        )}
                                        {peringatan !== null && (
                                            <span className="mt-1 flex items-start gap-1.5 text-sm text-tone-amber">
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
                                        <ZScoreCell nilai={p.penilaian.BB_U} />
                                    </TableCell>
                                    <TableCell>
                                        <ZScoreCell nilai={p.penilaian.BB_TB} />
                                    </TableCell>
                                    <TableCell>
                                        <ZScoreCell nilai={p.penilaian.TB_U} />
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {p.ntob === null
                                            ? KOSONG
                                            : (ARTI_NTOB[
                                                  p.ntob.toUpperCase()
                                              ] ?? p.ntob)}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <p className="mt-3 max-w-[80ch] text-sm text-muted-foreground">
                Kolom Pertumbuhan menampilkan huruf N, T, O, dan B apa adanya
                dari arsip. Aturan 1T/2T/3T belum diterapkan karena definisinya
                masih dikonfirmasi.
            </p>
        </section>
    );
}
