import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import {
    catatBerhasil,
    catatGagal,
    kosongkanBatas,
    MAKS_GAGAL,
    MAKS_GAGAL_JARINGAN,
    sisaTahanan,
} from '../src/http/batas-masuk.ts';

const IP_BERSAMA = '203.0.113.10';
const USER = 'kader tulip';
const SEKARANG = 1_800_000_000_000;

afterEach(() => kosongkanBatas());

describe('pembatas percobaan login lintas perangkat', () => {
    test('kegagalan satu tablet tidak mengunci tablet lain di jaringan yang sama', () => {
        for (let i = 0; i < MAKS_GAGAL; i += 1) {
            catatGagal(USER, IP_BERSAMA, 'tablet-kader-01', SEKARANG + i);
        }

        assert.ok(sisaTahanan(USER, IP_BERSAMA, 'tablet-kader-01', SEKARANG + 10) > 0);
        assert.equal(sisaTahanan(USER, IP_BERSAMA, 'tablet-kader-03', SEKARANG + 10), 0);
    });

    test('batas jaringan tetap menahan percobaan yang tersebar ke banyak ID perangkat', () => {
        for (const perangkat of ['tablet-satu', 'tablet-dua', 'tablet-tiga']) {
            for (let i = 0; i < MAKS_GAGAL; i += 1) {
                catatGagal(USER, IP_BERSAMA, perangkat, SEKARANG + i);
            }
        }

        assert.ok(sisaTahanan(USER, IP_BERSAMA, 'tablet-lain', SEKARANG + 10) > 0);
        assert.equal(MAKS_GAGAL_JARINGAN, MAKS_GAGAL * 3);
    });

    test('login berhasil menghapus tahanan jaringan untuk akun tersebut', () => {
        for (const perangkat of ['tablet-satu', 'tablet-dua', 'tablet-tiga']) {
            for (let i = 0; i < MAKS_GAGAL; i += 1) {
                catatGagal(USER, IP_BERSAMA, perangkat, SEKARANG + i);
            }
        }
        assert.ok(sisaTahanan(USER, IP_BERSAMA, 'tablet-kader-03', SEKARANG + 10) > 0);

        catatBerhasil(USER, IP_BERSAMA, 'tablet-kader-03');

        assert.equal(sisaTahanan(USER, IP_BERSAMA, 'tablet-kader-03', SEKARANG + 10), 0);
    });
});
