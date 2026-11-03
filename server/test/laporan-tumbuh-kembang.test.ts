import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import type { PoolClient } from "pg";
import {
    konteksPelatihan,
    poolOperasional,
} from "../src/http/pelatihan-context.ts";
import {
    dataSurveiBulanan,
    type BarisSurveiBulanan,
} from "../src/repositories/laporan-tumbuh-kembang-repository.ts";
import { KELOMPOK_KIA } from "../src/edukasi/kia-2024.ts";
import {
    keteranganKemampuan,
    KELOMPOK_PERKEMBANGAN,
} from "../src/services/keterangan-kemampuan.ts";
import {
    laporanTumbuhKembang,
    susunLaporanTumbuhKembang,
} from "../src/services/laporan-tumbuh-kembang.ts";

const pengguna = {
    id: 1,
    peran: "kader" as const,
    aktif: true,
    rt: "01",
    posyanduIds: [7],
};
const baris = (
    patch: Partial<BarisSurveiBulanan> = {},
): BarisSurveiBulanan => ({
    anakId: 1,
    nama: "Bayi A",
    surveiId: 1,
    tanggal: "2026-10-10",
    umurBulan: 8,
    kelompokId: "6-9b",
    kelompokLabel: "6–9 bulan",
    pertanyaan: [
        { id: "q1", teks: "Bayi bisa duduk secara mandiri?", nomorSumber: [1] },
        {
            id: "q2",
            teks: "Kemampuan historis yang sudah berubah?",
            nomorSumber: [2],
        },
        { id: "q3", teks: "Pertanyaan yang sudah bisa?", nomorSumber: [3] },
    ],
    jawaban: { q1: "tidak", q2: "tidak", q3: "ya" },
    ...patch,
});

test("keterangan berdasarkan teks yang dikenal; teks historis tidak ditebak", () => {
    assert.equal(
        keteranganKemampuan("Bayi bisa duduk secara mandiri?"),
        "Belum bisa duduk secara mandiri",
    );
    for (const kelompok of KELOMPOK_KIA.filter(
        (k) => k.jenis === "perkembangan",
    )) {
        for (const q of kelompok.pertanyaan)
            assert.match(keteranganKemampuan(q.teks), /^Belum /);
    }
    assert.match(
        keteranganKemampuan("Pertanyaan lama?"),
        /Jawaban: Tidak.*Pertanyaan lama\?/,
    );
    assert.ok(!KELOMPOK_PERKEMBANGAN.includes("lahir-28h"));
});

test("semua survei Tidak dikelompokkan, usia historis dan urutan kemampuan dipertahankan", () => {
    const hasil = susunLaporanTumbuhKembang("2026-10", [
        baris({ surveiId: 2, tanggal: "2026-10-20", umurBulan: 9 }),
        baris(),
        baris({ surveiId: 3, tanggal: "2026-10-20", umurBulan: 9 }),
        baris({
            surveiId: 4,
            tanggal: "2026-10-30",
            jawaban: { q1: "ya", q2: "ya", q3: "ya" },
        }),
        baris({ anakId: 2, nama: "Anak B", surveiId: 5 }),
        baris({
            anakId: 3,
            nama: "Belum diamati",
            jawaban: { q1: null, q2: null },
        }),
        baris({ anakId: 4, nama: "Perawatan", kelompokId: "lahir-28h" }),
        baris({ surveiId: 6, tanggal: "2026-09-30" }),
        baris({ surveiId: 7, tanggal: "2026-11-01" }),
    ]);
    assert.deepEqual(
        hasil.balita.map((a) => a.nama),
        ["Anak B", "Bayi A"],
    );
    const bayi = hasil.balita[1];
    assert.deepEqual(
        bayi.survei.map((s) => s.surveiId),
        [3, 2, 1],
    );
    assert.equal(bayi.survei[2].umurBulan, 8);
    assert.equal(bayi.survei[2].kelompokLabel, "6–9 bulan");
    assert.deepEqual(
        bayi.survei[2].kemampuan.map((q) => q.pertanyaanId),
        ["q1", "q2"],
    );
    assert.match(bayi.survei[2].kemampuan[1].keterangan, /Jawaban: Tidak/);
    assert.equal(
        bayi.survei[2].kemampuan[1].pertanyaan,
        "Kemampuan historis yang sudah berubah?",
    );
});

test("bulan tanpa hasil, pergantian tahun, dan revisi Ya tidak menghasilkan temuan palsu", () => {
    assert.deepEqual(
        susunLaporanTumbuhKembang("2027-01", [baris({ tanggal: "2026-12-31" })])
            .balita,
        [],
    );
    assert.equal(
        susunLaporanTumbuhKembang("2027-01", [baris({ tanggal: "2027-01-01" })])
            .balita.length,
        1,
    );
    assert.deepEqual(
        susunLaporanTumbuhKembang("2026-10", [
            baris({ jawaban: { q1: "ya", q2: null, inconnu: "tidak" } }),
        ]).balita,
        [],
    );
});

test("query memakai batas tanggal, cakupan laporan, dan snapshot tanpa batas 12 catatan", async () => {
    const pool = {
        query: async (sql: string, values: unknown[]) => {
            assert.match(sql, /s\.tanggal >=/);
            assert.match(sql, /interval '1 month'/);
            assert.match(sql, /wr\.posyandu_id=ANY/);
            assert.match(sql, /pertanyaan_snapshot/);
            assert.doesNotMatch(sql, /\bpublic\.|\bLIMIT\b|dibahas\s*=/i);
            assert.deepEqual(values, [
                "2026-10",
                false,
                [7],
                KELOMPOK_PERKEMBANGAN,
            ]);
            return { rows: [] };
        },
    } as unknown as Pool;
    assert.deepEqual(
        await dataSurveiBulanan(
            pool,
            pengguna,
            "2026-10",
            KELOMPOK_PERKEMBANGAN,
        ),
        [],
    );
});

test("periode tidak valid ditolak sebelum query", async () => {
    const pool = {
        query: () => {
            throw new Error("DB tidak boleh diakses");
        },
    } as unknown as Pool;
    for (const periode of ["", "2026-00", "2026-13", "2026-1", "2026-10-01"]) {
        await assert.rejects(
            laporanTumbuhKembang(pool, pengguna, periode),
            RangeError,
        );
    }
});

test("laporan memakai koneksi pelatihan dan tidak membaca pool riil", async () => {
    const real = {
        query: () => {
            throw new Error("Tidak boleh membaca data riil");
        },
    } as unknown as Pool;
    const client = {
        query: async () => ({ rows: [baris()] }),
    } as unknown as PoolClient;
    const result = await konteksPelatihan.run({ client, id: "sesi-uji" }, () =>
        laporanTumbuhKembang(poolOperasional(real), pengguna, "2026-10"),
    );
    assert.equal(result.balita.length, 1);
});
