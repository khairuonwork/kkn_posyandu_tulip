/**
 * Akses tabel `percobaan_masuk` (migrasi 039): salinan hitungan pembatas masuk
 * supaya restart tidak menghapusnya. Aturan pembatasnya ada di
 * `http/batas-masuk.ts`; berkas ini hanya membaca dan menulis baris.
 */

import type { Pool } from 'pg';

export type BarisPercobaan = {
    kunci: string;
    gagal: number;
    /** Milidetik sejak epoch. */
    terakhir: number;
    kedaluwarsa: number;
};

/** Sisip atau perbarui banyak kunci dalam satu perintah. */
export async function simpanBanyak(db: Pool, baris: BarisPercobaan[]): Promise<void> {
    await db.query(
        `INSERT INTO percobaan_masuk (kunci, gagal, terakhir, kedaluwarsa)
         SELECT * FROM unnest($1::text[], $2::int[], $3::timestamptz[], $4::timestamptz[])
         ON CONFLICT (kunci) DO UPDATE
         SET gagal = excluded.gagal, terakhir = excluded.terakhir, kedaluwarsa = excluded.kedaluwarsa`,
        [
            baris.map((b) => b.kunci),
            baris.map((b) => b.gagal),
            baris.map((b) => new Date(b.terakhir)),
            baris.map((b) => new Date(b.kedaluwarsa)),
        ],
    );
}

export async function hapusBanyak(db: Pool, kunci: string[]): Promise<void> {
    await db.query('DELETE FROM percobaan_masuk WHERE kunci = ANY($1::text[])', [kunci]);
}

/** Membuang baris kedaluwarsa, lalu mengembalikan sisanya. */
export async function muatBerlaku(db: Pool): Promise<BarisPercobaan[]> {
    await db.query('DELETE FROM percobaan_masuk WHERE kedaluwarsa <= now()');

    const { rows } = await db.query<{
        kunci: string;
        gagal: number;
        terakhir: Date | string;
        kedaluwarsa: Date | string;
    }>('SELECT kunci, gagal, terakhir, kedaluwarsa FROM percobaan_masuk');

    return rows.map((r) => ({
        kunci: r.kunci,
        gagal: r.gagal,
        terakhir: new Date(r.terakhir).getTime(),
        kedaluwarsa: new Date(r.kedaluwarsa).getTime(),
    }));
}
