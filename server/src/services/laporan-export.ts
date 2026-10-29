import ExcelJS from "exceljs";
import { kategoriDari } from "../antropometri/kategori.ts";
import type { BarisBertanda } from "./laporan-perhitungan.ts";
import type { BarisRiwayat2T } from './laporan-riwayat-2t.ts';
import { umurBulan } from './laporan-perhitungan.ts';
import { AMBANG_PERINGATAN_INTERNAL, deskripsiSdLila, kodeNtb } from './laporan-tampilan.ts';
import { BARIS_DATA, INDEKS_LAPORAN, STANDAR_LAPORAN, formatBaris, namaPeriode, selesaikanSheet, siapkanSheet, type TataLetak } from "./laporan-excel-layout.ts";

type DataLaporan = { periode: string; standar: string[]; bulanan: BarisBertanda[]; riwayat2T: BarisRiwayat2T[] };
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
        "Sangat pendek": "Pendek",
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
    tambahPetunjuk(workbook, data.periode);
    return workbook;
}
