import { Router } from "express";
import type { Pool } from "pg";
import { wajibMasuk, tokenPermintaan } from "./middleware.ts";
import { ringkasanToken } from "../auth/sesi.ts";
import { dalamTransaksi } from "../db/transaksi.ts";
import {
    buatPelatihan,
    fiturPelatihan,
    hapusPelatihan,
    sesiAktif,
} from "../services/pelatihan.ts";

export function rutePelatihan(pool: Pool): Router {
    const router = Router();
    router.use("/pelatihan", wajibMasuk, (_req, res, next) => {
        res.set("Cache-Control", "no-store");
        if (!fiturPelatihan()) {
            res.status(503).json({
                galat: "Sesi pelatihan belum diaktifkan di server.",
            });
            return;
        }
        next();
    });
    router.get("/pelatihan/status", async (_req, res, next) => {
        try {
            const aktif = await sesiAktif(pool);
            res.json({
                aktif: !!aktif,
                sesi: aktif
                    ? {
                          id: aktif.id,
                          jumlah: aktif.jumlah_sasaran,
                          mulaiPada: aktif.mulai_pada,
                      }
                    : null,
            });
        } catch (e) {
            next(e);
        }
    });
    router.use("/pelatihan", (req, res, next) => {
        if (!req.pengguna?.superAdmin) {
            res.status(403).json({
                galat: "Hanya superadmin yang dapat mengelola sesi pelatihan.",
            });
            return;
        }
        next();
    });
    router.get("/pelatihan", async (_req, res, next) => {
        try {
            const aktif = await sesiAktif(pool);
            const sumber = (
                await pool.query(`SELECT p.id,p.tahun||'-'||lpad(p.bulan::text,2,'0') AS periode,
                ps.nama AS posyandu,count(s.id)::int AS jumlah FROM public.periode p
                JOIN public.posyandu ps ON ps.id=p.posyandu_id JOIN public.sasaran s ON s.periode_id=p.id
                WHERE s.status<>'batal' GROUP BY p.id,ps.nama ORDER BY p.tahun DESC,p.bulan DESC`)
            ).rows;
            res.json({ aktif, sumber });
        } catch (e) {
            next(e);
        }
    });
    router.post("/pelatihan/mulai", async (req, res, next) => {
        if (
            !Number.isSafeInteger(req.body?.periodeId) ||
            req.body?.konfirmasi !== true
        ) {
            res.status(400).json({
                galat: "Pilih sumber sasaran dan konfirmasikan pelatihan.",
            });
            return;
        }
        try {
            const hasil = await dalamTransaksi(
                pool,
                { pengguna: req.pengguna!.id, sumber: "mulai-pelatihan" },
                (db) =>
                    buatPelatihan(
                        db,
                        req.body.periodeId,
                        req.pengguna!.id,
                        ringkasanToken(tokenPermintaan(req)!),
                    ),
            );
            res.status(201).json(hasil);
        } catch (e) {
            next(e);
        }
    });
    router.post("/pelatihan/akhiri", async (req, res, next) => {
        if (req.body?.konfirmasi !== true || typeof req.body?.id !== "string") {
            res.status(400).json({
                galat: "Konfirmasi pengakhiran sesi diperlukan.",
            });
            return;
        }
        try {
            await dalamTransaksi(
                pool,
                { pengguna: req.pengguna!.id, sumber: "akhiri-pelatihan" },
                (db) =>
                    hapusPelatihan(
                        db,
                        req.body.id,
                        ringkasanToken(tokenPermintaan(req)!),
                    ),
            );
            res.json({ status: "selesai", dataLatihanDihapus: true });
        } catch (e) {
            next(e);
        }
    });
    return router;
}
