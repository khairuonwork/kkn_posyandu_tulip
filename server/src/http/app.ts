/**
 * Perakitan aplikasi Express (middleware + rute), tanpa `listen`.
 *
 * Dipisah dari server.ts supaya pengujian dapat menyalakan aplikasi di porta
 * acak tanpa pustaka uji HTTP tambahan.
 */

import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import type { Express, NextFunction, Request, Response } from "express";
import type { Pool } from "pg";

import { ruteAuth } from "./auth-controller.ts";
import { ruteAntrean } from "./antrean-controller.ts";
import { ruteBeranda } from "./beranda-controller.ts";
import { ruteAnak } from "./anak-controller.ts";
import { ruteLembar } from "./lembar-controller.ts";
import { ruteLaporan } from "./laporan-controller.ts";
import { ruteSurveiKia } from './survei-kia-controller.ts';
import { sesiMiddleware, wajibJson } from "./middleware.ts";
import { rutePengguna } from "./pengguna-controller.ts";
import { ruteSasaran } from "./sasaran-controller.ts";
import { ruteCluster } from "./cluster-controller.ts";
import { rutePerangkat } from './perangkat-controller.ts';
import { muatKonfigurasi } from "../config.ts";
import type { KonfigurasiServer } from "../config.ts";
import { rutePelatihan } from './pelatihan-controller.ts';
import { lingkupPelatihan, poolOperasional } from './pelatihan-context.ts';

export function buatApp(
    pool: Pool,
    konfigurasi: KonfigurasiServer = muatKonfigurasi(),
): Express {
    const app = express();
    const folderWeb = konfigurasi.folderWeb;
    const authPool = pool;
    pool = poolOperasional(authPool);

    // Di balik proxy Vite saat pengembangan, dan kemungkinan di balik proxy
    // lain saat produksi (atur lewat TRUST_PROXY). Tanpa ini `req.ip` selalu
    // alamat proxy-nya, dan pembatas percobaan masuk kehilangan artinya.
    app.set("trust proxy", konfigurasi.trustProxy);
    app.disable("x-powered-by");

    // Catat hasil login saja, tanpa password, token, cookie, atau badan permintaan.
    app.use((req, res, next) => {
        if (req.method === "POST" && ["/api/masuk", "/api/v1/masuk"].includes(req.path)) {
            res.once("finish", () => {
                const hasil: Record<number, string> = {
                    200: "berhasil", 400: "isian_tidak_valid", 401: "ditolak",
                    429: "terlalu_banyak_percobaan", 415: "format_bukan_json", 500: "galat_server",
                };
                console.log("[Login]", JSON.stringify({
                    waktu: new Date().toISOString(), ip: req.ip, rute: req.path,
                    username: typeof req.body?.username === "string" ? req.body.username.trim().slice(0, 32) : null,
                    status: res.statusCode,
                    sebab: res.locals.diagnostikLogin ?? hasil[res.statusCode] ?? "respons_lain",
                    usernameTerisi: typeof req.body?.username === "string" && req.body.username.trim() !== "",
                    kataSandiTerisi: typeof req.body?.kataSandi === "string" && req.body.kataSandi !== "",
                }));
            });
        }
        next();
    });

    // Impor Excel dikirim sebagai base64 JSON agar tetap dilindungi aturan
    // Content-Type/CSRF yang sama. Parser menegakkan batas file 3 MB.
    app.use(express.json({ limit: "4mb" }));
    app.use(wajibJson);
    app.use(sesiMiddleware(authPool));

    // HTML tablet dibundel sebagai file lokal WebView sehingga origin-nya
    // `null`. Hanya API v1 bertoken yang dibuka untuk origin tersebut.
    app.use("/api/v1", (req, res, next) => {
        if (req.headers.origin === "null") {
            res.set("Access-Control-Allow-Origin", "null");
            res.set("Vary", "Origin");
            res.set(
                "Access-Control-Allow-Headers",
                "Authorization, Content-Type, ngrok-skip-browser-warning, X-SIMpatik-Device-Id",
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

    // Jejak tulis ringkas (tanpa isi body) agar kiriman APK yang gagal terlihat di log.
    app.use("/api", (req, res, next) => {
        res.once("finish", () => {
            if (/\/masuk/.test(req.path)) return;
            if (req.method === "GET" && res.statusCode < 400 && !/antrean|sinkronisasi/.test(req.path)) return;
            console.log(
                `[Tulis] ${req.method} ${req.originalUrl.split("?")[0]} -> ${res.statusCode} mode=${res.getHeader("X-Simpatik-Mode") ?? "-"}`,
            );
        });
        next();
    });

    app.use('/api/v1',rutePelatihan(authPool));
    app.use("/api", ruteAuth(authPool));

    // Dipakai aplikasi Android untuk memeriksa jalur PC -> API -> PostgreSQL
    // sebelum kader mencoba masuk. Tidak mengungkap DSN atau rincian database.
    app.get("/api/v1/kesehatan", async (_req, res, next) => {
        try {
            await authPool.query("SELECT 1");
            res.json({
                status: "siap",
                database: "terhubung",
                waktuServer: new Date().toISOString(),
            });
        } catch (galat) {
            next(galat);
        }
    });

    app.use('/api',lingkupPelatihan(authPool));
    app.use('/api',rutePengguna(pool));
    app.use('/api/v1', rutePerangkat(pool));

    app.use("/api/v1", ruteAnak(pool));
    app.use("/api/v1", ruteCluster(pool));
    app.use('/api/v1', ruteSurveiKia(pool));
    app.use("/api/v1", ruteAntrean(pool));
    app.use("/api/v1", ruteLembar(pool));
    app.use("/api/v1", ruteLaporan(pool));
    app.use("/api/v1", ruteBeranda(pool));
    app.use("/api/v1", ruteSasaran(pool));

    app.use("/api", (_req: Request, res: Response) => {
        res.status(404).json({ galat: "Rute tidak ada" });
    });

    // Saat disajikan bersama web statis atau tunnel, Express menjadi satu pintu untuk
    // website dan REST API. Dengan begitu satu domain tetap cukup untuk
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
