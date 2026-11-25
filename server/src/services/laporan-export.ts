import ExcelJS from "exceljs";
import { kategoriDari } from "../antropometri/kategori.ts";
import type { BarisBertanda } from "./laporan-perhitungan.ts";
import type { BarisRiwayat2T } from './laporan-riwayat-2t.ts';
import type { BarisMenyusui } from '../repositories/antrean-repository.ts';
import { umurBulan } from './laporan-perhitungan.ts';
import { AMBANG_PERINGATAN_INTERNAL, deskripsiSdLila, kodeNtb } from './laporan-tampilan.ts';
import { BARIS_DATA, BARIS_HEADER, INDEKS_LAPORAN, STANDAR_LAPORAN, formatBaris, gabungHeader, namaPeriode, selHeader, selesaikanSheet, siapkanSheet, warnaIsi, type TataLetak } from "./laporan-excel-layout.ts";

type DataLaporan = { periode: string; standar: string[]; bulanan: BarisBertanda[]; riwayat2T: BarisRiwayat2T[]; menyusui?: BarisMenyusui[] };
const BULAN_SINGKAT = ["JAN", "FEB", "MAR", "APRIL", "MEI", "JUNI", "JULI", "AGUST", "SEPT", "OKT", "NOV", "DES"];

function labelBulan(periode: string): string {
    const [tahun, bulan] = periode.split("-");
    return BULAN_SINGKAT[Number(bulan) - 1] + "'" + tahun.slice(-2);
}

function nilaiZ(row: BarisRiwayat2T, standard: string, index: string): number | null {
    const value: unknown = row.penilaian[standard]?.[index]?.z;
    const numeric = typeof value === "number" ? value :
        typeof value === "string" && value.trim() !== "" ? Number(value) : null;
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
    const values: ExcelJS.CellValue[] = [row.bbKg, row.tinggiCm, row.lilaCm ?? (row.perluUkurLingkar?.includes('lilaCm') ? 'Perlu pengukuran ulang' : null), row.likaCm ?? (row.perluUkurLingkar?.includes('likaCm') ? 'Perlu pengukuran ulang' : null), kodeNtb(row)];
    const bulan = row.tanggalUkur === null ? row.umurBulan : umurBulan(row.tglLahir, row.tanggalUkur);
    for (const index of INDEKS_LAPORAN) for (const standard of STANDAR_LAPORAN) {
        const z = nilaiZ(row, standard, index.id);
        if (index.id === 'LILA_U') {
            // Permintaan program: tampil mulai 6 bulan, dengan deskripsi SD
            // yang disetujui pengguna. Bukan kategori gizi akut/diagnosis baru.
            const tampil = bulan !== undefined && bulan >= 6 && bulan <= 60 && row.lilaCm !== null && row.lilaCm > 0;
            values.push(tampil ? z : null, tampil ? (deskripsiSdLila(z) ?? 'Belum dapat dinilai') :
                bulan !== undefined && (bulan < 6 || bulan > 60) ? 'Di luar usia acuan' : 'Belum diukur');
        } else {
            // Arsip dapat memiliki skor tanpa label, atau label lama yang tidak sesuai skor.
            // Gunakan skor asli (sebelum pembulatan tampilan) dan aturan aplikasi yang sama.
            values.push(z, z === null ? 'Belum dapat dinilai' : labelKategori(index.id, kategoriDari(index.id, z)));
        }
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
    const headers = ["ID ANAK", "NIK", "TANGGAL LAHIR", "IBU/ORTU", "TANGGAL UKUR", "UMUR HARI", "N/T/B ARSIP", "KENAIKAN (g)", "KBM (g)", "SUMBER RIWAYAT", "DASAR N/T/B", "SUMBER UMUR"];
    const values: ExcelJS.CellValue[] = [row.anakId, row.nik, new Date(row.tglLahir + "T00:00:00Z"), row.namaOrtu,
        row.tanggalUkur === null ? null : new Date(row.tanggalUkur + "T00:00:00Z"), row.umurHari, row.ntobRaw, row.kenaikanGram, row.kbmGram,
        row.sumberRiwayat === 'arsip' ? row.sumberFile ?? 'Arsip bulanan' : 'Pengukuran aplikasi',
        row.catatanNt ?? (row.nt === null && kodeNtb(row) !== null ? 'Penandaan dari sumber N/T/B arsip.' : row.nt === null ? 'BB pembanding atau penandaan sumber belum tersedia.' : 'Perbandingan BB bulanan berurutan dan KBM.'),
        row.sumberUmur === 'arsip-bulanan' ? 'Umur bulan arsip; hari tidak tercatat.' : 'Tanggal lahir dan tanggal pengukuran yang tersedia.'];
    headers.forEach((label, i) => {
        const col = layout.akhir + 1 + i;
        sheet.getCell(6, col).value = label;
        sheet.getColumn(col).hidden = true;
        sheet.getColumn(col).width = 22;
        const cell = sheet.getCell(r, col);
        cell.value = values[i];
        cell.numFmt = i === 2 || i === 4 ? "yyyy-mm-dd" : i === 1 ? "@" : "General";
    });
    for (const [key, offset] of [['lilaCm', 2], ['likaCm', 3]] as const) {
        const tanggal = row.sumberLingkar?.[key];
        if (tanggal) sheet.getCell(r, layout.ukur + offset).note = `Nilai dari pengukuran ${tanggal}; berlaku hingga dua bulan berikutnya. Z-score mengikuti umur periode laporan.`;
    }
    if (row.catatanNt) sheet.getCell(r, layout.ukur + 4).note = row.catatanNt;
    // Nilai tidak wajar tetap dihitung; catatan sel meminta dicek tanpa mengubah teks status (dipakai aturan warna).
    INDEKS_LAPORAN.forEach((index, i) => {
        if (!(row.penilaian["WHO-2006"]?.[index.id] as { tidakWajar?: boolean } | undefined)?.tidakWajar) return;
        STANDAR_LAPORAN.forEach((_, s) => {
            sheet.getCell(r, layout.ukur + 5 + (i * STANDAR_LAPORAN.length + s) * 2 + 1).note =
                'Perlu dicek: nilai jauh di luar batas wajar. Ukur ulang atau betulkan bila salah ketik.';
        });
    });
    if (row.sumberUmur === 'arsip-bulanan') {
        sheet.getCell(r, layout.umur).note = 'Arsip hanya memuat umur bulan. Sisa hari tidak diasumsikan dari tanggal acara atau akhir bulan.';
    }
}

function umurTampilan(value: string): string {
    const umur = /^(\d+)\s*Thn\s*(\d+)\s*Bln/i.exec(value);
    return umur ? `${umur[1]} Thn ${umur[2]} Bln` : value;
}

function tambahRekap(workbook: ExcelJS.Workbook, data: DataLaporan) {
    const { sheet, layout } = siapkanSheet(workbook, "Rekap Z Score", data.periode, false, judulPengukuran(data));
    // Urutan contoh: laki-laki, perempuan; umur termuda dahulu di setiap kelompok.
    const rows = [...data.bulanan].sort((a, b) => a.jk.localeCompare(b.jk) || a.umurHari - b.umurHari || a.nama.localeCompare(b.nama, "id"));
    rows.forEach((row, i) => {
        const r = BARIS_DATA + i;
        sheet.getRow(r).values = [i + 1, row.nama, row.rt, row.jk, umurTampilan(row.umurLengkap), ...hasilUkur(row)];
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
                labelBulan(row.periodeId), row.nama, row.rt, row.jk, umurTampilan(row.umurLengkap), ...hasilUkur(row)];
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

const yaTidak = (v: boolean | null) => v === null ? null : v ? "Ya" : "Tidak";

/** Jawaban pendaftaran; kosong berarti tidak ditanyakan atau dilewati. Gaya mengikuti Rekap Z Score. */
function tambahMenyusui(workbook: ExcelJS.Workbook, periode: string, rows: BarisMenyusui[]) {
    const sheet = workbook.addWorksheet("Menyusui & ASI", {
        views: [{ state: "frozen", xSplit: 2, ySplit: BARIS_HEADER, showGridLines: true }],
        pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:6" },
    });
    const data = rows.map((row) => ({ ...row, umur: umurBulan(row.tglLahir, row.tanggal) }))
        .sort((a, b) => a.jk.localeCompare(b.jk) || a.umur - b.umur || a.nama.localeCompare(b.nama, "id"));
    const hitam = { argb: "FF000000" };
    const garis: ExcelJS.Border = { style: "thin", color: hitam };
    const bingkai = { top: garis, bottom: garis, left: garis, right: garis };
    for (const [row, value] of [[1, "REKAP MENYUSUI DAN ASI EKSKLUSIF"], [2, "BULAN " + namaPeriode(periode)]] as const) {
        const cell = sheet.getCell(row, 1);
        cell.value = value;
        cell.font = { name: "Calibri", size: row === 1 ? 14 : 11, bold: true, color: { argb: "FF0070C0" } };
    }
    sheet.getCell("A3").value = "Sumber: jawaban petugas pendaftaran. Sel kosong = tidak ditanyakan atau dilewati; tanda — = di luar usia 0–6 bulan.";
    sheet.getCell("A3").font = { name: "Calibri", size: 10, color: { argb: "FF9C6500" } };
    [18.5, 15, 18, 28, 18, 29].forEach((height, i) => { sheet.getRow(i + 1).height = height; });

    const HIJAU = "FFCCFF99", JINGGA = "FFFFC000", PINK = "FFFFCCFF";
    ["NO", "NAMA LENGKAP", "NIK", "RT", "JK", "UMUR (bln)", "TANGGAL DAFTAR"].forEach((label, i) => selHeader(sheet, 6, i + 1, label));
    gabungHeader(sheet, 4, 8, 8, "IBU MASIH MENYUSUI", HIJAU, 11);
    gabungHeader(sheet, 4, 9, 9, "ASI EKSKLUSIF", JINGGA, 11);
    selHeader(sheet, 5, 8, "usia 0–23 bulan", HIJAU, 10);
    selHeader(sheet, 5, 9, "usia 0–6 bulan", JINGGA, 10);
    selHeader(sheet, 6, 8, "YA / TIDAK", HIJAU);
    selHeader(sheet, 6, 9, "YA / TIDAK", JINGGA);
    [4.5, 33.73, 19, 5, 5, 11, 15, 20, 20].forEach((w, i) => { sheet.getColumn(i + 1).width = w; });

    data.forEach((row, i) => {
        const r = BARIS_DATA + i;
        sheet.getRow(r).values = [i + 1, row.nama, row.nik, row.rt, row.jk, row.umur, new Date(row.tanggal + "T00:00:00Z"),
            yaTidak(row.masihMenyusui), row.umur <= 6 ? yaTidak(row.asiEksklusif) : "—"];
        sheet.getRow(r).height = 15;
        for (let c = 1; c <= 9; c++) {
            const cell = sheet.getCell(r, c);
            cell.font = { name: "Calibri", size: 11, color: hitam };
            cell.alignment = { horizontal: c === 2 ? "left" : "center", vertical: "middle" };
            cell.border = bingkai;
        }
        // NIK 16 digit harus teks; sebagai angka Excel membulatkan digit terakhir.
        sheet.getCell(r, 3).numFmt = "@";
        sheet.getCell(r, 4).numFmt = "@";
        sheet.getCell(r, 7).numFmt = "dd/mm/yyyy";
    });
    const akhir = Math.max(BARIS_DATA, BARIS_DATA + data.length - 1);
    sheet.autoFilter = { from: { row: BARIS_HEADER, column: 1 }, to: { row: akhir, column: 9 } };
    sheet.addConditionalFormatting({ ref: `H${BARIS_DATA}:I${akhir}`, rules: [{ type: "cellIs", operator: "equal", priority: 1,
        formulae: ['"Tidak"'], style: { fill: warnaIsi("FFFFC7CE"), font: { color: { argb: "FF9C0006" } } } }] });

    // Ringkasan di kanan tabel; rumus ikut berubah bila jawaban diperbaiki di Excel.
    const asi = data.filter((row) => row.umur <= 6);
    const G = `H${BARIS_DATA}:H${akhir}`, H = `I${BARIS_DATA}:I${akhir}`, B = `B${BARIS_DATA}:B${akhir}`;
    const jumlah = (list: typeof data, key: "masihMenyusui" | "asiEksklusif", v: boolean | null) => list.filter((r) => r[key] === v).length;
    gabungHeader(sheet, 4, 11, 15, "RINGKASAN", PINK, 11);
    ["", "YA", "TIDAK", "TIDAK DITANYAKAN", "JUMLAH BALITA"].forEach((label, i) => selHeader(sheet, 5, 11 + i, label, PINK));
    const ringkasan: [string, ExcelJS.CellValue[]][] = [
        ["Ibu masih menyusui (0–23 bln)", [
            { formula: `COUNTIF(${G},"Ya")`, result: jumlah(data, "masihMenyusui", true) },
            { formula: `COUNTIF(${G},"Tidak")`, result: jumlah(data, "masihMenyusui", false) },
            { formula: `COUNTA(${B})-COUNTIF(${G},"Ya")-COUNTIF(${G},"Tidak")`, result: jumlah(data, "masihMenyusui", null) },
            { formula: `COUNTA(${B})`, result: data.length }]],
        ["ASI eksklusif (0–6 bln)", [
            { formula: `COUNTIF(${H},"Ya")`, result: jumlah(asi, "asiEksklusif", true) },
            { formula: `COUNTIF(${H},"Tidak")`, result: jumlah(asi, "asiEksklusif", false) },
            { formula: `COUNTA(${B})-COUNTIF(${H},"—")-COUNTIF(${H},"Ya")-COUNTIF(${H},"Tidak")`, result: jumlah(asi, "asiEksklusif", null) },
            { formula: `COUNTA(${B})-COUNTIF(${H},"—")`, result: asi.length }]],
    ];
    ringkasan.forEach(([label, nilai], i) => {
        const r = 6 + i;
        [label, ...nilai].forEach((v, j) => {
            const cell = sheet.getCell(r, 11 + j);
            cell.value = v;
            cell.font = { name: "Calibri", size: 11, bold: j === 0, color: hitam };
            cell.alignment = { horizontal: j === 0 ? "left" : "center", vertical: "middle" };
            cell.border = bingkai;
        });
    });
    [30, 9, 9, 18, 16].forEach((w, i) => { sheet.getColumn(11 + i).width = w; });
    sheet.getColumn(10).width = 3;
    sheet.pageSetup.printArea = `A1:O${akhir}`;
}

function tambahPetunjuk(workbook: ExcelJS.Workbook, periode: string) {
    const sheet = workbook.addWorksheet("Petunjuk");
    sheet.addRows([
        ["Laporan Posyandu Tulip", namaPeriode(periode)],
        ["Format laporan", "Mengikuti SEPT_REKAP dan 2T-6T SEPT 2026 serta komentar Bu Sri. Kolom N/T/B disiapkan agar kode tidak tercampur saat dipakai untuk laporan F1."],
        ["Ambang peringatan internal (SD)", AMBANG_PERINGATAN_INTERNAL],
        ["Peringatan internal", "Sel Z-score berwarna kuning bila nilainya ≤ ambang di B3 (bawaan −1,96 SD). Ini peringatan internal, bukan pengganti batas klasifikasi gizi resmi. Nilai skor dan kategori resmi tidak diubah."],
        ["Umur lengkap", "Tahun dan bulan pada tanggal pengukuran, tanpa hari: contoh 2 Thn 8 Bln. Format ini berlaku pada Rekap Z Score dan Historis 2T+."],
        ["Hasil pengukuran", "BB dalam kg; TB/PB, LILA, dan LIKA dalam cm. Angka kosong berarti belum tersedia; bukan nol."],
        ["Z-score", "Nilai dari layanan laporan saat diunduh. Umur kalender sampai ketelitian hari digunakan untuk interpolasi acuan bulanan. Angka ditampilkan dua desimal."],
        ["N/T/B", "N = naik; T = tidak naik; B = baru sesuai penandaan sumber. Kode hasil perbandingan BB/KBM diprioritaskan. Pembanding yang hilang tidak otomatis menjadi B atau TDK. Tanpa dasar penilaian/kode sumber, sel tetap kosong."],
        ["Historis 2T+", "Status 2T+ berasal dari pengukuran berurutan atau arsip petugas. Jika pembanding awal hilang, T mengikuti rangkaian T pada arsip dan kenaikan/KBM tetap kosong; catatan sel menjelaskan sumbernya. Skor dan nilai ukur arsip dipertahankan."],
        ["Umur arsip", "Historis 2T+ menampilkan tahun dan bulan saja. Sisa hari dan sumber tanggal tetap tersedia untuk penelusuran, tanpa membuat tanggal fiktif."],
        ["Status dan warna", "Kesimpulan diisi langsung dari Z-score asli dengan aturan kategori aplikasi, termasuk arsip yang labelnya kosong. Tanpa skor ditulis Belum dapat dinilai. Status rendah/kurang berwarna merah dengan teks putih; status tinggi/lebih berwarna merah muda dengan teks merah tua. Aturan yang sama berlaku pada Rekap dan Historis 2T+. Warna bergantung pada isi sel dan berubah bila label diedit di Excel."],
        ["LILA/U usia ≥6 bulan", "Label program: Kurus di bawah −2 SD, Normal dari −2 hingga +2 SD, Gemuk di atas +2 SD. Bukan diagnosis gizi akut maupun kategori resmi Permenkes. Ditandai di luar usia acuan sebelum 6 bulan atau setelah 60 bulan; belum diukur bila LILA tidak tersedia."],
        ["LILA/LIKA berkala", "Nilai cm berlaku pada bulan ukur dan dua bulan berikutnya, dengan z-score dihitung ulang menurut umur laporan. Bulan ketiga wajib ukur ulang; jika belum tersedia ditulis Perlu pengukuran ulang. Catatan sel menunjukkan tanggal sumber nilai bawaan."],
        ["Pembaruan", "Unduh ulang setelah data aplikasi diperbarui. Berkas adalah rekap pada saat unduh; mengedit hasil ukur di Excel tidak menghitung ulang Z-score."],
        ["Detail sumber", "ID anak, NIK, tanggal lahir, tanggal ukur, umur hari, N/T/B arsip, kenaikan BB, KBM, sumber riwayat, dasar N/T/B dan sumber umur tersedia pada kolom tersembunyi setelah tabel."],
    ]);
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 110;
    sheet.eachRow((row, i) => {
        row.font = { name: "Calibri", size: 11 };
        row.alignment = { vertical: "middle", wrapText: true };
        row.height = i === 1 ? 25 : 42;
        row.getCell(1).font = { name: "Calibri", size: 11, bold: true };
    });
    sheet.getCell('B3').numFmt = '0.00';
    sheet.getRow(3).height = 30;
    workbook.definedNames.add("'Petunjuk'!$B$3", 'AmbangPeringatanInternal');
}

/** Workbook presentation only: does not write to the database or recalculate clinical scores. */
export async function workbookLaporan(data: DataLaporan) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SIMPATIK Posyandu";
    workbook.subject = "Laporan " + data.periode;
    workbook.description = "Rekap Z-score dan historis 2T+ mengikuti format laporan Posyandu.";
    tambahRekap(workbook, data);
    tambahHistoris(workbook, data);
    if (data.menyusui) tambahMenyusui(workbook, data.periode, data.menyusui);
    tambahPetunjuk(workbook, data.periode);
    return workbook;
}
