/**
 * Menghitung status gizi sebuah pengukuran lalu menyimpannya.
 *
 * Inilah yang menyambungkan mesin hitung ke basis data. Mesin hitungnya sendiri
 * (`src/antropometri/`) tetap murni: ia menerima angka dan mengembalikan angka,
 * sehingga seluruh aturan yang paling rawan dapat diuji tanpa PostgreSQL.
 *
 * Dipanggil setiap kali nilai ukur berubah — hasil impor arsip, koreksi Bidan,
 * atau penimbangan baru — karena status gizi adalah turunan, bukan masukan.
 *
 * @see docs/prd/dasar/B01-simpan-hasil-gizi.md
 */

import type { Pool } from 'pg';

import { hitungPenilaian } from '../antropometri/penilaian-gizi.ts';
import type { Pelaku } from '../db/transaksi.ts';
import { dalamTransaksi } from '../db/transaksi.ts';
import type { BarisPengukuran } from '../repositories/penilaian-gizi-repository.ts';
import {
    ambilMasukan,
    ambilMasukanPeriode,
    simpanPenilaian,
} from '../repositories/penilaian-gizi-repository.ts';
import { muatTabelStandar, VERSI_DEFAULT } from '../repositories/standar-lms-repository.ts';

/**
 * Perhitungan ulang yang tidak diminta siapa-siapa — dipicu impor atau koreksi,
 * bukan diketik orang. Pemanggil yang tahu penggunanya menyebutkannya sendiri.
 */
const PELAKU_BAWAAN: Pelaku = { pengguna: null, sumber: 'hitung-gizi' };

export class GalatPengukuranTidakAda extends Error {
    constructor(pengukuranId: number) {
        super(`Pengukuran #${pengukuranId} tidak ada.`);
        this.name = 'GalatPengukuranTidakAda';
    }
}

/**
 * Menghitung ulang dan menyimpan penilaian satu pengukuran.
 *
 * @returns jumlah indeks yang tersimpan. Nol adalah hasil yang sah — anak yang
 *          tidak hadir tidak punya nilai ukur, jadi tidak ada yang bisa
 *          dihitung, dan baris lamanya ikut dibersihkan.
 */
export async function hitungDanSimpan(
    pool: Pool,
    pengukuranId: number,
    versi: string = VERSI_DEFAULT,
    pelaku: Pelaku = PELAKU_BAWAAN,
): Promise<number> {
    const tabel = await muatTabelStandar(pool, versi);
    const pengukuran = await ambilMasukan(pool, pengukuranId);

    if (pengukuran === null) {
        throw new GalatPengukuranTidakAda(pengukuranId);
    }

    const hasil = hitungPenilaian(tabel, pengukuran);

    return dalamTransaksi(pool, pelaku, (klien) =>
        simpanPenilaian(klien, pengukuranId, versi, hasil),
    );
}

/**
 * Menghitung ulang seluruh pengukuran satu periode.
 *
 * Satu transaksi untuk seluruh periode: rekap yang dibaca di tengah perhitungan
 * ulang tidak boleh memuat separuh angka lama dan separuh angka baru.
 *
 * @returns jumlah pengukuran yang diproses dan jumlah baris penilaian tersimpan.
 */
export async function hitungDanSimpanPeriode(
    pool: Pool,
    periodeId: number,
    versi: string = VERSI_DEFAULT,
    pelaku: Pelaku = PELAKU_BAWAAN,
): Promise<{ pengukuran: number; baris: number }> {
    const tabel = await muatTabelStandar(pool, versi);
    const daftar: BarisPengukuran[] = await ambilMasukanPeriode(pool, periodeId);

    return dalamTransaksi(pool, pelaku, async (klien) => {
        let baris = 0;

        for (const pengukuran of daftar) {
            baris += await simpanPenilaian(
                klien,
                pengukuran.id,
                versi,
                hitungPenilaian(tabel, pengukuran),
            );
        }

        return { pengukuran: daftar.length, baris };
    });
}
