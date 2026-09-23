/**
 * Membuat akun pengguna dari baris perintah.
 *
 * Inilah cara akun pertama lahir: layar Kelola pengguna hanya dapat dipakai
 * Admin, dan Admin pertama tidak punya siapa-siapa untuk membuatnya.
 *
 *     SANDI=rahasia npm run pengguna:buat -- "Bidan Posyandu Tulip" bidan@posyandu.id bidan
 *     SANDI=rahasia npm run pengguna:buat -- "Kader RT 01" kader01@posyandu.id kader 01
 *
 * Kata sandi lewat lingkungan, bukan argumen: argumen terlihat di daftar
 * proses seluruh mesin.
 */

import { hashKataSandi } from '../src/auth/kata-sandi.ts';
import type { Peran } from '../src/auth/peran.ts';
import { SEMUA_PERAN } from '../src/auth/peran.ts';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import { dalamTransaksi } from '../src/db/transaksi.ts';

function keluarDenganPesan(pesan: string): never {
    console.error(pesan);
    process.exit(1);
}

async function jalankan(): Promise<void> {
    const [nama, email, peranMentah, rt] = process.argv.slice(2);
    const sandi = process.env.SANDI;

    if (nama === undefined || email === undefined || peranMentah === undefined) {
        keluarDenganPesan(
            'Pakai: SANDI=<kata sandi> node --env-file=.env db/buat-pengguna.ts <nama> <email> <peran> [rt]',
        );
    }

    if (!SEMUA_PERAN.includes(peranMentah as Peran)) {
        keluarDenganPesan(`Peran harus salah satu dari: ${SEMUA_PERAN.join(', ')}`);
    }

    const peran = peranMentah as Peran;

    if (sandi === undefined || sandi.length < 8) {
        keluarDenganPesan('Setel SANDI di lingkungan, minimal 8 karakter.');
    }

    // Aturan yang sama dengan CHECK di basis data, diperiksa lebih awal supaya
    // pesannya menyebut sebabnya dan bukan nama constraint.
    if (peran === 'kader' && (rt === undefined || rt === '')) {
        keluarDenganPesan('Kader wajib punya RT binaan. Sebutkan sebagai argumen keempat.');
    }

    if (peran !== 'kader' && rt !== undefined) {
        keluarDenganPesan(`Peran ${peran} melihat seluruh RW, jadi tidak boleh punya RT binaan.`);
    }

    const pool = dapatkanPool();
    let wilayahRtId: number | null = null;

    if (rt !== undefined) {
        const { rows } = await pool.query<{ id: number }>(
            'SELECT id FROM wilayah_rt WHERE rt = $1 ORDER BY id LIMIT 1',
            [rt],
        );

        if (rows.length === 0) {
            keluarDenganPesan(`RT ${rt} belum ada di tabel wilayah_rt.`);
        }

        wilayahRtId = rows[0].id;
    }

    // Email yang sudah dipakai melanggar unique index dan, tanpa penanganan
    // ini, memuntahkan stack trace driver — pesan yang menyebut `_bt_check_unique`
    // dan tidak memberi tahu apa pun tentang apa yang harus dilakukan.
    const { rows: sudahAda } = await pool.query<{ id: number }>(
        'SELECT id FROM pengguna WHERE lower(email) = lower($1)',
        [email],
    );

    if (sudahAda.length > 0) {
        keluarDenganPesan(
            `Email ${email} sudah dipakai pengguna #${sudahAda[0].id}.\n` +
                `Untuk mengganti kata sandinya:\n` +
                `  SANDI=<kata sandi baru> npm run pengguna:sandi -- ${email}`,
        );
    }

    // Dibungkus transaksi supaya trigger audit tahu asal perubahannya. Tidak
    // ada pengguna yang masuk di baris perintah, jadi pelakunya tanpa nama.
    const id = await dalamTransaksi(pool, { pengguna: null, sumber: 'cli' }, async (klien) => {
        const { rows } = await klien.query<{ id: number }>(
            `INSERT INTO pengguna (nama, email, kata_sandi_hash, peran, wilayah_rt_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [nama, email, await hashKataSandi(sandi), peran, wilayahRtId],
        );

        return rows[0].id;
    });

    console.log(`Pengguna #${id} dibuat: ${nama} <${email}> sebagai ${peran}.`);
}

try {
    await jalankan();
} finally {
    await tutupPool();
}
