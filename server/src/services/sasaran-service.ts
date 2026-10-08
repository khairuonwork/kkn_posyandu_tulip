import type { Pool } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { dalamTransaksi } from "../db/transaksi.ts";
import * as sasaranRepo from "../repositories/sasaran-repository.ts";
import { bacaWorkbookSasaran, GalatExcelSasaran } from "./sasaran-excel.ts";

export class GalatSasaran extends Error {
    readonly status: 400 | 404 | 409;

    constructor(status: 400 | 404 | 409, pesan: string) {
        super(pesan);
        this.status = status;
    }
}

const STATUS_SASARAN = [
    "menunggu",
    "selesai",
    "tidak_hadir",
    "pindah",
    "batal",
] as const satisfies readonly sasaranRepo.StatusSasaran[];

function idPositif(nilai: unknown, label: string): number {
    const id = typeof nilai === "number" ? nilai : Number(nilai);
    if (!Number.isSafeInteger(id) || id < 1)
        throw new GalatSasaran(400, `${label} tidak valid.`);
    return id;
}

export async function calon(
    pool: Pool,
    pengguna: PenggunaAktif,
    periodeRaw: unknown,
    cariRaw: unknown,
) {
    const periodeId = idPositif(periodeRaw, "Periode");
    const cari = typeof cariRaw === "string" ? cariRaw.trim() : "";
    if (cari.length < 2)
        throw new GalatSasaran(400, "Masukkan minimal 2 karakter untuk mencari anak.");
    if (cari.length > 80)
        throw new GalatSasaran(400, "Pencarian maksimal 80 karakter.");
    return sasaranRepo.calonSasaran(pool, pengguna, periodeId, cari);
}

export async function tambahManual(
    pool: Pool,
    pengguna: PenggunaAktif,
    badan: unknown,
) {
    const data = objek(badan);
    const periodeId = idPositif(data.periodeId, "Periode");
    const anakId = idPositif(data.anakId, "Anak");
    const hasil = await dalamTransaksi(
        pool,
        { pengguna: pengguna.id, sumber: "web" },
        (db) => sasaranRepo.tambahSasaranManual(db, periodeId, anakId, pengguna.id),
    );
    const pesan: Record<
        Exclude<sasaranRepo.HasilTambahSasaran["status"], "berhasil">,
        { status: 400 | 404 | 409; pesan: string }
    > = {
        periode_tidak_ada: { status: 404, pesan: "Periode sasaran tidak ditemukan." },
        sesi_ditutup: { status: 409, pesan: "Sesi periode ini sudah ditutup." },
        anak_tidak_ada: { status: 404, pesan: "Anak tidak ditemukan di database." },
        anak_tidak_aktif: { status: 400, pesan: "Anak tidak berstatus aktif." },
        di_luar_posyandu: { status: 400, pesan: "Anak berasal dari posyandu lain." },
        sudah_ada: { status: 409, pesan: "Anak sudah terdaftar sebagai sasaran periode ini." },
    };
    if (hasil.status !== "berhasil") {
        const galat = pesan[hasil.status];
        throw new GalatSasaran(galat.status, galat.pesan);
    }
    return hasil;
}

export async function ubah(
    pool: Pool,
    pengguna: PenggunaAktif,
    sasaranIdRaw: unknown,
    badan: unknown,
) {
    const sasaranId = idPositif(sasaranIdRaw, "ID sasaran");
    const data = objek(badan);
    const status = data.status;
    if (typeof status !== "string" || !STATUS_SASARAN.includes(status as sasaranRepo.StatusSasaran))
        throw new GalatSasaran(400, "Status sasaran tidak valid.");
    const catatanMentah = data.catatan;
    if (catatanMentah !== null && catatanMentah !== undefined && typeof catatanMentah !== "string")
        throw new GalatSasaran(400, "Catatan harus berupa teks.");
    const catatan = typeof catatanMentah === "string" ? catatanMentah.trim() || null : null;
    if (catatan !== null && catatan.length > 500)
        throw new GalatSasaran(400, "Catatan maksimal 500 karakter.");
    const hasil = await dalamTransaksi(
        pool,
        { pengguna: pengguna.id, sumber: "web" },
        (db) => sasaranRepo.ubahSasaran(
            db,
            sasaranId,
            status as sasaranRepo.StatusSasaran,
            catatan,
            pengguna.id,
        ),
    );
    if (hasil === "tidak_ada") throw new GalatSasaran(404, "Sasaran tidak ditemukan.");
    if (hasil === "periode_ditutup")
        throw new GalatSasaran(409, "Sesi periode ini sudah ditutup.");
    return { sasaranId, status, catatan };
}

function objek(badan: unknown): Record<string, unknown> {
    if (typeof badan !== "object" || badan === null) {
        throw new GalatSasaran(400, "Data permintaan tidak valid.");
    }
    return badan as Record<string, unknown>;
}

function teks(data: Record<string, unknown>, kunci: string): string {
    return typeof data[kunci] === "string" ? data[kunci].trim() : "";
}

function berkas(data: Record<string, unknown>): {
    namaFile: string;
    isiBase64: string;
} {
    const namaFile = teks(data, "namaFile").replace(/[\\/]/g, "").slice(0, 180);
    const isiMentah = teks(data, "dataBase64");
    const isiBase64 = isiMentah.includes(",")
        ? (isiMentah.split(",").pop() ?? "")
        : isiMentah;
    if (
        !namaFile.toLocaleLowerCase("id-ID").endsWith(".xlsx") ||
        isiBase64 === ""
    ) {
        throw new GalatSasaran(400, "Nama dan isi file .xlsx wajib diisi.");
    }
    return { namaFile, isiBase64 };
}

async function baca(isiBase64: string) {
    try {
        return await bacaWorkbookSasaran(isiBase64);
    } catch (galat) {
        if (galat instanceof GalatExcelSasaran)
            throw new GalatSasaran(400, galat.message);
        throw galat;
    }
}

export async function pratinjau(badan: unknown) {
    const data = objek(badan);
    const { namaFile, isiBase64 } = berkas(data);
    const sheets = await baca(isiBase64);
    return {
        namaFile,
        sheets: sheets.map(({ baris: _baris, ...sheet }) => sheet),
    };
}

export async function impor(
    pool: Pool,
    pengguna: PenggunaAktif,
    badan: unknown,
) {
    const data = objek(badan);
    const { namaFile, isiBase64 } = berkas(data);
    const namaSheet = teks(data, "sheet");
    const sheets = await baca(isiBase64);
    const sheet = sheets.find((item) => item.sheet === namaSheet);
    if (sheet === undefined)
        throw new GalatSasaran(
            400,
            "Sheet sasaran yang dipilih tidak ditemukan.",
        );

    return dalamTransaksi(
        pool,
        { pengguna: pengguna.id, sumber: "impor-excel" },
        (db) => sasaranRepo.gantiSasaran(db, pengguna, namaFile, sheet),
    );
}

export function daftar(pool: Pool, pengguna: PenggunaAktif, periode?: string) {
    if (periode !== undefined && !/^20\d{2}-(0[1-9]|1[0-2])$/.test(periode)) {
        throw new GalatSasaran(400, "Periode harus berformat YYYY-MM.");
    }
    return sasaranRepo.daftarSasaran(pool, pengguna, periode);
}

export function daftarPeriode(pool: Pool) {
    return sasaranRepo.daftarPeriodeSasaran(pool);
}

export async function tutupSesi(
    pool: Pool,
    pengguna: PenggunaAktif,
    badan: unknown,
) {
    const data = objek(badan);
    const periodeId = Number(data.periodeId);
    if (
        !Number.isSafeInteger(periodeId) ||
        periodeId < 1 ||
        data.konfirmasi !== true
    ) {
        throw new GalatSasaran(
            400,
            "Periode dan konfirmasi penutupan sesi wajib valid.",
        );
    }
    const hasil = await dalamTransaksi(
        pool,
        { pengguna: pengguna.id, sumber: "tablet" },
        (db) => sasaranRepo.tutupSesi(db, pengguna, periodeId),
    );
    return hasil;
}
