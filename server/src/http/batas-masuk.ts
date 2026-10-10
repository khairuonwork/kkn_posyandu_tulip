/**
 * Pembatas percobaan masuk.
 *
 * Tanpa ini, kata sandi sekuat apa pun hanya soal waktu — dan kata sandi kader
 * Posyandu tidak akan kuat. scrypt memang memperlambat tiap percobaan, tetapi
 * memperlambat bukan menghentikan.
 *
 * ponytail: hitungannya di memori proses ini saja. Bila server nanti berjalan
 * lebih dari satu instance, pindahkan ke tabel `percobaan_masuk` — sebelum itu,
 * satu Map sudah menutup ancaman yang nyata dan tidak menambah dependensi.
 */

export const MAKS_GAGAL = 5;
/** Batas tambahan per username+alamat bersama agar banyak tablet satu lokasi tetap bisa masuk. */
export const MAKS_GAGAL_JARINGAN = 15;

const JEDA_MS = 15 * 60 * 1000;

type Catatan = {
    gagal: number;
    /** Akhir jendela hitung; sekaligus akhir tahanan setelah batas tercapai. */
    kedaluwarsa: number;
};

const catatan = new Map<string, Catatan>();

/**
 * Batas utama dipisah per perangkat agar satu tablet yang salah mengetik tidak
 * mengunci tablet lain. Batas jaringan yang lebih longgar tetap menahan spam
 * dari satu alamat bersama.
 */
function kunci(username: string, ip: string, perangkat: string): string {
    return `${username.trim().toLowerCase()}|${ip}|${perangkat}`;
}

function kunciJaringan(username: string, ip: string): string {
    return `${username.trim().toLowerCase()}|${ip}|*`;
}

function sisaDari(c: Catatan | undefined, sekarang: number, batas: number): number {
    if (c === undefined || c.kedaluwarsa <= sekarang || c.gagal < batas) return 0;
    return Math.ceil((c.kedaluwarsa - sekarang) / 1000);
}

/** Sisa detik sebelum boleh mencoba lagi; 0 bila tidak sedang ditahan. */
export function sisaTahanan(
    username: string,
    ip: string,
    perangkat = "legacy",
    sekarang = Date.now(),
): number {
    return Math.max(
        sisaDari(catatan.get(kunci(username, ip, perangkat)), sekarang, MAKS_GAGAL),
        sisaDari(catatan.get(kunciJaringan(username, ip)), sekarang, MAKS_GAGAL_JARINGAN),
    );
}

function tambahGagal(k: string, sekarang: number, batas: number): void {
    const c = catatan.get(k);

    // Jendela baru: kegagalan pertama, atau jendela lama sudah lewat.
    if (c === undefined || c.kedaluwarsa <= sekarang) {
        catatan.set(k, { gagal: 1, kedaluwarsa: sekarang + JEDA_MS });
    } else {
        c.gagal += 1;

        if (c.gagal >= batas) {
            // Tahanan dihitung ulang dari kegagalan terakhir, bukan dari yang
            // pertama — mencoba terus tidak mempercepat berakhirnya.
            c.kedaluwarsa = sekarang + JEDA_MS;
        }
    }
}

export function catatGagal(
    username: string,
    ip: string,
    perangkat = "legacy",
    sekarang = Date.now(),
): void {
    tambahGagal(kunci(username, ip, perangkat), sekarang, MAKS_GAGAL);
    tambahGagal(kunciJaringan(username, ip), sekarang, MAKS_GAGAL_JARINGAN);

    // Pembersihan malas: hanya saat ada kegagalan, dan hanya bila petanya sudah
    // cukup besar untuk pantas dibersihkan.
    if (catatan.size > 1000) {
        for (const [lain, isi] of catatan) {
            if (isi.kedaluwarsa <= sekarang) {
                catatan.delete(lain);
            }
        }
    }
}

export function catatBerhasil(username: string, ip: string, perangkat = "legacy"): void {
    catatan.delete(kunci(username, ip, perangkat));
    catatan.delete(kunciJaringan(username, ip));
}

/** Hanya untuk pengujian. */
export function kosongkanBatas(): void {
    catatan.clear();
}
