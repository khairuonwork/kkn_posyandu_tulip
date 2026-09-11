<?php

namespace App\Enums;

/**
 * Cara pengukuran panjang/tinggi badan.
 *
 * Selisih sistematis antara keduanya 0,7 cm dan berpengaruh langsung pada
 * penetapan status stunting, sehingga tidak boleh dicampur.
 */
enum JenisUkur: string
{
    case PanjangBadan = 'PB';
    case TinggiBadan = 'TB';

    public function label(): string
    {
        return match ($this) {
            self::PanjangBadan => 'Panjang badan (telentang)',
            self::TinggiBadan => 'Tinggi badan (berdiri)',
        };
    }

    /**
     * Cara ukur yang seharusnya dipakai pada umur tertentu.
     * Dipakai sebagai asumsi ketika sumber data tidak mencatatnya.
     */
    public static function seharusnyaPadaUmur(int $umurBulan): self
    {
        return $umurBulan < 24 ? self::PanjangBadan : self::TinggiBadan;
    }
}
