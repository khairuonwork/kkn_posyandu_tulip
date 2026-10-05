/**
 * Lembar Hasil: tautan hasil penimbangan yang dibuka orang tua tanpa masuk.
 *
 * Yang keluar dari sini sengaja minimal: nama depan, jenis kelamin, dan
 * riwayat ukur beserta penilaiannya. Tidak ada NIK, alamat, nama orang tua,
 * maupun tanggal lahir — umur sudah dihitung di sini.
 */

import type { Pool } from 'pg';

import { umurBulanPada } from '../antropometri/penilaian-gizi.ts';
import type { PenggunaAktif } from '../auth/peran.ts';
import * as anakRepo from '../repositories/anak-repository.ts';
import { bacaToken, buatToken, UMUR_LEMBAR_DETIK } from './lembar-token.ts';

export class GalatLembar extends Error {
    readonly status: 400 | 404 | 410 | 503;

    constructor(status: 400 | 404 | 410 | 503, pesan: string) {
        super(pesan);
        this.status = status;
    }
}

/**
 * Pembaca atas nama pemegang tautan. Bukan akun: ia hanya dipakai untuk dua
 * query baca milik satu anak yang sudah ditetapkan oleh token bertanda tangan.
 */
const PEMEGANG_TAUTAN: PenggunaAktif = {
    id: 0,
    peran: 'bidan',
    rt: null,
    aktif: true,
};

function rahasia(): string {
    const nilai = process.env.LEMBAR_RAHASIA ?? '';

    if (nilai.length < 32) {
        throw new GalatLembar(
            503,
            'Tautan hasil belum dapat dibuat: LEMBAR_RAHASIA belum diisi di server.',
        );
    }

    return nilai;
}

export async function buatTautan(
    pool: Pool,
    pengguna: PenggunaAktif,
    anakId: unknown,
    periodeId: unknown,
) {
    if (
        typeof anakId !== 'number' ||
        !Number.isSafeInteger(anakId) ||
        typeof periodeId !== 'string' ||
        !/^\d{4}-\d{2}$/.test(periodeId)
    ) {
        throw new GalatLembar(400, 'anakId dan periodeId tidak sah.');
    }

    const kunci = rahasia();

    // Batas RT kader tetap berlaku: tautan hanya untuk balita yang memang
    // boleh dilihat pembuatnya.
    if ((await anakRepo.ambil(pool, pengguna, anakId)) === null) {
        throw new GalatLembar(404, 'Anak tidak ditemukan.');
    }

    const kedaluwarsa = Math.floor(Date.now() / 1000) + UMUR_LEMBAR_DETIK;

    return {
        token: buatToken({ anakId, periodeId, kedaluwarsa }, kunci),
        kedaluwarsa: new Date(kedaluwarsa * 1000).toISOString(),
    };
}

export async function bacaLembar(pool: Pool, token: string) {
    const isi = bacaToken(token, rahasia());

    if (isi === null) {
        throw new GalatLembar(404, 'Tautan tidak sah.');
    }

    if (isi === 'kedaluwarsa') {
        throw new GalatLembar(410, 'Tautan sudah tidak berlaku.');
    }

    const anak = await anakRepo.ambil(pool, PEMEGANG_TAUTAN, isi.anakId);
    const riwayat = await anakRepo.daftarPengukuran(
        pool,
        PEMEGANG_TAUTAN,
        isi.anakId,
    );

    if (anak === null || riwayat === null) {
        throw new GalatLembar(404, 'Tautan tidak sah.');
    }

    return {
        anak: {
            namaDepan: anak.nama.trim().split(/\s+/)[0] ?? anak.nama,
            jk: anak.jk,
        },
        periodeId: isi.periodeId,
        kedaluwarsa: new Date(isi.kedaluwarsa * 1000).toISOString(),
        pengukuran: riwayat.map((p) => ({
            periodeId: p.periodeId,
            tanggalUkur: p.tanggalUkur,
            umurBulan: umurBulanPada(anak.tglLahir, p.tanggalUkur),
            bbKg: p.bbKg,
            tinggiCm: p.tinggiCm,
            lilaCm: p.lilaCm,
            likaCm: p.likaCm,
            statusKehadiran: p.statusKehadiran,
            penilaian: p.penilaian,
        })),
    };
}
