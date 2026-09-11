<?php

namespace App\Models;

use App\Enums\JenisKelamin;
use App\Enums\StatusAnak;
use Database\Factories\AnakFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string|null $nik
 * @property int|null $orang_tua_id
 * @property int|null $wilayah_rt_id
 * @property string $nama
 * @property string $nama_baku
 * @property Carbon $tgl_lahir
 * @property JenisKelamin $jk
 * @property int|null $anak_ke
 * @property float|null $bb_lahir_kg
 * @property float|null $pb_lahir_cm
 * @property bool $buku_kia
 * @property bool $imd
 * @property StatusAnak $status
 * @property-read OrangTua|null $orangTua
 * @property-read WilayahRt|null $wilayahRt
 * @property-read Collection<int, Pengukuran> $pengukuran
 * @property-read Collection<int, Layanan> $layanan
 */
#[Fillable([
    'nik', 'orang_tua_id', 'wilayah_rt_id', 'nama', 'nama_baku', 'tgl_lahir',
    'jk', 'anak_ke', 'bb_lahir_kg', 'pb_lahir_cm', 'buku_kia', 'imd', 'status',
])]
class Anak extends Model
{
    /** @use HasFactory<AnakFactory> */
    use HasFactory, SoftDeletes;

    protected $table = 'anak';

    /**
     * @return BelongsTo<OrangTua, $this>
     */
    public function orangTua(): BelongsTo
    {
        return $this->belongsTo(OrangTua::class);
    }

    /**
     * @return BelongsTo<WilayahRt, $this>
     */
    public function wilayahRt(): BelongsTo
    {
        return $this->belongsTo(WilayahRt::class);
    }

    /**
     * @return HasMany<Pengukuran, $this>
     */
    public function pengukuran(): HasMany
    {
        return $this->hasMany(Pengukuran::class);
    }

    /**
     * @return HasMany<Layanan, $this>
     */
    public function layanan(): HasMany
    {
        return $this->hasMany(Layanan::class);
    }

    /**
     * Umur dalam bulan penuh pada tanggal tertentu.
     *
     * Selisih kalender, bukan hasil bagi jumlah hari: anak yang lahir 20 Januari
     * dan diukur 13 Juni berumur 4 bulan penuh, bukan 5.
     *
     * @see docs/04-spesifikasi-antropometri.md bagian 3.1
     */
    public function umurBulanPada(Carbon $tanggal): int
    {
        // Dihitung eksplisit, bukan lewat diffInMonths: umur menentukan seluruh
        // z-score, jadi nilainya tidak boleh bergantung pada perubahan semantik
        // pustaka tanggal antar versi.
        $bulan = ($tanggal->year - $this->tgl_lahir->year) * 12
            + ($tanggal->month - $this->tgl_lahir->month);

        if ($tanggal->day < $this->tgl_lahir->day) {
            $bulan--;
        }

        return $bulan;
    }

    /**
     * Hanya anak aktif yang dihitung sebagai sasaran (S) pada rasio D/S.
     *
     * @param  Builder<$this>  $query
     */
    public function scopeAktif(Builder $query): void
    {
        $query->where('status', StatusAnak::Aktif);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tgl_lahir' => 'date',
            'jk' => JenisKelamin::class,
            'status' => StatusAnak::class,
            'buku_kia' => 'boolean',
            'imd' => 'boolean',
            'bb_lahir_kg' => 'decimal:2',
            'pb_lahir_cm' => 'decimal:1',
        ];
    }
}
