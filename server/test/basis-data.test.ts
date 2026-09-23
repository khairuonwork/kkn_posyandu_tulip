/**
 * Pengujian yang menuntut PostgreSQL menyala.
 *
 * Dilewati bila `DATABASE_URL` tidak diatur, sehingga `npm test` tetap berjalan
 * di mesin tanpa basis data. CI selalu mengaturnya, jadi bagian ini tidak
 * pernah diam-diam terlewat di sana.
 *
 * Yang dibuktikan di sini bukan "query-nya jalan", melainkan bahwa **angka
 * gizi yang keluar lewat basis data sama persis dengan yang keluar lewat
 * berkas**. Kolom `numeric(10,6)` yang memotong satu digit saja akan menggeser
 * z-score tanpa satu pun galat muncul.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';

import type { Indeks, JenisKelamin } from '../src/antropometri/indeks.ts';
import { bacaBerkasStandar, tabelDariBerkas } from '../src/antropometri/sumber-standar.ts';
import { hitungZ } from '../src/antropometri/z-score.ts';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import { muatTabelStandar } from '../src/repositories/standar-lms-repository.ts';

const adaDb = process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== '';

describe(
    'basis data',
    { skip: adaDb ? false : 'DATABASE_URL tidak diatur — lihat server/.env.example' },
    () => {
        after(async () => {
            await tutupPool();
        });

        test('seluruh tabel skema terpasang', async () => {
            const { rows } = await dapatkanPool().query<{ tablename: string }>(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
            );
            const ada = rows.map((r) => r.tablename);

            for (const tabel of [
                'anak',
                'import_batch',
                'import_konflik',
                'layanan',
                'orang_tua',
                'pengguna',
                'pengukuran',
                'penilaian_gizi',
                'periode',
                'posyandu',
                'sesi',
                'standar_lms',
                'wilayah_rt',
            ]) {
                assert.ok(ada.includes(tabel), `tabel ${tabel} tidak ada`);
            }
        });

        test('seed memuat 906 baris standar', async () => {
            const { rows } = await dapatkanPool().query<{ jumlah: number }>(
                'SELECT count(*)::int AS jumlah FROM standar_lms',
            );

            assert.equal(rows[0].jumlah, 906);
        });

        test('nilai L, M, S melewati numeric(10,6) tanpa berubah', async () => {
            const dariDb = await muatTabelStandar(dapatkanPool());
            const { baris } = bacaBerkasStandar();

            for (const b of baris) {
                const lms = dariDb.cari(b.indeks, b.jk, b.kunci);

                assert.notEqual(lms, null, `${b.indeks} ${b.jk} ${b.kunci} hilang`);
                assert.equal(lms!.l, b.l, `L bergeser pada ${b.indeks} ${b.jk} ${b.kunci}`);
                assert.equal(lms!.m, b.m, `M bergeser pada ${b.indeks} ${b.jk} ${b.kunci}`);
                assert.equal(lms!.s, b.s, `S bergeser pada ${b.indeks} ${b.jk} ${b.kunci}`);
            }
        });

        test('z-score lewat basis data identik dengan lewat berkas', async () => {
            // Pemeriksaan paling menentukan: 2.076 kasus acuan yang sama,
            // tetapi tabelnya dimuat dari PostgreSQL. Bila kolom numeriknya
            // memotong presisi, selisihnya muncul di sini — bukan nanti di
            // laporan gizi seorang anak.
            type Kasus = { indeks: Indeks; jk: JenisKelamin; kunci: number; nilai: number };
            const acuan = JSON.parse(
                readFileSync(join(import.meta.dirname, 'acuan-php.json'), 'utf8'),
            ) as { kasus: Kasus[] };

            const dariDb = await muatTabelStandar(dapatkanPool());
            const dariBerkas = tabelDariBerkas();

            for (const k of acuan.kasus) {
                assert.equal(
                    hitungZ(dariDb, k.indeks, k.jk, k.kunci, k.nilai),
                    hitungZ(dariBerkas, k.indeks, k.jk, k.kunci, k.nilai),
                    `${k.indeks}/${k.jk} kunci ${k.kunci} nilai ${k.nilai}`,
                );
            }
        });

        describe('stempel waktu', () => {
            test('updated_at ikut berubah saat baris diubah', async () => {
                // Tanpa trigger, kolom ini membeku di waktu insert pada
                // kesebelas tabel — dan layar Pengaturan menampilkannya
                // sebagai "Terakhir diubah".
                const pool = dapatkanPool();
                const { rows } = await pool.query<{ id: number }>(
                    `INSERT INTO posyandu (nama, slug) VALUES ('Uji Stempel', 'uji-stempel')
                     RETURNING id`,
                );
                const id = rows[0].id;

                try {
                    await pool.query("UPDATE posyandu SET nama = 'Diubah' WHERE id = $1", [id]);

                    const { rows: sesudah } = await pool.query<{ berubah: boolean }>(
                        'SELECT (updated_at > created_at) AS berubah FROM posyandu WHERE id = $1',
                        [id],
                    );

                    assert.equal(sesudah[0].berubah, true);
                } finally {
                    await pool.query('DELETE FROM posyandu WHERE id = $1', [id]);
                }
            });

            test('penyimpanan yang tidak mengubah apa pun tidak menggeser stempel', async () => {
                const pool = dapatkanPool();
                const { rows } = await pool.query<{ id: number }>(
                    `INSERT INTO posyandu (nama, slug) VALUES ('Tetap', 'uji-tetap')
                     RETURNING id`,
                );
                const id = rows[0].id;

                try {
                    await pool.query("UPDATE posyandu SET nama = 'Tetap' WHERE id = $1", [id]);

                    const { rows: sesudah } = await pool.query<{ sama: boolean }>(
                        'SELECT (updated_at = created_at) AS sama FROM posyandu WHERE id = $1',
                        [id],
                    );

                    assert.equal(sesudah[0].sama, true);
                } finally {
                    await pool.query('DELETE FROM posyandu WHERE id = $1', [id]);
                }
            });
        });

        describe('NIK anak', () => {
            const nik = '9999888877776666';

            const buang = async () => {
                await dapatkanPool().query('DELETE FROM anak WHERE nik = $1', [nik]);
            };

            after(buang);

            test('dua anak hidup tidak boleh berbagi NIK', async () => {
                const pool = dapatkanPool();

                await pool.query(
                    `INSERT INTO anak (nik, nama, nama_baku, tgl_lahir, jk)
                     VALUES ($1, 'Anak Satu', 'anak satu', '2024-01-01', 'L')`,
                    [nik],
                );

                await assert.rejects(
                    pool.query(
                        `INSERT INTO anak (nik, nama, nama_baku, tgl_lahir, jk)
                         VALUES ($1, 'Anak Dua', 'anak dua', '2024-02-02', 'P')`,
                        [nik],
                    ),
                    /anak_nik_unik_aktif/,
                );

                await buang();
            });

            test('NIK bebas kembali setelah profilnya dihapus', async () => {
                // Sebelum indeks parsial, pendaftaran ulang ini ditolak dengan
                // "duplicate key" yang tidak menyebut sedikit pun bahwa
                // penyebabnya baris yang sudah terhapus.
                const pool = dapatkanPool();

                await pool.query(
                    `INSERT INTO anak (nik, nama, nama_baku, tgl_lahir, jk)
                     VALUES ($1, 'Lama', 'lama', '2024-01-01', 'L')`,
                    [nik],
                );
                await pool.query('UPDATE anak SET deleted_at = now() WHERE nik = $1', [nik]);

                await pool.query(
                    `INSERT INTO anak (nik, nama, nama_baku, tgl_lahir, jk)
                     VALUES ($1, 'Baru', 'baru', '2024-01-01', 'P')`,
                    [nik],
                );

                const { rows } = await pool.query<{ jumlah: number }>(
                    'SELECT count(*)::int AS jumlah FROM anak WHERE nik = $1',
                    [nik],
                );

                assert.equal(rows[0].jumlah, 2);

                await buang();
            });
        });

        describe('penjaga tabel pengguna', () => {
            // `lower()`, bukan `LIKE` polos: salah satu baris uji sengaja
            // memakai huruf besar untuk menguji keunikan email, dan pembersihan
            // yang peka huruf akan melewatkannya — membuat jalan kedua gagal
            // karena sisa jalan pertama.
            const buang = async () => {
                await dapatkanPool().query(
                    "DELETE FROM pengguna WHERE lower(email) LIKE '%@uji.invalid'",
                );
            };

            after(buang);

            test('kader wajib punya RT binaan', async () => {
                // Penjaga fail-closed: kader tanpa RT tidak boleh tersimpan,
                // karena `rt` kosong mudah salah dibaca sebagai "seluruh RW".
                await assert.rejects(
                    dapatkanPool().query(
                        `INSERT INTO pengguna (nama, email, kata_sandi_hash, peran, wilayah_rt_id)
                         VALUES ('Kader', 'kader@uji.invalid', 'x', 'kader', NULL)`,
                    ),
                    /pengguna_rt_sesuai_peran/,
                );
            });

            test('bidan dan admin tidak boleh punya RT binaan', async () => {
                const pool = dapatkanPool();
                const { rows } = await pool.query<{ id: number }>(
                    `INSERT INTO posyandu (nama, slug) VALUES ('Uji', 'uji-rt-peran')
                     RETURNING id`,
                );
                const { rows: rt } = await pool.query<{ id: number }>(
                    `INSERT INTO wilayah_rt (posyandu_id, rt, rw) VALUES ($1, '09', '18')
                     RETURNING id`,
                    [rows[0].id],
                );

                await assert.rejects(
                    pool.query(
                        `INSERT INTO pengguna (nama, email, kata_sandi_hash, peran, wilayah_rt_id)
                         VALUES ('Bidan', 'bidan@uji.invalid', 'x', 'bidan', $1)`,
                        [rt[0].id],
                    ),
                    /pengguna_rt_sesuai_peran/,
                );

                await pool.query('DELETE FROM wilayah_rt WHERE id = $1', [rt[0].id]);
                await pool.query('DELETE FROM posyandu WHERE id = $1', [rows[0].id]);
            });

            test('email unik tanpa peduli huruf besar-kecil', async () => {
                const pool = dapatkanPool();

                await pool.query(
                    `INSERT INTO pengguna (nama, email, kata_sandi_hash, peran)
                     VALUES ('Admin', 'Admin@Uji.Invalid', 'x', 'admin')`,
                );

                await assert.rejects(
                    pool.query(
                        `INSERT INTO pengguna (nama, email, kata_sandi_hash, peran)
                         VALUES ('Admin Kedua', 'admin@uji.invalid', 'x', 'admin')`,
                    ),
                    /pengguna_email_unik/,
                );

                await buang();
            });
        });
    },
);
