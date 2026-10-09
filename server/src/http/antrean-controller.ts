import { Router } from "express";
import type { Response } from "express";
import type { Pool } from "pg";

import type { StatusAntrean } from "../repositories/antrean-repository.ts";
import * as antreanRepo from "../repositories/antrean-repository.ts";
import { dalamTransaksi } from "../db/transaksi.ts";
import { wajibBoleh } from "./middleware.ts";

const STATUS: readonly StatusAntrean[] = ["waiting", "called", "serving", "kms_review", "cancelled"];
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function gagal(res: Response, status: number, pesan: string) {
    res.status(status).json({ galat: pesan });
}

export function ruteAntrean(pool: Pool): Router {
    const rute = Router();

    rute.get("/antrean", wajibBoleh("lihat-anak"), async (req, res, next) => {
        const periodeId = Number(req.query.periodeId);
        const tanggal = typeof req.query.tanggal === "string" ? req.query.tanggal : "";
        if (!Number.isSafeInteger(periodeId) || periodeId < 1 || !TANGGAL.test(tanggal)) {
            gagal(res, 400, "Periode dan tanggal antrean tidak valid.");
            return;
        }
        try {
            res.json({ items: await antreanRepo.daftar(pool, req.pengguna!, periodeId, tanggal) });
        } catch (error) { next(error); }
    });

    rute.post("/antrean", wajibBoleh("catat-pengukuran-lapangan"), async (req, res, next) => {
        const periodeId = Number(req.body?.periodeId);
        const sasaranId = Number(req.body?.sasaranId);
        const tanggal = typeof req.body?.tanggal === "string" ? req.body.tanggal : "";
        const catatanRaw = req.body?.catatan;
        const catatan = typeof catatanRaw === "string" ? catatanRaw.trim().slice(0, 240) || null : null;
        if (!Number.isSafeInteger(periodeId) || periodeId < 1 || !Number.isSafeInteger(sasaranId) || sasaranId < 1 || !TANGGAL.test(tanggal)) {
            gagal(res, 400, "Data check-in antrean tidak valid.");
            return;
        }
        try {
            const item = await dalamTransaksi(pool, { pengguna: req.pengguna!.id, sumber: "tablet" }, db =>
                antreanRepo.checkIn(db, req.pengguna!, periodeId, sasaranId, tanggal, catatan));
            if (!item) { gagal(res, 404, "Sasaran tidak ditemukan, di luar RT, atau sesi sudah ditutup."); return; }
            res.status(201).json({ item });
        } catch (error) { next(error); }
    });

    rute.patch("/antrean/:id", wajibBoleh("catat-pengukuran-lapangan"), async (req, res, next) => {
        const id = typeof req.params.id === "string" ? req.params.id : "";
        const status = req.body?.status;
        const catatan = req.body?.catatan;
        const urutanRaw = req.body?.urutan;
        const urutan = urutanRaw === undefined ? undefined : Number(urutanRaw);
        if (!/^antrean_\d{8}_\d+$/.test(id) || typeof status !== "string" || !STATUS.includes(status as StatusAntrean) ||
            (catatan !== undefined && catatan !== null && typeof catatan !== "string") ||
            (urutan !== undefined && (!Number.isSafeInteger(urutan) || urutan < 1))) {
            gagal(res, 400, "Perubahan status antrean tidak valid.");
            return;
        }
        try {
            const item = await dalamTransaksi(pool, { pengguna: req.pengguna!.id, sumber: "tablet" }, db =>
                antreanRepo.ubahStatus(db, req.pengguna!, id, status as StatusAntrean, catatan as string | null | undefined, urutan));
            if (!item) { gagal(res, 404, "Antrean tidak ditemukan atau di luar RT Anda."); return; }
            res.json({ item });
        } catch (error) { next(error); }
    });

    rute.post("/antrean/:id/konfirmasi-kms", wajibBoleh("konfirmasi-kms"), async (req, res, next) => {
        const id = typeof req.params.id === "string" ? req.params.id : "";
        if (!/^antrean_\d{8}_\d+$/.test(id)) {
            gagal(res, 400, "ID antrean tidak valid.");
            return;
        }
        try {
            const item = await dalamTransaksi(pool, { pengguna: req.pengguna!.id, sumber: "web-kms" }, db =>
                antreanRepo.konfirmasiKms(db, req.pengguna!, id));
            if (!item) { gagal(res, 409, "Antrean belum menunggu pemeriksaan KMS atau sesi sudah ditutup."); return; }
            res.json({ item });
        } catch (error) { next(error); }
    });
    return rute;
}
