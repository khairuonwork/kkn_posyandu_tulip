/**
 * Sel tabel z-score — docs/10-prd-demo-frontend.md bagian 8.3.
 *
 * Dua desimal, `—` bila kosong, dan penanda bila nilainya di luar rentang yang
 * masuk akal secara biologis. Nilai `tidak_wajar` **tetap ditampilkan** dengan
 * penanda, bukan disaring keluar — prinsip P3 docs/05-uiux-spec.md: data yang
 * salah harus terlihat, bukan tersembunyi.
 */

import { TriangleAlert } from 'lucide-react';
import { KOSONG, zScore } from '@/lib/format';
import { kesimpulanZScore } from '@/lib/kategori';
import type { PenilaianGizi } from '@/types/posyandu';

type Props = { nilai: PenilaianGizi | undefined };

export default function ZScoreCell({ nilai }: Props) {
    if (nilai === undefined) {
        return <span className="text-muted-foreground">{KOSONG}</span>;
    }

    const kesimpulan = kesimpulanZScore(nilai.kategori, nilai.z);

    return (
        <span className="block">
            <span className="inline-flex items-center gap-1.5">
                {zScore(nilai.z)}
                {nilai.tidakWajar && (
                    <TriangleAlert
                        className="size-4 shrink-0 text-tone-amber"
                        strokeWidth={2.5}
                        aria-label="Nilai di luar rentang wajar, perlu diperiksa"
                    />
                )}
            </span>
            {/* Informasi kesimpulan langsung z-score: Normal, Gemuk, atau Kurang */}
            {kesimpulan !== null && (
                <span className="block text-sm font-semibold text-muted-foreground">
                    {kesimpulan}
                </span>
            )}
        </span>
    );
}
