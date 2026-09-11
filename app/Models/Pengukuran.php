<?php

namespace App\Models;

use App\Enums\JenisUkur;
use App\Enums\StatusKehadiran;
use App\Enums\SumberPengukuran;
use Database\Factories\PengukuranFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $anak_id
 * @property int $periode_id
 * @property int|null $dicatat_oleh
 * @property Carbon $tanggal_ukur
 * @property float|null $bb_kg
 * @property float|null $tinggi_cm
 * @property JenisUkur|null $jenis_ukur
 * @property float|null $lila_cm
 * @property float|null $lika_cm
 * @property string|null $ntob_raw
 * @property StatusKehadiran $status_kehadiran
 * @property string|null $catatan
 * @property SumberPengukuran $sumber
 * @property-read Anak $anak
 * @property-read Periode $periode
 * @property-read Collection<int, PenilaianGizi> $penilaianGizi
 */
#[Fillable([
    'anak_id', 'periode_id', 'dicatat_oleh', 'tanggal_ukur', 'bb_kg', 'tinggi_cm',
    'jenis_ukur', 'lila_cm', 'lika_cm', 'ntob_raw', 'status_kehadiran', 'catatan', 'sumber',
])]
class Pengukuran extends Model
{
    /** @use HasFactory<PengukuranFactory> */
    use HasFactory;

    protected $table = 'pengukuran';

    /**
     * @return BelongsTo<Anak, $this>
     */
    public function anak(): BelongsTo
    {
        return $this->belongsTo(Anak::class);
    }

    /**
     * @return BelongsTo<Periode, $this>
     */
    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class);
    }

    /**
     * @return HasMany<PenilaianGizi, $this>
     */
    public function penilaianGizi(): HasMany
    {
        return $this->hasMany(PenilaianGizi::class);
    }

    /**
     * Indeks Massa Tubuh, dihitung dari berat dan tinggi. Tidak pernah diinput.
     */
    public function imt(): ?float
    {
        if ($this->bb_kg === null || $this->tinggi_cm === null || (float) $this->tinggi_cm <= 0) {
            return null;
        }

        return (float) $this->bb_kg / (((float) $this->tinggi_cm / 100) ** 2);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tanggal_ukur' => 'date',
            'jenis_ukur' => JenisUkur::class,
            'status_kehadiran' => StatusKehadiran::class,
            'sumber' => SumberPengukuran::class,
            'bb_kg' => 'decimal:2',
            'tinggi_cm' => 'decimal:1',
            'lila_cm' => 'decimal:1',
            'lika_cm' => 'decimal:1',
        ];
    }
}
