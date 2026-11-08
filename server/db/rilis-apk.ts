/**
 * Menerbitkan APK baru untuk pembaruan otomatis di tablet/HP.
 *
 *     npm run rilis:apk -- --apk ~/SIMPATIK-1.14.0-debug.apk --versi-kode 36 \
 *         --versi-nama 1.14.0 --min 34 --catatan "Perbaikan antrean"
 *
 * APK disalin ke folder rilis (RILIS_APK_DIR, bawaan ~/simpatik-rilis/android),
 * checksum dihitung, lalu manifest.json ditulis. --min menandai versi yang
 * wajib diperbarui (popup tidak bisa ditutup); bawaan 0 = tidak wajib.
 * versionCode harus sama dengan versionCode di app/build.gradle.kts.
 */

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { folderRilis, terbitkanRilis } from "../src/services/rilis-aplikasi.ts";

const { values } = parseArgs({
    options: {
        apk: { type: "string" },
        "versi-kode": { type: "string" },
        "versi-nama": { type: "string" },
        min: { type: "string" },
        catatan: { type: "string" },
    },
});

const kode = Number(values["versi-kode"]);
const nama = values["versi-nama"]?.trim() ?? "";
if (!values.apk || !Number.isSafeInteger(kode) || kode < 1 || !/^[0-9A-Za-z.+-]{1,40}$/.test(nama)) {
    console.error("Pakai: npm run rilis:apk -- --apk <berkas.apk> --versi-kode <angka> --versi-nama <x.y.z> [--min <angka>] [--catatan <teks>]");
    process.exit(1);
}

const folder = folderRilis();
const berkas = `SIMPATIK-${nama}-${kode}.apk`;
await mkdir(folder, { recursive: true });
await copyFile(path.resolve(values.apk), path.join(folder, berkas));
const manifest = await terbitkanRilis(folder, {
    versionCode: kode,
    versionName: nama,
    minVersionCode: values.min === undefined ? 0 : Number(values.min),
    berkas,
    catatan: values.catatan ?? "",
});
console.log(`Rilis ${manifest.versionName} (${manifest.versionCode}) aktif di ${folder}`);
console.log(`SHA-256 ${manifest.sha256} · ${(manifest.ukuran / 1048576).toFixed(1)} MB · wajib di bawah versi ${manifest.minVersionCode}`);
