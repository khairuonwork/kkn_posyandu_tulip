import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import type { Pool } from "pg";
import type { PenggunaAktif } from "../src/auth/peran.ts";
import { ruteLaporan } from "../src/http/laporan-controller.ts";

test("endpoint survei menjaga izin laporan, validasi bulan, dan no-store", async () => {
    let pengguna: PenggunaAktif | undefined;
    let queries = 0;
    const pool = {
        query: async () => {
            queries++;
            return { rows: [] };
        },
    } as unknown as Pool;
    const app = express();
    app.use((req, _res, next) => {
        req.pengguna = pengguna;
        next();
    });
    app.use("/api/v1", ruteLaporan(pool));
    const server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const { port } = server.address() as { port: number };
    const url = `http://127.0.0.1:${port}/api/v1/laporan/tumbuh-kembang`;
    try {
        assert.equal((await fetch(`${url}?periode=2026-10`)).status, 401);
        pengguna = {
            id: 1,
            peran: "kms",
            aktif: true,
            rt: null,
            posyanduIds: [1],
        };
        assert.equal((await fetch(`${url}?periode=2026-10`)).status, 403);
        assert.equal(queries, 0);
        for (const peran of ["kader", "bidan", "admin"] as const) {
            pengguna = { ...pengguna, peran };
            assert.equal((await fetch(`${url}?periode=2026-13`)).status, 400);
            const res = await fetch(`${url}?periode=2026-10`);
            assert.equal(res.status, 200);
            assert.equal(res.headers.get("cache-control"), "no-store");
            assert.deepEqual(await res.json(), {
                periode: "2026-10",
                balita: [],
            });
        }
        assert.equal(queries, 3);
    } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
});
