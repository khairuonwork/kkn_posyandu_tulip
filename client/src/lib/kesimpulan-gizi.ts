/**
 * Tanda gizi satu pengukuran: satu aturan untuk layar Detail Balita, pesan
 * WhatsApp, dan Lembar Hasil, supaya ketiganya tidak pernah berbeda pendapat.
 *
 * Hanya tiga indeks yang menentukan: BB/TB, BB/U, dan TB/U.
 */

import { PERLU_TINDAK_LANJUT } from '@/components/status-gizi-badge';
import { penilaianLayak } from '@/lib/penilaian-utama';
import type { Kesimpulan } from '@/lib/pesan-wa';
import type { Pengukuran } from '@/types/posyandu';

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
            (n) =>
                n.kategori !== null && PERLU_TINDAK_LANJUT.includes(n.kategori),
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
