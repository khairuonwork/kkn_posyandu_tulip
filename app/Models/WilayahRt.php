<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $team_id
 * @property string $rt
 * @property string $rw
 * @property-read Team $team
 * @property-read Collection<int, Anak> $anak
 */
#[Fillable(['team_id', 'rt', 'rw'])]
class WilayahRt extends Model
{
    protected $table = 'wilayah_rt';

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return HasMany<Anak, $this>
     */
    public function anak(): HasMany
    {
        return $this->hasMany(Anak::class);
    }

    public function label(): string
    {
        return "RT {$this->rt} / RW {$this->rw}";
    }
}
