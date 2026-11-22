import type { Pool } from "pg";
import type { PenggunaAktif } from "../auth/peran.ts";
import * as repo from "../repositories/laporan-repository.ts";
import { muatTabelStandar } from "../repositories/standar-lms-repository.ts";
import { buatBarisLaporan, type BarisBertanda } from "./laporan-perhitungan.ts";
import { dataArsip2T, type BarisArsip2T } from '../repositories/riwayat-2t-repository.ts';
import { gabungRiwayat2T, statusArsip2T, titikArsip } from './laporan-riwayat-2t.ts';

/**
 * Laporan hanya membaca JENDELA_BULAN sebelum periode, bukan seluruh riwayat.
 * Yang dipakai keluaran hanyalah bulan ini sampai 5 bulan lalu (grafik Beranda)
 * dan rangkaian T yang berakhir bulan ini. N/T membutuhkan bulan sebelumnya,
 * LILA/LIKA diteruskan paling lama 2 bulan, jadi hasilnya sama selama tidak
 * ada rangkaian T yang menyentuh awal jendela. Bila ada, `perluRiwayatPenuh`
 * meminta pembacaan ulang seluruh riwayat.
 */
export const JENDELA_BULAN = 12;
const BULAN_DIPAKAI = 5;

const nomorBulan = (id: string) => Number(id.slice(0, 4)) * 12 + Number(id.slice(5, 7)) - 1;
const dariNomor = (n: number) => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`;

/** Hasil jendela bisa terpotong: rangkaian T yang dipakai mulai di dua bulan pertama jendela. */
export function perluRiwayatPenuh(
    semua: Pick<BarisBertanda, 'periodeId' | 'jumlahTBerturut'>[],
    arsip: Pick<BarisArsip2T, 'periodeLaporan' | 'jumlahT'>[],
    periode: string,
    sejak: string,
): boolean {
    const awal = nomorBulan(sejak);
    const dipakaiSejak = nomorBulan(periode) - BULAN_DIPAKAI;
    return semua.some((r) => nomorBulan(r.periodeId) >= dipakaiSejak
            && (r.jumlahTBerturut ?? 0) >= nomorBulan(r.periodeId) - awal)
        || arsip.some((a) => a.periodeLaporan === periode && a.jumlahT >= nomorBulan(periode) - awal);
}

/** Baris terhitung untuk periode ini; satu mesin untuk Laporan, Excel, F1, dan Beranda. */
export async function barisLaporan(pool: Pool, pengguna: PenggunaAktif, periode: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) {
        throw new RangeError("Periode harus berformat YYYY-MM.");
    }

    const sejak = dariNomor(nomorBulan(periode) - JENDELA_BULAN);
    const dasar = await repo.dataLaporan(pool, pengguna, periode, sejak);
    const arsip = await dataArsip2T(pool, periode, pengguna);
    const tabelWho = await muatTabelStandar(pool, "WHO-2006");
    const hitung = (rows: typeof dasar) => buatBarisLaporan(rows, tabelWho, statusArsip2T(arsip), arsip.map(titikArsip));
    const semua = hitung(dasar);

    if (perluRiwayatPenuh(semua, arsip, periode, sejak)) {
        return { semua: hitung(await repo.dataLaporan(pool, pengguna, periode)), arsip };
    }

    return { semua, arsip };
}

export async function laporan(pool: Pool, pengguna: PenggunaAktif, periode: string) {
    const { semua, arsip } = await barisLaporan(pool, pengguna, periode);
    const bulanan = semua.filter((row) => row.periodeId === periode && row.statusKehadiran === "hadir");
    const riwayat = gabungRiwayat2T(semua, arsip, periode);
    riwayat.rows = riwayat.rows.map(row => ({ ...row, umurLengkap: row.umurLengkap.match(/^\d+Thn\d+Bln/)?.[0] ?? row.umurLengkap }));
    const anakTercatat = new Set(riwayat.rows.map(r => r.anakId));
    const belumDapatDinilai = bulanan.filter(r => !anakTercatat.has(r.anakId) && r.nt === null).length;
    const standar = [...new Set(semua.flatMap((row) => Object.keys(row.penilaian)))].sort();

    return {
        periode,
        metodeUmur: "Pengukuran bertanggal menampilkan umur lengkap sebagai tahun, bulan, dan sisa hari. Z-score laporan menggunakan umur kalender dalam hari untuk menginterpolasi acuan bulanan. Arsip memakai umur hingga hari bila ada pengukuran bulan yang sama dengan nilai ukur yang cocok; selain itu ditandai hari tidak tercatat. Skor arsip dipertahankan.",
        standar,
        ringkasan: {
            anakDiukur: bulanan.length,
            denganDuaT: anakTercatat.size,
            duaTDariArsip: riwayat.anakArsip,
            duaTDariHitung: riwayat.anakHitung,
            belumDapatDinilai,
            tanpaSkor: bulanan.filter((row) => standar.length === 0 || !standar.some((s) => Object.keys(row.penilaian[s] ?? {}).length)).length,
        },
        bulanan,
        riwayat2T: riwayat.rows,
        keterangan2T: riwayat.anakArsip > 0
            ? `${riwayat.anakArsip} anak mengikuti status 2T–6T arsip Bu Sri bulan ini. Bila BB pembanding tersedia, N/T dihitung dari kenaikan/KBM. Bila pembanding awal hilang, T mengikuti status arsip dengan catatan sumber tanpa mengisi kenaikan/KBM fiktif. Umur hingga hari memakai pengukuran yang cocok bila tersedia; arsip lainnya ditandai hari tidak tercatat.`
            : belumDapatDinilai > 0
                ? `${belumDapatDinilai} anak belum dapat dinilai N/T karena data pembanding bulanan belum lengkap. Tidak adanya riwayat 2T+ belum berarti semua anak naik berat badan.`
                : 'Riwayat 2T+ mengikuti pengukuran bulanan berurutan. Status arsip bulan lalu diteruskan hanya jika bulan ini tetap T.',
    };
}
