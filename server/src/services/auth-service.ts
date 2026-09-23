/**
 * Alur masuk, keluar, dan pengenalan sesi.
 *
 * Aturannya sendiri tinggal di `src/auth/` dan sudah teruji tanpa basis data.
 * Berkas ini hanya merangkainya dengan repository — tidak ada keputusan
 * keamanan baru yang dibuat di sini.
 */

import type { Pool } from 'pg';

import { perluHashUlang, hashKataSandi, verifikasiKataSandi } from '../auth/kata-sandi.ts';
import type { PenggunaAktif } from '../auth/peran.ts';
import { buatSesi, ringkasanToken } from '../auth/sesi.ts';
import * as penggunaRepo from '../repositories/pengguna-repository.ts';
import * as sesiRepo from '../repositories/sesi-repository.ts';

export type HasilMasuk = {
    token: string;
    kedaluwarsa: Date;
    pengguna: { id: number; nama: string; email: string; peran: string; rt: string | null };
};

export type SebabGagal = 'kredensial' | 'nonaktif';

export class GalatMasuk extends Error {
    readonly sebab: SebabGagal;

    constructor(sebab: SebabGagal) {
        super(sebab === 'nonaktif' ? 'Akun dinonaktifkan' : 'Email atau kata sandi salah');
        this.name = 'GalatMasuk';
        this.sebab = sebab;
    }
}

/**
 * Kata sandi diverifikasi lebih dulu, bahkan untuk akun yang tidak ada.
 *
 * Bila email tidak ditemukan, verifikasi tetap dijalankan terhadap hash umpan
 * supaya waktu jawabannya serupa. Tanpa itu, penebak dapat memetakan siapa
 * saja yang punya akun hanya dari selisih waktu balasan.
 */
export async function masuk(pool: Pool, email: string, kataSandi: string): Promise<HasilMasuk> {
    const pengguna = await penggunaRepo.cariUntukMasuk(pool, email);

    if (pengguna === null) {
        await verifikasiKataSandi(kataSandi, HASH_UMPAN);

        throw new GalatMasuk('kredensial');
    }

    if (!(await verifikasiKataSandi(kataSandi, pengguna.kataSandiHash))) {
        throw new GalatMasuk('kredensial');
    }

    // Diperiksa setelah kata sandi, bukan sebelum: pesan "akun dinonaktifkan"
    // hanya pantas diterima orang yang memang memegang kata sandinya.
    if (!pengguna.aktif) {
        throw new GalatMasuk('nonaktif');
    }

    if (perluHashUlang(pengguna.kataSandiHash)) {
        await penggunaRepo.perbaruiHash(pool, pengguna.id, await hashKataSandi(kataSandi));
    }

    const sesi = buatSesi();

    await sesiRepo.simpan(pool, sesi.ringkasan, pengguna.id, sesi.kedaluwarsa);
    await penggunaRepo.catatMasuk(pool, pengguna.id);

    return {
        token: sesi.token,
        kedaluwarsa: sesi.kedaluwarsa,
        pengguna: {
            id: pengguna.id,
            nama: pengguna.nama,
            email: pengguna.email,
            peran: pengguna.peran,
            rt: pengguna.rt,
        },
    };
}

export async function keluar(pool: Pool, token: string): Promise<void> {
    await sesiRepo.hapus(pool, ringkasanToken(token));
}

export async function dariToken(pool: Pool, token: string): Promise<PenggunaAktif | null> {
    return sesiRepo.cariAktif(pool, ringkasanToken(token));
}

/**
 * Hash sungguhan dari kata sandi acak yang tidak pernah dipakai siapa pun.
 * Dibuat sekali saat modul dimuat, memakai parameter kerja yang sama dengan
 * hash asli — itulah gunanya: menghabiskan waktu yang setara.
 */
const HASH_UMPAN = await hashKataSandi(
    'umpan-tanpa-pemilik-' + Math.random().toString(36).slice(2),
);
