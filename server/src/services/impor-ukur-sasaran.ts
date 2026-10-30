import type { PoolClient } from 'pg';
import type { TabelStandar } from '../antropometri/tabel-standar.ts';
import { hitungPenilaian, umurBulanPada } from '../antropometri/penilaian-gizi.ts';
import { simpanPenilaian } from '../repositories/penilaian-gizi-repository.ts';
import { cocokkanHistoris, type IdentitasHistoris } from './pengukuran-historis.ts';
import type { SheetSasaran } from './sasaran-excel.ts';

export async function identitasImpor(db: PoolClient, posyanduId: number): Promise<IdentitasHistoris[]> {
    return (await db.query<IdentitasHistoris>(`SELECT a.id,a.nik,a.nama,to_char(a.tgl_lahir,'YYYY-MM-DD') AS "tglLahir",a.jk,w.rt
        FROM anak a JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
        WHERE a.deleted_at IS NULL AND w.posyandu_id=$1`, [posyanduId])).rows;
}

/** Dalam transaksi impor yang sama. Identitas lama diambil sebelum profil diperbarui. */
export async function simpanUkurSasaran(db: PoolClient, sheet: SheetSasaran, periodeId: number,
    identitas: IdentitasHistoris[], tabel: TabelStandar, namaFile: string) {
    const hasil = cocokkanHistoris(sheet.baris, identitas, sheet.periode);
    let tersimpan = 0;
    let sudahAda = 0;
    for (const { sumber, anak } of hasil.siap) {
        const ukur = sumber.pengukuran!;
        const jenisUkur = umurBulanPada(anak.tglLahir, ukur.tanggalUkur) < 24 ? 'PB' : 'TB';
        const nilai = { ...ukur, tglLahir: anak.tglLahir, jk: anak.jk as 'L' | 'P', jenisUkur: jenisUkur as 'PB' | 'TB' };
        const inserted = await db.query<{ id: number }>(`INSERT INTO pengukuran
            (anak_id,periode_id,tanggal_ukur,bb_kg,tinggi_cm,jenis_ukur,lila_cm,lika_cm,ntob_raw,status_kehadiran,sumber,catatan)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'hadir','import',$10)
            ON CONFLICT(anak_id,periode_id) DO NOTHING RETURNING id`,
        [anak.id,periodeId,ukur.tanggalUkur,ukur.bbKg,ukur.tinggiCm,jenisUkur,ukur.lilaCm,ukur.likaCm,
            ukur.ntob?.slice(0,8) ?? null, `${namaFile} / ${sheet.sheet} / baris ${sumber.barisAsal}; posisi PB/TB diasumsikan menurut umur.`]);
        if (!inserted.rows.length) { sudahAda++; continue; }
        await simpanPenilaian(db, inserted.rows[0].id, 'WHO-2006', hitungPenilaian(tabel, nilai));
        await db.query(`UPDATE sasaran SET status='selesai',diselesaikan_pada=now()
            WHERE periode_id=$1 AND anak_id=$2`, [periodeId, anak.id]);
        tersimpan++;
    }
    return { tersimpan, sudahAda, ditahan: hasil.ditahan, tidakDiukur: hasil.tidakDiukur.length };
}
