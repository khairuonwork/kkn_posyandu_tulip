import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import pg from 'pg';

import '../src/db/pool.ts';
import { dalamTransaksi } from '../src/db/transaksi.ts';
import { buatApp } from '../src/http/server.ts';

const adaDb = Boolean(process.env.DATABASE_URL);

describe('audit PostgreSQL', { skip: adaDb ? false : 'DATABASE_URL tidak diatur' }, () => {
    const skema = `uji_audit_${randomUUID().replaceAll('-', '')}`;
    let admin: pg.Pool;
    let pool: pg.Pool;
    let pelaku: number;

    before(async () => {
        admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
        await admin.query(`CREATE SCHEMA ${skema}`);
        // Satu koneksi memaksa reuse: kebocoran identitas tidak bisa tersamarkan.
        pool = new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            options: `-c search_path=${skema}`,
            max: 1,
            connectionTimeoutMillis: 3000,
        });
        for (const nama of [
            '001_skema_awal.sql',
            '002_pengguna_dan_sesi.sql',
            '003_updated_at_dan_nik_terhapus.sql',
        ]) {
            await pool.query(
                readFileSync(new URL(`../db/migrations/${nama}`, import.meta.url), 'utf8'),
            );
        }
        await pool.query("INSERT INTO orang_tua (nama) VALUES ('Data sebelum audit')");
        await pool.query(
            readFileSync(new URL('../db/migrations/004_audit.sql', import.meta.url), 'utf8'),
        );
        const akun = await pool.query(
            "INSERT INTO pengguna (nama, email, kata_sandi_hash, peran) VALUES ('Pelaku', 'pelaku@audit.invalid', 'hash-rahasia', 'admin') RETURNING id",
        );
        pelaku = akun.rows[0].id;
        const lama = (
            await pool.query("SELECT * FROM audit WHERE tabel = 'pengguna' AND baris_id = $1", [
                pelaku,
            ])
        ).rows[0];
        assert.equal(lama.sesudah.kata_sandi_hash, 'hash-rahasia');
        await pool.query(
            readFileSync(
                new URL('../db/migrations/005_audit_tanpa_hash_sandi.sql', import.meta.url),
                'utf8',
            ),
        );
        const baru = (await pool.query('SELECT * FROM audit WHERE id = $1', [lama.id])).rows[0];
        const { kata_sandi_hash: _hash, ...snapshot } = lama.sesudah;
        assert.deepEqual(baru, { ...lama, sesudah: snapshot });
        // Migrasi 006: akun yang sudah ada memakai bagian email sebelum '@'.
        await pool.query(
            readFileSync(new URL('../db/migrations/006_username.sql', import.meta.url), 'utf8'),
        );
        const akunLama = await pool.query('SELECT username FROM pengguna WHERE id = $1', [pelaku]);
        assert.equal(akunLama.rows[0].username, 'pelaku');
    });

    after(async () => {
        await pool?.end();
        if (admin) {
            await admin.query(`DROP SCHEMA ${skema} CASCADE`);
            await admin.end();
        }
    });

    test('upgrade mempertahankan data lama tanpa mengarang audit masa lalu', async () => {
        assert.equal(
            (await pool.query("SELECT nama FROM orang_tua WHERE nama = 'Data sebelum audit'"))
                .rowCount,
            1,
        );
        assert.equal(
            (await pool.query("SELECT * FROM audit WHERE tabel = 'orang_tua'")).rowCount,
            0,
        );
    });

    test('tujuh tabel mencatat insert, update, delete beserta snapshot dan pelaku', async () => {
        const baris: { tabel: string; id: number; kolom: string }[] = [];
        await dalamTransaksi(pool, { pengguna: pelaku, sumber: 'uji-crud' }, async (klien) => {
            const pos = (
                await klien.query(
                    "INSERT INTO posyandu (nama, slug) VALUES ('Uji', 'uji') RETURNING id",
                )
            ).rows[0].id;
            const rt = (
                await klien.query(
                    "INSERT INTO wilayah_rt (posyandu_id, rt, rw) VALUES ($1, '01', '18') RETURNING id",
                    [pos],
                )
            ).rows[0].id;
            const ortu = (
                await klien.query("INSERT INTO orang_tua (nama) VALUES ('Awal') RETURNING id")
            ).rows[0].id;
            const anak = (
                await klien.query(
                    "INSERT INTO anak (nama, nama_baku, tgl_lahir, jk, orang_tua_id, wilayah_rt_id) VALUES ('Awal', 'AWAL', '2026-01-01', 'P', $1, $2) RETURNING id",
                    [ortu, rt],
                )
            ).rows[0].id;
            const periode = (
                await klien.query(
                    'INSERT INTO periode (posyandu_id, bulan, tahun) VALUES ($1, 1, 2026) RETURNING id',
                    [pos],
                )
            ).rows[0].id;
            const ukur = (
                await klien.query(
                    "INSERT INTO pengukuran (anak_id, periode_id, tanggal_ukur) VALUES ($1, $2, '2026-01-20') RETURNING id",
                    [anak, periode],
                )
            ).rows[0].id;
            const layanan = (
                await klien.query(
                    "INSERT INTO layanan (anak_id, periode_id, jenis) VALUES ($1, $2, 'imunisasi') RETURNING id",
                    [anak, periode],
                )
            ).rows[0].id;
            const pengguna = (
                await klien.query(
                    "INSERT INTO pengguna (nama, username, kata_sandi_hash, peran) VALUES ('Awal', 'crud.audit', 'hash', 'bidan') RETURNING id",
                )
            ).rows[0].id;
            baris.push(
                { tabel: 'pengguna', id: pengguna, kolom: 'nama' },
                { tabel: 'layanan', id: layanan, kolom: 'keterangan' },
                { tabel: 'pengukuran', id: ukur, kolom: 'catatan' },
                { tabel: 'anak', id: anak, kolom: 'nama' },
                { tabel: 'orang_tua', id: ortu, kolom: 'nama' },
                {
                    tabel: 'periode',
                    id: periode,
                    kolom: 'tanggal_kegiatan',
                },
                { tabel: 'wilayah_rt', id: rt, kolom: 'rw' },
            );
            for (const { tabel, id, kolom } of baris) {
                const nilai =
                    tabel === 'periode' ? '2026-01-21' : tabel === 'wilayah_rt' ? '19' : 'Diubah';
                await klien.query(`UPDATE ${tabel} SET ${kolom} = $1 WHERE id = $2`, [nilai, id]);
                await klien.query(`DELETE FROM ${tabel} WHERE id = $1`, [id]);
            }
            await klien.query('DELETE FROM posyandu WHERE id = $1', [pos]);
        });
        for (const { tabel, id, kolom } of baris) {
            const { rows } = await pool.query(
                'SELECT * FROM audit WHERE tabel = $1 AND baris_id = $2 ORDER BY id',
                [tabel, id],
            );
            assert.deepEqual(
                rows.map((r) => r.aksi),
                ['insert', 'update', 'delete'],
                tabel,
            );
            assert.equal(rows[0].sebelum, null);
            assert.equal(rows[2].sesudah, null);
            assert.notEqual(rows[1].sebelum[kolom], rows[1].sesudah[kolom]);
            assert.deepEqual(rows[0].sesudah, rows[1].sebelum);
            assert.deepEqual(rows[1].sesudah, rows[2].sebelum);
            for (const r of rows) {
                assert.equal(r.pengguna_id, pelaku);
                assert.equal(r.sumber, 'uji-crud');
                assert.ok(r.pada instanceof Date);
            }
        }
    });

    test('SQL langsung tercatat tanpa mewarisi identitas setelah commit', async () => {
        const hasil = await pool.query(
            "INSERT INTO orang_tua (nama) VALUES ('SQL langsung') RETURNING id",
        );
        const { rows } = await pool.query(
            "SELECT * FROM audit WHERE tabel = 'orang_tua' AND baris_id = $1",
            [hasil.rows[0].id],
        );
        assert.equal(rows[0].pengguna_id, null);
        assert.equal(rows[0].sumber, 'tidak diketahui');
    });

    test('rollback membatalkan data dan audit, lalu koneksi dapat dipakai tanpa identitas lama', async () => {
        await assert.rejects(
            dalamTransaksi(pool, { pengguna: pelaku, sumber: 'uji-gagal' }, async (klien) => {
                await klien.query("INSERT INTO orang_tua (nama) VALUES ('Harus batal')");
                await klien.query(
                    "INSERT INTO pengguna (nama, username, kata_sandi_hash, peran) VALUES ('Invalid', 'invalid.audit', 'hash', 'peran-invalid')",
                );
            }),
            /check constraint/,
        );
        assert.equal(
            (await pool.query("SELECT * FROM orang_tua WHERE nama = 'Harus batal'")).rowCount,
            0,
        );
        assert.equal(
            (await pool.query("SELECT * FROM audit WHERE sumber = 'uji-gagal'")).rowCount,
            0,
        );
        const hasil = await pool.query(
            "INSERT INTO orang_tua (nama) VALUES ('Setelah rollback') RETURNING id",
        );
        const audit = (
            await pool.query("SELECT * FROM audit WHERE tabel = 'orang_tua' AND baris_id = $1", [
                hasil.rows[0].id,
            ])
        ).rows[0];
        assert.equal(audit.pengguna_id, null);
        assert.equal(audit.sumber, 'tidak diketahui');
    });

    test('transaksi CLI mengosongkan pelaku, update tanpa perubahan tidak menambah audit', async () => {
        await dalamTransaksi(pool, { pengguna: null, sumber: 'cli' }, async (klien) => {
            const { rows } = await klien.query(
                "INSERT INTO orang_tua (nama) VALUES ('CLI') RETURNING id",
            );
            await klien.query('UPDATE orang_tua SET nama = nama WHERE id = $1', [rows[0].id]);
        });
        const { rows } = await pool.query("SELECT * FROM audit WHERE sumber = 'cli'");
        assert.equal(rows.length, 1);
        assert.equal(rows[0].pengguna_id, null);
    });

    test('kegagalan menulis audit juga membatalkan perubahan data', async () => {
        await assert.rejects(
            dalamTransaksi(pool, { pengguna: -1, sumber: 'pelaku-invalid' }, async (klien) => {
                await klien.query("INSERT INTO orang_tua (nama) VALUES ('Audit harus berhasil')");
            }),
            /foreign key constraint/,
        );
        assert.equal(
            (await pool.query("SELECT * FROM orang_tua WHERE nama = 'Audit harus berhasil'"))
                .rowCount,
            0,
        );
    });

    test('perubahan sandi tercatat tanpa menyimpan hash lama maupun baru', async () => {
        await dalamTransaksi(pool, { pengguna: pelaku, sumber: 'uji-sandi' }, async (klien) => {
            await klien.query("UPDATE pengguna SET kata_sandi_hash = 'hash-baru' WHERE id = $1", [
                pelaku,
            ]);
        });
        const { rows } = await pool.query("SELECT * FROM audit WHERE tabel = 'pengguna'");
        assert.equal(rows.filter((r) => r.sumber === 'uji-sandi').length, 1);
        for (const r of rows) {
            assert.ok(!Object.hasOwn(r.sebelum ?? {}, 'kata_sandi_hash'));
            assert.ok(!Object.hasOwn(r.sesudah ?? {}, 'kata_sandi_hash'));
        }
    });

    test('identitas dua pelaku tidak tertukar pada koneksi yang sama', async () => {
        const akun = (
            await pool.query(
                "INSERT INTO pengguna (nama, username, kata_sandi_hash, peran) VALUES ('Kedua', 'kedua.audit', 'hash', 'bidan') RETURNING id",
            )
        ).rows[0].id;
        for (const id of [pelaku, akun]) {
            await dalamTransaksi(
                pool,
                { pengguna: id, sumber: `uji-pelaku-${id}` },
                async (klien) => {
                    await klien.query("INSERT INTO orang_tua (nama) VALUES ('Dua pelaku')");
                },
            );
            const { rows } = await pool.query('SELECT pengguna_id FROM audit WHERE sumber = $1', [
                `uji-pelaku-${id}`,
            ]);
            assert.deepEqual(
                rows.map((r) => r.pengguna_id),
                [id],
            );
        }
        await dalamTransaksi(pool, { pengguna: akun, sumber: 'hapus-sendiri' }, async (klien) => {
            await klien.query('DELETE FROM pengguna WHERE id = $1', [akun]);
        });
        const { rows } = await pool.query(
            'SELECT pengguna_id FROM audit WHERE sumber IN ($1, $2)',
            [`uji-pelaku-${akun}`, 'hapus-sendiri'],
        );
        assert.equal(rows.length, 2);
        assert.ok(rows.every((r) => r.pengguna_id === null));
    });

    test('akun pertama lewat CLI dapat login, reset sandi mencabut sesi dan tercatat', async () => {
        const url = new URL(process.env.DATABASE_URL!);
        url.searchParams.set('options', `-c search_path=${skema}`);
        const cwd = fileURLToPath(new URL('..', import.meta.url));
        const username = 'onboarding';
        const sandi = 'sandi-uji-onboarding';
        const env = {
            ...process.env,
            DATABASE_URL: url.href,
            SANDI: sandi,
        };
        const jalankan = promisify(execFile);
        const dibuat = await jalankan(
            process.execPath,
            ['db/buat-pengguna.ts', 'Bidan Uji', username, 'bidan'],
            { cwd, env },
        );
        assert.match(dibuat.stdout, /dibuat/);
        const server = buatApp(pool).listen(0, '127.0.0.1');
        try {
            await new Promise<void>((resolve, reject) => {
                server.once('listening', resolve);
                server.once('error', reject);
            });
            const alamat = server.address();
            assert.ok(alamat && typeof alamat !== 'string');
            const akar = `http://127.0.0.1:${alamat.port}/api`;
            const masuk = (kataSandi: string) =>
                fetch(`${akar}/masuk`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ username, kataSandi }),
                });
            const login = await masuk(sandi);
            assert.equal(login.status, 200);
            const pengguna = ((await login.json()) as { pengguna: { id: number } }).pengguna;
            const cookie = login.headers.get('set-cookie')!.split(';')[0];
            assert.equal((await fetch(`${akar}/saya`, { headers: { cookie } })).status, 200);
            await jalankan(process.execPath, ['db/ganti-sandi.ts', username], {
                cwd,
                env: { ...env, SANDI: `${sandi}-baru` },
            });
            assert.equal((await fetch(`${akar}/saya`, { headers: { cookie } })).status, 401);
            assert.equal((await masuk(sandi)).status, 401);
            assert.equal((await masuk(`${sandi}-baru`)).status, 200);
            const { rows } = await pool.query(
                "SELECT * FROM audit WHERE tabel = 'pengguna' AND baris_id = $1 ORDER BY id",
                [pengguna.id],
            );
            assert.deepEqual(
                rows.map((r) => [r.aksi, r.sumber, r.pengguna_id]),
                [
                    ['insert', 'cli', null],
                    ['update', 'autentikasi', pengguna.id],
                    ['update', 'cli', null],
                    ['update', 'autentikasi', pengguna.id],
                ],
            );
            assert.ok(!JSON.stringify(rows).includes('kata_sandi_hash'));
        } finally {
            await new Promise<void>((resolve, reject) =>
                server.close((galat) => (galat ? reject(galat) : resolve())),
            );
        }
    });
});
