/** Perbaikan terarah hasil pencocokan Excel dan konfirmasi pemilik data, 27 Oktober 2026.
 * Bawaan pratinjau; --uji menjalankan lalu rollback; --simpan menyimpan satu transaksi.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import { bacaWorkbookSasaran } from '../src/services/sasaran-excel.ts';
import { cocokkanHistoris, type IdentitasHistoris } from '../src/services/pengukuran-historis.ts';
import { hitungPenilaian, umurBulanPada } from '../src/antropometri/penilaian-gizi.ts';
import { hitungZ } from '../src/antropometri/z-score.ts';
import { muatTabelStandar } from '../src/repositories/standar-lms-repository.ts';
import { ambilMasukan, simpanPenilaian } from '../src/repositories/penilaian-gizi-repository.ts';

const fileArg = process.argv.indexOf('--file');
const file = fileArg >= 0 ? process.argv[fileArg + 1] : process.env.HISTORIS_FILE;
assert(file && !file.startsWith('--'), 'Sertakan --file PATH_EXCEL atau set HISTORIS_FILE; sumber wajib eksplisit.');
const mode = process.argv.slice(2).find(arg => ['--pratinjau', '--uji', '--simpan'].includes(arg)) ?? '--pratinjau';
assert(['--pratinjau', '--uji', '--simpan'].includes(mode), 'Mode tidak dikenal');
const sasaran = [
    { id: 353, nama: 'ARZANDYA DEVA DATTA', juli: 12, agustus: 12 },
    { id: 185, nama: 'ARZAYYAN EIJAZ KASHIF RAHMAWAN', juli: 32, agustus: 32 },
    { id: 414, nama: 'ARKANA ALI MUSTHOFA', juli: 33, agustus: 33 },
    { id: 206, nama: 'ASHER GHANI IBRAHIM', juli: 34, agustus: 34 },
    { id: 229, nama: 'AKIRA TSABIT ISMAYA', juli: 58, agustus: 57 },
    { id: 237, nama: 'FAHIRA RACHA QUINA LATUCONSINA', juli: 66, agustus: null },
];
const ids = sasaran.map(s => s.id);
const bahan = readFileSync(file);
const sha256 = createHash('sha256').update(bahan).digest('hex');
const sheets = await bacaWorkbookSasaran(bahan.toString('base64'));
const pool = dapatkanPool();
pool.options.connectionTimeoutMillis = 10000;
pool.options.query_timeout = 30000;
pool.options.keepAlive = true;
pool.options.application_name = 'resolusi-historis-jul-agu';
const db = await pool.connect();
db.on('error', () => { /* Query berikutnya gagal dan transaksi tidak di-commit. */ });
try {
    const tabel = await muatTabelStandar(pool, 'WHO-2006');
    await db.query(mode === '--pratinjau' ? 'BEGIN READ ONLY' : 'BEGIN');
    await db.query("SELECT set_config('app.sumber','resolusi-historis-2026-10-27',true)");
    const identitas = (await db.query<IdentitasHistoris>(`SELECT a.id,a.nik,a.nama,
        to_char(a.tgl_lahir,'YYYY-MM-DD') AS "tglLahir",a.jk,w.rt
        FROM anak a JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
        WHERE a.deleted_at IS NULL AND w.posyandu_id=1 AND a.id=ANY($1::bigint[])
        ${mode === '--pratinjau' ? '' : 'FOR UPDATE OF a'}`, [ids])).rows;
    assert.equal(identitas.length, ids.length, 'Identitas target harus lengkap di Posyandu Tulip');
    const sebelum = {
        anak: (await db.query('SELECT * FROM anak WHERE id=ANY($1::bigint[]) ORDER BY id', [ids])).rows,
        pengukuran: (await db.query('SELECT * FROM pengukuran WHERE anak_id=ANY($1::bigint[]) ORDER BY id', [ids])).rows,
        penilaian: (await db.query('SELECT g.* FROM penilaian_gizi g JOIN pengukuran u ON u.id=g.pengukuran_id WHERE u.anak_id=ANY($1::bigint[]) ORDER BY g.id', [ids])).rows,
        sasaran: (await db.query('SELECT * FROM sasaran WHERE anak_id=ANY($1::bigint[]) ORDER BY id', [ids])).rows,
        arsip: (await db.query('SELECT * FROM riwayat_2t_arsip WHERE anak_id=ANY($1::bigint[]) ORDER BY id', [ids])).rows,
    };
    const akira = identitas.find(a => a.id === 229)!;
    assert(['L', 'P'].includes(akira.jk));
    const koreksiJk = akira.jk !== 'P';
    const versiAkira = [...new Set(sebelum.penilaian.filter(p => sebelum.pengukuran.some(u => u.anak_id === 229 && u.id === p.pengukuran_id)).map(p => p.standar_versi))];
    assert(versiAkira.every(v => v === 'WHO-2006'), 'Ada versi penilaian Akira yang harus diperiksa terlebih dahulu');
    // Arsip sumber Akira sudah memakai acuan perempuan; verifikasi sebelum dipertahankan.
    for (const arsip of sebelum.arsip.filter(a => a.anak_id === 229)) {
        const nilai = {BB_U:arsip.bb_kg,TB_U:arsip.tinggi_cm,BB_TB:arsip.bb_kg,
            IMT_U:arsip.bb_kg/(arsip.tinggi_cm/100)**2,LILA_U:arsip.lila_cm,LIKA_U:arsip.lika_cm};
        for (const indeks of ['BB_U','TB_U','BB_TB','IMT_U','LILA_U','LIKA_U'] as const) {
            const skor = arsip.penilaian['WHO-2006']?.[indeks]?.z;
            if (skor == null) continue;
            const z = hitungZ(tabel,indeks,'P',indeks==='BB_TB'?arsip.tinggi_cm:arsip.umur_bulan,nilai[indeks]);
            assert(z !== null && Math.abs(z-skor)<0.02, 'Arsip Akira belum sesuai acuan perempuan: '+indeks);
        }
    }
    const rencana = [];
    for (const periode of ['2026-07', '2026-08']) {
        const sheet = sheets.find(s => s.periode === periode)!;
        assert(sheet, 'Sheet sumber tidak tersedia');
        const pe = (await db.query('SELECT id FROM periode WHERE posyandu_id=1 AND tahun=2026 AND bulan=$1', [Number(periode.slice(5))])).rows;
        assert.equal(pe.length, 1, 'Periode target harus tunggal');
        for (const target of sasaran) {
            const baris = periode === '2026-07' ? target.juli : target.agustus;
            if (baris === null) continue;
            const sumber = sheet.baris.find(b => b.barisAsal === baris)!;
            const anak = identitas.find(a => a.id === target.id)!;
            assert.equal(sumber.nama, target.nama, 'Nama baris sumber berubah');
            assert.equal(anak.nama, target.nama, 'Nama target berubah');
            assert.equal(sumber.tglLahir, anak.tglLahir, 'Tanggal lahir tidak cocok');
            assert.equal(sumber.jk, target.id === 229 ? 'P' : anak.jk, 'Jenis kelamin tidak cocok');
            if (target.id === 237) {
                assert.equal(sumber.rt, '07');
                assert.equal(anak.rt, '03');
                assert(sumber.nik && sumber.nik === anak.nik, 'Fahira harus cocok NIK');
            } else assert.equal(sumber.rt, anak.rt, 'RT tidak cocok');
            const cocokUnik = identitas.filter(a => a.nama === sumber.nama && a.tglLahir === sumber.tglLahir);
            assert.equal(cocokUnik.length, 1, 'Identitas tidak tunggal');
            const alasan = target.id === 229
                ? 'Jenis kelamin perempuan dikonfirmasi pemilik data pada 27 Oktober 2026.'
                : target.id === 237
                  ? 'RT sumber Juli 07 berbeda dari RT profil 03; NIK, nama, tanggal lahir dan jenis kelamin cocok; RT profil dipertahankan.'
                  : 'NIK ganda pada Excel; dicocokkan unik melalui nama, tanggal lahir, jenis kelamin dan RT, serta identitas konsisten Januari–September; NIK profil dipertahankan.';
            const salinan = {...sumber, nik: anak.nik, rt: anak.rt, identitasDuplikat: false};
            const cocok = cocokkanHistoris([salinan], [{...anak, jk: target.id === 229 ? 'P' : anak.jk}], periode);
            assert.equal(cocok.siap.length, 1, 'Pengukuran tidak lolos validasi impor');
            rencana.push({periode, periodeId: pe[0].id, sumber, anak, alasan,
                catatan: `${basename(file)} / ${sheet.sheet} / baris ${baris}; ${alasan} Posisi PB/TB mengikuti umur.`});
        }
    }
    assert.equal(rencana.length, 11);
    const report = {mode, sha256, koreksiJkAkira: koreksiJk, penilaianAkira: versiAkira,
        baris: rencana.map(p => ({periode:p.periode,baris:p.sumber.barisAsal,anakId:p.anak.id,nama:p.anak.nama,
            sudahAda:sebelum.pengukuran.some(u => u.anak_id === p.anak.id && u.periode_id === p.periodeId)}))};
    console.log(JSON.stringify(report));
    if (mode !== '--pratinjau') {
        const folder = resolve(import.meta.dirname, '../../.backup-data');
        mkdirSync(folder, {recursive:true});
        const backup = resolve(folder, `historis-jul-agu-${Date.now()}-${mode.slice(2)}.json`);
        writeFileSync(backup, JSON.stringify({sha256,report,sebelum},null,2), {flag:'wx'});
        if (koreksiJk) await db.query("UPDATE anak SET jk='P' WHERE id=229");
        const baru: number[] = [];
        for (const p of rencana) {
            const u = p.sumber.pengukuran!;
            const jenisUkur = umurBulanPada(p.anak.tglLahir,u.tanggalUkur)<24 ? 'PB' : 'TB';
            const ada = sebelum.pengukuran.find(v => v.anak_id === p.anak.id && v.periode_id === p.periodeId);
            if (ada) {
                for (const [kolom,nilai] of [['bb_kg',u.bbKg],['tinggi_cm',u.tinggiCm],['lila_cm',u.lilaCm],['lika_cm',u.likaCm]] as const)
                    assert.equal(ada[kolom],nilai,'Pengukuran lama berbeda; tidak boleh ditimpa');
                continue;
            }
            const inserted = await db.query(`INSERT INTO pengukuran(anak_id,periode_id,tanggal_ukur,bb_kg,tinggi_cm,jenis_ukur,lila_cm,lika_cm,ntob_raw,status_kehadiran,sumber,catatan)
                VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'hadir','import',$10) RETURNING id`,
                [p.anak.id,p.periodeId,u.tanggalUkur,u.bbKg,u.tinggiCm,jenisUkur,u.lilaCm,u.likaCm,u.ntob?.slice(0,8)??null,p.catatan]);
            const id = inserted.rows[0].id;
            baru.push(id);
            await simpanPenilaian(db,id,'WHO-2006',hitungPenilaian(tabel,{...u,tglLahir:p.anak.tglLahir,jk:p.anak.id===229?'P':p.anak.jk as 'L'|'P',jenisUkur}));
            await db.query(`INSERT INTO sasaran(periode_id,anak_id,status,catatan) VALUES($1,$2,'selesai',$3)
                ON CONFLICT(periode_id,anak_id) DO NOTHING`,[p.periodeId,p.anak.id,p.catatan]);
        }
        let dihitungUlang = 0;
        if (koreksiJk) {
            const pengukuran = (await db.query('SELECT id FROM pengukuran WHERE anak_id=229 ORDER BY id')).rows;
            for (const {id} of pengukuran) {
                const ukur = await ambilMasukan(db,id);
                assert(ukur && ukur.jk === 'P');
                await simpanPenilaian(db,id,'WHO-2006',hitungPenilaian(tabel,ukur));
                dihitungUlang++;
            }
        }
        const lama = (await db.query('SELECT * FROM pengukuran WHERE anak_id=ANY($1::bigint[]) AND NOT(id=ANY($2::bigint[])) ORDER BY id',[ids,baru])).rows;
        assert.deepEqual(lama,sebelum.pengukuran,'Data ukur lama harus tetap identik');
        const setelah = (await db.query('SELECT * FROM anak WHERE id=ANY($1::bigint[]) ORDER BY id',[ids])).rows;
        for (let i=0;i<setelah.length;i++) {
            const {jk:jkBaru,updated_at:updatedBaru,...profilBaru} = setelah[i];
            const {jk:jkLama,updated_at:updatedLama,...profilLama} = sebelum.anak[i];
            assert.deepEqual(profilBaru,profilLama,'Identitas lain tidak boleh berubah');
            assert.equal(jkBaru,setelah[i].id===229?'P':jkLama);
        }
        console.log(JSON.stringify({pengukuranBaru:baru.length,penilaianAkiraDihitungUlang:dihitungUlang,backup,
            hasil:mode==='--simpan'?'disimpan':'uji dibatalkan'}));
    }
    await db.query(mode==='--simpan'?'COMMIT':'ROLLBACK');
} catch (e) {
    await db.query('ROLLBACK');
    throw e;
} finally {
    db.release();
    await tutupPool();
}
