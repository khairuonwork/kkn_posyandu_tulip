import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { BarisRiwayatPengaturan } from '../tipe';

export function BagianRiwayat({
    riwayat,
}: {
    riwayat: BarisRiwayatPengaturan[];
}) {
    return (
        <>
            <Table
                aria-label="Riwayat perubahan pengaturan"
                containerClassName="lg:min-h-0 lg:flex-1"
            >
                <TableHeader className="sticky top-0 z-10">
                    <TableRow>
                        <TableHead scope="col" className="first:pl-7">
                            Waktu
                        </TableHead>
                        <TableHead scope="col">Oleh</TableHead>
                        <TableHead scope="col">Bagian</TableHead>
                        <TableHead scope="col" className="last:pr-7">
                            Perubahan
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {riwayat.map((r) => (
                        <TableRow key={`${r.waktu}-${r.perubahan}`}>
                            <TableCell className="font-bold whitespace-nowrap first:pl-7">
                                {r.waktu}
                            </TableCell>
                            <TableCell>{r.oleh}</TableCell>
                            <TableCell>{r.bagian}</TableCell>
                            <TableCell className="last:pr-7">
                                {r.perubahan}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <p className="shrink-0 border-t border-border px-7 py-3 text-sm text-muted-foreground">
                Menampilkan {riwayat.length} perubahan · terbaru di atas
            </p>
        </>
    );
}
