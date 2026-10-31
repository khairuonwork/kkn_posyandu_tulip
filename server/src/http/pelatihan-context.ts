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

type Konteks = {
    client: PoolClient;
    id: string | null;
    closed?: boolean;
    antrean?: Promise<unknown>;
};
export const konteksPelatihan = new AsyncLocalStorage<Konteks>();

function jalankanBerurutan<T>(ctx: Konteks, fn: () => Promise<T>): Promise<T> {
    const sebelumnya = ctx.antrean ?? Promise.resolve();
    const berikutnya = sebelumnya.catch(() => {}).then(fn);
    ctx.antrean = berikutnya;
    return berikutnya;
}

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
                    return jalankanBerurutan(ctx, () =>
                        Promise.resolve(
                            Reflect.apply(ctx.client.query, ctx.client, args),
                        ),
                    );
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
                                    return jalankanBerurutan(ctx, () =>
                                        Promise.resolve(
                                            Reflect.apply(c.query, c, args),
                                        ),
                                    );
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
        if (!req.pengguna && !/\/lembar/.test(req.path)) {
            if (
                !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
                (mengandungIdentitasLatihan(req.body) ||
                    mengandungIdentitasLatihan(req.path))
            ) {
                res.status(409).json({
                    galat: "Kiriman latihan ditolak pada mode riil. Hapus data latihan lokal dan sinkronkan ulang.",
                });
                return;
            }
            next();
            return;
        }
        let sudahTutup = false;
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
        const batasWaktu = setTimeout(() => {
            rusak = true;
            lease.closed = true;
            void bersihkan();
        }, 25_000);
        batasWaktu.unref?.();
        const bersihkan = async () => {
            if (done) return;
            done = true;
            lease.closed = true;
            clearTimeout(batasWaktu);
            req.removeListener("close", saatTutup);
            res.removeListener("close", saatTutup);
            res.removeListener("finish", saatTutup);
            db.removeListener('error',koneksiPutus);
            if (rusak) { db.release(true); return; }
            await jalankanBerurutan(lease, async () => {
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
            });
        };
        const saatTutup = () => {
            sudahTutup = true;
            void bersihkan();
        };
        req.once("close", saatTutup);
        res.once("close", saatTutup);
        res.once("finish", saatTutup);
        db.on('error',koneksiPutus);
        try {
            await db.query("SELECT pg_advisory_lock_shared($1)", [
                KUNCI_PELATIHAN,
            ]);
            const aktif = await sesiAktif(db);
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
            res.set("X-Simpatik-Mode", aktif ? "pelatihan" : "riil");
            if (!aktif) {
                await bersihkan();
                if (!sudahTutup && !req.destroyed && !res.destroyed && !res.writableEnded) {
                    next();
                }
                return;
            }
            await db.query(
                `SET search_path TO ${skemaAman(aktif.skema)}, pg_catalog`,
            );
            if (sudahTutup || req.destroyed || res.destroyed || res.writableEnded) {
                await bersihkan();
                return;
            }
            lease.id = aktif.id;
            konteksPelatihan.run(lease, next);
        } catch (error) {
            await bersihkan();
            next(error);
        }
    };
}
