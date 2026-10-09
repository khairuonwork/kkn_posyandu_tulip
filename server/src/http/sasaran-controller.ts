import { Router } from "express";
import type { Response } from "express";
import type { Pool } from "pg";

import {
    daftar,
    daftarPeriode,
    GalatSasaran,
    impor,
    pratinjau,
    calon,
    tambahManual,
    tutupSesi,
    ubah,
    pratinjauResetHariIni,
    resetHariIni,
} from "../services/sasaran-service.ts";
import { wajibBoleh } from "./middleware.ts";

function jawabGalat(galat: unknown, res: Response): void {
    if (galat instanceof GalatSasaran) {
        res.status(galat.status).json({ galat: galat.message });
        return;
    }
    throw galat;
}

export function ruteSasaran(pool: Pool): Router {
    const rute = Router();

    rute.get(
        "/sasaran/periode",
        wajibBoleh("lihat-anak"),
        async (_req, res, next) => {
            try {
                res.json(await daftarPeriode(pool));
            } catch (galat) {
                try {
                    jawabGalat(galat, res);
                } catch (takTerduga) {
                    next(takTerduga);
                }
            }
        },
    );

    rute.get("/sasaran", wajibBoleh("lihat-anak"), async (req, res, next) => {
        try {
            const periode =
                typeof req.query.periode === "string"
                    ? req.query.periode
                    : undefined;
            res.json(await daftar(pool, req.pengguna!, periode));
        } catch (galat) {
            try {
                jawabGalat(galat, res);
            } catch (takTerduga) {
                next(takTerduga);
            }
        }
    });

    rute.get(
        "/sasaran/calon-anak",
        wajibBoleh("lihat-anak"),
        async (req, res, next) => {
            try {
                res.json(
                    await calon(
                        pool,
                        req.pengguna!,
                        req.query.periodeId,
                        req.query.cari,
                    ),
                );
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
        "/sasaran/manual",
        wajibBoleh("jalankan-impor"),
        async (req, res, next) => {
            try {
                res.status(201).json({
                    hasil: await tambahManual(pool, req.pengguna!, req.body),
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

    rute.patch(
        "/sasaran/:id",
        wajibBoleh("jalankan-impor"),
        async (req, res, next) => {
            try {
                res.json({
                    hasil: await ubah(pool, req.pengguna!, req.params.id, req.body),
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
        "/sasaran/pratinjau",
        wajibBoleh("jalankan-impor"),
        async (req, res, next) => {
            try {
                res.json(await pratinjau(req.body));
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
        "/sasaran/impor",
        wajibBoleh("jalankan-impor"),
        async (req, res, next) => {
            try {
                res.status(201).json({
                    hasil: await impor(pool, req.pengguna!, req.body),
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
        "/sasaran/tutup-sesi",
        wajibBoleh("selesaikan-sesi-lapangan"),
        async (req, res, next) => {
            try {
                res.json({
                    hasil: await tutupSesi(pool, req.pengguna!, req.body),
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

    rute.get(
        "/sasaran/reset-hari-ini",
        wajibBoleh("hapus-data"),
        async (req, res, next) => {
            try {
                res.json(await pratinjauResetHariIni(pool, req.query.periodeId));
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
        "/sasaran/reset-hari-ini",
        wajibBoleh("hapus-data"),
        async (req, res, next) => {
            try {
                res.json({ hasil: await resetHariIni(pool, req.pengguna!, req.body) });
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
