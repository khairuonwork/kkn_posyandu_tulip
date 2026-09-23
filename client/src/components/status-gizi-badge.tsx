/**
 * Chip kategori status gizi.
 *
 * **Satu-satunya tempat pemetaan kategori ke warna hidup**
 * (docs/rujukan/layar-demo.md bagian 8.3). Ambangnya sendiri sudah dihitung di
 * demo/data/extract-demo-data.py mengikuti PMK No. 2 Tahun 2020; di sini hanya
 * label yang dipetakan ke nada.
 *
 * Aturan mengikat docs/rujukan/ui-ux.md bagian 3: **warna tidak pernah menjadi
 * satu-satunya penanda.** Setiap chip berisi ikon, teks kategori, dan warna
 * sekaligus, karena laporan Posyandu dicetak hitam-putih.
 */

import { CircleCheck, Info, OctagonAlert, TriangleAlert } from 'lucide-react';

type Nada = 'merah' | 'oranye' | 'hijau' | 'biru' | 'netral';

/** Kategori resmi PMK 2/2020 untuk keenam indeks, dikelompokkan menurut nada. */
const NADA: Record<string, Nada> = {
    // BB/U
    'Berat badan sangat kurang': 'merah',
    'Berat badan kurang': 'oranye',
    'Berat badan normal': 'hijau',
    'Risiko berat badan lebih': 'biru',
    // PB/U dan TB/U
    'Sangat pendek': 'merah',
    Pendek: 'oranye',
    Normal: 'hijau',
    Tinggi: 'biru',
    // BB/PB, BB/TB, IMT/U
    'Gizi buruk': 'merah',
    'Gizi kurang': 'oranye',
    'Gizi baik': 'hijau',
    'Berisiko gizi lebih': 'biru',
    'Gizi lebih': 'oranye',
    Obesitas: 'merah',
    // LIKA/U
    Mikrosefali: 'oranye',
    Makrosefali: 'oranye',
};

/**
 * Bentuk ikon sengaja berbeda antar nada, bukan hanya warnanya.
 *
 * Bagian 3 menyebut "segitiga seru penuh" untuk merah dan "segitiga seru garis"
 * untuk oranye. Dua segitiga yang hanya beda isian sulit dibedakan saat dicetak
 * hitam-putih pada ukuran 16 px, jadi merah memakai segi delapan — bentuk rambu
 * berhenti, dan berbeda pada pandangan pertama.
 */
const IKON = {
    merah: OctagonAlert,
    oranye: TriangleAlert,
    hijau: CircleCheck,
    biru: Info,
    netral: Info,
};

const KELAS: Record<Nada, string> = {
    merah: 'bg-tone-red-bg text-tone-red',
    oranye: 'bg-tone-amber-bg text-tone-amber',
    hijau: 'bg-tone-green-bg text-tone-green',
    biru: 'bg-tone-blue-bg text-tone-blue',
    netral: 'bg-surface-alt text-muted-foreground',
};

export function nadaKategori(kategori: string | null): Nada {
    if (kategori === null) {
        return 'netral';
    }

    return NADA[kategori] ?? 'netral';
}

/**
 * Kategori yang menuntut tindak lanjut, sama dengan
 * App\Support\Antropometri\Kategori::perluTindakLanjut().
 *
 * Daftar ini disusun dari status gizi saja — **bukan** dari 1T/2T/3T, yang
 * definisinya belum dikonfirmasi (OI-01).
 */
export const PERLU_TINDAK_LANJUT = [
    'Berat badan sangat kurang',
    'Berat badan kurang',
    'Sangat pendek',
    'Pendek',
    'Gizi buruk',
    'Gizi kurang',
    'Obesitas',
];

type Props = { kategori: string | null };

export default function StatusGiziBadge({ kategori }: Props) {
    // Kategori kosong berarti belum bisa dinilai — LILA/U belum punya label
    // (OI-04), atau nilai ukurnya tidak ada.
    const nada = nadaKategori(kategori);
    const Ikon = IKON[nada];

    return (
        <span
            /* Chip v2: radius 10 px (--radius-md), tapak 7x13, tebal 700.
               Sebelumnya rounded-sm (6 px) — geometri chip prototipe lama. */
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold whitespace-nowrap ${KELAS[nada]}`}
        >
            <Ikon
                className="size-4 shrink-0"
                strokeWidth={2.5}
                aria-hidden="true"
            />
            {kategori ?? 'Belum dinilai'}
        </span>
    );
}
