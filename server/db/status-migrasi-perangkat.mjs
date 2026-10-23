import pg from 'pg';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try {
    const {rows}=await pool.query('SELECT nama FROM migrasi ORDER BY nama');
    console.log(rows.map(r=>r.nama).join('\n'));
} finally { await pool.end(); }
