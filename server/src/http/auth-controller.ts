/**
 * Rute autentikasi.
 *
 * Controller hanya membaca permintaan dan menyusun jawaban. Keputusan ada di
 * `services/auth-service.ts`, aturannya di `auth/`.
 */

import { randomBytes } from 'node:crypto';

import { Router } from 'express';
import type { Request, RequestHandler } from 'express';
import type { Pool } from 'pg';

import * as penggunaRepo from '../repositories/pengguna-repository.ts';
import { GalatMasuk, keluar, masuk } from '../services/auth-service.ts';
import { batalkanPercobaan, infoGagal, mulaiPercobaan, percobaanBerhasil } from './batas-masuk.ts';
import {
    bacaCookie,
    hapusCookieSesi,
    NAMA_COOKIE_PERANGKAT,
    NAMA_COOKIE_SESI,
    pasangCookiePerangkat,
    pasangCookieSesi,
} from './cookie.ts';
import { tokenPermintaan, wajibMasuk } from './middleware.ts';

/** Petugas tidak dikagetkan angka sejak salah ketik pertama. */
const SISA_DIPERINGATKAN = 3;

function alamat(ip: string | undefined): string {
    return ip ?? 'tidak-diketahui';
}

/** Web memakai cookie `perangkat`; APK mengirim ID pemasangannya lewat header. */
function idPerangkat(req: Request): string | null {
    const id =
        bacaCookie(req.headers.cookie, NAMA_COOKIE_PERANGKAT) ??
        req.get('x-simpatik-device-id')?.trim() ??
        '';

    return /^[A-Za-z0-9_-]{8,96}$/.test(id) ? id : null;
}

function lamaTunggu(detik: number): string {
    return detik < 60 ? `${detik} detik` : `${Math.ceil(detik / 60)} menit`;
}

function pesanTahan(detik: number, jaringan: boolean): string {
    return `Terlalu banyak percobaan ${jaringan ? 'masuk dari jaringan ini' : 'untuk akun ini'}. Silakan coba lagi dalam ${lamaTunggu(detik)}.`;
}

/**
 * Masuk Portal (`web`, cookie) dan tablet (token Bearer) memakai pembatas yang
 * sama. Pesan `galat` sudah lengkap untuk ditampilkan apa adanya oleh APK.
 */
function ruteMasuk(pool: Pool, web: boolean): RequestHandler {
    return (req, res, next) => {
        // Dirapikan di sini: papan ketik tablet kerap menambah spasi di ujung.
        const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
        const kataSandi = typeof req.body?.kataSandi === 'string' ? req.body.kataSandi : '';

        if (username === '' || kataSandi === '') {
            res.status(400).json({ galat: 'Nama pengguna dan kata sandi wajib diisi' });

            return;
        }

        const perangkat = idPerangkat(req);
        const izin = mulaiPercobaan(username, alamat(req.ip), perangkat);

        if (!izin.boleh) {
            res.set('Retry-After', String(izin.tungguDetik))
                .status(429)
                .json({
                    galat: pesanTahan(izin.tungguDetik, izin.jaringan),
                    tungguDetik: izin.tungguDetik,
                    ...(izin.jaringan ? { jaringan: true } : {}),
                });

            return;
        }

        masuk(pool, username, kataSandi)
            .then((hasil) => {
                const id = perangkat ?? (web ? randomBytes(18).toString('base64url') : null);

                percobaanBerhasil(izin.tiket, id);

                if (!web) {
                    res.json({
                        token: hasil.token,
                        kedaluwarsa: hasil.kedaluwarsa.toISOString(),
                        pengguna: hasil.pengguna,
                    });

                    return;
                }

                pasangCookieSesi(res, hasil.token);

                if (id !== null) {
                    pasangCookiePerangkat(res, id);
                }

                res.json({ pengguna: hasil.pengguna });
            })
            .catch((galat: unknown) => {
                if (!(galat instanceof GalatMasuk)) {
                    batalkanPercobaan(izin.tiket);
                    next(galat);

                    return;
                }

                // Akun nonaktif tetap dihitung sebagai kegagalan: tanpa itu,
                // akun yang dinonaktifkan menjadi sasaran tebakan tanpa batas.
                res.locals.diagnostikLogin = galat.diagnostik;

                if (galat.sebab !== 'kredensial') {
                    res.status(401).json({ galat: galat.message });

                    return;
                }

                const info = infoGagal(izin.tiket);
                const tambahan =
                    info.tungguDetik > 0
                        ? ` ${pesanTahan(info.tungguDetik, false)}`
                        : info.sisaPercobaan <= SISA_DIPERINGATKAN
                          ? ` Sisa ${info.sisaPercobaan} kali percobaan lagi. Setelah itu Anda perlu menunggu sebentar.`
                          : '';

                res.status(401).json({ galat: galat.message + tambahan, ...info });
            });
    };
}

export function ruteAuth(pool: Pool): Router {
    const rute = Router();

    rute.post('/masuk', ruteMasuk(pool, true));

    // Aplikasi tablet memakai token Bearer karena cookie httpOnly adalah
    // mekanisme sesi peramban. Token tetap tersimpan di tabel sesi yang sama,
    // sehingga penonaktifan akun mencabut akses Portal dan tablet seketika.
    rute.post('/v1/masuk', ruteMasuk(pool, false));

    rute.post('/v1/keluar', wajibMasuk, async (req, res, next) => {
        const token = tokenPermintaan(req);
        if (token === null) {
            res.status(204).end();
            return;
        }

        try {
            await keluar(pool, token);
            res.status(204).end();
        } catch (galat) {
            next(galat);
        }
    });

    rute.post('/keluar', (req, res, next) => {
        const token = bacaCookie(req.headers.cookie, NAMA_COOKIE_SESI);

        // Cookie selalu dihapus, bahkan bila sesinya sudah tidak ada. Keluar
        // yang gagal karena "sudah keluar" hanya membingungkan.
        hapusCookieSesi(res);

        if (token === null || token === '') {
            res.status(204).end();

            return;
        }

        keluar(pool, token)
            .then(() => res.status(204).end())
            .catch(next);
    });

    // Nama dan nama pengguna untuk kartu akun di sidebar. Dibaca di sini, bukan
    // di middleware sesi: setiap permintaan lain cukup tahu peran dan RT-nya.
    rute.get('/saya', wajibMasuk, async (req, res) => {
        const akun = req.pengguna && (await penggunaRepo.ambil(pool, req.pengguna.id));

        if (!akun) {
            res.status(401).json({ galat: 'Sesi tidak berlaku' });

            return;
        }

        res.json({ pengguna: {
            ...req.pengguna,
            nama: akun.nama,
            username: akun.username,
            posyanduNama: akun.posyanduNama,
            rw: akun.rw,
        } });
    });

    return rute;
}
