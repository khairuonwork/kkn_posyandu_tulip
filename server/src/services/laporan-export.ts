import ExcelJS from "exceljs";
import type { BarisBertanda } from "./laporan-perhitungan.ts";
import type { BarisRiwayat2T } from './laporan-riwayat-2t.ts';
import { BARIS_DATA, INDEKS_LAPORAN, STANDAR_LAPORAN, formatBaris, namaPeriode, selesaikanSheet, siapkanSheet, type TataLetak } from "./laporan-excel-layout.ts";

type DataLaporan = { periode: string; standar: string[]; bulanan: BarisBertanda[]; riwayat2T: BarisRiwayat2T[] };
const BULAN_SINGKAT = ["JAN", "FEB", "MAR", "APRIL", "MEI", "JUNI", "JULI", "AGUST", "SEPT", "OKT", "NOV", "DES"];

function labelBulan(periode: string): string {
    const [tahun, bulan] = periode.split("-");
    return BULAN_SINGKAT[Number(bulan) - 1] + "'" + tahun.slice(-2);
}

function nilaiZ(row: BarisRiwayat2T, standard: string, index: string): number | null {
    const value = row.penilaian[standard]?.[index]?.z;
    const numeric = typeof value === "number" ? value : value == null ? null : Number(value);
    return numeric !== null && Number.isFinite(numeric) ? numeric : null;
}

/** Presentation aliases only; category thresholds stay in the calculation service. */
function labelKategori(index: string, kategori: unknown): string | null {
    if (typeof kategori !== "string") return null;
    const label: Record<string, string> = {
        "Berat badan normal": "BB Normal", "Berat badan kurang": "BB Kurang",
        "Berat badan sangat kurang": "BB Sangat Kurang", "Risiko berat badan lebih": "BB Lebih",
        "Gizi baik": index === "BB_TB" ? "B-Gizi Baik" : "Gizi Baik",
        "Gizi kurang": index === "BB_TB" ? "K-Gizi Kurang" : "Gizi Kurang",
        "Gizi buruk": "Gizi Buruk",
        "Berisiko gizi lebih": index === "BB_TB" ? "RGL-Resiko Gizi Lebih" : "Berisiko Gizi Lebih",
        "Gizi lebih": index === "BB_TB" ? "GL-Gizi Lebih" : "Gizi Lebih",
    };
    return label[kategori] ?? kategori;
}

function hasilUkur(row: BarisRiwayat2T): ExcelJS.CellValue[] {
    const values: ExcelJS.CellValue[] = [row.bbKg, row.tinggiCm, row.lilaCm, row.likaCm, row.nt];
    for (const index of INDEKS_LAPORAN) for (const standard of STANDAR_LAPORAN) {
        const score = row.penilaian[standard]?.[index.id];
        values.push(nilaiZ(row, standard, index.id), labelKategori(index.id, score?.kategori));
    }
    return values;
}

function judulPengukuran(data: DataLaporan): string {
    const dates = [...new Set(data.bulanan.map((row) => row.tanggalUkur))];
    if (dates.length !== 1) return "HASIL PENGUKURAN " + namaPeriode(data.periode);
    const [tahun, bulan, hari] = dates[0].split("-");
    return "HASIL PENGUKURAN " + Number(hari) + " " + namaPeriode(tahun + "-" + bulan);
}

function simpanDetail(sheet: ExcelJS.Worksheet, layout: TataLetak, r: number, row: BarisRiwayat2T) {
    // Tetap tersedia untuk penelusuran, di luar area cetak format Puskesmas.
    const headers = ["ID ANAK", "NIK", "TANGGAL LAHIR", "IBU/ORTU", "TANGGAL UKUR", "UMUR HARI", "N/T ARSIP", "KENAIKAN (g)", "KBM (g)", "SUMBER RIWAYAT"];
    const values: ExcelJS.CellValue[] = [row.anakId, row.nik, new Date(row.tglLahir + "T00:00:00Z"), row.namaOrtu,
        row.tanggalUkur === null ? null : new Date(row.tanggalUkur + "T00:00:00Z"), row.umurHari, row.ntobRaw, row.kenaikanGram, row.kbmGram,
        row.sumberRiwayat === 'arsip' ? row.sumberFile ?? 'Arsip bulanan' : 'Pengukuran aplikasi'];
    headers.forEach((label, i) => {
        const col = layout.akhir + 1 + i;
        sheet.getCell(6, col).value = label;
        sheet.getColumn(col).hidden = true;
        sheet.getColumn(col).width = 22;
        const cell = sheet.getCell(r, col);
        cell.value = values[i];
        cell.numFmt = i === 2 || i === 4 ? "yyyy-mm-dd" : i === 1 ? "@" : "General";
    });
}

function tambahRekap(workbook: ExcelJS.Workbook, data: DataLaporan) {
    const { sheet, layout } = siapkanSheet(workbook, "Rekap Z Score", data.periode, false, judulPengukuran(data));
    // Urutan contoh: laki-laki, perempuan; umur termuda dahulu di setiap kelompok.
    const rows = [...data.bulanan].sort((a, b) => a.jk.localeCompare(b.jk) || a.umurHari - b.umurHari || a.nama.localeCompare(b.nama, "id"));
    rows.forEach((row, i) => {
        const r = BARIS_DATA + i;
        sheet.getRow(r).values = [i + 1, row.nama, row.rt, row.jk, row.umurLengkap, ...hasilUkur(row)];
        formatBaris(sheet, r, layout);
        simpanDetail(sheet, layout, r, row);
    });
    selesaikanSheet(sheet, layout, BARIS_DATA + rows.length - 1);
}

function tambahHistoris(workbook: ExcelJS.Workbook, data: DataLaporan) {
    const { sheet, layout } = siapkanSheet(workbook, "Historis 2T+", data.periode, true, "HASIL PENGUKURAN");
    const groups = new Map<number, BarisRiwayat2T[]>();
    for (const row of data.riwayat2T) groups.set(row.anakId, [...(groups.get(row.anakId) ?? []), row]);
    const sorted = [...groups.values()].map((rows) => rows.sort((a, b) => a.periodeId.localeCompare(b.periodeId)));
    sorted.sort((a, b) => (b.at(-1)?.jumlahTBerturut ?? 0) - (a.at(-1)?.jumlahTBerturut ?? 0) || a[0].nama.localeCompare(b[0].nama, "id"));
    let r = BARIS_DATA;
    sorted.forEach((rows, group) => {
        const latest = rows.at(-1)!;
        const status = latest.status2T ?? (latest.jumlahTBerturut > 0 ? latest.jumlahTBerturut + "T" : latest.nt);
        rows.forEach((row, i) => {
            sheet.getRow(r).values = [i === 0 ? group + 1 : null, i === 0 ? status : null,
                labelBulan(row.periodeId), row.nama, row.rt, row.jk, row.umurLengkap, ...hasilUkur(row)];
            formatBaris(sheet, r, layout);
            simpanDetail(sheet, layout, r, row);
            sheet.getCell(r, 2).font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFF0000" } };
            r++;
        });
        if (group < sorted.length - 1) {
            sheet.getRow(r).height = 10;
            r++;
        }
    });
    selesaikanSheet(sheet, layout, r - 1);
}

function tambahPetunjuk(workbook: ExcelJS.Workbook, periode: string) {
    const sheet = workbook.addWorksheet("Petunjuk");
    sheet.addRows([
        ["Laporan Posyandu Tulip", namaPeriode(periode)],
        ["Format laporan", "Mengikuti SEPT_REKAP dan 2T-6T SEPT 2026 dari contoh Posyandu. Umur lengkap dan kolom N/T mengikuti permintaan terbaru."],
        ["Umur lengkap", "Tahun, bulan, dan sisa hari pada tanggal pengukuran: contoh 2Thn8Bln4Hari."],
        ["Hasil pengukuran", "BB dalam kg; TB/PB, LILA, dan LIKA dalam cm. Angka kosong berarti belum tersedia; bukan nol."],
        ["Z-score", "Nilai dari layanan laporan saat diunduh. Umur kalender sampai ketelitian hari digunakan untuk interpolasi acuan bulanan. Angka ditampilkan dua desimal."],
        ["N/T", "Hasil perbandingan pengukuran bulanan berurutan mengikuti perhitungan KMS aplikasi. Kosong bila belum dapat dinilai."],
        ["Historis 2T+", "Status 2T+ bulan terpilih berasal dari pengukuran berurutan atau arsip bulanan petugas. Baris arsip mempertahankan Z-score file sumber dan umur bulan; tanggal dan sisa hari yang tidak tercatat dikosongkan. Sumber tiap baris tersedia pada kolom tersembunyi."],
        ["Status gizi", "Singkatan mengikuti contoh laporan. Sel merah atau merah muda mengikuti kategori yang dihitung layanan laporan. Kategori yang belum tersedia dibiarkan kosong."],
        ["Pembaruan", "Unduh ulang setelah data aplikasi diperbarui. Berkas adalah rekap pada saat unduh; mengedit hasil ukur di Excel tidak menghitung ulang Z-score."],
        ["Detail sumber", "ID anak, NIK, tanggal lahir, tanggal ukur, umur hari, N/T arsip, kenaikan BB, dan KBM tersedia pada kolom tersembunyi setelah tabel. Tampilkan kembali kolom bila perlu ditelusuri."],
    ]);
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 110;
    sheet.eachRow((row, i) => {
        row.font = { name: "Calibri", size: 11 };
        row.alignment = { vertical: "middle", wrapText: true };
        row.height = i === 1 ? 25 : 42;
        row.getCell(1).font = { name: "Calibri", size: 11, bold: true };
    });
}

/** Workbook presentation only: does not write to the database or recalculate clinical scores. */
export async function workbookLaporan(data: DataLaporan) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SIMPATIK Posyandu";
    workbook.subject = "Laporan " + data.periode;
    workbook.description = "Rekap Z-score dan historis 2T+ mengikuti format laporan Posyandu.";
    tambahRekap(workbook, data);
    tambahHistoris(workbook, data);
    tambahPetunjuk(workbook, data.periode);
    return workbook;
}
