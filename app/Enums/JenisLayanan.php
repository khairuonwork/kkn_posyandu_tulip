<?php

namespace App\Enums;

enum JenisLayanan: string
{
    case Imunisasi = 'imunisasi';
    case VitaminA = 'vitamin_a';
    case ObatCacing = 'obat_cacing';

    public function label(): string
    {
        return match ($this) {
            self::Imunisasi => 'Imunisasi',
            self::VitaminA => 'Vitamin A',
            self::ObatCacing => 'Obat cacing',
        };
    }
}
