import { Mars, Venus } from 'lucide-react';
import type { JenisKelamin } from '@/types/posyandu';

/**
 * Jenis kelamin sebagai ikon dan kata utuh di bawah nama balita. Warnanya
 * mengikuti jenis kelamin (biru, merah muda); kata dan bentuk ikon tetap
 * terbaca saat dicetak hitam-putih. Kontras di putih 6,7 dan 6,0, di latar
 * baris yang disorot 5,9 dan 5,3.
 */
export default function JenisKelaminTeks({
    jk,
}: {
    jk: JenisKelamin | null | undefined;
}) {
    if (jk !== 'L' && jk !== 'P') {
        return null;
    }

    const Ikon = jk === 'L' ? Mars : Venus;

    return (
        <span
            className={`inline-flex items-center gap-1.5 ${
                jk === 'L' ? 'text-blue-700' : 'text-pink-700'
            }`}
        >
            <Ikon className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            {jk === 'L' ? 'Laki-laki' : 'Perempuan'}
        </span>
    );
}
