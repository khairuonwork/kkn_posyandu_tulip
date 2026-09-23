/**
 * Hashing kata sandi dengan scrypt.
 *
 * Memakai `node:crypto`, tanpa dependensi. Itu bukan sekadar hemat: bcrypt dan
 * argon2 di Node adalah modul native yang butuh langkah build saat dipasang,
 * sementara repo ini menyetel `ignore-scripts=true` — jadi keduanya justru
 * menambah satu cara gagal yang sulit dilacak. scrypt sendiri memang dirancang
 * untuk kata sandi, dan Node menyediakannya langsung.
 *
 * Yang TIDAK dilakukan di sini: kriptografi buatan sendiri. Seluruh primitif
 * datang dari pustaka standar.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { ScryptOptions } from 'node:crypto';

/**
 * Dibungkus tangan, bukan lewat `promisify`: versi promisify kehilangan
 * overload yang menerima opsi, sehingga `maxmem` tidak dapat dikirim — dan
 * tanpa `maxmem` setelan di bawah gagal.
 */
function scryptAsync(
    kataSandi: string,
    garam: Buffer,
    panjang: number,
    opsi: ScryptOptions,
): Promise<Buffer> {
    return new Promise((selesai, gagal) => {
        scrypt(kataSandi, garam, panjang, opsi, (galat, kunci) => {
            if (galat !== null) {
                gagal(galat);

                return;
            }

            selesai(kunci);
        });
    });
}

/**
 * Parameter kerja. N harus pangkat dua.
 *
 * `maxmem` wajib dinaikkan: scrypt memerlukan sekitar 128 × N × r bait, yaitu
 * ~33 MB pada setelan ini, sedangkan batas bawaan Node 32 MB. Tanpa baris itu
 * hashing gagal dengan galat yang sama sekali tidak menyebut memori.
 */
const N = 32768;
const R = 8;
const P = 1;
const PANJANG_KUNCI = 64;
const MAXMEM = 128 * N * R * 2;

const PANJANG_GARAM = 16;

/** Penanda algoritma, supaya parameter dapat diganti tanpa mematikan hash lama. */
const SKEMA = 'scrypt';

/**
 * Menghasilkan `scrypt$N$r$p$garam$kunci`, keduanya base64.
 *
 * Parameternya ikut disimpan, bukan diasumsikan. Saat N nanti dinaikkan, hash
 * lama tetap dapat diverifikasi dengan parameternya sendiri.
 */
export async function hashKataSandi(kataSandi: string): Promise<string> {
    const garam = randomBytes(PANJANG_GARAM);
    const kunci = await scryptAsync(kataSandi.normalize('NFKC'), garam, PANJANG_KUNCI, {
        N,
        r: R,
        p: P,
        maxmem: MAXMEM,
    });

    return [SKEMA, N, R, P, garam.toString('base64'), kunci.toString('base64')].join('$');
}

/**
 * Selalu memakai perbandingan waktu tetap.
 *
 * Mengembalikan false untuk hash yang rusak atau berskema asing, bukan
 * melempar: bentuk hash di basis data bukan masukan tepercaya, dan galat yang
 * lolos ke pemanggil akan membedakan "akun ada tapi hash rusak" dari "akun
 * tidak ada" — pembeda yang tidak perlu diketahui siapa pun di luar.
 */
export async function verifikasiKataSandi(kataSandi: string, tersimpan: string): Promise<boolean> {
    const bagian = tersimpan.split('$');

    if (bagian.length !== 6 || bagian[0] !== SKEMA) {
        return false;
    }

    const n = Number(bagian[1]);
    const r = Number(bagian[2]);
    const p = Number(bagian[3]);

    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
        return false;
    }

    let garam: Buffer;
    let harapan: Buffer;

    try {
        garam = Buffer.from(bagian[4], 'base64');
        harapan = Buffer.from(bagian[5], 'base64');
    } catch {
        return false;
    }

    if (garam.length === 0 || harapan.length === 0) {
        return false;
    }

    const kunci = await scryptAsync(kataSandi.normalize('NFKC'), garam, harapan.length, {
        N: n,
        r,
        p,
        maxmem: 128 * n * r * 2,
    });

    return timingSafeEqual(kunci, harapan);
}

/**
 * Apakah hash ini dibuat dengan parameter yang sudah tidak berlaku.
 *
 * Dipakai saat masuk: bila true, kata sandi yang barusan terbukti benar
 * di-hash ulang dengan parameter sekarang. Tanpa ini, menaikkan N hanya
 * berlaku untuk akun baru.
 */
export function perluHashUlang(tersimpan: string): boolean {
    const [skema, n, r, p] = tersimpan.split('$');

    return skema !== SKEMA || Number(n) !== N || Number(r) !== R || Number(p) !== P;
}
