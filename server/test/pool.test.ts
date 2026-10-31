import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import pg from 'pg';

import { dapatkanPool, tutupPool } from '../src/db/pool.ts';

test('pool mengantre saat penuh, memakai ulang koneksi, dan melepas semuanya saat ditutup', async () => {
    const urlSebelumnya = process.env.DATABASE_URL;
    const maksimumSebelumnya = process.env.DB_POOL_MAX;
    process.env.DB_POOL_MAX = '3';
    process.env.DATABASE_URL = 'postgres://uji:uji@127.0.0.1:1/uji';
    // Simulasikan sambungan driver; antrean dan pelepasan memakai pg-pool asli.
    const connect = mock.method(pg.Client.prototype, 'connect', function (callback: () => void) {
        queueMicrotask(callback);
    });
    const end = mock.method(pg.Client.prototype, 'end', function (callback?: () => void) {
        if (callback) queueMicrotask(callback);
    });
    const pool = dapatkanPool();
    const klien: pg.PoolClient[] = [];
    try {
        klien.push(...await Promise.all([pool.connect(), pool.connect(), pool.connect()]));
        const berikutnya = pool.connect();
        assert.equal(pool.waitingCount, 1);
        assert.equal(connect.mock.callCount(), 3);

        const pertama = klien.shift()!;
        pertama.release();
        const dipakaiUlang = await berikutnya;
        klien.push(dipakaiUlang);
        assert.equal(dipakaiUlang, pertama);
        assert.equal(pool.waitingCount, 0);
        assert.equal(connect.mock.callCount(), 3);

        for (const client of klien.splice(0)) client.release();
        const log = mock.method(console, 'warn', () => {});
        try {
            const sebelum = pool.totalCount;
            const galat = Object.assign(new Error('password-rahasia-jangan-dicetak'), { code: 'EHOSTUNREACH' });
            dipakaiUlang.emit('error', galat);
            assert.equal(pool.totalCount, sebelum - 1, 'klien idle rusak dikeluarkan dari pool');
            assert.equal(log.mock.callCount(), 1);
            assert.match(JSON.stringify(log.mock.calls[0].arguments), /EHOSTUNREACH/);
            assert.doesNotMatch(JSON.stringify(log.mock.calls[0].arguments), /password-rahasia/);
            const pengganti = await pool.connect();
            assert.notEqual(pengganti, dipakaiUlang);
            pengganti.release();
        } finally {
            log.mock.restore();
        }
        await tutupPool();
        assert.equal(pool.totalCount, 0);
        assert.equal(end.mock.callCount(), 3);
    } finally {
        for (const client of klien) client.release(true);
        await tutupPool();
        connect.mock.restore();
        end.mock.restore();
        if (urlSebelumnya === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = urlSebelumnya;
        if (maksimumSebelumnya === undefined) delete process.env.DB_POOL_MAX;
        else process.env.DB_POOL_MAX = maksimumSebelumnya;
    }
});

test('konfigurasi pool yang tidak valid ditolak sebelum membuka sambungan', () => {
    const url = process.env.DATABASE_URL;
    const max = process.env.DB_POOL_MAX;
    process.env.DATABASE_URL = 'postgres://uji:uji@127.0.0.1:1/uji';
    try {
        for (const nilai of ['0', '3.5', 'abc', '51']) {
            process.env.DB_POOL_MAX = nilai;
            assert.throws(() => dapatkanPool(), /DB_POOL_MAX/);
        }
    } finally {
        if (url === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = url;
        if (max === undefined) delete process.env.DB_POOL_MAX;
        else process.env.DB_POOL_MAX = max;
    }
});
