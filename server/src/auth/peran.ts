/**
 * Peran dan matriks izin.
 *
 * Diturunkan langsung dari matriks di docs/arsitektur.md bagian Otorisasi. Berkas ini
 * **satu-satunya** tempat aturan itu ditulis; controller dan UI membacanya,
 * tidak menyalinnya.
 *
 * Tiga peran berjenjang: peran yang lebih tinggi mewarisi seluruh hak peran di
 * bawahnya. Karena itu tiap aksi cukup menyebut peran terendah yang boleh
 * melakukannya, bukan daftar peran — daftar yang ditulis tangan cepat atau
 * lambat akan punya satu baris yang lupa diperbarui.
 */

export type Peran = 'kader' | 'bidan' | 'admin';

export type Aksi =
    // Kader ke atas
    | 'lihat-dashboard'
    | 'lihat-anak'
    | 'lihat-kms'
    | 'lihat-rekap'
    // Bidan ke atas
    | 'ubah-anak'
    | 'ubah-pengukuran'
    | 'gabung-duplikat'
    | 'selesaikan-konflik-impor'
    | 'unduh-rekap'
    // Admin saja
    | 'kelola-wilayah-rt'
    | 'kelola-periode'
    | 'hapus-data'
    | 'kelola-akun'
    | 'jalankan-impor';

/** Menaik. Perbandingan angkanya yang menegakkan pewarisan hak. */
const TINGKAT: Readonly<Record<Peran, number>> = {
    kader: 1,
    bidan: 2,
    admin: 3,
};

/** Peran terendah yang boleh melakukan tiap aksi. */
const MINIMUM: Readonly<Record<Aksi, Peran>> = {
    'lihat-dashboard': 'kader',
    'lihat-anak': 'kader',
    'lihat-kms': 'kader',
    'lihat-rekap': 'kader',

    'ubah-anak': 'bidan',
    'ubah-pengukuran': 'bidan',
    'gabung-duplikat': 'bidan',
    'selesaikan-konflik-impor': 'bidan',
    'unduh-rekap': 'bidan',

    'kelola-wilayah-rt': 'admin',
    'kelola-periode': 'admin',
    'hapus-data': 'admin',
    'kelola-akun': 'admin',
    'jalankan-impor': 'admin',
};

export const SEMUA_PERAN: readonly Peran[] = ['kader', 'bidan', 'admin'];

export const SEMUA_AKSI: readonly Aksi[] = Object.keys(MINIMUM) as Aksi[];

export function boleh(peran: Peran, aksi: Aksi): boolean {
    return TINGKAT[peran] >= TINGKAT[MINIMUM[aksi]];
}

export function peranMinimum(aksi: Aksi): Peran {
    return MINIMUM[aksi];
}

/** Akun yang sedang masuk, sejauh yang dibutuhkan otorisasi. */
export type PenggunaAktif = {
    id: number;
    peran: Peran;
    /** Hanya berarti untuk kader; bidan dan admin melihat seluruh RW. */
    rt: string | null;
    aktif: boolean;
};

/**
 * RT yang boleh dilihat pengguna ini: `null` berarti seluruh RW.
 *
 * Kader tanpa RT binaan **tidak** berarti boleh melihat semuanya. Itu keadaan
 * data yang salah, dan menafsirkannya sebagai akses penuh adalah cara paling
 * sunyi untuk membocorkan data seluruh RW. Karena itu ia melempar, bukan
 * mengembalikan null — pemanggil tidak punya cara keliru untuk memakainya.
 */
export function rtYangBolehDilihat(pengguna: PenggunaAktif): string | null {
    if (pengguna.peran !== 'kader') {
        return null;
    }

    if (pengguna.rt === null || pengguna.rt === '') {
        throw new Error(
            `Kader #${pengguna.id} tidak punya RT binaan; aksesnya tidak dapat ditentukan.`,
        );
    }

    return pengguna.rt;
}

/**
 * Apakah pengguna ini boleh menyentuh data milik RT tertentu.
 *
 * Dipakai di lapisan data, bukan hanya di route: penyaringan yang hanya ada di
 * query membuat satu endpoint yang lupa menyaring membocorkan seluruh RW.
 */
export function bolehAksesRt(pengguna: PenggunaAktif, rt: string | null): boolean {
    const terbatas = rtYangBolehDilihat(pengguna);

    return terbatas === null || terbatas === rt;
}
