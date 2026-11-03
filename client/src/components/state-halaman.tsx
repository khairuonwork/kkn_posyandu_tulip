import { CircleAlert, Inbox, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export default function StateHalaman({
    jenis,
    judul,
    pesan,
    children,
}: {
    jenis: 'memuat' | 'galat' | 'kosong';
    judul: string;
    pesan?: string;
    children?: ReactNode;
}) {
    const Ikon =
        jenis === 'memuat'
            ? RefreshCw
            : jenis === 'galat'
              ? CircleAlert
              : Inbox;

    return (
        <div
            className="state-halaman"
            role={jenis === 'galat' ? 'alert' : 'status'}
        >
            <Ikon
                aria-hidden="true"
                className={
                    jenis === 'memuat'
                        ? 'size-12 animate-spin text-primary motion-reduce:animate-none'
                        : jenis === 'galat'
                          ? 'size-10 text-tone-red'
                          : 'size-10 text-muted-foreground'
                }
            />
            {jenis === 'memuat' ? (
                <p className="text-xl font-bold text-foreground">{judul}</p>
            ) : (
                <h3 className="text-lg font-bold">{judul}</h3>
            )}
            {pesan && (
                <p
                    className={`max-w-md text-muted-foreground ${jenis === 'memuat' ? 'text-base' : 'text-sm'}`}
                >
                    {pesan}
                </p>
            )}
            {children && (
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {children}
                </div>
            )}
        </div>
    );
}
