/**
 * Periode — docs/10-prd-demo-frontend.md bagian 6.8.
 *
 * Tidak ada di prototipe desain; dirancang mengikuti pola tabel pada 6.4.
 * Menunjukkan bahwa periode kegiatan adalah entitas yang dikelola, bukan
 * sekadar label.
 */

import { Calendar, Plus } from 'lucide-react';
import Halaman from '@/components/halaman';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { persenSaja, tanggalRingkas } from '@/lib/format';

export type BarisPeriode = {
    id: string;
    label: string;
    tanggalKegiatan: string | null;
    sasaran: number;
    ditimbang: number;
};

type Props = {
    periode: BarisPeriode[];
    periodeAktif: string;
    /** Klik baris membuka Beranda pada periode tersebut. */
    onPilih: (id: string) => void;
    /** Belum ada di demo; tombolnya tidak dirender tanpa penanganya. */
    onTambah?: () => void;
};

export default function DaftarPeriode({
    periode,
    periodeAktif,
    onPilih,
    onTambah,
}: Props) {
    return (
        <Halaman
            ikon={Calendar}
            judul="Periode"
            subjudul={`${periode.length} periode kegiatan. Pilih nama periode untuk membukanya di Beranda. Data contoh.`}
            aksi={
                /* Dulu tombol ini selalu tampil dan membuka window.alert
                   berbunyi "Belum tersedia di demo" - kontrol yang menjanjikan
                   sesuatu lalu menolaknya. Kontrol tanpa penanganya kini tidak
                   dirender sama sekali. */
                onTambah !== undefined && (
                    <button
                        type="button"
                        onClick={onTambah}
                        className="tombol-utama"
                    >
                        <Plus className="size-5" strokeWidth={2.5} />
                        Tambah periode
                    </button>
                )
            }
        >
            <div className="kartu overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead scope="col">Periode</TableHead>
                            <TableHead scope="col">Tanggal kegiatan</TableHead>
                            <TableHead scope="col">Sasaran</TableHead>
                            <TableHead scope="col">Ditimbang</TableHead>
                            <TableHead scope="col">D/S</TableHead>
                            <TableHead scope="col">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {periode.map((p) => (
                            <TableRow
                                key={p.id}
                                aria-current={
                                    p.id === periodeAktif ? 'true' : undefined
                                }
                                className={
                                    p.id === periodeAktif ? 'bg-accent' : ''
                                }
                            >
                                {/* Dulu seluruh baris adalah <tr onClick>: tidak
                                    bisa di-Tab, tidak bisa dibuka dengan Enter,
                                    dan tidak ada satu pun tanda bahwa ia dapat
                                    diklik. Satu-satunya elemen yang terjangkau
                                    papan tombol di layar ini adalah tombol
                                    Tambah periode. Sekarang nama periodenya
                                    sendiri yang menjadi tombol.

                                    Periode ditulis `Juni 2026`, bukan `2026-06`. */}
                                <TableCell className="py-1 font-semibold">
                                    <button
                                        type="button"
                                        onClick={() => onPilih(p.id)}
                                        className="inline-flex min-h-13 items-center rounded-lg px-3 font-semibold text-primary underline"
                                    >
                                        {p.label}
                                    </button>
                                </TableCell>
                                <TableCell>
                                    {tanggalRingkas(p.tanggalKegiatan)}
                                </TableCell>
                                <TableCell>{p.sasaran}</TableCell>
                                <TableCell>{p.ditimbang}</TableCell>
                                <TableCell>
                                    {persenSaja(p.ditimbang, p.sasaran)}%
                                </TableCell>
                                <TableCell>
                                    {p.id === periodeAktif ? (
                                        <span className="inline-flex items-center rounded-md bg-tone-green-bg px-3 py-1 text-sm font-bold text-tone-green">
                                            Sedang dilihat
                                        </span>
                                    ) : (
                                        'Selesai'
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Halaman>
    );
}
