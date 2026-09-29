/**
 * Penjaga seed contoh: akun berkata sandi seragam tidak boleh sampai ke
 * basis data selain milik mesin sendiri.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { databaseLokal } from '../db/seed-contoh.ts';

test('seed contoh hanya mau berjalan di basis data lokal', () => {
    assert.equal(databaseLokal('postgres://posyandu:posyandu@127.0.0.1:5433/posyandu_tulip'), true);
    assert.equal(databaseLokal('postgres://u:p@localhost:5432/db'), true);
    assert.equal(databaseLokal('postgres://u:p@[::1]:5433/db'), true);

    assert.equal(databaseLokal('postgres://u:p@db.posyandutulip.id:5432/db'), false);
    assert.equal(databaseLokal('postgres://u:p@10.0.0.5:5432/db'), false);
    assert.equal(databaseLokal('postgres://u:p@localhost.contoh.id/db'), false);
    assert.equal(databaseLokal('host=localhost dbname=posyandu_tulip'), false);
    assert.equal(databaseLokal(''), false);
});
