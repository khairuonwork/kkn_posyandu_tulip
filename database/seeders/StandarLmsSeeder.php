<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * Mengisi tabel standar antropometri dari database/data/who-lms.json.
 *
 * Berkas JSON adalah sumber kebenaran yang di-commit ke repo; berkas Excel
 * asalnya berada di luar repo dan bukan dependensi runtime.
 *
 * @see database/data/extract-who-lms.py
 * @see docs/04-spesifikasi-antropometri.md bagian 5
 */
class StandarLmsSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $berkas = database_path('data/who-lms.json');

        if (! is_file($berkas)) {
            throw new RuntimeException("Berkas standar tidak ditemukan: {$berkas}");
        }

        $data = json_decode((string) file_get_contents($berkas), true, flags: JSON_THROW_ON_ERROR);
        $versi = $data['versi'];

        $baris = array_map(fn (array $b) => [
            'versi' => $versi,
            'indeks' => $b['indeks'],
            'jk' => $b['jk'],
            'kunci' => $b['kunci'],
            'l' => $b['l'],
            'm' => $b['m'],
            's' => $b['s'],
        ], $data['baris']);

        // upsert, bukan insert: seed boleh dijalankan ulang tanpa menggandakan baris.
        foreach (array_chunk($baris, 200) as $bagian) {
            DB::table('standar_lms')->upsert(
                $bagian,
                ['versi', 'indeks', 'jk', 'kunci'],
                ['l', 'm', 's'],
            );
        }

        $this->command?->info(count($baris)." baris standar {$versi} tersimpan.");
    }
}
