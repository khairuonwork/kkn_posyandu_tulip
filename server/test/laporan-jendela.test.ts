import assert from 'node:assert/strict';
import { test } from 'node:test';

import { perluRiwayatPenuh } from '../src/services/laporan-service.ts';

// Jendela 2025-11 s.d. 2026-11; keluaran memakai 2026-06 s.d. 2026-11.
const baris = (periodeId: string, jumlahTBerturut: number) => ({ periodeId, jumlahTBerturut });
const cek = (semua: ReturnType<typeof baris>[], arsip: { periodeLaporan: string; jumlahT: number }[] = []) =>
    perluRiwayatPenuh(semua, arsip, '2026-11', '2025-11');

test('rangkaian T pendek cukup dibaca dari jendela', () => {
    assert.equal(cek([baris('2026-11', 7), baris('2026-06', 0)]), false);
});

test('rangkaian T yang menyentuh awal jendela meminta seluruh riwayat', () => {
    assert.equal(cek([baris('2026-11', 12)]), true);
    assert.equal(cek([baris('2026-06', 7)]), true);
});

test('bulan di luar keluaran tidak memicu pembacaan ulang', () => {
    assert.equal(cek([baris('2026-05', 6)]), false);
});

test('status arsip yang panjang di bulan ini meminta seluruh riwayat', () => {
    assert.equal(cek([], [{ periodeLaporan: '2026-11', jumlahT: 12 }]), true);
    assert.equal(cek([], [{ periodeLaporan: '2026-10', jumlahT: 12 }]), false);
});
