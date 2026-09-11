<?php

namespace App\Support\Antropometri;

use App\Enums\Indeks;
use App\Enums\JenisKelamin;

/**
 * Perhitungan z-score dengan metode LMS WHO.
 *
 * @see docs/04-spesifikasi-antropometri.md bagian 2
 * @see docs/adr/0002-metode-z-score-who-lms.md
 */
class ZScore
{
    /**
     * Ambang praktis untuk "L sama dengan nol". Perbandingan kesamaan langsung
     * pada bilangan pecahan tidak dapat diandalkan.
     */
    private const EPSILON_L = 1e-7;

    public function __construct(
        private readonly StandarLmsRepository $standar,
    ) {}

    /**
     * Mengembalikan null bila baris standar tidak tersedia atau nilai ukur
     * tidak masuk akal. Status gizi yang salah lebih berbahaya daripada yang
     * kosong.
     */
    public function hitung(Indeks $indeks, JenisKelamin $jk, float $kunci, float $nilai): ?float
    {
        if ($nilai <= 0) {
            return null;
        }

        $lms = $this->standar->cari($indeks, $jk, $kunci);

        if ($lms === null) {
            return null;
        }

        $z = self::dariLms($lms, $nilai);

        if ($z === null) {
            return null;
        }

        if ($indeks->pakaiKoreksiEkstrem() && abs($z) > 3) {
            $z = self::koreksiEkstrem($lms, $nilai, $z);
        }

        return $z;
    }

    /**
     * Z = ((X/M)^L - 1) / (L*S), atau ln(X/M)/S ketika L mendekati nol.
     */
    public static function dariLms(Lms $lms, float $nilai): ?float
    {
        if ($lms->m <= 0 || $lms->s <= 0) {
            return null;
        }

        if (abs($lms->l) < self::EPSILON_L) {
            return log($nilai / $lms->m) / $lms->s;
        }

        return ((($nilai / $lms->m) ** $lms->l) - 1) / ($lms->l * $lms->s);
    }

    /**
     * Nilai ukur yang setara dengan z-score tertentu pada kurva ini.
     */
    public static function nilaiPadaZ(Lms $lms, float $z): float
    {
        if (abs($lms->l) < self::EPSILON_L) {
            return $lms->m * exp($lms->s * $z);
        }

        return $lms->m * ((1 + $lms->l * $lms->s * $z) ** (1 / $lms->l));
    }

    /**
     * Ekstrapolasi linear WHO di luar ±3 SD.
     *
     * Distribusi LMS menjadi tidak stabil di ekor, justru pada rentang tempat
     * kasus gizi buruk dan obesitas berada. Karena itu koreksi ini tidak boleh
     * disederhanakan.
     *
     * @see docs/04-spesifikasi-antropometri.md bagian 2.2
     */
    private static function koreksiEkstrem(Lms $lms, float $nilai, float $z): float
    {
        if ($z > 3) {
            $sd3 = self::nilaiPadaZ($lms, 3);
            $sd2 = self::nilaiPadaZ($lms, 2);

            return $sd3 === $sd2 ? $z : 3 + ($nilai - $sd3) / ($sd3 - $sd2);
        }

        $sd3 = self::nilaiPadaZ($lms, -3);
        $sd2 = self::nilaiPadaZ($lms, -2);

        return $sd2 === $sd3 ? $z : -3 + ($nilai - $sd3) / ($sd2 - $sd3);
    }
}
