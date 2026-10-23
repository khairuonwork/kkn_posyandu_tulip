import pmkTable from "../antropometri/data/permenkes-2-2020.json" with { type: "json" };
import { kategoriDari } from "../antropometri/kategori.ts";
import { SIFAT } from "../antropometri/indeks.ts";
import type { Indeks } from "../antropometri/indeks.ts";
import { interpolasiLms, type Lms, type TabelStandar } from "../antropometri/tabel-standar.ts";
import { hitungZ } from "../antropometri/z-score.ts";
import type { BarisLaporan } from "../repositories/laporan-repository.ts";
import { hitungPertumbuhan, kunciTitik, type TitikPertumbuhan } from './laporan-pertumbuhan-bulanan.ts';

const INDEKS = ["BB_U", "TB_U", "BB_TB", "IMT_U", "LILA_U", "LIKA_U"] as const;
type TitikPmk = (number | null)[];
type Penilaian = Record<string, { z: number; kategori: string | null }>;
const pmk = pmkTable as Record<string, Record<"L" | "P", TitikPmk[]>>;

export type BarisBertanda = BarisLaporan & {
    umurLengkap: string;
    nt: "N" | "T" | null;
    kenaikanGram: number | null;
    kbmGram: number | null;
    duaT: boolean;
    jumlahTBerturut: number;
};

function tambahBulan(tanggal: string, jumlahBulan: number): string {
    const [tahun, bulan, hari] = tanggal.split("-").map(Number);
    const nomorBulan = bulan - 1 + jumlahBulan;
    const tahunTujuan = tahun + Math.floor(nomorBulan / 12);
    const bulanTujuan = ((nomorBulan % 12) + 12) % 12;
    const hariTujuan = Math.min(hari, new Date(Date.UTC(tahunTujuan, bulanTujuan + 1, 0)).getUTCDate());
    return `${tahunTujuan}-${String(bulanTujuan + 1).padStart(2, "0")}-${String(hariTujuan).padStart(2, "0")}`;
}

export function umurBulan(tglLahir: string, tanggalUkur: string): number {
    const [tl, bl, hl] = tglLahir.split("-").map(Number);
    const [tu, bu, hu] = tanggalUkur.split("-").map(Number);
    return (tu - tl) * 12 + bu - bl - (hu < hl ? 1 : 0);
}

/** Umur fraksional dari kalender; dipakai untuk interpolasi Z-score saja. */
function umurDesimalBulan(tglLahir: string, tanggalUkur: string): number {
    const penuh = umurBulan(tglLahir, tanggalUkur);
    if (penuh < 0) return penuh;
    const awal = Date.parse(`${tambahBulan(tglLahir, penuh)}T00:00:00Z`);
    const berikut = Date.parse(`${tambahBulan(tglLahir, penuh + 1)}T00:00:00Z`);
    const ukur = Date.parse(`${tanggalUkur}T00:00:00Z`);
    return penuh + Math.max(0, Math.min(1, (ukur - awal) / (berikut - awal)));
}

function tabelWhoInterpolasiHari(tabel: TabelStandar): TabelStandar {
    return {
        cari(indeks: Indeks, jk: "L" | "P", kunci: number): Lms | null {
            if (!SIFAT[indeks].kunciAdalahUmur || Number.isInteger(kunci)) return tabel.cari(indeks, jk, kunci);
            const bawah = Math.floor(kunci);
            const atas = Math.ceil(kunci);
            const a = tabel.cari(indeks, jk, bawah);
            const b = tabel.cari(indeks, jk, atas);
            return a === null || b === null ? null : interpolasiLms(a, b, kunci - bawah);
        },
    } as TabelStandar;
}

function interpolasi(value: number, batas: number[], z: number[]): number | null {
    if (batas.length !== z.length || batas.length < 2 || value <= 0) return null;
    let i = batas.findIndex((point) => point >= value);
    if (i === -1) i = batas.length - 1;
    if (i === 0) i = 1;
    const x0 = batas[i - 1], x1 = batas[i], y0 = z[i - 1], y1 = z[i];
    if (x0 == null || x1 == null || y0 == null || y1 == null || x0 === x1) return null;
    return Number((y0 + (value - x0) * (y1 - y0) / (x1 - x0)).toFixed(3));
}

function titikPmkPadaUmur(source: TitikPmk[], umur: number): TitikPmk | undefined {
    const baris = source.filter((point) => typeof point[0] === "number");
    const bawah = baris.filter((point) => (point[0] as number) <= umur).at(-1);
    const atas = baris.find((point) => (point[0] as number) >= umur);
    if (bawah === undefined || atas === undefined) return undefined;
    const rentang = (atas[0] as number) - (bawah[0] as number);
    if (rentang === 0) return bawah;
    const bobot = (umur - (bawah[0] as number)) / rentang;
    return [umur, ...bawah.slice(1).map((value, index) => {
        const next = atas[index + 1];
        return typeof value === "number" && typeof next === "number" ? value + (next - value) * bobot : null;
    })];
}

function penilaianPmk(row: BarisLaporan): Penilaian {
    const umur = umurDesimalBulan(row.tglLahir, row.tanggalUkur);
    if (umur < 0 || umur > 60) return {};
    const tinggi = row.tinggiCm == null ? null : row.tinggiCm +
        (umur < 24 && row.jenisUkur === "TB" ? 0.7 : umur >= 24 && row.jenisUkur === "PB" ? -0.7 : 0);
    const nilai: Partial<Record<(typeof INDEKS)[number], number | null>> = {
        BB_U: row.bbKg, TB_U: tinggi, BB_TB: row.bbKg,
        IMT_U: tinggi == null || row.bbKg == null ? null : row.bbKg / (tinggi / 100) ** 2,
        LILA_U: umur < 6 ? null : row.lilaCm, LIKA_U: row.likaCm,
    };
    const hasil: Penilaian = {};
    for (const indeks of INDEKS) {
        const value = nilai[indeks];
        const kunci = indeks === "BB_TB" ? tinggi : umur;
        if (value == null || kunci == null) continue;
        const source = pmk[indeks][row.jk];
        const titik = indeks === "BB_TB"
            ? source.filter((candidate) => candidate[0] != null && candidate[0] <= kunci).at(-1)
            : titikPmkPadaUmur(source, kunci);
        if (!titik) continue;
        const granica = titik.slice(1).filter((x): x is number => typeof x === "number");
        const z = interpolasi(value, granica, granica.length === 3 ? [-1, 0, 1] : [-3, -2, -1, 0, 1, 2, 3]);
        if (z != null) hasil[indeks] = { z, kategori: kategoriDari(indeks, z) };
    }
    return hasil;
}

function penilaianWho(row: BarisLaporan, tabel: TabelStandar): Penilaian {
    const umur = umurDesimalBulan(row.tglLahir, row.tanggalUkur);
    if (umur < 0 || umur > 60) return {};
    const tinggi = row.tinggiCm == null ? null : row.tinggiCm +
        (umur < 24 && row.jenisUkur === "TB" ? 0.7 : umur >= 24 && row.jenisUkur === "PB" ? -0.7 : 0);
    const nilai: Partial<Record<Indeks, number | null>> = {
        BB_U: row.bbKg, TB_U: tinggi, BB_TB: row.bbKg,
        IMT_U: tinggi == null || row.bbKg == null ? null : row.bbKg / (tinggi / 100) ** 2,
        LILA_U: umur < 6 ? null : row.lilaCm, LIKA_U: row.likaCm,
    };
    const hasil: Penilaian = {};
    for (const indeks of INDEKS) {
        const kunci = SIFAT[indeks].kunciAdalahUmur ? umur : tinggi;
        const value = nilai[indeks];
        if (kunci == null || value == null || umur < SIFAT[indeks].umurMinimum) continue;
        const z = hitungZ(tabel, indeks, row.jk, kunci, value);
        if (z != null) hasil[indeks] = { z, kategori: kategoriDari(indeks, z) };
    }
    return hasil;
}

function nilaiZ(row: BarisLaporan, standard: string, index: string): number | null {
    const value = row.penilaian[standard]?.[index]?.z;
    return typeof value === "number" ? value : value == null ? null : Number(value);
}

function umurLengkap(tglLahir: string, tanggalUkur: string): string {
    let bulan = Math.max(0, umurBulan(tglLahir, tanggalUkur));
    // Tanggal ulang bulan bisa maju ke akhir bulan (mis. 31 Jan -> 28 Feb).
    // Umur tampilan mengikuti tonggak kalender tersebut; penilaian Z-score
    // tetap memakai tanggal lahir dan tanggal ukur pada fungsi di atas.
    while (tambahBulan(tglLahir, bulan + 1) <= tanggalUkur) bulan++;
    const [y, m, d] = tambahBulan(tglLahir, bulan).split("-").map(Number);
    const [uy, um, ud] = tanggalUkur.split("-").map(Number);
    const hari = Math.max(0, Math.round((Date.UTC(uy, um - 1, ud) - Date.UTC(y, m - 1, d)) / 86_400_000));
    return `${Math.floor(bulan / 12)}Thn${bulan % 12}Bln${hari}Hari`;
}

export function titikPengukuran(row: BarisLaporan): TitikPertumbuhan {
    return { anakId: row.anakId, periodeId: row.periodeId, umurBulan: umurBulan(row.tglLahir, row.tanggalUkur),
        bbKg: row.bbKg, zBbU: nilaiZ(row, 'WHO-2006', 'BB_U'), hadir: row.statusKehadiran === 'hadir' };
}

function tandai(rows: BarisLaporan[], statusArsip: ReadonlyMap<string, number>, pembandingArsip: TitikPertumbuhan[]): BarisBertanda[] {
    const pengukuran = new Map(rows.map(row => [kunciTitik(row), row]));
    const titik = new Map(pembandingArsip.map(row => [kunciTitik(row), row]));
    // Actual measurements take precedence over archived comparators at the
    // same child/month. No dates are created for month-only observations.
    for (const row of rows) titik.set(kunciTitik(row), titikPengukuran(row));
    const perAnak = new Map<number, TitikPertumbuhan[]>();
    for (const row of titik.values()) perAnak.set(row.anakId, [...(perAnak.get(row.anakId) ?? []), row]);
    const hasil = new Map<string, BarisBertanda>();
    for (const list of perAnak.values()) {
        let berturutT = 0;
        let sebelumnya: TitikPertumbuhan | undefined;
        for (const point of list.sort((a,b) => a.periodeId.localeCompare(b.periodeId))) {
            const perubahan = hitungPertumbuhan(point, sebelumnya);
            berturutT = perubahan.nt === 'T' ? berturutT + 1 : 0;
            const statusTercatat = statusArsip.get(kunciTitik(point));
            if (statusTercatat !== undefined && point.hadir) berturutT = statusTercatat;
            const row = pengukuran.get(kunciTitik(point));
            if (row) hasil.set(kunciTitik(row), {
                ...row, umurLengkap: umurLengkap(row.tglLahir, row.tanggalUkur), ...perubahan,
                duaT: berturutT >= 2, jumlahTBerturut: berturutT,
            });
            sebelumnya = point;
        }
    }
    return rows.map(row => hasil.get(kunciTitik(row))!);
}

/** Domain report calculation only: no database calls and no workbook formatting. */
export function buatBarisLaporan(rows: BarisLaporan[], tabelWho: TabelStandar, statusArsip: ReadonlyMap<string, number> = new Map(), pembandingArsip: TitikPertumbuhan[] = []): BarisBertanda[] {
    const tabel = tabelWhoInterpolasiHari(tabelWho);
    const dinilai = rows.map((row) => ({
        ...row,
        penilaian: {
            ...row.penilaian,
            "WHO-2006": penilaianWho(row, tabel),
            "PERMENKES-2-2020": penilaianPmk(row),
        },
    }));
    return tandai(dinilai, statusArsip, pembandingArsip);
}
