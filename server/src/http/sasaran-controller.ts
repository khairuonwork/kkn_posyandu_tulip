import { Router } from "express";
import type { Response } from "express";
import type { Pool } from "pg";

import {
    daftar,
    GalatSasaran,
    impor,
    pratinjau,
    tutupSesi,
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

    return rute;
}
