import type { Pool } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { dalamTransaksi } from "../db/transaksi.ts";
import * as sasaranRepo from "../repositories/sasaran-repository.ts";
import { bacaWorkbookSasaran, GalatExcelSasaran } from "./sasaran-excel.ts";

export class GalatSasaran extends Error {
    readonly status: 400 | 404;

    constructor(status: 400 | 404, pesan: string) {
        super(pesan);
        this.status = status;
    }
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
    // `teks` memangkas spasi, sedangkan nama sheet di Excel bisa berekor spasi.
    const sheet = sheets.find((item) => item.sheet.trim() === namaSheet);
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
