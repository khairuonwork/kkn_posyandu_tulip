import { ArrowLeft, CircleCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import Halaman from '@/components/halaman';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AntreanKms } from '@/lib/antrean-kms';
import { Link } from '@/lib/nav';
import { CONTOH_ANTREAN_KMS } from '@/pages/kms';

function bacaSelesai(): AntreanKms[] {
    try {
        const tersimpan = localStorage.getItem('simulasi-kms-items');
        const items = tersimpan ? JSON.parse(tersimpan) as AntreanKms[] : CONTOH_ANTREAN_KMS;

        return items.filter((item) => item.status === 'done');
    } catch {
        return CONTOH_ANTREAN_KMS.filter((item) => item.status === 'done');
    }
}

export default function KmsSelesaiDemo() {
    const [selesai, setSelesai] = useState(bacaSelesai);

    useEffect(() => {
        const perbarui = (event: StorageEvent) => {
            if (event.key === 'simulasi-kms-items' || event.key === null) {
                setSelesai(bacaSelesai());
            }
        };
        window.addEventListener('storage', perbarui);

        return () => window.removeEventListener('storage', perbarui);
    }, []);

    return (
        <Halaman judul="Pemeriksaan selesai" subjudul="Pemeriksaan KMS · Data simulasi" ikon={CircleCheck}
            aksi={<Link href="/kms" className="tombol-kedua">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Kembali ke Pemeriksaan KMS
            </Link>}>
            <section aria-labelledby="judul-selesai-lengkap" className="w-full min-w-0">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id="judul-selesai-lengkap" className="text-lg font-bold">Hari ini</h2>
                    <p className="text-sm text-muted-foreground">{selesai.length} pemeriksaan dikonfirmasi selesai</p>
                </div>
                {selesai.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground" role="status">
                        Belum ada pemeriksaan yang selesai hari ini.
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <Table aria-label="Pemeriksaan yang selesai hari ini" className="min-w-[540px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead scope="col">No. antrean</TableHead>
                                    <TableHead scope="col">Nama balita</TableHead>
                                    <TableHead scope="col">RT</TableHead>
                                    <TableHead scope="col">Orang tua</TableHead>
                                    <TableHead scope="col">Tindakan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selesai.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-semibold tabular-nums">
                                            A{String(item.nomor).padStart(2, '0')}
                                        </TableCell>
                                        <TableCell className="font-bold">{item.nama}</TableCell>
                                        <TableCell>{item.rt || 'Belum tercatat'}</TableCell>
                                        <TableCell>{item.namaOrtu || 'Belum tercatat'}</TableCell>
                                        <TableCell>
                                            {item.anakId > 0 && (
                                                <Link href={`/balita/${item.anakId}`} className="inline-flex min-h-[44px] items-center font-bold text-primary underline underline-offset-2">
                                                    Buka kartu
                                                </Link>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </section>
        </Halaman>
    );
}
