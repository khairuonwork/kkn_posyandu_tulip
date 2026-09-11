<?php

namespace App\Support\Antropometri;

use App\Enums\Indeks;
use App\Enums\JenisUkur;
use App\Models\PenilaianGizi;
use App\Models\Pengukuran;
use Illuminate\Support\Carbon;

/**
 * Menghitung dan menyimpan penilaian gizi untuk satu pengukuran.
 *
 * @see docs/04-spesifikasi-antropometri.md
 */
class PenilaianGiziService
{
    /**
     * Selisih sistematis antara panjang badan telentang dan tinggi badan berdiri.
     */
    private const KOREKSI_POSISI_CM = 0.7;

    public function __construct(
        private readonly ZScore $zScore,
        private readonly StandarLmsRepository $standar,
    ) {}

    /**
     * Hitung tanpa menyentuh basis data.
     *
     * Indeks yang tidak dapat dihitung tidak menghasilkan baris sama sekali —
     * ketiadaan baris berarti "tidak dapat dihitung", bukan nol.
     *
     * @return array<int, array<string, mixed>>
     */
    public function hitung(Pengukuran $pengukuran): array
    {
        $anak = $pengukuran->anak;

        if ($anak === null || $anak->tgl_lahir === null) {
            return [];
        }

        $umur = $anak->umurBulanPada($pengukuran->tanggal_ukur);

        if ($umur < 0) {
            return [];
        }

        $bb = $this->angka($pengukuran->bb_kg);
        [$tinggi, $catatanUkur] = $this->tinggiUntukTabel($pengukuran, $umur);

        $masukan = [
            Indeks::BB_U->value => [$umur, $bb],
            Indeks::TB_U->value => [$umur, $tinggi],
            Indeks::BB_TB->value => [$tinggi, $bb],
            Indeks::IMT_U->value => [$umur, $this->imt($bb, $tinggi)],
            Indeks::LILA_U->value => [$umur, $this->angka($pengukuran->lila_cm)],
            Indeks::LIKA_U->value => [$umur, $this->angka($pengukuran->lika_cm)],
        ];

        $hasil = [];

        foreach (Indeks::cases() as $indeks) {
            [$kunci, $nilai] = $masukan[$indeks->value];

            if ($kunci === null || $nilai === null || $umur < $indeks->umurMinimum()) {
                continue;
            }

            $z = $this->zScore->hitung($indeks, $anak->jk, (float) $kunci, $nilai);

            if ($z === null) {
                continue;
            }

            [$bawah, $atas] = $indeks->batasWajar();

            // Catatan posisi ukur hanya relevan bagi indeks yang memakai tinggi badan.
            $catatan = in_array($indeks, [Indeks::TB_U, Indeks::BB_TB, Indeks::IMT_U], true)
                ? $catatanUkur
                : [];

            $hasil[] = [
                'indeks' => $indeks,
                'z_score' => round($z, 3),
                'kategori' => Kategori::dari($indeks, $z),
                'tidak_wajar' => $z < $bawah || $z > $atas,
                'catatan_perhitungan' => $catatan === [] ? null : $catatan,
            ];
        }

        return $hasil;
    }

    /**
     * Hitung ulang lalu simpan. Bersifat idempotent: menjalankan dua kali untuk
     * pengukuran dan versi standar yang sama tidak menambah baris.
     *
     * Baris indeks yang tidak lagi dapat dihitung dihapus, agar nilai lama tidak
     * tertinggal setelah pengukuran dikoreksi.
     *
     * @return int jumlah indeks yang tersimpan
     */
    public function simpan(Pengukuran $pengukuran): int
    {
        $versi = $this->standar->versi();
        $hasil = $this->hitung($pengukuran);
        $sekarang = Carbon::now();

        foreach ($hasil as $baris) {
            PenilaianGizi::query()->updateOrCreate(
                [
                    'pengukuran_id' => $pengukuran->id,
                    'indeks' => $baris['indeks'],
                    'standar_versi' => $versi,
                ],
                [
                    'z_score' => $baris['z_score'],
                    'kategori' => $baris['kategori'],
                    'tidak_wajar' => $baris['tidak_wajar'],
                    'catatan_perhitungan' => $baris['catatan_perhitungan'],
                    'dihitung_pada' => $sekarang,
                ],
            );
        }

        PenilaianGizi::query()
            ->where('pengukuran_id', $pengukuran->id)
            ->where('standar_versi', $versi)
            ->whereNotIn('indeks', array_map(fn (array $b) => $b['indeks']->value, $hasil))
            ->delete();

        return count($hasil);
    }

    /**
     * Tinggi badan yang dipakai untuk mencari tabel, setelah konversi PB/TB.
     *
     * Nilai yang disimpan dan ditampilkan tetap nilai ukur asli; konversi hanya
     * berlaku untuk perhitungan.
     *
     * @return array{float|null, array<string, string>}
     */
    private function tinggiUntukTabel(Pengukuran $pengukuran, int $umur): array
    {
        $tinggi = $this->angka($pengukuran->tinggi_cm);

        if ($tinggi === null) {
            return [null, []];
        }

        $catatan = [];
        $jenis = $pengukuran->jenis_ukur;

        if ($jenis === null) {
            $jenis = JenisUkur::seharusnyaPadaUmur($umur);
            $catatan['jenis_ukur'] = 'diasumsikan dari umur';
        }

        if ($jenis === JenisUkur::seharusnyaPadaUmur($umur)) {
            return [$tinggi, $catatan];
        }

        // Diukur dengan posisi yang tidak lazim untuk umurnya: koreksi 0,7 cm.
        $terkoreksi = $umur < 24
            ? $tinggi + self::KOREKSI_POSISI_CM
            : $tinggi - self::KOREKSI_POSISI_CM;

        $catatan['konversi_tinggi'] = sprintf(
            'diukur %s pada umur %d bulan, dikoreksi %+.1f cm',
            $jenis->value,
            $umur,
            $terkoreksi - $tinggi,
        );

        return [$terkoreksi, $catatan];
    }

    private function imt(?float $bb, ?float $tinggi): ?float
    {
        if ($bb === null || $tinggi === null || $tinggi <= 0) {
            return null;
        }

        return $bb / (($tinggi / 100) ** 2);
    }

    /**
     * Cast decimal Eloquent mengembalikan string; kolom kosong tetap null.
     */
    private function angka(mixed $nilai): ?float
    {
        return $nilai === null ? null : (float) $nilai;
    }
}
