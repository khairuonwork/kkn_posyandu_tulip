/**
 * Chip kategori status gizi.
 *
 * **Satu-satunya tempat pemetaan kategori ke warna hidup**
 * (docs/rujukan/ui-ux.md bagian 4). Ambangnya sendiri sudah dihitung di
 * src/data/contoh/extract-demo-data.py mengikuti PMK No. 2 Tahun 2020; di sini hanya
 * label yang dipetakan ke nada.
 *
 * Aturan mengikat docs/rujukan/ui-ux.md bagian 3: **warna tidak pernah menjadi
 * satu-satunya penanda.** Setiap chip berisi ikon, teks kategori, dan warna
 * sekaligus, karena laporan Posyandu dicetak hitam-putih.
 */

import { CircleCheck, Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import { kesimpulanZScore } from '@/lib/kategori';

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
    // Kesimpulan langsung Z-score (format lama)
    'BB Sangat Kurang': 'merah',
    'BB Kurang': 'oranye',
    'BB Normal': 'hijau',
    'BB Lebih': 'biru',
    'Gizi Buruk': 'merah',
    'Gizi Kurang': 'oranye',
    'Gizi Baik': 'hijau',
    'Risiko Gizi Lebih': 'biru',
    'Gizi Lebih': 'oranye',
    Kurus: 'oranye',
    Gemuk: 'biru',
    Kurang: 'oranye',
    'Sangat Kurang': 'merah',
};

/**
 * Bentuk ikon sengaja berbeda antar nada, bukan hanya warnanya.
 *
 * Bagian 3 menyebut "segitiga seru penuh" untuk merah dan "segitiga seru garis"
 * untuk oranye. Dua segitiga yang hanya beda isian sulit dibedakan saat dicetak
 * hitam-putih pada ukuran 16 px, jadi merah memakai segi delapan — bentuk rambu
 * berhenti, dan berbeda pada pandangan pertama.
 */
export const IKON = {
    merah: OctagonAlert,
    oranye: TriangleAlert,
    hijau: CircleCheck,
    biru: Info,
    netral: Info,
};

export const KELAS: Record<Nada, string> = {
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

    return NADA[kategori] ?? NADA[kesimpulanZScore(kategori)] ?? 'netral';
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
    'Kurang',
    'Sangat Kurang',
];

type Props = {
    kategori: string | null;
    /**
     * Untuk daftar panjang: kategori bernada hijau tampil sebagai teks biasa
     * bercentang, tanpa pil. 83 pil hijau menenggelamkan satu pil merah.
     */
    tenang?: boolean;
    /** Tapak 2 × 8 untuk tabel yang rapat, mis. riwayat penimbangan. */
    rapat?: boolean;
    /** Gunakan format teks asli alih-alih kesimpulan Normal/Gemuk/Kurang. */
    formatAsli?: boolean;
};

export default function StatusGiziBadge({
    kategori,
    tenang = false,
    rapat = false,
    formatAsli = false,
}: Props) {
    // Tampilkan informasi kesimpulan langsung (Normal, Gemuk, Kurang)
    const teksTampil = formatAsli
        ? (kategori ?? 'Belum dinilai')
        : kesimpulanZScore(kategori);
    const nada = nadaKategori(teksTampil);
    const Ikon = IKON[nada];

    if (tenang && nada === 'hijau') {
        return (
            <span className="inline-flex items-center gap-1.5 text-base whitespace-nowrap">
                <Ikon
                    className="size-4 shrink-0 text-tone-green"
                    strokeWidth={2.25}
                    aria-hidden="true"
                />
                {teksTampil}
            </span>
        );
    }

    return (
        <span
            /* Lencana lembut: radius 10 px (--radius-md), tapak 3x10, tebal
               700. Latarnya muda supaya lencana tidak tertukar dengan tombol
               hijau solid. */
            className={`inline-flex items-center gap-1.5 rounded-md text-sm font-bold whitespace-nowrap ${
                rapat ? 'px-2 py-0.5' : 'px-3 py-1'
            } ${KELAS[nada]}`}
        >
            <Ikon
                className="size-4 shrink-0"
                strokeWidth={2.5}
                aria-hidden="true"
            />
            {teksTampil ?? 'Belum dinilai'}
        </span>
    );
}
