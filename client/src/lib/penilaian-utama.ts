import type { PenilaianGizi, Pengukuran, Periode } from '../types/posyandu';

/** Riwayat lama tidak pernah menjadi status utama periode yang dipilih. */
export function terbaruUntuk(
    pengukuran: Pengukuran[],
    periode: Periode,
): Pengukuran | null {
    return (
        pengukuran
            .filter(
                (p) =>
                    p.statusKehadiran === 'hadir' &&
                    p.tanggalUkur !== null &&
                    p.periodeId === periode.id &&
                    (p.bbKg !== null || p.tinggiCm !== null),
            )
            .sort((a, b) =>
                (b.tanggalUkur ?? '').localeCompare(a.tanggalUkur ?? ''),
            )[0] ?? null
    );
}

/** Flag WHO menahan indeks itu dari keputusan, tetapi tidak menghapus arsip. */
export function penilaianLayak(
    nilai: PenilaianGizi | undefined,
): PenilaianGizi | undefined {
    return nilai?.tidakWajar ? undefined : nilai;
}
