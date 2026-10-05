import assert from 'node:assert/strict';
import { test } from 'node:test';
import { penilaianLayak, terbaruUntuk } from '../src/lib/penilaian-utama.ts';
import type { Pengukuran, Periode } from '../src/types/posyandu.ts';

const juni: Periode = {
    id: '2026-06',
    label: 'Juni 2026',
    tanggalKegiatan: '2026-06-13',
};

function ukur(periodeId: string, tanggalUkur: string, bbKg = 12): Pengukuran {
    return {
        anakId: 289,
        periodeId,
        tanggalUkur,
        umurBulan: 36,
        bbKg,
        tinggiCm: 95,
        lilaCm: null,
        likaCm: null,
        ntob: null,
        statusKehadiran: 'hadir',
        catatanUkur: null,
        penilaian: {},
    };
}

test('riwayat November tidak menjadi status utama Juni', () => {
    assert.equal(terbaruUntuk([ukur('2025-11', '2025-11-08')], juni), null);
});

test('hasil terbaru dalam periode aktif dipakai walau tanggal acara bergeser', () => {
    const padaHari = ukur('2026-06', '2026-06-13');
    const sesudahHari = ukur('2026-06', '2026-06-20');
    assert.equal(
        terbaruUntuk(
            [padaHari, ukur('2025-11', '2025-11-08'), sesudahHari],
            juni,
        ),
        sesudahHari,
    );
});

test('indeks tidak wajar tidak menjadi keputusan, arsip tetap utuh', () => {
    const nilai = { z: 11.35, kategori: 'Obesitas', tidakWajar: true };
    assert.equal(penilaianLayak(nilai), undefined);
    assert.equal(nilai.z, 11.35);
});
