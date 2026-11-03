import type { BarisLms } from '@/lib/z-score';
import type { PatchAnak } from '@/pages/anak/index';
import type {
    Anak,
    GarisSd,
    Pengukuran,
    Periode,
    Peran,
} from '@/types/posyandu';

export const ARTI_NTOB: Record<string, string> = {
    N: 'N, naik',
    T: 'T, tidak naik',
    O: 'O, tidak ditimbang bulan lalu',
    B: 'B, baru pertama',
};

/**
 * Sebab baris kosong. Ketidakhadiran bukan berat badan nol (DR-04), dan
 * sebabnya ada di data sejak awal — dulu tidak pernah sampai ke layar.
 */
export const ARTI_KEHADIRAN: Record<string, string> = {
    tidak_hadir: 'Tidak hadir',
    pindah: 'Pindah',
    tidak_dapat_diukur: 'Tidak dapat diukur',
};

/** Nada mana yang harus memimpin bila satu anak punya tiga vonis sekaligus. */
export const URUT_NADA: Record<string, number> = {
    merah: 0,
    oranye: 1,
    biru: 2,
    hijau: 3,
    netral: 4,
};

export const WARNA_NADA: Record<string, string> = {
    merah: 'text-tone-red',
    oranye: 'text-tone-amber',
    hijau: 'text-tone-green',
    biru: 'text-tone-blue',
    netral: 'text-muted-foreground',
};

export type AmbangDetail = {
    turunMax: number;
    naikMax: number;
    tinggiBerkurangMax: number;
    ambangWaspada: number;
    ambangRujukan: number;
};

export type TabDetail = 'profil' | 'status' | 'kurva' | 'grafik' | 'riwayat';

export const TAB_DETAIL: { nilai: TabDetail; label: string }[] = [
    { nilai: 'profil', label: 'Profil Anak' },
    { nilai: 'status', label: 'Status Gizi' },
    { nilai: 'kurva', label: 'Kurva KMS' },
    { nilai: 'grafik', label: 'Grafik Pertumbuhan' },
    { nilai: 'riwayat', label: 'Riwayat Ukur' },
];

export type DetailAnakProps = {
    anak: Anak;
    /** Seluruh pengukuran lintas periode, terbaru di atas. */
    pengukuran: Pengukuran[];
    garisSd: GarisSd[];
    /** Tabel LMS WHO keenam indeks, untuk tab Grafik Pertumbuhan. */
    standarLms: BarisLms[];
    peran: Peran;
    /** Periode yang sedang dilihat. Menentukan umur dan status utama. */
    periode: Periode;
    /** Ambang kewajaran dari Pengaturan, satu sumber dengan layar itu. */
    ambang: AmbangDetail;
    wilayahRt: string[];
    noWa: string | null;
    lembaga: string;
    onSimpan?: (patch: PatchAnak) => void;
    sumberLive?: boolean;
    kembaliKe?: { href: string; label: string };
};
