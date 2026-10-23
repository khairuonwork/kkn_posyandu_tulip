import type { Pool, PoolClient } from 'pg';
import type { KelompokKia, PertanyaanKia } from '../edukasi/kia-2024.ts';
import type { IsianSurveiKia, JawabanKia } from '../services/survei-kia-domain.ts';

export type CatatanSurveiKia = {
    id:number; tanggal:string; versiBuku:string; kelompokId:string; kelompokLabel:string;
    umurBulan:number; umurHari:number; halaman:string; pertanyaan:PertanyaanKia[];
    jawaban:JawabanKia; catatan:string; tindakLanjut:string; dibahas:boolean;
    petugas:string; revisi:number; diperbarui:string;
};
export async function riwayatSurveiKia(db:Pool | PoolClient,anakId:number):Promise<CatatanSurveiKia[]> {
    return (await db.query<CatatanSurveiKia>(`SELECT s.id,to_char(s.tanggal,'YYYY-MM-DD') tanggal,
        s.versi_buku AS "versiBuku",s.kelompok_id AS "kelompokId",s.kelompok_label AS "kelompokLabel",
        s.umur_bulan AS "umurBulan",s.umur_hari AS "umurHari",s.halaman,s.pertanyaan_snapshot AS pertanyaan,
        s.jawaban,s.catatan,s.tindak_lanjut AS "tindakLanjut",s.dibahas,p.nama AS petugas,s.revisi,
        s.updated_at::text AS diperbarui
        FROM survei_perkembangan_kia s JOIN pengguna p ON p.id=s.dicatat_oleh
        WHERE s.anak_id=$1 ORDER BY s.tanggal DESC,s.id DESC LIMIT 12`,[anakId])).rows;
}
export async function simpanSurveiKia(db:PoolClient,anakId:number,penggunaId:number,kelompok:KelompokKia,
    umur:{bulan:number;hariTotal:number},input:IsianSurveiKia):Promise<boolean> {
    const result=await db.query(`INSERT INTO survei_perkembangan_kia
        (anak_id,tanggal,versi_buku,kelompok_id,kelompok_label,umur_bulan,umur_hari,halaman,pertanyaan_snapshot,
         jawaban,catatan,tindak_lanjut,dibahas,dicatat_oleh)
        SELECT $1::bigint,$2::date,$3::varchar(32),$4::varchar(32),$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14
        WHERE $15::int=0 OR EXISTS(SELECT 1 FROM survei_perkembangan_kia WHERE anak_id=$1::bigint AND tanggal=$2::date AND versi_buku=$3::varchar(32) AND kelompok_id=$4::varchar(32))
        ON CONFLICT(anak_id,tanggal,versi_buku,kelompok_id) DO UPDATE SET
            pertanyaan_snapshot=EXCLUDED.pertanyaan_snapshot,jawaban=EXCLUDED.jawaban,catatan=EXCLUDED.catatan,
            tindak_lanjut=EXCLUDED.tindak_lanjut,dibahas=EXCLUDED.dibahas,dicatat_oleh=EXCLUDED.dicatat_oleh,
            umur_bulan=EXCLUDED.umur_bulan,umur_hari=EXCLUDED.umur_hari,
            revisi=survei_perkembangan_kia.revisi+1,updated_at=now()
        WHERE survei_perkembangan_kia.revisi=$15::int RETURNING id`,
    [anakId,input.tanggal,input.versiBuku,kelompok.id,kelompok.label,umur.bulan,umur.hariTotal,kelompok.halaman,
        JSON.stringify(kelompok.pertanyaan),JSON.stringify(input.jawaban),input.catatan,input.tindakLanjut,input.dibahas,penggunaId,input.revisi]);
    return result.rowCount===1;
}
