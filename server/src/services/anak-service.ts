/** Layanan baca anak: satu pintu aturan sumber daya REST Portal. */

import type { Pool } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { dalamTransaksi } from "../db/transaksi.ts";
import * as anakRepo from "../repositories/anak-repository.ts";
import { hitungDanSimpanDalamTransaksi } from "./gizi-service.ts";
import { muatTabelStandar } from '../repositories/standar-lms-repository.ts';

export class GalatAnak extends Error {
    readonly status: 400 | 404 | 409;

    constructor(status: 400 | 404 | 409, pesan: string) {
        super(pesan);
        this.status = status;
    }
}

export async function ubahProfil(
    pool: Pool,
    pengguna: PenggunaAktif,
    anakId: number,
    badan: unknown,
) {
    if (typeof badan !== "object" || badan === null)
        throw new GalatAnak(400, "Data profil anak tidak valid.");
    const data = badan as Record<string, unknown>;
    const nama = teks(data, "nama").replace(/\s+/g, " ");
    const nikMentah = teks(data, "nik").replace(/\D/g, "");
    const tglLahir = teks(data, "tglLahir");
    const jk = teks(data, "jk").toUpperCase();
    const namaOrtu = teks(data, "namaOrtu").replace(/\s+/g, " ");
    const rt = teks(data, "rt").replace(/\D/g, "");
    const noWaMentah = teks(data, "noWa");
    const noWa = noWaMentah === "" ? null : noWaMentah;
    const anakKeRaw = data.anakKe;
    const anakKe =
        anakKeRaw === null || anakKeRaw === "" || anakKeRaw === undefined
            ? null
            : Number(anakKeRaw);
    const bbRaw = data.bbLahirKg;
    const bbLahirKg =
        bbRaw === null || bbRaw === "" || bbRaw === undefined
            ? null
            : Number(String(bbRaw).replace(",", "."));
    const bukuKia = data.bukuKia;
    if (data.desil !== undefined && data.desil !== null && (typeof data.desil !== 'number' || !Number.isInteger(data.desil) || data.desil < 1 || data.desil > 10))
        throw new GalatAnak(400, 'Kelompok Desil harus bilangan 1 sampai 10.');
    if (data.desil !== undefined && (typeof data.periodeId !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.periodeId)))
        throw new GalatAnak(400, 'Pilih periode berlaku untuk Kelompok Desil.');
    if (data.kbIbu !== undefined && data.kbIbu !== null && typeof data.kbIbu !== 'boolean')
        throw new GalatAnak(400, 'Data KB Ibu harus Iya atau Tidak.');
    if (data.kbIbu != null && namaOrtu === '')
        throw new GalatAnak(400, 'Isi nama ibu untuk menyimpan Data KB Ibu.');
    const tanggal = new Date(`${tglLahir}T00:00:00Z`);
    if (
        nama === "" ||
        nama.length > 160 ||
        (nikMentah !== "" && !/^\d{16}$/.test(nikMentah)) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(tglLahir) ||
        Number.isNaN(tanggal.getTime()) ||
        tanggal.toISOString().slice(0, 10) !== tglLahir ||
        !["L", "P"].includes(jk) ||
        !/^\d{1,3}$/.test(rt) ||
        (anakKe !== null &&
            (!Number.isInteger(anakKe) || anakKe < 1 || anakKe > 30)) ||
        (bbLahirKg !== null &&
            (!Number.isFinite(bbLahirKg) ||
                bbLahirKg < 0.5 ||
                bbLahirKg > 6)) ||
        typeof bukuKia !== "boolean" ||
        (noWa !== null && noWa.length > 32)
    ) {
        throw new GalatAnak(
            400,
            "Periksa kembali nama, NIK 16 digit, tanggal lahir, RT, dan data profil lainnya.",
        );
    }

    try {
        const hasil = await dalamTransaksi(
            pool,
            { pengguna: pengguna.id, sumber: "web" },
            (db) =>
                anakRepo.ubahProfilAnak(db, pengguna, anakId, {
                    nama,
                    nik: nikMentah || null,
                    namaOrtu,
                    noWa,
                    rt,
                    jk: jk as "L" | "P",
                    tglLahir,
                    anakKe,
                    bbLahirKg,
                    bukuKia,
                    kbIbu: data.kbIbu as boolean | null | undefined,
                    desil: data.desil as number | null | undefined,
                    periodeId: data.periodeId as string | undefined,
                }),
        );
        if (hasil === "tidak_ada")
            throw new GalatAnak(404, "Anak tidak ditemukan.");
        if (hasil === "rt_tidak_ada")
            throw new GalatAnak(
                400,
                "RT tujuan tidak tersedia di Posyandu ini.",
            );
        if (hasil === "nik_dipakai")
            throw new GalatAnak(
                409,
                "NIK tersebut sudah digunakan profil anak lain.",
            );
        return { anakId, status: "tersimpan" as const };
    } catch (galat) {
        if (galat instanceof GalatAnak) throw galat;
        if (
            typeof galat === "object" &&
            galat !== null &&
            "code" in galat &&
            galat.code === "23505"
        )
            throw new GalatAnak(
                409,
                "NIK tersebut sudah digunakan profil anak lain.",
            );
        throw galat;
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
    if (query.periode !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(query.periode))
        throw new GalatAnak(400, 'Periode harus berformat YYYY-MM.');
    const hasil = await anakRepo.daftar(pool, pengguna, cari, {
        halaman,
        ukuran,
    }, query.periode);

    return { ...hasil, halaman, ukuran };
}

export async function ambil(pool: Pool, pengguna: PenggunaAktif, id: number, periode?: string) {
    if (periode !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) throw new GalatAnak(400, 'Periode harus berformat YYYY-MM.');
    const anak = await anakRepo.ambil(pool, pengguna, id, periode);
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
            anakRepo.upsertAnak(db, pengguna, {
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

    const tabel = await muatTabelStandar(pool);
    const hasil = await dalamTransaksi(
        pool,
        { pengguna: pengguna.id, sumber: "tablet" },
        async (db) => {
            const hasil = await anakRepo.upsertPengukuran(db, pengguna, {
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
            });
            if (hasil?.berubah) await hitungDanSimpanDalamTransaksi(db, hasil.id, tabel);
            return hasil;
        },
    ).catch((galat: unknown) => {
        if (galat instanceof RangeError || (galat as { constraint?: string })?.constraint === 'pengukuran_id_sumber_key') {
            throw new GalatAnak(400, 'ID pengukuran sudah digunakan untuk anak atau periode lain.');
        }
        throw galat;
    });
    if (hasil === null)
        throw new GalatAnak(
            404,
            "Anak tidak ditemukan atau berada di luar RT binaan.",
        );
    return { id: hasil.id, idPengukuran, susulan: hasil.susulan };
}

const pembacaanSinkronisasi = new WeakMap<Pool, Map<string, ReturnType<typeof anakRepo.paketSinkronisasi>>>();

export function sinkronisasi(pool: Pool, pengguna: PenggunaAktif) {
    let berlangsung = pembacaanSinkronisasi.get(pool);
    if (berlangsung === undefined) {
        berlangsung = new Map();
        pembacaanSinkronisasi.set(pool, berlangsung);
    }
    const cakupan = JSON.stringify([pengguna.superAdmin ?? false, [...(pengguna.posyanduIds ?? [])].sort((a, b) => a - b)]);
    const ada = berlangsung.get(cakupan);
    if (ada) return ada;
    // Hanya gabungkan pembacaan yang masih berjalan; hasil tidak disimpan setelah selesai.
    const hasil = anakRepo.paketSinkronisasi(pool, pengguna);
    berlangsung.set(cakupan, hasil);
    void hasil.then(() => berlangsung.delete(cakupan), () => berlangsung.delete(cakupan));
    return hasil;
}
