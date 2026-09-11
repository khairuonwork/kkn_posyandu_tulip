import * as React from 'react';

import { cn } from '@/lib/utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
    return (
        // Wadah yang menggulir harus bisa digeser dengan panah papan tombol,
        // bukan hanya dengan jari atau roda tetikus (WCAG 2.1.1). Tanpa
        // tabIndex, tabel SKDN sembilan kolom tidak terjangkau sama sekali di
        // layar sempit.
        <div
            data-slot="table-container"
            tabIndex={0}
            className="relative w-full overflow-x-auto"
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
            className={cn('[&_tr]:border-b-2', className)}
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
                'border-t-2 bg-surface font-extrabold [&>tr]:last:border-b-0',
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
            // Garis baris 2px, bukan 1px: ukuran artboard v2. Pada tabel
            // 101 baris garis rambut 1px hilang di antara teks 18px.
            className={cn('border-b-2 transition-colors', className)}
            {...props}
        />
    );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
    return (
        <th
            data-slot="table-head"
            className={cn(
                // Kepala kolom artboard: latar kartu, tebal 700, dipisah
                // garis 2px — bukan pita abu. Latar tetap wajib opak karena
                // kepala tabel Data Anak menempel saat digulir.
                'h-12 bg-card px-4 text-left align-middle text-sm font-bold text-muted-foreground whitespace-nowrap',
                className,
            )}
            {...props}
        />
    );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
    return (
        <td
            data-slot="table-cell"
            className={cn('px-4 py-3 align-middle', className)}
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
    TableHeader,
    TableRow,
};
