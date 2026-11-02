/**
 * Sel tabel z-score — docs/10-prd-demo-frontend.md bagian 8.3.
 *
 * Dua desimal, `—` bila kosong, dan penanda bila nilainya di luar rentang yang
 * masuk akal secara biologis. Nilai `tidak_wajar` **tetap ditampilkan** dengan
 * penanda, bukan disaring keluar — prinsip P3 docs/05-uiux-spec.md: data yang
 * salah harus terlihat, bukan tersembunyi.
 */

import { TriangleAlert } from 'lucide-react';
import { nadaKategori } from '@/components/status-gizi-badge';
import { KOSONG, zScore } from '@/lib/format';
import { kesimpulanZScore } from '@/lib/kategori';
import type { PenilaianGizi } from '@/types/posyandu';

type Props = { nilai: PenilaianGizi | undefined };

const WARNA_NADA: Record<string, string> = {
    merah: 'text-tone-red bg-tone-red/10 border-tone-red/25',
    oranye: 'text-tone-amber bg-tone-amber/10 border-tone-amber/25',
    hijau: 'text-tone-green bg-tone-green/10 border-tone-green/25',
    biru: 'text-tone-blue bg-tone-blue/10 border-tone-blue/25',
    netral: 'text-muted-foreground bg-muted border-border',
};

export default function ZScoreCell({ nilai }: Props) {
    if (nilai === undefined) {
        return <span className="text-muted-foreground">{KOSONG}</span>;
    }

    const kesimpulan = kesimpulanZScore(nilai.kategori, nilai.z);
    const nada = nadaKategori(nilai.kategori);

    return (
        <span className="block">
            <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                {zScore(nilai.z)}
                {nilai.tidakWajar && (
                    <TriangleAlert
                        className="size-4 shrink-0 text-tone-amber"
                        strokeWidth={2.5}
                        aria-label="Nilai di luar rentang wajar, perlu diperiksa"
                    />
                )}
            </span>
            {/* Informasi kesimpulan langsung z-score: Normal, Gemuk, atau Kurang dengan lencana semantik */}
            {kesimpulan !== null && (
                <span
                    className={`mt-0.5 inline-block rounded border px-1.5 py-0.2 text-[11px] font-bold ${WARNA_NADA[nada] ?? WARNA_NADA.netral}`}
                >
                    {kesimpulan}
                </span>
            )}
        </span>
    );
}
