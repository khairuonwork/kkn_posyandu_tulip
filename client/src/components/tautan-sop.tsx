import { ExternalLink } from 'lucide-react';
import { createContext, useContext } from 'react';
import type { Peran } from '@/types/posyandu';

export const PeranSop = createContext<Peran | null>(null);
export const DemoSop = createContext(false);

export function TautanSop({ id, judul }: { id: string; judul: string }) {
    const demo = useContext(DemoSop);
    return (
        <a
            className="tombol-kedua"
            href={demo ? `./sop/${encodeURIComponent(id)}.pdf` : `/api/sop/${encodeURIComponent(id)}`}
            target="_blank"
            rel="noopener"
            aria-label={`Buka ${judul} (PDF, tab baru)`}
        >
            Buka {judul}
            <ExternalLink className="size-4" aria-hidden="true" />
        </a>
    );
}

export function useSopHalaman(jenis?: 'admin' | 'kms') {
    const peran = useContext(PeranSop);
    if (jenis === undefined || (peran !== 'admin' && !(jenis === 'kms' && peran === 'kms'))) {
        return null;
    }

    return <TautanSop id={jenis} judul={jenis === 'kms' ? 'SOP KMS' : 'SOP Admin Posyandu'} />;
}
