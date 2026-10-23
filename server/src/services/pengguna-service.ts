/**
 * Kelola akun dari layar Pengaturan › Pengguna dan peran.
 *
 * Aturan isiannya ada di `auth/akun.ts`; di sini aturan yang butuh basis data:
 * nama pengguna unik, RT yang benar-benar ada, dan admin aktif terakhir yang tidak
 * boleh hilang. Setiap perubahan berjalan dalam satu transaksi yang menyebut
 * pelakunya, sehingga trigger audit mencatat siapa mengubah apa.
 */

import type { Pool, PoolClient } from 'pg';

import { bacaIsianAkun, SANDI_MINIMAL } from '../auth/akun.ts';
import type { IsianAkun } from '../auth/akun.ts';
import { hashKataSandi } from '../auth/kata-sandi.ts';
import type { PenggunaAktif } from '../auth/peran.ts';
import { dalamTransaksi } from '../db/transaksi.ts';
import * as penggunaRepo from '../repositories/pengguna-repository.ts';
import type { PenggunaPublik } from '../repositories/pengguna-repository.ts';
import * as sesiRepo from '../repositories/sesi-repository.ts';

/** Galat yang pantas diteruskan ke pemanggil apa adanya. */
export class GalatAkun extends Error {
    readonly status: 400 | 403 | 404 | 409;

    constructor(status: 400 | 403 | 404 | 409, pesan: string) {
        super(pesan);
        this.name = 'GalatAkun';
        this.status = status;
    }
}

const SUMBER = 'aplikasi';
const USERNAME_DIPAKAI = 'Nama pengguna ini sudah dipakai akun lain.';
const ADMIN_TERAKHIR =
    'Admin aktif terakhir tidak bisa diturunkan perannya maupun dinonaktifkan.';

/** Pelanggaran unique index: dua admin menambah nama pengguna yang sama bersamaan. */
function usernameBentrok(galat: unknown): boolean {
    return (
        typeof galat === 'object' &&
        galat !== null &&
        (galat as { code?: string }).code === '23505'
    );
}

async function rtUntuk(klien: PoolClient, isian: IsianAkun): Promise<number | null> {
    if (isian.peran !== 'kader' || isian.rt === null) {
        return null;
    }

    if (isian.posyanduId == null) {
        throw new GalatAkun(400, 'Pilih Posyandu/RW untuk akun ini.');
    }
    const id = await penggunaRepo.cariRtIdDiPosyandu(klien, isian.posyanduId, isian.rt);

    if (id === null) {
        throw new GalatAkun(400, `RT ${isian.rt} belum ada di data wilayah.`);
    }

    return id;
}

export async function daftarAkun(
    pool: Pool,
    pelaku: PenggunaAktif,
): Promise<{ pengguna: PenggunaPublik[]; wilayahRt: {posyanduId:number;rt:string}[]; posyandu: penggunaRepo.PosyanduPublik[] }> {
    const [pengguna, wilayahRt, posyandu] = await Promise.all([
        penggunaRepo.daftar(pool, pelaku),
        penggunaRepo.daftarRt(pool, pelaku.posyanduIds ?? [], pelaku.superAdmin ?? false),
        penggunaRepo.daftarPosyandu(pool, pelaku),
    ]);

    return { pengguna, wilayahRt, posyandu };
}

function validasiCakupan(pelaku: PenggunaAktif, isian: IsianAkun, bolehGlobal = false): void {
    if (isian.posyanduId == null) {
        if (bolehGlobal) return;
        throw new GalatAkun(400, 'Pilih Posyandu/RW untuk akun ini.');
    }
    if (!pelaku.superAdmin && !(pelaku.posyanduIds ?? []).includes(isian.posyanduId)) {
        throw new GalatAkun(403, 'Akun hanya dapat dikelola pada Posyandu/RW Anda.');
    }
}

export async function tambahAkun(
    pool: Pool,
    pelaku: PenggunaAktif,
    badan: unknown,
): Promise<PenggunaPublik> {
    const hasil = bacaIsianAkun(badan);

    if ('galat' in hasil) {
        throw new GalatAkun(400, hasil.galat);
    }
    validasiCakupan(pelaku, hasil.isian);

    // Di luar transaksi: scrypt sengaja lambat, dan kunci baris tidak perlu
    // ditahan selama itu.
    const hash = await hashKataSandi(hasil.kataSandi ?? '');

    try {
        const id = await dalamTransaksi(pool, { pengguna: pelaku.id, sumber: SUMBER }, async (klien) => {
            if (await penggunaRepo.usernameDipakai(klien, hasil.isian.username)) {
                throw new GalatAkun(409, USERNAME_DIPAKAI);
            }

            return penggunaRepo.sisipkan(klien, hasil.isian, hash, await rtUntuk(klien, hasil.isian));
        });

        return (await penggunaRepo.ambil(pool, id)) as PenggunaPublik;
    } catch (galat) {
        throw usernameBentrok(galat) ? new GalatAkun(409, USERNAME_DIPAKAI) : galat;
    }
}

/**
 * Mengubah akun. `sesiPelaku` adalah ringkasan sesi admin yang meminta: bila ia
 * mengganti kata sandinya sendiri, sesi itu dipertahankan dan sesi lainnya
 * dicabut.
 */
export async function ubahAkun(
    pool: Pool,
    pelaku: PenggunaAktif,
    id: number,
    badan: unknown,
    sesiPelaku: string | null,
): Promise<PenggunaPublik> {
    // Kata sandi diperiksa dan di-hash lebih dulu, di luar transaksi, karena
    // scrypt sengaja lambat. Kolom lain baru bisa diperiksa setelah nilai
    // lamanya terbaca di dalam transaksi.
    const sandi =
        typeof badan === 'object' && badan !== null && 'kataSandi' in badan
            ? (badan as { kataSandi: unknown }).kataSandi
            : undefined;

    if (typeof sandi === 'string' && sandi !== '' && sandi.length < SANDI_MINIMAL) {
        throw new GalatAkun(400, `Kata sandi minimal ${SANDI_MINIMAL} karakter.`);
    }

    const hash = typeof sandi === 'string' && sandi !== '' ? await hashKataSandi(sandi) : null;

    try {
        await dalamTransaksi(pool, { pengguna: pelaku.id, sumber: SUMBER }, async (klien) => {
            // Kunci admin dulu, baru akunnya: urutan yang sama di setiap
            // permintaan mencegah dua transaksi saling menunggu.
            const adminAktif = await penggunaRepo.kunciAdminAktif(klien);
            const lama = await penggunaRepo.cariUntukUbah(klien, id);

            if (lama === null) {
                throw new GalatAkun(404, 'Pengguna tidak ditemukan.');
            }
            if (lama.superAdmin && !pelaku.superAdmin) {
                throw new GalatAkun(403, 'Akun superadmin hanya dapat dikelola superadmin.');
            }
            if (!lama.superAdmin && !pelaku.superAdmin &&
                (lama.posyanduId === null || !(pelaku.posyanduIds ?? []).includes(lama.posyanduId))) {
                throw new GalatAkun(404, 'Pengguna tidak ditemukan pada Posyandu/RW Anda.');
            }

            const hasil = bacaIsianAkun(badan, lama);

            if ('galat' in hasil) {
                throw new GalatAkun(400, hasil.galat);
            }

            const baru = hasil.isian;
            if (lama.superAdmin && (baru.peran !== 'admin' || !baru.aktif)) {
                throw new GalatAkun(409, 'Akun superadmin Mirae harus tetap aktif dengan peran admin.');
            }
            validasiCakupan(pelaku, baru, lama.superAdmin && pelaku.superAdmin);
            const turun = lama.peran === 'admin' && lama.aktif && (baru.peran !== 'admin' || !baru.aktif);

            // Tanpa admin aktif, tidak ada seorang pun yang bisa membuka layar
            // ini lagi untuk memulihkannya selain lewat basis data.
            if (turun && adminAktif.every((adminId) => adminId === id)) {
                throw new GalatAkun(409, ADMIN_TERAKHIR);
            }

            if (
                baru.username !== lama.username &&
                (await penggunaRepo.usernameDipakai(klien, baru.username, id))
            ) {
                throw new GalatAkun(409, USERNAME_DIPAKAI);
            }

            await penggunaRepo.perbarui(klien, id, baru, await rtUntuk(klien, baru), hash);

            // Server memang membaca ulang peran pada setiap permintaan, tetapi
            // layar yang sedang terbuka masih menampilkan menu peran lamanya.
            // Masuk ulang menyamakan keduanya. Hanya admin yang mengganti
            // kata sandinya sendiri yang tetap masuk di sesi ini.
            const peranBerubah = baru.peran !== lama.peran;

            if (hash !== null || (lama.aktif && !baru.aktif) || peranBerubah) {
                await sesiRepo.hapusMilikPenggunaKecuali(
                    klien,
                    id,
                    id === pelaku.id && baru.aktif && !peranBerubah ? sesiPelaku : null,
                );
            }
        });
    } catch (galat) {
        throw usernameBentrok(galat) ? new GalatAkun(409, USERNAME_DIPAKAI) : galat;
    }

    return (await penggunaRepo.ambil(pool, id)) as PenggunaPublik;
}
