<?php

namespace App\Models;

use Database\Factories\PeriodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $team_id
 * @property int $bulan
 * @property int $tahun
 * @property Carbon|null $tanggal_kegiatan
 * @property-read Team $team
 * @property-read Collection<int, Pengukuran> $pengukuran
 */
#[Fillable(['team_id', 'bulan', 'tahun', 'tanggal_kegiatan'])]
class Periode extends Model
{
    /** @use HasFactory<PeriodeFactory> */
    use HasFactory;

    protected $table = 'periode';

    private const NAMA_BULAN = [
        1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return HasMany<Pengukuran, $this>
     */
    public function pengukuran(): HasMany
    {
        return $this->hasMany(Pengukuran::class);
    }

    public function label(): string
    {
        return self::NAMA_BULAN[$this->bulan].' '.$this->tahun;
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal_kegiatan' => 'date',
            'bulan' => 'integer',
            'tahun' => 'integer',
        ];
    }
}
