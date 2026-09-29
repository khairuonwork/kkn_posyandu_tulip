/**
 * Pengaturan — panel bertab, mengikuti mockup yang disetujui 26 September 2026.
 *
 * Satu kartu: menu lima bagian di kiri, isi bagian di kanan, dan bilah Simpan
 * di kakinya. Perubahan angka dan standar ditahan sampai disimpan dan tetap
 * tertahan saat berpindah bagian; meninggalkan Pengaturan sebelum menyimpan
 * ditanyakan dulu. Kader tidak pernah diblokir oleh batas-batas ini — angka
 * di luar batas hanya ditanyakan ulang saat mencatat.
 */

import {
    Calculator,
    CircleCheck,
    CircleMinus,
    Flag,
    History,
    Lock,
    Pencil,
    Plus,
    Ruler,
    Save,
    Settings,
    TriangleAlert,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import Dialog, { KakiDialog } from '@/components/dialog';
import Halaman from '@/components/halaman';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { angka, tanggalPanjang, zScore } from '@/lib/format';
import { navigate } from '@/lib/nav';
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
export type DaftarPengguna =
    | { status: 'memuat' }
    | { status: 'gagal'; ulangi: () => void }
    | { status: 'siap'; pengguna: Pengguna[]; wilayahRt: string[] };

/** Isian dialog akun. Kata sandi kosong pada perubahan berarti tidak diganti. */
export type IsianPengguna = Omit<Pengguna, 'id'> & { kataSandi: string };

type Props = {
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

type Bagian = 'batas' | 'ambang' | 'pengguna' | 'standar' | 'riwayat';

const BAGIAN: {
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
        keterangan: 'Akun yang bisa masuk, beserta peran dan RT binaannya.',
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
const ANGKA: Record<
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

const KUNCI_ANGKA = Object.keys(ANGKA) as (keyof Ambang)[];

/** Pasangan minimal dan maksimal pada tabel Rentang wajar. */
const RENTANG: { label: string; min: keyof Ambang; max: keyof Ambang }[] = [
    { label: 'Berat badan', min: 'beratMin', max: 'beratMax' },
    { label: 'Panjang/tinggi', min: 'tinggiMin', max: 'tinggiMax' },
    { label: 'LILA', min: 'lilaMin', max: 'lilaMax' },
    { label: 'LIKA', min: 'likaMin', max: 'likaMax' },
];

const STANDAR: {
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
 * dibaca bidan, bukan kontrol. Tiap blok memuat teks — laporan Posyandu
 * dicetak hitam-putih.
 */
const AMBANG_Z = [
    { teks: 'di bawah −3 SD', kelas: 'bg-tone-red-bg text-tone-red' },
    { teks: '−3 SD sampai −2 SD', kelas: 'bg-tone-amber-bg text-tone-amber' },
    { teks: '−2 SD sampai +1 SD', kelas: 'bg-tone-green-bg text-tone-green' },
    { teks: 'di atas +1 SD', kelas: 'bg-tone-blue-bg text-tone-blue' },
];

const NAMA_PERAN: Record<Peran, string> = {
    kader: 'Kader',
    bidan: 'Bidan',
    admin: 'Admin',
};

const URUTAN_PERAN: Peran[] = ['kader', 'bidan', 'admin'];

/** Sama dengan `SANDI_MINIMAL` di server/src/auth/akun.ts. */
const SANDI_MINIMAL = 8;

/** Sama dengan `POLA_USERNAME` dan `ATURAN_USERNAME` di server/src/auth/akun.ts. */
const POLA_USERNAME = /^[a-z0-9._-]{3,32}$/;
const ATURAN_USERNAME =
    'Nama pengguna 3–32 karakter tanpa spasi: huruf, angka, titik, garis bawah, atau tanda hubung. Contoh: kader01.';

/** Label RT dua digit, sama seperti Data Balita dan Laporan. */
function labelRt(rt: string): string {
    return `RT ${rt.padStart(2, '0')}`;
}

/** "2,5" atau "−1,96" menjadi angka; teks kosong atau rusak menjadi null. */
function keAngka(teks: string): number | null {
    const bersih = teks.trim().replace('−', '-').replace(',', '.');
    const n = Number(bersih);

    return bersih === '' || !Number.isFinite(n) ? null : n;
}

/**
 * Admin aktif terakhir tidak boleh diturunkan perannya maupun dinonaktifkan.
 * Tanpa penjaga ini satu klik bisa mengunci semua orang keluar dari layar yang
 * memuat penjaganya sendiri.
 */
function adminAktifTerakhir(daftar: Pengguna[], id: number): boolean {
    const admin = daftar.filter((p) => p.peran === 'admin' && p.aktif);

    return admin.length === 1 && admin[0].id === id;
}

export default function Pengaturan({
    ambang,
    standarVersi,
    barisStandar,
    terakhirDiubah,
    standarisasi,
    onSimpan,
    onSimpanStandarisasi,
    peran,
    pengguna,
    onSimpanPengguna,
    riwayat,
}: Props) {
    const [bagian, setBagian] = useState<Bagian>('batas');
    const teksAwal = () =>
        Object.fromEntries(
            KUNCI_ANGKA.map((k) => [k, angka(ambang[k], ANGKA[k].desimal)]),
        ) as Record<keyof Ambang, string>;
    const [teks, setTeks] = useState(teksAwal);
    const [rumus, setRumus] = useState(standarisasi);
    /** Alamat yang dituju saat perubahan belum disimpan. */
    const [tujuan, setTujuan] = useState<string | null>(null);

    const nilai = Object.fromEntries(
        KUNCI_ANGKA.map((k) => [k, keAngka(teks[k])]),
    ) as Record<keyof Ambang, number | null>;
    const salahAngka = KUNCI_ANGKA.filter((k) => nilai[k] === null);
    const salahRentang = RENTANG.filter((r) => {
        const min = nilai[r.min];
        const max = nilai[r.max];

        return min !== null && max !== null && max <= min;
    });
    const diubah = (k: keyof Ambang) =>
        nilai[k] !== null &&
        angka(nilai[k], ANGKA[k].desimal) !==
            angka(ambang[k], ANGKA[k].desimal);

    // Kalimat tiap perubahan, dipakai bilah Simpan dan dialog pindah bagian.
    const perubahan = [
        ...KUNCI_ANGKA.filter(diubah).map(
            (k) =>
                `${ANGKA[k].label} diubah dari ${angka(ambang[k], ANGKA[k].desimal)} menjadi ${angka(nilai[k], ANGKA[k].desimal)} ${ANGKA[k].satuan}.`,
        ),
        ...(rumus.standar !== standarisasi.standar
            ? [
                  `Standar perhitungan diubah menjadi ${STANDAR.find((s) => s.nilai === rumus.standar)?.judul ?? rumus.standar}.`,
              ]
            : []),
        ...(rumus.koreksiPosisiOtomatis !== standarisasi.koreksiPosisiOtomatis
            ? [
                  `Koreksi posisi ukur otomatis ${rumus.koreksiPosisiOtomatis ? 'dinyalakan' : 'dimatikan'}.`,
              ]
            : []),
    ];
    const bisaSimpan =
        onSimpan !== undefined &&
        perubahan.length > 0 &&
        salahAngka.length === 0 &&
        salahRentang.length === 0;

    const simpan = () => {
        if (!bisaSimpan) {
            return;
        }

        onSimpan?.(
            Object.fromEntries(
                KUNCI_ANGKA.map((k) => [k, nilai[k] ?? ambang[k]]),
            ) as Ambang,
        );
        onSimpanStandarisasi?.(rumus);
    };

    const batalkan = () => {
        setTeks(teksAwal());
        setRumus(standarisasi);
    };

    /* Meninggalkan Pengaturan dengan perubahan tertahan ditanyakan dulu.
       Klik tautan ditangkap sebelum sampai ke tautannya; alamatnya baru
       diganti setelah pengguna memilih. */
    const adaPerubahan = perubahan.length > 0;

    useEffect(() => {
        if (!adaPerubahan) {
            return;
        }

        const tangkap = (e: MouseEvent) => {
            const tautan = (e.target as Element | null)?.closest?.(
                'a[href^="#/"]',
            );
            const href = tautan?.getAttribute('href')?.slice(1);

            if (href === undefined || href.startsWith('/pengaturan')) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            setTujuan(href);
        };

        document.addEventListener('click', tangkap, true);

        return () => document.removeEventListener('click', tangkap, true);
    }, [adaPerubahan]);

    const info = BAGIAN.find((b) => b.kunci === bagian) ?? BAGIAN[0];
    const ubahTeks = (k: keyof Ambang, v: string) =>
        setTeks((lama) => ({ ...lama, [k]: v.replace(/[^\d.,−-]/g, '') }));

    return (
        <Halaman
            ikon={Settings}
            penuh="lg"
            judul="Pengaturan"
            subjudul={`Terakhir diubah ${tanggalPanjang(terakhirDiubah.tanggal)} oleh ${terakhirDiubah.oleh}. Data contoh.`}
        >
            <div className="kartu grid overflow-hidden lg:min-h-0 lg:flex-1 lg:grid-cols-[272px_minmax(0,1fr)]">
                <nav
                    aria-label="Bagian pengaturan"
                    className="flex flex-wrap gap-1 border-b border-border p-3.5 lg:flex-col lg:flex-nowrap lg:border-r lg:border-b-0"
                >
                    {BAGIAN.map((b) => {
                        const Ikon = b.ikon;
                        const aktif = b.kunci === bagian;

                        return (
                            <button
                                key={b.kunci}
                                type="button"
                                aria-current={aktif ? 'true' : undefined}
                                onClick={() => setBagian(b.kunci)}
                                className={`flex min-h-15 items-center gap-3.5 rounded-lg px-4 text-left text-base ${
                                    aktif
                                        ? 'bg-primary font-bold text-primary-foreground'
                                        : 'font-semibold text-[#33403a] hover:bg-surface'
                                }`}
                            >
                                <Ikon
                                    className="size-6 shrink-0"
                                    strokeWidth={2.25}
                                />
                                {b.label}
                            </button>
                        );
                    })}
                    <p className="mt-auto hidden gap-2 border-t border-border px-1.5 pt-3.5 text-sm text-muted-foreground lg:flex">
                        <Lock
                            className="size-5 shrink-0"
                            strokeWidth={2.25}
                            aria-hidden="true"
                        />
                        Menu ini hanya tampil untuk bidan dan admin.
                    </p>
                </nav>

                <section
                    aria-labelledby="judul-bagian"
                    className="flex min-w-0 flex-col lg:min-h-0"
                >
                    <div className="shrink-0 border-b border-border px-7 pt-4.5 pb-3.5">
                        <h2
                            id="judul-bagian"
                            className="text-xl leading-tight font-extrabold"
                        >
                            {info.label}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {info.keterangan}
                        </p>
                    </div>

                    {/* Panel dua kolom di bagian ini mulai 1280 px (80rem), bukan
                        dari xl yang sudah diturunkan ke 1200 px: di bawah 1280 px
                        kotak angka tabel Rentang wajar terpotong. */}
                    {bagian === 'batas' && (
                        <IsiGulir>
                            <div className="grid gap-y-5 px-7 pt-3.5 pb-4.5 min-[80rem]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                                <div className="min-w-0 min-[80rem]:border-r min-[80rem]:border-border min-[80rem]:pr-7">
                                    <h3 className="mb-2 text-base font-extrabold">
                                        Rentang wajar
                                    </h3>
                                    <table className="w-full table-fixed">
                                        <colgroup>
                                            <col className="w-[34%]" />
                                            <col />
                                            <col />
                                        </colgroup>
                                        <thead>
                                            <tr className="border-b-2 border-border-strong text-left text-sm text-muted-foreground">
                                                <th
                                                    scope="col"
                                                    className="pr-2 pb-1.5 font-semibold"
                                                >
                                                    Ukuran
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-1.5 pb-1.5 font-semibold"
                                                >
                                                    Minimal
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="pb-1.5 pl-1.5 font-semibold"
                                                >
                                                    Maksimal
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {RENTANG.map((r) => {
                                                const salah =
                                                    salahRentang.includes(r);

                                                return [
                                                    <tr
                                                        key={r.label}
                                                        className={
                                                            salah
                                                                ? ''
                                                                : 'border-b border-rule'
                                                        }
                                                    >
                                                        <th
                                                            scope="row"
                                                            className="py-0.5 pr-2 text-left font-bold"
                                                        >
                                                            {r.label}
                                                        </th>
                                                        <td className="px-1.5 py-0.5">
                                                            <IsianAngka
                                                                kunci={r.min}
                                                                teks={teks}
                                                                ambang={ambang}
                                                                salah={salah}
                                                                onGanti={
                                                                    ubahTeks
                                                                }
                                                            />
                                                        </td>
                                                        <td className="py-0.5 pl-1.5">
                                                            <IsianAngka
                                                                kunci={r.max}
                                                                teks={teks}
                                                                ambang={ambang}
                                                                salah={salah}
                                                                onGanti={
                                                                    ubahTeks
                                                                }
                                                            />
                                                        </td>
                                                    </tr>,
                                                    salah && (
                                                        <tr
                                                            key={`${r.label}-salah`}
                                                            className="border-b border-rule"
                                                        >
                                                            <td
                                                                colSpan={3}
                                                                className="pb-2 text-right text-sm font-semibold text-tone-red"
                                                            >
                                                                Batas maksimal
                                                                harus lebih
                                                                besar dari
                                                                minimal.
                                                            </td>
                                                        </tr>
                                                    ),
                                                ];
                                            })}
                                            <tr>
                                                <th
                                                    scope="row"
                                                    className="py-0.5 pr-2 text-left font-bold"
                                                >
                                                    Umur balita
                                                </th>
                                                <td className="px-1.5 py-0.5">
                                                    {/* Umur minimal tetap nol:
                                                        bayi baru lahir adalah
                                                        balita. */}
                                                    <div
                                                        aria-label="Umur minimal 0 bulan, tetap"
                                                        className="flex h-14 text-muted-foreground"
                                                    >
                                                        <span className="flex flex-1 items-center justify-end px-2.5 font-bold">
                                                            0
                                                        </span>
                                                        <span className="flex w-14 shrink-0 items-center justify-center text-sm">
                                                            bulan
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-0.5 pl-1.5">
                                                    <IsianAngka
                                                        kunci="umurMaxBulan"
                                                        teks={teks}
                                                        ambang={ambang}
                                                        onGanti={ubahTeks}
                                                    />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="min-w-0 min-[80rem]:pl-7">
                                    <h3 className="text-base font-extrabold">
                                        Selisih antar bulan
                                    </h3>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        Dibanding hasil ukur bulan lalu.
                                    </p>
                                    <div className="mt-3 flex flex-col gap-3.5">
                                        {(
                                            [
                                                'naikMax',
                                                'turunMax',
                                                'tinggiBerkurangMax',
                                            ] as const
                                        ).map((k) => (
                                            <IsianAngka
                                                key={k}
                                                kunci={k}
                                                teks={teks}
                                                ambang={ambang}
                                                onGanti={ubahTeks}
                                                berlabel
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </IsiGulir>
                    )}

                    {bagian === 'ambang' && (
                        <IsiGulir>
                            <div className="grid gap-y-5 px-7 pt-3.5 pb-4.5 min-[80rem]:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                                <div className="min-w-0 min-[80rem]:border-r min-[80rem]:border-border min-[80rem]:pr-7">
                                    <h3 className="text-base font-extrabold">
                                        Batas z-score
                                    </h3>
                                    <div className="mt-3 flex flex-col gap-4.5">
                                        <div className="max-w-[560px]">
                                            <IsianAngka
                                                kunci="ambangWaspada"
                                                teks={teks}
                                                ambang={ambang}
                                                onGanti={ubahTeks}
                                                berlabel
                                                sempit
                                            />
                                            <p className="mt-1.5 text-sm text-muted-foreground">
                                                Jika salah satu z-score sama
                                                dengan atau di bawah angka ini,
                                                arahan untuk keluarga berbunyi:
                                                pertumbuhan perlu dipantau lebih
                                                dekat.
                                            </p>
                                        </div>
                                        <div className="max-w-[560px]">
                                            <IsianAngka
                                                kunci="ambangRujukan"
                                                teks={teks}
                                                ambang={ambang}
                                                onGanti={ubahTeks}
                                                berlabel
                                                sempit
                                            />
                                            <p className="mt-1.5 text-sm text-muted-foreground">
                                                Jika salah satu z-score sama
                                                dengan atau di bawah angka ini,
                                                keluarga dianjurkan menghubungi
                                                fasilitas kesehatan atau dokter
                                                terdekat.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex min-w-0 flex-col gap-3.5 min-[80rem]:pl-7">
                                    <div
                                        role="note"
                                        className="flex gap-2.5 rounded-lg bg-tone-amber-bg px-4 py-3.5"
                                    >
                                        <TriangleAlert
                                            className="mt-0.5 size-5 shrink-0 text-tone-amber"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="text-base font-bold text-tone-amber">
                                                Belum disahkan Puskesmas
                                            </p>
                                            <p className="mt-0.5 text-sm">
                                                Nilai awal mengikuti diskusi
                                                kader. Keduanya harus disahkan
                                                Puskesmas sebelum dipakai untuk
                                                data sungguhan.
                                            </p>
                                        </div>
                                    </div>
                                    {nilai.ambangRujukan !== null && (
                                        <div className="rounded-lg bg-surface px-4 py-3.5">
                                            <p className="text-base font-bold">
                                                Contoh
                                            </p>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                Balita dengan TB/U{' '}
                                                {zScore(
                                                    nilai.ambangRujukan - 0.24,
                                                ).replace('+', '')}{' '}
                                                SD mendapat anjuran menghubungi
                                                faskes, karena{' '}
                                                {zScore(
                                                    nilai.ambangRujukan - 0.24,
                                                ).replace('+', '')}{' '}
                                                lebih rendah dari{' '}
                                                {zScore(
                                                    nilai.ambangRujukan,
                                                ).replace('+', '')}
                                                .
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </IsiGulir>
                    )}

                    {bagian === 'pengguna' && (
                        <BagianPengguna
                            peran={peran}
                            daftar={pengguna}
                            onSimpan={onSimpanPengguna}
                        />
                    )}

                    {bagian === 'standar' && (
                        <IsiGulir>
                            <div className="grid gap-y-5 px-7 pt-3.5 pb-4.5 min-[80rem]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                                <div className="flex min-w-0 flex-col gap-3.5 min-[80rem]:border-r min-[80rem]:border-border min-[80rem]:pr-7">
                                    <fieldset className="flex flex-col gap-3">
                                        <legend className="mb-2 text-base font-extrabold">
                                            Standar yang dipakai
                                        </legend>
                                        {STANDAR.map((s) => {
                                            const dipilih =
                                                rumus.standar === s.nilai;

                                            return (
                                                <label
                                                    key={s.nilai}
                                                    className={`flex cursor-pointer gap-3.5 rounded-lg border-2 px-4.5 py-3.5 ${
                                                        dipilih
                                                            ? 'border-primary bg-accent'
                                                            : 'border-border bg-card hover:bg-surface'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="standar-antropometri"
                                                        checked={dipilih}
                                                        onChange={() =>
                                                            setRumus({
                                                                ...rumus,
                                                                standar:
                                                                    s.nilai,
                                                            })
                                                        }
                                                        className="mt-0.5 size-5 shrink-0 accent-primary"
                                                    />
                                                    <span className="min-w-0">
                                                        <span className="block text-base font-bold">
                                                            {s.judul}
                                                        </span>
                                                        <span
                                                            className={`block text-sm font-semibold ${dipilih ? 'text-primary' : ''}`}
                                                        >
                                                            {s.cakupan}
                                                        </span>
                                                        <span className="mt-0.5 block text-sm text-muted-foreground">
                                                            {s.keterangan}
                                                        </span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </fieldset>
                                    <label className="flex cursor-pointer gap-3.5 rounded-lg border-2 border-border bg-surface px-4.5 py-3.5">
                                        <input
                                            type="checkbox"
                                            checked={
                                                rumus.koreksiPosisiOtomatis
                                            }
                                            onChange={(e) =>
                                                setRumus({
                                                    ...rumus,
                                                    koreksiPosisiOtomatis:
                                                        e.target.checked,
                                                })
                                            }
                                            className="mt-0.5 size-5 shrink-0 accent-primary"
                                        />
                                        <span>
                                            <span className="block text-base font-bold">
                                                Koreksi posisi ukur otomatis
                                                ±0,7 cm
                                            </span>
                                            <span className="mt-0.5 block text-sm text-muted-foreground">
                                                Aturan WHO: balita di bawah 24
                                                bulan yang diukur berdiri
                                                ditambah 0,7 cm; balita 24 bulan
                                                ke atas yang diukur telentang
                                                dikurangi 0,7 cm.
                                            </span>
                                        </span>
                                    </label>
                                </div>

                                <div className="min-w-0 min-[80rem]:pl-7">
                                    <h3 className="flex items-center gap-2 text-base font-extrabold">
                                        <Lock
                                            className="size-5"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                        Kategori z-score, terkunci
                                    </h3>
                                    <p className="mt-1.5 text-sm text-muted-foreground">
                                        Ditetapkan Permenkes No. 2 Tahun 2020,
                                        tidak bisa diubah dari aplikasi.
                                    </p>
                                    <ul className="mt-2.5 flex flex-col gap-1.5">
                                        {AMBANG_Z.map((a) => (
                                            <li
                                                key={a.teks}
                                                className={`rounded-lg px-3.5 py-2 text-base font-bold ${a.kelas}`}
                                            >
                                                {a.teks}
                                            </li>
                                        ))}
                                    </ul>
                                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-7 gap-y-1.5 border-t border-border pt-4 text-sm">
                                        <dt className="text-muted-foreground">
                                            Tabel standar
                                        </dt>
                                        <dd className="text-base font-bold">
                                            {standarVersi}
                                        </dd>
                                        <dt className="text-muted-foreground">
                                            Jumlah baris
                                        </dt>
                                        <dd className="text-base font-bold">
                                            {barisStandar}
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </IsiGulir>
                    )}

                    {bagian === 'riwayat' && (
                        <>
                            <Table
                                aria-label="Riwayat perubahan pengaturan"
                                containerClassName="lg:min-h-0 lg:flex-1"
                            >
                                <TableHeader className="sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead
                                            scope="col"
                                            className="first:pl-7"
                                        >
                                            Waktu
                                        </TableHead>
                                        <TableHead scope="col">Oleh</TableHead>
                                        <TableHead scope="col">
                                            Bagian
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            className="last:pr-7"
                                        >
                                            Perubahan
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {riwayat.map((r) => (
                                        <TableRow
                                            key={`${r.waktu}-${r.perubahan}`}
                                        >
                                            <TableCell className="font-bold whitespace-nowrap first:pl-7">
                                                {r.waktu}
                                            </TableCell>
                                            <TableCell>{r.oleh}</TableCell>
                                            <TableCell>{r.bagian}</TableCell>
                                            <TableCell className="last:pr-7">
                                                {r.perubahan}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <p className="shrink-0 border-t border-border px-7 py-3 text-sm text-muted-foreground">
                                Menampilkan {riwayat.length} perubahan · terbaru
                                di atas
                            </p>
                        </>
                    )}

                    {bagian !== 'riwayat' && (
                        <BilahSimpan
                            perubahan={perubahan}
                            bisaSimpan={bisaSimpan}
                            tanpaTempat={onSimpan === undefined}
                            onSimpan={simpan}
                            onBatal={batalkan}
                        />
                    )}
                </section>
            </div>

            {tujuan !== null && (
                <Dialog
                    judul={`${perubahan.length} perubahan belum disimpan.`}
                    keterangan="Perubahan ini hilang bila Anda pindah tanpa menyimpan."
                    lebar="w-[560px]"
                    onTutup={() => setTujuan(null)}
                >
                    <ul className="flex list-disc flex-col gap-1 overflow-y-auto px-7 py-4.5 pl-12 text-base">
                        {perubahan.map((p) => (
                            <li key={p}>{p}</li>
                        ))}
                    </ul>
                    <KakiDialog>
                        <button
                            type="button"
                            onClick={() => {
                                const ke = tujuan;

                                batalkan();
                                setTujuan(null);
                                navigate(ke);
                            }}
                            className="tombol-kedua"
                        >
                            Pindah tanpa menyimpan
                        </button>
                        <button
                            type="button"
                            disabled={!bisaSimpan}
                            onClick={() => {
                                const ke = tujuan;

                                simpan();
                                setTujuan(null);
                                navigate(ke);
                            }}
                            className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                        >
                            <Save
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Simpan pengaturan
                        </button>
                    </KakiDialog>
                </Dialog>
            )}
        </Halaman>
    );
}

/** Badan bagian yang menggulir di dalam panel, di antara kepala dan bilah Simpan. */
function IsiGulir({ children }: { children: ReactNode }) {
    return (
        <div
            tabIndex={0}
            aria-label="Isi pengaturan"
            className="gulir-dalam lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
        >
            {children}
        </div>
    );
}

/**
 * Satu kotak angka bersatuan. Angka yang sudah diubah berbingkai biru dengan
 * nilai lamanya di bawah; yang tidak terbaca sebagai angka berbingkai merah.
 */
function IsianAngka({
    kunci,
    teks,
    ambang,
    onGanti,
    salah = false,
    berlabel = false,
    sempit = false,
}: {
    kunci: keyof Ambang;
    teks: Record<keyof Ambang, string>;
    ambang: Ambang;
    onGanti: (k: keyof Ambang, v: string) => void;
    /** Bagian dari pasangan rentang yang maksimalnya tidak lebih besar. */
    salah?: boolean;
    /** Label tampil di atas kotak; tanpa ini label hanya dibacakan. */
    berlabel?: boolean;
    sempit?: boolean;
}) {
    const { label, satuan, desimal } = ANGKA[kunci];
    const n = keAngka(teks[kunci]);
    const rusak = n === null;
    const berubah =
        !rusak && angka(n, desimal) !== angka(ambang[kunci], desimal);
    const id = `atur-${kunci}`;

    return (
        <div className={sempit ? 'w-52' : ''}>
            {berlabel && (
                <label
                    htmlFor={id}
                    className="mb-1.5 block text-sm font-semibold text-muted-foreground"
                >
                    {label}
                </label>
            )}
            <div
                className={`isian flex overflow-hidden p-0 ${
                    rusak || salah
                        ? 'border-tone-red'
                        : berubah
                          ? 'border-tone-blue bg-card'
                          : ''
                }`}
            >
                <input
                    id={id}
                    aria-label={berlabel ? undefined : label}
                    aria-invalid={rusak || salah}
                    inputMode="decimal"
                    value={teks[kunci]}
                    onChange={(e) => onGanti(kunci, e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-2.5 text-right font-bold outline-none"
                />
                <span className="flex w-14 shrink-0 items-center justify-center border-l-2 border-border bg-surface-alt text-sm text-muted-foreground">
                    {satuan}
                </span>
            </div>
            {rusak ? (
                <p className="mt-1 text-sm font-semibold text-tone-red">
                    Isi dengan angka.
                </p>
            ) : (
                berubah && (
                    <p className="mt-1 text-sm font-semibold text-tone-blue">
                        Diubah dari {angka(ambang[kunci], desimal)} {satuan}
                    </p>
                )
            )}
        </div>
    );
}

/** Kaki panel: berapa yang belum disimpan, lalu Batalkan dan Simpan. */
function BilahSimpan({
    perubahan,
    bisaSimpan,
    tanpaTempat,
    onSimpan,
    onBatal,
}: {
    perubahan: string[];
    bisaSimpan: boolean;
    tanpaTempat: boolean;
    onSimpan: () => void;
    onBatal: () => void;
}) {
    const ada = perubahan.length > 0;

    return (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4.5 gap-y-3 border-t border-border px-7 py-3.5">
            <div
                role="status"
                className="flex min-w-0 flex-1 basis-64 items-center gap-3.5"
            >
                {ada ? (
                    <>
                        <span
                            aria-hidden="true"
                            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-tone-blue-bg text-tone-blue"
                        >
                            <Pencil className="size-5" strokeWidth={2.25} />
                        </span>
                        <span className="flex min-w-0 flex-col leading-snug">
                            <span className="text-base font-extrabold text-tone-blue">
                                {perubahan.length} perubahan belum disimpan
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {perubahan.length === 1
                                    ? perubahan[0]
                                    : `${perubahan[0].slice(0, -1)}, dan ${perubahan.length - 1} perubahan lainnya.`}{' '}
                                Berlaku mulai penimbangan berikutnya.
                            </span>
                        </span>
                    </>
                ) : (
                    <span className="text-sm text-muted-foreground">
                        {tanpaTempat
                            ? 'Belum ada tempat menyimpannya: tabel pengaturan belum ada di basis data.'
                            : 'Belum ada perubahan.'}
                    </span>
                )}
            </div>
            <div className="flex shrink-0 gap-2.5">
                {ada && (
                    <button
                        type="button"
                        onClick={onBatal}
                        className="tombol-kedua"
                    >
                        Batalkan perubahan
                    </button>
                )}
                <button
                    type="button"
                    disabled={!bisaSimpan}
                    onClick={onSimpan}
                    className="tombol-utama disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none"
                >
                    <Save
                        className="size-5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Simpan pengaturan
                </button>
            </div>
        </div>
    );
}

/**
 * Pengguna dan peran, khusus admin — server pun menolak permintaan daftar
 * akun dari peran lain. Akun dinonaktifkan, tidak dihapus: riwayat perubahan
 * menyebut nama pelakunya, dan baris audit yang menunjuk akun yang lenyap
 * tidak bisa dibaca siapa pun.
 */
function BagianPengguna({
    peran,
    daftar,
    onSimpan,
}: {
    peran: Peran;
    daftar: DaftarPengguna;
    onSimpan: (
        id: number | null,
        isian: IsianPengguna,
    ) => Promise<string | null>;
}) {
    /** null: dialog tertutup; 'baru': tambah; angka: id yang diubah. */
    const [dialog, setDialog] = useState<'baru' | number | null>(null);

    if (peran !== 'admin') {
        return (
            <div className="px-7 pt-3.5">
                <div
                    role="note"
                    className="flex max-w-[640px] gap-2.5 rounded-lg bg-surface px-4 py-3.5"
                >
                    <Lock
                        className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    <div>
                        <p className="text-base font-bold">Khusus admin</p>
                        <p className="mt-0.5 text-sm">
                            Menambah akun, mengubah peran, dan mengganti kata
                            sandi hanya dapat dilakukan oleh admin.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (daftar.status === 'memuat') {
        return (
            <p className="px-7 pt-3.5 text-base text-muted-foreground">
                Memuat daftar akun…
            </p>
        );
    }

    if (daftar.status === 'gagal') {
        return (
            <div className="px-7 pt-3.5">
                <div
                    role="alert"
                    className="flex max-w-[640px] gap-2.5 rounded-lg bg-tone-red-bg px-4 py-3.5"
                >
                    <TriangleAlert
                        className="mt-0.5 size-5 shrink-0 text-tone-red"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    <div>
                        <p className="text-base font-bold text-tone-red">
                            Daftar akun tidak dapat dimuat
                        </p>
                        <p className="mt-0.5 text-sm">
                            Periksa sambungan ke server, lalu ulangi.
                        </p>
                        <button
                            type="button"
                            onClick={daftar.ulangi}
                            className="tombol-kedua mt-3 px-5.5"
                        >
                            Ulangi
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const { pengguna, wilayahRt } = daftar;
    const aktif = pengguna.filter((p) => p.aktif).length;
    const diubah =
        typeof dialog === 'number'
            ? (pengguna.find((p) => p.id === dialog) ?? null)
            : null;

    return (
        <>
            {/* Baris judul membeku; hanya tabel di bawahnya yang digulir. */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4.5 gap-y-2 px-7 pt-3.5 pb-2.5">
                <p className="text-base">
                    <span className="font-extrabold">Pengguna</span>{' '}
                    <span className="text-sm text-muted-foreground">
                        · {aktif} aktif dari {pengguna.length} akun
                    </span>
                </p>
                <button
                    type="button"
                    onClick={() => setDialog('baru')}
                    className="tombol-utama"
                >
                    <Plus
                        className="size-5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Tambah pengguna
                </button>
            </div>

            <Table
                aria-label="Daftar pengguna"
                containerClassName="lg:min-h-0 lg:flex-1"
            >
                <TableHeader className="sticky top-0 z-10">
                    <TableRow>
                        <TableHead scope="col" className="bg-card first:pl-7">
                            Nama dan nama pengguna
                        </TableHead>
                        <TableHead scope="col" className="bg-card">
                            Peran
                        </TableHead>
                        <TableHead scope="col" className="bg-card">
                            RT binaan
                        </TableHead>
                        <TableHead scope="col" className="bg-card">
                            Status
                        </TableHead>
                        <TableHead
                            scope="col"
                            className="bg-card text-right last:pr-7"
                        >
                            Aksi
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pengguna.map((p) => (
                        <TableRow key={p.id}>
                            <TableCell className="first:pl-7">
                                <span
                                    className={`block font-bold ${p.aktif ? '' : 'text-muted-foreground'}`}
                                >
                                    {p.nama}
                                </span>
                                <span className="block text-sm text-muted-foreground">
                                    {p.username}
                                </span>
                            </TableCell>
                            <TableCell>{NAMA_PERAN[p.peran]}</TableCell>
                            <TableCell className="whitespace-nowrap">
                                {/* Bidan dan admin memang melihat semua RT;
                                    itu keterangan, bukan data yang hilang. */}
                                {p.peran === 'kader' && p.rt !== null
                                    ? labelRt(p.rt)
                                    : 'Semua RT'}
                            </TableCell>
                            <TableCell>
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-bold whitespace-nowrap ${
                                        p.aktif
                                            ? 'bg-tone-green-bg text-tone-green'
                                            : 'bg-surface-alt text-muted-foreground'
                                    }`}
                                >
                                    {p.aktif ? (
                                        <CircleCheck
                                            className="size-4"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <CircleMinus
                                            className="size-4"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                    )}
                                    {p.aktif ? 'Aktif' : 'Nonaktif'}
                                </span>
                            </TableCell>
                            <TableCell className="py-1 text-right last:pr-7">
                                <button
                                    type="button"
                                    aria-label={`Ubah pengguna ${p.nama}`}
                                    onClick={() => setDialog(p.id)}
                                    className="tombol-ubah"
                                >
                                    <Pencil
                                        className="size-4.5"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Ubah
                                </button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {dialog !== null && (
                <DialogPengguna
                    pengguna={diubah}
                    terkunci={
                        diubah !== null &&
                        adminAktifTerakhir(pengguna, diubah.id)
                    }
                    wilayahRt={wilayahRt}
                    usernameTerpakai={pengguna
                        .filter((p) => p.id !== diubah?.id)
                        .map((p) => p.username)}
                    onTutup={() => setDialog(null)}
                    onSimpan={async (isian) => {
                        const galat = await onSimpan(diubah?.id ?? null, isian);

                        if (galat === null) {
                            setDialog(null);
                        }

                        return galat;
                    }}
                />
            )}
        </>
    );
}

/**
 * Tambah atau ubah satu akun. Admin memberi kata sandi awal sendiri: Posyandu
 * tidak punya layanan surel untuk tautan undangan.
 */
function DialogPengguna({
    pengguna,
    terkunci,
    wilayahRt,
    usernameTerpakai,
    onTutup,
    onSimpan,
}: {
    /** null berarti akun baru. */
    pengguna: Pengguna | null;
    /** Admin aktif terakhir: peran dan statusnya tidak bisa diubah. */
    terkunci: boolean;
    wilayahRt: string[];
    usernameTerpakai: string[];
    onTutup: () => void;
    /** Hasilnya null bila tersimpan, atau alasan penolakan dari server. */
    onSimpan: (isian: IsianPengguna) => Promise<string | null>;
}) {
    const [nama, setNama] = useState(pengguna?.nama ?? '');
    const [username, setUsername] = useState(pengguna?.username ?? '');
    const [peran, setPeran] = useState<Peran>(pengguna?.peran ?? 'kader');
    const [rt, setRt] = useState(pengguna?.rt ?? wilayahRt[0] ?? '');
    const [aktif, setAktif] = useState(pengguna?.aktif ?? true);
    const [kataSandi, setKataSandi] = useState('');
    const [dicoba, setDicoba] = useState(false);
    const [menyimpan, setMenyimpan] = useState(false);
    const [galatServer, setGalatServer] = useState<string | null>(null);

    // Huruf kecil dipaksakan, sama seperti di server: "Kader01" tetap kader01.
    const usernameBersih = username.trim().toLowerCase();
    const bentrok = usernameTerpakai.includes(usernameBersih);
    const kosong = nama.trim() === '' || usernameBersih === '';
    const salahBentuk =
        usernameBersih !== '' && !POLA_USERNAME.test(usernameBersih);
    const galatUsername = bentrok
        ? 'Nama pengguna ini sudah dipakai akun lain.'
        : dicoba && salahBentuk
          ? ATURAN_USERNAME
          : null;
    const galatSandi =
        pengguna === null && kataSandi === ''
            ? 'Kata sandi awal wajib diisi.'
            : kataSandi !== '' && kataSandi.length < SANDI_MINIMAL
              ? `Kata sandi minimal ${SANDI_MINIMAL} karakter.`
              : null;
    const sandiSalah = dicoba && galatSandi !== null;

    return (
        <Dialog
            judul={
                pengguna === null ? 'Tambah pengguna' : `Ubah ${pengguna.nama}`
            }
            keterangan="Setiap perubahan dicatat: siapa yang mengubah dan kapan."
            lebar="w-[640px]"
            onTutup={onTutup}
        >
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    setDicoba(true);

                    if (
                        kosong ||
                        bentrok ||
                        salahBentuk ||
                        galatSandi !== null ||
                        menyimpan
                    ) {
                        return;
                    }

                    setMenyimpan(true);
                    setGalatServer(null);
                    // Bila tersimpan, BagianPengguna menutup dialog ini.
                    void onSimpan({
                        nama: nama.trim(),
                        username: usernameBersih,
                        peran,
                        rt: peran === 'kader' ? rt : null,
                        aktif,
                        kataSandi,
                    })
                        .catch(
                            () =>
                                'Perubahan tidak dapat disimpan. Silakan ulangi.',
                        )
                        .then((galat) => {
                            setGalatServer(galat);
                            setMenyimpan(false);
                        });
                }}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="grid min-h-0 gap-4 overflow-y-auto px-7 pt-4.5 pb-5.5 sm:grid-cols-2">
                    <KolomPengguna id="pengguna-nama" label="Nama lengkap">
                        <input
                            id="pengguna-nama"
                            value={nama}
                            maxLength={120}
                            onChange={(e) => setNama(e.target.value)}
                            className="isian w-full"
                        />
                    </KolomPengguna>
                    <KolomPengguna
                        id="pengguna-username"
                        label="Nama pengguna"
                        galat={galatUsername}
                    >
                        {/* Tanpa `autoComplete="off"`, peramban cenderung
                            mengisi nama pengguna admin sendiri ke akun orang
                            lain. Huruf besar otomatis dan koreksi ejaan
                            dimatikan: papan ketik tablet mengubah "kader01". */}
                        <input
                            id="pengguna-username"
                            type="text"
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            maxLength={32}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            aria-invalid={galatUsername !== null}
                            aria-describedby="pengguna-username-ket"
                            className={`isian w-full ${galatUsername !== null ? 'border-tone-red' : ''}`}
                        />
                        {galatUsername === null && (
                            <p
                                id="pengguna-username-ket"
                                className="mt-1.5 text-sm text-muted-foreground"
                            >
                                Dipakai untuk masuk. Contoh: kader01.
                            </p>
                        )}
                    </KolomPengguna>
                    <KolomPengguna id="pengguna-peran" label="Peran">
                        <select
                            id="pengguna-peran"
                            value={peran}
                            disabled={terkunci}
                            onChange={(e) => setPeran(e.target.value as Peran)}
                            className="isian w-full cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {URUTAN_PERAN.map((x) => (
                                <option key={x} value={x}>
                                    {NAMA_PERAN[x]}
                                </option>
                            ))}
                        </select>
                    </KolomPengguna>
                    <KolomPengguna id="pengguna-rt" label="RT binaan">
                        {peran === 'kader' ? (
                            <select
                                id="pengguna-rt"
                                value={rt}
                                onChange={(e) => setRt(e.target.value)}
                                className="isian w-full cursor-pointer font-semibold"
                            >
                                {wilayahRt.map((w) => (
                                    <option key={w} value={w}>
                                        {labelRt(w)}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            /* Bidan dan admin melihat seluruh RW; kalimat ini
                               menjawab pertanyaannya langsung, tanpa kotak
                               pilih mati yang mengundang klik. */
                            <p className="flex h-14 items-center text-base text-muted-foreground">
                                Semua RT
                            </p>
                        )}
                    </KolomPengguna>
                    <KolomPengguna
                        id="pengguna-sandi"
                        label={
                            pengguna === null
                                ? 'Kata sandi awal'
                                : 'Kata sandi baru'
                        }
                        galat={sandiSalah ? galatSandi : null}
                    >
                        {/* `new-password`: pengelola sandi menawarkan sandi
                            baru, bukan mengisikan sandi admin yang tersimpan. */}
                        <input
                            id="pengguna-sandi"
                            type="password"
                            autoComplete="new-password"
                            value={kataSandi}
                            onChange={(e) => setKataSandi(e.target.value)}
                            aria-invalid={sandiSalah}
                            aria-describedby="pengguna-sandi-ket"
                            className={`isian w-full ${sandiSalah ? 'border-tone-red' : ''}`}
                        />
                        {/* Pada akun baru, galatnya sudah mengulang aturan ini. */}
                        {!(pengguna === null && sandiSalah) && (
                            <p
                                id="pengguna-sandi-ket"
                                className="mt-1.5 text-sm text-muted-foreground"
                            >
                                {pengguna === null
                                    ? `Minimal ${SANDI_MINIMAL} karakter.`
                                    : 'Kosongkan jika tidak diganti. Jika diganti, akun ini keluar dari semua perangkat.'}
                            </p>
                        )}
                    </KolomPengguna>
                    {pengguna !== null && (
                        <label className="flex min-h-13 cursor-pointer items-center gap-3 sm:col-span-2">
                            <input
                                type="checkbox"
                                checked={aktif}
                                disabled={terkunci}
                                onChange={(e) => setAktif(e.target.checked)}
                                className="size-5 accent-primary"
                            />
                            <span className="text-base font-semibold">
                                Akun aktif
                            </span>
                        </label>
                    )}
                    {terkunci && (
                        <p className="text-sm text-muted-foreground sm:col-span-2">
                            Admin aktif terakhir tidak bisa diturunkan perannya
                            maupun dinonaktifkan.
                        </p>
                    )}
                    {dicoba && kosong && (
                        <p className="text-sm font-semibold text-tone-red sm:col-span-2">
                            Nama lengkap dan nama pengguna harus diisi.
                        </p>
                    )}
                    {galatServer !== null && (
                        <p
                            role="alert"
                            className="text-sm font-semibold text-tone-red sm:col-span-2"
                        >
                            {galatServer}
                        </p>
                    )}
                </div>
                <KakiDialog>
                    <button
                        type="button"
                        onClick={onTutup}
                        className="tombol-kedua px-5.5"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={menyimpan}
                        className="tombol-utama px-5.5 disabled:cursor-wait disabled:opacity-60"
                    >
                        <Save
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        {menyimpan
                            ? 'Menyimpan…'
                            : pengguna === null
                              ? 'Simpan pengguna'
                              : 'Simpan perubahan'}
                    </button>
                </KakiDialog>
            </form>
        </Dialog>
    );
}

function KolomPengguna({
    id,
    label,
    galat = null,
    children,
}: {
    id: string;
    label: string;
    galat?: string | null;
    children: ReactNode;
}) {
    return (
        <div className="min-w-0">
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-muted-foreground"
            >
                {label}
            </label>
            <div className="mt-1.5">{children}</div>
            {galat !== null && (
                <p className="mt-1.5 text-sm font-semibold text-tone-red">
                    {galat}
                </p>
            )}
        </div>
    );
}
