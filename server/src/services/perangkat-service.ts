import type { Pool } from 'pg';
import type { PenggunaAktif } from '../auth/peran.ts';

export type HeartbeatPerangkat = {
    deviceId: string;
    namaPerangkat: string;
    jenisPerangkat: 'android' | 'web';
    versiAplikasi: string | null;
    modeKoneksi: 'online' | 'lokal' | 'tailscale' | 'tidak_diketahui';
    baterai: number | null;
    antreanTertunda: number;
};

export function bacaHeartbeat(body: unknown): HeartbeatPerangkat | null {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const b = body as Record<string, unknown>;
    if (typeof b.deviceId !== 'string' || !/^[a-zA-Z0-9@._:-]{3,128}$/.test(b.deviceId)) return null;
    if (b.namaPerangkat !== undefined && (typeof b.namaPerangkat !== 'string' || b.namaPerangkat.trim().length < 1 || b.namaPerangkat.trim().length > 100)) return null;
    if (b.versiAplikasi !== undefined && (typeof b.versiAplikasi !== 'string' || b.versiAplikasi.length > 40)) return null;
    if (b.jenisPerangkat !== undefined && !['android', 'web'].includes(String(b.jenisPerangkat))) return null;
    if (b.modeKoneksi !== undefined && !['online', 'lokal', 'tailscale', 'tidak_diketahui'].includes(String(b.modeKoneksi))) return null;
    if (b.baterai != null && (!Number.isInteger(b.baterai) || Number(b.baterai) < 0 || Number(b.baterai) > 100)) return null;
    if (b.antreanTertunda !== undefined && (!Number.isSafeInteger(b.antreanTertunda) || Number(b.antreanTertunda) < 0 || Number(b.antreanTertunda) > 1_000_000)) return null;
    return {
        deviceId: b.deviceId,
        namaPerangkat: typeof b.namaPerangkat === 'string' ? b.namaPerangkat.trim() : 'Perangkat Android',
        jenisPerangkat: b.jenisPerangkat === 'web' ? 'web' : 'android',
        versiAplikasi: typeof b.versiAplikasi === 'string' ? b.versiAplikasi : null,
        modeKoneksi: (b.modeKoneksi as HeartbeatPerangkat['modeKoneksi']) ?? 'tidak_diketahui',
        baterai: b.baterai == null ? null : Number(b.baterai),
        antreanTertunda: Number(b.antreanTertunda ?? 0),
    };
}

export function statusPerangkat(terakhirAktif: string, aktif = true, sekarang = Date.now()) {
    const detikLalu = Math.max(0, Math.floor((sekarang - new Date(terakhirAktif).getTime()) / 1000));
    const status = !aktif || detikLalu > 120 ? 'offline' : detikLalu > 45 ? 'idle' : 'online';
    return { status, detikLalu } as { status: 'online' | 'idle' | 'offline'; detikLalu: number };
}

export async function simpanHeartbeat(pool: Pool, pengguna: PenggunaAktif, ip: string, data: HeartbeatPerangkat) {
    const ids = pengguna.posyanduIds ?? [];
    // Akun lintas wilayah tidak dipaksa menjadi anggota RW tertentu.
    // Perangkat tanpa satu cakupan hanya tampil kepada super admin.
    if (!pengguna.superAdmin && ids.length !== 1) return false;
    const posyanduId = ids.length === 1 ? ids[0] : null;
    await pool.query(
        `INSERT INTO perangkat_posyandu
          (pengguna_id, device_id, posyandu_id, nama_perangkat, jenis,
           versi_aplikasi, ip, mode_koneksi, baterai, antrean_tertunda)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (pengguna_id,device_id) DO UPDATE SET
           posyandu_id=EXCLUDED.posyandu_id, nama_perangkat=EXCLUDED.nama_perangkat,
           jenis=EXCLUDED.jenis, versi_aplikasi=EXCLUDED.versi_aplikasi,
           ip=EXCLUDED.ip, mode_koneksi=EXCLUDED.mode_koneksi,
           baterai=EXCLUDED.baterai, antrean_tertunda=EXCLUDED.antrean_tertunda,
           terakhir_aktif=now()`,
        [pengguna.id, data.deviceId, posyanduId, data.namaPerangkat, data.jenisPerangkat,
            data.versiAplikasi, ip, data.modeKoneksi, data.baterai, data.antreanTertunda],
    );
    return true;
}

type BarisPerangkat = {
    id: string; deviceId: string; namaPerangkat: string; jenisPerangkat: string;
    versiAplikasi: string | null; ip: string; modeKoneksi: string; baterai: number | null;
    antreanTertunda: number; terakhirAktif: string; pertamaTerlihat: string;
    penggunaId: number; namaPengguna: string; username: string; peran: string;
    akunAktif: boolean; posyanduId: number | null; namaPosyandu: string | null; rw: string | null;
};

export async function daftarPerangkat(pool: Pool, pengguna: PenggunaAktif) {
    const scope = [pengguna.superAdmin ?? false, pengguna.posyanduIds ?? []];
    const { rows } = await pool.query<BarisPerangkat>(
        `SELECT d.pengguna_id::text || ':' || d.device_id AS id,
                d.device_id AS "deviceId", d.nama_perangkat AS "namaPerangkat",
                d.jenis AS "jenisPerangkat", d.versi_aplikasi AS "versiAplikasi",
                d.ip, d.mode_koneksi AS "modeKoneksi", d.baterai,
                d.antrean_tertunda AS "antreanTertunda",
                d.terakhir_aktif AS "terakhirAktif", d.pertama_terlihat AS "pertamaTerlihat",
                u.id::int AS "penggunaId", u.nama AS "namaPengguna", u.username,
                u.peran, u.aktif AS "akunAktif", p.id::int AS "posyanduId",
                p.nama AS "namaPosyandu", p.rw
           FROM perangkat_posyandu d JOIN pengguna u ON u.id=d.pengguna_id
           LEFT JOIN posyandu p ON p.id=d.posyandu_id
          WHERE ($1::boolean OR d.posyandu_id=ANY($2::bigint[]))
          ORDER BY p.rw NULLS LAST, d.terakhir_aktif DESC, d.device_id`, scope,
    );
    const { rows: posyandu } = await pool.query<{id: number; nama: string; rw: string | null}>(
        `SELECT id::int, nama, rw FROM posyandu
          WHERE ($1::boolean OR id=ANY($2::bigint[])) ORDER BY rw, nama`, scope,
    );
    return {
        daftarTablet: rows.map(row => ({ ...row, ...statusPerangkat(row.terakhirAktif, row.akunAktif) })),
        cakupan: { semuaPosyandu: pengguna.superAdmin ?? false, posyandu },
        waktuServer: new Date().toISOString(),
        batasOnlineDetik: 45,
        batasOfflineDetik: 120,
    };
}
