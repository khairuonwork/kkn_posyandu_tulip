import type { Pool, PoolClient } from 'pg';

export type Pelaku = { pengguna: number | null; sumber: string };

/** Seluruh query callback harus memakai klien ini, bukan pool. */
export async function dalamTransaksi<T>(
    pool: Pool,
    pelaku: Pelaku,
    jalankan: (klien: PoolClient) => Promise<T>,
): Promise<T> {
    const klien = await pool.connect();
    let rusak = false;

    try {
        await klien.query('BEGIN');
        // true = transaction-local: identitas tidak tertinggal di koneksi pool.
        await klien.query(
            `SELECT set_config('app.pengguna_id', $1, true),
                    set_config('app.sumber', $2, true)`,
            [pelaku.pengguna === null ? '' : String(pelaku.pengguna), pelaku.sumber],
        );
        const hasil = await jalankan(klien);
        await klien.query('COMMIT');
        return hasil;
    } catch (galat) {
        try {
            await klien.query('ROLLBACK');
        } catch {
            // Koneksi yang gagal dipulihkan tidak boleh kembali ke pool.
            rusak = true;
        }
        throw galat;
    } finally {
        klien.release(rusak);
    }
}
