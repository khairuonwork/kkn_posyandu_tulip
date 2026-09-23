/**
 * Mengganti kata sandi akun yang sudah ada, dari baris perintah.
 *
 *     SANDI=rahasia-baru npm run pengguna:sandi -- bidan@posyandu.id
 *
 * Kenapa ini perlu ada: tidak ada layar "lupa kata sandi", dan tidak akan ada
 * — Portal tidak mengirim surel. Tanpa perintah ini, akun yang kata sandinya
 * terlupa **tidak dapat dipakai lagi selamanya**, dan satu-satunya jalan keluar
 * adalah menulis SQL langsung ke tabel `pengguna`.
 *
 * Kata sandi lewat lingkungan, bukan argumen: argumen terlihat di daftar proses
 * seluruh mesin. Alasan yang sama dengan `buat-pengguna.ts`.
 *
 * Seluruh sesi berjalan milik akun itu ikut dicabut. Mengganti kata sandi
 * karena curiga ada yang tahu, lalu membiarkan sesi lamanya tetap hidup,
 * meninggalkan persis pintu yang sedang ditutup.
 */

import { hashKataSandi } from '../src/auth/kata-sandi.ts';
import { dapatkanPool, tutupPool } from '../src/db/pool.ts';
import { dalamTransaksi } from '../src/db/transaksi.ts';

function keluarDenganPesan(pesan: string): never {
    console.error(pesan);
    process.exit(1);
}

async function jalankan(): Promise<void> {
    const [email] = process.argv.slice(2);
    const sandi = process.env.SANDI;

    if (email === undefined) {
        keluarDenganPesan(
            'Pakai: SANDI=<kata sandi baru> node --env-file=.env db/ganti-sandi.ts <email>',
        );
    }

    if (sandi === undefined || sandi.length < 8) {
        keluarDenganPesan('Setel SANDI di lingkungan, minimal 8 karakter.');
    }

    const pool = dapatkanPool();
    const hash = await hashKataSandi(sandi);

    // Penggantian dan pencabutan sesi satu transaksi: kata sandi yang sudah
    // berganti sementara sesi lamanya masih hidup meninggalkan pintu yang
    // sedang ditutup. Sekaligus memberi trigger audit asal perubahannya —
    // tidak ada pengguna yang masuk di baris perintah, jadi tanpa nama.
    const hasil = await dalamTransaksi(pool, { pengguna: null, sumber: 'cli' }, async (klien) => {
        const { rows } = await klien.query<{ id: number; nama: string }>(
            `UPDATE pengguna
                SET kata_sandi_hash = $1
              WHERE lower(email) = lower($2)
              RETURNING id, nama`,
            [hash, email],
        );

        if (rows.length === 0) {
            return null;
        }

        const { rowCount } = await klien.query('DELETE FROM sesi WHERE pengguna_id = $1', [
            rows[0].id,
        ]);

        return { ...rows[0], sesiDicabut: rowCount ?? 0 };
    });

    if (hasil === null) {
        keluarDenganPesan(
            `Tidak ada pengguna dengan email ${email}.\n` +
                `Daftar akun: SELECT email, peran FROM pengguna;`,
        );
    }

    console.log(
        `Kata sandi #${hasil.id} (${hasil.nama}) diganti. ` +
            `${hasil.sesiDicabut} sesi berjalan dicabut.`,
    );
}

try {
    await jalankan();
} finally {
    await tutupPool();
}
