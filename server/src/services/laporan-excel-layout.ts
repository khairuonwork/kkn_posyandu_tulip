import type ExcelJS from "exceljs";
import panah from "./laporan-excel-panah.json" with { type: "json" };

/** Tata letak SEPT_REKAP dan 2T-6T SEPT 2026 milik Posyandu. */
export const INDEKS_LAPORAN = [
    { id: "BB_U", label: "BB/U", warna: "FFCCFF99" },
    { id: "TB_U", label: "PB/U atau TB/U", warna: "FFFFC000" },
    { id: "BB_TB", label: "BB/PB atau BB/TB", warna: "FFFFFF00" },
    { id: "IMT_U", label: "IMT/U", warna: "FFFFCCFF" },
    { id: "LILA_U", label: "LILA/U USIA ≥6 BLN", warna: "FF66FFFF" },
    { id: "LIKA_U", label: "LIKA/U", warna: "FFF8CBAD" },
] as const;
export const STANDAR_LAPORAN = ["PERMENKES-2-2020", "WHO-2006"] as const;
export const BULAN = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
export const BARIS_HEADER = 6;
export const BARIS_DATA = 7;
const HITAM = "FF000000";
const PINK = "FFFFCCFF";
const thin: ExcelJS.Border = { style: "thin", color: { argb: HITAM } };
const medium: ExcelJS.Border = { style: "medium", color: { argb: HITAM } };

export function namaPeriode(periode: string): string {
    const [tahun, bulan] = periode.split("-");
    return `${BULAN[Number(bulan) - 1]} ${tahun}`;
}

export function warnaIsi(argb: string): ExcelJS.Fill {
    // Excel desktop membaca bgColor pada differential fill (conditional formatting).
    // fgColor saja membuat font putih aktif tetapi latarnya tetap putih.
    return { type: "pattern", pattern: "solid", fgColor: { argb }, bgColor: { argb } };
}

export function tataLetak(historis: boolean) {
    const geser = historis ? 2 : 0;
    return { historis, nama: 2 + geser, umur: 5 + geser, ukur: 6 + geser, indeks: 11 + geser, akhir: 34 + geser };
}
export type TataLetak = ReturnType<typeof tataLetak>;

function selHeader(sheet: ExcelJS.Worksheet, row: number, col: number, text: string, warna = "FFFFFFFF", ukuran = 11) {
    const cell = sheet.getCell(row, col);
    cell.value = text;
    cell.font = { name: "Calibri", size: ukuran, bold: true, color: { argb: HITAM } };
    cell.fill = warnaIsi(warna);
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: thin, bottom: thin, left: thin, right: thin };
    return cell;
}

function gabungHeader(sheet: ExcelJS.Worksheet, row: number, awal: number, akhir: number, text: string, warna: string, ukuran: number) {
    for (let col = awal; col <= akhir; col++) selHeader(sheet, row, col, "", warna, ukuran);
    sheet.mergeCells(row, awal, row, akhir);
    const cell = selHeader(sheet, row, awal, text, warna, ukuran);
    cell.border = { top: medium, bottom: thin, left: medium, right: medium };
}

export function siapkanSheet(workbook: ExcelJS.Workbook, nama: string, periode: string, historis: boolean, judulUkur: string) {
    const layout = tataLetak(historis);
    const sheet = workbook.addWorksheet(nama, {
        properties: { defaultRowHeight: 14.5 },
        views: [{ state: "frozen", xSplit: layout.nama, ySplit: BARIS_HEADER, topLeftCell: `${historis ? "E" : "C"}7`, zoomScale: historis ? 80 : 70, showGridLines: true }],
        pageSetup: {
            orientation: "landscape", paperSize: 9, scale: 65,
            fitToPage: false, horizontalCentered: true,
            margins: { left: historis ? 0.25 : 0, right: historis ? 0.25 : 0, top: 0.5, bottom: 0.75, header: 0.3, footer: 0.3 },
            printTitlesRow: "1:6",
        },
    });
    const awalJudul = historis ? 2 : 1;
    for (const [row, value] of [[1, historis ? "STATUS 2T KE ATAS" : "Z SCORE GABUNGAN BB/U, TB/U, BB/PB, IMT/U, LILA/U, LIKA/U (0–60 BULAN)"], [2, `BULAN ${namaPeriode(periode)}`]] as const) {
        const cell = sheet.getCell(row, awalJudul);
        cell.value = value;
        cell.font = { name: "Calibri", size: row === 1 ? 14 : 11, bold: true, color: { argb: historis && row === 1 ? "FFFF0000" : "FF0070C0" } };
        cell.alignment = { vertical: "middle" };
    }
    const info = sheet.getCell(3, awalJudul);
    info.value = 'Peringatan internal: sel Z kuning mengikuti ambang SD di Petunjuk. Kategori gizi mengikuti acuan.';
    info.font = { name: 'Calibri', size: 10, color: { argb: 'FF9C6500' } };
    [18.5, 15, 18, 28, 18, 29].forEach((height, i) => { sheet.getRow(i + 1).height = height; });
    const identity = historis
        ? ["NO", "STATUS", "BULAN", "NAMA LENGKAP", "RT", "JK", "UMUR LENGKAP"]
        : ["NO", "NAMA LENGKAP", "RT", "JK", "UMUR LENGKAP"];
    const widths = historis ? [5, 8.18, 13, 33.73, 4.63, 4.73, 27] : [4.5, 33.73, 4.63, 4.73, 21];
    identity.forEach((text, i) => {
        selHeader(sheet, 6, i + 1, text);
        sheet.getColumn(i + 1).width = widths[i];
    });
    gabungHeader(sheet, 4, layout.ukur, layout.ukur + 4, judulUkur, PINK, 10);
    ["BB", "TB/PB", "LILA", "LIKA", "N/T/B"].forEach((label, i) => {
        const col = layout.ukur + i;
        selHeader(sheet, 5, col, label, PINK);
        selHeader(sheet, 6, col, i === 0 ? "(kg)" : i < 4 ? "(cm)" : "", PINK, 10);
        sheet.getColumn(col).width = i === 4 ? 8 : i === 0 ? 8 : 7.5;
        if (i === 4) sheet.mergeCells(5, col, 6, col);
    });
    INDEKS_LAPORAN.forEach((index, i) => {
        const col = layout.indeks + 4 * i;
        const imageId = workbook.addImage({ base64: panah[index.warna], extension: "png" });
        sheet.addImage(imageId, { tl: { col: col + 0.75, row: 1.15 }, ext: { width: 42, height: 27 }, editAs: "oneCell" });
        gabungHeader(sheet, 4, col, col + 3, index.label, index.warna, i === 4 ? 10 : 14);
        STANDAR_LAPORAN.forEach((_, j) => {
            const start = col + j * 2;
            gabungHeader(sheet, 5, start, start + 1, j === 0 ? "PERMENKES 2 2020" : "WHO - LMS", index.warna, 11);
            selHeader(sheet, 6, start, "Z SCORE", index.warna);
            selHeader(sheet, 6, start + 1, "STATUS GIZI", index.warna);
            sheet.getColumn(start).width = 8.63;
            sheet.getColumn(start + 1).width = i === 2 ? 20 : i === 3 ? 18 : i >= 4 ? 13 : 14;
        });
    });
    return { sheet, layout };
}

export function formatBaris(sheet: ExcelJS.Worksheet, row: number, layout: TataLetak) {
    const baris = sheet.getRow(row);
    baris.height = 15;
    for (let col = 1; col <= layout.akhir; col++) {
        const cell = sheet.getCell(row, col);
        cell.font = { name: "Calibri", size: 11, color: { argb: HITAM } };
        cell.alignment = { horizontal: col === layout.nama ? "left" : "center", vertical: "middle" };
        cell.border = { top: thin, bottom: thin, left: thin, right: thin };
        if (col === layout.ukur || (col >= layout.indeks && (col - layout.indeks) % 2 === 0)) cell.numFmt = "0.00";
        else if (col > layout.ukur && col < layout.ukur + 4) cell.numFmt = "0.0";
        else if (col === layout.umur || col === layout.nama) cell.numFmt = "@";
        if (col === layout.umur && String(cell.value ?? '').includes('hari tidak tercatat')) {
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            baris.height = 30;
        }
    }
    if (String(sheet.getCell(row, layout.nama).value ?? "").length > 34) {
        sheet.getCell(row, layout.nama).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
        baris.height = 29;
    }
}

/** Colors follow the template's status labels, never a new numeric threshold. */
export function selesaikanSheet(sheet: ExcelJS.Worksheet, layout: TataLetak, akhir: number) {
    const terakhir = Math.max(BARIS_DATA, akhir);
    sheet.autoFilter = { from: { row: BARIS_HEADER, column: layout.historis ? 3 : 1 }, to: { row: terakhir, column: layout.akhir } };
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(layout.akhir).letter}${terakhir}`;
    const merah = ["BB Kurang", "BB Sangat Kurang", "Pendek", "Sangat pendek", "K-Gizi Kurang", "Gizi Kurang", "Gizi Buruk", "Obesitas", "Kurus", "Mikrosefali", "Di bawah −2 SD"];
    const merahMuda = ["BB Lebih", "RGL-Resiko Gizi Lebih", "Berisiko Gizi Lebih", "GL-Gizi Lebih", "Gizi Lebih", "Gemuk", "Makrosefali", "Tinggi", "Di atas +2 SD"];
    for (let col = layout.indeks + 1; col <= layout.akhir; col += 2) {
        const letter = sheet.getColumn(col).letter;
        sheet.addConditionalFormatting({ ref: `${letter}${BARIS_DATA}:${letter}${terakhir}`, rules: [
            { type: "expression", priority: 1, formulae: [`OR(${merah.map((s) => `${letter}${BARIS_DATA}="${s}"`).join(",")})`], style: { fill: warnaIsi("FFFF0000"), font: { color: { argb: "FFFFFFFF" } } } },
            { type: "expression", priority: 2, formulae: [`OR(${merahMuda.map((s) => `${letter}${BARIS_DATA}="${s}"`).join(",")})`], style: { fill: warnaIsi("FFFFC7CE"), font: { color: { argb: "FF9C0006" } } } },
        ] });
    }
    for (let col = layout.indeks; col <= layout.akhir; col += 2) {
        const letter = sheet.getColumn(col).letter;
        sheet.addConditionalFormatting({ ref: `${letter}${BARIS_DATA}:${letter}${terakhir}`, rules: [
            { type: 'expression', priority: 3,
                formulae: [`AND(ISNUMBER(${letter}${BARIS_DATA}),${letter}${BARIS_DATA}<=AmbangPeringatanInternal)`],
                style: { fill: warnaIsi('FFFFF2CC'), font: { color: { argb: 'FF9C6500' } } } },
        ] });
    }
}
