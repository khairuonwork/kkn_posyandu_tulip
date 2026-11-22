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

type UkurRiwayat = {
    periodeId: string; tanggalUkur: string; bbKg: number | null; statusKehadiran: string;
    ntob: string | null; penilaian: Record<string, { z: number }>;
};

/**
 * N/T riwayat satu anak memakai aturan rekap (kenaikan vs KBM, turun garis).
 * Huruf sumber dipakai hanya bila bulan sebelumnya tidak dapat dibandingkan.
 */
export function ntRiwayat<T extends UkurRiwayat>(anakId: number, umurBulan: (tanggal: string) => number, daftar: T[]): T[] {
    const titik = new Map<T, TitikPertumbuhan>(daftar.map((p) => [p, {
        anakId, periodeId: p.periodeId, umurBulan: umurBulan(p.tanggalUkur), bbKg: p.bbKg,
        zBbU: p.penilaian.BB_U?.z ?? null, hadir: p.statusKehadiran === 'hadir',
    }]));
    const menaik = [...daftar].sort((a, b) => a.tanggalUkur.localeCompare(b.tanggalUkur));
    return daftar.map((p) => {
        const i = menaik.indexOf(p);
        const lalu = menaik.slice(0, i).findLast((q) => q.periodeId !== p.periodeId);
        const nt = hitungPertumbuhan(titik.get(p)!, lalu && titik.get(lalu)).nt;
        return { ...p, ntob: nt ?? p.ntob };
    });
}
