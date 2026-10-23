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
    assert.equal(sheet.getCell("E7").value, "2Thn8Bln4Hari");
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
    assert.equal(sheet.getCell("G7").value, "2Thn8Bln4Hari");
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
    assert.equal(sheet.getCell('G7').value,archived.umurLengkap);
    assert.equal(sheet.getCell(7,41).value,null);
    assert.equal(sheet.getCell(7,42).value,null);
    assert.equal(sheet.getCell(7,46).value,'contoh-2t.xlsx');
});
