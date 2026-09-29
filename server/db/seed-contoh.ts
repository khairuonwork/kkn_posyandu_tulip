/**
 * Data contoh untuk basis data pengembangan: Posyandu Tulip, RT 01–07, dan
 * sepuluh akun yang sama dengan daftar pengguna di demo.
 *
 *     SANDI=<kata sandi> npm run seed:contoh
 *
 * Supaya anggota tim yang baru bergabung cukup menjalankan satu perintah untuk
 * bisa masuk dengan ketiga peran. Semua akun memakai kata sandi dari `SANDI`,
 * yang dipilih tiap orang sendiri: tidak ada kata sandi bawaan di repo.
 *
 * Hanya untuk basis data di mesin sendiri. Perintah ini menolak berjalan bila
 * `DATABASE_URL` menunjuk host selain localhost, supaya akun contoh tidak
 * pernah masuk ke server bersama. Aman diulang: yang sudah ada dilewati, dan
 * kata sandi akun lama tidak diubah.
 */

import { fileURLToPath } from 'node:url';
import { hashKataSandi } from '../src/auth/kata-sandi.ts';
import type { Peran } from '../src/auth/peran.ts';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import { dalamTransaksi } from '../src/db/transaksi.ts';

const RW = '18';
const RT = ['01', '02', '03', '04', '05', '06', '07'];

/** Sama dengan `PENGGUNA_CONTOH` di client/src/data/contoh/store.ts. */
const AKUN: {
    nama: string;
    username: string;
    peran: Peran;
    rt: string | null;
    aktif: boolean;
}[] = [
    { nama: 'Bidan Posyandu Tulip', username: 'bidan', peran: 'bidan', rt: null, aktif: true },
    { nama: 'Admin Sistem', username: 'admin', peran: 'admin', rt: null, aktif: true },
    ...RT.map((rt) => ({
        nama: `Kader RT ${rt}`,
        username: `kader${rt}`,
        peran: 'kader' as const,
        rt,
        aktif: true,
    })),
    // Akun nonaktif, untuk mencoba penolakan masuk "Akun dinonaktifkan".
    { nama: 'Kader RT 02 Lama', username: 'kader02.lama', peran: 'kader', rt: '02', aktif: false },
];

/** Basis data di mesin ini saja: localhost, 127.0.0.1, atau ::1. */
export function databaseLokal(url: string): boolean {
    try {
        return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
    } catch {
        // Bentuk "host=... dbname=..." dan socket tidak bisa dipastikan lokal.
        return false;
    }
}

function keluarDenganPesan(pesan: string): never {
    console.error(pesan);
    process.exit(1);
}

async function jalankan(): Promise<void> {
    const sandi = process.env.SANDI;

    if (!databaseLokal(process.env.DATABASE_URL ?? '')) {
        keluarDenganPesan(
            'seed:contoh hanya untuk basis data di mesin sendiri, tetapi DATABASE_URL tidak menunjuk localhost.\n' +
                'Di server bersama, buat akun satu per satu dengan npm run pengguna:buat.',
        );
    }

    if (sandi === undefined || sandi.length < 8) {
        keluarDenganPesan('Setel SANDI di lingkungan, minimal 8 karakter. Semua akun contoh memakai kata sandi ini.');
    }

    const pool = dapatkanPool();
    const ringkasan = await dalamTransaksi(pool, { pengguna: null, sumber: 'cli' }, async (klien) => {
        // Yang kosong dilengkapi, yang sudah terisi tidak ditimpa. Tanpa
        // WHERE, baris yang sudah lengkap pun ikut "diperbarui" dan setiap
        // pengulangan menambah catatan audit kosong.
        await klien.query(
            `INSERT INTO posyandu (nama, slug, rw, kelurahan)
             VALUES ('Posyandu Tulip', 'posyandu-tulip', $1, 'Citeureup')
             ON CONFLICT (slug) DO UPDATE
                SET rw = COALESCE(posyandu.rw, EXCLUDED.rw),
                    kelurahan = COALESCE(posyandu.kelurahan, EXCLUDED.kelurahan)
                WHERE posyandu.rw IS NULL OR posyandu.kelurahan IS NULL`,
            [RW],
        );
        const { rows: posyandu } = await klien.query<{ id: number }>(
            `SELECT id FROM posyandu WHERE slug = 'posyandu-tulip'`,
        );
        const posyanduId = posyandu[0].id;

        const { rowCount: rtBaru } = await klien.query(
            `INSERT INTO wilayah_rt (posyandu_id, rt, rw)
             SELECT $1, rt, $2 FROM unnest($3::varchar[]) AS rt
             ON CONFLICT (posyandu_id, rt, rw) DO NOTHING`,
            [posyanduId, RW, RT],
        );
        const { rows: wilayah } = await klien.query<{ id: number; rt: string }>(
            'SELECT id, rt FROM wilayah_rt WHERE posyandu_id = $1 AND rw = $2',
            [posyanduId, RW],
        );
        const idRt = new Map(wilayah.map((w) => [w.rt, w.id]));

        const { rows: lama } = await klien.query<{ username: string }>(
            'SELECT lower(username) AS username FROM pengguna WHERE lower(username) = ANY($1::text[])',
            [AKUN.map((a) => a.username)],
        );
        const sudahAda = new Set(lama.map((l) => l.username));
        const dibuat: typeof AKUN = [];

        for (const akun of AKUN) {
            if (sudahAda.has(akun.username)) {
                continue;
            }

            // Hash per akun, bukan satu hash dipakai bersama: garamnya harus
            // berbeda, kalau tidak kesamaan kata sandi terbaca dari hash-nya.
            await klien.query(
                `INSERT INTO pengguna (nama, username, kata_sandi_hash, peran, wilayah_rt_id, aktif)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    akun.nama,
                    akun.username,
                    await hashKataSandi(sandi),
                    akun.peran,
                    akun.rt === null ? null : (idRt.get(akun.rt) ?? null),
                    akun.aktif,
                ],
            );
            dibuat.push(akun);
        }

        return { rtBaru: rtBaru ?? 0, dibuat, dilewati: AKUN.length - dibuat.length };
    });

    console.log(`Posyandu Tulip, RW ${RW} Kelurahan Citeureup: siap.`);
    console.log(`RT 01–07: ${ringkasan.rtBaru} baru, ${RT.length - ringkasan.rtBaru} sudah ada.`);
    console.log(
        `Akun: ${ringkasan.dibuat.length} dibuat, ${ringkasan.dilewati} sudah ada (kata sandinya tidak diubah).`,
    );

    for (const akun of ringkasan.dibuat) {
        console.log(`  ${akun.username.padEnd(16)} ${akun.peran}${akun.aktif ? '' : ' (nonaktif)'}`);
    }

    if (ringkasan.dibuat.length > 0) {
        console.log('Masuk dengan nama pengguna di atas dan kata sandi dari SANDI.');
    }
}

// Dijalankan hanya sebagai perintah, bukan saat diimpor oleh pengujian.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        await jalankan();
    } finally {
        await tutupPool();
    }
}
