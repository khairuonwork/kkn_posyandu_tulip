import { Router } from "express";
import { konteksPelatihan } from "./pelatihan-context.ts";
import type { Pool } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { beranda, periode } from "../services/beranda-service.ts";
import { wajibBoleh, wajibLihatDataWeb } from "./middleware.ts";
import { GalatHariH, ubahHariH } from '../services/cakupan-hari-h.ts';

/**
 * Beranda dibuka di beberapa laptop sekaligus dan disegarkan tiap 30 detik.
 * Hasil yang sama dipakai bersama selama UMUR_CACHE_MS agar tidak setiap layar
 * menarik ulang data dari Supabase. Setiap tulis yang berhasil menghapus cache.
 */
// ponytail: cache per proses. Tulis lewat server lain ke DB yang sama baru terlihat
// setelah UMUR_CACHE_MS; pakai LISTEN/NOTIFY bila itu jadi masalah.
const UMUR_CACHE_MS = 30_000;
const cacheBeranda = new Map<string, { sampai: number; hasil: ReturnType<typeof beranda> }>();

export function lupakanCacheBeranda(): void {
    cacheBeranda.clear();
}

function berandaBersama(pool: Pool, pengguna: PenggunaAktif, id: string, rt: string | null) {
    const kunci = JSON.stringify([pengguna.peran, pengguna.superAdmin ?? false,
        [...(pengguna.posyanduIds ?? [])].sort((a, b) => a - b), id, rt]);
    const sekarang = Date.now();
    const ada = cacheBeranda.get(kunci);

    if (ada && ada.sampai > sekarang) {
        return ada.hasil;
    }

    const hasil = beranda(pool, pengguna, id, rt);
    cacheBeranda.set(kunci, { sampai: sekarang + UMUR_CACHE_MS, hasil });
    hasil.catch(() => {
        if (cacheBeranda.get(kunci)?.hasil === hasil) cacheBeranda.delete(kunci);
    });

    return hasil;
}

export function ruteBeranda(pool: Pool): Router {
    const rute = Router();

    rute.put('/beranda/hari-h',wajibBoleh('ubah-pengukuran'),async(req,res,next) => {
        try {res.json(await ubahHariH(pool,req.pengguna!,req.body));}
        catch(error){if(error instanceof GalatHariH)res.status(error.status).json({galat:error.message});else next(error);}
    });

    rute.get("/periode", wajibBoleh("lihat-dashboard"), async (req, res, next) => {
        try {
            res.json(await periode(pool, req.pengguna!, !!konteksPelatihan.getStore()?.id));
        } catch (galat) { next(galat); }
    });

    rute.get("/beranda", wajibBoleh("lihat-dashboard"), wajibLihatDataWeb, async (req, res, next) => {
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
            // Ruang pelatihan memakai data latihannya sendiri: tidak ikut cache.
            const hasil = konteksPelatihan.getStore()?.id
                ? await beranda(pool, req.pengguna!, id, rt)
                : await berandaBersama(pool, req.pengguna!, id, rt);
            if (hasil === null) {
                res.status(404).json({ galat: "Periode tidak tersedia." });
                return;
            }
            res.json(hasil);
        } catch (galat) { next(galat); }
    });

    return rute;
}
