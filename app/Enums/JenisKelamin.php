<?php

namespace App\Enums;

enum JenisKelamin: string
{
    case Lakilaki = 'L';
    case Perempuan = 'P';

    public function label(): string
    {
        return match ($this) {
            self::Lakilaki => 'Laki-laki',
            self::Perempuan => 'Perempuan',
        };
    }
}
