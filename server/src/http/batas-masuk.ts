/**
 * Pembatas percobaan masuk.
 *
 * Tanpa ini, kata sandi sekuat apa pun hanya soal waktu. scrypt memang
 * memperlambat tiap percobaan, tetapi memperlambat bukan menghentikan.
 *
 * Aturannya (dokumentasi pembatas, ASVS 5.0 V6.1.1):
 * - Hitungan dipegang per nama pengguna, ada atau tidak akunnya. Memutar alamat
 *   IP atau ID perangkat tidak membuka tebakan baru, dan jawaban server tidak
 *   membocorkan nama yang terdaftar.
 * - 15 kali salah tanpa jeda. Sesudahnya tiap percobaan menunggu 30 detik, lalu
 *   1, 2, 4, 8, dan paling lama 15 menit. Tidak ada kunci permanen; percobaan
 *   selama jeda ditolak tanpa dihitung, jadi menekan tombol berulang tidak
 *   memperpanjang jeda.
 * - Perangkat yang pernah berhasil masuk dengan akun itu punya hitungan sendiri
 *   dengan aturan yang sama. Penyerang dari luar tidak bisa membuat petugas
 *   menunggu di tablet atau laptopnya sendiri.
 * - Satu alamat IP yang salah 30 kali dari perangkat belum dikenal, dengan nama
 *   pengguna apa pun, ditahan 15 menit: menahan tebakan yang disebar ke banyak akun.
 * - Percobaan dicatat sebelum sandi diperiksa. scrypt berjalan di luar event
 *   loop, jadi tanpa itu permintaan yang datang serentak lolos bersama-sama.
 * - Hitungan disalin ke tabel `percobaan_masuk` (migrasi 039) agar restart tidak
 *   menghapusnya. Tanpa `muatBatas`, seperti di uji, semuanya hanya di memori.
 */

import type { Pool } from 'pg';

import * as percobaanRepo from '../repositories/percobaan-masuk-repository.ts';

export const BEBAS_GAGAL = 15;
export const MAKS_GAGAL_IP = 30;

const DETIK = 1000;
const MENIT = 60 * DETIK;
const JEDA_AWAL = 30 * DETIK;
const JEDA_MAKS = 15 * MENIT;
/** Salah yang lebih tua dari ini tidak dihitung lagi. */
const UMUR_GAGAL = 24 * 60 * MENIT;
const JENDELA_IP = 15 * MENIT;
export const UMUR_PERANGKAT_MS = 180 * 24 * 60 * MENIT;

type Catatan = { gagal: number; terakhir: number; kedaluwarsa: number };

// ponytail: Map tanpa batas ukuran. Beri batas jumlah entri bila suatu saat ada
// tebakan dari ribuan alamat IP sekaligus.
const catatan = new Map<string, Catatan>();

export type Tiket = {
    username: string;
    ip: string;
    perangkat: string | null;
    dikenal: boolean;
    /** Jumlah salah setelah percobaan ini ikut dihitung. */
    gagal: number;
};

export type Izin =
    | { boleh: true; tiket: Tiket }
    | { boleh: false; tungguDetik: number; jaringan: boolean };

const rapi = (username: string) => username.trim().toLowerCase();
const kunciAkun = (username: string) => `akun|${rapi(username)}`;
const kunciPerangkat = (username: string, id: string) => `perangkat|${rapi(username)}|${id}`;
const kunciIp = (ip: string) => `ip|${ip}`;
const keDetik = (ms: number) => Math.ceil(ms / DETIK);

/** Jeda sebelum percobaan berikutnya setelah `gagal` kali salah. */
export function jedaSetelah(gagal: number): number {
    return gagal < BEBAS_GAGAL ? 0 : Math.min(JEDA_MAKS, JEDA_AWAL * 2 ** (gagal - BEBAS_GAGAL));
}

function ambil(kunci: string, sekarang: number): Catatan | undefined {
    const c = catatan.get(kunci);

    return c !== undefined && c.kedaluwarsa > sekarang ? c : undefined;
}

function gagalBerlaku(c: Catatan | undefined, sekarang: number, umur: number): number {
    return c === undefined || sekarang - c.terakhir >= umur ? 0 : c.gagal;
}

function pasang(kunci: string, gagal: number, terakhir: number, kedaluwarsa: number): void {
    catatan.set(kunci, { gagal, terakhir, kedaluwarsa });
    simpan(kunci);
}

function kurangi(kunci: string): void {
    const c = catatan.get(kunci);

    if (c !== undefined && c.gagal > 0) {
        c.gagal -= 1;
        simpan(kunci);
    }
}

function hapus(kunci: string): void {
    if (catatan.delete(kunci)) {
        simpan(kunci);
    }
}

/** Pembersihan malas: hanya bila petanya sudah cukup besar untuk pantas dibersihkan. */
function rapikan(sekarang: number): void {
    if (catatan.size <= 1000) {
        return;
    }

    for (const [kunci, c] of catatan) {
        if (c.kedaluwarsa <= sekarang) {
            catatan.delete(kunci);
        }
    }
}

/**
 * Memeriksa sekaligus mencatat satu percobaan. Bila diizinkan, percobaan ini
 * sudah dihitung sebagai salah; `percobaanBerhasil` atau `batalkanPercobaan`
 * meralatnya.
 */
export function mulaiPercobaan(
    username: string,
    ip: string,
    perangkat: string | null,
    sekarang = Date.now(),
): Izin {
    rapikan(sekarang);

    const kp = perangkat === null ? null : kunciPerangkat(username, perangkat);
    const dikenal = kp === null ? undefined : ambil(kp, sekarang);

    if (kp !== null && dikenal !== undefined) {
        const gagal = gagalBerlaku(dikenal, sekarang, UMUR_GAGAL);
        const tunggu = dikenal.terakhir + jedaSetelah(gagal) - sekarang;

        if (tunggu > 0) {
            return { boleh: false, tungguDetik: keDetik(tunggu), jaringan: false };
        }

        pasang(kp, gagal + 1, sekarang, dikenal.kedaluwarsa);

        return { boleh: true, tiket: { username, ip, perangkat, dikenal: true, gagal: gagal + 1 } };
    }

    const ki = kunciIp(ip);
    const cIp = ambil(ki, sekarang);
    const gagalIp = gagalBerlaku(cIp, sekarang, JENDELA_IP);

    if (cIp !== undefined && gagalIp >= MAKS_GAGAL_IP) {
        return {
            boleh: false,
            tungguDetik: keDetik(cIp.terakhir + JENDELA_IP - sekarang),
            jaringan: true,
        };
    }

    const ka = kunciAkun(username);
    const cAkun = ambil(ka, sekarang);
    const gagal = gagalBerlaku(cAkun, sekarang, UMUR_GAGAL);

    if (cAkun !== undefined) {
        const tunggu = cAkun.terakhir + jedaSetelah(gagal) - sekarang;

        if (tunggu > 0) {
            return { boleh: false, tungguDetik: keDetik(tunggu), jaringan: false };
        }
    }

    pasang(ka, gagal + 1, sekarang, sekarang + UMUR_GAGAL);
    pasang(ki, gagalIp + 1, sekarang, sekarang + JENDELA_IP);

    return { boleh: true, tiket: { username, ip, perangkat, dikenal: false, gagal: gagal + 1 } };
}

/** Untuk jawaban 401: sisa salah tanpa jeda, dan lama jeda bila sudah dimulai. */
export function infoGagal(tiket: Tiket): { sisaPercobaan: number; tungguDetik: number } {
    return {
        sisaPercobaan: Math.max(0, BEBAS_GAGAL - tiket.gagal),
        tungguDetik: keDetik(jedaSetelah(tiket.gagal)),
    };
}

/**
 * Masuk berhasil: hitungan yang dipakai dihapus, dan `perangkat` dikenal untuk
 * akun ini selama 180 hari sejak masuk terakhir.
 *
 * Masuk dari perangkat dikenal tidak menghapus hitungan perangkat lain: tebakan
 * penyerang tetap tertahan walau petugasnya berhasil masuk dari tabletnya.
 */
export function percobaanBerhasil(
    tiket: Tiket,
    perangkat: string | null = tiket.perangkat,
    sekarang = Date.now(),
): void {
    if (!tiket.dikenal) {
        hapus(kunciAkun(tiket.username));
        kurangi(kunciIp(tiket.ip));
    }

    if (perangkat !== null) {
        pasang(kunciPerangkat(tiket.username, perangkat), 0, sekarang, sekarang + UMUR_PERANGKAT_MS);
    }
}

/** Galat server, bukan salah sandi: percobaan ini tidak dihitung. */
export function batalkanPercobaan(tiket: Tiket): void {
    if (tiket.dikenal && tiket.perangkat !== null) {
        kurangi(kunciPerangkat(tiket.username, tiket.perangkat));

        return;
    }

    kurangi(kunciAkun(tiket.username));
    kurangi(kunciIp(tiket.ip));
}

/** Admin mengganti sandi: petugas langsung bisa masuk dengan sandi baru. */
export function hapusJedaAkun(username: string): void {
    hapus(kunciAkun(username));

    const awalan = `perangkat|${rapi(username)}|`;

    for (const [kunci, c] of catatan) {
        if (kunci.startsWith(awalan) && c.gagal > 0) {
            c.gagal = 0;
            simpan(kunci);
        }
    }
}

// --- Salinan di basis data ---------------------------------------------------

let pool: Pool | null = null;
const kotor = new Set<string>();
let menulis = false;
let tulisan: Promise<void> = Promise.resolve();
let sudahLapor = false;

function lapor(galat: unknown): void {
    if (sudahLapor) {
        return;
    }

    sudahLapor = true;
    console.warn(
        '[Batas Masuk] Tabel percobaan_masuk tidak dapat dipakai; hitungan hanya di memori.',
        galat instanceof Error ? galat.message : galat,
    );
}

/**
 * Kunci yang berubah ditandai, lalu ditulis bergiliran oleh satu penulis.
 * Antrean tidak bisa memanjang tanpa batas: kunci yang sama cukup ditulis sekali
 * dengan nilai terbarunya.
 */
function simpan(kunci: string): void {
    if (pool === null) {
        return;
    }

    kotor.add(kunci);

    if (!menulis) {
        tulisan = siram(pool);
    }
}

async function siram(db: Pool): Promise<void> {
    menulis = true;

    try {
        while (kotor.size > 0) {
            const kunci = [...kotor];
            kotor.clear();

            const ada = kunci.filter((k) => catatan.has(k));
            const hilang = kunci.filter((k) => !catatan.has(k));

            if (ada.length > 0) {
                await percobaanRepo.simpanBanyak(db, ada.map((k) => ({ kunci: k, ...(catatan.get(k) as Catatan) })));
            }

            if (hilang.length > 0) {
                await percobaanRepo.hapusBanyak(db, hilang);
            }
        }
    } catch (galat) {
        lapor(galat);
    } finally {
        menulis = false;
    }
}

/** Dipanggil sekali saat server menyala: hitungan dari sebelum restart tetap berlaku. */
export async function muatBatas(db: Pool): Promise<void> {
    pool = db;

    try {
        for (const { kunci, gagal, terakhir, kedaluwarsa } of await percobaanRepo.muatBerlaku(db)) {
            // Percobaan yang tiba selama pemuatan lebih baru dari isi tabel.
            if (!catatan.has(kunci)) {
                catatan.set(kunci, { gagal, terakhir, kedaluwarsa });
            }
        }
    } catch (galat) {
        lapor(galat);
    }
}

/** Hanya untuk pengujian: mengosongkan hitungan di memori, tidak menyentuh tabel. */
export function kosongkanBatas(): void {
    catatan.clear();
}

/** Hanya untuk pengujian: menunggu semua perubahan tertulis ke tabel. */
export async function tungguSimpan(): Promise<void> {
    await tulisan;
}
