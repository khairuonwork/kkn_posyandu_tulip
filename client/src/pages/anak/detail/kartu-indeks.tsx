import { nadaKategori } from '@/components/status-gizi-badge';
import { KOSONG, zScore } from '@/lib/format';
import { kesimpulanZScore } from '@/lib/kategori';
import type { PenilaianGizi } from '@/types/posyandu';
import { WARNA_NADA } from './tipe';

/**
 * Satu kartu indeks: judul, z-score 36 px berwarna, lalu kategorinya.
 *
 * Bentuk kartu artboard Detail. Kategori selalu ditulis penuh — warna tidak
 * pernah menjadi satu-satunya penanda (05-uiux-spec.md bagian 3).
 */
export function KartuIndeks({
    label,
    nilai,
}: {
    label: string;
    nilai: PenilaianGizi | undefined;
}) {
    const kesimpulan = kesimpulanZScore(nilai?.kategori, nilai?.z);
    const warna = WARNA_NADA[nadaKategori(kesimpulan)];

    return (
        <div className="kartu p-5">
            <p className="text-sm font-bold text-muted-foreground">{label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span
                    className={`text-3xl leading-none font-extrabold ${warna}`}
                >
                    {nilai === undefined ? KOSONG : zScore(nilai.z)}
                </span>
                <span className="text-sm text-muted-foreground">SD</span>
            </p>
            <p className={`mt-1.5 text-base font-bold text-pretty ${warna}`}>
                {kesimpulan}
            </p>
        </div>
    );
}
