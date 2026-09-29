/**
 * Kelola akun: aturan isian tanpa basis data, lalu endpoint `/api/pengguna`
 * terhadap server dan PostgreSQL sungguhan.
 *
 * Bagian HTTP berjalan di skema sementara yang dimigrasi dari nol, bukan di
 * basis data pengembangan. Aturan "admin aktif terakhir" bergantung pada
 * seluruh isi tabel `pengguna`; di basis data yang sudah berisi akun lain,
 * hasilnya akan berubah menurut siapa yang kebetulan ada di sana.
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { after, before, beforeEach, describe, test } from 'node:test';
import pg from 'pg';

import { bacaIsianAkun } from '../src/auth/akun.ts';
import { hashKataSandi } from '../src/auth/kata-sandi.ts';
import '../src/db/pool.ts';
import { kosongkanBatas } from '../src/http/batas-masuk.ts';
import { buatApp } from '../src/http/server.ts';

describe('aturan isian akun', () => {
    const lengkap = {
        nama: ' Kader Baru ',
        // Huruf besar dan spasi dari papan ketik tablet dirapikan.
        username: ' Kader.Baru ',
        peran: 'kader',
        rt: '03',
        kataSandi: 'rahasia-panjang',
    };

    test('akun baru yang lengkap dibersihkan', () => {
        assert.deepEqual(bacaIsianAkun(lengkap), {
            isian: {
                nama: 'Kader Baru',
                username: 'kader.baru',
                peran: 'kader',
                rt: '03',
                aktif: true,
            },
            kataSandi: 'rahasia-panjang',
        });
    });

    test('akun baru wajib punya kata sandi awal yang cukup panjang', () => {
        assert.deepEqual(bacaIsianAkun({ ...lengkap, kataSandi: '' }), {
            galat: 'Kata sandi awal wajib diisi.',
        });
        assert.deepEqual(bacaIsianAkun({ ...lengkap, kataSandi: 'pendek' }), {
            galat: 'Kata sandi minimal 8 karakter.',
        });
    });

    test('kader wajib punya RT; peran lain tidak menyimpan RT', () => {
        assert.deepEqual(bacaIsianAkun({ ...lengkap, rt: '' }), {
            galat: 'Kader wajib punya RT binaan.',
        });

        const bidan = bacaIsianAkun({ ...lengkap, peran: 'bidan' });

        assert.ok('isian' in bidan);
        assert.equal(bidan.isian.rt, null);
    });

    test('nama pengguna dan peran yang tidak sah ditolak', () => {
        for (const username of ['kader 01', 'kader01@posyandutulip.id', 'ab', 'x'.repeat(33)]) {
            assert.ok('galat' in bacaIsianAkun({ ...lengkap, username }), username);
        }

        assert.ok('galat' in bacaIsianAkun({ ...lengkap, peran: 'superadmin' }));
        assert.ok('galat' in bacaIsianAkun(null));
    });

    test('pada perubahan, kolom yang tidak dikirim tetap, dan sandi kosong berarti tetap', () => {
        const lama = {
            nama: 'Kader RT 01',
            username: 'kader01',
            peran: 'kader' as const,
            rt: '01',
            aktif: true,
        };

        assert.deepEqual(bacaIsianAkun({ aktif: false, kataSandi: '' }, lama), {
            isian: { ...lama, aktif: false },
            kataSandi: null,
        });
        // Kader yang dinaikkan menjadi bidan melepas RT binaannya.
        assert.deepEqual(bacaIsianAkun({ peran: 'bidan' }, lama), {
            isian: { ...lama, peran: 'bidan', rt: null },
            kataSandi: null,
        });
    });
});

const adaDb = Boolean(process.env.DATABASE_URL);

const SANDI = 'rahasia-uji-2026';
const USERNAME_ADMIN = 'uji.admin';
const USERNAME_BIDAN = 'uji.bidan';

describe(
    'kelola akun lewat HTTP',
    { skip: adaDb ? false : 'DATABASE_URL tidak diatur — lihat server/.env.example' },
    () => {
        const skema = `uji_pengguna_${randomUUID().replaceAll('-', '')}`;
        let induk: pg.Pool;
        let pool: pg.Pool;
        let server: Server;
        let akar: string;
        let idAdmin: number;
        let idBidan: number;
        let cookieAdmin: string;

        before(async () => {
            induk = new pg.Pool({ connectionString: process.env.DATABASE_URL });
            await induk.query(`CREATE SCHEMA ${skema}`);
            pool = new pg.Pool({
                connectionString: process.env.DATABASE_URL,
                options: `-c search_path=${skema}`,
            });

            const folder = new URL('../db/migrations/', import.meta.url);

            for (const nama of readdirSync(folder).filter((n) => n.endsWith('.sql')).sort()) {
                await pool.query(readFileSync(new URL(nama, folder), 'utf8'));
            }

            const { rows: pos } = await pool.query<{ id: number }>(
                `INSERT INTO posyandu (nama, slug, rw, kelurahan)
                 VALUES ('Uji Pengguna', 'uji-pengguna', '18', 'Citeureup') RETURNING id`,
            );
            await pool.query(
                `INSERT INTO wilayah_rt (posyandu_id, rt, rw) VALUES ($1, '01', '18')`,
                [pos[0].id],
            );

            const hash = await hashKataSandi(SANDI);
            const buat = async (nama: string, username: string, peran: string) =>
                (
                    await pool.query<{ id: number }>(
                        `INSERT INTO pengguna (nama, username, kata_sandi_hash, peran)
                         VALUES ($1, $2, $3, $4) RETURNING id`,
                        [nama, username, hash, peran],
                    )
                ).rows[0].id;

            idAdmin = await buat('Admin Uji', USERNAME_ADMIN, 'admin');
            idBidan = await buat('Bidan Uji', USERNAME_BIDAN, 'bidan');

            server = buatApp(pool).listen(0);
            await new Promise((siap) => server.once('listening', siap));

            const alamat = server.address();
            assert.ok(alamat !== null && typeof alamat === 'object');
            akar = `http://127.0.0.1:${alamat.port}`;
            cookieAdmin = await masuk(USERNAME_ADMIN, SANDI);
        });

        after(async () => {
            await new Promise((selesai) => server?.close(selesai));
            await pool?.end();

            if (induk !== undefined) {
                await induk.query(`DROP SCHEMA ${skema} CASCADE`);
                await induk.end();
            }
        });

        beforeEach(() => {
            kosongkanBatas();
        });

        /** Cookie sesi siap kirim, atau '' bila masuk ditolak. */
        async function masuk(username: string, kataSandi: string): Promise<string> {
            const res = await fetch(`${akar}/api/masuk`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ username, kataSandi }),
            });

            return res.ok ? (res.headers.get('set-cookie') ?? '').split(';')[0] : '';
        }

        const kirim = (metode: string, jalan: string, cookie: string, badan?: unknown) =>
            fetch(`${akar}${jalan}`, {
                method: metode,
                headers: { cookie, 'content-type': 'application/json' },
                body: badan === undefined ? undefined : JSON.stringify(badan),
            });

        const saya = async (cookie: string) =>
            (await fetch(`${akar}/api/saya`, { headers: { cookie } })).status;

        test('tanpa masuk ditolak, dan selain admin ditolak', async () => {
            assert.equal((await fetch(`${akar}/api/pengguna`)).status, 401);

            const cookieBidan = await masuk(USERNAME_BIDAN, SANDI);

            assert.equal((await kirim('GET', '/api/pengguna', cookieBidan)).status, 403);
            assert.equal(
                (
                    await kirim('POST', '/api/pengguna', cookieBidan, {
                        nama: 'Coba',
                        username: 'uji.coba',
                        peran: 'admin',
                        kataSandi: SANDI,
                    })
                ).status,
                403,
            );
        });

        test('nama pengguna saat masuk tidak peka huruf besar dan spasi di ujung', async () => {
            assert.notEqual(await masuk(` ${USERNAME_ADMIN.toUpperCase()} `, SANDI), '');
        });

        test('admin melihat daftar akun tanpa hash kata sandi', async () => {
            const res = await kirim('GET', '/api/pengguna', cookieAdmin);
            const teks = await res.text();

            assert.equal(res.status, 200);
            assert.ok(!teks.includes('scrypt$') && !teks.includes('kata_sandi'), 'hash bocor');

            const isi = JSON.parse(teks) as {
                pengguna: { username: string; peran: string }[];
                wilayahRt: string[];
            };

            assert.deepEqual(
                isi.pengguna.map((p) => p.username),
                [USERNAME_ADMIN, USERNAME_BIDAN],
            );
            assert.deepEqual(isi.wilayahRt, ['01']);
        });

        test('akun baru bisa langsung masuk dan tercatat di audit atas nama admin', async () => {
            const res = await kirim('POST', '/api/pengguna', cookieAdmin, {
                nama: 'Kader Baru',
                username: 'kader.baru',
                peran: 'kader',
                rt: '01',
                kataSandi: SANDI,
            });

            assert.equal(res.status, 201);

            const { pengguna } = (await res.json()) as {
                pengguna: { id: number; rt: string; aktif: boolean };
            };

            assert.equal(pengguna.rt, '01');
            assert.equal(pengguna.aktif, true);
            assert.notEqual(await masuk('kader.baru', SANDI), '');

            const { rows } = await pool.query<{ pengguna_id: number; sumber: string }>(
                `SELECT pengguna_id, sumber FROM audit
                  WHERE tabel = 'pengguna' AND baris_id = $1 ORDER BY id LIMIT 1`,
                [pengguna.id],
            );

            assert.deepEqual(rows[0], { pengguna_id: idAdmin, sumber: 'aplikasi' });
        });

        test('isian yang tidak sah ditolak dengan alasannya', async () => {
            const dasar = {
                nama: 'Kader Lain',
                username: 'kader.lain',
                peran: 'kader',
                rt: '01',
                kataSandi: SANDI,
            };
            const galat = async (badan: unknown) => {
                const res = await kirim('POST', '/api/pengguna', cookieAdmin, badan);

                return { status: res.status, ...((await res.json()) as { galat: string }) };
            };

            assert.deepEqual(await galat({ ...dasar, rt: '' }), {
                status: 400,
                galat: 'Kader wajib punya RT binaan.',
            });
            assert.deepEqual(await galat({ ...dasar, rt: '09' }), {
                status: 400,
                galat: 'RT 09 belum ada di data wilayah.',
            });
            assert.deepEqual(await galat({ ...dasar, kataSandi: 'pendek' }), {
                status: 400,
                galat: 'Kata sandi minimal 8 karakter.',
            });
            assert.deepEqual(await galat({ ...dasar, username: 'kader lain' }), {
                status: 400,
                galat: 'Nama pengguna 3–32 karakter tanpa spasi: huruf, angka, titik, garis bawah, atau tanda hubung. Contoh: kader01.',
            });
            // Huruf besar tetap dianggap nama pengguna yang sama.
            assert.deepEqual(await galat({ ...dasar, username: USERNAME_BIDAN.toUpperCase() }), {
                status: 409,
                galat: 'Nama pengguna ini sudah dipakai akun lain.',
            });
        });

        test('menonaktifkan akun mencabut sesinya dan menolak masuk berikutnya', async () => {
            const { rows } = await pool.query<{ id: number }>(
                `SELECT id FROM pengguna WHERE username = 'kader.baru'`,
            );
            const cookieKader = await masuk('kader.baru', SANDI);

            assert.equal(await saya(cookieKader), 200);

            const res = await kirim('PATCH', `/api/pengguna/${rows[0].id}`, cookieAdmin, {
                aktif: false,
            });

            assert.equal(res.status, 200);
            assert.equal(await saya(cookieKader), 401);
            assert.equal(await masuk('kader.baru', SANDI), '');

            const { rows: sesi } = await pool.query('SELECT 1 FROM sesi WHERE pengguna_id = $1', [
                rows[0].id,
            ]);

            assert.equal(sesi.length, 0);
        });

        test('mengganti kata sandi mencabut sesi lama', async () => {
            const cookieBidan = await masuk(USERNAME_BIDAN, SANDI);
            const baru = 'sandi-baru-bidan-2026';

            const res = await kirim('PATCH', `/api/pengguna/${idBidan}`, cookieAdmin, {
                kataSandi: baru,
            });

            assert.equal(res.status, 200);
            assert.equal(await saya(cookieBidan), 401);
            assert.equal(await masuk(USERNAME_BIDAN, SANDI), '');
            assert.notEqual(await masuk(USERNAME_BIDAN, baru), '');
        });

        test('mengubah peran mencabut sesi, termasuk sesi admin yang mengubah perannya sendiri', async () => {
            const buat = async (username: string, peran: string) => {
                const res = await kirim('POST', '/api/pengguna', cookieAdmin, {
                    nama: `Uji ${peran}`,
                    username,
                    peran,
                    rt: '01',
                    kataSandi: SANDI,
                });

                return ((await res.json()) as { pengguna: { id: number } }).pengguna.id;
            };

            const idKader = await buat('kader.peran', 'kader');
            const cookieKader = await masuk('kader.peran', SANDI);

            assert.equal(
                (await kirim('PATCH', `/api/pengguna/${idKader}`, cookieAdmin, { peran: 'bidan' }))
                    .status,
                200,
            );
            assert.equal(await saya(cookieKader), 401);

            const idAdminLain = await buat('admin.lain', 'admin');
            const cookieAdminLain = await masuk('admin.lain', SANDI);

            assert.equal(
                (
                    await kirim('PATCH', `/api/pengguna/${idAdminLain}`, cookieAdminLain, {
                        peran: 'bidan',
                    })
                ).status,
                200,
            );
            assert.equal(await saya(cookieAdminLain), 401);
        });

        test('admin aktif terakhir tidak bisa diturunkan atau dinonaktifkan', async () => {
            const ditolak = {
                galat: 'Admin aktif terakhir tidak bisa diturunkan perannya maupun dinonaktifkan.',
            };

            for (const badan of [{ peran: 'bidan' }, { aktif: false }]) {
                const res = await kirim('PATCH', `/api/pengguna/${idAdmin}`, cookieAdmin, badan);

                assert.equal(res.status, 409);
                assert.deepEqual(await res.json(), ditolak);
            }

            // Dengan admin aktif kedua, menonaktifkan salah satunya boleh —
            // lalu yang tersisa kembali menjadi admin terakhir.
            const kedua = await kirim('POST', '/api/pengguna', cookieAdmin, {
                nama: 'Admin Kedua',
                username: 'admin2',
                peran: 'admin',
                kataSandi: SANDI,
            });
            const { pengguna } = (await kedua.json()) as { pengguna: { id: number } };

            assert.equal(
                (await kirim('PATCH', `/api/pengguna/${pengguna.id}`, cookieAdmin, { aktif: false }))
                    .status,
                200,
            );
            assert.equal(
                (await kirim('PATCH', `/api/pengguna/${idAdmin}`, cookieAdmin, { peran: 'bidan' }))
                    .status,
                409,
            );
        });

        test('admin yang mengganti kata sandinya sendiri tetap masuk; sesi lainnya dicabut', async () => {
            const sesiLain = await masuk(USERNAME_ADMIN, SANDI);
            const baru = 'sandi-baru-admin-2026';

            const res = await kirim('PATCH', `/api/pengguna/${idAdmin}`, cookieAdmin, {
                kataSandi: baru,
            });

            assert.equal(res.status, 200);
            assert.equal(await saya(cookieAdmin), 200);
            assert.equal(await saya(sesiLain), 401);
            assert.notEqual(await masuk(USERNAME_ADMIN, baru), '');
        });

        test('akun yang tidak ada menjawab 404', async () => {
            assert.equal((await kirim('PATCH', '/api/pengguna/999999', cookieAdmin, {})).status, 404);
            assert.equal((await kirim('PATCH', '/api/pengguna/abc', cookieAdmin, {})).status, 404);
        });
    },
);
