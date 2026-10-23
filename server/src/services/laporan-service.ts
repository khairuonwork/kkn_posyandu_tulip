import type { Pool } from "pg";
import type { PenggunaAktif } from "../auth/peran.ts";
import * as repo from "../repositories/laporan-repository.ts";
import { muatTabelStandar } from "../repositories/standar-lms-repository.ts";
import { buatBarisLaporan } from "./laporan-perhitungan.ts";
import { dataArsip2T } from '../repositories/riwayat-2t-repository.ts';
import { gabungRiwayat2T, statusArsip2T, titikArsip } from './laporan-riwayat-2t.ts';

export async function laporan(pool: Pool, pengguna: PenggunaAktif, periode: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) {
        throw new RangeError("Periode harus berformat YYYY-MM.");
    }

    const dasar = await repo.dataLaporan(pool, pengguna, periode);
    const arsip = await dataArsip2T(pool, periode, pengguna);
    const tabelWho = await muatTabelStandar(pool, "WHO-2006");
    const semua = buatBarisLaporan(dasar, tabelWho, statusArsip2T(arsip), arsip.map(titikArsip));
    const bulanan = semua.filter((row) => row.periodeId === periode && row.statusKehadiran === "hadir");
    const riwayat = gabungRiwayat2T(semua, arsip, periode);
    const anakTercatat = new Set(riwayat.rows.map(r => r.anakId));
    const belumDapatDinilai = bulanan.filter(r => !anakTercatat.has(r.anakId) && r.nt === null).length;
    const standar = [...new Set(semua.flatMap((row) => Object.keys(row.penilaian)))].sort();

    return {
        periode,
        metodeUmur: "Pengukuran bertanggal menampilkan umur lengkap sebagai tahun, bulan, dan sisa hari. Z-score laporan menggunakan umur kalender dalam hari untuk menginterpolasi acuan bulanan. Baris arsip bulanan mempertahankan umur bulan dan Z-score file sumber; sisa hari yang tidak tercatat tidak diisi.",
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
            ? `${riwayat.anakArsip} anak mengikuti status 2T–6T arsip Bu Sri bulan ini. Kenaikan, KBM, dan N/T dihitung dari BB bulan sebelumnya yang tersedia. Nilai ukur dan Z-score arsip tetap mengikuti sumber; tanggal dan sisa hari yang tidak tercatat dibiarkan kosong.`
            : belumDapatDinilai > 0
                ? `${belumDapatDinilai} anak belum dapat dinilai N/T karena data pembanding bulanan belum lengkap. Tidak adanya riwayat 2T+ belum berarti semua anak naik berat badan.`
                : 'Riwayat 2T+ mengikuti pengukuran bulanan berurutan. Status arsip bulan lalu diteruskan hanya jika bulan ini tetap T.',
    };
}
