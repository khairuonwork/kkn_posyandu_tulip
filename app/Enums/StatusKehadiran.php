<?php

namespace App\Enums;

/**
 * Status kehadiran anak pada satu periode penimbangan.
 *
 * Menampung nilai teks seperti `PINDAH RUMAH` yang di arsip Excel keliru
 * menempati kolom berat badan. Ketidakhadiran bukan berat badan nol.
 */
enum StatusKehadiran: string
{
    case Hadir = 'hadir';
    case TidakHadir = 'tidak_hadir';
    case Pindah = 'pindah';
    case TidakDapatDiukur = 'tidak_dapat_diukur';

    public function label(): string
    {
        return match ($this) {
            self::Hadir => 'Hadir',
            self::TidakHadir => 'Tidak hadir',
            self::Pindah => 'Pindah',
            self::TidakDapatDiukur => 'Tidak dapat diukur',
        };
    }

    /**
     * Hanya kehadiran yang dihitung sebagai D pada rasio D/S.
     */
    public function dihitungSebagaiDitimbang(): bool
    {
        return $this === self::Hadir;
    }
}
