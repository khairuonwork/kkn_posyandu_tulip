import type { Pool } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { umurBulanPada } from "../antropometri/penilaian-gizi.ts";
import * as repo from "../repositories/beranda-repository.ts";
import { boleh } from '../auth/peran.ts';
import { jumlahHariH } from './cakupan-hari-h.ts';
import { umurBulan, type BarisBertanda } from './laporan-perhitungan.ts';
import { barisLaporan } from './laporan-service.ts';
import { kodeNtb } from './laporan-tampilan.ts';

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

export function sebaranLaporan(rows: BarisBertanda[], indeks: 'BB_U' | 'TB_U') {
    const daftar = indeks === 'BB_U'
        ? [['BB Sangat Kurang', 'Berat badan sangat kurang'], ['BB Kurang', 'Berat badan kurang'],
            ['BB Normal', 'Berat badan normal'], ['BB Lebih', 'Risiko berat badan lebih']]
        : [['Sangat pendek', 'Sangat pendek'], ['Pendek', 'Pendek'], ['Normal', 'Normal'], ['Tinggi', 'Tinggi']];
    const hitung = (standar: string, kategori: string) => rows.filter(row =>
        row.penilaian[standar]?.[indeks]?.kategori === kategori).length;
    const hasil = daftar.map(([label, kategori]) => ({
        label, permenkes: hitung('PERMENKES-2-2020', kategori), who: hitung('WHO-2006', kategori),
    }));
    return [...hasil, { label: 'Belum dinilai',
        permenkes: rows.length - hasil.reduce((sum, row) => sum + row.permenkes, 0),
        who: rows.length - hasil.reduce((sum, row) => sum + row.who, 0) }];
}

export async function periode(pool: Pool, pengguna: PenggunaAktif, latihan = false) {
    const daftar = await repo.daftarPeriode(pool, pengguna);
    const terisi = daftar.findLast((p) => p.adaPengukuran);
    return {
        periode: daftar.map((p) => ({
            id: p.id, label: label(p.id), tanggalKegiatan: p.tanggalKegiatan,
        })),
        ...(latihan ? { periodeLatihan: daftar.at(-1)?.id ?? null } : {}),
        periodeTerisi: terisi === undefined ? null : {
            id: terisi.id, label: label(terisi.id),
            tanggalKegiatan: terisi.tanggalKegiatan,
        },
    };
}

type NilaiGizi = { z: number; kategori: string | null; tidakWajar?: boolean };
const INDEKS_CEK = [["BB/TB", "BB_TB"], ["BB/U", "BB_U"], ["TB/U", "TB_U"]] as const;

function who(p: BarisBertanda, indeks: string): NilaiGizi | undefined {
    return p.penilaian["WHO-2006"]?.[indeks] as NilaiGizi | undefined;
}

/**
 * Aturan F1: anak di daftar sasaran (bukan batal/pindah), berat terisi, umur
 * 0–59 bulan. Bulan tanpa daftar sasaran (arsip lama) tidak menuntut daftar.
 */
export function alasanDiLuarHitungan(p: BarisBertanda, adaDaftarSasaran: boolean): string | null {
    if (adaDaftarSasaran && (!p.statusSasaran || ["batal", "pindah"].includes(p.statusSasaran))) {
        return "Tidak ada di daftar sasaran";
    }
    if (p.bbKg === null) return "Berat badan kosong";
    if (umurBulan(p.tglLahir, p.tanggalUkur) > 59) return "Umur 5 tahun ke atas";
    return null;
}

export async function beranda(pool: Pool, pengguna: PenggunaAktif, periodeId: string, rt: string | null = null) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodeId)) {
        throw new RangeError("Periode harus berformat YYYY-MM.");
    }
    const daftar = await repo.daftarPeriode(pool, pengguna);
    if (!daftar.some((p) => p.id === periodeId)) {
        return null;
    }

    const awal = geserBulan(periodeId, -5);
    const enamBulan = Array.from({ length: 6 }, (_, i) => geserBulan(awal, i));
    // Satu mesin hitung dengan Laporan, Excel, dan F1: tidak membaca nilai tersimpan.
    const [{ semua }, sasaran, wilayahRt, hariH] = await Promise.all([
        barisLaporan(pool, pengguna, periodeId),
        repo.jumlahSasaran(pool, pengguna, awal, periodeId, rt),
        repo.daftarRt(pool, pengguna),
        repo.dataHariH(pool, pengguna, awal, periodeId),
    ]);
    const menurutBulan = (id: string) => semua.filter((p) => p.periodeId === id && (rt === null || p.rt === rt));
    const hadirBulan = (id: string) => menurutBulan(id).filter((p) => p.statusKehadiran === "hadir");
    const alasan = (p: BarisBertanda) => alasanDiLuarHitungan(p, sasaran[p.periodeId] !== undefined);
    const dihitung = (id: string) => hadirBulan(id).filter((p) => alasan(p) === null);
    const bulanIni = dihitung(periodeId);
    const statusBerat = bulanIni.map(kodeNtb);
    const kategori = (nama: string) => bulanIni.filter((p) => who(p, "BB_TB")?.kategori === nama).length;
    const terukur = hadirBulan(periodeId).reduce<string | null>(
        (maks, p) => maks === null || p.tanggalUkur > maks ? p.tanggalUkur : maks,
        null,
    );
    const kategoriDinilai = ["Gizi baik", "Gizi kurang", "Gizi buruk",
        "Berisiko gizi lebih", "Gizi lebih", "Obesitas"];

    const perhatian = bulanIni.flatMap((p) => {
        const masalah = INDEKS_CEK
            .map(([label, indeks]) => [label, who(p, indeks)] as const)
            .filter(([, nilai]) => nilai !== undefined && KATEGORI_PERHATIAN.has(nilai.kategori ?? ""))
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
        wilayahRt,
        kehadiranHariH: hariH.filter(r => r.periodeId === periodeId),
        bolehUbahHariH: boleh(pengguna.peran,'ubah-pengukuran'),
        statusBbU: sebaranLaporan(bulanIni, 'BB_U'),
        statusTbU: sebaranLaporan(bulanIni, 'TB_U'),
        ringkasan: {
            // Sasaran unggahan mengikat bila tersedia; arsip lama memakai
            // jumlah anak dengan rekam periode itu, tanpa angka demo.
            sasaran: sasaran[periodeId] ?? menurutBulan(periodeId).length,
            ditimbang: bulanIni.length,
            naik: statusBerat.filter((kode) => kode === "N").length,
            tidakNaik: statusBerat.filter((kode) => kode === "T").length,
            tanggalUkur: terukur,
        },
        sasaranHistoris: sasaran[periodeId] === undefined,
        /** Ditimbang tetapi tidak ikut hitungan resmi (aturan F1). */
        diLuarHitungan: hadirBulan(periodeId).flatMap((p) => {
            const sebab = alasan(p);
            return sebab === null ? [] : [{ anakId: p.anakId, nama: p.nama, rt: p.rt, alasan: sebab }];
        }),
        /** Hasil ukur di luar batas wajar: tetap dihitung, perlu dicek ulang. */
        perluDicek: bulanIni.flatMap((p) => {
            const indeks = INDEKS_CEK.filter(([, i]) => who(p, i)?.tidakWajar).map(([label]) => label);
            return indeks.length === 0 ? [] : [{ anakId: p.anakId, nama: p.nama, rt: p.rt, indeks }];
        }),
        statusGizi: {
            giziBaik: kategori("Gizi baik"),
            giziKurang: kategori("Gizi kurang"),
            giziBuruk: kategori("Gizi buruk"),
            berisikoLebih: kategori("Berisiko gizi lebih"),
            giziLebih: kategori("Gizi lebih"),
            obesitas: kategori("Obesitas"),
            belumDinilai: bulanIni.filter((p) => !kategoriDinilai.includes(who(p, "BB_TB")?.kategori ?? "")).length,
            ditimbang: bulanIni.length,
        },
        cakupanEnamBulan: enamBulan.map((id) => ({
            periodeId: id, label: label(id),
            hadirHariH: jumlahHariH(hariH.filter(r => r.periodeId === id),rt),
            sasaran: sasaran[id] ?? menurutBulan(id).length,
            ditimbang: dihitung(id).length,
        })),
        trenGizi: enamBulan.map((id) => {
            const baris = dihitung(id);
            const ada = (indeks: string, ks: string[]) => baris.filter((p) => ks.includes(who(p, indeks)?.kategori ?? "")).length;
            return {
                periodeId: id, label: label(id), ditimbang: baris.length,
                bbKurang: ada("BB_U", ["Berat badan kurang", "Berat badan sangat kurang"]),
                pendek: ada("TB_U", ["Pendek", "Sangat pendek"]),
                giziKurang: ada("BB_TB", ["Gizi kurang", "Gizi buruk"]),
                giziLebih: ada("BB_TB", ["Gizi lebih", "Obesitas"]),
            };
        }),
        perluPerhatian: perhatian,
    };
}
