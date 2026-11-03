import assert from "node:assert/strict";
import test from "node:test";
import type { Pool, PoolClient } from "pg";
import {
    BATAS_ID_LATIHAN,
    mengandungIdentitasLatihan,
    skemaAman,
} from "../src/services/pelatihan.ts";
import {
    konteksPelatihan,
    poolOperasional,
    pastikanQueryTerisolasi,
} from "../src/http/pelatihan-context.ts";
import { buatApp } from "../src/http/app.ts";

test("antrean APK lama memakai ID/NIK latihan yang ditolak di mode riil; NIK riil tidak salah ditandai", () => {
    assert(mengandungIdentitasLatihan({ id_anak: BATAS_ID_LATIHAN + 12 }));
    assert(mengandungIdentitasLatihan({ nik: "0099000001000001" }));
    assert(mengandungIdentitasLatihan("/v1/anak/1000001000001/profil"));
    assert(
        mengandungIdentitasLatihan({
            items: [{ id_anak: "ANAK-1000001000001" }],
        }),
    );
    assert(
        !mengandungIdentitasLatihan({
            nik: "1177032005230002",
            id_anak: 185,
            bb_kg: 12.5,
        }),
    );
    assert(!mengandungIdentitasLatihan({ nik: "3277032005230002" }));
});
test("nama schema wajib berasal dari UUID server, bukan input SQL", () => {
    assert.equal(
        skemaAman("latihan_" + "a".repeat(32)),
        '"latihan_' + "a".repeat(32) + '"',
    );
    for (const name of [
        "public",
        "latihan_public",
        "latihan_a;DROP SCHEMA public",
        '"public"',
    ])
        assert.throws(() => skemaAman(name));
});
test("query sandbox menolak tabel riil dan perubahan search_path eksplisit", () => {
    for (const query of [
        "SELECT * FROM public.anak",
        'SELECT * FROM "public"."anak"',
        "SELECT set_config('search_path','public',true)",
        "SET search_path TO public",
        "RESET ALL",
        { text: "DELETE FROM public.pengukuran" },
    ])
        assert.throws(() => pastikanQueryTerisolasi(query));
    pastikanQueryTerisolasi("UPDATE pengukuran SET bb_kg=$1 WHERE id=$2");
});
test("endpoint pengelolaan hanya mengizinkan superadmin, bukan admin biasa/kader/KMS", async () => {
    const old = process.env.PELATIHAN_AKTIF;
    process.env.PELATIHAN_AKTIF = "1";
    try {
        for (const [peran, superAdmin, status] of [
            ["admin", false, 403],
            ["kader", false, 403],
            ["kms", false, 403],
            ["admin", true, 200],
        ] as const) {
            const pool = {
                query: async (sql: string) => ({
                    rows: sql.includes("FROM sesi s")
                        ? [
                              {
                                  id: 1,
                                  peran,
                                  aktif: true,
                                  rt: null,
                                  superAdmin,
                                  posyanduIds: [1],
                              },
                          ]
                        : [],
                }),
            } as unknown as Pool;
            const app = buatApp(pool);
            const server = app.listen(0, "127.0.0.1");
            await new Promise<void>((resolve) =>
                server.once("listening", resolve),
            );
            try {
                const address = server.address() as { port: number };
                const res = await fetch(
                    `http://127.0.0.1:${address.port}/api/v1/pelatihan`,
                    { headers: { Authorization: "Bearer uji" } },
                );
                assert.equal(res.status, status);
            } finally {
                await new Promise<void>((resolve) =>
                    server.close(() => resolve()),
                );
            }
        }
    } finally {
        if (old === undefined) delete process.env.PELATIHAN_AKTIF;
        else process.env.PELATIHAN_AKTIF = old;
    }
});
test("pool operasional mengikuti koneksi per-request dan tidak mengembalikannya lewat nested release", async () => {
    const calls: string[] = [];
    const real = {
        query: async () => {
            calls.push("riil");
            return { rows: [] };
        },
    } as unknown as Pool;
    const client = {
        query: async () => {
            calls.push("latihan");
            return { rows: [] };
        },
        release: () => {
            throw Error("Jangan release dari transaksi anak");
        },
    } as unknown as PoolClient;
    const operasi = poolOperasional(real);
    await operasi.query("SELECT 1");
    await konteksPelatihan.run({ client, id: "uji" }, async () => {
        await operasi.query("SELECT 1");
        const nested = await operasi.connect();
        await nested.query("SELECT 2");
        nested.release();
    });
    await konteksPelatihan.run(
        { client, id: "uji", closed: true },
        async () => {
            assert.throws(
                () => operasi.query("UPDATE anak SET nama=$1", ["salah"]),
                /sudah selesai/,
            );
            await assert.rejects(operasi.connect(), /sudah selesai/);
        },
    );
    await operasi.query("SELECT 1");
    assert.deepEqual(calls, ["riil", "latihan", "latihan", "riil"]);
});
