const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runDir = path.join(root, '.qa-lan');
const manifestPath = path.join(runDir, 'services.json');

function stopTree(pid) {
    if (!Number.isInteger(pid) || pid <= 0) return;
    try {
        execFileSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
        });
    } catch {}
}

if (fs.existsSync(manifestPath)) {
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        for (const service of manifest.services ?? []) stopTree(service.pid);
        stopTree(manifest.manager);
    } catch (error) {
        console.error(`Tidak dapat membaca daftar proses SIMPATIK: ${error.message}`);
    }
    try { fs.rmSync(manifestPath, { force: true }); } catch {}
}

// Bersihkan jendela layanan dari versi BAT lama jika masih aktif.
for (const title of [
    'SIMPATIK-API*',
    'SIMPATIK-WEB*',
    'SIMPATIK Posyandu - Mulai Server*',
]) {
    try {
        execFileSync('taskkill.exe', ['/FI', `WINDOWTITLE eq ${title}`, '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
        });
    } catch {}
}

console.log('Proses API dan website SIMPATIK dihentikan.');
