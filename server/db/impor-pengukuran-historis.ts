import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import { dalamTransaksi } from '../src/db/transaksi.ts';
import { bacaWorkbookSasaran } from '../src/services/sasaran-excel.ts';
import { cocokkanHistoris, type IdentitasHistoris } from '../src/services/pengukuran-historis.ts';
import { hitungPenilaian, umurBulanPada } from '../src/antropometri/penilaian-gizi.ts';
import { muatTabelStandar } from '../src/repositories/standar-lms-repository.ts';
import { simpanPenilaian } from '../src/repositories/penilaian-gizi-repository.ts';

const [file, periode, posyandu, mode] = process.argv.slice(2);
try {
    if (!file || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periode ?? '') || !/^\d+$/.test(posyandu ?? '') || (mode && mode !== '--simpan'))
        throw new Error('Pemakaian: db/impor-pengukuran-historis.ts FILE YYYY-MM ID_POSYANDU [--simpan]. Bawaan hanya pratinjau.');
    const sheets = await bacaWorkbookSasaran(readFileSync(file).toString('base64'));
    const sheet = sheets.find(s => s.periode === periode);
    if (!sheet) throw new Error('Sheet periode tidak tersedia.');
    const pool = dapatkanPool();
    const identities = (await pool.query<IdentitasHistoris>(`SELECT a.id,a.nik,a.nama,to_char(a.tgl_lahir,'YYYY-MM-DD') AS "tglLahir",a.jk,w.rt
        FROM anak a JOIN wilayah_rt w ON w.id=a.wilayah_rt_id WHERE a.deleted_at IS NULL AND w.posyandu_id=$1`, [Number(posyandu)])).rows;
    const hasil = cocokkanHistoris(sheet.baris, identities, periode);
    const existing = (await pool.query<{anakId:number}>(`SELECT p.anak_id AS "anakId" FROM pengukuran p JOIN periode pe ON pe.id=p.periode_id
        WHERE pe.posyandu_id=$1 AND to_char(make_date(pe.tahun,pe.bulan,1),'YYYY-MM')=$2`, [Number(posyandu),periode])).rows;
    const sudah = new Set(existing.map(p => p.anakId));
    console.log(JSON.stringify({periode, sumber:basename(file), sheet:sheet.sheet, total:sheet.baris.length,
        siap:hasil.siap.filter(p => !sudah.has(p.anak.id)).length, sudahAda:hasil.siap.filter(p => sudah.has(p.anak.id)).length,
        tidakDiukur:hasil.tidakDiukur.length, ditahan:hasil.ditahan}));
    if (mode === '--simpan') {
        const tabel = await muatTabelStandar(pool);
        const jumlah = await dalamTransaksi(pool,{pengguna:null,sumber:'impor-historis'},async db => {
            const dates = hasil.siap.map(p => p.sumber.pengukuran!.tanggalUkur).sort();
            if (!dates.length) return 0;
            const [tahun,bulan] = periode.split('-').map(Number);
            const pe = await db.query<{id:number}>(`INSERT INTO periode(posyandu_id,tahun,bulan,tanggal_kegiatan) VALUES($1,$2,$3,$4)
                ON CONFLICT(posyandu_id,bulan,tahun) DO UPDATE SET tanggal_kegiatan=coalesce(periode.tanggal_kegiatan,EXCLUDED.tanggal_kegiatan) RETURNING id`,[Number(posyandu),tahun,bulan,dates[0]]);
            let count = 0;
            for (const {sumber,anak} of hasil.siap) {
                const ukur = sumber.pengukuran!;
                const jenisUkur = umurBulanPada(anak.tglLahir,ukur.tanggalUkur)<24 ? 'PB' as const : 'TB' as const;
                const inserted = await db.query<{id:number}>(`INSERT INTO pengukuran(anak_id,periode_id,tanggal_ukur,bb_kg,tinggi_cm,jenis_ukur,lila_cm,lika_cm,ntob_raw,status_kehadiran,sumber,catatan)
                    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'hadir','import',$10) ON CONFLICT(anak_id,periode_id) DO NOTHING RETURNING id`,
                    [anak.id,pe.rows[0].id,ukur.tanggalUkur,ukur.bbKg,ukur.tinggiCm,jenisUkur,ukur.lilaCm,ukur.likaCm,ukur.ntob?.slice(0,8) ?? null,`${basename(file)} / ${sheet.sheet} / baris ${sumber.barisAsal}; posisi PB/TB mengikuti umur.`]);
                if (!inserted.rows.length) continue;
                await simpanPenilaian(db,inserted.rows[0].id,'WHO-2006',hitungPenilaian(tabel,{...ukur,tglLahir:anak.tglLahir,jk:anak.jk as 'L'|'P',jenisUkur}));
                await db.query(`INSERT INTO sasaran(periode_id,anak_id,status,catatan) VALUES($1,$2,'selesai',$3) ON CONFLICT(periode_id,anak_id) DO NOTHING`,[pe.rows[0].id,anak.id,`Pengukuran historis: ${basename(file)} / ${sheet.sheet}`]);
                count++;
            }
            return count;
        });
        console.log(JSON.stringify({tersimpan:jumlah,ditahan:hasil.ditahan.length,keterangan:'Data yang sudah ada tidak ditimpa; identitas konflik ditahan.'}));
    }
} finally { await tutupPool(); }
