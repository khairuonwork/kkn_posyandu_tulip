import type { Pool } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { umurBulanPada } from "../antropometri/penilaian-gizi.ts";
import * as repo from "../repositories/beranda-repository.ts";
import type { BarisUkurBeranda } from "../repositories/beranda-repository.ts";

const BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function label(id: string): string {
    const [tahun, bulan] = id.split("-").map(Number);
    return `${BULAN[bulan - 1]} ${tahun}`;
}

function geserBulan(id: string, offset: number): string {
    const [tahun, bulan] = id.split("-").map(Number);
    const tanggal = new Date(Date.UTC(tahun, bulan - 1 + offset, 1));
    return `${tanggal.getUTCFullYear()}-${String(tanggal.getUTCMonth() + 1).padStart(2, "0")}`;
}

const KATEGORI_PERHATIAN = new Set([
    "Berat badan sangat kurang", "Berat badan kurang", "Sangat pendek",
    "Pendek", "Gizi buruk", "Gizi kurang", "Obesitas",
]);
const PRIORITAS: Record<string, number> = {
    "Berat badan sangat kurang": 0, "Sangat pendek": 0,
    "Gizi buruk": 0, "Obesitas": 0,
    "Berat badan kurang": 1, "Pendek": 1, "Gizi kurang": 1,
};

function hadir(baris: BarisUkurBeranda[]): BarisUkurBeranda[] {
    return baris.filter((p) => p.statusKehadiran === "hadir");
}

export async function periode(pool: Pool, pengguna: PenggunaAktif) {
    const daftar = await repo.daftarPeriode(pool, pengguna);
    const terisi = daftar.findLast((p) => p.adaPengukuran);
    return {
        periode: daftar.map((p) => ({
            id: p.id, label: label(p.id), tanggalKegiatan: p.tanggalKegiatan,
        })),
        periodeTerisi: terisi === undefined ? null : {
            id: terisi.id, label: label(terisi.id),
            tanggalKegiatan: terisi.tanggalKegiatan,
        },
    };
}

export async function beranda(pool: Pool, pengguna: PenggunaAktif, periodeId: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodeId)) {
        throw new RangeError("Periode harus berformat YYYY-MM.");
    }
    const daftar = await repo.daftarPeriode(pool, pengguna);
    if (!daftar.some((p) => p.id === periodeId)) {
        return null;
    }

    const awal = geserBulan(periodeId, -5);
    const enamBulan = Array.from({ length: 6 }, (_, i) => geserBulan(awal, i));
    const [semua, sasaran] = await Promise.all([
        repo.riwayatBeranda(pool, pengguna, awal, periodeId),
        repo.jumlahSasaran(pool, pengguna, awal, periodeId),
    ]);
    const menurutBulan = (id: string) => semua.filter((p) => p.periodeId === id);
    const bulanIni = hadir(menurutBulan(periodeId));
    const kategori = (nama: string) => bulanIni.filter((p) => p.bbTb?.kategori === nama).length;
    const terukur = bulanIni.reduce<string | null>(
        (maks, p) => maks === null || p.tanggalUkur > maks ? p.tanggalUkur : maks,
        null,
    );
    const kategoriDinilai = ["Gizi baik", "Gizi kurang", "Gizi buruk",
        "Berisiko gizi lebih", "Gizi lebih", "Obesitas"];

    const perhatian = bulanIni.flatMap((p) => {
        const penilaian = [
            ["BB/TB", p.bbTb], ["BB/U", p.bbU], ["TB/U", p.tbU],
        ] as const;
        const masalah = penilaian
            .filter(([, nilai]) => nilai !== null && KATEGORI_PERHATIAN.has(nilai.kategori ?? ""))
            .sort((a, b) =>
                (PRIORITAS[a[1]!.kategori ?? ""] ?? 2) -
                    (PRIORITAS[b[1]!.kategori ?? ""] ?? 2) ||
                Math.abs(b[1]!.z) - Math.abs(a[1]!.z),
            )[0];
        if (masalah === undefined) return [];
        const [indeks, nilai] = masalah;
        return [{
            anakId: p.anakId, nama: p.nama,
            umurBulan: umurBulanPada(p.tglLahir, p.tanggalUkur), rt: p.rt,
            kategori: nilai!.kategori!,
            alasan: `${indeks} ${nilai!.z.toFixed(2).replace(".", ",")} SD · ${p.tanggalUkur}`,
            prioritas: PRIORITAS[nilai!.kategori ?? ""] ?? 2,
            berat: Math.abs(nilai!.z),
        }];
    }).sort((a, b) => a.prioritas - b.prioritas || b.berat - a.berat)
      .map(({ prioritas: _prioritas, berat: _berat, ...p }) => p);

    return {
        ringkasan: {
            // Sasaran unggahan mengikat bila tersedia; arsip lama memakai
            // jumlah anak dengan rekam periode itu, tanpa angka demo.
            sasaran: sasaran[periodeId] ?? menurutBulan(periodeId).length,
            ditimbang: bulanIni.length,
            naik: bulanIni.filter((p) => p.ntob?.toUpperCase() === "N").length,
            tanggalUkur: terukur,
        },
        sasaranHistoris: sasaran[periodeId] === undefined,
        statusGizi: {
            giziBaik: kategori("Gizi baik"),
            giziKurang: kategori("Gizi kurang"),
            giziBuruk: kategori("Gizi buruk"),
            berisikoLebih: kategori("Berisiko gizi lebih"),
            giziLebih: kategori("Gizi lebih"),
            obesitas: kategori("Obesitas"),
            belumDinilai: bulanIni.filter((p) => !kategoriDinilai.includes(p.bbTb?.kategori ?? "")).length,
            ditimbang: bulanIni.length,
        },
        cakupanEnamBulan: enamBulan.map((id) => ({
            periodeId: id, label: label(id),
            sasaran: sasaran[id] ?? menurutBulan(id).length,
            ditimbang: hadir(menurutBulan(id)).length,
        })),
        trenGizi: enamBulan.map((id) => {
            const baris = hadir(menurutBulan(id));
            return {
                periodeId: id, label: label(id), ditimbang: baris.length,
                pendek: baris.filter((p) => ["Pendek", "Sangat pendek"].includes(p.tbU?.kategori ?? "")).length,
                giziKurang: baris.filter((p) => ["Gizi kurang", "Gizi buruk"].includes(p.bbTb?.kategori ?? "")).length,
                giziLebih: baris.filter((p) => ["Gizi lebih", "Obesitas"].includes(p.bbTb?.kategori ?? "")).length,
            };
        }),
        perluPerhatian: perhatian,
    };
}
