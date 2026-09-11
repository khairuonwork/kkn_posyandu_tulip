/**
 * Tipe domain Posyandu.
 *
 * Bentuknya mengikuti demo/data/posyandu.json, yang menjadi kontrak props bagi
 * controller nanti (docs/10-prd-demo-frontend.md bagian 10). Dideklarasikan di
 * satu tempat, tidak diketik ulang di tiap halaman (bagian 14.4).
 */

export type JenisKelamin = 'L' | 'P';

export type Peran = 'kader' | 'bidan' | 'admin';

/** Enam indeks antropometri, sama dengan App\Enums\Indeks. */
export type Indeks = 'BB_U' | 'TB_U' | 'BB_TB' | 'IMT_U' | 'LILA_U' | 'LIKA_U';

/** Ketidakhadiran bukan berat badan nol — lihat DR-04. */
export type StatusKehadiran =
    'hadir' | 'tidak_hadir' | 'pindah' | 'tidak_dapat_diukur';

export type Periode = {
    id: string;
    label: string;
    tanggalKegiatan: string | null;
};

export type Anak = {
    id: number;
    /** Dua anak tanpa nama dipertahankan apa adanya, tidak disembunyikan. */
    nama: string | null;
    nik: string | null;
    /** NIK hanya ditampilkan bila belum lengkap (bagian 6.4). */
    nikLengkap: boolean;
    jk: JenisKelamin | null;
    tglLahir: string | null;
    anakKe: number | null;
    bbLahirKg: number | null;
    /** Nilai bersatuan gram ditandai, tidak dikonversi diam-diam. */
    bbLahirMeragukan: boolean;
    pbLahirCm: number | null;
    bukuKia: boolean;
    imd: boolean;
    rt: string | null;
    rw: string;
    namaOrtu: string | null;
    nikOrtu: string | null;
};

export type PenilaianGizi = {
    z: number;
    /** Null untuk LILA/U: labelnya belum dikonfirmasi (OI-04). */
    kategori: string | null;
    tidakWajar: boolean;
};

export type Pengukuran = {
    anakId: number;
    periodeId: string;
    tanggalUkur: string | null;
    umurBulan: number | null;
    bbKg: number | null;
    tinggiCm: number | null;
    lilaCm: number | null;
    likaCm: number | null;
    ntob: string | null;
    statusKehadiran: StatusKehadiran;
    catatanUkur: Record<string, string> | null;
    /**
     * Indeks yang tidak ada di sini berarti tidak dapat dihitung, bukan nol.
     * Semantiknya sama dengan ketiadaan baris di tabel penilaian_gizi.
     */
    penilaian: Partial<Record<Indeks, PenilaianGizi>>;
};

/** Parameter LMS BB/U 0-60 bulan, untuk menggambar pita pada kurva KMS. */
export type GarisSd = {
    jk: JenisKelamin;
    umurBulan: number;
    l: number;
    m: number;
    s: number;
};
