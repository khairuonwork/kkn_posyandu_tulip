import { useState } from 'react';
import {
    CircleCheck,
    CircleMinus,
    Lock,
    Pencil,
    Plus,
    TriangleAlert,
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Peran } from '@/types/posyandu';
import { adminAktifTerakhir, NAMA_PERAN } from '../tipe';
import type { DaftarPengguna, IsianPengguna } from '../tipe';
import { DialogPengguna } from './dialog-pengguna';

export function BagianPengguna({
    peran,
    daftar,
    onSimpan,
}: {
    peran: Peran;
    daftar: DaftarPengguna;
    onSimpan: (
        id: number | null,
        isian: IsianPengguna,
    ) => Promise<string | null>;
}) {
    /** null: dialog tertutup; 'baru': tambah; angka: id yang diubah. */
    const [dialog, setDialog] = useState<'baru' | number | null>(null);

    if (peran !== 'admin') {
        return (
            <div className="px-7 pt-3.5">
                <div
                    role="note"
                    className="flex max-w-[640px] gap-2.5 rounded-lg bg-surface px-4 py-3.5"
                >
                    <Lock
                        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    <div>
                        <p className="text-base font-bold">Khusus admin</p>
                        <p className="mt-0.5 text-sm">
                            Menambah akun, mengubah peran, dan mengganti kata
                            sandi hanya dapat dilakukan oleh admin.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (daftar.status === 'memuat') {
        return (
            <p className="px-7 pt-3.5 text-base text-muted-foreground">
                Memuat daftar akun…
            </p>
        );
    }

    if (daftar.status === 'gagal') {
        return (
            <div className="px-7 pt-3.5">
                <div
                    role="alert"
                    className="flex max-w-[640px] gap-2.5 rounded-lg bg-tone-red-bg px-4 py-3.5"
                >
                    <TriangleAlert
                        className="mt-0.5 size-5 shrink-0 text-tone-red"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    <div>
                        <p className="text-base font-bold text-tone-red">
                            Daftar akun tidak dapat dimuat
                        </p>
                        <p className="mt-0.5 text-sm">
                            Periksa sambungan ke server, lalu ulangi.
                        </p>
                        <button
                            type="button"
                            onClick={daftar.ulangi}
                            className="tombol-kedua mt-3 px-5.5"
                        >
                            Ulangi
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const { pengguna, wilayahRt, posyandu } = daftar;
    const aktif = pengguna.filter((p) => p.aktif).length;
    const diubah =
        typeof dialog === 'number'
            ? (pengguna.find((p) => p.id === dialog) ?? null)
            : null;

    return (
        <>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4.5 gap-y-2 px-7 pt-3.5 pb-2.5">
                <p className="text-base">
                    <span className="font-extrabold">Pengguna</span>{' '}
                    <span className="text-sm text-muted-foreground">
                        · {aktif} aktif dari {pengguna.length} akun
                    </span>
                </p>
                <button
                    type="button"
                    onClick={() => setDialog('baru')}
                    className="tombol-utama"
                >
                    <Plus
                        className="size-5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Tambah pengguna
                </button>
            </div>

            <Table
                aria-label="Daftar pengguna"
                containerClassName="lg:min-h-0 lg:flex-1"
            >
                <TableHeader className="sticky top-0 z-10">
                    <TableRow>
                        <TableHead scope="col" className="bg-card first:pl-7">
                            Nama dan nama pengguna
                        </TableHead>
                        <TableHead scope="col" className="bg-card">
                            Peran
                        </TableHead>
                        <TableHead scope="col" className="bg-card">
                            Posyandu / RW
                        </TableHead>
                        <TableHead scope="col" className="bg-card">
                            Status
                        </TableHead>
                        <TableHead
                            scope="col"
                            className="bg-card text-right last:pr-7"
                        >
                            Aksi
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pengguna.map((p) => (
                        <TableRow key={p.id}>
                            <TableCell className="first:pl-7">
                                <span
                                    className={`block font-bold ${p.aktif ? '' : 'text-muted-foreground'}`}
                                >
                                    {p.nama}
                                </span>
                                <span className="block text-sm text-muted-foreground">
                                    {p.username}
                                </span>
                            </TableCell>
                            <TableCell>{NAMA_PERAN[p.peran]}</TableCell>
                            <TableCell className="whitespace-nowrap">
                                {p.superAdmin ? (
                                    <span className="font-semibold text-primary">
                                        Superadmin · semua RW
                                    </span>
                                ) : p.posyanduNama ? (
                                    <span>
                                        {p.posyanduNama} · RW {p.rw ?? '—'}
                                    </span>
                                ) : (
                                    <span className="text-tone-red">
                                        Belum ditetapkan
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-bold whitespace-nowrap ${
                                        p.aktif
                                            ? 'bg-tone-green-bg text-tone-green'
                                            : 'bg-surface-alt text-muted-foreground'
                                    }`}
                                >
                                    {p.aktif ? (
                                        <CircleCheck
                                            className="size-4"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <CircleMinus
                                            className="size-4"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                    )}
                                    {p.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </TableCell>
                            <TableCell className="py-1 text-right last:pr-7">
                                <button
                                    type="button"
                                    aria-label={`Ubah pengguna ${p.nama}`}
                                    onClick={() => setDialog(p.id)}
                                    className="tombol-ubah"
                                >
                                    <Pencil
                                        className="size-4.5"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Ubah
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {dialog !== null && (
                <DialogPengguna
                    pengguna={diubah}
                    terkunci={
                        diubah !== null &&
                        (diubah.superAdmin === true ||
                            adminAktifTerakhir(pengguna, diubah.id))
                    }
                    wilayahRt={wilayahRt}
                    posyandu={posyandu}
                    usernameTerpakai={pengguna
                        .filter((p) => p.id !== diubah?.id)
                        .map((p) => p.username)}
                    onTutup={() => setDialog(null)}
                    onSimpan={async (isian) => {
                        const galat = await onSimpan(
                            diubah?.id ?? null,
                            isian,
                        );

                        if (galat === null) {
                            setDialog(null);
                        }

                        return galat;
                    }}
                />
            )}
        </>
    );
}
