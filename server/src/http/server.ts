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
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express, NextFunction, Request, Response } from "express";
import type { Pool } from "pg";

import { ruteAuth } from "./auth-controller.ts";
import { ruteBeranda } from "./beranda-controller.ts";
import { ruteAnak } from "./anak-controller.ts";
import { ruteLembar } from "./lembar-controller.ts";
import { sesiMiddleware, wajibJson } from "./middleware.ts";
import { rutePengguna } from "./pengguna-controller.ts";
import { ruteSasaran } from "./sasaran-controller.ts";
import {
    ambilDaftarTabletAktif,
    catatHeartbeatTablet,
    dapatkanDaftarIpLokal,
    mulaiLayananDiscovery,
} from "./discovery.ts";

export function buatApp(pool: Pool): Express {
    const app = express();
    const folderWeb = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../../client/dist",
    );

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
                "Authorization, Content-Type, ngrok-skip-browser-warning",
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
                ipLokal: dapatkanDaftarIpLokal(),
            });
        } catch (galat) {
            next(galat);
        }
    });

    // Detak jantung (heartbeat) dari tablet Android agar PC dan tablet saling mengetahui status koneksi
    app.post("/api/v1/heartbeat", (req: Request, res: Response) => {
        const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
        catatHeartbeatTablet(ip, req.body ?? {});
        res.json({
            ok: true,
            status: "terhubung",
            waktuServer: new Date().toISOString(),
        });
    });

    // Informasi perangkat tablet yang sedang terhubung ke PC
    app.get("/api/v1/perangkat-terhubung", (_req: Request, res: Response) => {
        res.json({
            serverIp: dapatkanDaftarIpLokal(),
            daftarTablet: ambilDaftarTabletAktif(),
        });
    });

    app.use("/api/v1", ruteAnak(pool));
    app.use("/api/v1", ruteLembar(pool));
    app.use("/api/v1", ruteBeranda(pool));
    app.use("/api/v1", ruteSasaran(pool));

    app.use("/api", (_req: Request, res: Response) => {
        res.status(404).json({ galat: "Rute tidak ada" });
    });

    // Saat dijalankan lewat mulai-ngrok.sh, Express menjadi satu pintu untuk
    // website dan REST API. Dengan begitu satu domain ngrok tetap cukup untuk
    // browser petugas dan aplikasi Android.
    if (existsSync(folderWeb)) {
        app.use(express.static(folderWeb));
        app.use((req: Request, res: Response, next: NextFunction) => {
            if (req.method !== "GET" || !req.accepts("html")) {
                next();
                return;
            }
            res.sendFile(path.join(folderWeb, "index.html"));
        });
    }

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
        mulaiLayananDiscovery(porta, Number(process.env.PORT_WEB ?? 5173));
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
