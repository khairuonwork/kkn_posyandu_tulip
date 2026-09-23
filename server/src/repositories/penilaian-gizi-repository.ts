/**
 * Membaca masukan penilaian gizi dan menyimpan hasilnya.
 *
 * Port dari `simpan()` pada `app/Support/Antropometri/PenilaianGiziService.php`,
 * bagian yang tertinggal saat pindah stack — mesin hitungnya ikut, penyimpanannya
 * tidak. Lihat butir 1 pada docs/rencana-kerja.md.
 *
 * Mesin hitung di `src/antropometri/` tidak tahu apa-apa soal basis data dan
 * tetap begitu; berkas inilah satu-satunya yang menjembatani keduanya.
 *
 * @see docs/rujukan/antropometri.md
 * @see docs/prd/dasar/B01-simpan-hasil-gizi.md
 */

import type { Pool, PoolClient } from 'pg';

import type { HasilPenilaian, PengukuranMasukan } from '../antropometri/penilaian-gizi.ts';

/** Yang dibutuhkan mesin hitung, plus id barisnya. */
export type BarisPengukuran = PengukuranMasukan & { id: number };

type Penjalan = Pool | PoolClient;

// ponytail: query pengukuran tinggal di sini karena satu-satunya pemakainya
// adalah penilaian gizi. Pindahkan ke pengukuran-repository saat CRUD
// pengukuran dibangun (butir 5 rencana kerja).
const KOLOM_MASUKAN = `
    SELECT p.id,
           a.tgl_lahir    AS "tglLahir",
           a.jk,
           p.tanggal_ukur AS "tanggalUkur",
           p.bb_kg        AS "bbKg",
           p.tinggi_cm    AS "tinggiCm",
           p.jenis_ukur   AS "jenisUkur",
           p.lila_cm      AS "lilaCm",
           p.lika_cm      AS "likaCm"
      FROM pengukuran p
      JOIN anak a ON a.id = p.anak_id`;

/**
 * Tanggal dikembalikan driver sebagai objek `Date` dalam zona waktu mesin.
 * Mesin hitung menuntut ISO `YYYY-MM-DD` justru supaya zona waktu tidak pernah
 * ikut menentukan umur, jadi konversinya dilakukan di sini — dari komponen
 * tanggal lokal, bukan `toISOString()` yang menggeser satu hari di zona timur.
 */
function keIso(nilai: Date | string): string {
    if (typeof nilai === 'string') {
        return nilai.slice(0, 10);
    }

    const bulan = String(nilai.getMonth() + 1).padStart(2, '0');
    const hari = String(nilai.getDate()).padStart(2, '0');

    return `${nilai.getFullYear()}-${bulan}-${hari}`;
}

function keBaris(row: Record<string, unknown>): BarisPengukuran {
    return {
        id: row.id as number,
        tglLahir: keIso(row.tglLahir as Date | string),
        jk: row.jk as BarisPengukuran['jk'],
        tanggalUkur: keIso(row.tanggalUkur as Date | string),
        bbKg: row.bbKg as number | null,
        tinggiCm: row.tinggiCm as number | null,
        jenisUkur: row.jenisUkur as BarisPengukuran['jenisUkur'],
        lilaCm: row.lilaCm as number | null,
        likaCm: row.likaCm as number | null,
    };
}

export async function ambilMasukan(
    penjalan: Penjalan,
    pengukuranId: number,
): Promise<BarisPengukuran | null> {
    const { rows } = await penjalan.query(`${KOLOM_MASUKAN} WHERE p.id = $1`, [pengukuranId]);

    return rows.length === 0 ? null : keBaris(rows[0] as Record<string, unknown>);
}

export async function ambilMasukanPeriode(
    penjalan: Penjalan,
    periodeId: number,
): Promise<BarisPengukuran[]> {
    const { rows } = await penjalan.query(
        `${KOLOM_MASUKAN} WHERE p.periode_id = $1 ORDER BY p.id`,
        [periodeId],
    );

    return rows.map((r) => keBaris(r as Record<string, unknown>));
}

/**
 * Menyimpan hasil penilaian satu pengukuran untuk satu versi standar.
 *
 * Dua hal terjadi, dan keduanya harus satu transaksi:
 *
 * 1. Tiap indeks yang terhitung di-*upsert* — dihitung ulang menimpa nilainya,
 *    bukan menambah baris (FR-20). Kuncinya `(pengukuran_id, indeks,
 *    standar_versi)`, *constraint* yang sudah ada di skema.
 * 2. Indeks yang **tidak** ada di hasil dihapus. Inilah yang membuat koreksi
 *    pengukuran bersih: berat yang dikosongkan membuat BB/U tidak lagi dapat
 *    dihitung, dan barisnya harus hilang — bukan tertinggal memuat angka dari
 *    berat yang sudah tidak ada.
 *
 * Versi standar lain tidak disentuh sama sekali (DR-06): menambah versi baru
 * tidak pernah mengubah hasil lama.
 *
 * @returns jumlah baris yang tersimpan.
 */
export async function simpanPenilaian(
    penjalan: Penjalan,
    pengukuranId: number,
    versi: string,
    hasil: HasilPenilaian[],
): Promise<number> {
    const dihitungPada = new Date();

    for (const baris of hasil) {
        await penjalan.query(
            `INSERT INTO penilaian_gizi
                 (pengukuran_id, standar_versi, indeks, z_score, kategori,
                  tidak_wajar, catatan_perhitungan, dihitung_pada)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (pengukuran_id, indeks, standar_versi) DO UPDATE
                 SET z_score             = EXCLUDED.z_score,
                     kategori            = EXCLUDED.kategori,
                     tidak_wajar         = EXCLUDED.tidak_wajar,
                     catatan_perhitungan = EXCLUDED.catatan_perhitungan,
                     dihitung_pada       = EXCLUDED.dihitung_pada`,
            [
                pengukuranId,
                versi,
                baris.indeks,
                baris.zScore,
                baris.kategori,
                baris.tidakWajar,
                baris.catatanPerhitungan === null
                    ? null
                    : JSON.stringify(baris.catatanPerhitungan),
                dihitungPada,
            ],
        );
    }

    const terhitung = hasil.map((b) => b.indeks);

    await penjalan.query(
        `DELETE FROM penilaian_gizi
          WHERE pengukuran_id = $1
            AND standar_versi = $2
            AND indeks <> ALL($3::text[])`,
        [pengukuranId, versi, terhitung],
    );

    return hasil.length;
}
