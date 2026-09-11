<?php

namespace Database\Seeders;

use App\Enums\TeamRole;
use App\Models\Team;
use App\Models\User;
use App\Models\WilayahRt;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Membuat Posyandu beserta wilayah RT dan akun admin awal.
 *
 * Sistem melayani satu Posyandu; tabel `teams` dipakai ulang sebagai identitas
 * Posyandu sekaligus fondasi RBAC. Lihat docs/adr/0004-reuse-team-sebagai-rbac.md.
 */
class PosyanduSeeder extends Seeder
{
    use WithoutModelEvents;

    private const RT = ['01', '02', '03', '04', '05'];

    public function run(): void
    {
        $posyandu = Team::firstOrCreate(
            ['slug' => 'posyandu-tulip'],
            [
                'name' => 'Posyandu Tulip',
                'rw' => '18',
                'kelurahan' => 'Citeureup',
                'is_personal' => false,
            ],
        );

        foreach (self::RT as $rt) {
            WilayahRt::firstOrCreate([
                'team_id' => $posyandu->id,
                'rt' => $rt,
                'rw' => $posyandu->rw ?? '18',
            ]);
        }

        $admin = User::firstOrCreate(
            ['email' => 'admin@posyandutulip.test'],
            [
                'name' => 'Admin Posyandu Tulip',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );

        if (! $admin->belongsToTeam($posyandu)) {
            $posyandu->memberships()->create([
                'user_id' => $admin->id,
                'role' => TeamRole::Owner,
            ]);
        }

        $admin->switchTeam($posyandu);

        $this->command?->info("Posyandu {$posyandu->name} siap dengan ".count(self::RT).' RT.');
    }
}
