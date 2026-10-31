import { Router } from "express";
import type { Response } from "express";
import type { Pool } from "pg";

import type { StatusAntrean } from "../repositories/antrean-repository.ts";
import * as antreanRepo from "../repositories/antrean-repository.ts";
import { dalamTransaksi } from "../db/transaksi.ts";
import { wajibBoleh } from "./middleware.ts";

const STATUS: readonly StatusAntrean[] = ["waiting", "called", "serving", "kms_review", "done", "cancelled"];
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

function gagal(res: Response, status: number, pesan: string) {
    res.status(status).json({ galat: pesan });
}

export function ruteAntrean(pool: Pool): Router {
    const rute = Router();

    rute.get("/antrean", wajibBoleh("lihat-anak"), async (req, res, next) => {
        const periodeRaw = typeof req.query.periodeId === "string" ? req.query.periodeId : "";
        const periodeBulan = /^\d{4}-(0[1-9]|1[0-2])$/.test(periodeRaw);
        let periodeId = Number(periodeRaw);
        const tanggal = typeof req.query.tanggal === "string" ? req.query.tanggal : "";
        if ((!periodeBulan && (!Number.isSafeInteger(periodeId) || periodeId < 1)) || !TANGGAL.test(tanggal)) {
            gagal(res, 400, "Periode dan tanggal antrean tidak valid.");
            return;
        }
        try {
            // Portal memakai YYYY-MM; tablet memakai primary key periode.
            if (periodeBulan) {
                const [tahun, bulan] = periodeRaw.split("-").map(Number);
                const { rows } = await pool.query<{ id: number }>(
                    `SELECT id FROM periode
                      WHERE tahun=$1 AND bulan=$2
                        AND ($3::boolean OR posyandu_id=ANY($4::bigint[]))
                      ORDER BY posyandu_id LIMIT 1`,
                    [tahun, bulan, req.pengguna!.superAdmin ?? false, req.pengguna!.posyanduIds ?? []],
                );
                if (!rows[0]) {
                    gagal(res, 404, "Periode antrean tidak ditemukan.");
                    return;
                }
                periodeId = Number(rows[0].id);
            }
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
            if (!item) {
                console.warn(`[Antrean checkIn 404] periodeId=${periodeId} sasaranId=${sasaranId} tanggal=${tanggal} user=${req.pengguna?.id}`);
                gagal(res, 404, "Sasaran tidak ditemukan, di luar RT, atau sesi sudah ditutup.");
                return;
            }
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

    rute.post("/antrean/:id/konfirmasi-kms", wajibBoleh(["konfirmasi-kms", "catat-pengukuran-lapangan"]), async (req, res, next) => {
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

    rute.post("/antrean/konfirmasi-semua-kms", wajibBoleh(["konfirmasi-kms", "catat-pengukuran-lapangan"]), async (req, res, next) => {
        const periodeRaw = req.body?.periodeId;
        const periodeId = Number(periodeRaw);
        const tanggal = typeof req.body?.tanggal === "string" ? req.body.tanggal : "";
        if (!Number.isSafeInteger(periodeId) || periodeId < 1 || !TANGGAL.test(tanggal)) {
            gagal(res, 400, "Periode dan tanggal antrean tidak valid.");
            return;
        }
        try {
            const jumlah = await dalamTransaksi(pool, { pengguna: req.pengguna!.id, sumber: "tablet" }, db =>
                antreanRepo.konfirmasiSemuaKms(db, req.pengguna!, periodeId, tanggal));
            res.json({ ok: true, jumlah });
        } catch (error) { next(error); }
    });
    return rute;
}
