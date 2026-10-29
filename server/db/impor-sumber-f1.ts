import { basename } from 'node:path';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import { bacaSumberF1, namaF1, rtF1 } from '../src/services/f1-sumber.ts';

// Bawaan pratinjau. --simpan menjalankan transaksi hanya jika seluruh baris cocok unik.
const [file, periode, posyandu, mode] = process.argv.slice(2);
try {
    if (!file || !/^\d{4}-(0[1-9]|1[0-2])$/.test(periode ?? '') || !/^\d+$/.test(posyandu ?? '')) {
        throw new Error('Pemakaian: db/impor-sumber-f1.ts FILE YYYY-MM ID_POSYANDU [--simpan]');
    }
    const sumber = await bacaSumberF1(file);
    const pool = dapatkanPool();
    const anak = (await pool.query(`SELECT a.id,a.nama,a.jk,wr.rt FROM anak a JOIN wilayah_rt wr ON wr.id=a.wilayah_rt_id
        WHERE a.deleted_at IS NULL AND wr.posyandu_id=$1`, [Number(posyandu)])).rows;
    const pairs = sumber.map(s => ({s, cocok: anak.filter(a => namaF1(a.nama) === namaF1(s.nama) && a.jk === s.jk && rtF1(a.rt) === rtF1(s.rt))}));
    const konflik = pairs.filter(p => p.cocok.length !== 1);
    console.log(JSON.stringify({baris: sumber.length, cocok: pairs.length-konflik.length, konflik: konflik.map(p=>({nama:p.s.nama,rt:p.s.rt,jumlah:p.cocok.length}))}));
    if (konflik.length) throw new Error('Impor dibatalkan: identitas harus cocok unik; tidak ada perubahan database.');
    if (mode === '--simpan') {
        const c = await pool.connect();
        try {
            await c.query('BEGIN');
            for (const {s,cocok} of pairs) await c.query(`INSERT INTO sumber_f1(anak_id,periode,gng,desil,asi_eksklusif,sumber)
                VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(anak_id,periode) DO UPDATE SET
                gng=EXCLUDED.gng,desil=EXCLUDED.desil,asi_eksklusif=EXCLUDED.asi_eksklusif,sumber=EXCLUDED.sumber,updated_at=now()`,
                [cocok[0].id,periode,s.gng,s.desil,s.asi,basename(file)+' / RAW DATA FOR F1_ALL']);
            await c.query('COMMIT');
            console.log('Sumber F1 tersimpan. Hasil pengukuran dan sasaran tidak diubah.');
        } catch(e) {await c.query('ROLLBACK'); throw e;} finally {c.release();}
    }
} finally {await tutupPool();}
