import type { Pool } from "pg";
import type { PenggunaAktif } from "../auth/peran.ts";
import {
    dataSurveiBulanan,
    type BarisSurveiBulanan,
} from "../repositories/laporan-tumbuh-kembang-repository.ts";
import {
    KELOMPOK_PERKEMBANGAN,
    keteranganKemampuan,
} from "./keterangan-kemampuan.ts";

export type SurveiLaporan = {
    surveiId: number;
    tanggal: string;
    umurBulan: number;
    kelompokId: string;
    kelompokLabel: string;
    kemampuan: {
        pertanyaanId: string;
        pertanyaan: string;
        keterangan: string;
    }[];
};
export type BalitaLaporan = {
    anakId: number;
    nama: string;
    survei: SurveiLaporan[];
};

export function susunLaporanTumbuhKembang(
    periode: string,
    rows: BarisSurveiBulanan[],
) {
    const anak = new Map<number, BalitaLaporan>();
    for (const row of rows) {
        if (
            !row.tanggal.startsWith(`${periode}-`) ||
            !KELOMPOK_PERKEMBANGAN.includes(row.kelompokId)
        )
            continue;
        const kemampuan = row.pertanyaan
            .filter((q) => row.jawaban[q.id] === "tidak")
            .map((q) => ({
                pertanyaanId: q.id,
                pertanyaan: q.teks,
                keterangan: keteranganKemampuan(q.teks),
            }));
        if (!kemampuan.length) continue;
        if (!anak.has(row.anakId))
            anak.set(row.anakId, {
                anakId: row.anakId,
                nama: row.nama,
                survei: [],
            });
        anak.get(row.anakId)!.survei.push({
            surveiId: row.surveiId,
            tanggal: row.tanggal,
            umurBulan: row.umurBulan,
            kelompokId: row.kelompokId,
            kelompokLabel: row.kelompokLabel,
            kemampuan,
        });
    }
    const balita = [...anak.values()].sort(
        (a, b) => a.nama.localeCompare(b.nama, "id") || a.anakId - b.anakId,
    );
    for (const a of balita)
        a.survei.sort(
            (x, y) =>
                y.tanggal.localeCompare(x.tanggal) || y.surveiId - x.surveiId,
        );
    return { periode, balita };
}

export async function laporanTumbuhKembang(
    pool: Pool,
    pengguna: PenggunaAktif,
    periode: string,
) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode))
        throw new RangeError("Periode harus berformat YYYY-MM.");
    return susunLaporanTumbuhKembang(
        periode,
        await dataSurveiBulanan(pool, pengguna, periode, KELOMPOK_PERKEMBANGAN),
    );
}
