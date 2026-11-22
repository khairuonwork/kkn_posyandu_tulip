import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NextFunction, Request, Response } from 'express';

import { bacaIsianAkun } from '../src/auth/akun.ts';
import type { PenggunaAktif } from '../src/auth/peran.ts';
import { tolakKaderWeb, wajibLihatDataWeb } from '../src/http/middleware.ts';

function jalankan(
    penjaga: (req: Request, res: Response, next: NextFunction) => void,
    pengguna: PenggunaAktif,
    bearer = false,
): number {
    let status = 200;
    const req = { pengguna, headers: bearer ? { authorization: 'Bearer x' } : {} } as unknown as Request;
    const res = { status: (s: number) => { status = s; return { json: () => undefined }; } } as unknown as Response;
    penjaga(req, res, () => undefined);
    return status;
}

const kader = (bolehLihatData: boolean): PenggunaAktif => ({ id: 1, peran: 'kader', rt: '01', aktif: true, bolehLihatData });

test('kader web tanpa centang ditolak, dengan centang boleh, tablet tidak terpengaruh', () => {
    assert.equal(jalankan(wajibLihatDataWeb, kader(false)), 403);
    assert.equal(jalankan(wajibLihatDataWeb, kader(true)), 200);
    assert.equal(jalankan(wajibLihatDataWeb, kader(false), true), 200);
    assert.equal(jalankan(wajibLihatDataWeb, { id: 2, peran: 'bidan', rt: null, aktif: true }), 200);
});

test('kader web tidak boleh mengubah data meski bercentang; tablet dan bidan boleh', () => {
    assert.equal(jalankan(tolakKaderWeb, kader(true)), 403);
    assert.equal(jalankan(tolakKaderWeb, kader(true), true), 200);
    assert.equal(jalankan(tolakKaderWeb, { id: 2, peran: 'bidan', rt: null, aktif: true }), 200);
});

test('centang izin hanya tersimpan untuk kader/KMS dan dipertahankan bila tidak dikirim', () => {
    const baru = bacaIsianAkun({ nama: 'K', username: 'kader09', peran: 'kader', rt: '01', kataSandi: 'rahasia-uji-2026', bolehLihatData: true });
    assert.ok('isian' in baru && baru.isian.bolehLihatData === true);
    const bidan = bacaIsianAkun({ nama: 'B', username: 'bidan09', peran: 'bidan', kataSandi: 'rahasia-uji-2026', bolehLihatData: true });
    assert.ok('isian' in bidan && bidan.isian.bolehLihatData === false);
    const kms = bacaIsianAkun({ nama: 'M', username: 'kms09', peran: 'kms', kataSandi: 'rahasia-uji-2026', bolehLihatData: true });
    assert.ok('isian' in kms && kms.isian.bolehLihatData === true);
    const tetap = bacaIsianAkun({ nama: 'K2' }, { nama: 'K', username: 'kader09', peran: 'kader', rt: '01', aktif: true, bolehLihatData: true });
    assert.ok('isian' in tetap && tetap.isian.bolehLihatData === true);
});
