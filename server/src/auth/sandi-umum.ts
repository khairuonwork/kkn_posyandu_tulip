/**
 * Pemeriksa kata sandi baru: mudah diingat, tetapi bukan sandi umum.
 *
 * Tidak ada aturan huruf besar, angka, atau simbol (NIST SP 800-63B). Aturan
 * semacam itu membuat petugas lupa sandinya tanpa membuat sandi lebih sulit
 * ditebak. Yang ditolak hanya sandi yang memang mudah ditebak orang lain.
 *
 * `sandi-umum.txt` berisi sandi berpanjang 8 karakter ke atas dari
 * `100k-most-used-passwords-NCSC.txt` (SecLists, © Daniel Miessler, lisensi MIT;
 * datanya dari Have I Been Pwned melalui NCSC Inggris), disaring menjadi huruf
 * kecil tanpa spasi. Sandi yang lebih pendek sudah ditolak oleh batas panjang.
 */

import { readFileSync } from 'node:fs';

export const SANDI_MINIMAL = 8;

const UMUM = new Set(
    readFileSync(new URL('./sandi-umum.txt', import.meta.url), 'utf8')
        .split('\n')
        .filter((baris) => baris !== ''),
);

/**
 * Kata yang menjadi inti sandi lokal yang mudah ditebak, misalnya
 * `Posyandu2026!` atau `sayang123`: kata ini ditambah angka atau simbol saja.
 */
const KATA_LOKAL = new Set([
    // Aplikasi dan tempat kerja petugas.
    'posyandu', 'tulip', 'simpatik', 'kader', 'bidan', 'admin', 'administrator',
    'superadmin', 'balita', 'bayi', 'anak', 'ibu', 'puskesmas', 'kesehatan',
    'sehat', 'gizi', 'timbang', 'penimbangan', 'citeureup', 'kms', 'sandi',
    'katasandi', 'password', 'rahasia', 'masuk', 'login', 'pengguna', 'user',
    // Kata yang sering dipakai sebagai sandi di Indonesia.
    'sayang', 'sayangku', 'cinta', 'cintaku', 'kasih', 'rindu', 'bismillah',
    'alhamdulillah', 'assalamualaikum', 'insyaallah', 'masyaallah',
    'subhanallah', 'allahuakbar', 'allah', 'muhammad', 'indonesia', 'merdeka',
    'garuda', 'pancasila', 'jakarta', 'bandung', 'bogor', 'surabaya',
    'semarang', 'yogyakarta', 'jogja', 'medan', 'makassar', 'bekasi', 'depok',
    'tangerang', 'sunda', 'jawa', 'ganteng', 'cantik', 'manis', 'kucing',
    'anjing', 'doraemon', 'naruto', 'persib', 'persija', 'arema', 'bobotoh',
    'jakmania', 'mamah', 'papah', 'mama', 'papa', 'bapak', 'ayah', 'bunda',
    'keluarga', 'selamanya', 'selamat', 'sukses', 'rezeki', 'bahagia',
    'semangat', 'berkah', 'amanah', 'mawar', 'melati', 'bunga', 'matahari',
    'bulan', 'bintang', 'pelangi', 'sahabat', 'teman',
]);

const PESAN_UMUM =
    'Kata sandi ini terlalu umum sehingga mudah ditebak orang lain. Coba gabungan dua atau tiga kata yang mudah diingat.';

/** Pesan penolakan untuk sandi baru, atau null bila sandi boleh dipakai. */
export function periksaSandi(
    sandi: string,
    akun: { username?: string; nama?: string } = {},
): string | null {
    if (sandi.length < SANDI_MINIMAL) {
        return `Kata sandi minimal ${SANDI_MINIMAL} karakter.`;
    }

    const rapat = sandi.toLowerCase().replace(/\s+/g, '');
    // Inti sandi: huruf yang tersisa setelah angka dan simbol di kedua ujung dibuang.
    const inti = rapat.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');

    if (UMUM.has(rapat) || UMUM.has(inti) || KATA_LOKAL.has(inti) || new Set(rapat).size < 4) {
        return PESAN_UMUM;
    }

    // Bagian nama di bawah 4 huruf dilewati: "ani" atau "sri" terlalu sering
    // muncul di dalam kata lain.
    const username = akun.username ?? '';
    const bagianNama = [username, ...username.split(/[._-]/), ...(akun.nama ?? '').split(/\s+/)]
        .map((bagian) => bagian.toLowerCase())
        .filter((bagian) => bagian.length >= 4);

    if (bagianNama.some((bagian) => rapat.includes(bagian))) {
        return 'Kata sandi tidak boleh memuat nama pengguna atau nama pemilik akun.';
    }

    return null;
}
