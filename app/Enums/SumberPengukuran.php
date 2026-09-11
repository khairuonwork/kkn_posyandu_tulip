<?php

namespace App\Enums;

/**
 * Asal sebuah rekam pengukuran.
 *
 * `Tablet` disediakan sejak awal supaya penambahan Aplikasi Tablet nanti
 * tidak menuntut migrasi data. Lihat docs/adr/0003-batas-portal-vs-aplikasi-tablet.md.
 */
enum SumberPengukuran: string
{
    case Import = 'import';
    case Manual = 'manual';
    case Tablet = 'tablet';

    public function label(): string
    {
        return match ($this) {
            self::Import => 'Impor arsip',
            self::Manual => 'Input manual',
            self::Tablet => 'Aplikasi tablet',
        };
    }
}
