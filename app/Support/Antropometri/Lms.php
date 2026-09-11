<?php

namespace App\Support\Antropometri;

/**
 * Tiga parameter distribusi rujukan WHO untuk satu titik pada satu kurva.
 */
final readonly class Lms
{
    public function __construct(
        public float $l,
        public float $m,
        public float $s,
    ) {}

    /**
     * Interpolasi linear antara dua baris standar.
     *
     * Dipakai untuk indeks berkunci panjang/tinggi badan, yang tabelnya
     * berlangkah 0,5 cm sementara nilai ukur bisa jatuh di antaranya.
     */
    public static function interpolasi(self $bawah, self $atas, float $bobot): self
    {
        return new self(
            $bawah->l + ($atas->l - $bawah->l) * $bobot,
            $bawah->m + ($atas->m - $bawah->m) * $bobot,
            $bawah->s + ($atas->s - $bawah->s) * $bobot,
        );
    }
}
