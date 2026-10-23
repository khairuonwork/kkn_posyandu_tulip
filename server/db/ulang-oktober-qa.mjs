// Operasi eksplisit, sekali pakai: wajib snapshot terbaru yang masih cocok.
// Tidak menyentuh profil, akun, atau pengukuran periode lain.
import pg from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const [flag, file] = process.argv.slice(2);
if (flag !== '--apply' || !file) throw new Error('Wajib --apply <cadangan-2026-10.json>.');
const bytes = await readFile(file);
const backup = JSON.parse(bytes);
const manifest = JSON.parse(await readFile(path.join(path.dirname(file), 'manifest.json'), 'utf8'));
if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw new Error('Checksum cadangan tidak cocok.');
if (backup.periode !== '2026-10' || backup.data.periode.length !== 1 || backup.data.sasaran.length !== 92) throw new Error('Cadangan bukan 92 sasaran Oktober.');
if (Date.now() - Date.parse(backup.dibuat) > 30 * 60 * 1000) throw new Error('Buat cadangan baru, maksimal 30 menit.');
const periodeId = backup.data.periode[0].id;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const canonical = v => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
async function rows(table, where, params) {
  return (await client.query(`SELECT to_jsonb(t) AS row FROM ${table} t WHERE ${where} ORDER BY id`, params)).rows.map(r => r.row);
}
async function otherHistory() {
  return (await client.query(`SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS checksum
    FROM pengukuran t WHERE periode_id IS DISTINCT FROM $1`, [periodeId])).rows[0].checksum;
}
let committed = false;
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout='5s'");
  await client.query("SET LOCAL statement_timeout='20s'");
  // Cegah data berubah di antara pemeriksaan backup dan reset singkat.
  await client.query('LOCK TABLE periode,sasaran,pengukuran,penilaian_gizi,antrean_layanan IN SHARE ROW EXCLUSIVE MODE');
  await client.query("SELECT set_config('app.sumber','reset-oktober-qa-dengan-backup',true)");
  for (const table of ['periode', 'sasaran', 'pengukuran', 'antrean_layanan']) {
    const current = await rows(table, table === 'periode' ? 'id=$1' : 'periode_id=$1', [periodeId]);
    if (canonical(current) !== canonical(backup.data[table])) throw new Error(`${table} berubah setelah backup. Dibatalkan; buat backup ulang.`);
  }
  const pengukuranIds = backup.data.pengukuran.map(r => r.id);
  if (canonical(await rows('penilaian_gizi', 'pengukuran_id=ANY($1::bigint[])', [pengukuranIds])) !== canonical(backup.data.penilaian_gizi)) {
    throw new Error('Penilaian berubah setelah backup.');
  }
  const sebelumLain = await otherHistory();
  const hasil = {};
  hasil.antreanDihapus = (await client.query('DELETE FROM antrean_layanan WHERE periode_id=$1', [periodeId])).rowCount;
  hasil.penilaianDihapus = (await client.query('DELETE FROM penilaian_gizi WHERE pengukuran_id=ANY($1::bigint[])', [pengukuranIds])).rowCount;
  hasil.pengukuranDihapus = (await client.query('DELETE FROM pengukuran WHERE periode_id=$1', [periodeId])).rowCount;
  hasil.sasaranDiaktifkan = (await client.query(`UPDATE sasaran SET status='menunggu',diselesaikan_pada=NULL,diselesaikan_oleh=NULL WHERE periode_id=$1`, [periodeId])).rowCount;
  await client.query('UPDATE periode SET sesi_ditutup_pada=NULL,sesi_ditutup_oleh=NULL WHERE id=$1', [periodeId]);
  if (hasil.sasaranDiaktifkan !== 92 || sebelumLain !== await otherHistory()) throw new Error('Verifikasi lingkup gagal; rollback.');
  const cek = (await client.query(`SELECT
    (SELECT count(*)::int FROM sasaran WHERE periode_id=$1 AND status='menunggu') AS menunggu,
    (SELECT count(*)::int FROM pengukuran WHERE periode_id=$1) AS pengukuran,
    (SELECT count(*)::int FROM antrean_layanan WHERE periode_id=$1) AS antrean`, [periodeId])).rows[0];
  if (cek.menunggu !== 92 || cek.pengukuran !== 0 || cek.antrean !== 0) throw new Error('Verifikasi akhir gagal.');
  await client.query('COMMIT');
  committed = true;
  const report = { selesai: new Date().toISOString(), periodeId, ...hasil, cek, checksumRiwayatBulanLain: sebelumLain, backup: path.basename(file) };
  console.log(JSON.stringify(report, null, 2));
  await writeFile(path.join(path.dirname(file), 'hasil-reset.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
} catch (error) {
  if (!committed) await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.end();
}
