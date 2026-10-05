import type { Pool, PoolClient } from "pg";

import type { PenggunaAktif } from "../auth/peran.ts";
import { rtYangBolehDilihat } from "../auth/peran.ts";
import type {
    BarisSasaranExcel,
    SheetSasaran,
} from "../services/sasaran-excel.ts";

export type RingkasanImpor = {
    importBatchId: number;
    periodeId: number;
    periode: string;
    labelPeriode: string;
    jumlahSasaran: number;
    anakBaru: number;
    anakDiperbarui: number;
    perluVerifikasi: number;
};

function namaBaku(nama: string): string {
    return nama.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

async function posyanduUtama(db: PoolClient): Promise<number> {
    const { rows } = await db.query<{ id: number }>(
        `SELECT id FROM posyandu
          ORDER BY (slug = 'posyandu-tulip') DESC, id
          LIMIT 1`,
    );
    if (rows[0] === undefined) throw new Error("Posyandu belum tersedia.");
    return rows[0].id;
}

async function wilayah(
    db: PoolClient,
    posyanduId: number,
    rt: string,
): Promise<number | null> {
    const { rows } = await db.query<{ id: number }>(
        `SELECT id FROM wilayah_rt
          WHERE posyandu_id = $1 AND ltrim(rt, '0') = ltrim($2, '0')
          ORDER BY id LIMIT 1`,
        [posyanduId, rt],
    );
    return rows[0]?.id ?? null;
}

async function simpanOrangTua(
    db: PoolClient,
    data: BarisSasaranExcel,
    orangTuaLama: number | null,
): Promise<number> {
    if (data.nikOrtu !== null) {
        const { rows } = await db.query<{ id: number }>(
            `INSERT INTO orang_tua (nik, nama)
             VALUES ($1, $2)
             ON CONFLICT (nik) DO UPDATE SET nama = EXCLUDED.nama
             RETURNING id`,
            [data.nikOrtu, data.namaOrtu],
        );
        return rows[0].id;
    }
    if (orangTuaLama !== null) {
        await db.query("UPDATE orang_tua SET nama = $2 WHERE id = $1", [
            orangTuaLama,
            data.namaOrtu,
        ]);
        return orangTuaLama;
    }
    const { rows } = await db.query<{ id: number }>(
        "INSERT INTO orang_tua (nama) VALUES ($1) RETURNING id",
        [data.namaOrtu],
    );
    return rows[0].id;
}

async function simpanAnakImpor(
    db: PoolClient,
    posyanduId: number,
    data: BarisSasaranExcel,
): Promise<{ id: number; baru: boolean } | null> {
    const wilayahId = await wilayah(db, posyanduId, data.rt);
    if (wilayahId === null) return null;

    const baku = namaBaku(data.nama);
    const ditemukan =
        data.nik !== null
            ? await db.query<{ id: number; orang_tua_id: number | null }>(
                  `SELECT id, orang_tua_id FROM anak
                WHERE nik = $1 AND deleted_at IS NULL
                FOR UPDATE`,
                  [data.nik],
              )
            : await db.query<{ id: number; orang_tua_id: number | null }>(
                  `SELECT id, orang_tua_id FROM anak
                WHERE nik IS NULL AND nama_baku = $1 AND tgl_lahir = $2
                  AND jk = $3 AND wilayah_rt_id = $4 AND deleted_at IS NULL
                ORDER BY id LIMIT 2 FOR UPDATE`,
                  [baku, data.tglLahir, data.jk, wilayahId],
              );

    // Dua profil tanpa NIK yang sama tidak boleh disatukan diam-diam.
    if (data.nik === null && ditemukan.rows.length > 1) return null;
    const lama = ditemukan.rows[0];
    const orangTuaId = await simpanOrangTua(
        db,
        data,
        lama?.orang_tua_id ?? null,
    );
    const nilai = [
        data.nik,
        orangTuaId,
        wilayahId,
        data.nama,
        baku,
        data.tglLahir,
        data.jk,
        data.anakKe,
        data.bbLahirKg,
        data.pbLahirCm,
        data.bukuKia,
        data.imd,
        data.statusAwal === "pindah" ? "pindah" : "aktif",
    ];

    if (lama === undefined) {
        const { rows } = await db.query<{ id: number }>(
            `INSERT INTO anak
                (nik, orang_tua_id, wilayah_rt_id, nama, nama_baku, tgl_lahir, jk,
                 anak_ke, bb_lahir_kg, pb_lahir_cm, buku_kia, imd, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING id`,
            nilai,
        );
        return { id: rows[0].id, baru: true };
    }

    await db.query(
        `UPDATE anak SET nik=$2, orang_tua_id=$3, wilayah_rt_id=$4, nama=$5,
                nama_baku=$6, tgl_lahir=$7, jk=$8, anak_ke=$9,
                bb_lahir_kg=$10, pb_lahir_cm=$11, buku_kia=$12, imd=$13,
                status=$14
          WHERE id=$1`,
        [lama.id, ...nilai],
    );
    return { id: lama.id, baru: false };
}

export async function gantiSasaran(
    db: PoolClient,
    pengguna: PenggunaAktif,
    namaFile: string,
    sheet: SheetSasaran,
): Promise<RingkasanImpor> {
    const posyanduId = await posyanduUtama(db);
    const [tahun, bulan] = sheet.periode.split("-").map(Number);
    const periode = await db.query<{ id: number }>(
        `INSERT INTO periode (posyandu_id, bulan, tahun)
         VALUES ($1, $2, $3)
         ON CONFLICT (posyandu_id, bulan, tahun) DO UPDATE
             SET sesi_ditutup_pada = NULL, sesi_ditutup_oleh = NULL
         RETURNING id`,
        [posyanduId, bulan, tahun],
    );
    const periodeId = periode.rows[0].id;
    const batch = await db.query<{ id: number }>(
        `INSERT INTO import_batch
             (sumber_file, sheet, dijalankan_oleh, dijalankan_pada, ringkasan)
         VALUES ($1, $2, $3, now(), '{}'::jsonb)
         RETURNING id`,
        [namaFile, sheet.sheet, pengguna.id],
    );
    const batchId = batch.rows[0].id;

    const siap = new Map<number, { anakId: number; data: BarisSasaranExcel }>();
    let anakBaru = 0;
    let anakDiperbarui = 0;
    let perluVerifikasi = 0;

    for (const data of sheet.baris) {
        const anak = await simpanAnakImpor(db, posyanduId, data);
        const masalah = [...data.masalah];
        if (anak === null)
            masalah.push(
                `RT ${data.rt} tidak tersedia atau identitas tidak unik`,
            );
        if (masalah.length > 0) {
            perluVerifikasi++;
            await db.query(
                `INSERT INTO import_konflik
                     (import_batch_id, baris_asal, jenis, payload)
                 VALUES ($1, $2, 'perlu_verifikasi', $3::jsonb)`,
                [batchId, data.barisAsal, JSON.stringify({ masalah, data })],
            );
        }
        if (anak === null) continue;
        if (siap.has(anak.id)) {
            perluVerifikasi++;
            await db.query(
                `INSERT INTO import_konflik
                     (import_batch_id, baris_asal, jenis, payload)
                 VALUES ($1, $2, 'sasaran_duplikat', $3::jsonb)`,
                [
                    batchId,
                    data.barisAsal,
                    JSON.stringify({ anakId: anak.id, data }),
                ],
            );
        } else {
            if (anak.baru) anakBaru++;
            else anakDiperbarui++;
            siap.set(anak.id, { anakId: anak.id, data });
        }
    }

    // Penggantian berlaku hanya pada tabel keanggotaan sasaran periode ini.
    // Master anak dan pengukuran periode yang sudah ada tidak disentuh.
    await db.query("DELETE FROM sasaran WHERE periode_id = $1", [periodeId]);
    for (const item of siap.values()) {
        const sudahDiukur = await db.query<{ ada: boolean }>(
            "SELECT EXISTS (SELECT 1 FROM pengukuran WHERE periode_id=$1 AND anak_id=$2) AS ada",
            [periodeId, item.anakId],
        );
        const status =
            item.data.statusAwal === "pindah"
                ? "pindah"
                : sudahDiukur.rows[0].ada
                  ? "selesai"
                  : "menunggu";
        await db.query(
            `INSERT INTO sasaran
                 (periode_id, anak_id, import_batch_id, status, diselesaikan_pada)
             VALUES ($1, $2, $3, $4::varchar(16),
                     CASE WHEN $4::text='selesai' THEN now() ELSE NULL END)`,
            [periodeId, item.anakId, batchId, status],
        );
    }

    const ringkasan = {
        periode: sheet.periode,
        jumlahSasaran: siap.size,
        anakBaru,
        anakDiperbarui,
        perluVerifikasi,
    };
    await db.query("UPDATE import_batch SET ringkasan=$2::jsonb WHERE id=$1", [
        batchId,
        JSON.stringify(ringkasan),
    ]);

    return {
        importBatchId: batchId,
        periodeId,
        labelPeriode: sheet.labelPeriode,
        ...ringkasan,
    };
}

export async function daftarSasaran(
    pool: Pool,
    pengguna: PenggunaAktif,
    kodePeriode?: string,
) {
    const rt = rtYangBolehDilihat(pengguna);
    const parameter: unknown[] = [];
    let kondisi = "";
    if (kodePeriode !== undefined) {
        const [tahun, bulan] = kodePeriode.split("-").map(Number);
        parameter.push(tahun, bulan);
        kondisi = "AND p.tahun=$1 AND p.bulan=$2";
    }
    const periode = await pool.query<{
        id: number;
        periode: string;
        label: string;
        tanggalKegiatan: string | null;
        sesiDitutupPada: string | null;
    }>(
        `SELECT p.id,
                p.tahun || '-' || lpad(p.bulan::text, 2, '0') AS periode,
                to_char(make_date(p.tahun, p.bulan, 1), 'TMMonth YYYY') AS label,
                to_char(p.tanggal_kegiatan, 'YYYY-MM-DD') AS "tanggalKegiatan",
                p.sesi_ditutup_pada AS "sesiDitutupPada"
           FROM periode p
          WHERE EXISTS (SELECT 1 FROM sasaran s WHERE s.periode_id=p.id)
            ${kondisi}
          ORDER BY p.tahun DESC, p.bulan DESC
          LIMIT 1`,
        parameter,
    );
    const aktif = periode.rows[0] ?? null;
    if (aktif === null) {
        return {
            periode: null,
            ringkasan: {
                total: 0,
                menunggu: 0,
                selesai: 0,
                tidakHadir: 0,
                pindah: 0,
            },
            items: [],
        };
    }

    const { rows } = await pool.query(
        `SELECT s.id, s.status, s.catatan,
                a.id AS "anakId", a.nik, a.nama,
                to_char(a.tgl_lahir, 'YYYY-MM-DD') AS "tglLahir", a.jk,
                o.nama AS "namaOrtu", w.rt,
                'SPT-' || lpad(a.id::text, 8, '0') AS "kodeKartu"
           FROM sasaran s
           JOIN anak a ON a.id=s.anak_id AND a.deleted_at IS NULL
           LEFT JOIN orang_tua o ON o.id=a.orang_tua_id
           LEFT JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
          WHERE s.periode_id=$1 AND ($2::text IS NULL OR w.rt=$2)
          ORDER BY a.nama_baku, a.id`,
        [aktif.id, rt],
    );
    const hitung = (status: string) =>
        rows.filter((baris) => baris.status === status).length;
    return {
        periode: aktif,
        ringkasan: {
            total: rows.length,
            menunggu: hitung("menunggu"),
            selesai: hitung("selesai"),
            tidakHadir: hitung("tidak_hadir"),
            pindah: hitung("pindah"),
        },
        items: rows,
    };
}

export async function tutupSesi(
    db: PoolClient,
    pengguna: PenggunaAktif,
    periodeId: number,
): Promise<{ ditandaiTidakHadir: number; sesiDitutupPada: string | null }> {
    const rt = rtYangBolehDilihat(pengguna);
    const hasil = await db.query(
        `UPDATE sasaran s
            SET status='tidak_hadir', diselesaikan_pada=now(), diselesaikan_oleh=$2,
                catatan=coalesce(catatan, 'Sesi ditutup: orang tua tidak hadir')
           FROM anak a
           LEFT JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
          WHERE s.anak_id=a.id AND s.periode_id=$1 AND s.status='menunggu'
            AND ($3::text IS NULL OR w.rt=$3)`,
        [periodeId, pengguna.id, rt],
    );
    const tersisa = await db.query<{ jumlah: number }>(
        `SELECT count(*)::int AS jumlah FROM sasaran
          WHERE periode_id=$1 AND status='menunggu'`,
        [periodeId],
    );
    let ditutup: string | null = null;
    if ((tersisa.rows[0]?.jumlah ?? 0) === 0) {
        const periode = await db.query<{ sesiDitutupPada: string }>(
            `UPDATE periode SET sesi_ditutup_pada=coalesce(sesi_ditutup_pada, now()),
                                sesi_ditutup_oleh=$2
              WHERE id=$1
              RETURNING sesi_ditutup_pada AS "sesiDitutupPada"`,
            [periodeId, pengguna.id],
        );
        ditutup = periode.rows[0]?.sesiDitutupPada ?? null;
    }
    return {
        ditandaiTidakHadir: hasil.rowCount ?? 0,
        sesiDitutupPada: ditutup,
    };
}
