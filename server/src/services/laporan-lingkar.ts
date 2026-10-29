import type { BarisLaporan } from '../repositories/laporan-repository.ts';

/** Nilai bawaan hanya untuk laporan; tidak menjadi rekam pengukuran baru. */
export function teruskanLingkar<T extends Pick<BarisLaporan, 'anakId' | 'periodeId' | 'tanggalUkur' | 'statusKehadiran' | 'lilaCm' | 'likaCm'>>(rows: T[]): (T & { sumberLingkar: Partial<Record<'lilaCm' | 'likaCm', string>>; perluUkurLingkar: string[] })[] {
    const terakhir = new Map<string, { bulan: number; nilai: number; tanggal: string }>();
    const hasil = new Map<T, T & { sumberLingkar: Partial<Record<'lilaCm' | 'likaCm', string>>; perluUkurLingkar: string[] }>();
    const nomorBulan = (id: string) => Number(id.slice(0, 4)) * 12 + Number(id.slice(5, 7));
    for (const row of [...rows].sort((a, b) => a.tanggalUkur.localeCompare(b.tanggalUkur))) {
        const copy = { ...row, sumberLingkar: {} as Partial<Record<'lilaCm' | 'likaCm', string>>, perluUkurLingkar: [] as string[] };
        const bulan = nomorBulan(row.periodeId);
        for (const key of ['lilaCm', 'likaCm'] as const) {
            const id = `${row.anakId}:${key}`;
            const lama = terakhir.get(id);
            if (row.statusKehadiran !== 'hadir') continue;
            if (row[key] !== null && row[key]! > 0) {
                terakhir.set(id, { bulan, nilai: row[key]!, tanggal: row.tanggalUkur });
            } else if (lama && bulan >= lama.bulan && bulan - lama.bulan < 3) {
                copy[key] = lama.nilai;
                copy.sumberLingkar[key] = lama.tanggal;
            } else {
                copy[key] = null;
                copy.perluUkurLingkar.push(key);
            }
        }
        hasil.set(row, copy);
    }
    return rows.map(row => hasil.get(row)!);
}
