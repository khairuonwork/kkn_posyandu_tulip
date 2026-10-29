// Membuat server/.env berisi DATABASE_URL Supabase (pengganti setup-supabase-env.ps1).
// Pemakaian: node scripts/buat-env-supabase.cjs
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const tujuan = path.join(__dirname, "..", "server", ".env");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let sembunyi = false;
const tulisAsli = rl._writeToOutput.bind(rl);
rl._writeToOutput = (teks) => { if (!sembunyi) tulisAsli(teks); };

rl.question("Masukkan Database Password Supabase (input disembunyikan): ", (sandi) => {
    rl.close();
    console.log();
    if (sandi === "") {
        console.error("Kata sandi kosong, dibatalkan.");
        process.exit(1);
    }
    const url = `postgresql://postgres.ptcelfakgdodpvmsurtp:${encodeURIComponent(sandi)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
    fs.writeFileSync(tujuan, `DATABASE_URL=${url}\n`, "utf8");
    console.log("server/.env berhasil dibuat. Kata sandi tidak ditampilkan dan file tidak masuk Git.");
});
sembunyi = true;
