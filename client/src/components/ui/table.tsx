import { ChevronDown, ChevronUp } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

function Table({
    className,
    containerClassName,
    ...props
}: React.ComponentProps<'table'> & {
    /**
     * Kelas untuk wadah yang menggulir, bukan untuk <table>-nya.
     *
     * Dipakai layar yang membatasi tinggi tabelnya ke tinggi jendela: wadah
     * inilah yang harus diberi `flex-1 min-h-0`, karena ia yang memegang
     * gulirnya dan tempat `position: sticky` kepala kolom berlabuh.
     */
    containerClassName?: string;
}) {
    return (
        // Wadah yang menggulir harus bisa digeser dengan panah papan tombol,
        // bukan hanya dengan jari atau roda tetikus (WCAG 2.1.1). Tanpa
        // tabIndex, tabel SKDN sembilan kolom tidak terjangkau sama sekali di
        // layar sempit.
        <div
            data-slot="table-container"
            tabIndex={0}
            className={cn(
                'gulir-dalam relative w-full overflow-x-auto',
                containerClassName,
            )}
        >
            <table
                data-slot="table"
                className={cn('w-full caption-bottom text-base', className)}
                {...props}
            />
        </div>
    );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
    return (
        <thead
            data-slot="table-header"
            // Garis bawah kepala kolom digambar tiap sel (lihat TableHead),
            // bukan oleh barisnya: garis milik <tr> hilang saat kepala menempel.
            className={cn('[&_tr]:border-b-0', className)}
            {...props}
        />
    );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
    return (
        <tbody
            data-slot="table-body"
            className={cn('[&_tr:last-child]:border-0', className)}
            {...props}
        />
    );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
    return (
        <tfoot
            data-slot="table-footer"
            className={cn(
                'border-t-2 border-border-strong bg-surface font-extrabold [&>tr]:last:border-b-0',
                className,
            )}
            {...props}
        />
    );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
    return (
        <tr
            data-slot="table-row"
            // Garis antarbaris 1 px berwarna --rule (#A3ACA1): cukup gelap
            // untuk diikuti mata di 101 baris, tanpa menebalkan tabel.
            className={cn('border-b border-rule transition-colors', className)}
            {...props}
        />
    );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
    return (
        <th
            data-slot="table-head"
            className={cn(
                // Kepala kolom abu sangat muda dengan garis bawah 2 px. Garisnya
                // bayangan ke dalam, bukan border: kepala tabel Data Balita
                // menempel saat digulir, dan border sel `sticky` tertinggal di
                // belakang. Latarnya wajib opak untuk alasan yang sama.
                'h-13 bg-surface px-3.5 text-left align-middle text-sm font-bold whitespace-nowrap text-muted-foreground shadow-[inset_0_-2px_0_var(--border-strong)] first:pl-5.5 last:pr-5.5',
                className,
            )}
            {...props}
        />
    );
}

/**
 * Kepala kolom yang bisa diurutkan: satu tombol selebar sel, dua panah kecil
 * yang menandai arahnya, dan `aria-sort` untuk pembaca layar.
 */
function TableHeadUrut({
    label,
    keterangan,
    aktif,
    naik,
    onUrut,
    pertama = false,
    terakhir = false,
    kanan = false,
    className,
}: {
    label: string;
    /**
     * Baris kedua di bawah label, untuk kolom berkode seperti SKDN: "S" di
     * atas, "Sasaran" di bawahnya.
     */
    keterangan?: string;
    aktif: boolean;
    naik: boolean;
    onUrut: () => void;
    /** Kolom paling kiri berbantalan 20 px, sama dengan sel di bawahnya. */
    pertama?: boolean;
    /** Kolom paling kanan, juga berbantalan 20 px. */
    terakhir?: boolean;
    /** Kolom angka: judulnya rata kanan seperti angkanya. */
    kanan?: boolean;
    className?: string;
}) {
    const panah = (
        <span aria-hidden="true" className="flex flex-col">
            <ChevronUp
                className={cn(
                    '-mb-1 size-3',
                    aktif && naik ? 'text-primary' : 'text-input',
                )}
                strokeWidth={3}
            />
            <ChevronDown
                className={cn(
                    'size-3',
                    aktif && !naik ? 'text-primary' : 'text-input',
                )}
                strokeWidth={3}
            />
        </span>
    );

    return (
        <TableHead
            scope="col"
            aria-sort={aktif ? (naik ? 'ascending' : 'descending') : 'none'}
            className={cn(
                'p-0 first:pl-0 last:pr-0',
                keterangan !== undefined && 'align-bottom',
                className,
            )}
        >
            <button
                type="button"
                onClick={onUrut}
                className={cn(
                    'w-full hover:bg-surface-alt',
                    pertama ? 'pl-5.5' : 'pl-3.5',
                    terakhir ? 'pr-5.5' : 'pr-3.5',
                    keterangan === undefined
                        ? 'flex min-h-13 items-center gap-1.5 font-bold whitespace-nowrap'
                        : 'block py-2',
                    kanan && (keterangan === undefined ? 'justify-end' : 'text-right'),
                )}
            >
                {keterangan === undefined ? (
                    <>
                        {label}
                        {panah}
                    </>
                ) : (
                    <>
                        <span
                            className={cn(
                                'flex items-center gap-1 text-base font-extrabold text-foreground',
                                kanan && 'justify-end',
                            )}
                        >
                            {label}
                            {panah}
                        </span>
                        <span className="block text-sm font-semibold whitespace-normal">
                            {keterangan}
                        </span>
                    </>
                )}
            </button>
        </TableHead>
    );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
    return (
        <td
            data-slot="table-cell"
            className={cn(
                'px-3.5 py-2.5 align-middle first:pl-5.5 last:pr-5.5',
                className,
            )}
            {...props}
        />
    );
}

function TableCaption({
    className,
    ...props
}: React.ComponentProps<'caption'>) {
    return (
        <caption
            data-slot="table-caption"
            className={cn('mt-4 text-sm text-muted-foreground', className)}
            {...props}
        />
    );
}

export {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeadUrut,
    TableHeader,
    TableRow,
};
