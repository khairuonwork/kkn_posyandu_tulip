/** Layanan baca anak: satu pintu aturan sumber daya REST Portal. */

import type { Pool } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { dalamTransaksi } from "../db/transaksi.ts";
import * as anakRepo from "../repositories/anak-repository.ts";
import { hitungDanSimpan } from "./gizi-service.ts";

export class GalatAnak extends Error {
    readonly status: 400 | 404;

    constructor(status: 400 | 404, pesan: string) {
        super(pesan);
        this.status = status;
    }
}

function angkaPositif(
    nilai: string | undefined,
    bawaan: number,
    maksimum: number,
): number {
    if (nilai === undefined || nilai === "") {
        return bawaan;
    }

    if (!/^\d+$/.test(nilai)) {
        throw new GalatAnak(
            400,
            "Parameter halaman dan ukuran harus bilangan bulat positif.",
        );
    }

    const angka = Number(nilai);
    if (!Number.isSafeInteger(angka) || angka < 1 || angka > maksimum) {
        throw new GalatAnak(
            400,
            `Parameter harus bernilai antara 1 dan ${maksimum}.`,
        );
    }

    return angka;
}

export async function daftar(
    pool: Pool,
    pengguna: PenggunaAktif,
    query: Record<string, string | undefined>,
) {
    const halaman = angkaPositif(query.halaman, 1, 100_000);
    const ukuran = angkaPositif(query.ukuran, 25, 100);
    const cari = (query.cari ?? "").trim();
    const hasil = await anakRepo.daftar(pool, pengguna, cari, {
        halaman,
        ukuran,
    });

    return { ...hasil, halaman, ukuran };
}

export async function ambil(pool: Pool, pengguna: PenggunaAktif, id: number) {
    const anak = await anakRepo.ambil(pool, pengguna, id);
    if (anak === null) {
        throw new GalatAnak(404, "Anak tidak ditemukan.");
    }

    return anak;
}

export async function riwayat(
    pool: Pool,
    pengguna: PenggunaAktif,
    anakId: number,
) {
    const pengukuran = await anakRepo.daftarPengukuran(pool, pengguna, anakId);
    if (pengukuran === null) {
        throw new GalatAnak(404, "Anak tidak ditemukan.");
    }

    return { pengukuran, garisSd: await anakRepo.garisSdBbU(pool) };
}

function teks(objek: Record<string, unknown>, kunci: string): string {
    return typeof objek[kunci] === "string" ? objek[kunci].trim() : "";
}

function angka(
    objek: Record<string, unknown>,
    kunci: string,
    wajib: boolean,
): number | null {
    const nilai = objek[kunci];
    if (
        !wajib &&
        (nilai === null ||
            nilai === undefined ||
            nilai === "" ||
            nilai === "N/A")
    )
        return null;
    const hasil =
        typeof nilai === "number"
            ? nilai
            : Number(String(nilai).replace(",", "."));
    if (!Number.isFinite(hasil))
        throw new GalatAnak(400, `${kunci} harus berupa angka.`);
    return hasil;
}

export async function simpanAnak(
    pool: Pool,
    pengguna: PenggunaAktif,
    badan: unknown,
) {
    if (typeof badan !== "object" || badan === null)
        throw new GalatAnak(400, "Data anak tidak valid.");
    const data = badan as Record<string, unknown>;
    const nik = teks(data, "nik");
    const nama = teks(data, "nama") || teks(data, "nama_anak");
    const tglLahir = teks(data, "tglLahir") || teks(data, "tgl_lahir");
    const jk = teks(data, "jk").toUpperCase();
    const namaOrtu = teks(data, "namaOrtu") || teks(data, "nama_ortu");
    const rt =
        pengguna.peran === "kader" ? (pengguna.rt ?? "") : teks(data, "rt");
    if (
        !/^\d{16}$/.test(nik) ||
        nama === "" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(tglLahir) ||
        !["L", "P"].includes(jk) ||
        namaOrtu === "" ||
        rt === ""
    ) {
        throw new GalatAnak(
            400,
            "NIK 16 digit, nama, tanggal lahir, jenis kelamin, orang tua, dan RT wajib valid.",
        );
    }

    return dalamTransaksi(
        pool,
        { pengguna: pengguna.id, sumber: "tablet" },
        (db) =>
            anakRepo.upsertAnak(db, {
                nik,
                nama,
                tglLahir,
                jk: jk as "L" | "P",
                namaOrtu,
                rt,
            }),
    );
}

export async function simpanPengukuran(
    pool: Pool,
    pengguna: PenggunaAktif,
    badan: unknown,
) {
    if (typeof badan !== "object" || badan === null)
        throw new GalatAnak(400, "Data pengukuran tidak valid.");
    const data = badan as Record<string, unknown>;
    const idPengukuran = teks(data, "id_pengukuran");
    const nikMentah = teks(data, "nik");
    const nik = /^\d{16}$/.test(nikMentah) ? nikMentah : null;
    const anakIdMentah = Number(data.id_anak);
    const anakId =
        Number.isSafeInteger(anakIdMentah) && anakIdMentah > 0
            ? anakIdMentah
            : null;
    const tanggalUkur = teks(data, "tanggal_ukur");
    const statusRaw = teks(data, "status_kehadiran")
        .toLowerCase()
        .replaceAll(" ", "_");
    const status = (
        ["hadir", "tidak_hadir", "pindah", "tidak_dapat_diukur"].includes(
            statusRaw,
        )
            ? statusRaw
            : "hadir"
    ) as anakRepo.PengukuranLapangan["statusKehadiran"];
    const jenis =
        teks(data, "jenis_ukur").toLowerCase() === "berdiri" ? "TB" : "PB";
    if (
        idPengukuran === "" ||
        (nik === null && anakId === null) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(tanggalUkur)
    ) {
        throw new GalatAnak(
            400,
            "ID pengukuran, ID/NIK anak, dan tanggal ukur wajib valid.",
        );
    }
    const bbKg = angka(data, "bb_kg", status === "hadir");
    const tinggiCm = angka(data, "panjang_tinggi_cm", status === "hadir");
    const lilaCm = angka(data, "lila", false);
    const likaCm = angka(data, "lika", false);
    if (
        (bbKg !== null && (bbKg < 1 || bbKg > 40)) ||
        (tinggiCm !== null && (tinggiCm < 30 || tinggiCm > 130))
    ) {
        throw new GalatAnak(
            400,
            "Nilai BB atau PB/TB berada di luar rentang wajar.",
        );
    }

    const id = await dalamTransaksi(
        pool,
        { pengguna: pengguna.id, sumber: "tablet" },
        (db) =>
            anakRepo.upsertPengukuran(db, pengguna, {
                idPengukuran,
                anakId,
                nik,
                tanggalUkur,
                bbKg,
                tinggiCm,
                jenisUkur: jenis,
                lilaCm,
                likaCm,
                ntob: teks(data, "ntob") || null,
                statusKehadiran: status,
            }),
    );
    if (id === null)
        throw new GalatAnak(
            404,
            "Anak tidak ditemukan atau berada di luar RT binaan.",
        );
    await hitungDanSimpan(pool, id, undefined, {
        pengguna: pengguna.id,
        sumber: "tablet",
    });
    return { id, idPengukuran };
}

export function sinkronisasi(pool: Pool, pengguna: PenggunaAktif) {
    return anakRepo.paketSinkronisasi(pool, pengguna);
}
