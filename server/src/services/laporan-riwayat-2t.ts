import type { BarisArsip2T } from '../repositories/riwayat-2t-repository.ts';
import { titikPengukuran, type BarisBertanda } from './laporan-perhitungan.ts';
import { bulanSebelumnya, hitungPertumbuhan, kunciTitik, type TitikPertumbuhan } from './laporan-pertumbuhan-bulanan.ts';

export type BarisRiwayat2T = Omit<BarisBertanda, 'tanggalUkur' | 'umurHari'> & {
    tanggalUkur: string | null;
    umurHari: number | null;
    sumberRiwayat?: 'arsip' | 'pengukuran';
    sumberFile?: string;
    status2T?: string;
};

/** A source-approved snapshot is a baseline for the next consecutive month.
 * It does not invent an exact measurement date for older source rows. */
export function statusArsip2T(rows: BarisArsip2T[]): Map<string, number> {
    return new Map(rows.map(r => [`${r.anakId}:${r.periodeLaporan}`, r.jumlahT]));
}

export function titikArsip(row: BarisArsip2T): TitikPertumbuhan {
    const value = row.penilaian['WHO-2006']?.BB_U?.z;
    return { anakId: row.anakId, periodeId: row.periodeId, umurBulan: row.umurBulan,
        bbKg: row.bbKg, hadir: true, zBbU: typeof value === 'number' ? value : null };
}

function dariArsip(row: BarisArsip2T, pembanding?: TitikPertumbuhan): BarisRiwayat2T {
    return {
        ...row, tanggalUkur: null, umurHari: null,
        umurLengkap: `${Math.floor(row.umurBulan / 12)}Thn${row.umurBulan % 12}Bln`,
        jenisUkur: null, ntobRaw: null, statusKehadiran: 'hadir',
        ...hitungPertumbuhan(titikArsip(row), pembanding), duaT: true,
        jumlahTBerturut: row.jumlahT, status2T: `${row.jumlahT}T`,
        sumberRiwayat: 'arsip', sumberFile: row.sumberFile,
    };
}

export function gabungRiwayat2T(semua: BarisBertanda[], arsip: BarisArsip2T[], periode: string): { rows: BarisRiwayat2T[]; anakArsip: number; anakHitung: number } {
    // The last source snapshot is only extended by a current, consecutive T.
    const aktif = new Map<number, { jumlahT: number; snapshot?: string }>();
    for (const row of semua.filter(r => r.periodeId === periode && r.statusKehadiran === 'hadir' && r.duaT)) {
        aktif.set(row.anakId, { jumlahT: row.jumlahTBerturut });
    }
    for (const row of arsip.filter(r => r.periodeLaporan === periode)) {
        aktif.set(row.anakId, { jumlahT: row.jumlahT, snapshot: periode });
    }
    const rows: BarisRiwayat2T[] = [];
    const pengukuranTersedia = new Map(semua.map(r => [kunciTitik(r), titikPengukuran(r)]));
    let anakArsip = 0;
    for (const [anakId, current] of aktif) {
        const latest = arsip.filter(r => r.anakId === anakId && r.periodeLaporan <= periode).at(-1)?.periodeLaporan;
        const snapshot = current.snapshot ?? latest;
        const historical = snapshot ? arsip.filter(r => r.anakId === anakId && r.periodeLaporan === snapshot) : [];
        const titikHistoris = new Map(historical.map(r => [kunciTitik(r), titikArsip(r)]));
        const live = semua.filter(r => r.anakId === anakId && r.periodeId <= periode).sort((a,b) => a.periodeId.localeCompare(b.periodeId));
        const periods = new Map<string, BarisRiwayat2T>();
        // A previous snapshot belongs only to the active chain, never a new
        // episode after recovery or a gap. The chain length includes this month.
        const [y,m] = periode.split('-').map(Number);
        const earliest = y * 12 + m - current.jumlahT + 1;
        const inChain = (p: string) => { const [year,month] = p.split('-').map(Number); return year * 12 + month >= earliest; };
        for (const row of historical.filter(r => inChain(r.periodeId))) {
            const key = `${anakId}:${bulanSebelumnya(row.periodeId)}`;
            // Compare the weights displayed in this archive first, and use a
            // dated observation when the source lacks the previous month.
            periods.set(row.periodeId, dariArsip(row, titikHistoris.get(key) ?? pengukuranTersedia.get(key)));
        }
        for (const row of live.filter(r => inChain(r.periodeId) && !periods.has(r.periodeId))) {
            periods.set(row.periodeId, { ...row, sumberRiwayat: 'pengukuran' });
        }
        if (current.snapshot) anakArsip++;
        rows.push(...[...periods.values()].sort((a,b) => a.periodeId.localeCompare(b.periodeId))
            .map(row => ({ ...row, status2T: `${current.jumlahT}T`, jumlahTBerturut: current.jumlahT })));
    }
    return { rows, anakArsip, anakHitung: aktif.size - anakArsip };
}
