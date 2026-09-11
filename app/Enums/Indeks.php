<?php

namespace App\Enums;

/**
 * Indeks antropometri yang dihitung sistem.
 *
 * @see docs/04-spesifikasi-antropometri.md
 */
enum Indeks: string
{
    case BB_U = 'BB_U';
    case TB_U = 'TB_U';
    case BB_TB = 'BB_TB';
    case IMT_U = 'IMT_U';
    case LILA_U = 'LILA_U';
    case LIKA_U = 'LIKA_U';

    /**
     * Label singkat untuk tabel dan grafik.
     */
    public function label(): string
    {
        return match ($this) {
            self::BB_U => 'BB/U',
            self::TB_U => 'TB/U',
            self::BB_TB => 'BB/TB',
            self::IMT_U => 'IMT/U',
            self::LILA_U => 'LILA/U',
            self::LIKA_U => 'LIKA/U',
        };
    }

    /**
     * Nama lengkap untuk keterangan dan tooltip.
     */
    public function namaLengkap(): string
    {
        return match ($this) {
            self::BB_U => 'Berat Badan menurut Umur',
            self::TB_U => 'Panjang/Tinggi Badan menurut Umur',
            self::BB_TB => 'Berat Badan menurut Panjang/Tinggi Badan',
            self::IMT_U => 'Indeks Massa Tubuh menurut Umur',
            self::LILA_U => 'Lingkar Lengan Atas menurut Umur',
            self::LIKA_U => 'Lingkar Kepala menurut Umur',
        };
    }

    /**
     * Tiga indeks inti yang ditonjolkan di dashboard.
     *
     * @return array<self>
     */
    public static function inti(): array
    {
        return [self::TB_U, self::BB_U, self::BB_TB];
    }

    /**
     * Kunci tabel standar: umur bulan, atau panjang/tinggi badan dalam cm.
     */
    public function kunciAdalahUmur(): bool
    {
        return $this !== self::BB_TB;
    }

    /**
     * Indeks berbasis berat memakai koreksi ekstrapolasi WHO di luar ±3 SD.
     *
     * TB/U dan LIKA/U berdistribusi mendekati normal sehingga tidak dikoreksi.
     *
     * @see docs/04-spesifikasi-antropometri.md bagian 2.2
     */
    public function pakaiKoreksiEkstrem(): bool
    {
        return match ($this) {
            self::BB_U, self::BB_TB, self::IMT_U, self::LILA_U => true,
            self::TB_U, self::LIKA_U => false,
        };
    }

    /**
     * Rentang z-score yang masih masuk akal secara biologis menurut WHO.
     * Di luar rentang ini nilai ditandai, bukan dibuang.
     *
     * @return array{float, float} [batas bawah, batas atas]
     */
    public function batasWajar(): array
    {
        return match ($this) {
            self::BB_U => [-6.0, 5.0],
            self::TB_U => [-6.0, 6.0],
            self::BB_TB, self::IMT_U, self::LIKA_U, self::LILA_U => [-5.0, 5.0],
        };
    }

    /**
     * Umur minimum (bulan) tempat indeks ini berlaku.
     *
     * LILA/U dibatasi sejak 6 bulan mengikuti PMK 2/2020 dan praktik pelaporan
     * Posyandu Tulip, meskipun tabel LMS WHO tersedia sejak 3 bulan. Master
     * Z-Score Juni 2026 menandai anak di bawah 6 bulan sebagai "USIA <6BLN".
     */
    public function umurMinimum(): int
    {
        return $this === self::LILA_U ? 6 : 0;
    }
}
