import type { ComponentType } from 'react';
import { Calculator, Flag, History, Ruler, Users } from 'lucide-react';
import type { Pengguna, Peran } from '@/types/posyandu';

export type Ambang = {
    beratMin: number;
    beratMax: number;
    tinggiMin: number;
    tinggiMax: number;
    lilaMin: number;
    lilaMax: number;
    likaMin: number;
    likaMax: number;
    naikMax: number;
    turunMax: number;
    tinggiBerkurangMax: number;
    umurMaxBulan: number;
    ambangWaspada: number;
    ambangRujukan: number;
};

export type StandarisasiAntropometri = {
    standar: 'who_permenkes_2020' | 'who_2007' | 'cdc_2000';
    koreksiPosisiOtomatis: boolean;
};

export type BarisRiwayatPengaturan = {
    waktu: string;
    oleh: string;
    bagian: string;
    perubahan: string;
};

/**
 * Daftar akun beserta pilihan RT binaan. Aplikasi memuatnya dari server;
 * demo selalu `siap` dengan data contoh.
 */
export type PosyanduAkun = { id: number; nama: string; rw: string };
export type WilayahRtAkun = { posyanduId: number; rt: string };

export type DaftarPengguna =
    | { status: 'memuat' }
    | { status: 'gagal'; ulangi: () => void }
    | {
          status: 'siap';
          pengguna: Pengguna[];
          wilayahRt: WilayahRtAkun[];
          posyandu: PosyanduAkun[];
      };

/** Isian dialog akun. Kata sandi kosong pada perubahan berarti tidak diganti. */
export type IsianPengguna = Omit<Pengguna, 'id'> & {
    kataSandi: string;
    posyanduId: number | null;
};

export type Bagian = 'batas' | 'ambang' | 'pengguna' | 'standar' | 'riwayat';

export const BAGIAN: {
    kunci: Bagian;
    label: string;
    ikon: ComponentType<{ className?: string; strokeWidth?: number }>;
    keterangan: string;
}[] = [
    {
        kunci: 'batas',
        label: 'Batas angka ukur',
        ikon: Ruler,
        keterangan:
            'Angka di luar batas ditanyakan ulang saat mencatat; kader tetap bisa menyimpan.',
    },
    {
        kunci: 'ambang',
        label: 'Ambang rujukan',
        ikon: Flag,
        keterangan:
            'Mengatur kapan arahan untuk keluarga berubah. Kategori status gizi resmi tetap mengikuti Permenkes.',
    },
    {
        kunci: 'pengguna',
        label: 'Pengguna dan peran',
        ikon: Users,
        keterangan: 'Akun yang bisa masuk, beserta peran dan cakupan aksesnya.',
    },
    {
        kunci: 'standar',
        label: 'Standar perhitungan',
        ikon: Calculator,
        keterangan: 'Acuan untuk menghitung z-score dan status gizi balita.',
    },
    {
        kunci: 'riwayat',
        label: 'Riwayat perubahan',
        ikon: History,
        keterangan:
            'Setiap perubahan pengaturan tercatat: siapa, kapan, dan apa yang diubah. Data contoh.',
    },
];

/** Nama, satuan, dan jumlah desimal tiap angka yang bisa diubah. */
export const ANGKA: Record<
    keyof Ambang,
    { label: string; satuan: string; desimal: number }
> = {
    beratMin: { label: 'Berat badan minimal', satuan: 'kg', desimal: 1 },
    beratMax: { label: 'Berat badan maksimal', satuan: 'kg', desimal: 1 },
    tinggiMin: { label: 'Panjang/tinggi minimal', satuan: 'cm', desimal: 1 },
    tinggiMax: { label: 'Panjang/tinggi maksimal', satuan: 'cm', desimal: 1 },
    lilaMin: { label: 'LILA minimal', satuan: 'cm', desimal: 1 },
    lilaMax: { label: 'LILA maksimal', satuan: 'cm', desimal: 1 },
    likaMin: { label: 'LIKA minimal', satuan: 'cm', desimal: 1 },
    likaMax: { label: 'LIKA maksimal', satuan: 'cm', desimal: 1 },
    naikMax: { label: 'Berat naik maksimal', satuan: 'kg', desimal: 1 },
    turunMax: { label: 'Berat turun maksimal', satuan: 'kg', desimal: 1 },
    tinggiBerkurangMax: {
        label: 'Tinggi berkurang maksimal',
        satuan: 'cm',
        desimal: 1,
    },
    umurMaxBulan: { label: 'Umur maksimal', satuan: 'bulan', desimal: 0 },
    ambangWaspada: { label: 'Zona waspada', satuan: 'SD', desimal: 2 },
    ambangRujukan: {
        label: 'Anjuran hubungi faskes',
        satuan: 'SD',
        desimal: 2,
    },
};

export const KUNCI_ANGKA = Object.keys(ANGKA) as (keyof Ambang)[];

/** Pasangan minimal dan maksimal pada tabel Rentang wajar. */
export const RENTANG: {
    label: string;
    min: keyof Ambang;
    max: keyof Ambang;
}[] = [
    { label: 'Berat badan', min: 'beratMin', max: 'beratMax' },
    { label: 'Panjang/tinggi', min: 'tinggiMin', max: 'tinggiMax' },
    { label: 'LILA', min: 'lilaMin', max: 'lilaMax' },
    { label: 'LIKA', min: 'likaMin', max: 'likaMax' },
];

export const STANDAR: {
    nilai: StandarisasiAntropometri['standar'];
    judul: string;
    cakupan: string;
    keterangan: string;
}[] = [
    {
        nilai: 'who_permenkes_2020',
        judul: 'Permenkes RI No. 2/2020 + WHO LMS 2006',
        cakupan: 'Standar operasional balita 0–60 bulan',
        keterangan:
            'Dipakai untuk menghitung z-score, grafik KMS, dan status gizi di SIMPATIK.',
    },
    {
        nilai: 'who_2007',
        judul: 'WHO Reference 2007',
        cakupan: 'Pembanding usia 5–19 tahun',
        keterangan: 'Tidak dipakai untuk menilai balita.',
    },
];

/**
 * Empat ambang z-score PMK No. 2 Tahun 2020, apa adanya: rujukan yang bisa
 * dibaca bidan, bukan kontrol.
 */
export const AMBANG_Z = [
    { teks: 'di bawah −3 SD', kelas: 'bg-tone-red-bg text-tone-red' },
    { teks: '−3 SD sampai −2 SD', kelas: 'bg-tone-amber-bg text-tone-amber' },
    { teks: '−2 SD sampai +1 SD', kelas: 'bg-tone-green-bg text-tone-green' },
    { teks: 'di atas +1 SD', kelas: 'bg-tone-blue-bg text-tone-blue' },
];

export const NAMA_PERAN: Record<Peran, string> = {
    kader: 'Kader',
    bidan: 'Bidan',
    admin: 'Admin Posyandu',
    kms: 'Petugas KMS',
};

export const URUTAN_PERAN: Peran[] = ['kader', 'bidan', 'admin', 'kms'];

/** Sama dengan `SANDI_MINIMAL` di server/src/auth/akun.ts. */
export const SANDI_MINIMAL = 8;

/** Sama dengan `POLA_USERNAME` dan `ATURAN_USERNAME` di server/src/auth/akun.ts. */
export const POLA_USERNAME = /^[a-z0-9._-]{3,32}$/;
export const ATURAN_USERNAME =
    'Nama pengguna 3–32 karakter tanpa spasi: huruf, angka, titik, garis bawah, atau tanda hubung. Contoh: kader01.';

/** Label RT dua digit, sama seperti Data Balita dan Laporan. */
export function labelRt(rt: string): string {
    return `RT ${rt.padStart(2, '0')}`;
}

/** "2,5" atau "−1,96" menjadi angka; teks kosong atau rusak menjadi null. */
export function keAngka(teks: string): number | null {
    const bersih = teks.trim().replace('−', '-').replace(',', '.');
    const n = Number(bersih);

    return bersih === '' || !Number.isFinite(n) ? null : n;
}

/**
 * Admin aktif terakhir tidak boleh diturunkan perannya maupun dinonaktifkan.
 */
export function adminAktifTerakhir(daftar: Pengguna[], id: number): boolean {
    const aktif = daftar.filter((p) => p.aktif && p.peran === 'admin');

    return aktif.length === 1 && aktif[0]?.id === id;
}

export type PengaturanProps = {
    ambang: Ambang;
    standarVersi: string;
    barisStandar: number;
    terakhirDiubah: { tanggal: string; oleh: string };
    standarisasi: StandarisasiAntropometri;
    /** Tanpa ini tombol simpan dirender nonaktif beserta alasannya. */
    onSimpan?: (nilai: Ambang) => void;
    onSimpanStandarisasi?: (nilai: StandarisasiAntropometri) => void;
    /** Bagian Pengguna dan peran hanya terbuka untuk admin. */
    peran: Peran;
    pengguna: DaftarPengguna;
    /** Id null berarti akun baru. Hasilnya null bila tersimpan, atau alasan penolakannya. */
    onSimpanPengguna: (
        id: number | null,
        isian: IsianPengguna,
    ) => Promise<string | null>;
    riwayat: BarisRiwayatPengaturan[];
};
