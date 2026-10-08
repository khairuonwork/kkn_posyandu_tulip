import ExcelJS from "exceljs";

const UKURAN_MAKSIMUM = 3 * 1024 * 1024;

const BULAN: Readonly<Record<string, number>> = {
    jan: 1,
    januari: 1,
    feb: 2,
    februari: 2,
    mar: 3,
    maret: 3,
    apr: 4,
    april: 4,
    mei: 5,
    jun: 6,
    juni: 6,
    jul: 7,
    juli: 7,
    agu: 8,
    ags: 8,
    agust: 8,
    agustus: 8,
    sep: 9,
    sept: 9,
    september: 9,
    okt: 10,
    oktober: 10,
    nov: 11,
    november: 11,
    des: 12,
    desember: 12,
};

const NAMA_BULAN = [
    "",
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
] as const;

type NilaiBaris = string | number | boolean | Date | null | undefined;

export type BarisSasaranExcel = {
    barisAsal: number;
    nik: string | null;
    eppgbm: string | null;
    nama: string;
    tglLahir: string;
    jk: "L" | "P";
    namaOrtu: string;
    nikOrtu: string | null;
    rt: string;
    anakKe: number | null;
    bbLahirKg: number | null;
    bbLahirMentah: string | null;
    pbLahirCm: number | null;
    bukuKia: boolean;
    imd: boolean;
    statusAwal: "menunggu" | "pindah";
    masalah: string[];
    /** Baris ini berbagi NIK anak dengan baris lain dan tidak aman diterbitkan. */
    identitasDuplikat: boolean;
};

export type SheetSasaran = {
    sheet: string;
    periode: string;
    labelPeriode: string;
    barisHeader: number;
    jumlahBaris: number;
    jumlahSiap: number;
    jumlahPerluVerifikasi: number;
    jumlahDitahan: number;
    barisVerifikasi: Array<{
        barisAsal: number;
        nama: string;
        masalah: string[];
        ditahan: boolean;
    }>;
    baris: BarisSasaranExcel[];
};

export class GalatExcelSasaran extends Error {}

function headerBaku(nilai: string): string {
    return nilai
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("id-ID")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function teks(nilai: NilaiBaris): string {
    if (nilai === null || nilai === undefined) return "";
    if (nilai instanceof Date) return tanggalIso(nilai);
    return String(nilai)
        .replace(/\u00a0/g, " ")
        .trim();
}

function tanggalIso(nilai: NilaiBaris): string {
    if (nilai instanceof Date && !Number.isNaN(nilai.getTime())) {
        const tahun = nilai.getFullYear();
        const bulan = String(nilai.getMonth() + 1).padStart(2, "0");
        const hari = String(nilai.getDate()).padStart(2, "0");
        return `${tahun}-${bulan}-${hari}`;
    }

    if (typeof nilai === "number" && Number.isFinite(nilai)) {
        const epoch = new Date(Date.UTC(1899, 11, 30));
        epoch.setUTCDate(epoch.getUTCDate() + Math.floor(nilai));
        return epoch.toISOString().slice(0, 10);
    }

    const mentah = teks(nilai);
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(mentah);
    if (iso !== null) {
        return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    }
    const lokal = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(mentah);
    if (lokal !== null) {
        return `${lokal[3]}-${lokal[2].padStart(2, "0")}-${lokal[1].padStart(2, "0")}`;
    }

    return "";
}

function digit(nilai: NilaiBaris): string {
    return teks(nilai).replace(/\.0$/, "").replace(/\D/g, "");
}

function nik(nilai: NilaiBaris): string | null {
    const hasil = digit(nilai);
    return hasil.length === 16 ? hasil : null;
}

function angka(nilai: NilaiBaris): number | null {
    if (nilai === null || nilai === undefined || nilai === "") return null;
    const hasil =
        typeof nilai === "number"
            ? nilai
            : Number(teks(nilai).replace(",", "."));
    return Number.isFinite(hasil) ? hasil : null;
}

function benar(nilai: NilaiBaris): boolean {
    const isi = headerBaku(teks(nilai));
    return ["ya", "ada", "y", "1", "true"].includes(isi);
}

function periodeDariNama(
    nama: string,
): { periode: string; label: string } | null {
    const baku = headerBaku(nama);
    const tahun = /(?:^|_)(20\d{2})(?:_|$)/.exec(baku)?.[1];
    const kataBulan = baku
        .split("_")
        .find((bagian) => BULAN[bagian] !== undefined);
    if (tahun === undefined || kataBulan === undefined) return null;
    const nomor = BULAN[kataBulan];
    return {
        periode: `${tahun}-${String(nomor).padStart(2, "0")}`,
        label: `${NAMA_BULAN[nomor]} ${tahun}`,
    };
}

const ALIAS: Readonly<Record<string, readonly string[]>> = {
    nik: ["nik"],
    eppgbm: ["eppgbm"],
    nama: ["nama_lengkap", "nama_anak"],
    tglLahir: ["tgl_lahir", "tanggal_lahir"],
    jk: ["jk", "jenis_kelamin"],
    namaOrtu: ["nama_ortu", "nama_orang_tua", "nama_ibu"],
    nikOrtu: ["nik_ortu", "nik_orang_tua"],
    rt: ["rt"],
    anakKe: ["anak_ke"],
    bbLahir: ["bb_lhr", "bb_lahir", "berat_badan_lahir"],
    pbLahir: ["pb_lhr", "pb_lahir", "panjang_badan_lahir"],
    bukuKia: ["kia", "buku_kia"],
    imd: ["imd"],
    bb: ["bb", "berat_badan"],
};

function indeksKolom(
    header: string[],
    nama: keyof typeof ALIAS,
): number | null {
    for (const alias of ALIAS[nama]) {
        const indeks = header.indexOf(alias);
        if (indeks >= 0) return indeks + 1;
    }
    return null;
}

function nilaiKolom(baris: ExcelJS.Row, indeks: number | null): NilaiBaris {
    if (indeks === null) return null;
    const sel = baris.getCell(indeks);
    if (sel.value instanceof Date) return sel.value;
    if (
        typeof sel.value === "object" &&
        sel.value !== null &&
        "result" in sel.value
    ) {
        return sel.value.result as NilaiBaris;
    }
    // `text` menjaga NIK 16 digit yang diformat Excel agar tidak dibulatkan
    // kembali oleh JavaScript.
    return sel.text === "" ? (sel.value as NilaiBaris) : sel.text;
}

function cariHeader(
    sheet: ExcelJS.Worksheet,
): { nomor: number; header: string[] } | null {
    const batasBaris = Math.max(
        sheet.rowCount,
        sheet.actualRowCount,
        sheet.lastRow?.number ?? 0,
        30,
    );
    const maksimum = Math.min(30, batasBaris);
    for (let nomor = 1; nomor <= maksimum; nomor++) {
        const baris = sheet.getRow(nomor);
        const header: string[] = [];
        const batasKolom = Math.max(
            sheet.actualColumnCount,
            sheet.columnCount,
            baris.cellCount,
            baris.actualCellCount,
            30,
        );
        for (let kolom = 1; kolom <= batasKolom; kolom++) {
            header.push(headerBaku(baris.getCell(kolom).text));
        }
        const punyaNama = ALIAS.nama.some((nama) => header.includes(nama));
        const punyaNik = ALIAS.nik.some((nama) => header.includes(nama));
        const punyaTanggal = ALIAS.tglLahir.some((nama) =>
            header.includes(nama),
        );
        const punyaJk = ALIAS.jk.some((nama) => header.includes(nama));
        if (punyaNama && punyaNik && punyaTanggal && punyaJk)
            return { nomor, header };
    }
    return null;
}

function bacaBaris(
    baris: ExcelJS.Row,
    header: string[],
): BarisSasaranExcel | null {
    const ambil = (nama: keyof typeof ALIAS) =>
        nilaiKolom(baris, indeksKolom(header, nama));
    const nama = teks(ambil("nama")).replace(/\s+/g, " ");
    const tglLahir = tanggalIso(ambil("tglLahir"));
    const jkMentah = teks(ambil("jk")).toUpperCase().slice(0, 1);
    const rtDigit = digit(ambil("rt"));

    // Baris kosong, subtotal, dan sisa format sampai baris 1000-an diabaikan.
    if (nama === "" && tglLahir === "" && rtDigit === "") return null;
    if (
        nama === "" ||
        tglLahir === "" ||
        !["L", "P"].includes(jkMentah) ||
        rtDigit === ""
    ) {
        return null;
    }

    const nikUtama = nik(ambil("nik"));
    // EPPGBM adalah pengenal sistem yang berbeda dari NIK. Jangan pernah
    // menyimpannya di kolom NIK, sekalipun kebetulan berisi 16 digit.
    const eppgbm = teks(ambil("eppgbm")) || null;
    const bbMentah = teks(ambil("bbLahir")) || null;
    const bbAngka = angka(ambil("bbLahir"));
    const masalah: string[] = [];
    if (nikUtama === null) masalah.push("NIK anak belum valid");
    if (nik(ambil("nikOrtu")) === null)
        masalah.push("NIK orang tua belum valid");
    if (bbAngka !== null && bbAngka > 10)
        masalah.push("Berat lahir tampak memakai gram");

    const nilaiBb = teks(ambil("bb")).toLocaleLowerCase("id-ID");
    return {
        barisAsal: baris.number,
        nik: nikUtama,
        eppgbm,
        nama,
        tglLahir,
        jk: jkMentah as "L" | "P",
        namaOrtu:
            teks(ambil("namaOrtu")).replace(/\s+/g, " ") || "Belum tercatat",
        nikOrtu: nik(ambil("nikOrtu")),
        rt: rtDigit.padStart(2, "0"),
        anakKe: angka(ambil("anakKe")),
        bbLahirKg:
            bbAngka !== null && bbAngka >= 0.5 && bbAngka <= 10
                ? bbAngka
                : null,
        bbLahirMentah: bbMentah,
        pbLahirCm: angka(ambil("pbLahir")),
        bukuKia: benar(ambil("bukuKia")),
        imd: benar(ambil("imd")),
        statusAwal: nilaiBb.includes("pindah") ? "pindah" : "menunggu",
        masalah,
        identitasDuplikat: false,
    };
}

function dekode(isiBase64: string): Buffer {
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(isiBase64) || isiBase64.length < 20) {
        throw new GalatExcelSasaran("Isi file Excel tidak valid.");
    }
    const buffer = Buffer.from(isiBase64, "base64");
    if (buffer.length === 0 || buffer.length > UKURAN_MAKSIMUM) {
        throw new GalatExcelSasaran(
            "Ukuran file Excel harus antara 1 byte dan 3 MB.",
        );
    }
    if (buffer.subarray(0, 2).toString("ascii") !== "PK") {
        throw new GalatExcelSasaran("File bukan workbook .xlsx yang valid.");
    }
    return buffer;
}

export async function bacaWorkbookSasaran(
    isiBase64: string,
): Promise<SheetSasaran[]> {
    const workbook = new ExcelJS.Workbook();
    try {
        const isi = dekode(isiBase64);
        const arrayBuffer = isi.buffer.slice(
            isi.byteOffset,
            isi.byteOffset + isi.byteLength,
        ) as ArrayBuffer;
        await workbook.xlsx.load(arrayBuffer);
    } catch (galat) {
        if (galat instanceof GalatExcelSasaran) throw galat;
        throw new GalatExcelSasaran(
            "Workbook Excel rusak atau tidak dapat dibaca.",
        );
    }

    const hasil: SheetSasaran[] = [];
    for (const sheet of workbook.worksheets) {
        const periode = periodeDariNama(sheet.name);
        const ditemukan = cariHeader(sheet);
        if (periode === null || ditemukan === null) continue;
        const baris: BarisSasaranExcel[] = [];
        const batasMaksimal = Math.max(
            sheet.rowCount,
            sheet.actualRowCount,
            sheet.lastRow?.number ?? 0,
        );
        let kosongBerturut = 0;
        for (let nomor = ditemukan.nomor + 1; nomor <= batasMaksimal; nomor++) {
            const data = bacaBaris(sheet.getRow(nomor), ditemukan.header);
            if (data !== null) {
                baris.push(data);
                kosongBerturut = 0;
            } else {
                kosongBerturut++;
                if (
                    kosongBerturut >= 25 &&
                    nomor > (sheet.actualRowCount || 0)
                ) {
                    break;
                }
            }
        }
        if (baris.length === 0) continue;

        // Satu NIK tidak boleh membuat dua nama anak saling menimpa saat impor.
        // Tandai semua baris dalam kelompok duplikat dan tahan sampai Excel
        // diperbaiki. Baris tanpa NIK tetap dicocokkan secara terpisah.
        const barisPerNik = new Map<string, BarisSasaranExcel[]>();
        for (const data of baris) {
            if (data.nik === null) continue;
            const kelompok = barisPerNik.get(data.nik) ?? [];
            kelompok.push(data);
            barisPerNik.set(data.nik, kelompok);
        }
        for (const kelompok of barisPerNik.values()) {
            if (kelompok.length < 2) continue;
            const nomorBaris = kelompok.map((data) => data.barisAsal).join(", ");
            for (const data of kelompok) {
                data.identitasDuplikat = true;
                data.masalah.push(`NIK anak duplikat pada baris ${nomorBaris}`);
            }
        }

        const perluVerifikasi = baris.filter((data) => data.masalah.length > 0);
        hasil.push({
            sheet: sheet.name,
            periode: periode.periode,
            labelPeriode: periode.label,
            barisHeader: ditemukan.nomor,
            jumlahBaris: baris.length,
            jumlahSiap: baris.length - perluVerifikasi.length,
            jumlahPerluVerifikasi: perluVerifikasi.length,
            jumlahDitahan: baris.filter((data) => data.identitasDuplikat).length,
            barisVerifikasi: perluVerifikasi.map((data) => ({
                barisAsal: data.barisAsal,
                nama: data.nama,
                masalah: data.masalah,
                ditahan: data.identitasDuplikat,
            })),
            baris,
        });
    }

    if (hasil.length === 0) {
        throw new GalatExcelSasaran(
            "Tidak ditemukan sheet bulanan dengan kolom NIK, nama lengkap, tanggal lahir, dan jenis kelamin.",
        );
    }
    return hasil;
}
