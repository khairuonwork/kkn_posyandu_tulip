<?php

namespace App\Models;

use App\Enums\JenisLayanan;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Imunisasi, Vitamin A, dan obat cacing dalam satu tabel, dibedakan kolom jenis.
 *
 * @property int $id
 * @property int $anak_id
 * @property int|null $periode_id
 * @property JenisLayanan $jenis
 * @property string|null $keterangan
 * @property Carbon|null $tanggal
 * @property-read Anak $anak
 * @property-read Periode|null $periode
 */
#[Fillable(['anak_id', 'periode_id', 'jenis', 'keterangan', 'tanggal'])]
class Layanan extends Model
{
    protected $table = 'layanan';

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
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'jenis' => JenisLayanan::class,
            'tanggal' => 'date',
        ];
    }
}
