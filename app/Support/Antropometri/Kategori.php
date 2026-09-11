<?php

namespace App\Support\Antropometri;

use App\Enums\Indeks;

/**
 * Pemetaan z-score menjadi kategori status gizi menurut PMK No. 2 Tahun 2020.
 *
 * Metode perhitungannya WHO LMS, tetapi ambang pembacaannya tetap Permenkes —
 * keduanya memang memakai ambang yang sama, sehingga label pada laporan cocok
 * dengan yang diharapkan Puskesmas.
 *
 * @see docs/04-spesifikasi-antropometri.md bagian 4
 */
class Kategori
{
    /**
     * Mengembalikan null untuk LILA/U: PMK 2/2020 menyediakan tabel standarnya,
     * tetapi label kategorinya belum dikonfirmasi pemilik program (OI-04).
     * Menebak label pada indeks gizi akut bukan pilihan yang aman.
     */
    public static function dari(Indeks $indeks, float $z): ?string
    {
        return match ($indeks) {
            Indeks::BB_U => self::beratMenurutUmur($z),
            Indeks::TB_U => self::tinggiMenurutUmur($z),
            Indeks::BB_TB, Indeks::IMT_U => self::beratMenurutTinggi($z),
            Indeks::LIKA_U => self::lingkarKepala($z),
            Indeks::LILA_U => null,
        };
    }

    private static function beratMenurutUmur(float $z): string
    {
        return match (true) {
            $z < -3 => 'Berat badan sangat kurang',
            $z < -2 => 'Berat badan kurang',
            $z <= 1 => 'Berat badan normal',
            default => 'Risiko berat badan lebih',
        };
    }

    private static function tinggiMenurutUmur(float $z): string
    {
        return match (true) {
            $z < -3 => 'Sangat pendek',
            $z < -2 => 'Pendek',
            $z <= 3 => 'Normal',
            default => 'Tinggi',
        };
    }

    private static function beratMenurutTinggi(float $z): string
    {
        return match (true) {
            $z < -3 => 'Gizi buruk',
            $z < -2 => 'Gizi kurang',
            $z <= 1 => 'Gizi baik',
            $z <= 2 => 'Berisiko gizi lebih',
            $z <= 3 => 'Gizi lebih',
            default => 'Obesitas',
        };
    }

    private static function lingkarKepala(float $z): string
    {
        return match (true) {
            $z < -2 => 'Mikrosefali',
            $z <= 2 => 'Normal',
            default => 'Makrosefali',
        };
    }

    /**
     * Kategori yang menuntut tindak lanjut, dipakai dashboard dan daftar rujukan.
     *
     * @return array<string>
     */
    public static function perluTindakLanjut(): array
    {
        return [
            'Berat badan sangat kurang',
            'Berat badan kurang',
            'Sangat pendek',
            'Pendek',
            'Gizi buruk',
            'Gizi kurang',
            'Obesitas',
        ];
    }
}
