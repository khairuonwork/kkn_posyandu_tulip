/**
 * Konfigurasi server — satu-satunya tempat yang membaca variabel lingkungan
 * untuk urusan jaringan dan berkas statis.
 *
 * Saat dipublikasikan ke server, cukup atur variabel lingkungan (HOST, PORT,
 * TRUST_PROXY, WEB_DIST, NODE_ENV). Tidak ada kode lain yang perlu diubah.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 4321, bukan 3000.
 *
 * Port 3000 adalah port pengembangan paling ramai di mesin mana pun, dan pada
 * Windows tabrakannya tidak berbunyi: proses kedua tetap dapat mengikat port
 * yang sama, mengaku siap, lalu permintaan mendarat di aplikasi yang lain.
 */
const PORTA_BAWAAN = 4321;
const PORTA_WEB_BAWAAN = 5173;

/**
 * Bawaannya 127.0.0.1. Untuk QA satu jaringan (mulai.bat) HOST disetel
 * 0.0.0.0 agar tablet dapat menjangkaunya lewat IP PC.
 */
const ALAMAT_BAWAAN = "127.0.0.1";

const AKAR_PROYEK = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
);

function bacaPorta(nilai: string | undefined, bawaan: number, nama: string): number {
    if (nilai === undefined || nilai.trim() === "") return bawaan;

    const porta = Number(nilai);
    if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
        throw new Error(`${nama} tidak valid: "${nilai}".`);
    }
    return porta;
}

export interface KonfigurasiServer {
    /** "production" bila dijalankan sebagai server publik. */
    produksi: boolean;
    porta: number;
    alamat: string;
    /** Porta Vite; hanya dipakai layanan discovery tablet. */
    portaWeb: number;
    /** Nilai `trust proxy` Express: "loopback", jumlah hop, atau daftar IP. */
    trustProxy: string | number | boolean;
    /** Folder hasil `vite build` yang disajikan Express bila ada. */
    folderWeb: string;
}

function bacaTrustProxy(nilai: string | undefined): string | number | boolean {
    if (nilai === undefined || nilai.trim() === "") return "loopback";
    if (nilai === "true") return true;
    if (nilai === "false") return false;
    if (/^\d+$/.test(nilai)) return Number(nilai);
    return nilai;
}

export function muatKonfigurasi(
    env: NodeJS.ProcessEnv = process.env,
): KonfigurasiServer {
    const alamat = (env.HOST ?? ALAMAT_BAWAAN).trim();
    if (alamat === "") {
        throw new Error("HOST tidak boleh kosong.");
    }

    return {
        produksi: env.NODE_ENV === "production",
        porta: bacaPorta(env.PORT, PORTA_BAWAAN, "PORT"),
        alamat,
        portaWeb: bacaPorta(env.PORT_WEB, PORTA_WEB_BAWAAN, "PORT_WEB"),
        trustProxy: bacaTrustProxy(env.TRUST_PROXY),
        folderWeb: path.resolve(
            AKAR_PROYEK,
            env.WEB_DIST ?? "client/dist",
        ),
    };
}
