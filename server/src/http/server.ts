/**
 * Titik masuk server HTTP.
 *
 *     npm run dev     — pengembangan, memuat ulang saat berkas berubah
 *     npm run mulai   — menjalankan apa adanya
 *
 * Perakitan rute ada di app.ts, pembacaan konfigurasi di ../config.ts.
 */

import { dapatkanPool, tutupPool } from "../db/pool.ts";
import { muatKonfigurasi } from "../config.ts";
import { buatApp } from "./app.ts";
import { mulaiLayananDiscovery } from "./discovery.ts";

const konfigurasi = muatKonfigurasi();
const { porta, alamat } = konfigurasi;

const server = buatApp(dapatkanPool(), konfigurasi).listen(porta, alamat, () => {
    console.log(`Server siap di http://${alamat}:${porta}`);
    // Server publik hanya melayani HTTPS melalui proxy. Jangan menyiarkan
    // alamat jaringan VM atau membuka UDP discovery pada host produksi.
    if (!konfigurasi.produksi) {
        mulaiLayananDiscovery(porta, konfigurasi.portaWeb);
    }
});

server.on("error", (galat: NodeJS.ErrnoException) => {
    if (galat.code === "EADDRINUSE") {
        console.error(
            `Porta ${porta} sudah dipakai proses lain. Setel PORT di server/.env ke porta lain.`,
        );
        process.exit(1);
    }

    throw galat;
});

// Penghentian rapi untuk Docker/systemd/PM2 saat dipublikasikan.
for (const sinyal of ["SIGINT", "SIGTERM"] as const) {
    process.on(sinyal, () => {
        console.log(`Menerima ${sinyal}, server berhenti.`);
        server.close(() => {
            tutupPool().then(
                () => process.exit(0),
                (galat) => {
                    console.error('Gagal menutup pool database:', galat);
                    process.exit(1);
                },
            );
        });
        setTimeout(() => process.exit(0), 5000).unref();
    });
}
