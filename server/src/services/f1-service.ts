import type { Pool } from 'pg';
import type { PenggunaAktif } from '../auth/peran.ts';
import { dasarF1 } from '../repositories/f1-repository.ts';
import { laporan } from './laporan-service.ts';
import { umurBulan } from './laporan-perhitungan.ts';
import { kategoriEkonomi } from './f1-sumber.ts';

export type AnakF1 = {anakId:number;nama:string;jk:string;rt:string;umur:number|null;ntob:string|null;gng:'G'|'NG'|null;
    desil:number|null;asi:boolean|null;diukur:boolean;duaT:boolean|null;kategori:string|null;bb:number|null;
    tanggal:string|null;sumberEkonomi:string|null;periodeEkonomi:string|null;tidakHadir:boolean};
export type KelompokF1 = {id:number;nama:string;rw:string;kelurahan:string;tanggal:string|null;anak:AnakF1[]};
export type DataF1 = {periode:string;kelompok:KelompokF1[]};

export function susunF1(periode: string, dasar: any[], hasil: Awaited<ReturnType<typeof laporan>>): DataF1 {
    const kelompok = new Map<number,KelompokF1>();
    const ukur = new Map(hasil.bulanan.map(r=>[Number(r.anakId),r]));
    const duaT = new Set(hasil.riwayat2T.filter(r=>r.periodeId===periode).map(r=>Number(r.anakId)));
    for (const r of dasar) {
        const id=Number(r.posyanduId);
        if (!kelompok.has(id)) kelompok.set(id,{id,nama:r.posyandu,rw:r.rw??'',kelurahan:r.kelurahan??'',tanggal:r.tanggalKegiatan,anak:[]});
        const u=ukur.get(Number(r.anakId));
        const tanggal=r.tanggalUkur??r.tanggalKegiatan;
        const umur=tanggal?umurBulan(r.tglLahir,tanggal):null;
        const raw=String(r.ntobRaw??'').trim().toUpperCase();
        // B/O harus mempunyai penandaan sumber; riwayat impor yang belum lengkap
        // tidak membuktikan bahwa seorang anak baru pertama kali ditimbang.
        const ntob=!r.diukur?null:['B','O'].includes(raw)?raw:u?.nt??(['N','T'].includes(raw)?raw:null);
        kelompok.get(id)!.anak.push({anakId:Number(r.anakId),nama:r.nama,jk:r.jk,rt:r.rt,umur,ntob,
            gng:kategoriEkonomi(r.desil,r.gng),desil:r.desil??null,asi:r.asi??null,diukur:!!r.diukur,
            duaT:r.diukur?(duaT.has(Number(r.anakId))?true:u?.nt?u.duaT:null):null,
            kategori:(u?.penilaian['PERMENKES-2-2020']?.BB_U?.kategori as string)??null,bb:r.bb??null,tanggal,
            sumberEkonomi:r.sumberEkonomi??null,periodeEkonomi:r.periodeEkonomi??null,tidakHadir:r.statusSasaran==='tidak_hadir'});
    }
    return {periode,kelompok:[...kelompok.values()]};
}
export async function dataF1(pool: Pool,user: PenggunaAktif,periode:string): Promise<DataF1> {
    const dasar=await dasarF1(pool,user,periode);
    const hasil=await laporan(pool,user,periode);
    return susunF1(periode,dasar,hasil);
}
