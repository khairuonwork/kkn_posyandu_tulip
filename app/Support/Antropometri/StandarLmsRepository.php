<?php

namespace App\Support\Antropometri;

use App\Enums\Indeks;
use App\Enums\JenisKelamin;
use App\Models\StandarLms;

/**
 * Akses tabel standar LMS.
 *
 * Seluruh tabel (906 baris) dimuat sekali per proses dan disimpan di memori.
 * Tanpa ini, perhitungan massal akan menembak database ribuan kali untuk data
 * yang tidak pernah berubah.
 *
 * @see docs/04-spesifikasi-antropometri.md bagian 6
 */
class StandarLmsRepository
{
    public const VERSI_DEFAULT = 'WHO-2006';

    /**
     * Kunci "INDEKS|JK" -> daftar [kunci => Lms] terurut menaik.
     *
     * @var array<string, array<string, Lms>>|null
     */
    private ?array $tabel = null;

    public function __construct(
        private readonly string $versi = self::VERSI_DEFAULT,
    ) {}

    public function versi(): string
    {
        return $this->versi;
    }

    /**
     * Cari parameter LMS untuk satu titik kurva.
     *
     * Indeks berkunci umur memakai bulan penuh dan tidak diinterpolasi — tabel
     * WHO memang per bulan penuh. Indeks berkunci panjang/tinggi diinterpolasi
     * linear karena tabelnya berlangkah 0,5 cm.
     *
     * Mengembalikan null bila kunci berada di luar rentang tabel; nilai tidak
     * pernah diekstrapolasi.
     */
    public function cari(Indeks $indeks, JenisKelamin $jk, float $kunci): ?Lms
    {
        $baris = $this->tabel()[$indeks->value.'|'.$jk->value] ?? null;

        if ($baris === null || $baris === []) {
            return null;
        }

        if ($indeks->kunciAdalahUmur()) {
            return $baris[$this->kunciKe((float) (int) $kunci)] ?? null;
        }

        return $this->interpolasi($baris, $kunci);
    }

    /**
     * @param  array<string, Lms>  $baris
     */
    private function interpolasi(array $baris, float $kunci): ?Lms
    {
        if (isset($baris[$this->kunciKe($kunci)])) {
            return $baris[$this->kunciKe($kunci)];
        }

        $kunciTersedia = array_map('floatval', array_keys($baris));
        $min = $kunciTersedia[0];
        $max = $kunciTersedia[count($kunciTersedia) - 1];

        if ($kunci < $min || $kunci > $max) {
            return null;
        }

        $bawah = $min;
        foreach ($kunciTersedia as $tersedia) {
            if ($tersedia > $kunci) {
                break;
            }
            $bawah = $tersedia;
        }

        $atas = $bawah;
        foreach ($kunciTersedia as $tersedia) {
            if ($tersedia > $bawah) {
                $atas = $tersedia;
                break;
            }
        }

        if ($atas === $bawah) {
            return $baris[$this->kunciKe($bawah)];
        }

        return Lms::interpolasi(
            $baris[$this->kunciKe($bawah)],
            $baris[$this->kunciKe($atas)],
            ($kunci - $bawah) / ($atas - $bawah),
        );
    }

    /**
     * @return array<string, array<string, Lms>>
     */
    private function tabel(): array
    {
        if ($this->tabel !== null) {
            return $this->tabel;
        }

        $tabel = [];

        StandarLms::query()
            ->where('versi', $this->versi)
            ->orderBy('indeks')
            ->orderBy('jk')
            ->orderBy('kunci')
            ->each(function (StandarLms $baris) use (&$tabel) {
                $tabel[$baris->indeks->value.'|'.$baris->jk->value][$this->kunciKe($baris->kunci)]
                    = new Lms($baris->l, $baris->m, $baris->s);
            });

        return $this->tabel = $tabel;
    }

    /**
     * Kunci larik berupa string berformat tetap: float tidak dapat diandalkan
     * sebagai kunci larik PHP.
     */
    private function kunciKe(float $kunci): string
    {
        return number_format($kunci, 1, '.', '');
    }
}
