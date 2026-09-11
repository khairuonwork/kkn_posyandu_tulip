<?php

namespace App\Models;

use Database\Factories\OrangTuaFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string|null $nik
 * @property string $nama
 * @property-read Collection<int, Anak> $anak
 */
#[Fillable(['nik', 'nama'])]
class OrangTua extends Model
{
    /** @use HasFactory<OrangTuaFactory> */
    use HasFactory;

    protected $table = 'orang_tua';

    /**
     * @return HasMany<Anak, $this>
     */
    public function anak(): HasMany
    {
        return $this->hasMany(Anak::class);
    }
}
