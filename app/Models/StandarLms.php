<?php

namespace App\Models;

use App\Enums\Indeks;
use App\Enums\JenisKelamin;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Master data standar antropometri WHO dalam bentuk parameter LMS.
 *
 * Tabel referensi, bukan data yang diinput pengguna. Diisi sekali lewat seed
 * dari database/data/who-lms.json.
 *
 * @property int $id
 * @property string $versi
 * @property Indeks $indeks
 * @property JenisKelamin $jk
 * @property float $kunci
 * @property float $l
 * @property float $m
 * @property float $s
 */
#[Fillable(['versi', 'indeks', 'jk', 'kunci', 'l', 'm', 's'])]
class StandarLms extends Model
{
    protected $table = 'standar_lms';

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'indeks' => Indeks::class,
            'jk' => JenisKelamin::class,
            'kunci' => 'float',
            'l' => 'float',
            'm' => 'float',
            's' => 'float',
        ];
    }
}
