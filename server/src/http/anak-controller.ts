/**
 * REST v1 untuk sumber daya anak Portal.
 *
 * GET /api/v1/anak
 * GET /api/v1/anak/:id
 * GET /api/v1/anak/:id/pengukuran
 */

import { Router } from "express";
import type { Response } from "express";
import type { Pool } from "pg";
import { daftarRt } from "../repositories/beranda-repository.ts";
import type { PenggunaAktif } from "../auth/peran.ts";
import { konteksPelatihan } from "./pelatihan-context.ts";

import { tolakKaderWeb, wajibBoleh, wajibLihatDataWeb } from "./middleware.ts";
import {
    daftar,
    GalatAnak,
    ambil,
    riwayat,
    simpanAnak,
    simpanPengukuran,
    sinkronisasi,
    ubahProfil,
} from "../services/anak-service.ts";

/**
 * APK menarik paket sinkronisasi penuh setiap 15 detik per tablet. Paket yang
 * sama dipakai bersama per cakupan selama UMUR_CACHE_SINKRONISASI_MS supaya
 * tidak setiap tarikan dibaca ulang dari Supabase. Setiap tulis yang berhasil
 * menaikkan `generasiTulis` sehingga tarikan berikutnya membaca data baru.
 */
// ponytail: cache per proses. Tulis lewat server lain ke DB yang sama baru terlihat
// setelah UMUR_CACHE_SINKRONISASI_MS; pakai LISTEN/NOTIFY bila itu jadi masalah.
const UMUR_CACHE_SINKRONISASI_MS = 60_000;
let generasiTulis = 0;

export function lupakanCacheSinkronisasi(): void {
    generasiTulis++;
}

function idDari(teks: string | string[] | undefined): number | null {
    if (typeof teks !== "string") {
        return null;
    }

    const id = Number(teks);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function jawabGalat(galat: unknown, res: Response): void {
    if (galat instanceof GalatAnak) {
        console.warn(`[AnakController Galat ${galat.status}]`, galat.message);
        res.status(galat.status).json({ galat: galat.message });

        return;
    }

    throw galat;
}

export function ruteAnak(pool: Pool): Router {
    const rute = Router();

    rute.get("/anak", wajibBoleh("lihat-anak"), wajibLihatDataWeb, async (req, res, next) => {
        try {
            const query = {
                periode: typeof req.query.periode === "string" ? req.query.periode : undefined,
                cari:
                    typeof req.query.cari === "string"
                        ? req.query.cari
                        : undefined,
                halaman:
                    typeof req.query.halaman === "string"
                        ? req.query.halaman
                        : undefined,
                ukuran:
                    typeof req.query.ukuran === "string"
                        ? req.query.ukuran
                        : undefined,
            };
            res.json(await daftar(pool, req.pengguna!, query));
        } catch (galat) {
            try {
                jawabGalat(galat, res);
            } catch (takTerduga) {
                next(takTerduga);
            }
        }
    });

    rute.post(
        "/anak",
        wajibBoleh("daftar-anak-lapangan"),
        async (req, res, next) => {
            try {
                res.status(201).json({
                    anak: await simpanAnak(pool, req.pengguna!, req.body),
                });
            } catch (galat) {
                try {
                    jawabGalat(galat, res);
                } catch (takTerduga) {
                    next(takTerduga);
                }
            }
        },
    );

    rute.post(
        "/pengukuran",
        wajibBoleh("catat-pengukuran-lapangan"),
        async (req, res, next) => {
            try {
                res.status(201).json({
                    pengukuran: await simpanPengukuran(
                        pool,
                        req.pengguna!,
                        req.body,
                    ),
                });
            } catch (galat) {
                try {
                    jawabGalat(galat, res);
                } catch (takTerduga) {
                    next(takTerduga);
                }
            }
        },
    );

    // Per router, jadi aplikasi (dan uji) dengan pool berbeda tidak berbagi isi.
    const cacheSinkronisasi = new Map<string, { sampai: number; generasi: number; hasil: ReturnType<typeof sinkronisasi> }>();
    const sinkronisasiBersama = (pengguna: PenggunaAktif) => {
        const kunci = JSON.stringify([pengguna.superAdmin ?? false,
            [...(pengguna.posyanduIds ?? [])].sort((a, b) => a - b)]);
        const sekarang = Date.now();
        const ada = cacheSinkronisasi.get(kunci);

        if (ada && ada.sampai > sekarang && ada.generasi === generasiTulis) {
            return ada.hasil;
        }

        const hasil = sinkronisasi(pool, pengguna);
        cacheSinkronisasi.set(kunci, { sampai: sekarang + UMUR_CACHE_SINKRONISASI_MS, generasi: generasiTulis, hasil });
        hasil.catch(() => {
            if (cacheSinkronisasi.get(kunci)?.hasil === hasil) cacheSinkronisasi.delete(kunci);
        });

        return hasil;
    };

    rute.get(
        "/sinkronisasi",
        wajibBoleh("lihat-anak"),
        async (req, res, next) => {
            try {
                // Ruang pelatihan memakai data latihannya sendiri: tidak ikut cache.
                res.json(konteksPelatihan.getStore()?.id
                    ? await sinkronisasi(pool, req.pengguna!)
                    : await sinkronisasiBersama(req.pengguna!));
            } catch (galat) {
                next(galat);
            }
        },
    );

    rute.get("/anak/:id", wajibBoleh("lihat-anak"), wajibLihatDataWeb, async (req, res, next) => {
        const id = idDari(req.params.id);
        if (id === null) {
            res.status(404).json({ galat: "Anak tidak ditemukan." });
            return;
        }

        try {
            const anak = await ambil(pool, req.pengguna!, id, typeof req.query.periode === 'string' ? req.query.periode : undefined);
            res.json({ anak, wilayahRt: await daftarRt(pool, req.pengguna!) });
        } catch (galat) {
            try {
                jawabGalat(galat, res);
            } catch (takTerduga) {
                next(takTerduga);
            }
        }
    });

    rute.patch("/anak/:id", wajibBoleh("ubah-anak"), tolakKaderWeb, async (req, res, next) => {
        const id = idDari(req.params.id);
        if (id === null) {
            res.status(404).json({ galat: "Anak tidak ditemukan." });
            return;
        }
        try {
            res.json({
                hasil: await ubahProfil(pool, req.pengguna!, id, req.body),
            });
        } catch (galat) {
            try {
                jawabGalat(galat, res);
            } catch (takTerduga) {
                next(takTerduga);
            }
        }
    });

    rute.get(
        "/anak/:id/pengukuran",
        wajibBoleh("lihat-kms"),
        wajibLihatDataWeb,
        async (req, res, next) => {
            const id = idDari(req.params.id);
            if (id === null) {
                res.status(404).json({ galat: "Anak tidak ditemukan." });
                return;
            }

            try {
                res.json(await riwayat(pool, req.pengguna!, id));
            } catch (galat) {
                try {
                    jawabGalat(galat, res);
                } catch (takTerduga) {
                    next(takTerduga);
                }
            }
        },
    );

    return rute;
}
