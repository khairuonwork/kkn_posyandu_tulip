<?php

use App\Enums\Indeks;
use App\Enums\JenisKelamin;
use App\Enums\JenisUkur;
use App\Models\Anak;
use App\Models\PenilaianGizi;
use App\Models\Pengukuran;
use App\Models\Periode;
use App\Support\Antropometri\Kategori;
use App\Support\Antropometri\Lms;
use App\Support\Antropometri\PenilaianGiziService;
use App\Support\Antropometri\StandarLmsRepository;
use App\Support\Antropometri\ZScore;
use Database\Seeders\StandarLmsSeeder;
use Illuminate\Support\Carbon;

beforeEach(function () {
    $this->seed(StandarLmsSeeder::class);
});

function zScore(): ZScore
{
    return new ZScore(new StandarLmsRepository);
}

function penilaianGizi(): PenilaianGiziService
{
    $standar = new StandarLmsRepository;

    return new PenilaianGiziService(new ZScore($standar), $standar);
}

/*
|--------------------------------------------------------------------------
| Acceptance test utama
|--------------------------------------------------------------------------
|
| Nilai harapan diambil dari kolom "WHO-LMS" pada
| `Output Laporan/6_JUNI 2026_MASTER Z SCORE_PERMENKES vs WHO.xlsx`,
| perhitungan yang sedang berjalan di Posyandu Tulip.
|
| Data sengaja anonim: hanya jenis kelamin, kunci tabel, dan nilai ukur —
| tanpa nama maupun NIK. Lihat docs/06-migrasi-data.md bagian 9.
|
*/

test('z-score cocok dengan master Z-Score Juni 2026', function (
    string $kode, string $jk, float $kunci, float $nilai, float $harapan,
) {
    $z = zScore()->hitung(
        Indeks::from($kode),
        JenisKelamin::from($jk),
        $kunci,
        $nilai,
    );

    expect($z)->not->toBeNull()
        ->and(abs($z - $harapan))->toBeLessThan(0.01);
})->with([
    // indeks, jenis kelamin, kunci tabel, nilai ukur, z harapan
    ['BB_U', 'L', 4, 7, -0.0029],
    ['BB_U', 'P', 4, 7.77, 1.5335],
    ['BB_U', 'L', 32, 10.5, -2.2248],
    ['TB_U', 'L', 4, 60, -1.8676],
    ['TB_U', 'P', 4, 65, 1.3445],
    ['TB_U', 'L', 32, 83, -2.9544],
    ['BB_TB', 'L', 60, 7, 1.8162],
    ['BB_TB', 'P', 61.4, 6.24, 0.1993],
    ['BB_TB', 'L', 83, 10.5, -0.6152],
    ['IMT_U', 'L', 4, 19.4444, 1.4865],
    ['IMT_U', 'P', 4, 16.5519, -0.0778],
    ['IMT_U', 'L', 32, 15.2417, -0.4006],
    ['LILA_U', 'L', 7, 16, 1.4292],
    ['LILA_U', 'P', 9, 17.5, 2.5692],
    ['LILA_U', 'L', 32, 15, -0.4814],
    ['LIKA_U', 'L', 4, 43, 1.1460],
    ['LIKA_U', 'P', 4, 41, 0.3305],
    ['LIKA_U', 'L', 32, 48, -0.8028],
]);

test('seed standar memuat 906 baris untuk enam indeks', function () {
    expect(\App\Models\StandarLms::query()->count())->toBe(906);

    $standar = new StandarLmsRepository;

    foreach (Indeks::cases() as $indeks) {
        foreach (JenisKelamin::cases() as $jk) {
            $kunci = $indeks === Indeks::BB_TB ? 50.0 : ($indeks->umurMinimum() + 10);

            expect($standar->cari($indeks, $jk, (float) $kunci))
                ->not->toBeNull("{$indeks->value} {$jk->value} seharusnya tersedia");
        }
    }
});

/*
|--------------------------------------------------------------------------
| Rumus
|--------------------------------------------------------------------------
*/

test('memakai rumus logaritmik ketika L sama dengan nol', function () {
    $lms = new Lms(0.0, 10.0, 0.1);

    expect(ZScore::dariLms($lms, 12.0))->toEqualWithDelta(log(1.2) / 0.1, 1e-9);
});

test('nilaiPadaZ adalah kebalikan dari dariLms', function () {
    $lms = new Lms(-0.3521, 8.0, 0.082);
    $nilai = ZScore::nilaiPadaZ($lms, -2.0);

    expect(ZScore::dariLms($lms, $nilai))->toEqualWithDelta(-2.0, 1e-9);
});

test('menerapkan koreksi WHO di luar +3 SD pada indeks berbasis berat', function () {
    // Baris ekstrem dari master Juni 2026: BB/TB laki-laki, TB 107,5 cm, BB 24,7 kg.
    // Spreadsheet memakai LMS polos dan menghasilkan 3,8189 karena tidak menerapkan
    // ekstrapolasi WHO. Nilai terkoreksi harus lebih kecil, tetapi tetap di atas 3
    // sehingga kategorinya tidak berubah.
    $z = zScore()->hitung(Indeks::BB_TB, JenisKelamin::Lakilaki, 107.5, 24.7);

    expect($z)->toBeGreaterThan(3.0)
        ->and($z)->toBeLessThan(3.8189)
        ->and(Kategori::dari(Indeks::BB_TB, $z))->toBe('Obesitas');
});

test('tidak menerapkan koreksi pada TB/U yang berdistribusi normal', function () {
    $standar = new StandarLmsRepository;
    $lms = $standar->cari(Indeks::TB_U, JenisKelamin::Lakilaki, 24.0);

    // Tinggi jauh di bawah -3 SD.
    $nilai = ZScore::nilaiPadaZ($lms, -4.0);
    $z = (new ZScore($standar))->hitung(Indeks::TB_U, JenisKelamin::Lakilaki, 24.0, $nilai);

    expect($z)->toEqualWithDelta(-4.0, 1e-6);
});

/*
|--------------------------------------------------------------------------
| Pencarian tabel
|--------------------------------------------------------------------------
*/

test('menginterpolasi antar baris untuk kunci panjang badan', function () {
    $z = zScore();
    $bawah = $z->hitung(Indeks::BB_TB, JenisKelamin::Lakilaki, 67.0, 8.0);
    $tengah = $z->hitung(Indeks::BB_TB, JenisKelamin::Lakilaki, 67.3, 8.0);
    $atas = $z->hitung(Indeks::BB_TB, JenisKelamin::Lakilaki, 67.5, 8.0);

    expect($tengah)->toBeLessThan($bawah)
        ->and($tengah)->toBeGreaterThan($atas);
});

test('tidak menginterpolasi umur, memakai bulan penuh', function () {
    $z = zScore();

    expect($z->hitung(Indeks::BB_U, JenisKelamin::Lakilaki, 12.0, 9.0))
        ->toBe($z->hitung(Indeks::BB_U, JenisKelamin::Lakilaki, 12.9, 9.0));
});

test('mengembalikan null di luar rentang tabel', function () {
    $z = zScore();

    expect($z->hitung(Indeks::BB_TB, JenisKelamin::Lakilaki, 44.0, 2.5))->toBeNull()
        ->and($z->hitung(Indeks::BB_TB, JenisKelamin::Lakilaki, 121.0, 25.0))->toBeNull()
        ->and($z->hitung(Indeks::BB_U, JenisKelamin::Lakilaki, 61.0, 18.0))->toBeNull()
        ->and($z->hitung(Indeks::BB_U, JenisKelamin::Lakilaki, 12.0, 0.0))->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Umur
|--------------------------------------------------------------------------
*/

test('umur dihitung sebagai bulan penuh dari selisih kalender', function () {
    $anak = new Anak(['tgl_lahir' => '2026-01-20']);
    $anak->tgl_lahir = Carbon::parse('2026-01-20');

    expect($anak->umurBulanPada(Carbon::parse('2026-06-13')))->toBe(4)
        ->and($anak->umurBulanPada(Carbon::parse('2026-06-20')))->toBe(5)
        ->and($anak->umurBulanPada(Carbon::parse('2027-01-19')))->toBe(11);
});

/*
|--------------------------------------------------------------------------
| PenilaianGiziService
|--------------------------------------------------------------------------
*/

test('menghitung enam indeks untuk pengukuran lengkap', function () {
    $pengukuran = pengukuranUntuk(umurBulan: 24, bb: 11.5, tinggi: 86.0, lila: 15.0, lika: 47.0);

    $hasil = collect(penilaianGizi()->hitung($pengukuran))->keyBy(fn ($b) => $b['indeks']->value);

    expect($hasil)->toHaveCount(6)
        ->and($hasil['TB_U']['kategori'])->not->toBeNull()
        ->and($hasil['LILA_U']['kategori'])->toBeNull(); // OI-04: label belum dikonfirmasi
});

test('melewati LILA/U untuk anak di bawah enam bulan', function () {
    $pengukuran = pengukuranUntuk(umurBulan: 4, bb: 7.0, tinggi: 60.0, lila: 16.0, lika: 43.0);

    $indeks = collect(penilaianGizi()->hitung($pengukuran))->pluck('indeks.value');

    expect($indeks)->not->toContain('LILA_U')
        ->and($indeks)->toContain('LIKA_U');
});

test('mengoreksi tinggi badan ketika posisi ukur tidak lazim untuk umurnya', function () {
    // Anak 30 bulan diukur telentang: tinggi tabel harus 0,7 cm lebih kecil.
    $telentang = pengukuranUntuk(umurBulan: 30, bb: 12.0, tinggi: 90.0, jenisUkur: JenisUkur::PanjangBadan);
    $berdiri = pengukuranUntuk(umurBulan: 30, bb: 12.0, tinggi: 89.3, jenisUkur: JenisUkur::TinggiBadan);

    $a = collect(penilaianGizi()->hitung($telentang))->firstWhere('indeks', Indeks::BB_TB);
    $b = collect(penilaianGizi()->hitung($berdiri))->firstWhere('indeks', Indeks::BB_TB);

    expect($a['z_score'])->toEqualWithDelta($b['z_score'], 0.001)
        ->and($a['catatan_perhitungan'])->toHaveKey('konversi_tinggi');
});

test('mencatat ketika posisi ukur hanya diasumsikan dari umur', function () {
    $pengukuran = pengukuranUntuk(umurBulan: 30, bb: 12.0, tinggi: 90.0, jenisUkur: null);

    $hasil = collect(penilaianGizi()->hitung($pengukuran))->firstWhere('indeks', Indeks::TB_U);

    expect($hasil['catatan_perhitungan'])->toBe(['jenis_ukur' => 'diasumsikan dari umur']);
});

test('tidak menghasilkan penilaian ketika nilai ukur kosong', function () {
    $pengukuran = pengukuranUntuk(umurBulan: 24, bb: null, tinggi: null, lila: null, lika: null);

    expect(penilaianGizi()->hitung($pengukuran))->toBe([]);
});

test('menandai nilai yang tidak wajar tanpa membuangnya', function () {
    // Berat 1,5 kg pada umur 24 bulan: jauh di luar rentang biologis.
    $pengukuran = pengukuranUntuk(umurBulan: 24, bb: 1.5, tinggi: 86.0);

    $hasil = collect(penilaianGizi()->hitung($pengukuran))->firstWhere('indeks', Indeks::BB_U);

    expect($hasil['tidak_wajar'])->toBeTrue()
        ->and($hasil['z_score'])->not->toBeNull();
});

test('penyimpanan bersifat idempotent', function () {
    $pengukuran = pengukuranUntuk(umurBulan: 24, bb: 11.5, tinggi: 86.0, lila: 15.0, lika: 47.0);
    $layanan = penilaianGizi();

    $layanan->simpan($pengukuran);
    $pertama = PenilaianGizi::query()->count();

    $layanan->simpan($pengukuran);

    expect(PenilaianGizi::query()->count())->toBe($pertama)->toBe(6);
});

test('menghapus penilaian yang tidak lagi dapat dihitung setelah koreksi', function () {
    $pengukuran = pengukuranUntuk(umurBulan: 24, bb: 11.5, tinggi: 86.0, lila: 15.0, lika: 47.0);
    $layanan = penilaianGizi();

    $layanan->simpan($pengukuran);
    expect(PenilaianGizi::query()->count())->toBe(6);

    // Nilai ukur dikoreksi menjadi kosong: baris lama tidak boleh tertinggal.
    $pengukuran->update(['bb_kg' => null, 'lila_cm' => null]);
    $layanan->simpan($pengukuran->fresh());

    expect(PenilaianGizi::query()->pluck('indeks')->map->value->all())
        ->toEqualCanonicalizing(['TB_U', 'LIKA_U']);
});

/**
 * Pengukuran lengkap dengan anak berumur tertentu pada tanggal ukurnya.
 */
function pengukuranUntuk(
    int $umurBulan,
    ?float $bb = null,
    ?float $tinggi = null,
    ?float $lila = null,
    ?float $lika = null,
    ?JenisUkur $jenisUkur = null,
): Pengukuran {
    $tanggalUkur = Carbon::parse('2026-06-13');

    $anak = Anak::factory()->create([
        'tgl_lahir' => $tanggalUkur->copy()->subMonths($umurBulan)->toDateString(),
        'jk' => JenisKelamin::Lakilaki,
    ]);

    return Pengukuran::factory()->create([
        'anak_id' => $anak->id,
        'periode_id' => Periode::factory()->pada(6, 2026)->create()->id,
        'tanggal_ukur' => $tanggalUkur->toDateString(),
        'bb_kg' => $bb,
        'tinggi_cm' => $tinggi,
        'lila_cm' => $lila,
        'lika_cm' => $lika,
        'jenis_ukur' => $jenisUkur,
    ]);
}
