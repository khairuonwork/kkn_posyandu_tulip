import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import type { Pool } from 'pg';
import { wajibMasuk } from './middleware.ts';
import { konteksPelatihan } from './pelatihan-context.ts';

/** Menyediakan kunci komunikasi lokal hanya untuk anggota Posyandu yang aktif. */
export function ruteCluster(pool: Pool): Router {
  const rute = Router();

  rute.get('/cluster-context', wajibMasuk, async (req, res, next) => {
    try {
      const akunId = req.pengguna!.id;
      const hasil = await pool.query<{ id: string; nama: string; rw: string | null }>(
        `SELECT p.id, p.nama, p.rw
           FROM pengguna u
           JOIN pengguna_posyandu up ON up.pengguna_id = u.id
           JOIN posyandu p ON p.id = up.posyandu_id
          WHERE u.id = $1 AND u.aktif = true
          ORDER BY p.id`,
        [akunId],
      );
      if (hasil.rowCount !== 1) {
        res.status(409).json({ galat: 'Akun belum terikat ke satu Posyandu. Minta admin menetapkan wilayah akun.' });
        return;
      }

      const posyandu = hasil.rows[0]!;
      await pool.query(
        `INSERT INTO posyandu_cluster (posyandu_id, cluster_key)
         VALUES ($1, $2) ON CONFLICT (posyandu_id) DO NOTHING`,
        [posyandu.id, randomBytes(32).toString('hex')],
      );
      const kunci = await pool.query<{ cluster_key: string; key_version: number }>(
        'SELECT cluster_key, key_version FROM posyandu_cluster WHERE posyandu_id = $1',
        [posyandu.id],
      );
      const row = kunci.rows[0];
      if (!row) throw new Error('Kunci cluster gagal dibuat');
      res.set('Cache-Control', 'no-store');
      res.json({
        workspaceId: konteksPelatihan.getStore()?.id ? `pelatihan:${konteksPelatihan.getStore()!.id}:posyandu:${posyandu.id}` : `posyandu:${posyandu.id}`,
        posyanduId: Number(posyandu.id),
        namaPosyandu: posyandu.nama,
        rw: posyandu.rw,
        clusterKey: row.cluster_key,
        keyVersion: row.key_version,
      });
    } catch (error) {
      next(error);
    }
  });

  return rute;
}
