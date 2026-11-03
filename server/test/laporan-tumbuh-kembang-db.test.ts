import assert from "node:assert/strict";
import test from "node:test";
import pg, { type Pool } from "pg";
import { dataSurveiBulanan } from "../src/repositories/laporan-tumbuh-kembang-repository.ts";
import { KELOMPOK_PERKEMBANGAN } from "../src/services/keterangan-kemampuan.ts";

test(
    "query PostgreSQL membatasi wilayah, bulan, dan jenis survei pada tabel terisolasi",
    { skip: !process.env.DATABASE_URL },
    async () => {
        const db = new pg.Client({
            connectionString: process.env.DATABASE_URL,
            connectionTimeoutMillis: 10000,
        });
        await db.connect();
        try {
            await db.query("BEGIN");
            await db.query(`CREATE TEMP TABLE wilayah_rt(id int, posyandu_id int);
            CREATE TEMP TABLE anak(id int, nama text, nama_baku text, wilayah_rt_id int, deleted_at timestamp);
            CREATE TEMP TABLE survei_perkembangan_kia(id int, anak_id int, tanggal date, umur_bulan int,
                kelompok_id text, kelompok_label text, pertanyaan_snapshot jsonb, jawaban jsonb);
            INSERT INTO wilayah_rt VALUES(1,7),(2,8);
            INSERT INTO anak VALUES(1,'A','a',1,NULL),(2,'B','b',2,NULL),(3,'Deleted','d',1,now());`);
            const snapshot = JSON.stringify([
                { id: "q", teks: "Pertanyaan historis?", nomorSumber: [1] },
            ]);
            let id = 0;
            for (const [anakId, tanggal, kelompok, jawaban] of [
                [1, "2026-12-01", "6-9b", { q: "tidak" }],
                [1, "2026-12-31", "6-9b", { q: "tidak" }],
                [1, "2027-01-01", "6-9b", { q: "tidak" }],
                [2, "2026-12-10", "6-9b", { q: "tidak" }],
                [3, "2026-12-10", "6-9b", { q: "tidak" }],
                [1, "2026-12-10", "lahir-28h", { q: "tidak" }],
                [1, "2026-12-10", "6-9b", { q: "ya" }],
                [1, "2026-12-10", "6-9b", { q: null }],
            ] as const) {
                await db.query(
                    "INSERT INTO survei_perkembangan_kia VALUES($1,$2,$3,8,$4,$4,$5,$6)",
                    [
                        ++id,
                        anakId,
                        tanggal,
                        kelompok,
                        snapshot,
                        JSON.stringify(jawaban),
                    ],
                );
            }
            const pool = { query: db.query.bind(db) } as unknown as Pool;
            const user = {
                id: 1,
                peran: "kader" as const,
                aktif: true,
                rt: null,
                posyanduIds: [7],
            };
            const rows = await dataSurveiBulanan(
                pool,
                user,
                "2026-12",
                KELOMPOK_PERKEMBANGAN,
            );
            assert.deepEqual(
                rows.map((r) => r.surveiId),
                [2, 1],
            );
            assert.equal(
                (
                    await dataSurveiBulanan(
                        pool,
                        { ...user, posyanduIds: [] },
                        "2026-12",
                        KELOMPOK_PERKEMBANGAN,
                    )
                ).length,
                0,
            );
            assert.equal(
                (
                    await dataSurveiBulanan(
                        pool,
                        { ...user, superAdmin: true },
                        "2026-12",
                        KELOMPOK_PERKEMBANGAN,
                    )
                ).length,
                3,
            );
            assert.equal(
                (
                    await dataSurveiBulanan(
                        pool,
                        user,
                        "2027-01",
                        KELOMPOK_PERKEMBANGAN,
                    )
                ).length,
                1,
            );
        } finally {
            await db.query("ROLLBACK");
            await db.end();
        }
    },
);
