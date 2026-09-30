/** Membuat akun awal live dan menyimpan kredensial sekali ke berkas lokal terabaikan Git. */

import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { hashKataSandi } from '../src/auth/kata-sandi.ts';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import { dalamTransaksi } from '../src/db/transaksi.ts';

const AKUN = [
    { nama: 'Administrator SIMPATIK', username: 'admin', peran: 'admin', rt: null },
    { nama: 'Bidan Posyandu Tulip', username: 'bidan', peran: 'bidan', rt: null },
    ...Array.from({ length: 7 }, (_, i) => {
        const rt = String(i + 1).padStart(2, '0');
        return { nama: `Kader RT ${rt}`, username: `kader${rt}`, peran: 'kader', rt };
    }),
] as const;

const pool = dapatkanPool();
const dibuat: Array<{ username: string; sandi: string; peran: string; rt: string | null }> = [];

try {
    await dalamTransaksi(pool, { pengguna: null, sumber: 'bootstrap-live' }, async (db) => {
        for (const akun of AKUN) {
            const ada = await db.query('SELECT 1 FROM pengguna WHERE username = $1', [akun.username]);
            if ((ada.rowCount ?? 0) > 0) continue;

            let wilayahRtId: number | null = null;
            if (akun.rt !== null) {
                const wilayah = await db.query<{ id: number }>(
                    `SELECT w.id FROM wilayah_rt w JOIN posyandu p ON p.id=w.posyandu_id
                      WHERE p.slug='posyandu-tulip' AND w.rt=$1`,
                    [akun.rt],
                );
                if (wilayah.rows[0] === undefined) throw new Error(`RT ${akun.rt} belum tersedia.`);
                wilayahRtId = wilayah.rows[0].id;
            }

            const sandi = `${randomBytes(15).toString('base64url')}!A1`;
            await db.query(
                `INSERT INTO pengguna (nama, username, kata_sandi_hash, peran, wilayah_rt_id)
                 VALUES ($1, $2, $3, $4, $5)`,
                [akun.nama, akun.username, await hashKataSandi(sandi), akun.peran, wilayahRtId],
            );
            dibuat.push({ username: akun.username, sandi, peran: akun.peran, rt: akun.rt });
        }
    });

    if (dibuat.length > 0) {
        const tujuan = join(import.meta.dirname, '..', 'akun-live.txt');
        const isi = [
            'KREDENSIAL AWAL SIMPATIK — simpan aman, lalu ganti kata sandi setelah masuk.',
            `Dibuat: ${new Date().toISOString()}`,
            '',
            ...dibuat.map((a) => `${a.username}\t${a.sandi}\t${a.peran}${a.rt ? ` RT ${a.rt}` : ''}`),
            '',
        ].join('\r\n');
        writeFileSync(tujuan, isi, { encoding: 'utf8', flag: 'wx' });
        console.log(`${dibuat.length} akun dibuat. Kredensial tersimpan lokal di server/akun-live.txt.`);
    } else {
        console.log('Semua akun awal sudah ada; tidak ada kata sandi yang diubah.');
    }
} finally {
    await tutupPool();
}
