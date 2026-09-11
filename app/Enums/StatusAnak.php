<?php

namespace App\Enums;

enum StatusAnak: string
{
    case Aktif = 'aktif';
    case Lulus = 'lulus';
    case Pindah = 'pindah';
    case Meninggal = 'meninggal';

    public function label(): string
    {
        return match ($this) {
            self::Aktif => 'Aktif',
            self::Lulus => 'Lulus (di atas 5 tahun)',
            self::Pindah => 'Pindah',
            self::Meninggal => 'Meninggal',
        };
    }

    /**
     * Hanya anak aktif yang dihitung sebagai S pada rasio D/S.
     */
    public function dihitungSebagaiSasaran(): bool
    {
        return $this === self::Aktif;
    }
}
