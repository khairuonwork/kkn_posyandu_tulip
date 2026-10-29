import { Router } from "express";
import type { Pool } from "pg";

import { beranda, periode } from "../services/beranda-service.ts";
import { wajibBoleh } from "./middleware.ts";
import { GalatHariH, ubahHariH } from '../services/cakupan-hari-h.ts';

export function ruteBeranda(pool: Pool): Router {
    const rute = Router();

    rute.put('/beranda/hari-h',wajibBoleh('ubah-pengukuran'),async(req,res,next) => {
        try {res.json(await ubahHariH(pool,req.pengguna!,req.body));}
        catch(error){if(error instanceof GalatHariH)res.status(error.status).json({galat:error.message});else next(error);}
    });

    rute.get("/periode", wajibBoleh("lihat-dashboard"), async (req, res, next) => {
        try {
            res.json(await periode(pool, req.pengguna!));
        } catch (galat) { next(galat); }
    });

    rute.get("/beranda", wajibBoleh("lihat-dashboard"), async (req, res, next) => {
        const id = typeof req.query.periode === "string" ? req.query.periode : "";
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(id)) {
            res.status(400).json({ galat: "Periode harus berformat YYYY-MM." });
            return;
        }
        try {
            const rt = typeof req.query.rt === 'string' && req.query.rt !== '' ? req.query.rt : null;
            if (rt !== null && !/^\d{1,3}$/.test(rt)) {
                res.status(400).json({ galat: 'RT tidak valid.' }); return;
            }
            const hasil = await beranda(pool, req.pengguna!, id, rt);
            if (hasil === null) {
                res.status(404).json({ galat: "Periode tidak tersedia." });
                return;
            }
            res.json(hasil);
        } catch (galat) { next(galat); }
    });

    return rute;
}
