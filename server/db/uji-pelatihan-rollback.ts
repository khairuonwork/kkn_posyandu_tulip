/** Uji dengan source yang ada, SEMUA perubahan di-rollback; mode publik tidak pernah aktif. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { dapatkanPool, tutupPool } from "../src/db/pool.ts";
import {
    buatPelatihan,
    hapusPelatihan,
    skemaAman,
    BATAS_ID_LATIHAN,
} from "../src/services/pelatihan.ts";
import {
    upsertPengukuran,
    paketSinkronisasi,
} from "../src/repositories/anak-repository.ts";
import {
    konteksPelatihan,
    poolOperasional,
} from "../src/http/pelatihan-context.ts";

const pool = dapatkanPool();
const db = await pool.connect();
try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
    const fingerprint = async () => {
        const hasil = [];
        for (const table of [
            "anak",
            "orang_tua",
            "periode",
            "sasaran",
            "pengukuran",
            "penilaian_gizi",
        ])
            hasil.push(
                (
                    await db.query(
                        `SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'' ORDER BY id),'')) AS hash FROM public.${table} t`,
                    )
                ).rows[0].hash,
            );
        return hasil;
    };
    const before = await fingerprint();
    const pe = (
        await db.query(
            `SELECT p.id,p.posyandu_id FROM public.periode p WHERE tahun=2026 AND bulan=10 AND EXISTS(SELECT 1 FROM public.sasaran s WHERE s.periode_id=p.id) ORDER BY p.id LIMIT 1`,
        )
    ).rows[0];
    const admin = (
        await db.query(
            "SELECT id FROM public.pengguna WHERE aktif AND super_admin ORDER BY id LIMIT 1",
        )
    ).rows[0];
    assert(pe && admin, "Sumber dan superadmin harus tersedia");
    const sesi = await buatPelatihan(
        db,
        pe.id,
        admin.id,
        "uji-tidak-ada-token",
    );
    const skema = "latihan_" + sesi.id.replaceAll("-", "");
    const s = skemaAman(skema);
    assert.equal(sesi.jumlah, 92);
    const foreign = (
        await db.query(
            `SELECT rn.nspname AS ref_schema FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_class r ON r.oid=c.confrelid JOIN pg_namespace rn ON rn.oid=r.relnamespace WHERE c.contype='f' AND n.nspname=$1`,
            [skema],
        )
    ).rows;
    assert(foreign.length > 0);
    assert(
        foreign.every((r) => r.ref_schema === skema),
        "Tidak boleh ada FK ke tabel riil",
    );
    const anakAsli = (
        await db.query(
            `SELECT a.id, a.nik FROM public.anak a JOIN public.sasaran s ON s.anak_id=a.id WHERE s.periode_id=$1 AND s.status<>'batal' AND a.deleted_at IS NULL ORDER BY a.id LIMIT 1`,
            [pe.id],
        )
    ).rows[0];
    const anak = (
        await db.query(`SELECT id,nik,kode_kartu FROM ${s}.anak ORDER BY id LIMIT 1`)
    ).rows[0];
    assert(anak.id >= BATAS_ID_LATIHAN);
    assert(anak.nik.startsWith("0099"));
    assert.equal(
        anak.kode_kartu,
        `SIMPATIK:SASARAN:1:${anakAsli.id}:${String(anakAsli.nik ?? "").replace(/\D/g, "")}`,
    );
    await db.query(`SET search_path TO ${s},pg_catalog`);
    const user = {
        id: admin.id,
        peran: "admin" as const,
        rt: null,
        aktif: true,
        superAdmin: true,
        posyanduIds: [pe.posyandu_id],
    };
    const hasil = await upsertPengukuran(db, user, {
        idPengukuran: randomUUID(),
        anakId: anak.id,
        nik: anak.nik,
        tanggalUkur: "2026-10-10",
        bbKg: 12,
        tinggiCm: 85,
        jenisUkur: "TB",
        lilaCm: 15,
        likaCm: 45,
        ntob: "N",
        statusKehadiran: "hadir",
    });
    assert(hasil, "Payload format APK harus dapat disimpan di sandbox");
    const operasi = poolOperasional(pool);
    const paket = await konteksPelatihan.run({ client: db, id: sesi.id }, () =>
        paketSinkronisasi(operasi, user),
    );
    assert(paket, "Paket sinkronisasi APK harus terbentuk");
    const counts = (
        await db.query(
            `SELECT (SELECT count(*) FROM ${s}.anak)::int AS anak,(SELECT count(*) FROM ${s}.pengukuran)::int AS ukur`,
        )
    ).rows[0];
    assert.deepEqual(counts, { anak: 92, ukur: 1 });
    await hapusPelatihan(db, sesi.id, "uji-tidak-ada-token");
    assert.equal(
        (await db.query("SELECT 1 FROM pg_namespace WHERE nspname=$1", [skema]))
            .rowCount,
        0,
    );
    assert.deepEqual(
        await fingerprint(),
        before,
        "Data riil harus identik sebelum/sesudah simulasi",
    );
    console.log(
        JSON.stringify({
            uji: "lulus",
            sasaran: 92,
            pengukuranLatihan: 1,
            fkTerisolasi: foreign.length,
            schemaDihapus: true,
            dataRiilIdentik: true,
            semuaDiRollback: true,
        }),
    );
} finally {
    await db.query("ROLLBACK");
    db.release();
    await tutupPool();
}
