/** The same KMS rules apply to dated measurements and month-only archives. */
export type TitikPertumbuhan = {
    anakId: number;
    periodeId: string;
    umurBulan: number;
    bbKg: number | null;
    zBbU: number | null;
    hadir: boolean;
};

const KBM_AWAL = [800, 900, 800, 600, 500];
export function kbmGram(bulan: number): number {
    if (bulan <= 0) return 0;
    if (bulan <= KBM_AWAL.length) return KBM_AWAL[bulan - 1];
    if (bulan === 6) return 400;
    if (bulan <= 12) return 300;
    return 200;
}

export function bulanSebelumnya(periode: string): string {
    const [tahun, bulan] = periode.split('-').map(Number);
    return bulan === 1 ? `${tahun - 1}-12` : `${tahun}-${String(bulan - 1).padStart(2, '0')}`;
}

export function kunciTitik(row: Pick<TitikPertumbuhan, 'anakId' | 'periodeId'>): string {
    return `${row.anakId}:${row.periodeId}`;
}

export function hitungPertumbuhan(kini: TitikPertumbuhan, lalu?: TitikPertumbuhan): {
    kenaikanGram: number | null; kbmGram: number | null; nt: 'N' | 'T' | null;
} {
    // A gap or absence is not a zero gain and cannot be bridged silently.
    if (!lalu || lalu.anakId !== kini.anakId || lalu.periodeId !== bulanSebelumnya(kini.periodeId) ||
        !kini.hadir || !lalu.hadir || kini.bbKg === null || lalu.bbKg === null) {
        return { kenaikanGram: null, kbmGram: null, nt: null };
    }
    const kenaikanGram = Math.round((kini.bbKg - lalu.bbKg) * 1000);
    const kbm = kbmGram(Math.floor(kini.umurBulan));
    const turunGaris = kini.zBbU !== null && lalu.zBbU !== null && Math.floor(kini.zBbU) < Math.floor(lalu.zBbU);
    return { kenaikanGram, kbmGram: kbm, nt: kenaikanGram < kbm || turunGaris ? 'T' : 'N' };
}
