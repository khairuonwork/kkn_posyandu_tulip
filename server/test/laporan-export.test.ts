import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { workbookLaporan } from "../src/services/laporan-export.ts";
import type { BarisBertanda } from "../src/services/laporan-perhitungan.ts";

function anak(id: number, periodeId = "2026-10"): BarisBertanda {
    const indices = ["BB_U", "TB_U", "BB_TB", "IMT_U", "LILA_U", "LIKA_U"];
    return {
        anakId: id, nama: "ANAK CONTOH", nik: null, namaOrtu: "ORTU CONTOH", rt: "01", jk: "P",
        tglLahir: "2024-02-10", periodeId, tanggalUkur: periodeId + "-14", umurHari: 977,
        umurLengkap: "2Thn8Bln4Hari", bbKg: 12, tinggiCm: 90, lilaCm: null, likaCm: null,
        jenisUkur: "TB", ntobRaw: null, statusKehadiran: "hadir", nt: "T", kenaikanGram: 0,
        kbmGram: 200, duaT: true, jumlahTBerturut: 2,
        penilaian: Object.fromEntries(["PERMENKES-2-2020", "WHO-2006"].map((standard, s) => [standard,
            Object.fromEntries(indices.map((index, i) => [index, { z: i + s / 10, kategori: "Normal" }]))])),
    };
}

test("ekspor terserialisasi mempertahankan pasangan indeks, angka nol, umur, dan detail sumber", async () => {
    const row = anak(11);
    row.penilaian["WHO-2006"].LILA_U = { z: null, kategori: null };
    const workbook = await workbookLaporan({ periode: "2026-10", standar: ["WHO-2006", "PERMENKES-2-2020"], bulanan: [row], riwayat2T: [] });
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
    const sheet = reopened.getWorksheet("Rekap Z Score")!;
    for (let i = 0; i < 6; i++) {
        assert.equal(sheet.getCell(7, 11 + 4 * i).value, i === 4 ? null : i);
        assert.equal(sheet.getCell(7, 13 + 4 * i).value, i === 4 ? null : i + 0.1);
    }
    assert.equal(sheet.getCell("E7").value, "2 Thn 8 Bln");
    assert.equal(sheet.getCell("H7").value, null);
    assert.equal(sheet.getCell("J7").value, "T");
    assert.equal(sheet.getCell("F7").numFmt, "0.00");
    assert.equal(sheet.getCell("G7").numFmt, "0.0");
    assert.equal(sheet.getCell("K7").numFmt, "0.00");
    assert.equal(sheet.getCell("K4").fill.type, "pattern");
    assert.equal(sheet.getCell("N4").master.address, "K4");
    assert.equal(sheet.getColumn(35).hidden, true);
    assert.equal(sheet.getCell(7, 35).value, 11);
    assert.equal(sheet.getCell(7, 39).value instanceof Date, true);
    assert.equal(sheet.pageSetup.printArea, "A1:AH7");
    assert.deepEqual(sheet.autoFilter, "A6:AH7");
});

test("historis dikelompokkan berdasarkan ID anak meskipun namanya sama", async () => {
    const rows = [anak(11, "2026-10"), anak(22, "2026-09"), anak(11, "2026-09"), anak(22, "2026-10")];
    const workbook = await workbookLaporan({ periode: "2026-10", standar: [], bulanan: [], riwayat2T: rows });
    const sheet = workbook.getWorksheet("Historis 2T+")!;
    assert.equal(sheet.getCell("A7").value, 1);
    assert.equal(sheet.getCell("B7").value, "2T");
    assert.equal(sheet.getCell("A8").value, null);
    assert.equal(sheet.getCell("A9").value, null);
    assert.equal(sheet.getCell("A10").value, 2);
    assert.equal(sheet.getCell("C7").value, "SEPT'26");
    assert.equal(sheet.getCell("C8").value, "OKT'26");
    assert.equal(sheet.getCell("G7").value, "2 Thn 8 Bln");
    assert.equal(sheet.getCell("L7").value, "T");
    assert.equal(sheet.pageSetup.printArea, "A1:AJ11");
});

test("periode kosong tetap menghasilkan kedua format dengan header lengkap", async () => {
    const workbook = await workbookLaporan({ periode: "2026-10", standar: [], bulanan: [], riwayat2T: [] });
    const sheet = workbook.getWorksheet("Rekap Z Score")!;
    assert.equal(sheet.getCell("K4").value, "BB/U");
    assert.equal(sheet.getCell("AE4").value, "LIKA/U");
    assert.equal(sheet.getCell("K7").value, null);
    assert.equal(sheet.pageSetup.printArea, "A1:AH7");
});

test('arsip 6T diekspor dengan sumber, umur bulan, dan tanggal kosong', async () => {
    const original=anak(11,'2026-09');
    const archived={...original,tanggalUkur:null,umurHari:null,umurLengkap:'2 thn 8 bln (hari tidak tercatat)',
        sumberRiwayat:'arsip' as const,sumberFile:'contoh-2t.xlsx',status2T:'6T',jumlahTBerturut:6};
    const workbook=await workbookLaporan({periode:'2026-09',standar:[],bulanan:[],riwayat2T:[archived]});
    const reopened=new ExcelJS.Workbook();
    await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
    const sheet=reopened.getWorksheet('Historis 2T+')!;
    assert.equal(sheet.getCell('B7').value,'6T');
    assert.equal(sheet.getCell('G7').value,'2 Thn 8 Bln');
    assert.equal(sheet.getCell(7,41).value,null);
    assert.equal(sheet.getCell(7,42).value,null);
    assert.equal(sheet.getCell(7,46).value,'contoh-2t.xlsx');
});

test("nilai tidak wajar tetap tampil dengan statusnya dan diberi catatan perlu dicek", async () => {
    const row = anak(12);
    (row.penilaian["WHO-2006"].TB_U as Record<string, unknown>).tidakWajar = true;
    const workbook = await workbookLaporan({ periode: "2026-10", standar: ["WHO-2006", "PERMENKES-2-2020"], bulanan: [row], riwayat2T: [] });
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
    const sheet = reopened.getWorksheet("Rekap Z Score")!;
    for (const col of [16, 18]) {
        assert.equal(sheet.getCell(7, col).value, "Normal");
        assert.match(JSON.stringify(sheet.getCell(7, col).note), /Perlu dicek/);
    }
    assert.equal(sheet.getCell(7, 12).note, undefined);
});

test("lembar Menyusui & ASI menghitung jawaban pendaftaran dan membatasi ASI ke 0–6 bulan", async () => {
    const dasar = { nik: "3277010101260001", rt: "01", jk: "P", tanggal: "2026-10-14" };
    const workbook = await workbookLaporan({ periode: "2026-10", standar: [], bulanan: [], riwayat2T: [], menyusui: [
        { ...dasar, anakId: 1, nama: "BAYI A", tglLahir: "2026-07-01", masihMenyusui: true, asiEksklusif: true },
        { ...dasar, anakId: 2, nama: "BAYI B", tglLahir: "2026-06-01", masihMenyusui: true, asiEksklusif: false },
        { ...dasar, anakId: 3, nama: "BALITA C", tglLahir: "2025-06-01", masihMenyusui: false, asiEksklusif: null },
        { ...dasar, anakId: 4, nama: "BAYI D", tglLahir: "2026-09-01", masihMenyusui: null, asiEksklusif: null },
    ] });
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(await workbook.xlsx.writeBuffer());
    const sheet = reopened.getWorksheet("Menyusui & ASI")!;
    const hasil = (r: number, c: number) => (sheet.getCell(r, c).value as { result: number }).result;
    assert.deepEqual([6, 7].map((r) => [12, 13, 14, 15].map((c) => hasil(r, c))), [[2, 1, 1, 4], [1, 1, 1, 3]]);
    assert.equal(sheet.getCell("B7").value, "BAYI D");
    assert.equal(sheet.getCell("C7").value, "3277010101260001");
    assert.equal(sheet.getCell("I10").value, "—");
    assert.equal(sheet.getCell("H6").value, "YA / TIDAK");
    assert.equal(sheet.getCell("B7").border.left?.style, "thin");
});
