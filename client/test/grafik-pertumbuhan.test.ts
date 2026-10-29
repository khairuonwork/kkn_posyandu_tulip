import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('dua periode pada umur yang sama tetap punya identitas dan label masing-masing', async () => {
    const vite = await createServer({
        root: fileURLToPath(new URL('../', import.meta.url)),
        server: { middlewareMode: true, hmr: false },
    });

    try {
        const {
            default: Grafik,
            susunTitik,
            SPEK,
        } = await vite.ssrLoadModule('/src/components/grafik-pertumbuhan.tsx');
        const { umurBulanPada } =
            await vite.ssrLoadModule('/src/lib/format.ts');
        const pengukuran = [
            {
                periodeId: '2026-08',
                tanggalUkur: '2026-08-08',
                bbKg: 15,
                z: 1.41,
            },
            {
                periodeId: '2026-07',
                tanggalUkur: '2026-07-11',
                bbKg: 14.7,
                z: 1.18,
            },
        ].map(({ z, ...p }) => ({
            ...p,
            anakId: 1,
            umurBulan: umurBulanPada('2024-02-09', p.tanggalUkur),
            tinggiCm: null,
            lilaCm: null,
            likaCm: null,
            ntob: null,
            statusKehadiran: 'hadir',
            catatanUkur: null,
            penilaian: { BB_U: { z, kategori: 'Normal', tidakWajar: false } },
        }));
        const titik = susunTitik(pengukuran, SPEK[0]);
        assert.deepEqual(
            titik.map((t: { umur: number }) => t.umur),
            [29, 29],
        );
        assert.deepEqual(
            titik.map((t: { periodeId: string }) => t.periodeId),
            ['2026-07', '2026-08'],
        );

        const props = {
            kelamin: 'P',
            nama: 'Contoh',
            umurBalita: 32,
            keterangan: 'Data uji',
            pengukuran,
            standar: Array.from({ length: 13 }, (_, i) => ({
                indeks: 'BB_U',
                jk: 'P',
                kunci: 24 + i,
                l: 1,
                m: 13,
                s: 0.1,
            })),
        };
        const html = renderToStaticMarkup(createElement(Grafik, props));
        // Kedua label tetap terlihat, dengan sisi yang berbeda agar tidak bertumpuk.
        assert.match(
            html,
            /<text[^>]*text-anchor="end"[^>]*>\+1,18 SD<\/text>/,
        );
        assert.match(
            html,
            /<text[^>]*text-anchor="start"[^>]*>\+1,41 SD<\/text>/,
        );
        assert.equal((html.match(/role="button"/g) ?? []).length, 2);

        const september = {
            ...pengukuran[0],
            periodeId: '2026-09',
            tanggalUkur: '2026-09-12',
            umurBulan: 31,
            bbKg: 15.1,
        };
        const garisBalita = (markup: string) =>
            markup.match(
                /<polyline[^>]*stroke="#16211C"[^>]*stroke-width="3\.2"[^>]*>/g,
            ) ?? [];
        const tersambung = renderToStaticMarkup(
            createElement(Grafik, {
                ...props,
                pengukuran: [...pengukuran, september],
            }),
        );
        // Agustus umur 29 dan September umur 31 tetap disambung karena periodenya berurutan.
        assert.equal(garisBalita(tersambung).length, 1);
        const terputus = renderToStaticMarkup(
            createElement(Grafik, {
                ...props,
                pengukuran: [pengukuran[1], { ...september, umurBulan: 30 }],
            }),
        );
        // Juli–September tetap dipisah walaupun umur genap hanya berbeda satu bulan.
        assert.equal(garisBalita(terputus).length, 2);
    } finally {
        await vite.close();
    }
});
