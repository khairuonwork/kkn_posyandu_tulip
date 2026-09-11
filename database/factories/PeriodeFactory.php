<?php

namespace Database\Factories;

use App\Models\Periode;
use App\Models\Team;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Periode>
 */
class PeriodeFactory extends Factory
{
    protected $model = Periode::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'team_id' => Team::factory(),
            'bulan' => fake()->numberBetween(1, 12),
            'tahun' => 2026,
            'tanggal_kegiatan' => null,
        ];
    }

    public function pada(int $bulan, int $tahun, ?string $tanggalKegiatan = null): static
    {
        return $this->state(fn () => [
            'bulan' => $bulan,
            'tahun' => $tahun,
            'tanggal_kegiatan' => $tanggalKegiatan,
        ]);
    }
}
