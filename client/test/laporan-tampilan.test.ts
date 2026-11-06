import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('laporan modular mempertahankan umur, navigasi 2T, dan izin kedua unduhan', async () => {
    const vite = await createServer({
        root: fileURLToPath(new URL('../', import.meta.url)),
        server: { middlewareMode: true, hmr: false },
    });

    try {
        const { default: Laporan } = await vite.ssrLoadModule(
            '/src/pages/laporan/laporan-live.tsx',
        );
        const row = {
            anakId: 1,
            nama: 'Anak QA',
            jk: 'P',
            rt: '01',
            periodeId: '2026-10',
            umurLengkap: '2Thn9Bln9Hari',
            tanggalUkur: '2026-10-10',
            bbKg: 12,
            tinggiCm: 85,
            penilaian: {},
            nt: 'T',
            jumlahTBerturut: 2,
            duaT: true,
            status2T: '2T',
            kenaikanGram: 100,
            kbmGram: 200,
        };
        const data = {
            periode: '2026-10',
            standar: ['PERMENKES-2-2020'],
            ringkasan: { anakDiukur: 1, denganDuaT: 1 },
            bulanan: [row],
            riwayat2T: [row],
        };
        const props = {
            periode: { id: '2026-10', label: 'Oktober 2026' },
            laporan: {
                status: 'siap',
                data,
                unduh: async () => {},
                muatUlang: () => {},
            },
            wilayahRt: ['01'],
            alamat: '/laporan',
        };
        const terbatas = renderToStaticMarkup(
            createElement(Laporan, { ...props, bolehUnduh: false }),
        );
        assert.match(terbatas, /Anak QA/);
        assert.match(terbatas, /2 thn 9 bln 9 hari/);
        const tombolTerbatas = (
            terbatas.match(/<button\b[\s\S]*?<\/button>/g) ?? []
        ).join('');
        assert.doesNotMatch(
            tombolTerbatas,
            /Unduh F1 Excel|Excel Z-score &amp; 2T/,
        );
        const berizin = renderToStaticMarkup(
            createElement(Laporan, { ...props, bolehUnduh: true }),
        );
        assert.match(berizin, /Unduh F1 Excel/);
        assert.match(berizin, /Excel Z-score &amp; 2T/);
        const riwayat = renderToStaticMarkup(
            createElement(Laporan, {
                ...props,
                bolehUnduh: false,
                alamat: '/laporan?tab=2t',
            }),
        );
        assert.match(riwayat, /Status KIA/);
        assert.match(riwayat, /2 thn 9 bln/);
        assert.doesNotMatch(riwayat, /2 thn 9 bln 9 hari/);
    } finally {
        await vite.close();
    }
});
