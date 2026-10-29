import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mulaiHeartbeatWeb, modeKoneksi } from '../src/lib/perangkat.ts';

test('koneksi Cloudflare dan LAN tidak saling tertukar', () => {
    assert.equal(modeKoneksi('pediatric-lung-hiking-pills.trycloudflare.com'), 'online');
    assert.equal(modeKoneksi('192.168.6.7'), 'lokal');
    assert.equal(modeKoneksi('172.31.2.4'), 'lokal');
    assert.equal(modeKoneksi('172.32.2.4'), 'online');
    assert.equal(modeKoneksi('simpatik.tail123.ts.net'), 'tailscale');
});

test('heartbeat tetap berjalan pada HTTP LAN tanpa randomUUID atau localStorage', async (t) => {
    const nama = ['crypto', 'localStorage', 'navigator', 'window', 'location'];
    const lama = new Map(nama.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    t.after(() => {
        for (const key of nama) {
            const descriptor = lama.get(key);
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    });
    Object.defineProperties(globalThis, {
        crypto: {configurable:true,value:{}},
        localStorage: {configurable:true,value:{getItem(){throw Error('Penyimpanan dibatasi');}}},
        navigator: {configurable:true,value:{userAgent:'Browser uji Windows'}},
        window: {configurable:true,value:{addEventListener(){},removeEventListener(){}}},
        location: {configurable:true,value:{hostname:'192.168.6.7'}},
    });
    const laporan: Record<string, unknown>[] = [];
    t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
        laporan.push(JSON.parse(String(init?.body)));
        return new Response(null,{status:200});
    });
    const berhenti = mulaiHeartbeatWeb();
    try {
        await Promise.resolve();
        assert.equal(laporan.length,1);
        assert.match(String(laporan[0].deviceId), /^web-[a-z0-9-]+$/);
        assert.equal(laporan[0].modeKoneksi,'lokal');
        assert.equal(laporan[0].jenisPerangkat,'web');
        assert.equal(laporan[0].posyanduId,undefined);
    } finally { berhenti(); }
});
