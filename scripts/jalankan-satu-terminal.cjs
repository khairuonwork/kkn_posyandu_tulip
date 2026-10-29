const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runDir = path.join(root, '.qa-lan');
const manifestPath = path.join(runDir, 'services.json');
const [ip = 'localhost', apiPort = '4321', webPort = '5173'] = process.argv.slice(2);

fs.mkdirSync(runDir, { recursive: true });
const children = [];
let stopping = false;

function writeManifest() {
    fs.writeFileSync(manifestPath, JSON.stringify({
        manager: process.pid,
        services: children.map(({ name, child }) => ({ name, pid: child.pid })),
    }, null, 2));
}

function start(name, args, cwd, extraEnv = {}) {
    const child = spawn(process.execPath, args, {
        cwd,
        env: { ...process.env, ...extraEnv },
        stdio: 'inherit',
        windowsHide: false,
    });
    children.push({ name, child });
    child.once('spawn', writeManifest);
    child.once('error', (error) => {
        console.error(`[${name}] Gagal dijalankan: ${error.message}`);
        stop(1);
    });
    child.once('exit', (code, signal) => {
        if (!stopping) {
            console.log(`[${name}] Berhenti (kode ${code ?? signal ?? 'tidak diketahui'}).`);
            stop(code || 0);
        }
    });
}

function stop(exitCode = 0) {
    if (stopping) return;
    stopping = true;
    for (const { child } of children) {
        if (child.pid && child.exitCode === null && child.signalCode === null) {
            if (process.platform === 'win32') {
                spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
                    stdio: 'ignore',
                    windowsHide: true,
                });
            } else {
                child.kill('SIGTERM');
            }
        }
    }
    setTimeout(() => {
        try { fs.rmSync(manifestPath, { force: true }); } catch {}
        process.exit(exitCode);
    }, 700);
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

console.log(`Website lokal : http://${ip}:${webPort}`);
console.log(`REST API      : http://${ip}:${apiPort}/api/v1`);
console.log('Semua keluaran layanan tampil di terminal ini. Tekan Ctrl+C untuk menghentikan.\n');

start('API', [
    '--experimental-strip-types',
    '--env-file=.env',
    '--watch',
    'src/http/server.ts',
], path.join(root, 'server'), {
    HOST: '0.0.0.0',
    PORT: apiPort,
});

start('Website', [
    'node_modules/vite/bin/vite.js',
    '--host', '0.0.0.0',
    '--port', webPort,
    '--strictPort',
], path.join(root, 'client'), {
    API: `http://127.0.0.1:${apiPort}`,
});

writeManifest();
