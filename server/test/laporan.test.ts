import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { workbookLaporan } from "../src/services/laporan-export.ts";
import { laporan } from "../src/services/laporan-service.ts";
import { lupakanTabelTersimpan } from "../src/repositories/standar-lms-repository.ts";
import type { BarisArsip2T } from '../src/repositories/riwayat-2t-repository.ts';

const pengguna = { id: 1, peran: "admin" as const, rt: null, aktif: true };

function row(periodeId: string, tanggalUkur: string, bbKg: number, z = 0.1) {
    return {
        anakId: 10, nama: "CONTOH ANAK", nik: "3277000000000001", namaOrtu: "IBU CONTOH",
        tglLahir: "2025-10-10", jk: "L" as const, rt: "01", periodeId, tanggalUkur,
        umurHari: Math.round((Date.parse(`${tanggalUkur}T00:00:00Z`) - Date.parse("2025-10-10T00:00:00Z")) / 86_400_000),
        bbKg, tinggiCm: 75, jenisUkur: "PB" as const, lilaCm: 15, likaCm: 45,
        ntobRaw: null, statusKehadiran: "hadir", penilaian: { "WHO-2006": { BB_U: { z, kategori: "Normal" } } },
    };
}

function standards(medianForMonth: (month: number) => number = () => 9) {
    return Array.from({ length: 61 }, (_, month) => ({
        indeks: "BB_U", jk: "L", kunci: month, l: 0,
        m: medianForMonth(month), s: 0.2,
    }));
}

function poolFor(rows: ReturnType<typeof row>[], lms = standards(), arsip: BarisArsip2T[] = []) {
    return {
        query: async (sql: string) => ({ rows: sql.includes("FROM standar_lms") ? lms : sql.includes('FROM riwayat_2t_arsip') ? arsip : rows }),
    } as unknown as Pool;
}

test("laporan menginterpolasi skor Permenkes dan WHO pada umur kalender tepat", async () => {
    const rows = [row("2026-10", "2026-10-10", 9.6)];
    lupakanTabelTersimpan();
    const pool = poolFor(rows);
    const result = await laporan(pool, pengguna, "2026-10");
    const child = result.bulanan[0];
    assert.equal(child.penilaian["PERMENKES-2-2020"].BB_U.z, 0);
    assert.equal(child.penilaian["PERMENKES-2-2020"].BB_U.kategori, "Berat badan normal");
    assert.notEqual(child.penilaian["WHO-2006"].BB_U.z, 0.1);
    assert.ok(Number.isFinite(child.penilaian["WHO-2006"].BB_U.z));
    assert.equal(child.umurHari, 365);
    assert.equal(child.umurLengkap, "1Thn0Bln0Hari");
    assert.match(result.metodeUmur, /umur kalender dalam hari/);
});

function arsip(): BarisArsip2T[] {
    return ['2026-07','2026-08','2026-09'].map((periodeId,i) => ({
        ...row(periodeId,periodeId+'-10',9),
        periodeId,periodeLaporan:'2026-09',jumlahT:3,umurBulan:9+i,
        sumberFile:'contoh-2t.xlsx',penilaian:{'WHO-2006':{BB_U:{z:0,kategori:'BB Normal'}}},
    }));
}

test('arsip 2T resmi tampil tanpa tanggal fiktif dan tanpa menghitung ulang skor arsip', async () => {
    lupakanTabelTersimpan();
    const result=await laporan(poolFor([row('2026-09','2026-09-12',9)],standards(),arsip()),pengguna,'2026-09');
    assert.equal(result.ringkasan.denganDuaT,1);
    assert.equal(result.ringkasan.duaTDariArsip,1);
    assert.equal(result.riwayat2T.length,3);
    assert.equal(result.riwayat2T[0].tanggalUkur,null);
    assert.equal(result.riwayat2T[0].umurHari,null);
    assert.equal(result.riwayat2T[0].status2T,'3T');
    assert.equal(result.riwayat2T[0].penilaian['WHO-2006'].BB_U.z,0);
    assert.equal(result.riwayat2T[0].umurLengkap,'0Thn9Bln (hari tidak tercatat)');
});

test('status arsip diteruskan ke bulan berikutnya bila tetap T, lalu berhenti saat naik atau ada jeda', async () => {
    lupakanTabelTersimpan();
    const base=row('2026-09','2026-09-12',9);
    const current=row('2026-10','2026-10-10',9.1);
    const continued=await laporan(poolFor([base,current],standards(),arsip()),pengguna,'2026-10');
    assert.equal(continued.bulanan[0].jumlahTBerturut,4);
    assert.equal(continued.ringkasan.denganDuaT,1);
    assert.equal(continued.riwayat2T.length,4);
    assert.equal(continued.riwayat2T.at(-1)?.sumberRiwayat,'pengukuran');
    assert.equal(continued.riwayat2T.at(-1)?.status2T,'4T');
    const recovered=await laporan(poolFor([base,{...current,bbKg:10}],standards(),arsip()),pengguna,'2026-10');
    assert.equal(recovered.ringkasan.denganDuaT,0);
    assert.equal(recovered.riwayat2T.length,0);
    const absent=await laporan(poolFor([base],standards(),arsip()),pengguna,'2026-10');
    assert.equal(absent.riwayat2T.length,0);
    const gap=await laporan(poolFor([base,row('2026-11','2026-11-10',9.1)],standards(),arsip()),pengguna,'2026-11');
    assert.equal(gap.ringkasan.denganDuaT,0);
    assert.equal(gap.ringkasan.belumDapatDinilai,1);
});

test('kenaikan September memakai Agustus dari arsip pada riwayat, rekap, dan Excel', async () => {
    lupakanTabelTersimpan();
    const source=arsip().map(r=>({...r,bbKg:r.periodeId==='2026-09'?9.1:9}));
    const result=await laporan(poolFor([row('2026-09','2026-09-12',9.1)],standards(),source),pengguna,'2026-09');
    const september=result.riwayat2T.find(r=>r.periodeId==='2026-09')!;
    assert.equal(september.kenaikanGram,100);
    assert.equal(september.kbmGram,300);
    assert.equal(september.nt,'T');
    assert.equal(september.tanggalUkur,'2026-09-12');
    assert.equal(september.umurLengkap, '0Thn11Bln2Hari');
    assert.equal(result.bulanan[0].kenaikanGram,100);
    assert.equal(result.bulanan[0].kbmGram,300);
    assert.equal(result.bulanan[0].nt,'T');
    const workbook=await workbookLaporan(result);
    assert.equal(workbook.getWorksheet('Historis 2T+')!.getCell('L9').value,'T');
    assert.equal(workbook.getWorksheet('Rekap Z Score')!.getCell('J7').value,'T');
    assert.equal(workbook.getWorksheet('Historis 2T+')!.getCell(9,44).value,100);
});

test('riwayat tidak mengasumsikan nol jika bulan pembanding hilang; nol asli dan penurunan tetap dihitung', async () => {
    lupakanTabelTersimpan();
    const source=arsip().map(r=>({...r,bbKg:r.periodeId==='2026-09'?8.8:9}));
    const result=await laporan(poolFor([row('2026-09','2026-09-12',8.8)],standards(),source),pengguna,'2026-09');
    const july=result.riwayat2T.find(r=>r.periodeId==='2026-07')!;
    assert.equal(july.kenaikanGram,null);
    assert.equal(july.kbmGram,null);
    assert.equal(july.nt,'T');
    assert.match(july.catatanNt ?? '', /T mengikuti arsip 3T/);
    assert.equal(result.riwayat2T.find(r=>r.periodeId==='2026-08')!.kenaikanGram,0);
    assert.equal(result.riwayat2T.find(r=>r.periodeId==='2026-08')!.nt,'T');
    assert.equal(result.riwayat2T.find(r=>r.periodeId==='2026-09')!.kenaikanGram,-200);
    const gapSource=source.filter(r=>r.periodeId!=='2026-08');
    const gap=await laporan(poolFor([row('2026-09','2026-09-12',8.8)],standards(),gapSource),pengguna,'2026-09');
    assert.equal(gap.bulanan[0].kenaikanGram,null);
    assert.equal(gap.riwayat2T.at(-1)!.kenaikanGram,null);
});

test('riwayat arsip dapat memakai pengukuran nyata sebelum awal rangkaian tanpa mencampur nilai BB yang ditampilkan', async () => {
    lupakanTabelTersimpan();
    const source=arsip();
    const result=await laporan(poolFor([row('2026-06','2026-06-12',8.5),row('2026-07','2026-07-12',9.2),row('2026-09','2026-09-12',9)],standards(),source),pengguna,'2026-09');
    const july=result.riwayat2T.find(r=>r.periodeId==='2026-07')!;
    assert.equal(july.bbKg,9);
    assert.equal(july.kenaikanGram,500);
    assert.equal(july.kbmGram,300);
    assert.equal(july.nt,'N');
    // The archived August row displays 9 kg and its archived July comparator
    // displays 9 kg too, even though a corrected dated July record is 9.2 kg.
    assert.equal(result.riwayat2T.find(r=>r.periodeId==='2026-08')!.kenaikanGram,0);
    // A new dated measurement uses the dated comparator when both exist.
    const actualAugust=await laporan(poolFor([row('2026-07','2026-07-12',9.2),row('2026-08','2026-08-12',9.4)],standards(),source),pengguna,'2026-08');
    assert.equal(actualAugust.bulanan[0].kenaikanGram,200);
});

test("skor WHO laporan memakai pecahan umur hari di antara titik bulanan", async () => {
    const child = {
        ...row("2026-01", "2026-01-16", 10.48),
        tglLahir: "2026-01-01",
        umurHari: 15,
    };
    lupakanTabelTersimpan();
    const result = await laporan(
        poolFor([child], standards((month) => 10 + month)),
        pengguna,
        "2026-01",
    );
    assert.ok(Math.abs(Number(result.bulanan[0].penilaian["WHO-2006"].BB_U.z)) < 0.01);
    assert.equal(result.bulanan[0].umurHari, 15);
});

test("umur tampilan mengikuti akhir bulan kalender tanpa mengubah umur hari", async () => {
    const child = {
        ...row("2026-02", "2026-02-28", 4),
        tglLahir: "2026-01-31",
        umurHari: 28,
    };
    lupakanTabelTersimpan();
    const result = await laporan(poolFor([child]), pengguna, "2026-02");
    assert.equal(result.bulanan[0].umurLengkap, "0Thn1Bln0Hari");
    assert.equal(result.bulanan[0].umurHari, 28);
});

test("umur lengkap memisahkan tahun, bulan, dan hari", async () => {
    const tanggalUkur = "2026-10-14";
    const tglLahir = "2024-02-10";
    const child = {
        ...row("2026-10", tanggalUkur, 12),
        tglLahir,
        umurHari: Math.round((Date.parse(`${tanggalUkur}T00:00:00Z`) - Date.parse(`${tglLahir}T00:00:00Z`)) / 86_400_000),
    };
    lupakanTabelTersimpan();
    const result = await laporan(poolFor([child]), pengguna, "2026-10");
    assert.equal(result.bulanan[0].umurLengkap, "2Thn8Bln4Hari");
    assert.equal(result.bulanan[0].umurHari, child.umurHari);
});

test("skor Permenkes laporan menginterpolasi batas saat anak berada di antara bulan", async () => {
    const child = {
        ...row("2026-01", "2026-01-16", 3.88),
        tglLahir: "2026-01-01",
        umurHari: 15,
    };
    lupakanTabelTersimpan();
    const result = await laporan(poolFor([child]), pengguna, "2026-01");
    assert.ok(Math.abs(Number(result.bulanan[0].penilaian["PERMENKES-2-2020"].BB_U.z)) < 0.02);
});

test("2T+ memerlukan dua pengukuran hadir bulanan berurutan", async () => {
    const rows = [
        row("2026-08", "2026-08-10", 9.0),
        row("2026-09", "2026-09-10", 9.1),
        row("2026-10", "2026-10-10", 9.2),
    ];
    lupakanTabelTersimpan();
    const pool = poolFor(rows);
    const result = await laporan(pool, pengguna, "2026-10");
    assert.equal(result.bulanan[0].nt, "T");
    assert.equal(result.bulanan[0].duaT, true);
    assert.equal(result.riwayat2T.length, 2);
    assert.equal(result.bulanan[0].jumlahTBerturut, 2);
    assert.deepEqual(result.riwayat2T.map((r) => r.periodeId), ["2026-09", "2026-10"]);
});

test("laporan 2T+ tidak membawa episode lama setelah anak naik atau tidak diukur bulan ini", async () => {
    const rows = [row("2026-07", "2026-07-10", 9), row("2026-08", "2026-08-10", 9.1),
        row("2026-09", "2026-09-10", 9.2), row("2026-10", "2026-10-10", 10.2)];
    lupakanTabelTersimpan();
    const result = await laporan(poolFor(rows), pengguna, "2026-10");
    assert.equal(result.bulanan[0].nt, "N");
    assert.equal(result.ringkasan.denganDuaT, 0);
    assert.deepEqual(result.riwayat2T, []);
    const absent = await laporan(poolFor(rows.slice(0, 3)), pengguna, "2026-10");
    assert.deepEqual(absent.riwayat2T, []);
});

test("penurunan melintasi garis SD tetap T meski kenaikan BB mencapai KBM", async () => {
    const rows = [
        row("2026-09", "2026-09-10", 9.0, 0.1),
        row("2026-10", "2026-10-10", 9.3, -1.1),
    ];
    lupakanTabelTersimpan();
    const pool = poolFor(rows, standards((month) => month === 12 ? 10.5 : 9));
    const result = await laporan(pool, pengguna, "2026-10");
    assert.equal(result.bulanan[0].kenaikanGram, 300);
    assert.equal(result.bulanan[0].nt, "T");
});

test("berkas Excel mencakup petunjuk dan dua format laporan", async () => {
    lupakanTabelTersimpan();
    const pool = poolFor([row("2026-10", "2026-10-10", 9.6)]);
    const result = await laporan(pool, pengguna, "2026-10");
    const workbook = await workbookLaporan(result);
    assert.deepEqual(workbook.worksheets.map((sheet) => sheet.name), ["Rekap Z Score", "Historis 2T+", "Petunjuk"]);
    const sheet = workbook.getWorksheet("Rekap Z Score")!;
    assert.equal(sheet.getCell("E7").value, "1Thn0Bln0Hari");
    assert.equal(sheet.getCell("E6").value, "UMUR LENGKAP");
    assert.equal(sheet.getCell("K4").value, "BB/U");
    assert.equal(sheet.getCell("K5").value, "PERMENKES 2 2020");
    assert.equal(sheet.getCell("M5").value, "WHO - LMS");
    assert.equal(sheet.getCell("K7").value, result.bulanan[0].penilaian["PERMENKES-2-2020"].BB_U.z);
    assert.equal(sheet.getCell("M7").value, result.bulanan[0].penilaian["WHO-2006"].BB_U.z);
    assert.equal(sheet.getCell("J5").value, "N/T/B");
    assert.equal(sheet.getCell("K7").numFmt, "0.00");
    assert.equal(sheet.views[0].state, "frozen");
    assert.equal(sheet.pageSetup.printTitlesRow, "1:6");
    assert.equal(sheet.pageSetup.printArea, "A1:AH7");
});
