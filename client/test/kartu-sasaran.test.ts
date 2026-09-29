/**
 * Format kartu balita. Pemindai Android v1.6 membaca format yang sama, jadi
 * perubahan apa pun di sini harus disengaja.
 */

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
    bacaIdKartuSasaran,
    kodeKartuSasaran,
    payloadKartuSasaran,
} from '../src/lib/kartu-sasaran.ts';

describe('kartu balita', () => {
    test('kode pendek dari id, delapan digit', () => {
        assert.equal(kodeKartuSasaran({ id: 110 }), 'SPT-00000110');
    });

    test('payload QR membawa id dan NIK berupa angka saja', () => {
        assert.equal(
            payloadKartuSasaran({ id: 110, nik: '3277 5149 2153 4050' }),
            'SIMPATIK:SASARAN:1:110:3277514921534050',
        );
        assert.equal(
            payloadKartuSasaran({ id: 7, nik: null }),
            'SIMPATIK:SASARAN:1:7:',
        );
    });

    test('payload dan kode pendek terbaca kembali menjadi id', () => {
        assert.equal(
            bacaIdKartuSasaran(payloadKartuSasaran({ id: 110, nik: '327' })),
            '110',
        );
        assert.equal(bacaIdKartuSasaran('SIMPATIK:SASARAN:1:7:'), '7');
        assert.equal(bacaIdKartuSasaran('SPT-00000110'), '110');
        assert.equal(bacaIdKartuSasaran(' spt - 0000 0110 '), '110');
    });

    test('format lain ditolak', () => {
        assert.equal(bacaIdKartuSasaran('SIMPATIK:SASARAN:2:110:327'), null);
        assert.equal(bacaIdKartuSasaran('3277514921534050'), null);
        assert.equal(bacaIdKartuSasaran('Adzkia'), null);
    });
});
