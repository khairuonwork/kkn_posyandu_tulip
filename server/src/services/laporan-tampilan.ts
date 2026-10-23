/** Aturan penyajian laporan; tidak mengubah skor/kategori klinis tersimpan. */
export const AMBANG_PERINGATAN_INTERNAL = -1.96;

/** Deskripsi posisi terhadap acuan, bukan diagnosis gizi akut berdasarkan LILA. */
export function deskripsiSdLila(z: number | null): string | null {
    if (z === null || !Number.isFinite(z)) return null;
    if (z < -2) return 'Di bawah −2 SD';
    if (z > 2) return 'Di atas +2 SD';
    return '−2 s.d. +2 SD';
}

/** B hanya dari penandaan sumber; kehilangan pembanding tidak berarti anak baru. */
export function kodeNtb(row: { nt: 'N' | 'T' | null; ntobRaw: string | null }): 'N' | 'T' | 'B' | null {
    if (row.nt !== null) return row.nt;
    const raw = row.ntobRaw?.trim().toUpperCase().replace(/\s+/g, ' ');
    if (raw === 'B' || raw === 'BARU') return 'B';
    if (raw === 'N' || raw === 'NAIK') return 'N';
    if (raw === 'T' || raw === 'TIDAK NAIK') return 'T';
    return null;
}
