<?php

namespace Database\Factories;

use App\Enums\StatusKehadiran;
use App\Enums\SumberPengukuran;
use App\Models\Anak;
use App\Models\Pengukuran;
use App\Models\Periode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Pengukuran>
 */
class PengukuranFactory extends Factory
{
    protected $model = Pengukuran::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'anak_id' => Anak::factory(),
            'periode_id' => Periode::factory(),
            'dicatat_oleh' => null,
            'tanggal_ukur' => fake()->dateTimeBetween('-1 year')->format('Y-m-d'),
            'bb_kg' => fake()->randomFloat(2, 5, 20),
            'tinggi_cm' => fake()->randomFloat(1, 55, 110),
            'jenis_ukur' => null,
            'lila_cm' => fake()->randomFloat(1, 12, 18),
            'lika_cm' => fake()->randomFloat(1, 40, 52),
            'ntob_raw' => 'N',
            'status_kehadiran' => StatusKehadiran::Hadir,
            'catatan' => null,
            'sumber' => SumberPengukuran::Manual,
        ];
    }

    /**
     * Anak terdaftar tetapi tidak datang: kolom ukur kosong, bukan nol.
     */
    public function tidakHadir(): static
    {
        return $this->state(fn () => [
            'bb_kg' => null,
            'tinggi_cm' => null,
            'lila_cm' => null,
            'lika_cm' => null,
            'ntob_raw' => null,
            'status_kehadiran' => StatusKehadiran::TidakHadir,
        ]);
    }
}
