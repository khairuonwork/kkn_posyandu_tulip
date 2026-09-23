/**
 * Autentikasi lewat HTTP, diuji terhadap server dan basis data sungguhan.
 *
 * Aturannya sudah teruji murni di `auth.test.ts`. Yang dibuktikan di sini hal
 * yang tidak dapat dibuktikan tanpa HTTP: cookie benar-benar dipasang dan
 * dihapus, sesi benar-benar dikenali permintaan berikutnya, dan — yang paling
 * menentukan — **menonaktifkan akun mematikan sesi yang sedang berjalan
 * seketika**.
 *
 * Tanpa pustaka uji HTTP: server dinyalakan di porta acak dan dipanggil dengan
 * `fetch` bawaan.
 */

import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { after, before, beforeEach, describe, test } from 'node:test';

import { hashKataSandi } from '../src/auth/kata-sandi.ts';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import { kosongkanBatas, MAKS_GAGAL } from '../src/http/batas-masuk.ts';
import { buatApp } from '../src/http/server.ts';

const adaDb = process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== '';

const SANDI = 'rahasia-uji-2026';
const EMAIL_BIDAN = 'bidan@uji-http.invalid';
const EMAIL_KADER = 'kader@uji-http.invalid';

describe(
    'autentikasi HTTP',
    { skip: adaDb ? false : 'DATABASE_URL tidak diatur — lihat server/.env.example' },
    () => {
        let server: Server;
        let akar: string;
        let idPosyandu: number;
        let idRt: number;

        const bersihkan = async () => {
            const pool = dapatkanPool();

            const { rows: pengguna } = await pool.query<{ id: number }>(
                "SELECT id FROM pengguna WHERE lower(email) LIKE '%@uji-http.invalid'",
            );

            await pool.query("DELETE FROM pengguna WHERE lower(email) LIKE '%@uji-http.invalid'");
            await pool.query('DELETE FROM wilayah_rt WHERE id = $1', [idRt]);
            await pool.query('DELETE FROM posyandu WHERE id = $1', [idPosyandu]);

            // Jejak audit dibersihkan **sesudah** fixture-nya dihapus: penghapusan
            // itu sendiri menulis baris audit, jadi membersihkannya lebih dulu
            // justru meninggalkan sisa.
            await pool.query(`DELETE FROM audit WHERE tabel = 'wilayah_rt' AND baris_id = $1`, [
                idRt,
            ]);
            await pool.query(
                `DELETE FROM audit WHERE tabel = 'pengguna' AND baris_id = ANY($1::bigint[])`,
                [pengguna.map((p) => p.id)],
            );
        };

        before(async () => {
            const pool = dapatkanPool();

            // Run yang terputus meninggalkan barisnya, dan run berikutnya mati
            // di unique constraint `slug` — 13 uji berhenti jalan tanpa satu
            // pun dilaporkan gagal. Dibersihkan di depan, bukan hanya di akhir.
            await pool.query(`DELETE FROM posyandu WHERE slug = 'uji-http'`);

            const { rows: pos } = await pool.query<{ id: number }>(
                `INSERT INTO posyandu (nama, slug) VALUES ('Uji HTTP', 'uji-http') RETURNING id`,
            );
            idPosyandu = pos[0].id;

            const { rows: rt } = await pool.query<{ id: number }>(
                `INSERT INTO wilayah_rt (posyandu_id, rt, rw) VALUES ($1, '07', '18') RETURNING id`,
                [idPosyandu],
            );
            idRt = rt[0].id;

            const hash = await hashKataSandi(SANDI);

            await pool.query(
                `INSERT INTO pengguna (nama, email, kata_sandi_hash, peran)
                 VALUES ('Bidan Uji', $1, $2, 'bidan')`,
                [EMAIL_BIDAN, hash],
            );
            await pool.query(
                `INSERT INTO pengguna (nama, email, kata_sandi_hash, peran, wilayah_rt_id)
                 VALUES ('Kader Uji', $1, $2, 'kader', $3)`,
                [EMAIL_KADER, hash, idRt],
            );

            server = buatApp(pool).listen(0);
            await new Promise((siap) => server.once('listening', siap));

            const alamat = server.address();
            assert.ok(alamat !== null && typeof alamat === 'object');
            akar = `http://127.0.0.1:${alamat.port}`;
        });

        after(async () => {
            await bersihkan();
            await new Promise((selesai) => server.close(selesai));
            await tutupPool();
        });

        beforeEach(() => {
            // Pembatas percobaan berumur satu proses; tanpa ini uji yang satu
            // mengunci uji berikutnya.
            kosongkanBatas();
        });

        const kirimMasuk = (email: string, kataSandi: string) =>
            fetch(`${akar}/api/masuk`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email, kataSandi }),
            });

        /** Nilai cookie sesi dari header `set-cookie`, siap dikirim balik. */
        const ambilCookie = (res: Response): string => {
            const set = res.headers.get('set-cookie');
            assert.ok(set !== null, 'tidak ada set-cookie');

            return set.split(';')[0];
        };

        test('masuk dengan kredensial benar memasang cookie httpOnly', async () => {
            const res = await kirimMasuk(EMAIL_BIDAN, SANDI);

            assert.equal(res.status, 200);

            const isi = (await res.json()) as { pengguna: { email: string; peran: string } };
            assert.equal(isi.pengguna.email, EMAIL_BIDAN);
            assert.equal(isi.pengguna.peran, 'bidan');

            const set = res.headers.get('set-cookie') ?? '';
            assert.match(set, /^sesi=/);
            assert.match(set, /HttpOnly/i);
            assert.match(set, /SameSite=Lax/i);
        });

        test('token tidak pernah muncul di badan jawaban', async () => {
            const res = await kirimMasuk(EMAIL_BIDAN, SANDI);
            const teks = await res.text();
            const token = ambilCookie(res).slice('sesi='.length);

            assert.ok(token.length > 20);
            assert.ok(!teks.includes(token), 'token bocor ke badan jawaban');
        });

        test('sesi dikenali permintaan berikutnya', async () => {
            const cookie = ambilCookie(await kirimMasuk(EMAIL_KADER, SANDI));
            const res = await fetch(`${akar}/api/saya`, { headers: { cookie } });

            assert.equal(res.status, 200);

            const isi = (await res.json()) as { pengguna: { peran: string; rt: string } };
            // RT binaan ikut terbawa dari wilayah_rt, bukan dari tabel pengguna.
            assert.equal(isi.pengguna.peran, 'kader');
            assert.equal(isi.pengguna.rt, '07');
        });

        test('kata sandi salah ditolak', async () => {
            const res = await kirimMasuk(EMAIL_BIDAN, 'sandi-yang-salah');

            assert.equal(res.status, 401);
            assert.equal(res.headers.get('set-cookie'), null);
        });

        test('email yang tidak ada ditolak dengan pesan yang sama', async () => {
            const tidakAda = await kirimMasuk('entah@uji-http.invalid', SANDI);
            const sandiSalah = await kirimMasuk(EMAIL_BIDAN, 'sandi-yang-salah');

            assert.equal(tidakAda.status, 401);

            // Pesannya tidak boleh membedakan "akun tidak ada" dari "sandi
            // salah" — pembeda itu memberi tahu penebak siapa saja yang punya
            // akun di Portal.
            assert.deepEqual(await tidakAda.json(), await sandiSalah.json());
        });

        test('tanpa cookie, /api/saya menolak', async () => {
            const res = await fetch(`${akar}/api/saya`);

            assert.equal(res.status, 401);
        });

        test('cookie palsu ditolak', async () => {
            const res = await fetch(`${akar}/api/saya`, {
                headers: { cookie: 'sesi=token-karangan-yang-panjang-sekali' },
            });

            assert.equal(res.status, 401);
        });

        test('menonaktifkan akun mematikan sesi yang sedang berjalan seketika', async () => {
            // Inilah alasan sesi disimpan di basis data dan bukan di dalam
            // token. Bila uji ini gagal, keputusan itu kehilangan seluruh
            // manfaatnya.
            const pool = dapatkanPool();
            const cookie = ambilCookie(await kirimMasuk(EMAIL_KADER, SANDI));

            assert.equal((await fetch(`${akar}/api/saya`, { headers: { cookie } })).status, 200);

            await pool.query('UPDATE pengguna SET aktif = false WHERE lower(email) = $1', [
                EMAIL_KADER,
            ]);

            assert.equal((await fetch(`${akar}/api/saya`, { headers: { cookie } })).status, 401);

            await pool.query('UPDATE pengguna SET aktif = true WHERE lower(email) = $1', [
                EMAIL_KADER,
            ]);
        });

        test('akun nonaktif tidak dapat masuk', async () => {
            const pool = dapatkanPool();

            await pool.query('UPDATE pengguna SET aktif = false WHERE lower(email) = $1', [
                EMAIL_BIDAN,
            ]);

            const res = await kirimMasuk(EMAIL_BIDAN, SANDI);

            assert.equal(res.status, 401);
            assert.equal(res.headers.get('set-cookie'), null);

            await pool.query('UPDATE pengguna SET aktif = true WHERE lower(email) = $1', [
                EMAIL_BIDAN,
            ]);
        });

        test('keluar mencabut sesi dan mengosongkan cookie', async () => {
            const cookie = ambilCookie(await kirimMasuk(EMAIL_BIDAN, SANDI));

            const keluar = await fetch(`${akar}/api/keluar`, {
                method: 'POST',
                headers: { cookie, 'content-type': 'application/json' },
            });

            assert.equal(keluar.status, 204);
            assert.match(keluar.headers.get('set-cookie') ?? '', /^sesi=;/);

            // Cookie lama tidak boleh berlaku lagi walau peramban menyimpannya.
            assert.equal((await fetch(`${akar}/api/saya`, { headers: { cookie } })).status, 401);
        });

        test('percobaan berulang ditahan dengan 429 dan Retry-After', async () => {
            for (let ke = 0; ke < MAKS_GAGAL; ke++) {
                const res = await kirimMasuk(EMAIL_BIDAN, 'salah-terus');

                assert.equal(res.status, 401, `percobaan ke-${ke + 1} seharusnya 401`);
            }

            const ditahan = await kirimMasuk(EMAIL_BIDAN, 'salah-terus');

            assert.equal(ditahan.status, 429);
            assert.ok(Number(ditahan.headers.get('retry-after')) > 0);

            // Kredensial yang benar pun ikut ditahan — kalau tidak, penahanan
            // hanya menunda penebak, bukan menghentikannya.
            assert.equal((await kirimMasuk(EMAIL_BIDAN, SANDI)).status, 429);
        });

        test('permintaan mutasi non-JSON ditolak 415', async () => {
            const res = await fetch(`${akar}/api/masuk`, {
                method: 'POST',
                headers: { 'content-type': 'application/x-www-form-urlencoded' },
                body: `email=${EMAIL_BIDAN}&kataSandi=${SANDI}`,
            });

            assert.equal(res.status, 415);
        });

        test('rute /api yang tidak ada menjawab 404 JSON', async () => {
            const res = await fetch(`${akar}/api/entah`);

            assert.equal(res.status, 404);
            assert.match(res.headers.get('content-type') ?? '', /application\/json/);
        });
    },
);
