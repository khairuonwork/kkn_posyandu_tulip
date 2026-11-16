import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import type { Pool } from "pg";
import type { PenggunaAktif } from "../src/auth/peran.ts";
import { ruteKonfirmasiWa } from "../src/http/konfirmasi-wa-controller.ts";

test("konfirmasi dibatasi per anak, periode, wilayah dan peran", async () => {
    const catatan = new Set<string>();
    let pengguna: PenggunaAktif = {
        id: 1,
        peran: "kader",
        aktif: true,
        rt: null,
        posyanduIds: [7],
    };
    const pool = {
        async query(sql: string, args: unknown[]) {
            if (sql.includes("SELECT p.id AS")) {
                const [id, periode, superAdmin, wilayah] = args as [
                    number,
                    string,
                    boolean,
                    number[],
                ];
                return {
                    rows:
                        id === 1 &&
                        (superAdmin || wilayah.includes(7)) &&
                        ["2026-10", "2026-11"].includes(periode)
                            ? [{ periodeId: periode === "2026-10" ? 10 : 11 }]
                            : [],
                };
            }
            if (sql.startsWith("INSERT INTO")) {
                catatan.add(`${args[0]}:${args[1]}`);
                return { rows: [] };
            }
            if (sql.startsWith("DELETE FROM")) {
                catatan.delete(`${args[0]}:${args[1]}`);
                return { rows: [] };
            }
            if (sql.includes("SELECT k.anak_id")) {
                const bulan = args[0] === "2026-10" ? 10 : 11;
                return {
                    rows:
                        (args[2] as number[]).includes(7) &&
                        catatan.has(`1:${bulan}`)
                            ? [{ anakId: 1 }]
                            : [],
                };
            }
            throw new Error("Query tidak dikenal");
        },
    } as unknown as Pool;
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
        req.pengguna = pengguna;
        next();
    });
    app.use(ruteKonfirmasiWa(pool));
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}`;
    const post = (id: number, periode: string, terkirim: unknown) =>
        fetch(`${base}/anak/${id}/konfirmasi-whatsapp`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ periode, terkirim }),
        });
    const list = async (periode: string) =>
        (
            (await (
                await fetch(`${base}/konfirmasi-whatsapp?periode=${periode}`)
            ).json()) as { anakIds: number[] }
        ).anakIds;
    try {
        assert.deepEqual(await list("2026-10"), []);
        assert.equal((await post(1, "2026-10", true)).status, 200);
        assert.deepEqual(await list("2026-10"), [1]);
        assert.deepEqual(await list("2026-11"), []);
        assert.equal((await post(2, "2026-10", true)).status, 404);
        assert.equal((await post(1, "2026-13", true)).status, 400);
        assert.equal((await post(1, "2026-10", "ya")).status, 400);
        pengguna = { ...pengguna, posyanduIds: [8] };
        assert.equal((await post(1, "2026-10", false)).status, 404);
        assert.deepEqual(await list("2026-10"), []);
        pengguna = { ...pengguna, posyanduIds: [7], peran: "kms" };
        assert.equal((await post(1, "2026-10", false)).status, 403);
        pengguna = { ...pengguna, peran: "kader" };
        assert.equal((await post(1, "2026-10", false)).status, 200);
        assert.deepEqual(await list("2026-10"), []);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
        );
    }
});
