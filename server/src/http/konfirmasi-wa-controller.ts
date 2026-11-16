import { Router } from "express";
import type { Pool } from "pg";
import { rtYangBolehDilihat } from "../auth/peran.ts";
import { wajibBoleh } from "./middleware.ts";

export function ruteKonfirmasiWa(pool: Pool): Router {
    const rute = Router();
    rute.get(
        "/konfirmasi-whatsapp",
        wajibBoleh("lihat-anak"),
        async (req, res, next) => {
            const periode = req.query.periode;
            if (
                typeof periode !== "string" ||
                !/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)
            ) {
                res.status(400).json({
                    galat: "Periode harus berformat YYYY-MM.",
                });
                return;
            }
            try {
                const pengguna = req.pengguna!;
                const { rows } = await pool.query<{ anakId: number }>(
                    `SELECT k.anak_id AS "anakId" FROM konfirmasi_whatsapp k
                 JOIN anak a ON a.id=k.anak_id AND a.deleted_at IS NULL
                 JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
                 JOIN periode p ON p.id=k.periode_id AND p.posyandu_id=w.posyandu_id
                 WHERE to_char(make_date(p.tahun,p.bulan,1),'YYYY-MM')=$1
                   AND ($2::boolean OR w.posyandu_id=ANY($3::bigint[]))
                   AND ($4::text IS NULL OR w.rt=$4)`,
                    [
                        periode,
                        pengguna.superAdmin ?? false,
                        pengguna.posyanduIds ?? [],
                        rtYangBolehDilihat(pengguna),
                    ],
                );
                res.set("Cache-Control", "no-store").json({
                    anakIds: rows.map((r) => r.anakId),
                });
            } catch (error) {
                next(error);
            }
        },
    );
    rute.post(
        "/anak/:id/konfirmasi-whatsapp",
        wajibBoleh("ubah-anak"),
        async (req, res, next) => {
            const id = Number(req.params.id);
            const { periode, terkirim } = req.body ?? {};
            if (
                !Number.isSafeInteger(id) ||
                id < 1 ||
                typeof periode !== "string" ||
                !/^\d{4}-(0[1-9]|1[0-2])$/.test(periode) ||
                typeof terkirim !== "boolean"
            ) {
                res.status(400).json({ galat: "Data konfirmasi tidak valid." });
                return;
            }
            try {
                const pengguna = req.pengguna!;
                const params = [
                    id,
                    periode,
                    pengguna.superAdmin ?? false,
                    pengguna.posyanduIds ?? [],
                    rtYangBolehDilihat(pengguna),
                ];
                const { rows } = await pool.query<{ periodeId: number }>(
                    `SELECT p.id AS "periodeId" FROM anak a JOIN wilayah_rt w ON w.id=a.wilayah_rt_id
                 JOIN periode p ON p.posyandu_id=w.posyandu_id
                 WHERE a.id=$1 AND a.deleted_at IS NULL AND to_char(make_date(p.tahun,p.bulan,1),'YYYY-MM')=$2
                   AND ($3::boolean OR w.posyandu_id=ANY($4::bigint[])) AND ($5::text IS NULL OR w.rt=$5)
                   AND EXISTS (SELECT 1 FROM pengukuran u WHERE u.anak_id=a.id AND u.periode_id=p.id AND u.status_kehadiran='hadir')
                 LIMIT 1`,
                    params,
                );
                if (!rows[0]) {
                    res.status(404).json({
                        galat: "Pengukuran periode ini tidak ditemukan.",
                    });
                    return;
                }
                if (terkirim) {
                    await pool.query(
                        `INSERT INTO konfirmasi_whatsapp (anak_id,periode_id,dikonfirmasi_oleh)
                    VALUES ($1,$2,$3) ON CONFLICT (anak_id,periode_id) DO UPDATE
                    SET dikonfirmasi_oleh=EXCLUDED.dikonfirmasi_oleh,dikonfirmasi_pada=now()`,
                        [id, rows[0].periodeId, pengguna.id],
                    );
                } else {
                    await pool.query(
                        "DELETE FROM konfirmasi_whatsapp WHERE anak_id=$1 AND periode_id=$2",
                        [id, rows[0].periodeId],
                    );
                }
                res.json({ terkirim });
            } catch (error) {
                next(error);
            }
        },
    );
    return rute;
}
