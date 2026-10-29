export function modeKoneksi(host: string): 'online' | 'lokal' | 'tailscale' {
    const nama = host.toLowerCase().replace(/^\[|\]$/g, '');
    const ip = nama.split('.').map(Number);

    if (
        nama.endsWith('.ts.net') ||
        (ip.length === 4 && ip[0] === 100 && ip[1] >= 64 && ip[1] <= 127)
    ) {
        return 'tailscale';
    }

    if (
        nama === 'localhost' ||
        nama.endsWith('.local') ||
        nama.endsWith('.localhost') ||
        nama === '::1' ||
        /^(?:fc|fd)[0-9a-f]{2}:|^fe[89ab][0-9a-f]:/.test(nama) ||
        (ip.length === 4 &&
            (ip[0] === 127 ||
                ip[0] === 10 ||
                (ip[0] === 192 && ip[1] === 168) ||
                (ip[0] === 172 && ip[1] >= 16 && ip[1] <= 31))) ||
        (!nama.includes('.') && !nama.includes(':'))
    ) {
        return 'lokal';
    }

    return 'online';
}

let idSementara: string | null = null;

/** Hanya dipasang oleh Portal yang sudah memiliki sesi, bukan oleh layar login/demo. */
export function mulaiHeartbeatWeb(): () => void {
    let id = idSementara ?? ('web-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)));

    try {
        id =
            localStorage.getItem('SIMPATIK_WEB_DEVICE_ID') ||
            id;
        localStorage.setItem('SIMPATIK_WEB_DEVICE_ID', id);
    } catch { /* HTTP LAN/private browsing tetap dapat melapor dengan ID memori. */ }

    idSementara = id;

    const ua = navigator.userAgent;
    const platform = /Android/i.test(ua)
        ? 'Android'
        : /iPhone|iPad/i.test(ua)
          ? 'iOS'
          : /Windows/i.test(ua)
            ? 'Windows'
            : /Macintosh/i.test(ua)
              ? 'macOS'
              : 'komputer';
    let berhenti = false;
    let aktif: AbortController | null = null;
    const laporkan = async () => {
        if (berhenti || aktif) {
            return;
        }

        aktif = new AbortController();
        const timer = setTimeout(() => aktif?.abort(), 5000);

        try {
            await fetch('/api/v1/heartbeat', {
                method: 'POST',
                credentials: 'same-origin',
                signal: aktif.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId: id,
                    namaPerangkat: `Browser ${platform}`,
                    jenisPerangkat: 'web',
                    versiAplikasi: 'portal-web',
                    modeKoneksi: modeKoneksi(location.hostname),
                    antreanTertunda: 0,
                }),
            });
        } catch {
            /* Daftar status menampilkan laporan terakhir saat jaringan terputus. */
        } finally {
            clearTimeout(timer);
            aktif = null;
        }
    };
    const periksa = () => {
        void laporkan();
    };
    void laporkan();
    const timer = setInterval(periksa, 15000);
    window.addEventListener('online', periksa);

    return () => {
        berhenti = true;
        clearInterval(timer);
        aktif?.abort();
        window.removeEventListener('online', periksa);
    };
}
