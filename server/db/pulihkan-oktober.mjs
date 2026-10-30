// Bawaan pratinjau. --apply wajib menyertakan backup kondisi saat ini.
import pg from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const [sourceFile, currentFile, mode] = process.argv.slice(2);
async function load(file) {
    const bytes = await readFile(file);
    const manifest = JSON.parse(await readFile(path.join(path.dirname(file), 'manifest.json'), 'utf8'));
    if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw Error('Checksum backup gagal');
    const value = JSON.parse(bytes);
    if (value.periode !== '2026-10' || value.data.periode.length !== 1) throw Error('Bukan backup Oktober tunggal');
    return value;
}
const source = await load(sourceFile);
const current = await load(currentFile);
if (source.data.sasaran.length !== 92 || source.data.pengukuran.length !== 56) throw Error('Cadangan sumber bukan 92 sasaran / 56 hasil ukur');
if (Date.now() - Date.parse(current.dibuat) > 60 * 60 * 1000) throw Error('Backup kondisi saat ini harus baru, maksimal 60 menit');
const id = source.data.periode[0].id;
if (id !== current.data.periode[0].id) throw Error('Periode database berbeda');
const canonical = x => JSON.stringify(x, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v);
const db = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const rows = async (table, where, params) => (await db.query(`SELECT to_jsonb(t) AS row FROM ${table} t WHERE ${where} ORDER BY id`, params)).rows.map(r => r.row);
let committed = false;
try {
    await db.connect();
    await db.query(mode === '--apply' ? 'BEGIN' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await db.query("SET LOCAL lock_timeout='5s'");
    await db.query("SET LOCAL statement_timeout='30s'");
    if (mode === '--apply') await db.query('LOCK TABLE periode,sasaran,pengukuran,penilaian_gizi,antrean_layanan IN SHARE ROW EXCLUSIVE MODE');
    for (const table of ['periode','sasaran','pengukuran','antrean_layanan']) {
        if (canonical(await rows(table, table === 'periode' ? 'id=$1' : 'periode_id=$1',[id])) !== canonical(current.data[table]))
            throw Error(`${table} berubah setelah backup; buat backup ulang`);
    }
    const oldIds = current.data.pengukuran.map(r => r.id);
    if (canonical(await rows('penilaian_gizi','pengukuran_id=ANY($1::bigint[])',[oldIds])) !== canonical(current.data.penilaian_gizi)) throw Error('Penilaian berubah setelah backup');
    const targetIds = source.data.pengukuran.map(r => r.anak_id);
    const profiles = await rows('anak','id=ANY($1::bigint[])',[targetIds]);
    if (profiles.length !== new Set(targetIds).size) throw Error('Profil sumber tidak lengkap');
    const changed = profiles.filter(a => {
        const old = source.data.anak.find(b => b.id === a.id);
        return old.tgl_lahir !== a.tgl_lahir || old.jk !== a.jk;
    }).map(a => a.id);
    const migrations = (await db.query('SELECT nama FROM migrasi ORDER BY nama')).rows.map(r => r.nama);
    const other = async () => (await db.query(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS checksum FROM pengukuran t WHERE periode_id<>$1`,[id])).rows[0].checksum;
    const checksumBefore = await other();
    const report = { periodeId:id, sumberDibuat:source.dibuat, sebelum: { pengukuran:current.data.pengukuran.length, penilaian:current.data.penilaian_gizi.length, antrean:current.data.antrean_layanan.length },
        dipulihkan: { pengukuran:56, penilaian:source.data.penilaian_gizi.length, sasaran:92 }, profilBerubah:changed, migrations };
    console.log(JSON.stringify(report,null,2));
    if (mode !== '--apply') { await db.query('ROLLBACK'); } else {
        if (changed.length) throw Error('Tanggal lahir/JK berubah; penilaian lama perlu diperiksa dahulu');
        await db.query("SELECT set_config('app.sumber','pemulihan-cadangan-oktober-2026',true)");
        await db.query('DELETE FROM antrean_layanan WHERE periode_id=$1',[id]);
        await db.query('DELETE FROM pengukuran WHERE periode_id=$1',[id]);
        for (const table of ['pengukuran','penilaian_gizi']) {
            const sample = source.data[table][0];
            const cols = Object.keys(sample).map(k => '"'+k+'"').join(',');
            await db.query(`INSERT INTO ${table} (${cols}) OVERRIDING SYSTEM VALUE SELECT ${cols} FROM jsonb_populate_recordset(NULL::${table},$1::jsonb)`,[JSON.stringify(source.data[table])]);
            await db.query(`SELECT setval(pg_get_serial_sequence('${table}','id'),(SELECT max(id) FROM ${table}),true)`);
        }
        for (const s of source.data.sasaran) {
            const saved = await db.query(`UPDATE sasaran SET status=$3,diselesaikan_pada=$4,diselesaikan_oleh=$5 WHERE periode_id=$1 AND anak_id=$2`,
                [id,s.anak_id,s.status,s.diselesaikan_pada,s.diselesaikan_oleh]);
            if (saved.rowCount !== 1) throw Error('Keanggotaan sasaran berubah');
        }
        const p = source.data.periode[0];
        await db.query('UPDATE periode SET sesi_ditutup_pada=$2,sesi_ditutup_oleh=$3 WHERE id=$1',[id,p.sesi_ditutup_pada,p.sesi_ditutup_oleh]);
        if (canonical(await rows('pengukuran','periode_id=$1',[id])) !== canonical(source.data.pengukuran)) throw Error('Hasil ukur setelah restore berbeda');
        const ids = source.data.pengukuran.map(r => r.id);
        if (canonical(await rows('penilaian_gizi','pengukuran_id=ANY($1::bigint[])',[ids])) !== canonical(source.data.penilaian_gizi)) throw Error('Penilaian setelah restore berbeda');
        if (checksumBefore !== await other()) throw Error('Riwayat bulan lain berubah');
        await db.query('COMMIT'); committed = true;
        await writeFile(path.join(path.dirname(currentFile),'hasil-pemulihan.json'),JSON.stringify({...report,selesai:new Date().toISOString(),checksumBulanLain:checksumBefore},null,2),{flag:'wx'});
        console.log('COMMIT: hasil Oktober dipulihkan; antrean demo dibersihkan, antrean lama tetap di backup.');
    }
} catch(e) { if (!committed) await db.query('ROLLBACK').catch(()=>{}); throw e; }
finally { await db.end(); }
