/**
 * Tanda gizi satu pengukuran: satu aturan untuk layar Detail Balita, pesan
 * WhatsApp, dan Lembar Hasil, supaya ketiganya tidak pernah berbeda pendapat.
 *
 * Hanya tiga indeks yang menentukan: BB/TB, BB/U, dan TB/U.
 */

import type { Pengukuran } from '../types/posyandu.ts';
import { PERLU_TINDAK_LANJUT } from './kategori-tindak-lanjut.ts';
import { penilaianLayak } from './penilaian-utama.ts';
import type { Kesimpulan } from './pesan-wa.ts';

const PERLU_PEMANTAUAN = [
    ...PERLU_TINDAK_LANJUT,
    'Risiko berat badan lebih',
    'Berisiko gizi lebih',
    'Gizi lebih',
    'BB Lebih',
    'Risiko Gizi Lebih',
    'Gizi Lebih',
    'Gemuk',
];

export type AmbangGizi = { ambangWaspada: number; ambangRujukan: number };

export function tandaGizi(
    penilaian: Pengukuran['penilaian'],
    ambang: AmbangGizi,
) {
    const nilai = (['BB_TB', 'BB_U', 'TB_U'] as const)
        .map((i) => penilaianLayak(penilaian[i]))
        .filter((n) => n !== undefined);

    return {
        perluRujukan: nilai.some((n) => n.z <= ambang.ambangRujukan),
        perluWaspada: nilai.some((n) => n.z <= ambang.ambangWaspada),
        perluTindakLanjut: nilai.some(
            (n) => n.kategori !== null && PERLU_PEMANTAUAN.includes(n.kategori),
        ),
    };
}

export function tentukanKesimpulan(
    penilaian: Pengukuran['penilaian'],
    ambang: AmbangGizi,
): Kesimpulan {
    const t = tandaGizi(penilaian, ambang);

    return t.perluRujukan
        ? 'diperiksa'
        : t.perluWaspada || t.perluTindakLanjut
          ? 'dipantau'
          : 'sesuai';
}
