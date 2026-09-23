/**
 * Penyimpanan hasil penilaian gizi.
 *
 * Dilewati bila `DATABASE_URL` tidak diatur, mengikuti pola `basis-data.test.ts`.
 *
 * Yang dibuktikan di sini bukan "query-nya jalan", melainkan empat perilaku
 * yang masing-masing pernah menjadi sumber angka salah di sistem lama:
 *
 * 1. Angka yang tersimpan sama persis dengan yang keluar dari mesin hitung —
 *    `numeric(6,3)` tidak memotong satu digit pun.
 * 2. Menghitung ulang **menimpa**, tidak menambah baris.
 * 3. Indeks yang tidak lagi terhitung **dihapus**, bukan tertinggal memuat
 *    angka dari nilai ukur yang sudah dikoreksi.
 * 4. Versi standar lain tidak pernah tersentuh.
 *
 * @see docs/prd/dasar/B01-simpan-hasil-gizi.md
 */

import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { hitungPenilaian } from '../src/antropometri/penilaian-gizi.ts';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import {
    ambilMasukan,
    simpanPenilaian,
} from '../src/repositories/penilaian-gizi-repository.ts';
import { muatTabelStandar, VERSI_DEFAULT } from '../src/repositories/standar-lms-repository.ts';
import { GalatPengukuranTidakAda, hitungDanSimpan } from '../src/services/gizi-service.ts';

const adaDb = process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== '';

type Baris = {
    indeks: string;
    z_score: number | null;
    kategori: string | null;
    tidak_wajar: boolean;
    catatan_perhitungan: Record<string, string> | null;
};

describe(
    'simpan penilaian gizi',
    { skip: adaDb ? false : 'DATABASE_URL tidak diatur — lihat server/.env.example' },
    () => {
        let idPosyandu = 0;
        let idRt = 0;
        let idAnak = 0;
        let idPeriode = 0;
        let idPengukuran = 0;

        async function baca(versi = VERSI_DEFAULT): Promise<Baris[]> {
            const { rows } = await dapatkanPool().query<Baris>(
                `SELECT indeks, z_score, kategori, tidak_wajar, catatan_perhitungan
                   FROM penilaian_gizi
                  WHERE pengukuran_id = $1 AND standar_versi = $2
                  ORDER BY indeks`,
                [idPengukuran, versi],
            );

            return rows;
        }

        before(async () => {
            const pool = dapatkanPool();

            // Lihat catatan yang sama di auth-http.test.ts: sisa run yang
            // terputus membuat run berikutnya mati di unique constraint `slug`.
            await pool.query(`DELETE FROM posyandu WHERE slug = 'uji-gizi'`);

            const p = await pool.query<{ id: number }>(
                `INSERT INTO posyandu (nama, slug) VALUES ('Uji Gizi', 'uji-gizi') RETURNING id`,
            );
            idPosyandu = p.rows[0].id;

            const rt = await pool.query<{ id: number }>(
                `INSERT INTO wilayah_rt (posyandu_id, rt, rw) VALUES ($1, '09', '18') RETURNING id`,
                [idPosyandu],
            );
            idRt = rt.rows[0].id;

            // Perempuan, lahir 20 Januari 2026, diukur 13 Juni 2026 → 4 bulan
            // penuh. Tanggal yang sama dipakai contoh umur di dokumen
            // antropometri, sehingga angkanya dapat ditelusuri balik.
            const a = await pool.query<{ id: number }>(
                `INSERT INTO anak (wilayah_rt_id, nama, nama_baku, tgl_lahir, jk)
                 VALUES ($1, 'Uji Gizi Satu', 'UJI GIZI SATU', '2026-01-20', 'P')
                 RETURNING id`,
                [idRt],
            );
            idAnak = a.rows[0].id;

            const per = await pool.query<{ id: number }>(
                `INSERT INTO periode (posyandu_id, bulan, tahun, tanggal_kegiatan)
                 VALUES ($1, 6, 2026, '2026-06-13') RETURNING id`,
                [idPosyandu],
            );
            idPeriode = per.rows[0].id;

            const u = await pool.query<{ id: number }>(
                `INSERT INTO pengukuran
                     (anak_id, periode_id, tanggal_ukur, bb_kg, tinggi_cm, jenis_ukur,
                      lila_cm, lika_cm, status_kehadiran, sumber)
                 VALUES ($1, $2, '2026-06-13', 6.24, 61.4, 'PB', 12.5, 40.2, 'hadir', 'manual')
                 RETURNING id`,
                [idAnak, idPeriode],
            );
            idPengukuran = u.rows[0].id;
        });

        after(async () => {
            const pool = dapatkanPool();

            // penilaian_gizi dan pengukuran ikut terhapus lewat ON DELETE CASCADE.
            await pool.query('DELETE FROM anak WHERE id = $1', [idAnak]);
            await pool.query('DELETE FROM periode WHERE id = $1', [idPeriode]);
            await pool.query('DELETE FROM wilayah_rt WHERE id = $1', [idRt]);
            await pool.query('DELETE FROM posyandu WHERE id = $1', [idPosyandu]);

            // Jejak audit dibersihkan **sesudah** fixture-nya dihapus: penghapusan
            // itu sendiri menulis baris audit. Baris audit sengaja bertahan
            // setelah datanya hilang — itu gunanya — tetapi fixture uji tidak
            // perlu menumpuk di basis data pengembangan.
            await pool.query(
                `DELETE FROM audit WHERE (tabel, baris_id) IN
                     (('anak', $1), ('pengukuran', $2), ('periode', $3), ('wilayah_rt', $4))`,
                [idAnak, idPengukuran, idPeriode, idRt],
            );
            await tutupPool();
        });

        test('angka tersimpan sama persis dengan hasil mesin hitung', async () => {
            const pool = dapatkanPool();
            const jumlah = await hitungDanSimpan(pool, idPengukuran);

            const tabel = await muatTabelStandar(pool);
            const masukan = await ambilMasukan(pool, idPengukuran);
            assert.notEqual(masukan, null);

            const harapan = hitungPenilaian(tabel, masukan!);
            const tersimpan = await baca();

            assert.equal(jumlah, harapan.length);
            assert.equal(tersimpan.length, harapan.length);
            assert.ok(harapan.length > 0, 'tidak ada indeks yang terhitung — data uji salah');

            for (const h of harapan.toSorted((a, b) => a.indeks.localeCompare(b.indeks))) {
                const baris = tersimpan.find((t) => t.indeks === h.indeks);

                assert.notEqual(baris, undefined, `${h.indeks} tidak tersimpan`);
                assert.equal(baris!.z_score, h.zScore, `z-score ${h.indeks} bergeser`);
                assert.equal(baris!.kategori, h.kategori, `kategori ${h.indeks} berbeda`);
                assert.equal(baris!.tidak_wajar, h.tidakWajar);
                assert.deepEqual(baris!.catatan_perhitungan, h.catatanPerhitungan);
            }
        });

        test('menghitung ulang menimpa, tidak menambah baris', async () => {
            const pool = dapatkanPool();
            const sebelum = await baca();

            await hitungDanSimpan(pool, idPengukuran);
            await hitungDanSimpan(pool, idPengukuran);

            const sesudah = await baca();

            assert.equal(sesudah.length, sebelum.length);
            assert.deepEqual(
                sesudah.map((b) => [b.indeks, b.z_score]),
                sebelum.map((b) => [b.indeks, b.z_score]),
            );
        });

        test('indeks yang tidak lagi terhitung ikut terhapus', async () => {
            const pool = dapatkanPool();

            await hitungDanSimpan(pool, idPengukuran);
            const denganBb = await baca();
            assert.ok(
                denganBb.some((b) => b.indeks === 'BB_U'),
                'BB/U seharusnya ada saat berat terisi',
            );

            // Bidan mengoreksi: beratnya ternyata salah catat dan dikosongkan.
            await pool.query('UPDATE pengukuran SET bb_kg = NULL WHERE id = $1', [idPengukuran]);
            await hitungDanSimpan(pool, idPengukuran);

            const tanpaBb = await baca();
            const sisa = tanpaBb.map((b) => b.indeks);

            assert.ok(!sisa.includes('BB_U'), 'BB/U tertinggal padahal beratnya sudah kosong');
            assert.ok(!sisa.includes('BB_TB'), 'BB/TB tertinggal');
            assert.ok(!sisa.includes('IMT_U'), 'IMT/U tertinggal');
            assert.ok(sisa.includes('TB_U'), 'TB/U seharusnya tetap — tingginya masih ada');

            await pool.query('UPDATE pengukuran SET bb_kg = 6.24 WHERE id = $1', [idPengukuran]);
            await hitungDanSimpan(pool, idPengukuran);
        });

        test('versi standar lain tidak tersentuh', async () => {
            const pool = dapatkanPool();

            await hitungDanSimpan(pool, idPengukuran);

            // Baris versi lain, ditulis langsung supaya tidak menuntut seed kedua.
            await simpanPenilaian(pool, idPengukuran, 'UJI-LAMA', [
                {
                    indeks: 'BB_U',
                    zScore: -1.234,
                    kategori: 'Berat badan normal',
                    tidakWajar: false,
                    catatanPerhitungan: null,
                },
            ]);

            await hitungDanSimpan(pool, idPengukuran);

            const lama = await baca('UJI-LAMA');

            assert.equal(lama.length, 1, 'baris versi lama hilang saat versi baru dihitung ulang');
            assert.equal(lama[0].z_score, -1.234);

            await pool.query(
                `DELETE FROM penilaian_gizi WHERE pengukuran_id = $1 AND standar_versi = 'UJI-LAMA'`,
                [idPengukuran],
            );
        });

        test('pengukuran yang tidak ada melempar galat yang menyebut idnya', async () => {
            await assert.rejects(
                () => hitungDanSimpan(dapatkanPool(), 2_147_483_000),
                GalatPengukuranTidakAda,
            );
        });
    },
);
