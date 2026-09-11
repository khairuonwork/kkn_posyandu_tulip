<?php

namespace App\Models;

use App\Enums\Indeks;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $pengukuran_id
 * @property string $standar_versi
 * @property Indeks $indeks
 * @property float|null $z_score
 * @property string|null $kategori
 * @property bool $tidak_wajar
 * @property array<string, mixed>|null $catatan_perhitungan
 * @property Carbon $dihitung_pada
 * @property-read Pengukuran $pengukuran
 */
#[Fillable([
    'pengukuran_id', 'standar_versi', 'indeks', 'z_score',
    'kategori', 'tidak_wajar', 'catatan_perhitungan', 'dihitung_pada',
])]
class PenilaianGizi extends Model
{
    protected $table = 'penilaian_gizi';

    /**
     * @return BelongsTo<Pengukuran, $this>
     */
    public function pengukuran(): BelongsTo
    {
        return $this->belongsTo(Pengukuran::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'indeks' => Indeks::class,
            'z_score' => 'float',
            'tidak_wajar' => 'boolean',
            'catatan_perhitungan' => 'array',
            'dihitung_pada' => 'datetime',
        ];
    }
}
