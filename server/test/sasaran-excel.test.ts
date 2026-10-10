/**
 * Dua anak berbeda dengan NIK sama di satu sheet tidak boleh disatukan.
 * Kasus nyata: sheet Oktober 2026 punya ARKANA ALI MUSTHOFA dan ASHER GHANI
 * IBRAHIM dengan NIK yang sama; impor lama membuat Arkana tertimpa Asher.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import ExcelJS from "exceljs";

import { bacaWorkbookSasaran } from "../src/services/sasaran-excel.ts";

test("NIK kembar pada anak berbeda dipisah, bukan disatukan", async () => {
    const buku = new ExcelJS.Workbook();
    const sheet = buku.addWorksheet("OKTOBER 2026");
    sheet.addRow(["NIK", "EPPGBM", "NAMA LENGKAP", "TGL LAHIR", "JK", "RT"]);
    sheet.addRow([
        "3205022304230001",
        "3205022304230022",
        "ARKANA ALI MUSTHOFA",
        "2023-04-23",
        "L",
        "06",
    ]);
    sheet.addRow([
        "3205022304230001",
        "3205022304230001",
        "ASHER GHANI IBRAHIM",
        "2023-04-23",
        "L",
        "06",
    ]);
    const isi = Buffer.from(await buku.xlsx.writeBuffer()).toString("base64");

    const [hasil] = await bacaWorkbookSasaran(isi);
    const [arkana, asher] = hasil.baris;

    assert.equal(asher.nik, "3205022304230001");
    assert.ok(!asher.masalah.some((m) => m.includes("kembar")));
    assert.equal(arkana.nik, "3205022304230022");
    assert.ok(
        arkana.masalah.includes(`NIK kembar dengan baris ${asher.barisAsal}`),
    );
});
