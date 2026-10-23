// Menunggu API dan website siap (tanpa PowerShell).
// Pemakaian: node scripts/tunggu-siap.cjs <portApi> <portWeb> [detik=60]
// Keluar 0 bila keduanya siap, 1 bila waktu habis.
const [portApi, portWeb, detik = "60"] = process.argv.slice(2);
const batas = Date.now() + Number(detik) * 1000;

async function siap() {
    try {
        const k = await fetch(`http://127.0.0.1:${portApi}/api/v1/kesehatan`, {
            signal: AbortSignal.timeout(2000),
        });
        if (!k.ok || (await k.json()).status !== "siap") return false;

        const w = await fetch(`http://127.0.0.1:${portWeb}`, {
            signal: AbortSignal.timeout(2000),
        });
        return w.status === 200;
    } catch {
        return false;
    }
}

(async () => {
    while (Date.now() < batas) {
        if (await siap()) process.exit(0);
        await new Promise((r) => setTimeout(r, 700));
    }
    process.exit(1);
})();
