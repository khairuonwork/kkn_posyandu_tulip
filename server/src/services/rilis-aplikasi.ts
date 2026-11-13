/**
 * Rilis APK Android yang disajikan sendiri oleh server (bukan Google Play).
 *
 * Folder rilis berisi berkas APK dan `manifest.json`. Manifest hanya ditulis
 * oleh `terbitkanRilis` (dipanggil skrip `npm run rilis:apk` atau endpoint
 * superadmin) setelah checksum dihitung dari berkas yang benar-benar ada.
 */

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export type ManifestRilis = {
    versionCode: number;
    versionName: string;
    /** Versi di bawah ini wajib memperbarui; popup tidak dapat ditutup. */
    minVersionCode: number;
    berkas: string;
    sha256: string;
    ukuran: number;
    catatan: string;
    diterbitkan: string;
};

export const POLA_BERKAS = /^[A-Za-z0-9._-]{1,120}\.apk$/;

export function folderRilis(env: NodeJS.ProcessEnv = process.env): string {
    const dari = env.RILIS_APK_DIR?.trim();
    return path.resolve(dari || path.join(os.homedir(), "simpatik-rilis", "android"));
}

export async function bacaManifest(folder: string): Promise<ManifestRilis | null> {
    try {
        const isi = JSON.parse(await readFile(path.join(folder, "manifest.json"), "utf8"));
        return validasiManifest(isi);
    } catch (galat) {
        if ((galat as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw galat;
    }
}

function validasiManifest(isi: unknown): ManifestRilis {
    const m = isi as Partial<ManifestRilis>;
    if (
        !Number.isSafeInteger(m.versionCode) || (m.versionCode as number) < 1 ||
        !Number.isSafeInteger(m.minVersionCode) || (m.minVersionCode as number) < 0 ||
        (m.minVersionCode as number) > (m.versionCode as number) ||
        typeof m.versionName !== "string" || m.versionName.trim() === "" ||
        typeof m.berkas !== "string" || !POLA_BERKAS.test(m.berkas) ||
        typeof m.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(m.sha256) ||
        !Number.isSafeInteger(m.ukuran) || (m.ukuran as number) < 1
    ) {
        throw new Error("manifest.json rilis APK tidak valid.");
    }
    return {
        versionCode: m.versionCode as number,
        versionName: m.versionName.trim(),
        minVersionCode: m.minVersionCode as number,
        berkas: m.berkas,
        sha256: m.sha256,
        ukuran: m.ukuran as number,
        catatan: typeof m.catatan === "string" ? m.catatan.slice(0, 2000) : "",
        diterbitkan: typeof m.diterbitkan === "string" ? m.diterbitkan : new Date(0).toISOString(),
    };
}

export async function sha256Berkas(berkas: string): Promise<string> {
    const hash = createHash("sha256");
    for await (const potongan of createReadStream(berkas)) hash.update(potongan as Buffer);
    return hash.digest("hex");
}

export type MasukanRilis = {
    versionCode: number;
    versionName: string;
    minVersionCode?: number;
    berkas: string;
    catatan?: string;
};

/** Menulis manifest baru secara atomik untuk berkas APK yang sudah ada di folder rilis. */
export async function terbitkanRilis(folder: string, masukan: MasukanRilis): Promise<ManifestRilis> {
    if (!POLA_BERKAS.test(masukan.berkas)) throw new RangeError("Nama berkas APK tidak valid.");
    const lokasi = path.join(folder, masukan.berkas);
    const info = await stat(lokasi).catch(() => null);
    if (!info?.isFile()) throw new RangeError(`Berkas ${masukan.berkas} tidak ada di folder rilis.`);
    const lama = await bacaManifest(folder).catch(() => null);
    if (lama && masukan.versionCode < lama.versionCode) {
        throw new RangeError(`versionCode ${masukan.versionCode} lebih rendah dari rilis aktif ${lama.versionCode}.`);
    }
    const manifest = validasiManifest({
        versionCode: masukan.versionCode,
        versionName: masukan.versionName,
        minVersionCode: masukan.minVersionCode ?? 0,
        berkas: masukan.berkas,
        sha256: await sha256Berkas(lokasi),
        ukuran: info.size,
        catatan: masukan.catatan ?? "",
        diterbitkan: new Date().toISOString(),
    });
    await mkdir(folder, { recursive: true });
    const sementara = path.join(folder, `.manifest-${process.pid}-${Date.now()}.json`);
    await writeFile(sementara, JSON.stringify(manifest, null, 2), { mode: 0o644 });
    await rename(sementara, path.join(folder, "manifest.json"));
    return manifest;
}
