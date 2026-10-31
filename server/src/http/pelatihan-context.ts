import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestHandler } from "express";
import type { Pool, PoolClient } from "pg";
import {
    fiturPelatihan,
    KUNCI_PELATIHAN,
    mengandungIdentitasLatihan,
    sesiAktif,
    skemaAman,
} from "../services/pelatihan.ts";
import { ringkasanToken } from "../auth/sesi.ts";
import { tokenPermintaan } from "./middleware.ts";

type Konteks = { client: PoolClient; id: string | null; closed?: boolean };
export const konteksPelatihan = new AsyncLocalStorage<Konteks>();
export function pastikanQueryTerisolasi(query: unknown): void {
    const text =
        typeof query === "string"
            ? query
            : ((query as { text?: string })?.text ?? "");
    if (
        /(?:\bpublic\b|"public")\s*\.|\b(?:RESET\s+ALL|DISCARD\s+ALL)|\b(?:SET|RESET)\s+(?:LOCAL\s+)?(?:search_path|role)\b|\bset_config\s*\(\s*['"](?:search_path|role)['"]/i.test(
            text,
        )
    )
        throw new Error("Akses di luar ruang pelatihan ditolak.");
}

/** Router yang sama dipakai web dan APK. Pool produksi tidak pernah berganti search_path. */
export function poolOperasional(pool: Pool): Pool {
    return new Proxy(pool, {
        get(target, prop) {
            const ctx = konteksPelatihan.getStore();
            if (ctx && prop === "query")
                return (...args: unknown[]) => {
                    if (ctx.closed)
                        throw new Error(
                            "Permintaan sudah selesai; akses database ditolak.",
                        );
                    if (ctx.id) pastikanQueryTerisolasi(args[0]);
                    return Reflect.apply(ctx.client.query, ctx.client, args);
                };
            if (ctx && prop === "connect")
                return async () => {
                    if (ctx.closed)
                        throw new Error(
                            "Permintaan sudah selesai; akses database ditolak.",
                        );
                    return new Proxy(ctx.client, {
                        get(c, k) {
                            if (k === "release") return () => {};
                            if (k === "query")
                                return (...args: unknown[]) => {
                                    if (ctx.closed)
                                        throw new Error(
                                            "Permintaan sudah selesai; akses database ditolak.",
                                        );
                                    if (ctx.id)
                                        pastikanQueryTerisolasi(args[0]);
                                    return Reflect.apply(c.query, c, args);
                                };
                            const v = Reflect.get(c, k);
                            return typeof v === "function" ? v.bind(c) : v;
                        },
                    });
                };
            const v = Reflect.get(target, prop);
            return typeof v === "function" ? v.bind(target) : v;
        },
    });
}

export function lingkupPelatihan(pool: Pool): RequestHandler {
    return async (req, res, next) => {
        if (!fiturPelatihan()) {
            next();
            return;
        }
        const db = await pool.connect().catch((error) => {
            next(error);
            return null;
        });
        if (!db) return;
        const lease: Konteks = { client: db, id: null, closed: false };
        let done = false;
        let rusak = false;
        const koneksiPutus = () => {
            rusak = true;
            lease.closed = true;
            if (!res.headersSent) res.status(503).json({galat:'Koneksi database terputus. Silakan coba lagi.'});
            void bersihkan();
        };
        const bersihkan = async () => {
            if (done) return;
            done = true;
            lease.closed = true;
            db.removeListener('error',koneksiPutus);
            if (rusak) { db.release(true); return; }
            try {
                await db.query("ROLLBACK");
                await db.query("RESET search_path");
                await db.query("SELECT pg_advisory_unlock_shared($1)", [
                    KUNCI_PELATIHAN,
                ]);
                db.release();
            } catch {
                db.release(true);
            }
        };
        db.on('error',koneksiPutus);
        try {
            await db.query("SELECT pg_advisory_lock_shared($1)", [
                KUNCI_PELATIHAN,
            ]);
            const aktif = await sesiAktif(db);
            const token = tokenPermintaan(req);
            if (req.pengguna && token) {
                const epoch = (
                    await db.query<{ pelatihan_id: string | null }>(
                        "SELECT pelatihan_id FROM public.sesi WHERE ringkasan=$1 AND kedaluwarsa>now()",
                        [ringkasanToken(token)],
                    )
                ).rows[0];
                if (!epoch || epoch.pelatihan_id !== (aktif?.id ?? null)) {
                    res.status(401).json({
                        galat: "Mode layanan berubah. Masuk kembali lalu sinkronkan tablet.",
                    });
                    await bersihkan();
                    return;
                }
            }
            if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
                if (
                    !aktif &&
                    (mengandungIdentitasLatihan(req.body) ||
                        mengandungIdentitasLatihan(req.path))
                ) {
                    res.status(409).json({
                        galat: "Kiriman latihan ditolak pada mode riil. Hapus data latihan lokal dan sinkronkan ulang.",
                    });
                    await bersihkan();
                    return;
                }
                // APK lama dapat mendaftar offline. NIK latihan harus selalu punya namespace terpisah.
                if (
                    aktif &&
                    req.path.endsWith("/anak") &&
                    req.body?.nik &&
                    !/^0099\d{12}$/.test(String(req.body.nik))
                ) {
                    res.status(409).json({
                        galat: "Mode latihan: gunakan NIK contoh berawalan 0099 (16 digit), bukan NIK riil.",
                    });
                    await bersihkan();
                    return;
                }
                if (aktif && /\/lembar/.test(req.path)) {
                    res.status(409).json({
                        galat: "Pengiriman tautan orang tua dinonaktifkan selama pelatihan.",
                    });
                    await bersihkan();
                    return;
                }
            }
            if (aktif)
                await db.query(
                    `SET search_path TO ${skemaAman(aktif.skema)}, pg_catalog`,
                );
            res.set("X-Simpatik-Mode", aktif ? "pelatihan" : "riil");
            res.once("finish", () => {
                void bersihkan();
            });
            res.once("close", () => {
                void bersihkan();
            });
            lease.id = aktif?.id ?? null;
            konteksPelatihan.run(lease, next);
        } catch (error) {
            await bersihkan();
            next(error);
        }
    };
}
