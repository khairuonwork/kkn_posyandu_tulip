import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('respons gagal unduhan diteruskan ke pemanggil untuk kedua format', async () => {
    const vite = await createServer({
        root: fileURLToPath(new URL('../', import.meta.url)),
        server: { middlewareMode: true, hmr: false },
    });
    const fetchAsli = globalThis.fetch;
    try {
        const { useLaporanServer } = await vite.ssrLoadModule('/src/lib/laporan.ts');
        let unduh: ((format: 'zscore' | 'f1') => Promise<void>) | undefined;
        function Uji() {
            unduh = useLaporanServer('2026-01', false, () => {}).unduh;
            return null;
        }
        renderToStaticMarkup(createElement(Uji));
        const alamat: string[] = [];
        globalThis.fetch = async (input) => {
            alamat.push(String(input));
            return new Response(JSON.stringify({ galat: 'Simulasi gagal' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        };
        assert.ok(unduh);
        await assert.rejects(unduh('zscore'), /Simulasi gagal/);
        await assert.rejects(unduh('f1'), /Simulasi gagal/);
        assert.deepEqual(alamat, [
            '/api/v1/laporan/unduh?periode=2026-01',
            '/api/v1/laporan/f1/unduh?periode=2026-01',
        ]);
    } finally {
        globalThis.fetch = fetchAsli;
        await vite.close();
    }
});
