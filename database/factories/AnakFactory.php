<?php

namespace Database\Factories;

use App\Enums\JenisKelamin;
use App\Enums\StatusAnak;
use App\Models\Anak;
use App\Models\OrangTua;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Anak>
 */
class AnakFactory extends Factory
{
    protected $model = Anak::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $nama = fake()->name();

        return [
            'nik' => fake()->unique()->numerify('32770###########'),
            'orang_tua_id' => OrangTua::factory(),
            'wilayah_rt_id' => null,
            'nama' => $nama,
            'nama_baku' => mb_strtoupper($nama),
            'tgl_lahir' => fake()->dateTimeBetween('-5 years', '-2 months')->format('Y-m-d'),
            'jk' => fake()->randomElement(JenisKelamin::cases()),
            'anak_ke' => fake()->numberBetween(1, 4),
            'bb_lahir_kg' => fake()->randomFloat(2, 2.4, 4.0),
            'pb_lahir_cm' => fake()->randomFloat(1, 45, 53),
            'buku_kia' => true,
            'imd' => fake()->boolean(),
            'status' => StatusAnak::Aktif,
        ];
    }

    /**
     * Anak tanpa NIK. Delapan baris arsip nyata berada dalam keadaan ini.
     */
    public function tanpaNik(): static
    {
        return $this->state(fn () => ['nik' => null]);
    }
}
