import { Router } from "express";
import type { Response } from "express";
import type { Pool } from "pg";

import type { StatusAntrean } from "../repositories/antrean-repository.ts";
import * as antreanRepo from "../repositories/antrean-repository.ts";
import { daftarPanggilan, mejaAkunKms, sesiKms, ubahPanggilan } from "../repositories/panggilan-kms-repository.ts";
import { dalamTransaksi } from "../db/transaksi.ts";
import { wajibBoleh } from "./middleware.ts";
import { boleh } from "../auth/peran.ts";

const STATUS: readonly StatusAntrean[] = ["waiting", "called", "serving", "kms_review", "done", "cancelled"];
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const tanggalJakarta = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", dateStyle: "short" });

function gagal(res: Response, status: number, pesan: string) {
    res.status(status).json({ galat: pesan });
}

export function ruteAntrean(pool: Pool): Router {
    const rute = Router();

    rute.get(["/antrean-kms", "/panggilan-kms"], wajibBoleh("konfirmasi-kms"), async (req, res) => {
        const setelah = req.query.setelah ?? null;
        if (setelah !== null && (typeof setelah !== "string" || !/^\d{1,18}$/.test(setelah))) {
            gagal(res, 400, "Penanda panggilan tidak valid.");
            return;
        }
        const pengguna = req.pengguna!;
        const tanggal = tanggalJakarta.format(new Date());
        const sesi = await sesiKms(pool, pengguna, tanggal.slice(0, 7));
        res.set("Cache-Control", "no-store");
        if (req.path === "/panggilan-kms") {
            const lingkup = sesi ? `${sesi.id}:${tanggal}` : null;
            const panggilan = sesi ? await daftarPanggilan(pool, sesi.id, tanggal, req.query.lingkup === lingkup ? setelah : null) : [];
            res.json({ panggilan, lingkup });
            return;
        }
        res.json({
            items: sesi ? (await antreanRepo.daftar(pool, pengguna, sesi.id, tanggal)).map(({
                id, anakId, nomor, nama, namaOrtu, rt, status, checkedInAt, mejaKms, tibaKms, sudahDiukur,
            }) => ({ id, anakId, nomor, nama, namaOrtu, rt, status, checkedInAt, mejaKms, tibaKms, sudahDiukur })) : [],
            mejaKms: sesi ? sesi.mejaKms : await mejaAkunKms(pool, pengguna.id),
        });
    });

    rute.post("/antrean-kms/:id/panggilan", wajibBoleh("konfirmasi-kms"), async (req, res) => {
        const { id } = req.params;
        const { aksi, meja } = req.body ?? {};
        if (typeof id !== "string" || !/^antrean_\d{8}_\d+$/.test(id) ||
            typeof meja !== "number" || !Number.isInteger(meja) || meja < 1 || meja > 99 ||
            (aksi !== "panggil" && aksi !== "ulang" && aksi !== "tiba" && aksi !== "kembalikan")) {
            gagal(res, 400, "Aksi panggilan tidak valid.");
            return;
        }
        const pengguna = req.pengguna!;
        const tanggal = tanggalJakarta.format(new Date());
        const sesi = await sesiKms(pool, pengguna, tanggal.slice(0, 7));
        if (!sesi) { gagal(res, 404, "Sesi antrean belum tersedia."); return; }
        const hasil = await dalamTransaksi(pool, { pengguna: pengguna.id, sumber: "web-kms" }, db =>
            ubahPanggilan(db, pengguna.id, sesi.id, tanggal, id, aksi, meja));
        if (hasil === "tanpa-meja") {
            gagal(res, 403, "Meja KMS belum ditetapkan atau sesi sudah ditutup.");
            return;
        }
        if (hasil === "bentrok") {
            gagal(res, 409, "Peserta atau meja sudah berubah. Periksa antrean terbaru.");
            return;
        }
        res.json({ ok: true });
    });

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
        if (status === "done" && !boleh(req.pengguna!.peran, "konfirmasi-kms", req.pengguna!.superAdmin)) {
            gagal(res, 403, "Tidak berhak menyelesaikan pemeriksaan KMS.");
            return;
        }
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
                antreanRepo.konfirmasiKms(db, req.pengguna!, id, !req.headers.authorization?.startsWith("Bearer ")));
            if (!item) { gagal(res, 409, "Pastikan peserta sudah tiba di meja Anda, data ukur lengkap, dan sesi masih terbuka."); return; }
            res.json({ item });
        } catch (error) { next(error); }
    });

    rute.post("/antrean/konfirmasi-semua-kms", wajibBoleh("konfirmasi-kms"), async (req, res, next) => {
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
