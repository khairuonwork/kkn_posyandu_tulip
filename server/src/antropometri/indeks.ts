/**
 * Indeks antropometri dan sifat masing-masing.
 *
 * Port dari `app/Enums/Indeks.php`, `JenisKelamin.php`, dan `JenisUkur.php`.
 * Ditulis sebagai union type dan objek konstan, bukan `enum`: Node menjalankan
 * TypeScript dengan membuang anotasi tipe, dan `enum` bukan sintaks yang dapat
 * dibuang begitu saja.
 *
 * @see docs/rujukan/antropometri.md
 */

export type Indeks = 'BB_U' | 'TB_U' | 'BB_TB' | 'IMT_U' | 'LILA_U' | 'LIKA_U';

export type JenisKelamin = 'L' | 'P';

export type JenisUkur = 'PB' | 'TB';

/**
 * Urutannya mengikat: hasil `hitungPenilaian` dibandingkan dengan keluaran PHP
 * yang memakai urutan deklarasi `Indeks::cases()`.
 */
export const SEMUA_INDEKS: readonly Indeks[] = [
    'BB_U',
    'TB_U',
    'BB_TB',
    'IMT_U',
    'LILA_U',
    'LIKA_U',
];

export const SEMUA_JENIS_KELAMIN: readonly JenisKelamin[] = ['L', 'P'];

type SifatIndeks = {
    label: string;
    namaLengkap: string;
    /** Kunci tabel: umur bulan, atau panjang/tinggi badan dalam cm. */
    kunciAdalahUmur: boolean;
    /** Indeks berbasis berat memakai ekstrapolasi WHO di luar ±3 SD. */
    pakaiKoreksiEkstrem: boolean;
    /** Rentang z yang masih masuk akal secara biologis: [bawah, atas]. */
    batasWajar: readonly [number, number];
    /** Umur minimum (bulan) tempat indeks ini berlaku. */
    umurMinimum: number;
};

export const SIFAT: Readonly<Record<Indeks, SifatIndeks>> = {
    BB_U: {
        label: 'BB/U',
        namaLengkap: 'Berat Badan menurut Umur',
        kunciAdalahUmur: true,
        pakaiKoreksiEkstrem: true,
        batasWajar: [-6, 5],
        umurMinimum: 0,
    },
    TB_U: {
        label: 'TB/U',
        namaLengkap: 'Panjang/Tinggi Badan menurut Umur',
        kunciAdalahUmur: true,
        // TB/U berdistribusi mendekati normal, jadi tidak dikoreksi.
        pakaiKoreksiEkstrem: false,
        batasWajar: [-6, 6],
        umurMinimum: 0,
    },
    BB_TB: {
        label: 'BB/TB',
        namaLengkap: 'Berat Badan menurut Panjang/Tinggi Badan',
        kunciAdalahUmur: false,
        pakaiKoreksiEkstrem: true,
        batasWajar: [-5, 5],
        umurMinimum: 0,
    },
    IMT_U: {
        label: 'IMT/U',
        namaLengkap: 'Indeks Massa Tubuh menurut Umur',
        kunciAdalahUmur: true,
        pakaiKoreksiEkstrem: true,
        batasWajar: [-5, 5],
        umurMinimum: 0,
    },
    LILA_U: {
        label: 'LILA/U',
        namaLengkap: 'Lingkar Lengan Atas menurut Umur',
        kunciAdalahUmur: true,
        pakaiKoreksiEkstrem: true,
        batasWajar: [-5, 5],
        // PMK 2/2020 dan praktik pelaporan Posyandu Tulip: berlaku sejak 6 bulan,
        // meskipun tabel LMS WHO tersedia sejak 3 bulan.
        umurMinimum: 6,
    },
    LIKA_U: {
        label: 'LIKA/U',
        namaLengkap: 'Lingkar Kepala menurut Umur',
        kunciAdalahUmur: true,
        pakaiKoreksiEkstrem: false,
        batasWajar: [-5, 5],
        umurMinimum: 0,
    },
};

/** Tiga indeks inti yang ditonjolkan di Beranda. */
export const INDEKS_INTI: readonly Indeks[] = ['TB_U', 'BB_U', 'BB_TB'];

/** Cara ukur yang seharusnya dipakai pada umur tertentu. */
export function jenisUkurSeharusnya(umurBulan: number): JenisUkur {
    return umurBulan < 24 ? 'PB' : 'TB';
}
