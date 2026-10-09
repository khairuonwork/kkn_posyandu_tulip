/**
 * Layanan Penemuan Server Otomatis (Zero-Config LAN Discovery) & Heartbeat Tablet.
 *
 * Menggunakan protokol UDP Broadcast pada porta 43210.
 * Ketika tablet Android berpindah Wi-Fi/Hotspot (misal dari HP A ke HP B),
 * tablet menyiarkan paket probe, dan modul ini merespons dengan alamat IP & porta
 * aktif server pada jaringan tersebut. Dengan demikian, tablet dapat langsung
 * menemukan dan terhubung ke server tanpa perlu memasukkan IP manual.
 */

import dgram from 'node:dgram';
import os from 'node:os';

export const PORTA_DISCOVERY_BAWAAN = 43210;

export interface InfoTablet {
    deviceId: string;
    namaPerangkat: string;
    versiAplikasi?: string;
    ip: string;
    baterai?: number | null;
    antreanTertunda?: number;
    terakhirAktif: string;
    detikLalu: number;
    status: 'online' | 'idle';
}

const catatanTablet = new Map<string, {
    deviceId: string;
    namaPerangkat: string;
    versiAplikasi?: string;
    ip: string;
    baterai?: number | null;
    antreanTertunda?: number;
    waktuAktif: number;
}>();

/** Mendapatkan seluruh IPv4 non-internal milik PC saat ini. */
export function dapatkanDaftarIpLokal(): string[] {
    const hasil: string[] = [];
    const interfaces = os.networkInterfaces();

    for (const nama of Object.keys(interfaces)) {
        const daftar = interfaces[nama];
        if (!daftar) continue;
        for (const info of daftar) {
            if (info.family === 'IPv4' && !info.internal) {
                // Hindari alamat APIPA Windows 169.254.x.x jika ada alamat lain
                hasil.push(info.address);
            }
        }
    }

    // Urutkan alamat: prioritaskan 192.168.x.x, 10.x.x.x, 172.16-31.x.x
    hasil.sort((a, b) => {
        const skora = a.startsWith('192.168.') ? 3 : a.startsWith('10.') ? 2 : a.startsWith('172.') ? 1 : 0;
        const skorb = b.startsWith('192.168.') ? 3 : b.startsWith('10.') ? 2 : b.startsWith('172.') ? 1 : 0;
        return skorb - skora;
    });

    return hasil;
}

let socketUdp: dgram.Socket | null = null;
let timerBeacon: NodeJS.Timeout | null = null;

export function mulaiLayananDiscovery(portaApi: number, portaWeb: number, portaDiscovery = PORTA_DISCOVERY_BAWAAN): void {
    if (socketUdp) {
        return; // Sudah berjalan
    }

    try {
        const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        socket.on('error', (err) => {
            console.warn('[Discovery] Galat soket UDP:', err.message);
        });

        socket.on('message', (pesan, rinfo) => {
            const teks = pesan.toString('utf-8').trim();

            // Cek apakah pesan adalah permintaan pencarian server dari tablet
            const isDiscover = teks.includes('SIMPATIK_DISCOVER') ||
                teks.includes('"cmd":"DISCOVER"') ||
                teks.includes('"action":"discover"');

            if (isDiscover) {
                const daftarIp = dapatkanDaftarIpLokal();
                const balasan = JSON.stringify({
                    layanan: 'simpatik-posyandu',
                    status: 'aktif',
                    portaApi,
                    jalurApi: '/api/v1',
                    portaWeb,
                    ipLokal: daftarIp[0] ?? rinfo.address,
                    daftarIp,
                    namaHost: os.hostname(),
                    waktu: new Date().toISOString()
                });

                const bufferBalasan = Buffer.from(balasan, 'utf-8');
                socket.send(bufferBalasan, 0, bufferBalasan.length, rinfo.port, rinfo.address, (err) => {
                    if (err) {
                        console.warn(`[Discovery] Gagal membalas ke ${rinfo.address}:${rinfo.port}:`, err.message);
                    }
                });
            }
        });

        socket.bind(portaDiscovery, '0.0.0.0', () => {
            try {
                socket.setBroadcast(true);
            } catch {
                // Ignore jika setBroadcast tidak didukung
            }
            console.log(`[Discovery] Layanan Auto-Discovery aktif pada UDP 0.0.0.0:${portaDiscovery}`);
        });

        socketUdp = socket;

        // Kirim beacon periodik setiap 5 detik ke subnet lokal
        timerBeacon = setInterval(() => {
            if (!socketUdp) return;
            const daftarIp = dapatkanDaftarIpLokal();
            const beacon = JSON.stringify({
                layanan: 'simpatik-posyandu',
                peristiwa: 'beacon',
                portaApi,
                jalurApi: '/api/v1',
                portaWeb,
                ipLokal: daftarIp[0] ?? '127.0.0.1',
                daftarIp
            });
            const buffer = Buffer.from(beacon, 'utf-8');
            socketUdp.send(buffer, 0, buffer.length, portaDiscovery, '255.255.255.255', () => {
                // Ignore broadcast send errors (e.g. interface unrouted)
            });
        }, 5000);

    } catch (galat) {
        console.warn('[Discovery] Tidak dapat memulai socket UDP discovery:', (galat as Error).message);
    }
}

export function hentikanLayananDiscovery(): void {
    if (timerBeacon) {
        clearInterval(timerBeacon);
        timerBeacon = null;
    }
    if (socketUdp) {
        try {
            socketUdp.close();
        } catch {
            // Abaikan
        }
        socketUdp = null;
    }
}

/** Mencatat detak jantung (heartbeat) dari tablet yang terhubung */
export function catatHeartbeatTablet(ipPemanggil: string, payload: {
    deviceId?: string;
    namaPerangkat?: string;
    versiAplikasi?: string;
    baterai?: number | null;
    antreanTertunda?: number;
}): void {
    const ipBersih = ipPemanggil.replace(/^.*:/, ''); // Hapus format IPv6 loopback jika ada
    const idDikirim = payload.deviceId?.trim();
    // Versi aplikasi lama memakai satu ID konstan di semua tablet. Selama
    // perangkat belum diperbarui, pisahkan berdasarkan IP lokal pengirim.
    const idLamaBersama = idDikirim === 'tablet-posyandu';
    const deviceId = idLamaBersama
        ? `${idDikirim}@${ipBersih}`
        : (idDikirim || `tablet-${ipBersih}`);
    const namaDikirim = payload.namaPerangkat?.trim();
    const nama = idLamaBersama
        ? `${namaDikirim || 'Tablet Posyandu Tulip'} (${ipBersih})`
        : (namaDikirim || `Tablet (${ipBersih})`);

    catatanTablet.set(deviceId, {
        deviceId,
        namaPerangkat: nama,
        versiAplikasi: payload.versiAplikasi,
        ip: ipBersih,
        baterai: payload.baterai,
        antreanTertunda: payload.antreanTertunda,
        waktuAktif: Date.now()
    });
}

/** Mendapatkan daftar tablet yang aktif dalam 45 detik terakhir */
export function ambilDaftarTabletAktif(): InfoTablet[] {
    const sekarang = Date.now();
    const hasil: InfoTablet[] = [];

    for (const [id, item] of catatanTablet.entries()) {
        const selisihDetik = Math.round((sekarang - item.waktuAktif) / 1000);
        if (selisihDetik > 60) {
            // Hapus yang sudah tidak aktif lebih dari 60 detik
            catatanTablet.delete(id);
            continue;
        }

        hasil.push({
            deviceId: item.deviceId,
            namaPerangkat: item.namaPerangkat,
            versiAplikasi: item.versiAplikasi,
            ip: item.ip,
            baterai: item.baterai,
            antreanTertunda: item.antreanTertunda,
            terakhirAktif: new Date(item.waktuAktif).toISOString(),
            detikLalu: selisihDetik,
            status: selisihDetik <= 20 ? 'online' : 'idle'
        });
    }

    return hasil;
}
