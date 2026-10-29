import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';
import '../../src/db/pool.ts';
import { bacaBerkasStandar } from '../../src/antropometri/sumber-standar.ts';
import type { PenggunaAktif } from '../../src/auth/peran.ts';

/** Memerlukan database lokal khusus pengujian, tidak pernah membaca server/.env. */
export async function siapkanSinkronisasiDb(max = 3) {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Uji beban hanya di database lokal');
    assert.match(url.pathname, /^\/simpatik_sync_test$/);
    const skema = 'uji_sinkronisasi_' + randomUUID().replaceAll('-', '');
    const induk = new pg.Pool({ connectionString: url.href, max: 1 });
    await induk.query(`CREATE SCHEMA ${skema}`);
    const pool = new pg.Pool({ connectionString: url.href, options: `-c search_path=${skema}`, max, connectionTimeoutMillis: 10_000 });
    const tutup = async () => {
        await pool.end();
        await induk.query(`DROP SCHEMA ${skema} CASCADE`);
        await induk.end();
    };
    try {
        const folder = new URL('../../db/migrations/', import.meta.url);
        for (const nama of readdirSync(folder).filter(n => n.endsWith('.sql')).sort()) {
            await pool.query(readFileSync(new URL(nama, folder), 'utf8'));
        }
        const { versi, baris } = bacaBerkasStandar();
        await pool.query(`INSERT INTO standar_lms(versi,indeks,jk,kunci,l,m,s)
            SELECT $1,* FROM unnest($2::varchar[],$3::char[],$4::numeric[],$5::numeric[],$6::numeric[],$7::numeric[])`,
        [versi, baris.map(b=>b.indeks), baris.map(b=>b.jk), baris.map(b=>b.kunci), baris.map(b=>b.l), baris.map(b=>b.m), baris.map(b=>b.s)]);
        const grup: { pengguna: PenggunaAktif; anak: number[]; periodeId: number; token: string }[] = [];
        for (let i = 0; i < 10; i++) {
            const pos = (await pool.query("INSERT INTO posyandu(nama,slug,rw) VALUES($1,$2,$3) RETURNING id", [`Uji ${i}`, `uji-${i}`, String(i)])).rows[0].id;
            const rt = (await pool.query("INSERT INTO wilayah_rt(posyandu_id,rt,rw) VALUES($1,'01',$2) RETURNING id", [pos, String(i)])).rows[0].id;
            const akun = (await pool.query("INSERT INTO pengguna(nama,username,kata_sandi_hash,peran) VALUES($1,$2,'hash-uji','bidan') RETURNING id", [`Uji ${i}`, `uji-${i}`])).rows[0].id;
            await pool.query('INSERT INTO pengguna_posyandu(pengguna_id,posyandu_id) VALUES($1,$2)', [akun, pos]);
            const periodeId = (await pool.query('INSERT INTO periode(posyandu_id,bulan,tahun,tanggal_kegiatan) VALUES($1,10,2026,$2) RETURNING id', [pos, '2026-10-10'])).rows[0].id;
            const anak: number[] = [];
            for (let j = 0; j < 5; j++) {
                const id = (await pool.query("INSERT INTO anak(wilayah_rt_id,nama,nama_baku,tgl_lahir,jk) VALUES($1,$2,$2,'2024-01-01','L') RETURNING id", [rt, `Anak uji ${i}-${j}`])).rows[0].id;
                anak.push(id);
                await pool.query('INSERT INTO sasaran(periode_id,anak_id) VALUES($1,$2)', [periodeId, id]);
            }
            const token = randomUUID();
            const { createHash } = await import('node:crypto');
            await pool.query("INSERT INTO sesi(ringkasan,pengguna_id,kedaluwarsa) VALUES($1,$2,now()+interval '1 hour')", [createHash('sha256').update(token).digest('hex'), akun]);
            grup.push({ pengguna: {id:akun,peran:'bidan',rt:null,aktif:true,posyanduIds:[pos],superAdmin:false}, anak, periodeId, token });
        }
        return { pool, grup, skema, tutup };
    } catch (galat) {
        await tutup();
        throw galat;
    }
}

export function payloadUji(anakId: number, id = `ukur-uji-${anakId}`) {
    return { id_pengukuran:id, id_anak:anakId, tanggal_ukur:'2026-10-10', bb_kg:'12,00', panjang_tinggi_cm:'85.0',
        jenis_ukur:'Berdiri', lila:'14', lika:'48', ntob:'N', status_kehadiran:'Hadir' };
}
