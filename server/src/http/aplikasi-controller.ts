import path from "node:path";
import { Router } from "express";

import { wajibMasuk } from "./middleware.ts";
import { bacaManifest, folderRilis, POLA_BERKAS, terbitkanRilis } from "../services/rilis-aplikasi.ts";

/**
 * Pembaruan APK langsung dari server. Versi dan unduhan bersifat publik
 * (hanya-baca) agar tablet yang belum masuk tetap dapat diperbarui.
 */
/**
 * Alamat publik semua server (utama + kembar) dari env SERVER_PUBLIK, dipisah koma.
 * Aplikasi menyimpan daftar ini agar tetap tersambung bila satu alamat berubah atau mati.
 */
export function daftarServerPublik(env: NodeJS.ProcessEnv = process.env): string[] {
    return [...new Set((env.SERVER_PUBLIK ?? "").split(",")
        .map(alamat => alamat.trim().replace(/\/+$/, ""))
        .filter(alamat => /^https:\/\/[^/\s]+\/api\/v1$/.test(alamat)))].slice(0, 10);
}

export function ruteAplikasi(folder = folderRilis(), server = daftarServerPublik()): Router {
    const rute = Router();

    rute.get("/aplikasi/server", (_req, res) => {
        res.set("Cache-Control", "no-store");
        res.json({ server });
    });

    rute.get("/aplikasi/versi", async (_req, res, next) => {
        try {
            res.set("Cache-Control", "no-store");
            const manifest = await bacaManifest(folder);
            if (!manifest) {
                res.status(404).json({ galat: "Belum ada rilis aplikasi di server." });
                return;
            }
            res.json({
                versionCode: manifest.versionCode,
                versionName: manifest.versionName,
                minVersionCode: manifest.minVersionCode,
                ukuran: manifest.ukuran,
                sha256: manifest.sha256,
                catatan: manifest.catatan,
                diterbitkan: manifest.diterbitkan,
                // Relatif terhadap /api/v1 supaya tetap benar bila alamat tunnel berganti.
                unduh: `/aplikasi/unduh/${encodeURIComponent(manifest.berkas)}`,
            });
        } catch (galat) {
            next(galat);
        }
    });

    rute.get("/aplikasi/unduh/:berkas", async (req, res, next) => {
        try {
            const berkas = String(req.params.berkas ?? "");
            const manifest = await bacaManifest(folder);
            // Hanya berkas rilis aktif; tidak ada akses ke berkas lain di folder.
            if (!manifest || !POLA_BERKAS.test(berkas) || berkas !== manifest.berkas) {
                res.status(404).json({ galat: "Berkas pembaruan tidak ditemukan." });
                return;
            }
            res.set("Cache-Control", "no-store");
            res.set("X-Simpatik-Sha256", manifest.sha256);
            res.type("application/vnd.android.package-archive");
            res.sendFile(path.join(folder, berkas), { dotfiles: "deny" }, galat => {
                if (galat && !res.headersSent) next(galat);
            });
        } catch (galat) {
            next(galat);
        }
    });

    rute.post("/aplikasi/rilis", wajibMasuk, async (req, res, next) => {
        if (!req.pengguna?.superAdmin) {
            res.status(403).json({ galat: "Hanya superadmin yang dapat menerbitkan pembaruan aplikasi." });
            return;
        }
        const b = req.body ?? {};
        const versionCode = Number(b.versionCode);
        const minVersionCode = b.minVersionCode === undefined ? 0 : Number(b.minVersionCode);
        if (!Number.isSafeInteger(versionCode) || versionCode < 1 || !Number.isSafeInteger(minVersionCode) ||
            minVersionCode < 0 || minVersionCode > versionCode || typeof b.versionName !== "string" ||
            typeof b.berkas !== "string" || (b.catatan !== undefined && typeof b.catatan !== "string")) {
            res.status(400).json({ galat: "Isi versionCode, versionName, berkas, dan minVersionCode (≤ versionCode) dengan benar." });
            return;
        }
        try {
            const manifest = await terbitkanRilis(folder, {
                versionCode, versionName: b.versionName, minVersionCode, berkas: b.berkas, catatan: b.catatan,
            });
            res.status(201).json({ rilis: manifest });
        } catch (galat) {
            if (galat instanceof RangeError) {
                res.status(400).json({ galat: galat.message });
                return;
            }
            next(galat);
        }
    });

    return rute;
}
