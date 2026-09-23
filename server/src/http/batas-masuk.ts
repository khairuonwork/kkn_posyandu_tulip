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

const JEDA_MS = 15 * 60 * 1000;

type Catatan = {
    gagal: number;
    /** Akhir jendela hitung; sekaligus akhir tahanan setelah batas tercapai. */
    kedaluwarsa: number;
};

const catatan = new Map<string, Catatan>();

/**
 * Dihitung per pasangan email dan alamat, bukan per alamat saja: satu jaringan
 * Posyandu dipakai bersama, dan satu kader yang salah ketik tidak boleh
 * mengunci kader lain di ruangan yang sama.
 */
function kunci(email: string, ip: string): string {
    return `${email.trim().toLowerCase()}|${ip}`;
}

/** Sisa detik sebelum boleh mencoba lagi; 0 bila tidak sedang ditahan. */
export function sisaTahanan(email: string, ip: string, sekarang = Date.now()): number {
    const c = catatan.get(kunci(email, ip));

    if (c === undefined || c.kedaluwarsa <= sekarang || c.gagal < MAKS_GAGAL) {
        return 0;
    }

    return Math.ceil((c.kedaluwarsa - sekarang) / 1000);
}

export function catatGagal(email: string, ip: string, sekarang = Date.now()): void {
    const k = kunci(email, ip);
    const c = catatan.get(k);

    // Jendela baru: kegagalan pertama, atau jendela lama sudah lewat.
    if (c === undefined || c.kedaluwarsa <= sekarang) {
        catatan.set(k, { gagal: 1, kedaluwarsa: sekarang + JEDA_MS });
    } else {
        c.gagal += 1;

        if (c.gagal >= MAKS_GAGAL) {
            // Tahanan dihitung ulang dari kegagalan terakhir, bukan dari yang
            // pertama — mencoba terus tidak mempercepat berakhirnya.
            c.kedaluwarsa = sekarang + JEDA_MS;
        }
    }

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

export function catatBerhasil(email: string, ip: string): void {
    catatan.delete(kunci(email, ip));
}

/** Hanya untuk pengujian. */
export function kosongkanBatas(): void {
    catatan.clear();
}
