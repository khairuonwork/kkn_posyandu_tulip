import type { Pool } from 'pg';
import { boleh, type PenggunaAktif } from '../auth/peran.ts';
import { dalamTransaksi } from '../db/transaksi.ts';
import { dataHariH, simpanHariH, type BarisHariH } from '../repositories/beranda-repository.ts';

export class GalatHariH extends Error {
    status: number;
    constructor(status: number, pesan: string) { super(pesan); this.status = status; }
}

/** Data yang belum lengkap berbeda dari kehadiran nol yang sudah dikonfirmasi. */
export function jumlahHariH(rows: BarisHariH[], rt: string | null): number | null {
    const scope = rows.filter(r => rt === null || r.rt === rt);
    if (!scope.length || scope.some(r => r.hadirHariH === null)) return null;
    return scope.reduce((n,r) => n + r.hadirHariH!,0);
}

export async function ubahHariH(pool: Pool, pengguna: PenggunaAktif, badan: unknown) {
    if (!boleh(pengguna.peran,'ubah-pengukuran')) throw new GalatHariH(403,'Hanya Bidan atau Admin yang dapat mengubah rekap hari H.');
    if (!badan || typeof badan !== 'object') throw new GalatHariH(400,'Data kehadiran tidak valid.');
    const {periode,items} = badan as Record<string,unknown>;
    if (typeof periode !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periode) || !Array.isArray(items) || items.length > 200)
        throw new GalatHariH(400,'Pilih periode dan daftar RT yang valid.');
    const tersedia = await dataHariH(pool,pengguna,periode,periode);
    const keys = new Set<string>();
    const tanggalPeriode = new Map<number,string>();
    const perubahan: {periodeDbId:number;wilayahRtId:number;tanggalHariH:string;hadirHariH:number|null}[] = [];
    for (const item of items) {
        if (!item || typeof item !== 'object') throw new GalatHariH(400,'Baris kehadiran tidak valid.');
        const {periodeDbId,wilayahRtId,tanggalHariH,hadirHariH} = item;
        const key = `${periodeDbId}:${wilayahRtId}`;
        if (!Number.isSafeInteger(periodeDbId) || !Number.isSafeInteger(wilayahRtId) || keys.has(key)) throw new GalatHariH(400,'RT tidak valid atau berulang.');
        if (!tersedia.some(r => r.periodeDbId === periodeDbId && r.wilayahRtId === wilayahRtId)) throw new GalatHariH(404,'Periode atau RT tidak tersedia dalam wilayah Anda.');
        const d = new Date(`${tanggalHariH}T00:00:00Z`);
        if (hadirHariH !== null && (typeof hadirHariH !== 'number' || !Number.isInteger(hadirHariH) || hadirHariH < 0 || hadirHariH > 100000))
            throw new GalatHariH(400,'Jumlah hadir harus bilangan bulat nol atau lebih.');
        if (hadirHariH !== null && (typeof tanggalHariH !== 'string' || !tanggalHariH.startsWith(periode+'-') || Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== tanggalHariH))
            throw new GalatHariH(400,'Tanggal hari H harus valid dan berada pada periode yang dipilih.');
        if (hadirHariH !== null) {
            if (tanggalPeriode.has(periodeDbId) && tanggalPeriode.get(periodeDbId) !== tanggalHariH)
                throw new GalatHariH(400,'Tanggal hari H harus sama untuk seluruh RT dalam satu kegiatan Posyandu.');
            tanggalPeriode.set(periodeDbId,tanggalHariH);
        }
        keys.add(key);
        perubahan.push({periodeDbId,wilayahRtId,tanggalHariH,hadirHariH});
    }
    await dalamTransaksi(pool,{pengguna:pengguna.id,sumber:'rekap-hari-h'},async db => {
        for (const row of perubahan) await simpanHariH(db,pengguna,row);
    });
    return {status:'tersimpan',jumlah:perubahan.length};
}
