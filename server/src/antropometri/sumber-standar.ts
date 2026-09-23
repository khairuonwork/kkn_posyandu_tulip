/**
 * Pembacaan berkas standar `who-lms.json`.
 *
 * Berkas ini sumber kebenaran tabel standar dan ikut di-commit; berkas Excel
 * asalnya berada di luar repo dan bukan dependensi runtime. Dibangkitkan ulang
 * oleh `server/db/data/extract-who-lms.py` bila standarnya berubah.
 *
 * @see docs/rujukan/antropometri.md bagian 5
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { BarisStandar } from './tabel-standar.ts';
import { TabelStandar } from './tabel-standar.ts';

const BERKAS_STANDAR = join(import.meta.dirname, '..', '..', 'db', 'data', 'who-lms.json');

type IsiBerkas = {
    versi: string;
    baris: BarisStandar[];
};

export function bacaBerkasStandar(berkas: string = BERKAS_STANDAR): IsiBerkas {
    const isi = JSON.parse(readFileSync(berkas, 'utf8')) as IsiBerkas;

    if (!Array.isArray(isi.baris) || isi.baris.length === 0) {
        throw new Error(`Berkas standar kosong atau rusak: ${berkas}`);
    }

    return isi;
}

/** Tabel standar dari berkas JSON, tanpa menyentuh basis data. */
export function tabelDariBerkas(berkas: string = BERKAS_STANDAR): TabelStandar {
    const isi = bacaBerkasStandar(berkas);

    return new TabelStandar(isi.baris, isi.versi);
}
