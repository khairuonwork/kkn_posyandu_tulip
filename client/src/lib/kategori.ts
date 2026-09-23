/**
 * Ambang z-score menjadi kategori PMK No. 2 Tahun 2020.
 *
 * Cermin dari `App\Support\Antropometri\Kategori`, dipakai satu tempat saja:
 * pratinjau langsung di editor baris Data Anak. Di mana-mana selain itu,
 * kategori datang jadi dari server bersama pengukurannya.
 *
 * Metode hitungnya WHO LMS, tetapi ambang pembacaannya Permenkes — keduanya
 * memang memakai ambang yang sama, sehingga label di layar cocok dengan yang
 * diharapkan Puskesmas.
 *
 * Label yang dikembalikan harus persis sama dengan kunci pada `NADA` di
 * components/status-gizi-badge.tsx; di sanalah kategori dipetakan ke warna, dan
 * pemetaan itu tetap satu-satunya.
 *
 * @see docs/rujukan/antropometri.md bagian 4
 */

import type { Indeks } from '@/types/posyandu';

function beratMenurutUmur(z: number): string {
    if (z < -3) {
        return 'Berat badan sangat kurang';
    }

    if (z < -2) {
        return 'Berat badan kurang';
    }

    if (z <= 1) {
        return 'Berat badan normal';
    }

    return 'Risiko berat badan lebih';
}

function tinggiMenurutUmur(z: number): string {
    if (z < -3) {
        return 'Sangat pendek';
    }

    if (z < -2) {
        return 'Pendek';
    }

    if (z <= 3) {
        return 'Normal';
    }

    return 'Tinggi';
}

function beratMenurutTinggi(z: number): string {
    if (z < -3) {
        return 'Gizi buruk';
    }

    if (z < -2) {
        return 'Gizi kurang';
    }

    if (z <= 1) {
        return 'Gizi baik';
    }

    if (z <= 2) {
        return 'Berisiko gizi lebih';
    }

    if (z <= 3) {
        return 'Gizi lebih';
    }

    return 'Obesitas';
}

function lingkarKepala(z: number): string {
    if (z < -2) {
        return 'Mikrosefali';
    }

    if (z <= 2) {
        return 'Normal';
    }

    return 'Makrosefali';
}

/**
 * Null untuk LILA/U: PMK 2/2020 punya tabel standarnya, tetapi label
 * kategorinya belum dikonfirmasi pemilik program (OI-04). Menebak label pada
 * indeks gizi akut bukan pilihan yang aman.
 */
export function kategoriDariZ(indeks: Indeks, z: number): string | null {
    switch (indeks) {
        case 'BB_U':
            return beratMenurutUmur(z);

        case 'TB_U':
            return tinggiMenurutUmur(z);

        case 'BB_TB':
        case 'IMT_U':
            return beratMenurutTinggi(z);

        case 'LIKA_U':
            return lingkarKepala(z);

        case 'LILA_U':
            return null;
    }
}
