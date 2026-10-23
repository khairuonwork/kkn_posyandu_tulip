import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  for (const [label, sql] of [
    ['periode', `SELECT p.id,p.posyandu_id,p.bulan,p.tahun,count(s.id)::int AS sasaran
      FROM periode p LEFT JOIN sasaran s ON s.periode_id=p.id
      WHERE p.tahun=2026 AND p.bulan=10 GROUP BY p.id`],
    ['pengukuran', `SELECT count(*)::int AS jumlah, md5(coalesce(string_agg(row_to_json(t)::text, '' ORDER BY id),'')) AS checksum
      FROM pengukuran t`],
    ['kolom', `SELECT table_name,column_name,is_nullable,column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name IN ('anak','sasaran','periode','posyandu','wilayah_rt','pengguna')
      ORDER BY table_name,ordinal_position`],
  ]) console.log(JSON.stringify({ label, data: (await client.query(sql)).rows }));
  await client.query('ROLLBACK');
} finally {
  await client.end();
}
