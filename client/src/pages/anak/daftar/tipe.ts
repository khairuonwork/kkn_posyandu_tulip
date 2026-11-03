import { nadaKategori } from '@/components/status-gizi-badge';
import type { BarisLms } from '@/lib/z-score';
import type { Indeks, JenisKelamin, Peran, Periode } from '@/types/posyandu';

export type BarisAnak = {
    anakId: number;
    aktifPeriode?: boolean;
    nama: string | null;
    nik: string | null;
    nikLengkap: boolean;
    jk: JenisKelamin | null;
    umurBulan: number | null;
    rt: string | null;
    namaOrtu: string | null;
    tanggalUkurTerakhir: string | null;
    /** Kategori BB/TB saja — bukan alasan anak ini ditandai. */
    kategoriGizi: string | null;
    perluPerhatian: boolean;
    /**
     * Risiko yang dibawa sejak lahir, atau null.
     */
    risikoLahir: string | null;
    /** Indeks yang memicu penanda perhatian: bisa BB/U atau TB/U, bukan BB/TB. */
    indeksPemicu: Indeks | null;
    kategoriPemicu: string | null;
    /** Null berarti tidak ada pengukuran pada periode ini, bukan nol. */
    bbKg: number | null;
    tinggiCm: number | null;
};

export type PatchAnak = {
    nama: string;
    nik: string;
    namaOrtu: string;
    rt: string;
    bbKg?: number | null;
    tinggiCm?: number | null;
    jk?: JenisKelamin;
    tglLahir?: string;
    anakKe?: number | null;
    bbLahirKg?: number | null;
    bukuKia?: boolean;
    /** Nomor WhatsApp orang tua; belum ada kolomnya di arsip. */
    noWa?: string;
    kbIbu?: boolean | null;
    jenisKb?: string | null;
    desilKelompok?: '6-10' | null;
    desil?: number | null;
    periodeId?: string;
};

export type AnakBaru = {
    nama: string;
    tglLahir: string;
    jk: JenisKelamin;
    namaOrtu: string;
    rt: string;
};

export type KolomUrut = 'nama' | 'umur' | 'rt' | 'tanggal' | 'status';

export const PERINGKAT_NADA = {
    merah: 0,
    oranye: 1,
    biru: 2,
    hijau: 3,
    netral: 4,
};

export const LABEL_URUT: Record<KolomUrut, string> = {
    nama: 'Nama balita',
    umur: 'Umur',
    rt: 'RT',
    tanggal: 'Tanggal ukur',
    status: 'Status terakhir',
};

/** `RT 01` … `RT 07`, bukan `RT 1`. */
export function labelRt(rt: string): string {
    return `RT ${rt.padStart(2, '0')}`;
}

export function tanggalLokalISO(): string {
    const tanggal = new Date();

    return `${tanggal.getFullYear()}-${String(tanggal.getMonth() + 1).padStart(2, '0')}-${String(tanggal.getDate()).padStart(2, '0')}`;
}

/** Titik desimal maupun koma diterima; kader mengetik apa yang tertera di alat. */
export function keAngka(teks: string): number | null {
    const bersih = teks.trim().replace(',', '.');

    if (bersih === '') {
        return null;
    }

    const n = Number(bersih);

    return Number.isFinite(n) ? n : null;
}

export function bandingkan(
    a: BarisAnak,
    b: BarisAnak,
    kolom: KolomUrut,
): number {
    switch (kolom) {
        case 'umur':
            return (a.umurBulan ?? -1) - (b.umurBulan ?? -1);

        case 'rt':
            return Number(a.rt ?? 99) - Number(b.rt ?? 99);

        case 'tanggal':
            return (a.tanggalUkurTerakhir ?? '').localeCompare(
                b.tanggalUkurTerakhir ?? '',
            );

        case 'status':
            return (
                PERINGKAT_NADA[nadaKategori(a.kategoriGizi)] -
                PERINGKAT_NADA[nadaKategori(b.kategoriGizi)]
            );

        default:
            return (a.nama ?? '').localeCompare(b.nama ?? '');
    }
}

export type DaftarAnakProps = {
    anak: BarisAnak[];
    wilayahRt: string[];
    rw: string;
    peran: Peran;
    /** Kader terkunci ke RT binaannya; null berarti bebas memilih. */
    rtTerkunci: string | null;
    periode: Periode;
    /**
     * Tabel LMS WHO untuk pratinjau z-score saat mengetik.
     */
    standarLms?: BarisLms[];
    onSimpanAnak?: (anakId: number, patch: PatchAnak) => void;
    onTambahAnak?: (baru: AnakBaru) => void;
    sumberData?: 'live' | 'contoh';
    statusMuat?: 'memuat' | 'siap' | 'galat';
    pesanGalat?: string | null;
    onMuatUlang?: () => void;
};
