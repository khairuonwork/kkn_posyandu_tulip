import assert from "node:assert/strict";
import test from "node:test";

import ExcelJS from "exceljs";

import { bacaWorkbookSasaran } from "../src/services/sasaran-excel.ts";

test("EPPGBM tidak dipakai sebagai NIK dan NIK ganda ditahan", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("DATA SASARAN OKTOBER 2026");
    const isiBaris = (nomor: number, nilai: unknown[]) =>
        nilai.forEach((sel, indeks) => {
            sheet.getRow(nomor).getCell(indeks + 1).value = sel as never;
        });
    isiBaris(6, [
        "NIK",
        "EPPGBM",
        "NAMA LENGKAP",
        "TGL_LAHIR",
        "JK",
        "NAMA_ORTU",
        "NIK_ORTU",
        "RT",
    ]);
    isiBaris(7, [
        null,
        "3277030101260001",
        "Anak Tanpa NIK",
        new Date("2026-01-01T00:00:00Z"),
        "P",
        "Orang Tua",
        "3277030101260002",
        "1",
    ]);
    for (const [row, name] of [
        [8, "Anak Duplikat Satu"],
        [9, "Anak Duplikat Dua"],
    ] as const) {
        isiBaris(row, [
            "3277030101260010",
            null,
            name,
            new Date("2026-01-01T00:00:00Z"),
            "L",
            "Orang Tua",
            "3277030101260002",
            "1",
        ]);
    }
    isiBaris(10, [
        "3277030101260020",
        null,
        "Anak Aman",
        new Date("2026-01-01T00:00:00Z"),
        "P",
        "Orang Tua",
        "3277030101260002",
        "1",
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    const [hasil] = await bacaWorkbookSasaran(
        Buffer.from(buffer).toString("base64"),
    );

    assert.equal(hasil.jumlahBaris, 4);
    assert.equal(hasil.jumlahSiap, 1);
    assert.equal(hasil.jumlahPerluVerifikasi, 3);
    assert.equal(hasil.jumlahDitahan, 2);
    assert.equal(hasil.baris[0].nik, null);
    assert.equal(hasil.baris[0].eppgbm, "3277030101260001");
    assert.equal(hasil.baris[0].identitasDuplikat, false);
    assert.deepEqual(
        hasil.baris
            .filter((baris) => baris.identitasDuplikat)
            .map((baris) => baris.barisAsal),
        [8, 9],
    );
});
