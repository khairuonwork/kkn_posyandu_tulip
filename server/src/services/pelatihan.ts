import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

export const KUNCI_PELATIHAN = 271027;
export const BATAS_ID_LATIHAN = 1_000_000_000_000;
export const fiturPelatihan = () => process.env.PELATIHAN_AKTIF === "1";
export const kutip = (s: string) => '"' + s.replaceAll('"', '""') + '"';
export function skemaAman(s: string): string {
    if (!/^latihan_[a-f0-9]{32}$/.test(s))
        throw new Error("Schema pelatihan tidak valid");
    return kutip(s);
}
export type SesiPelatihan = {
    id: string;
    skema: string;
    periode_id: number;
    jumlah_sasaran: number;
    mulai_pada: string;
};
export async function sesiAktif(
    db: Pick<PoolClient, "query">,
): Promise<SesiPelatihan | null> {
    return (
        (
            await db.query<SesiPelatihan>(
                "SELECT id,skema,periode_id,jumlah_sasaran,mulai_pada FROM public.pelatihan_sesi WHERE selesai_pada IS NULL",
            )
        ).rows[0] ?? null
    );
}

/** Semua tabel klon memiliki namespace sendiri, termasuk identity/sequences dan FK. */
export async function buatPelatihan(
    db: PoolClient,
    periodeId: number,
    penggunaId: number,
    tokenHash: string,
) {
    await db.query("SELECT pg_advisory_xact_lock($1)", [KUNCI_PELATIHAN]);
    if (await sesiAktif(db))
        throw new Error(
            "Sesi pelatihan masih aktif. Akhiri sesi itu terlebih dahulu.",
        );
    const pe = (
        await db.query("SELECT * FROM public.periode WHERE id=$1", [periodeId])
    ).rows[0];
    if (!pe) throw new Error("Periode sumber tidak ditemukan.");
    const children = (
        await db.query(
            `SELECT to_jsonb(a) AS row FROM public.anak a JOIN public.sasaran s ON s.anak_id=a.id
        WHERE s.periode_id=$1 AND s.status<>'batal' AND a.deleted_at IS NULL ORDER BY a.id`,
            [periodeId],
        )
    ).rows.map((r) => r.row);
    if (!children.length) throw new Error("Sasaran periode sumber kosong.");
    const id = randomUUID();
    const skema = "latihan_" + id.replaceAll("-", "");
    const s = skemaAman(skema);
    const meta = (
        await db.query<{ nomor: number }>(
            `INSERT INTO public.pelatihan_sesi(id,skema,periode_id,dibuat_oleh,jumlah_sasaran)
        VALUES($1,$2,$3,$4,$5) RETURNING nomor`,
            [id, skema, periodeId, penggunaId, children.length],
        )
    ).rows[0];
    const base = BATAS_ID_LATIHAN + Number(meta.nomor) * 1_000_000;
    if (!Number.isSafeInteger(base) || Number(meta.nomor) > 999999)
        throw new Error("Rentang ID latihan habis.");
    const tables = (
        await db.query<{
            tablename: string;
        }>(`SELECT tablename FROM pg_tables WHERE schemaname='public'
        AND tablename NOT IN ('pelatihan_sesi') ORDER BY tablename`)
    ).rows.map((r) => r.tablename);
    await db.query(`CREATE SCHEMA ${s}`);
    await db.query(
        tables
            .map(
                (t) =>
                    `CREATE TABLE ${s}.${kutip(t)} (LIKE public.${kutip(t)} INCLUDING ALL)`,
            )
            .join(";"),
    );
    await db.query(
        `ALTER TABLE ${s}."anak" ADD COLUMN IF NOT EXISTS kode_kartu text`,
    );
    // LIKE tidak menyalin foreign key. Definisi referensi dibuat ulang ke schema latihan.
    const fks = (
        await db.query<{
            table_name: string;
            ref_table: string;
            conname: string;
            def: string;
        }>(`SELECT t.relname AS table_name,r.relname AS ref_table,c.conname,pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        JOIN pg_class r ON r.oid=c.confrelid JOIN pg_namespace rn ON rn.oid=r.relnamespace
        WHERE c.contype='f' AND n.nspname='public' AND rn.nspname='public'`)
    ).rows;
    // Serial defaults tidak boleh memakai sequence produksi.
    const columns = (
        await db.query<{
            table_name: string;
            column_name: string;
            is_identity: string;
            column_default: string | null;
        }>(
            `SELECT table_name,column_name,is_identity,column_default
        FROM information_schema.columns WHERE table_schema=$1`,
            [skema],
        )
    ).rows;
    await db.query(
        `CREATE FUNCTION ${s}.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$`,
    );
    for (const table of columns
        .filter((c) => c.column_name === "updated_at")
        .map((c) => c.table_name)) {
        await db.query(
            `CREATE TRIGGER latihan_updated_at BEFORE UPDATE ON ${s}.${kutip(table)} FOR EACH ROW EXECUTE FUNCTION ${s}.set_updated_at()`,
        );
    }
    for (const c of columns) {
        if (c.is_identity === "YES") {
            await db.query(
                `ALTER TABLE ${s}.${kutip(c.table_name)} ALTER COLUMN ${kutip(c.column_name)} RESTART WITH ${base + 10000}`,
            );
        } else if (c.column_default?.includes("nextval(")) {
            const seq = kutip(
                c.table_name + "_" + c.column_name + "_latihan_seq",
            );
            await db.query(
                `CREATE SEQUENCE ${s}.${seq} START WITH ${base + 10000}; ALTER TABLE ${s}.${kutip(c.table_name)} ALTER COLUMN ${kutip(c.column_name)} SET DEFAULT nextval('${skema}.${c.table_name}_${c.column_name}_latihan_seq')`,
            );
        }
    }
    async function isi(table: string, rows: Record<string, unknown>[]) {
        if (!rows.length) return;
        const cols = Object.keys(rows[0]).map(kutip).join(",");
        await db.query(
            `INSERT INTO ${s}.${kutip(table)} (${cols}) OVERRIDING SYSTEM VALUE SELECT ${cols} FROM jsonb_populate_recordset(NULL::${s}.${kutip(table)},$1::jsonb)`,
            [JSON.stringify(rows)],
        );
    }
    const get = async (table: string, where: string, params: unknown[] = []) =>
        (
            await db.query(
                `SELECT to_jsonb(t) AS row FROM public.${kutip(table)} t WHERE ${where}`,
                params,
            )
        ).rows.map((r) => r.row);
    const posyandu = await get("posyandu", "true");
    await isi(
        "posyandu",
        posyandu.map((r) => ({
            ...r,
            nama: "PELATIHAN · " + r.nama,
            kelurahan: null,
        })),
    );
    await isi("wilayah_rt", await get("wilayah_rt", "true"));
    // Auth tetap di produksi; klon akun hanya untuk referensi pelaku dan latihan pengaturan.
    const users = await get("pengguna", "true");
    await isi(
        "pengguna",
        users.map((r) => ({
            ...r,
            kata_sandi_hash: "!akun-latihan-tidak-untuk-login!",
            supabase_uid: null,
        })),
    );
    await isi("pengguna_posyandu", await get("pengguna_posyandu", "true"));
    await isi("periode", [
        { ...pe, sesi_ditutup_pada: null, sesi_ditutup_oleh: null },
    ]);
    const parents = await get("orang_tua", "id=ANY($1::bigint[])", [
        children.map((a) => a.orang_tua_id).filter(Boolean),
    ]);
    const parentMap = new Map(parents.map((r, i) => [r.id, base + i + 1]));
    await isi(
        "orang_tua",
        parents.map((r, i) => ({
            ...r,
            id: parentMap.get(r.id),
            nik: null,
            nama: r.nama,
            no_wa: null,
            id_keluarga: randomUUID(),
        })),
    );
    await isi(
        "anak",
        children.map((r, i) => ({
            ...r,
            id: base + i + 1,
            id_publik: randomUUID(),
            nik: `0099${String(meta.nomor).padStart(6, "0")}${String(i + 1).padStart(6, "0")}`,
            kode_kartu: `SIMPATIK:SASARAN:1:${r.id}:${String(r.nik ?? "").replace(/\D/g, "")}`,
            nama: r.nama,
            nama_baku: r.nama_baku,
            orang_tua_id: parentMap.get(r.orang_tua_id) ?? null,
            tgl_lahir: r.tgl_lahir,
            status: "aktif",
            deleted_at: null,
        })),
    );
    const sourceSasaran = await get(
        "sasaran",
        "periode_id=$1 AND status<>'batal'",
        [periodeId],
    );
    const childMap = new Map(children.map((a, i) => [a.id, base + i + 1]));
    await isi(
        "sasaran",
        sourceSasaran
            .filter((r) => childMap.has(r.anak_id))
            .map((r, i) => ({
                ...r,
                id: base + i + 1,
                anak_id: childMap.get(r.anak_id),
                import_batch_id: null,
                status: "menunggu",
                catatan: "Data latihan; bukan data pengukuran riil.",
                diselesaikan_pada: null,
                diselesaikan_oleh: null,
            })),
    );
    await db.query(
        `INSERT INTO ${s}.standar_lms OVERRIDING SYSTEM VALUE SELECT * FROM public.standar_lms`,
    );
    for (const fk of fks) {
        if (!tables.includes(fk.table_name) || !tables.includes(fk.ref_table))
            continue;
        const def = fk.def.replace(
            /REFERENCES\s+(?:public\.)?(?:"[^"]+"|\w+)\s*\(/,
            `REFERENCES ${s}.${kutip(fk.ref_table)} (`,
        );
        if (def === fk.def)
            throw new Error("Definisi FK tidak dapat diisolasi: " + fk.conname);
        await db.query(
            `ALTER TABLE ${s}.${kutip(fk.table_name)} ADD CONSTRAINT ${kutip(fk.conname)} ${def}`,
        );
    }
    // Sesi lain kedaluwarsa secara logis karena epoch berbeda. Pemulai tetap masuk.
    await db.query(
        "UPDATE public.sesi SET pelatihan_id=$2 WHERE ringkasan=$1",
        [tokenHash, id],
    );
    return {
        id,
        jumlah: children.length,
        periode: `${pe.tahun}-${String(pe.bulan).padStart(2, "0")}`,
    };
}

export async function hapusPelatihan(
    db: PoolClient,
    id: string,
    tokenHash: string,
) {
    await db.query("SELECT pg_advisory_xact_lock($1)", [KUNCI_PELATIHAN]);
    const aktif = await sesiAktif(db);
    if (!aktif || aktif.id !== id)
        throw new Error("Sesi pelatihan ini sudah tidak aktif.");
    await db.query(`DROP SCHEMA ${skemaAman(aktif.skema)} CASCADE`);
    // Semua token latihan dicabut kecuali pemulai yang dialihkan ke mode riil.
    await db.query(
        "DELETE FROM public.sesi WHERE pelatihan_id=$1 AND ringkasan<>$2",
        [id, tokenHash],
    );
    await db.query(
        "UPDATE public.sesi SET pelatihan_id=NULL WHERE ringkasan=$1",
        [tokenHash],
    );
    await db.query(
        "UPDATE public.pelatihan_sesi SET selesai_pada=now() WHERE id=$1",
        [id],
    );
}

/** Pengaman tambahan untuk antrean offline APK lama setelah latihan ditutup. */
export function mengandungIdentitasLatihan(value: unknown): boolean {
    if (typeof value === "number") return value >= BATAS_ID_LATIHAN;
    if (typeof value === "string")
        return (
            /^0099\d{12}$/.test(value) || /(?:^|\D)1\d{12}(?:\D|$)/.test(value)
        );
    if (Array.isArray(value)) return value.some(mengandungIdentitasLatihan);
    return (
        !!value &&
        typeof value === "object" &&
        Object.values(value).some(mengandungIdentitasLatihan)
    );
}
