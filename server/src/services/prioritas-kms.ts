/**
 * Prioritas antrean pemeriksaan KMS.
 *
 * Aturan T/2T sama dengan laporan Posyandu (hitungPertumbuhan + arsip 2T):
 * anak dengan T berturut-turut terbanyak dipanggil lebih dahulu, lalu status
 * gizi yang berat, gizi lain yang perlu tindak lanjut, dan 1T bulan ini.
 * Anak tanpa tanda khusus mengikuti urutan datang.
 */
import type { Pool, PoolClient } from "pg";

import { PERLU_TINDAK_LANJUT } from "../antropometri/kategori.ts";
import { hitungPertumbuhan, kunciTitik, type TitikPertumbuhan } from "./laporan-pertumbuhan-bulanan.ts";
import { umurBulan } from "./laporan-perhitungan.ts";

export type PrioritasKms = {
    skor: number;
    jumlahT: number;
    alasan: string[];
};

const KATEGORI_BERAT = new Set(["Berat badan sangat kurang", "Sangat pendek", "Gizi buruk"]);

export type RiwayatUkur = {
    anakId: number;
    periodeId: string;
    tglLahir: string;
    tanggalUkur: string;
    bbKg: number | null;
    zBbU: number | null;
    hadir: boolean;
    kategori: string[];
};

export type ArsipT = { anakId: number; periodeLaporan: string; periodeRiwayat: string; jumlahT: number; umurBulan: number; bbKg: number | null; zBbU: number | null };

/** Perhitungan murni; dipakai oleh daftar antrean dan pemilihan panggilan berikutnya. */
export function hitungPrioritas(periode: string, riwayat: RiwayatUkur[], arsip: ArsipT[] = []): Map<number, PrioritasKms> {
    const statusArsip = new Map(arsip.map(a => [`${a.anakId}:${a.periodeLaporan}`, a.jumlahT]));
    const titik = new Map<string, TitikPertumbuhan>();
    for (const a of arsip) {
        if (a.periodeRiwayat > periode) continue;
        titik.set(kunciTitik({ anakId: a.anakId, periodeId: a.periodeRiwayat }),
            { anakId: a.anakId, periodeId: a.periodeRiwayat, umurBulan: a.umurBulan, bbKg: a.bbKg, zBbU: a.zBbU, hadir: true });
    }
    const kategoriKini = new Map<number, string[]>();
    for (const r of riwayat) {
        if (r.periodeId > periode) continue;
        titik.set(kunciTitik(r), { anakId: r.anakId, periodeId: r.periodeId,
            umurBulan: umurBulan(r.tglLahir, r.tanggalUkur), bbKg: r.bbKg, zBbU: r.zBbU, hadir: r.hadir });
        if (r.periodeId === periode) kategoriKini.set(r.anakId, r.kategori);
    }
    const perAnak = new Map<number, TitikPertumbuhan[]>();
    for (const t of titik.values()) perAnak.set(t.anakId, [...(perAnak.get(t.anakId) ?? []), t]);

    const hasil = new Map<number, PrioritasKms>();
    for (const [anakId, daftar] of perAnak) {
        let berturutT = 0;
        let sebelumnya: TitikPertumbuhan | undefined;
        let tKini: number | null = null;
        for (const t of daftar.sort((a, b) => a.periodeId.localeCompare(b.periodeId))) {
            const { nt } = hitungPertumbuhan(t, sebelumnya);
            berturutT = nt === "T" ? berturutT + 1 : 0;
            const tercatat = statusArsip.get(kunciTitik(t));
            if (tercatat !== undefined && t.hadir) berturutT = tercatat;
            if (t.periodeId === periode) tKini = berturutT;
            sebelumnya = t;
        }
        const jumlahT = tKini ?? 0;
        const kategori = [...new Set(kategoriKini.get(anakId) ?? [])];
        const berat = kategori.filter(k => KATEGORI_BERAT.has(k));
        const lain = kategori.filter(k => !KATEGORI_BERAT.has(k) && PERLU_TINDAK_LANJUT.includes(k));
        const alasan: string[] = [];
        let skor = 0;
        if (jumlahT >= 2) { skor += 1000 + jumlahT * 100; alasan.push(`${jumlahT}T`); }
        else if (jumlahT === 1) { skor += 50; alasan.push("1T"); }
        if (berat.length) { skor += 500; alasan.push(...berat); }
        if (lain.length) { skor += 200; alasan.push(...lain); }
        hasil.set(anakId, { skor, jumlahT, alasan });
    }
    return hasil;
}

/** Mengambil riwayat ukur dan arsip 2T lalu menghitung prioritas untuk anak-anak tersebut. */
export async function prioritasUntukAnak(
    db: Pool | PoolClient,
    periodeId: number,
    anakIds: number[],
): Promise<Map<number, PrioritasKms>> {
    if (anakIds.length === 0) return new Map();
    const periode = (await db.query<{ periode: string }>(
        `SELECT to_char(make_date(tahun, bulan, 1), 'YYYY-MM') AS periode FROM periode WHERE id = $1`,
        [periodeId],
    )).rows[0]?.periode;
    if (!periode) return new Map();
    const riwayat = (await db.query<RiwayatUkur>(
        `SELECT p.anak_id::int AS "anakId", to_char(make_date(pe.tahun, pe.bulan, 1), 'YYYY-MM') AS "periodeId",
                to_char(a.tgl_lahir, 'YYYY-MM-DD') AS "tglLahir", to_char(p.tanggal_ukur, 'YYYY-MM-DD') AS "tanggalUkur",
                p.bb_kg::float8 AS "bbKg", p.status_kehadiran = 'hadir' AS hadir,
                (SELECT pg.z_score::float8 FROM penilaian_gizi pg
                  WHERE pg.pengukuran_id = p.id AND pg.standar_versi = 'WHO-2006' AND pg.indeks = 'BB_U' LIMIT 1) AS "zBbU",
                coalesce((SELECT array_agg(DISTINCT pg.kategori) FROM penilaian_gizi pg
                  WHERE pg.pengukuran_id = p.id AND pg.standar_versi = 'WHO-2006' AND pg.kategori IS NOT NULL), '{}') AS kategori
           FROM pengukuran p
           JOIN periode pe ON pe.id = p.periode_id
           JOIN anak a ON a.id = p.anak_id
          WHERE p.anak_id = ANY($1::bigint[])
            AND make_date(pe.tahun, pe.bulan, 1) <= to_date($2, 'YYYY-MM')
            AND make_date(pe.tahun, pe.bulan, 1) > to_date($2, 'YYYY-MM') - interval '12 months'`,
        [anakIds, periode],
    )).rows;
    const arsip = (await db.query<ArsipT>(
        `SELECT anak_id::int AS "anakId", periode_laporan AS "periodeLaporan", periode_riwayat AS "periodeRiwayat",
                jumlah_t::int AS "jumlahT", umur_bulan::float8 AS "umurBulan", bb_kg::float8 AS "bbKg",
                (penilaian #>> '{WHO-2006,BB_U,z}')::float8 AS "zBbU"
           FROM riwayat_2t_arsip
          WHERE anak_id = ANY($1::bigint[]) AND periode_laporan <= $2`,
        [anakIds, periode],
    )).rows;
    const hasil = hitungPrioritas(periode, riwayat, arsip);
    for (const id of anakIds) if (!hasil.has(id)) hasil.set(id, { skor: 0, jumlahT: 0, alasan: [] });
    return hasil;
}
