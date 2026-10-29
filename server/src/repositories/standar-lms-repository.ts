/**
 * Memuat tabel standar LMS dari PostgreSQL.
 *
 * Port dari bagian pemuatan `app/Support/Antropometri/StandarLmsRepository.php`.
 * Pencarian dan interpolasinya tidak ada di sini — keduanya milik
 * `TabelStandar`, yang murni dan tidak tahu apa-apa soal basis data.
 *
 * Seluruh tabel dimuat sekali per proses dan disimpan di memori. Tanpa ini,
 * perhitungan massal akan menembak basis data ribuan kali untuk data yang tidak
 * pernah berubah.
 */

import type { Pool } from 'pg';

import type { BarisStandar } from '../antropometri/tabel-standar.ts';
import { TabelStandar } from '../antropometri/tabel-standar.ts';

export const VERSI_DEFAULT = 'WHO-2006';

let tersimpan = new WeakMap<Pool, Map<string, Promise<TabelStandar>>>();

export async function muatTabelStandar(
    pool: Pool,
    versi: string = VERSI_DEFAULT,
): Promise<TabelStandar> {
    let perPool = tersimpan.get(pool);
    if (perPool === undefined) {
        perPool = new Map();
        tersimpan.set(pool, perPool);
    }
    const sudah = perPool.get(versi);

    if (sudah !== undefined) {
        return sudah;
    }

    const pemuatan = pool.query<BarisStandar>(
        'SELECT indeks, jk, kunci, l, m, s FROM standar_lms WHERE versi = $1 ORDER BY indeks, jk, kunci',
        [versi],
    ).then(({ rows }) => {
        if (rows.length === 0) {
            throw new Error(
                `Tabel standar ${versi} kosong. Jalankan: node --env-file=.env db/seed-standar-lms.ts`,
            );
        }

        return new TabelStandar(rows, versi);
    });
    perPool.set(versi, pemuatan);
    try {
        return await pemuatan;
    } catch (galat) {
        perPool.delete(versi);
        throw galat;
    }
}

/** Dipakai pengujian yang mengganti isi tabel di tengah proses. */
export function lupakanTabelTersimpan(): void {
    tersimpan = new WeakMap();
}
