import { Router } from "express";
import type { Pool } from "pg";
import { wajibBoleh } from "./middleware.ts";
import { workbookLaporan } from "../services/laporan-export.ts";
import { laporan } from "../services/laporan-service.ts";
import { dataF1 } from '../services/f1-service.ts';
import { workbookF1 } from '../services/f1-export.ts';

export function ruteLaporan(pool: Pool): Router {
    const rute = Router();
    rute.get('/laporan/f1/unduh', wajibBoleh('unduh-rekap'), async (req,res,next) => {
        try {
            const periode=typeof req.query.periode==='string'?req.query.periode:'';
            const workbook=await workbookF1(await dataF1(pool,req.pengguna!,periode));
            res.set({'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition':`attachment; filename="laporan-f1-${periode}.xlsx"`,'Cache-Control':'no-store'});
            res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
        } catch(error) {
            if(error instanceof RangeError){res.status(400).json({galat:error.message});return;}
            next(error);
        }
    });
    rute.get("/laporan", wajibBoleh("lihat-rekap"), async (req, res, next) => {
        try {
            const periode = typeof req.query.periode === "string" ? req.query.periode : "";
            res.set("Cache-Control", "no-store");
            res.json(await laporan(pool, req.pengguna!, periode));
        } catch (error) {
            if (error instanceof RangeError) {
                res.status(400).json({ galat: error.message });
                return;
            }
            next(error);
        }
    });
    rute.get("/laporan/unduh", wajibBoleh("unduh-rekap"), async (req, res, next) => {
        try {
            const periode = typeof req.query.periode === "string" ? req.query.periode : "";
            const data = await laporan(pool, req.pengguna!, periode);
            const workbook = await workbookLaporan(data);
            const buffer = await workbook.xlsx.writeBuffer();
            res.set({
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="laporan-posyandu-${periode}.xlsx"`,
                "Cache-Control": "no-store",
            });
            res.send(Buffer.from(buffer));
        } catch (error) {
            if (error instanceof RangeError) {
                res.status(400).json({ galat: error.message });
                return;
            }
            next(error);
        }
    });
    return rute;
}
