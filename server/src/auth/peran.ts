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

export type Peran = "kader" | "bidan" | "admin" | "kms";

export type Aksi =
    // Kader ke atas
    | "lihat-dashboard"
    | "lihat-anak"
    | "lihat-kms"
    | "lihat-rekap"
    | "daftar-anak-lapangan"
    | "catat-pengukuran-lapangan"
    // Semua kader melihat sasaran lintas RT. RT pada akun kader hanya penugasan
    // administratif, bukan pembatasan data.
    | "ubah-anak"
    // Bidan ke atas
    | "ubah-pengukuran"
    | "gabung-duplikat"
    | "selesaikan-konflik-impor"
    | "unduh-rekap"
    // Admin saja
    | "kelola-wilayah-rt"
    | "kelola-periode"
    | "hapus-data"
    | "kelola-akun"
    | "jalankan-impor"
    | "selesaikan-sesi-lapangan"
    | "konfirmasi-kms";

/** Menaik. Perbandingan angkanya yang menegakkan pewarisan hak. */
const TINGKAT: Readonly<Record<Peran, number>> = {
    kader: 1,
    bidan: 2,
    admin: 3,
    kms: 1,
};

/** Peran terendah yang boleh melakukan tiap aksi. */
const MINIMUM: Readonly<Record<Aksi, Peran>> = {
    "lihat-dashboard": "kader",
    "lihat-anak": "kader",
    "lihat-kms": "kader",
    "lihat-rekap": "kader",
    "daftar-anak-lapangan": "kader",
    "catat-pengukuran-lapangan": "kader",

    "ubah-anak": "kader",
    "ubah-pengukuran": "bidan",
    "gabung-duplikat": "bidan",
    "selesaikan-konflik-impor": "bidan",
    "unduh-rekap": "bidan",

    "kelola-wilayah-rt": "admin",
    "kelola-periode": "admin",
    "hapus-data": "admin",
    "kelola-akun": "admin",
    "jalankan-impor": "admin",
    "selesaikan-sesi-lapangan": "admin",
    "konfirmasi-kms": "kms",
};

export const SEMUA_PERAN: readonly Peran[] = ["kader", "bidan", "admin", "kms"];

export const SEMUA_AKSI: readonly Aksi[] = Object.keys(MINIMUM) as Aksi[];

export function boleh(peran: Peran, aksi: Aksi): boolean {
    // Role KMS bersifat terfokus: dapat membaca analisa anak dan hanya KMS
    // yang berhak menutup tahap pemeriksaan. Ia tidak mewarisi hak input kader.
    if (peran === "kms") {
        return ["lihat-dashboard", "lihat-anak", "lihat-kms", "konfirmasi-kms"].includes(aksi);
    }
    if (aksi === "konfirmasi-kms") return false;
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
 * Semua kader mendapat cakupan seluruh RT Posyandu. RT di profil akun hanya
 * menunjukkan penugasan, bukan batas akses.
 */
export function rtYangBolehDilihat(pengguna: PenggunaAktif): string | null {
    void pengguna;
    return null;
}

/**
 * Apakah pengguna ini boleh melihat data milik RT tertentu. Seluruh kader
 * dapat melihat semua RT; fungsi dipertahankan sebagai satu sumber kebijakan
 * untuk query yang mungkin kelak menambah filter.
 */
export function bolehAksesRt(
    pengguna: PenggunaAktif,
    rt: string | null,
): boolean {
    const terbatas = rtYangBolehDilihat(pengguna);

    return terbatas === null || terbatas === rt;
}
