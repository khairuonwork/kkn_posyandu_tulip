import type { JenisKelamin } from '@/types/posyandu';

/** Penanda yang sama pada daftar balita dan laporan. Data kosong tidak ditebak. */
export default function JenisKelaminBadge({
    jk,
}: {
    jk: JenisKelamin | null | undefined;
}) {
    if (jk !== 'L' && jk !== 'P') {
        return null;
    }

    const label = jk === 'L' ? 'Laki-laki' : 'Perempuan';

    return (
        <span
            role="img"
            aria-label={label}
            title={label}
            className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] leading-none font-extrabold ${
                jk === 'L'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-pink-100 text-pink-800'
            }`}
        >
            {jk}
        </span>
    );
}
