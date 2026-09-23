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

const tersimpan = new Map<string, TabelStandar>();

export async function muatTabelStandar(
    pool: Pool,
    versi: string = VERSI_DEFAULT,
): Promise<TabelStandar> {
    const sudah = tersimpan.get(versi);

    if (sudah !== undefined) {
        return sudah;
    }

    const { rows } = await pool.query<BarisStandar>(
        'SELECT indeks, jk, kunci, l, m, s FROM standar_lms WHERE versi = $1 ORDER BY indeks, jk, kunci',
        [versi],
    );

    if (rows.length === 0) {
        throw new Error(
            `Tabel standar ${versi} kosong. Jalankan: node --env-file=.env db/seed-standar-lms.ts`,
        );
    }

    const tabel = new TabelStandar(rows, versi);
    tersimpan.set(versi, tabel);

    return tabel;
}

/** Dipakai pengujian yang mengganti isi tabel di tengah proses. */
export function lupakanTabelTersimpan(): void {
    tersimpan.clear();
}
