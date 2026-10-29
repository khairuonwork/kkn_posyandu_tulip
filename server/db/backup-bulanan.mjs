/**
 * Snapshot data bulanan, READ ONLY. Tidak mereset atau memulihkan database.
 * node --env-file=.env db/backup-bulanan.mjs 2026-10
 */
import pg from 'pg';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const periode = process.argv[2];
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode ?? '')) throw new Error('Gunakan YYYY-MM.');
const [tahun, bulan] = periode.split('-').map(Number);
const awal = `${periode}-01`;
const akhir = `${bulan === 12 ? tahun + 1 : tahun}-${String(bulan === 12 ? 1 : bulan + 1).padStart(2, '0')}-01`;
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 15000 });
const data = {};
const quote = (name) => `"${name.replaceAll('"', '""')}"`;
async function ambil(table, where = 'true', values = []) {
  const { rows } = await client.query(`SELECT to_jsonb(t) AS row FROM ${quote(table)} t WHERE ${where} ORDER BY id`, values);
  data[table] = rows.map(r => r.row);
  return data[table];
}
const ids = (table, key = 'id') => [...new Set((data[table] ?? []).map(r => r[key]).filter(v => v != null))];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const tables = new Set((await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`)).rows.map(r => r.tablename));
  await ambil('periode', 'tahun=$1 AND bulan=$2', [tahun, bulan]);
  if (!data.periode.length) throw new Error('Periode tidak ditemukan; tidak membuat cadangan kosong.');
  const periodeIds = ids('periode');
  await ambil('sasaran', 'periode_id=ANY($1::bigint[])', [periodeIds]);
  await ambil('pengukuran', 'periode_id=ANY($1::bigint[]) OR (tanggal_ukur >= $2::date AND tanggal_ukur < $3::date)', [periodeIds, awal, akhir]);
  await ambil('penilaian_gizi', 'pengukuran_id=ANY($1::bigint[])', [ids('pengukuran')]);
  await ambil('layanan', 'periode_id=ANY($1::bigint[]) OR (tanggal >= $2::date AND tanggal < $3::date)', [periodeIds, awal, akhir]);
  if (tables.has('antrean_layanan')) await ambil('antrean_layanan', 'periode_id=ANY($1::bigint[]) OR (tanggal >= $2::date AND tanggal < $3::date)', [periodeIds, awal, akhir]);
  if (tables.has('survei_perkembangan_kia')) await ambil('survei_perkembangan_kia', 'tanggal >= $1::date AND tanggal < $2::date', [awal, akhir]);
  if (tables.has('riwayat_2t_arsip')) await ambil('riwayat_2t_arsip', 'periode_laporan=$1 OR periode_riwayat=$1', [periode]);
  const anakIds = [...new Set(Object.values(data).flatMap(rows => rows.map(r => r.anak_id)).filter(v => v != null))];
  await ambil('anak', 'id=ANY($1::bigint[])', [anakIds]);
  await ambil('orang_tua', 'id=ANY($1::bigint[])', [ids('anak', 'orang_tua_id')]);
  await ambil('wilayah_rt'); // Referensi wilayah, bukan pengukuran.
  await ambil('posyandu');
  const batchIds = [...new Set(Object.values(data).flatMap(rows => rows.map(r => r.import_batch_id)).filter(v => v != null))];
  await ambil('import_batch', 'id=ANY($1::bigint[])', [batchIds]);
  if (tables.has('import_konflik')) await ambil('import_konflik', 'import_batch_id=ANY($1::bigint[])', [batchIds]);
  // Referensi pelaku untuk restore; tidak menyalin password, token, atau sesi.
  data.pengguna_referensi = (await client.query('SELECT id,nama,username,peran FROM pengguna ORDER BY id')).rows;
  const schema = (await client.query(`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`)).rows;
  const migrasi = (await client.query('SELECT nama FROM migrasi ORDER BY nama')).rows;
  const source = (await client.query('SELECT current_database() AS database, current_timestamp AS snapshot_at')).rows[0];
  await client.query('ROLLBACK');
  const dibuat = new Date().toISOString();
  const snapshot = { format: 'simpatik-backup-bulanan-v1', periode, dibuat, source, migrasi, schema,
    catatan: 'Snapshot data Oktober dan referensinya. Tidak berisi password/sesi. Restore harus meninjau konflik ID dan tidak menimpa profil atau bulan lain secara otomatis.',
    data };
  const text = JSON.stringify(snapshot, null, 2);
  const folder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.backup-data', `${periode}_${dibuat.replaceAll(':', '-').replaceAll('.', '-')}`);
  await mkdir(folder, { recursive: true });
  const file = path.join(folder, `cadangan-${periode}.json`);
  await writeFile(file, text, { flag: 'wx', mode: 0o600 });
  const disk = await readFile(file);
  if (hash(disk) !== hash(text)) throw new Error('Checksum cadangan tidak cocok.');
  const ulang = JSON.parse(disk.toString());
  for (const [table, rows] of Object.entries(data)) {
    if (JSON.stringify(ulang.data[table]) !== JSON.stringify(rows)) throw new Error(`Validasi gagal: ${table}`);
  }
  const manifest = { periode, dibuat, file: path.basename(file), sha256: hash(disk),
    jumlah: Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.length])),
    verifikasi: 'SHA-256 dan seluruh data hasil baca ulang cocok. Sumber diakses dalam transaksi READ ONLY.' };
  await writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ folder, ...manifest }, null, 2));
} finally {
  await client.end();
}
