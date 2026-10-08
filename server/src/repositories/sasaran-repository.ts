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

export type CalonSasaran = {
    anakId: number;
    nama: string;
    nik: string | null;
    tglLahir: string;
    jk: "L" | "P";
    namaOrtu: string | null;
    rt: string;
};

export type HasilTambahSasaran =
    | { status: "berhasil"; sasaranId: number; sudahDiukur: boolean }
    | { status: "periode_tidak_ada" | "sesi_ditutup" | "anak_tidak_ada" | "anak_tidak_aktif" | "di_luar_posyandu" | "sudah_ada" };

const STATUS_SASARAN = [
    "menunggu",
    "selesai",
    "tidak_hadir",
    "pindah",
    "batal",
] as const;

export type StatusSasaran = (typeof STATUS_SASARAN)[number];

function namaBaku(nama: string): string {
    return nama.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

export async function calonSasaran(
    pool: Pool,
    pengguna: PenggunaAktif,
    periodeId: number,
    cari: string,
): Promise<CalonSasaran[]> {
    const rt = rtYangBolehDilihat(pengguna);
    const posyanduId = await pool.query<{ id: number }>(
        `SELECT id FROM posyandu
          ORDER BY (slug = 'posyandu-tulip') DESC, id LIMIT 1`,
    );
    if (posyanduId.rows[0] === undefined) return [];

    const { rows } = await pool.query<CalonSasaran>(
        `SELECT a.id AS "anakId", a.nama, a.nik,
                to_char(a.tgl_lahir, 'YYYY-MM-DD') AS "tglLahir", a.jk,
                o.nama AS "namaOrtu", w.rt
           FROM anak a
           JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
           LEFT JOIN orang_tua o ON o.id = a.orang_tua_id
          WHERE a.deleted_at IS NULL AND a.status = 'aktif'
            AND w.posyandu_id = $1
            AND ($2::text IS NULL OR w.rt = $2)
            AND NOT EXISTS (
                SELECT 1 FROM sasaran s
                 WHERE s.periode_id = $3 AND s.anak_id = a.id
            )
            AND (a.nama_baku ILIKE $4 OR coalesce(a.nik, '') ILIKE $4
                 OR coalesce(o.nama, '') ILIKE $4)
          ORDER BY a.nama_baku, a.id
          LIMIT 30`,
        [posyanduId.rows[0].id, rt, periodeId, `%${cari}%`],
    );
    return rows;
}

export async function tambahSasaranManual(
    db: PoolClient,
    periodeId: number,
    anakId: number,
    penggunaId: number,
): Promise<HasilTambahSasaran> {
    const periode = await db.query<{
        id: number;
        posyandu_id: number;
        sesi_ditutup_pada: Date | null;
    }>(
        `SELECT id, posyandu_id, sesi_ditutup_pada
           FROM periode WHERE id = $1 FOR UPDATE`,
        [periodeId],
    );
    const dataPeriode = periode.rows[0];
    if (dataPeriode === undefined) return { status: "periode_tidak_ada" };
    if (dataPeriode.sesi_ditutup_pada !== null)
        return { status: "sesi_ditutup" };

    const anak = await db.query<{ status: string; posyandu_id: number | null }>(
        `SELECT a.status, w.posyandu_id
           FROM anak a
           LEFT JOIN wilayah_rt w ON w.id = a.wilayah_rt_id
          WHERE a.id = $1 AND a.deleted_at IS NULL`,
        [anakId],
    );
    const dataAnak = anak.rows[0];
    if (dataAnak === undefined) return { status: "anak_tidak_ada" };
    if (dataAnak.status !== "aktif") return { status: "anak_tidak_aktif" };
    if (dataAnak.posyandu_id !== dataPeriode.posyandu_id)
        return { status: "di_luar_posyandu" };

    const sudahDiukur = await db.query<{ ada: boolean }>(
        `SELECT EXISTS (
            SELECT 1 FROM pengukuran WHERE periode_id = $1 AND anak_id = $2
         ) AS ada`,
        [periodeId, anakId],
    );
    const status = sudahDiukur.rows[0].ada ? "selesai" : "menunggu";
    const hasil = await db.query<{ id: number }>(
        `INSERT INTO sasaran
             (periode_id, anak_id, status, diselesaikan_pada, diselesaikan_oleh)
         VALUES ($1, $2, $3,
                 CASE WHEN $3 = 'selesai' THEN now() ELSE NULL END,
                 CASE WHEN $3 = 'selesai' THEN $4 ELSE NULL END)
         ON CONFLICT (periode_id, anak_id) DO NOTHING
         RETURNING id`,
        [periodeId, anakId, status, penggunaId],
    );
    if (hasil.rows[0] === undefined) return { status: "sudah_ada" };
    return {
        status: "berhasil",
        sasaranId: hasil.rows[0].id,
        sudahDiukur: sudahDiukur.rows[0].ada,
    };
}

export async function ubahSasaran(
    db: PoolClient,
    sasaranId: number,
    status: StatusSasaran,
    catatan: string | null,
    penggunaId: number,
): Promise<"berhasil" | "periode_ditutup" | "tidak_ada"> {
    const selesai = status !== "menunggu";
    const hasil = await db.query(
        `UPDATE sasaran s
            SET status = $2, catatan = $3,
                diselesaikan_pada = CASE WHEN $4 THEN coalesce(diselesaikan_pada, now()) ELSE NULL END,
                diselesaikan_oleh = CASE WHEN $4 THEN $5 ELSE NULL END
           FROM periode p
          WHERE s.id = $1 AND p.id = s.periode_id
            AND p.sesi_ditutup_pada IS NULL
          RETURNING s.id`,
        [sasaranId, status, catatan, selesai, penggunaId],
    );
    if (hasil.rows.length > 0) return "berhasil";
    const ada = await db.query<{ ada: boolean; ditutup: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM sasaran WHERE id=$1) AS ada,
                EXISTS (SELECT 1 FROM sasaran s JOIN periode p ON p.id=s.periode_id
                         WHERE s.id=$1 AND p.sesi_ditutup_pada IS NOT NULL) AS ditutup`,
        [sasaranId],
    );
    if (!ada.rows[0]?.ada) return "tidak_ada";
    return ada.rows[0].ditutup ? "periode_ditutup" : "tidak_ada";
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
    type AnakTersimpan = {
        id: number;
        orang_tua_id: number | null;
        nik: string | null;
    };
    let lama: AnakTersimpan | undefined;
    if (data.nik !== null) {
        const ditemukan = await db.query<AnakTersimpan>(
            `SELECT id, orang_tua_id, nik FROM anak
              WHERE nik = $1 AND deleted_at IS NULL
              FOR UPDATE`,
            [data.nik],
        );
        lama = ditemukan.rows[0];
    } else {
        const ditemukan = await db.query<AnakTersimpan>(
            `SELECT id, orang_tua_id, nik FROM anak
              WHERE nama_baku = $1 AND tgl_lahir = $2
                AND jk = $3 AND wilayah_rt_id = $4 AND deleted_at IS NULL
              ORDER BY id LIMIT 2 FOR UPDATE`,
            [baku, data.tglLahir, data.jk, wilayahId],
        );

        // Nama + tanggal lahir + jenis kelamin + RT harus unik. Saat NIK
        // tidak ada di Excel, pertahankan NIK tersimpan jika identitas ini
        // cocok tepat pada satu profil, bukan menggantinya dengan EPPGBM/null.
        if (ditemukan.rows.length > 1) return null;
        lama = ditemukan.rows[0];
    }
    const orangTuaId = await simpanOrangTua(
        db,
        data,
        lama?.orang_tua_id ?? null,
    );
    const nilai = [
        data.nik ?? lama?.nik ?? null,
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
        const masalah = [...data.masalah];

        // Konflik NIK diketahui sebelum menyentuh tabel anak. Kedua/semua
        // baris yang berbagi NIK ditahan agar tidak saling menimpa profil.
        if (data.identitasDuplikat) {
            perluVerifikasi++;
            await db.query(
                `INSERT INTO import_konflik
                     (import_batch_id, baris_asal, jenis, payload)
                 VALUES ($1, $2, 'perlu_verifikasi', $3::jsonb)`,
                [batchId, data.barisAsal, JSON.stringify({ masalah, data })],
            );
            continue;
        }

        const anak = await simpanAnakImpor(db, posyanduId, data);
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

export async function daftarPeriodeSasaran(pool: Pool) {
    const { rows } = await pool.query<{
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
          ORDER BY p.tahun DESC, p.bulan DESC`,
    );
    return rows;
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
