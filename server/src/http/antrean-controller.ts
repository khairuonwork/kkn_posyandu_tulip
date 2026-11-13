import { Router } from "express";
import type { Response } from "express";
import type { Pool } from "pg";

import type { StatusAntrean } from "../repositories/antrean-repository.ts";
import * as antreanRepo from "../repositories/antrean-repository.ts";
import { dalamTransaksi } from "../db/transaksi.ts";
import { wajibBoleh } from "./middleware.ts";
import { boleh } from "../auth/peran.ts";
import type { PenggunaAktif } from "../auth/peran.ts";
import { prioritasUntukAnak } from "../services/prioritas-kms.ts";

const STATUS: readonly StatusAntrean[] = ["waiting", "called", "serving", "kms_review", "done", "cancelled"];
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** true/false/null dipakai apa adanya; nilai lain berarti tidak dikirim. */
function yaTidak(nilai: unknown): boolean | null | undefined {
    if (nilai === true || nilai === false || nilai === null) return nilai;
    return undefined;
}

function teksOpsional(nilai: unknown, batas: number): string | null | undefined {
    if (nilai === undefined) return undefined;
    if (nilai === null) return null;
    if (typeof nilai !== "string") return undefined;
    return nilai.trim().slice(0, batas) || null;
}

function gagal(res: Response, status: number, pesan: string) {
    res.status(status).json({ galat: pesan });
}

/** Portal memakai YYYY-MM; tablet memakai primary key periode. */
async function periodeDari(pool: Pool, pengguna: PenggunaAktif, mentah: unknown): Promise<number | null> {
    const teks = typeof mentah === "number" ? String(mentah) : typeof mentah === "string" ? mentah : "";
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(teks)) {
        const [tahun, bulan] = teks.split("-").map(Number);
        const { rows } = await pool.query<{ id: number }>(
            `SELECT id FROM periode
              WHERE tahun=$1 AND bulan=$2
                AND ($3::boolean OR posyandu_id=ANY($4::bigint[]))
              ORDER BY posyandu_id LIMIT 1`,
            [tahun, bulan, pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []],
        );
        return rows[0] ? Number(rows[0].id) : null;
    }
    const angka = Number(teks);
    return Number.isSafeInteger(angka) && angka > 0 ? angka : null;
}

function jawabPanggilan(res: Response, hasil: antreanRepo.HasilPanggilKms) {
    switch (hasil.status) {
        case "ok":
            res.json({ item: hasil.item });
            return;
        case "kosong":
            res.json({ item: null, pesan: "Tidak ada anak yang menunggu pemeriksaan KMS." });
            return;
        case "masih-memeriksa":
            res.status(409).json({ galat: `Anda masih memeriksa ${hasil.item.nama}. Konfirmasi selesai atau lepaskan dahulu.`, item: hasil.item });
            return;
        case "milik-lain":
            res.status(409).json({ galat: `Anak ini sedang diperiksa ${hasil.petugas ?? "petugas lain"}.` });
            return;
        default:
            gagal(res, 404, "Antrean KMS tidak ditemukan atau sesi sudah ditutup.");
    }
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
            const items = await antreanRepo.daftar(pool, req.pengguna!, periodeId, tanggal);
            // Prioritas hanya dihitung untuk anak yang menunggu atau sedang diperiksa KMS.
            const prioritas = await prioritasUntukAnak(pool, periodeId,
                items.filter(item => item.status === "kms_review").map(item => Number(item.anakId)));
            res.json({
                items: items.map(item => ({
                    ...item,
                    kmsMilikSaya: item.kmsPetugasId !== null && item.kmsPetugasId === req.pengguna!.id,
                    prioritasKms: prioritas.get(Number(item.anakId)) ?? null,
                })),
            });
        } catch (error) { next(error); }
    });

    rute.post("/antrean", wajibBoleh("catat-pengukuran-lapangan"), async (req, res, next) => {
        const periodeId = Number(req.body?.periodeId);
        const sasaranId = Number(req.body?.sasaranId);
        const tanggal = typeof req.body?.tanggal === "string" ? req.body.tanggal : "";
        const catatanRaw = req.body?.catatan;
        const catatan = typeof catatanRaw === "string" ? catatanRaw.trim().slice(0, 240) || null : null;
        const menyusui = {
            masihMenyusui: yaTidak(req.body?.masihMenyusui),
            asiEksklusif: yaTidak(req.body?.asiEksklusif),
        };
        if (!Number.isSafeInteger(periodeId) || periodeId < 1 || !Number.isSafeInteger(sasaranId) || sasaranId < 1 || !TANGGAL.test(tanggal)) {
            gagal(res, 400, "Data check-in antrean tidak valid.");
            return;
        }
        try {
            const item = await dalamTransaksi(pool, { pengguna: req.pengguna!.id, sumber: "tablet" }, db =>
                antreanRepo.checkIn(db, req.pengguna!, periodeId, sasaranId, tanggal, catatan, menyusui));
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
        // Opsional: catatan/pengamatan khusus KMS (mis. 2T, 3T, anak sakit).
        const catatanKms = teksOpsional(req.body?.catatanKms, 500);
        try {
            const item = await dalamTransaksi(pool, { pengguna: req.pengguna!.id, sumber: "web-kms" }, db =>
                antreanRepo.konfirmasiKms(db, req.pengguna!, id, catatanKms));
            if (!item) { gagal(res, 409, "Antrean belum menunggu pemeriksaan KMS, sedang diperiksa petugas lain, atau sesi sudah ditutup."); return; }
            res.json({ item });
        } catch (error) { next(error); }
    });

    rute.post("/antrean/panggil-kms-berikutnya", wajibBoleh("konfirmasi-kms"), async (req, res, next) => {
        const tanggal = typeof req.body?.tanggal === "string" ? req.body.tanggal : "";
        try {
            const periodeId = await periodeDari(pool, req.pengguna!, req.body?.periodeId);
            if (periodeId === null || !TANGGAL.test(tanggal)) {
                gagal(res, 400, "Periode dan tanggal antrean tidak valid.");
                return;
            }
            const hasil = await dalamTransaksi(pool, { pengguna: req.pengguna!.id, sumber: "web-kms" }, db =>
                antreanRepo.panggilKmsBerikutnya(db, req.pengguna!, periodeId, tanggal));
            jawabPanggilan(res, hasil);
        } catch (error) { next(error); }
    });

    for (const [aksi, fungsi] of [["panggil-kms", antreanRepo.panggilKms], ["lepas-kms", antreanRepo.lepasKms]] as const) {
        rute.post(`/antrean/:id/${aksi}`, wajibBoleh("konfirmasi-kms"), async (req, res, next) => {
            const id = typeof req.params.id === "string" ? req.params.id : "";
            if (!/^antrean_\d{8}_\d+$/.test(id)) {
                gagal(res, 400, "ID antrean tidak valid.");
                return;
            }
            try {
                const hasil = await dalamTransaksi(pool, { pengguna: req.pengguna!.id, sumber: "web-kms" }, db =>
                    fungsi(db, req.pengguna!, id));
                jawabPanggilan(res, hasil);
            } catch (error) { next(error); }
        });
    }

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
