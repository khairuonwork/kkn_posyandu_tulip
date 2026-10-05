/**
 * Server HTTP.
 *
 *     npm run dev     — pengembangan, memuat ulang saat berkas berubah
 *     npm run mulai   — menjalankan apa adanya
 *
 * `buatApp` dipisah dari `listen` supaya pengujian dapat menyalakan server di
 * porta acak tanpa pustaka uji HTTP tambahan.
 */

import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import type { Pool } from "pg";

import { ruteAuth } from "./auth-controller.ts";
import { ruteBeranda } from "./beranda-controller.ts";
import { ruteAnak } from "./anak-controller.ts";
import { ruteLembar } from "./lembar-controller.ts";
import { sesiMiddleware, wajibJson } from "./middleware.ts";
import { rutePengguna } from "./pengguna-controller.ts";
import { ruteSasaran } from "./sasaran-controller.ts";

export function buatApp(pool: Pool): Express {
    const app = express();

    // Di balik proxy Vite saat pengembangan, dan kemungkinan di balik proxy
    // lain saat produksi. Tanpa ini `req.ip` selalu alamat proxy-nya, dan
    // pembatas percobaan masuk kehilangan artinya.
    app.set("trust proxy", "loopback");
    app.disable("x-powered-by");

    // Impor Excel dikirim sebagai base64 JSON agar tetap dilindungi aturan
    // Content-Type/CSRF yang sama. Parser menegakkan batas file 3 MB.
    app.use(express.json({ limit: "4mb" }));
    app.use(wajibJson);
    app.use(sesiMiddleware(pool));

    // HTML tablet dibundel sebagai file lokal WebView sehingga origin-nya
    // `null`. Hanya API v1 bertoken yang dibuka untuk origin tersebut.
    app.use("/api/v1", (req, res, next) => {
        if (req.headers.origin === "null") {
            res.set("Access-Control-Allow-Origin", "null");
            res.set("Vary", "Origin");
            res.set(
                "Access-Control-Allow-Headers",
                "Authorization, Content-Type",
            );
            res.set(
                "Access-Control-Allow-Methods",
                "GET, POST, PATCH, OPTIONS",
            );
        }

        if (req.method === "OPTIONS") {
            res.status(204).end();
            return;
        }

        next();
    });

    app.use("/api", ruteAuth(pool));
    app.use("/api", rutePengguna(pool));

    // Dipakai aplikasi Android untuk memeriksa jalur PC -> API -> PostgreSQL
    // sebelum kader mencoba masuk. Tidak mengungkap DSN atau rincian database.
    app.get("/api/v1/kesehatan", async (_req, res, next) => {
        try {
            await pool.query("SELECT 1");
            res.json({
                status: "siap",
                database: "terhubung",
                waktuServer: new Date().toISOString(),
            });
        } catch (galat) {
            next(galat);
        }
    });

    app.use("/api/v1", ruteAnak(pool));
    app.use("/api/v1", ruteLembar(pool));
    app.use("/api/v1", ruteBeranda(pool));
    app.use("/api/v1", ruteSasaran(pool));

    app.use("/api", (_req: Request, res: Response) => {
        res.status(404).json({ galat: "Rute tidak ada" });
    });

    // Galat tak terduga tidak boleh bocor ke pemanggil: pesan pustaka basis
    // data kerap memuat potongan query beserta nilainya.
    app.use(
        (galat: Error, _req: Request, res: Response, _next: NextFunction) => {
            console.error(galat);

            if (!res.headersSent) {
                res.status(500).json({ galat: "Terjadi kesalahan di server" });
            }
        },
    );

    return app;
}

/**
 * 4321, bukan 3000.
 *
 * Port 3000 adalah port pengembangan paling ramai di mesin mana pun, dan pada
 * Windows tabrakannya tidak berbunyi: proses kedua tetap dapat mengikat port
 * yang sama, mengaku siap, lalu permintaan mendarat di aplikasi yang lain.
 * Gejalanya jauh dari sebabnya — jawaban yang tidak dikenali, dari server yang
 * tidak pernah kita tulis.
 *
 * Bawaannya tetap 127.0.0.1. Untuk QA satu AP, `mulai-qa-lan.ps1` menyetel
 * HOST=0.0.0.0 secara eksplisit agar tablet dapat menjangkaunya lewat IP PC.
 */
const PORTA_BAWAAN = 4321;
const ALAMAT_BAWAAN = "127.0.0.1";

if (import.meta.filename === process.argv[1]) {
    const { dapatkanPool } = await import("../db/pool.ts");
    const porta = Number(process.env.PORT ?? PORTA_BAWAAN);
    const alamat = (process.env.HOST ?? ALAMAT_BAWAAN).trim();

    if (alamat === "") {
        throw new Error("HOST tidak boleh kosong.");
    }

    const server = buatApp(dapatkanPool()).listen(porta, alamat, () => {
        console.log(`Server siap di http://${alamat}:${porta}`);
    });

    server.on("error", (galat: NodeJS.ErrnoException) => {
        if (galat.code === "EADDRINUSE") {
            console.error(
                `Porta ${porta} sudah dipakai proses lain. Setel PORT di server/.env ke porta lain.`,
            );
            process.exit(1);
        }

        throw galat;
    });
}
