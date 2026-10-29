import type { Pool } from 'pg';
import type { PenggunaAktif } from '../auth/peran.ts';
import { dalamTransaksi } from '../db/transaksi.ts';
import { panduanMakanKia, SUMBER_KIA } from '../edukasi/kia-2024.ts';
import { ambil } from './anak-service.ts';
import { riwayatSurveiKia, simpanSurveiKia } from '../repositories/survei-kia-repository.ts';
import { GalatSurveiKia,hariIniJakarta,kelompokUntukUmur,ringkasJawaban,umurKia,validasiSurveiKia } from './survei-kia-domain.ts';

export async function pendampinganKia(pool:Pool,pengguna:PenggunaAktif,anakId:number,tanggal=hariIniJakarta()) {
    const anak=await ambil(pool,pengguna,anakId);
    const umur=umurKia(anak.tglLahir,tanggal);
    const kelompok=kelompokUntukUmur(umur);
    const riwayat=await riwayatSurveiKia(pool,anakId);
    const terkini=riwayat.find(r=>r.tanggal===tanggal && r.kelompokId===kelompok?.id && r.versiBuku===SUMBER_KIA.versi)??null;
    return { tanggal,umur,kelompok,sumber:SUMBER_KIA,
        makan:kelompok && umur?panduanMakanKia(umur.bulan):null,
        layanan:'Datang setiap bulan ke Posyandu atau fasilitas kesehatan untuk memantau pertumbuhan dan perkembangan. Cocokkan jadwal imunisasi serta layanan lain pada Buku KIA bersama petugas.',
        bahaya:{halaman:umur && umur.hariTotal<=28?'41':'51, 74–77',
            pesan:'Jika anak sesak napas, tampak biru, sangat lemah, atau tidak mau minum/menyusu, segera cari pertolongan tenaga kesehatan. Jangan menunggu survei selesai.'},
        terkini,riwayat,ringkasan:kelompok?ringkasJawaban(kelompok,terkini?.jawaban??{}):null,
    };
}
export async function catatPendampinganKia(pool:Pool,pengguna:PenggunaAktif,anakId:number,body:unknown,tanggal=hariIniJakarta()) {
    await ambil(pool,pengguna,anakId);
    await dalamTransaksi(pool,{pengguna:pengguna.id,sumber:'survei-perkembangan-kia'},async db=>{
        const {rows}=await db.query<{tglLahir:string}>(`SELECT to_char(tgl_lahir,'YYYY-MM-DD') AS "tglLahir" FROM anak WHERE id=$1 AND deleted_at IS NULL FOR SHARE`,[anakId]);
        if(rows.length!==1) throw new GalatSurveiKia(404,'Anak tidak ditemukan.');
        const umur=umurKia(rows[0].tglLahir,tanggal);
        const kelompok=kelompokUntukUmur(umur);
        const input=validasiSurveiKia(body,kelompok,tanggal);
        if(!umur || !kelompok) throw new GalatSurveiKia(400,'Periksa tanggal lahir dan usia anak.');
        if(!await simpanSurveiKia(db,anakId,pengguna.id,kelompok,umur,input)) {
            throw new GalatSurveiKia(409,'Catatan sudah diperbarui petugas lain. Muat ulang panduan sebelum menyimpan lagi.');
        }
    });
    return pendampinganKia(pool,pengguna,anakId,tanggal);
}
