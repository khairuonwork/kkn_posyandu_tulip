// Mencetak alamat IPv4 LAN terbaik untuk PC ini (tanpa PowerShell).
// Pemakaian: node scripts/ip-lan.cjs   -> mencetak satu IP, keluar 1 bila tidak ada.
const os = require("node:os");

const ABAIKAN = /(vmware|virtualbox|vethernet|wsl|hyper-v|docker|loopback|tailscale|zerotier|vpn)/i;

function skor(nama, alamat) {
    if (alamat.startsWith("192.168.")) return 3;
    if (alamat.startsWith("10.")) return 2;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(alamat)) return 1;
    return 0;
}

const calon = [];
for (const [nama, daftar] of Object.entries(os.networkInterfaces())) {
    if (ABAIKAN.test(nama)) continue;
    for (const a of daftar ?? []) {
        if (a.family !== "IPv4" || a.internal) continue;
        if (a.address.startsWith("169.254.")) continue;
        calon.push({ alamat: a.address, skor: skor(nama, a.address) });
    }
}

calon.sort((a, b) => b.skor - a.skor);

if (calon.length === 0) process.exit(1);
console.log(calon[0].alamat);
