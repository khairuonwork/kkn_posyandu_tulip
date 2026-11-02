/**
 * Detail anak — docs/10-prd-demo-frontend.md bagian 6.5.
 *
 * Layar yang paling sering membuat client mengangguk: riwayat pertumbuhan satu
 * anak sebagai satu garis.
 *
 * Urutannya sengaja vonis dulu, identitas belakangan. Kader membuka layar ini
 * untuk tahu kondisi anaknya, bukan untuk membaca ulang NIK yang barusan ia
 * klik namanya.
 */

import {
    ArrowRight,
    BarChart3,
    Check,
    ChevronDown,
    CircleCheck,
    CircleHelp,
    CreditCard,
    Info,
    Mars,
    Pencil,
    Printer,
    Save,
    ShieldCheck,
    Sparkles,
    Syringe,
    TriangleAlert,
    Venus,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import BantuanDetail from '@/components/bantuan-detail';
import BarisDefinisi from '@/components/baris-definisi';
import Dialog, { KakiDialog } from '@/components/dialog';
import DialogKirimWa from '@/components/dialog-kirim-wa';
import GrafikPertumbuhan from '@/components/grafik-pertumbuhan';
import Halaman from '@/components/halaman';
import IkonWhatsApp from '@/components/ikon-whatsapp';
import KartuBalita, { LembarCetak } from '@/components/kartu-balita';
import KmsChart from '@/components/kms-chart-sep24';
import PendampinganKia from '@/components/pendampingan-kia';
import StatusGiziBadge, { nadaKategori } from '@/components/status-gizi-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import ZScoreCell from '@/components/z-score-cell';
import {
    angka,
    KOSONG,
    labelIndeks,
    namaTampil,
    nik,
    satuan,
    tanggalPanjang,
    tanggalRingkas,
    umurBulanPada,
    umurPanjang,
    umurRingkas,
    zScore,
} from '@/lib/format';
import { kodeKartuSasaran } from '@/lib/kartu-sasaran';
import { kbmKg, kesimpulanZScore } from '@/lib/kategori';
import { tandaGizi, tentukanKesimpulan } from '@/lib/kesimpulan-gizi';
import { buatTautanLembar } from '@/lib/lembar';
import { Link } from '@/lib/nav';
import { penilaianLayak, terbaruUntuk } from '@/lib/penilaian-utama';
import { kalimatKesimpulan, nomorBaku, susunPesan } from '@/lib/pesan-wa';
import type { DiskusiKiaWa } from '@/lib/pesan-wa';
import type { BarisLms } from '@/lib/z-score';
import type { PatchAnak } from '@/pages/anak/index';
import type {
    Anak,
    GarisSd,
    JenisKelamin,
    PenilaianGizi,
    Pengukuran,
    Periode,
    Peran,
} from '@/types/posyandu';

/** Nomor uji WhatsApp dari client/.env.local; null di lingkungan sebenarnya. */

const ARTI_NTOB: Record<string, string> = {
    N: 'N, naik',
    T: 'T, tidak naik',
    O: 'O, tidak ditimbang bulan lalu',
    B: 'B, baru pertama',
};

/**
 * Sebab baris kosong. Ketidakhadiran bukan berat badan nol (DR-04), dan
 * sebabnya ada di data sejak awal — dulu tidak pernah sampai ke layar.
 */
const ARTI_KEHADIRAN: Record<string, string> = {
    tidak_hadir: 'Tidak hadir',
    pindah: 'Pindah',
    tidak_dapat_diukur: 'Tidak dapat diukur',
};

/** Nada mana yang harus memimpin bila satu anak punya tiga vonis sekaligus. */
const URUT_NADA: Record<string, number> = {
    merah: 0,
    oranye: 1,
    biru: 2,
    hijau: 3,
    netral: 4,
};

const WARNA_NADA: Record<string, string> = {
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

type TabDetail = 'profil' | 'status' | 'kurva' | 'grafik' | 'riwayat';

const TAB_DETAIL: { nilai: TabDetail; label: string }[] = [
    { nilai: 'profil', label: 'Profil Anak' },
    { nilai: 'status', label: 'Status Gizi' },
    { nilai: 'kurva', label: 'Kurva KMS' },
    { nilai: 'grafik', label: 'Grafik Pertumbuhan' },
    { nilai: 'riwayat', label: 'Riwayat Ukur' },
];

type Props = {
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

/**
 * Isi kolom "Berat naik?": status arsip N/T/O/B, dengan batas KBM umurnya di
 * bawah "Tidak naik".
 */
export function StatusNaik({
    ntob,
    umurBulan,
    ikon = true,
}: {
    ntob: string | null;
    umurBulan: number | null;
    ikon?: boolean;
}) {
    const huruf = ntob?.toUpperCase() ?? null;

    if (huruf === 'N') {
        return (
            <span className="inline-flex items-center gap-1.5 font-bold whitespace-nowrap text-tone-green">
                {ikon && (
                    <CircleCheck
                        className="size-4 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                )}
                Naik
            </span>
        );
    }

    if (huruf === 'T') {
        const kbm = kbmKg(umurBulan);

        return (
            <>
                <span className="inline-flex items-center gap-1.5 font-bold whitespace-nowrap text-tone-amber">
                    {ikon && (
                        <TriangleAlert
                            className="size-4 shrink-0"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    )}
                    Tidak naik
                </span>
                {kbm !== null && (
                    <span className="block text-sm font-medium text-muted-foreground">
                        kurang dari {angka(kbm, 2)} kg
                    </span>
                )}
            </>
        );
    }

    return (
        <span className="text-muted-foreground">
            {huruf === 'B'
                ? 'Pertama kali ditimbang'
                : huruf === 'O'
                  ? 'Tidak ditimbang bulan lalu'
                  : KOSONG}
        </span>
    );
}

export default function DetailAnak({
    anak,
    pengukuran,
    garisSd,
    standarLms,
    peran,
    periode,
    ambang,
    wilayahRt,
    noWa,
    lembaga,
    onSimpan,
    sumberLive = false,
    kembaliKe = { href: '/balita', label: 'Data Balita' },
}: Props) {
    const [umurDisorot, setUmurDisorot] = useState<number | null>(null);
    const tombolBantuan = useRef<HTMLButtonElement>(null);
    const [bantuanTerbuka, setBantuanTerbuka] = useState(false);
    const [tabAktif, setTabAktif] = useState<TabDetail>(
        peran === 'kms' ? 'kurva' : 'profil',
    );
    const [dialog, setDialog] = useState<
        'ubah' | 'cetak' | 'wa' | 'nomor-wa' | null
    >(null);
    const [fokusNomorWa, setFokusNomorWa] = useState(false);
    const [infoKiaWa, setInfoKiaWa] = useState<DiskusiKiaWa | null>(null);
    const bolehUbah =
        peran !== 'kms' &&
        onSimpan !== undefined &&
        (peran !== 'kader' ||
            (anak.rt !== null && wilayahRt.includes(anak.rt)));
    const bolehCetak = peran !== 'kader' && peran !== 'kms';
    const terbaru = terbaruUntuk(pengukuran, periode);
    const nama = namaTampil(anak.nama);
    const inisial = nama
        .split(' ')
        .filter((bagian) => bagian.length > 0)
        .map((bagian) => bagian[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    // Umur dihitung terhadap periode yang dilihat, bukan diambil dari
    // pengukuran terakhir. Untuk anak yang dua bulan tidak hadir, umur lama itu
    // salah — dan ia juga yang memilih label PB/U atau TB/U serta kalimat cara
    // ukur, sehingga seluruh halaman bisa memakai protokol yang keliru.
    const umur = umurBulanPada(anak.tglLahir, periode.tanggalKegiatan);

    const hasilTerakhir = pengukuran.find(
        (p) => p.statusKehadiran === 'hadir' && p.tanggalUkur !== null,
    );
    const indeksTidakWajar =
        terbaru === null
            ? []
            : (['BB_TB', 'BB_U', 'TB_U'] as const).filter(
                  (namaIndeks) => terbaru.penilaian[namaIndeks]?.tidakWajar,
              );

    const indeks =
        terbaru === null
            ? []
            : [
                  {
                      label: labelIndeks('BB_TB', umur),
                      nilai: penilaianLayak(terbaru.penilaian.BB_TB),
                  },
                  {
                      label: 'BB/U',
                      nilai: penilaianLayak(terbaru.penilaian.BB_U),
                  },
                  {
                      label: labelIndeks('TB_U', umur),
                      nilai: penilaianLayak(terbaru.penilaian.TB_U),
                  },
              ];

    // Vonis terberat memimpin. Array.sort stabil, jadi saat semuanya sama
    // beratnya urutan aslinya bertahan dan BB/TB tetap di depan.
    const terurut = [...indeks].sort(
        (a, b) =>
            URUT_NADA[nadaKategori(a.nilai?.kategori ?? null)] -
            URUT_NADA[nadaKategori(b.nilai?.kategori ?? null)],
    );

    // Aturan yang sama dipakai pesan WhatsApp dan Lembar Hasil.
    const penilaianUtama = terbaru?.penilaian ?? {};
    const { perluRujukan, perluWaspada, perluTindakLanjut } = tandaGizi(
        penilaianUtama,
        ambang,
    );
    const kesimpulanWa = tentukanKesimpulan(penilaianUtama, ambang);
    // Anjuran yang sama dikirim lewat WhatsApp (lib/pesan-wa.ts).
    const edukasiKms =
        indeksTidakWajar.length > 0 ||
        indeks.every((i) => i.nilai === undefined)
            ? 'Data pengukuran ini perlu diperiksa atau diukur ulang bersama kader atau petugas kesehatan sebelum status gizi disimpulkan.'
            : kalimatKesimpulan(kesimpulanWa, nama).anjuran;

    const nomorTujuan = nomorBaku(noWa);
    const mulaiKirimWa = () =>
        setDialog(nomorTujuan === null ? 'nomor-wa' : 'wa');

    const umurTerbaru = terbaru?.umurBulan ?? null;
    const duaBulanLalu =
        umurTerbaru === null
            ? undefined
            : pengukuran.find(
                  (p) =>
                      p.statusKehadiran === 'hadir' &&
                      p.umurBulan === umurTerbaru - 2,
              );

    const alasanTanpaDataWa =
        terbaru === null
            ? `Belum ada hasil pengukuran pada ${periode.label}, sehingga tidak ada yang dapat dikirim.${
                  hasilTerakhir === undefined
                      ? ''
                      : ` Pengukuran terakhir tercatat ${tanggalPanjang(hasilTerakhir.tanggalUkur)}; lihat tab Riwayat Ukur, lalu pilih periode bulan itu di kiri atas.`
              }`
            : indeksTidakWajar.length > 0
              ? 'Hasil periode ini ditandai tidak wajar. Verifikasi ulang sebelum dikirim ke orang tua.'
              : null;

    // Tombol kirim tidak dirender bila tak ada yang dapat dikirim; sebabnya
    // ditulis sebagai satu baris di bawah judul (docs/prd/feedback/F03).
    const alasanTanpaWa = alasanTanpaDataWa;

    // Titik kurva hanya dari pengukuran yang punya umur dan berat sekaligus.
    const riwayatKurva = pengukuran
        .filter(
            (p): p is Pengukuran & { umurBulan: number; bbKg: number } =>
                p.umurBulan !== null &&
                p.umurBulan >= 0 &&
                p.umurBulan <= 60 &&
                p.bbKg !== null &&
                p.bbKg > 0 &&
                !p.penilaian.BB_U?.tidakWajar,
        )
        .map((p) => [p.umurBulan, p.bbKg] as [number, number])
        .sort((a, b) => a[0] - b[0]);

    const titikPerluVerifikasi = pengukuran.filter(
        (p) => p.bbKg !== null && p.penilaian.BB_U?.tidakWajar,
    ).length;

    /**
     * Selisih yang tidak masuk akal secara biologis terhadap bulan sebelumnya.
     *
     * `tidakWajar` hanya menangkap nilai di luar rentang mutlak — 2 baris dari
     * 633. Tinggi yang turun 11,5 cm lolos bersih karena kedua angkanya
     * sendiri-sendiri masih wajar. Yang salah adalah selisihnya.
     */
    const janggal = (urutan: number): string | null => {
        const kini = pengukuran[urutan];
        const lalu = pengukuran[urutan + 1];

        if (lalu === undefined) {
            return null;
        }

        if (
            kini.tinggiCm !== null &&
            lalu.tinggiCm !== null &&
            lalu.tinggiCm - kini.tinggiCm > ambang.tinggiBerkurangMax
        ) {
            return `Tinggi berkurang ${satuan(lalu.tinggiCm - kini.tinggiCm, 'cm')} dari bulan sebelumnya`;
        }

        if (kini.bbKg !== null && lalu.bbKg !== null) {
            const selisih = kini.bbKg - lalu.bbKg;

            if (selisih > ambang.naikMax) {
                return `Berat naik ${satuan(selisih, 'kg', 2)} dalam sebulan`;
            }

            if (-selisih > ambang.turunMax) {
                return `Berat turun ${satuan(-selisih, 'kg', 2)} dalam sebulan`;
            }
        }

        return null;
    };

    return (
        <Halaman
            judul={nama}
            kembali={kembaliKe}
            subjudul={
                <span className="detail-identitas">
                    <span>
                        {anak.jk === 'L'
                            ? 'Laki-laki'
                            : anak.jk === 'P'
                              ? 'Perempuan'
                              : 'Jenis kelamin belum tercatat'}
                    </span>
                    <span title={'Usia pada ' + periode.label}>
                        {umur !== null
                            ? umurPanjang(umur)
                            : 'Usia belum tercatat'}
                    </span>
                    <span>
                        {anak.rt !== null
                            ? 'RT ' + anak.rt.padStart(2, '0')
                            : 'RT belum tercatat'}
                    </span>
                </span>
            }
            aksi={
                <>
                    <button
                        type="button"
                        className="tombol-kedua"
                        aria-expanded={bantuanTerbuka}
                        aria-controls="bantuan-detail"
                        ref={tombolBantuan}
                        onClick={() => setBantuanTerbuka((v) => !v)}
                    >
                        <CircleHelp className="size-4" aria-hidden="true" />
                        Bantuan
                    </button>
                    {bolehCetak && (
                        <button
                            type="button"
                            onClick={() => setDialog('cetak')}
                            className="tombol-kedua"
                        >
                            <CreditCard
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Cetak kartu
                        </button>
                    )}
                    {bolehUbah && (
                        <button
                            type="button"
                            onClick={() => {
                                setFokusNomorWa(false);
                                setDialog('ubah');
                            }}
                            className="tombol-kedua"
                        >
                            <Pencil
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Ubah data balita
                        </button>
                    )}
                    {peran !== 'kms' && alasanTanpaWa === null && (
                        <button
                            type="button"
                            onClick={mulaiKirimWa}
                            className="tombol-utama"
                        >
                            <IkonWhatsApp className="size-5" />
                            Kirim ke WhatsApp
                        </button>
                    )}
                </>
            }
        >
            {alasanTanpaWa !== null && (
                <p
                    role="status"
                    className="mb-5 flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                    <Info
                        className="mt-0.5 size-4 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    {alasanTanpaWa}
                </p>
            )}

            {/* Kategori ditata sebagai tab lembar kerja: satu kelompok data
                tampil pada satu waktu, tetapi semua bagian tetap dapat dicapai
                dalam satu langkah. */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div
                    className="bilah-tab flex-wrap gap-1.5"
                    role="tablist"
                    aria-label="Kategori detail anak"
                >
                    {TAB_DETAIL.map((tab) => {
                        const aktif = tabAktif === tab.nilai;

                        return (
                            <button
                                key={tab.nilai}
                                id={`tab-${tab.nilai}`}
                                type="button"
                                role="tab"
                                aria-selected={aktif}
                                aria-controls={`panel-${tab.nilai}`}
                                onClick={() => setTabAktif(tab.nilai)}
                                className="tab inline-flex items-center gap-2"
                            >
                                {tab.label}
                                {tab.nilai === 'riwayat' && (
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-extrabold tabular-nums ${
                                            aktif
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-surface-alt text-muted-foreground'
                                        }`}
                                    >
                                        {pengukuran.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div
                className={
                    bantuanTerbuka
                        ? 'detail-area bantuan-terbuka'
                        : 'detail-area'
                }
            >
                <div className="detail-utama">
                    {' '}
                    {/* Identitas memimpin halaman, seperti artboard Detail: satu
                petak fakta registri yang dipisahkan garis tebal dari vonis di
                bawahnya. Petak foto artboard tidak ikut — tidak ada satu pun
                anak yang punya potret di arsip, dan kotak kosong bertuliskan
                "Foto anak" pada 101 halaman adalah janji yang tidak ditepati. */}
                    <section
                        id="panel-profil"
                        role="tabpanel"
                        aria-labelledby="tab-profil"
                        hidden={tabAktif !== 'profil'}
                        className="kartu mb-7 overflow-hidden p-0"
                    >
                        <div className="flex flex-wrap items-center gap-4 bg-primary px-5 py-4 text-primary-foreground sm:px-6">
                            <div
                                aria-hidden="true"
                                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-card text-xl font-extrabold text-primary"
                            >
                                {inisial || '—'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl font-extrabold break-words">
                                    {nama}
                                </h2>
                                <p className="mt-1 text-sm text-primary-foreground/85">
                                    <span className="detail-identitas">
                                        <span>
                                            {anak.jk === 'L'
                                                ? 'Laki-laki'
                                                : anak.jk === 'P'
                                                  ? 'Perempuan'
                                                  : 'Jenis kelamin belum tercatat'}
                                        </span>
                                        <span
                                            title={'Usia pada ' + periode.label}
                                        >
                                            {umur !== null
                                                ? umurPanjang(umur)
                                                : 'Usia belum tercatat'}
                                        </span>
                                        <span>
                                            {anak.rt !== null
                                                ? 'RT ' +
                                                  anak.rt.padStart(2, '0')
                                                : 'RT belum tercatat'}
                                        </span>
                                    </span>
                                </p>
                            </div>
                            {terbaru !== null && (
                                <div className="profil-hasil rounded-xl bg-card px-4 py-3 text-foreground">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Pengukuran terakhir ·{' '}
                                        {tanggalRingkas(terbaru.tanggalUkur)}
                                    </p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                                        <span className="text-sm tabular-nums">
                                            <span className="text-muted-foreground">
                                                BB{' '}
                                            </span>
                                            <strong>
                                                {satuan(terbaru.bbKg, 'kg', 1)}
                                            </strong>
                                        </span>
                                        <span className="text-sm tabular-nums">
                                            <span className="text-muted-foreground">
                                                {umur !== null && umur < 24
                                                    ? 'PB'
                                                    : 'TB'}{' '}
                                            </span>
                                            <strong>
                                                {satuan(
                                                    terbaru.tinggiCm,
                                                    'cm',
                                                    1,
                                                )}
                                            </strong>
                                        </span>
                                        {terbaru.penilaian.BB_TB?.kategori && (
                                            <StatusGiziBadge
                                                kategori={
                                                    terbaru.penilaian.BB_TB
                                                        .kategori
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-5 sm:p-6">
                            <dl className="grid gap-x-10 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                                <BarisDefinisi label="Tanggal lahir">
                                    {tanggalPanjang(anak.tglLahir)}
                                </BarisDefinisi>
                                <BarisDefinisi label="NIK">
                                    {nik(anak.nik)}
                                    {!anak.nikLengkap && (
                                        <span className="block text-sm font-semibold text-tone-amber">
                                            NIK belum lengkap
                                        </span>
                                    )}
                                </BarisDefinisi>
                                <BarisDefinisi label="Berat lahir">
                                    <span>
                                        {satuan(anak.bbLahirKg, 'kg', 2)}
                                    </span>
                                    {anak.bbLahirKg !== null && (
                                        <span
                                            className={`ml-2 inline-flex rounded px-2 py-0.5 text-xs font-extrabold ${
                                                anak.bbLahirKg < 2.5
                                                    ? 'bg-tone-amber-bg text-tone-amber'
                                                    : 'bg-tone-green-bg text-tone-green'
                                            }`}
                                        >
                                            {anak.bbLahirKg < 2.5
                                                ? 'BBLR'
                                                : 'Normal'}
                                        </span>
                                    )}
                                    {anak.bbLahirMeragukan && (
                                        <span className="block text-sm text-tone-amber">
                                            Angka di arsip meragukan
                                        </span>
                                    )}
                                </BarisDefinisi>
                                <BarisDefinisi label="Nama ibu">
                                    {anak.namaOrtu ?? KOSONG}
                                </BarisDefinisi>
                                <BarisDefinisi label="Kelompok Desil">
                                    {anak.desil == null
                                        ? 'Belum tercatat'
                                        : `Desil ${anak.desil} · ${anak.desil <= 4 ? 'Keluarga Miskin (Gakin)' : 'Non-Gakin'}`}
                                </BarisDefinisi>
                                <BarisDefinisi label="Status KB Ibu">
                                    {anak.kbIbu == null
                                        ? 'Belum tercatat'
                                        : anak.kbIbu
                                          ? 'Ya (Peserta KB Aktif)'
                                          : 'Tidak'}
                                </BarisDefinisi>
                                <BarisDefinisi label="Alamat & urutan">
                                    {anak.rt === null
                                        ? KOSONG
                                        : `RT ${anak.rt.padStart(2, '0')}`}
                                    {anak.anakKe !== null &&
                                        `, anak ke-${anak.anakKe}`}
                                </BarisDefinisi>
                                <BarisDefinisi label="WhatsApp ortu">
                                    {(noWa ?? '').trim() !== ''
                                        ? noWa
                                        : 'Belum diisi'}
                                </BarisDefinisi>
                                <BarisDefinisi label="Kode kartu QR">
                                    <span className="font-mono text-sm font-extrabold text-primary">
                                        {kodeKartuSasaran(anak)}
                                    </span>
                                </BarisDefinisi>
                            </dl>

                            <div className="mt-6 border-t border-border pt-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-base font-extrabold">
                                        Cek Kelengkapan Saat Pendaftaran (Meja
                                        1)
                                    </h3>
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        Muncul otomatis saat Kartu QR Balita
                                        dipindai
                                    </span>
                                </div>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div
                                        className={`flex items-start justify-between gap-3 rounded-lg border p-4 ${
                                            anak.bukuKia
                                                ? 'border-primary/25 bg-accent/55'
                                                : 'border-tone-amber/30 bg-tone-amber-bg/50'
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <ShieldCheck
                                                className={`mt-0.5 size-5 shrink-0 ${
                                                    anak.bukuKia
                                                        ? 'text-tone-green'
                                                        : 'text-tone-amber'
                                                }`}
                                                strokeWidth={2.5}
                                                aria-hidden="true"
                                            />
                                            <div>
                                                <p className="font-extrabold text-foreground">
                                                    Kepemilikan Buku KIA
                                                </p>
                                                <p className="mt-0.5 text-sm text-muted-foreground">
                                                    {anak.bukuKia
                                                        ? 'Buku KIA sudah dimiliki dan tercatat pada data sasaran.'
                                                        : 'Belum tercatat. Tanyakan apakah ibu membawa Buku KIA.'}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-extrabold ${
                                                anak.bukuKia
                                                    ? 'bg-tone-green-bg text-tone-green'
                                                    : 'bg-tone-amber-bg text-tone-amber'
                                            }`}
                                        >
                                            {anak.bukuKia ? (
                                                <span className="inline-flex items-center gap-1">
                                                    <CircleCheck
                                                        className="size-3.5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>Sudah punya</span>
                                                </span>
                                            ) : (
                                                'Perlu dicek'
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-start justify-between gap-3 rounded-lg border border-tone-amber/30 bg-tone-amber-bg/50 p-4">
                                        <div className="flex gap-3">
                                            <Syringe
                                                className="mt-0.5 size-5 shrink-0 text-tone-amber"
                                                strokeWidth={2.5}
                                                aria-hidden="true"
                                            />
                                            <div>
                                                <p className="font-extrabold text-foreground">
                                                    Status Imunisasi Dasar
                                                </p>
                                                <p className="mt-0.5 text-sm text-muted-foreground">
                                                    Belum dipastikan dari arsip
                                                    ini. Tanyakan dan lengkapi
                                                    saat daftar.
                                                </p>
                                            </div>
                                        </div>
                                        <span className="shrink-0 rounded-md bg-tone-amber-bg px-2.5 py-1 text-xs font-extrabold text-tone-amber">
                                            Tanyakan saat daftar
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Langkah berikutnya: lihat status gizi atau
                                    kurva KMS.
                                </p>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setTabAktif('kurva')}
                                        className="tombol-kedua"
                                    >
                                        Lihat Kurva KMS
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTabAktif('status')}
                                        className="tombol-utama"
                                    >
                                        Lihat Status Gizi &amp; Buku KIA
                                        <ArrowRight
                                            className="size-4.5"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                    <>
                        {tabAktif === 'status' && terbaru === null && (
                            <section
                                id="panel-status"
                                role="tabpanel"
                                aria-labelledby="tab-status"
                                className="kartu px-6 py-6"
                            >
                                <h2 className="text-xl font-extrabold">
                                    Belum ada penilaian untuk {periode.label}
                                </h2>
                                <p className="mt-2 max-w-[72ch] text-base text-muted-foreground">
                                    Pengukuran dari periode lain tidak dipakai
                                    sebagai status bulan ini.
                                    {hasilTerakhir !== undefined &&
                                        ` Riwayat terakhir tercatat ${tanggalPanjang(hasilTerakhir.tanggalUkur)}; lihat Kurva KMS atau Riwayat Ukur untuk konteksnya.`}
                                </p>
                            </section>
                        )}

                        {terbaru !== null && (
                            <section
                                id="panel-status"
                                role="tabpanel"
                                aria-labelledby="tab-status"
                                hidden={tabAktif !== 'status'}
                                className="kartu p-6"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <h2 className="text-xl font-extrabold">
                                                Status pengukuran{' '}
                                                {tanggalPanjang(
                                                    terbaru.tanggalUkur,
                                                )}
                                            </h2>
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-extrabold ${
                                                    perluRujukan
                                                        ? 'bg-tone-red-bg text-tone-red'
                                                        : perluTindakLanjut
                                                          ? 'bg-tone-amber-bg text-tone-amber'
                                                          : 'bg-tone-green-bg text-tone-green'
                                                }`}
                                            >
                                                {perluRujukan ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <TriangleAlert
                                                            className="size-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            Perlu Rujukan
                                                            Puskesmas
                                                        </span>
                                                    </span>
                                                ) : perluTindakLanjut ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <TriangleAlert
                                                            className="size-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            Perlu Tindak Lanjut
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1">
                                                        <CircleCheck
                                                            className="size-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            Pertumbuhan Sesuai
                                                            Standar
                                                        </span>
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                                            Usia saat ukur:{' '}
                                            <strong className="font-bold text-foreground">
                                                {umurPanjang(
                                                    terbaru.umurBulan ?? umur,
                                                )}
                                            </strong>
                                            {terbaru.umurBulan !== null &&
                                                ` (${terbaru.umurBulan} bulan)`}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-subtle px-3.5 py-2 text-sm">
                                        {terbaru.bbKg !== null && (
                                            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 font-bold text-foreground">
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    Berat:
                                                </span>
                                                <span className="tabular-nums">
                                                    {satuan(terbaru.bbKg, 'kg')}
                                                </span>
                                            </span>
                                        )}
                                        {terbaru.tinggiCm !== null && (
                                            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 font-bold text-foreground">
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    {umur !== null && umur < 24
                                                        ? 'Panjang:'
                                                        : 'Tinggi:'}
                                                </span>
                                                <span className="tabular-nums">
                                                    {satuan(
                                                        terbaru.tinggiCm,
                                                        'cm',
                                                    )}
                                                </span>
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-sm">
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                KMS:
                                            </span>
                                            <StatusNaik
                                                ntob={terbaru.ntob}
                                                umurBulan={terbaru.umurBulan}
                                            />
                                        </span>
                                    </div>
                                </div>

                                {/* Tiga kartu indeks berdampingan, susunan artboard.
                            Yang terberat tetap di depan: urutannya dihitung
                            dari nadanya, bukan dari urutan tulis — supaya mata
                            jatuh lebih dulu pada vonis yang menentukan. */}
                                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {terurut.map((i) => (
                                        <KartuIndeks
                                            key={i.label}
                                            label={i.label}
                                            nilai={i.nilai}
                                        />
                                    ))}
                                </div>

                                {indeksTidakWajar.length > 0 && (
                                    <p className="mt-4 rounded-xl bg-tone-amber-bg p-4 text-sm font-semibold text-tone-amber">
                                        {indeksTidakWajar.join(', ')} ditandai
                                        tidak wajar dalam arsip dan tidak
                                        dipakai untuk penilaian. Periksa ulang
                                        hasil ukur sebelum memberi arahan.
                                    </p>
                                )}

                                <div
                                    className={`mt-5 rounded-xl border p-5 ${
                                        perluRujukan
                                            ? 'border-tone-red/35 bg-tone-red-bg text-tone-red'
                                            : perluTindakLanjut
                                              ? 'border-tone-amber/35 bg-tone-amber-bg/70 text-foreground'
                                              : 'border-primary/25 bg-accent/55 text-foreground'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="max-w-[74ch]">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {perluRujukan ||
                                                perluTindakLanjut ? (
                                                    <TriangleAlert
                                                        className={`size-5 shrink-0 ${
                                                            perluRujukan
                                                                ? 'text-tone-red'
                                                                : 'text-tone-amber'
                                                        }`}
                                                        strokeWidth={2.5}
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <CircleCheck
                                                        className="size-5 shrink-0 text-tone-green"
                                                        strokeWidth={2.5}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                <h3 className="text-base font-extrabold">
                                                    Diskusikan hasil gizi dengan
                                                    keluarga
                                                </h3>
                                                <span className="rounded-md bg-card/85 px-2.5 py-0.5 text-xs font-extrabold text-foreground">
                                                    {indeksTidakWajar.length > 0
                                                        ? 'Perlu verifikasi ulang'
                                                        : indeks.every(
                                                                (i) =>
                                                                    i.nilai ===
                                                                    undefined,
                                                            )
                                                          ? 'Belum dapat dinilai'
                                                          : perluTindakLanjut
                                                            ? 'Perlu tindak lanjut bulan ini'
                                                            : 'Lanjutkan pemantauan bulanan'}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-base font-medium text-pretty">
                                                {edukasiKms}
                                            </p>
                                            {perluRujukan && (
                                                <p className="mt-2 text-sm font-semibold">
                                                    Ambang kerja rujukan:
                                                    z-score ≤{' '}
                                                    {zScore(
                                                        ambang.ambangRujukan,
                                                    )}{' '}
                                                    SD. Perlu pengesahan
                                                    Puskesmas sebelum digunakan
                                                    sebagai aturan produksi.
                                                </p>
                                            )}
                                            {perluWaspada && !perluRujukan && (
                                                <p className="mt-2 text-sm font-semibold">
                                                    Zona waspada dimulai pada
                                                    z-score ≤{' '}
                                                    {zScore(
                                                        ambang.ambangWaspada,
                                                    )}{' '}
                                                    SD.
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setTabAktif('kurva')}
                                            className="tombol-kedua shrink-0 bg-card"
                                        >
                                            Lihat Kurva KMS
                                            <ArrowRight
                                                className="size-4"
                                                strokeWidth={2.5}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-3 text-xs text-muted-foreground">
                                    <p>
                                        Acuan standar pertumbuhan WHO 2006
                                        (parameter LMS, Permenkes No. 2 Tahun
                                        2020). Indeks BB/PB untuk usia &lt; 24
                                        bulan, BB/TB untuk ≥ 24 bulan.
                                    </p>
                                    {terbaru.catatanUkur?.jenisUkur !==
                                        undefined && (
                                        <p className="font-semibold">
                                            Cara ukur{' '}
                                            {terbaru.catatanUkur.jenisUkur}:{' '}
                                            {umur !== null && umur < 24
                                                ? 'panjang badan, telentang'
                                                : 'tinggi badan, berdiri'}
                                        </p>
                                    )}
                                </div>
                            </section>
                        )}

                        {tabAktif === 'status' && (
                            <PendampinganKia
                                key={anak.id}
                                anakId={anak.id}
                                sumberLive={sumberLive ?? false}
                                alasanTanpaWa={
                                    peran === 'kms'
                                        ? undefined
                                        : alasanTanpaDataWa
                                }
                                onInfoKiaChange={setInfoKiaWa}
                                onKirimWa={
                                    peran === 'kms'
                                        ? undefined
                                        : (info) => {
                                              setInfoKiaWa(info);
                                              mulaiKirimWa();
                                          }
                                }
                            />
                        )}

                        {/* Kurva dan riwayat adalah cerita yang sama, jadi jaraknya
                        lebih rapat satu sama lain daripada ke bagian lain. */}
                        <section
                            id="panel-kurva"
                            role="tabpanel"
                            aria-labelledby="tab-kurva"
                            hidden={tabAktif !== 'kurva'}
                        >
                            {riwayatKurva.length === 0 ? (
                                <p className="mt-2 text-base text-muted-foreground">
                                    Belum ada pengukuran berat yang dapat
                                    digambarkan.
                                </p>
                            ) : (
                                anak.jk !== null && (
                                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-subtle px-5 py-4">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <h2 className="text-xl font-extrabold">
                                                        Kartu Menuju Sehat (KMS)
                                                    </h2>
                                                    <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-extrabold text-primary">
                                                        Lembar KMS{' '}
                                                        {anak.jk === 'P'
                                                            ? 'Perempuan'
                                                            : 'Laki-laki'}{' '}
                                                        · WHO 2006
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                                                    Grafik berat badan menurut
                                                    umur (0–60 bulan) sesuai
                                                    Buku KIA ·{' '}
                                                    <strong className="font-bold text-foreground">
                                                        {nama} (
                                                        {umurPanjang(umur)})
                                                    </strong>
                                                </p>
                                            </div>
                                            {hasilTerakhir !== undefined && (
                                                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm shadow-2xs">
                                                    <span className="font-semibold text-muted-foreground">
                                                        Ukur terakhir (
                                                        {tanggalRingkas(
                                                            hasilTerakhir.tanggalUkur,
                                                        )}
                                                        ):
                                                    </span>
                                                    {hasilTerakhir.bbKg !==
                                                        null && (
                                                        <span className="rounded-md bg-surface-subtle px-2 py-0.5 font-extrabold text-foreground tabular-nums">
                                                            BB{' '}
                                                            {satuan(
                                                                hasilTerakhir.bbKg,
                                                                'kg',
                                                            )}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-subtle px-2 py-0.5">
                                                        <StatusNaik
                                                            ntob={
                                                                hasilTerakhir.ntob
                                                            }
                                                            umurBulan={
                                                                hasilTerakhir.umurBulan
                                                            }
                                                        />
                                                    </span>
                                                    {kbmKg(
                                                        hasilTerakhir.umurBulan,
                                                    ) !== null && (
                                                        <span className="rounded-md border border-border px-2 py-0.5 text-xs font-bold text-muted-foreground">
                                                            Syarat KBM ≥{' '}
                                                            {angka(
                                                                (kbmKg(
                                                                    hasilTerakhir.umurBulan,
                                                                ) ?? 0) * 1000,
                                                                0,
                                                            )}{' '}
                                                            gram
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-5 py-4">
                                            {(terbaru === null ||
                                                (umur !== null && umur > 60) ||
                                                titikPerluVerifikasi > 0) && (
                                                <p className="mb-3 rounded-lg bg-surface-subtle px-3.5 py-2 text-sm font-medium text-muted-foreground">
                                                    {terbaru === null &&
                                                        `Kurva ini menampilkan riwayat; belum ada pengukuran pada ${periode.label}.`}
                                                    {umur !== null &&
                                                        umur > 60 &&
                                                        ' Kurva BB/U WHO 2006 ini hanya mencakup usia 0–60 bulan.'}
                                                    {titikPerluVerifikasi > 0 &&
                                                        ` ${titikPerluVerifikasi} titik BB/U yang ditandai tidak wajar disisihkan dari gambar dan tetap tersimpan di Riwayat Ukur.`}
                                                </p>
                                            )}
                                            <KmsChart
                                                kelamin={anak.jk}
                                                riwayat={riwayatKurva}
                                                garisSd={garisSd}
                                                umurDisorot={umurDisorot}
                                                detail={pengukuran
                                                    .filter(
                                                        (
                                                            p,
                                                        ): p is Pengukuran & {
                                                            umurBulan: number;
                                                            bbKg: number;
                                                        } =>
                                                            p.umurBulan !==
                                                                null &&
                                                            p.umurBulan >= 0 &&
                                                            p.umurBulan <= 60 &&
                                                            p.bbKg !== null &&
                                                            p.bbKg > 0 &&
                                                            !p.penilaian.BB_U
                                                                ?.tidakWajar,
                                                    )
                                                    .map((p) => ({
                                                        umurBulan: p.umurBulan,
                                                        beratKg: p.bbKg,
                                                        tanggal: p.tanggalUkur,
                                                        z:
                                                            p.penilaian.BB_U
                                                                ?.z ?? null,
                                                        kategori:
                                                            p.penilaian.BB_U
                                                                ?.kategori ??
                                                            null,
                                                    }))}
                                            />
                                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    Ingin memeriksa kurva tinggi
                                                    badan (PB/U), proporsi
                                                    (BB/PB), atau tabel riwayat
                                                    lengkap?
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setTabAktif(
                                                                'grafik',
                                                            )
                                                        }
                                                        className="tombol-kedua"
                                                    >
                                                        Lihat Grafik Pertumbuhan
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setTabAktif(
                                                                'riwayat',
                                                            )
                                                        }
                                                        className="tombol-utama"
                                                    >
                                                        Lihat Tabel Riwayat Ukur
                                                        <ArrowRight
                                                            className="size-4.5"
                                                            strokeWidth={2.5}
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </section>

                        <section
                            id="panel-grafik"
                            role="tabpanel"
                            aria-labelledby="tab-grafik"
                            hidden={tabAktif !== 'grafik'}
                        >
                            {anak.jk === null ? (
                                <p className="mt-2 text-base text-muted-foreground">
                                    Jenis kelamin belum tercatat, sehingga
                                    grafik belum dapat digambarkan. Lengkapi
                                    lewat Ubah data.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    <GrafikPertumbuhan
                                        kelamin={anak.jk}
                                        nama={nama}
                                        umurBalita={umur}
                                        keterangan={
                                            terbaru === null
                                                ? `Grafik ini hanya menampilkan riwayat; belum ada pengukuran pada ${periode.label}.`
                                                : `Hasil ${periode.label} tersedia pada tab Status Gizi.`
                                        }
                                        pengukuran={pengukuran}
                                        standar={standarLms}
                                    />
                                    {/* Strip Navigasi Langkah Berikutnya untuk Kader */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:px-6">
                                        <div className="flex items-center gap-2.5">
                                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                9
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">
                                                    Langkah berikutnya: lihat
                                                    riwayat ukur
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Bandingkan hasil ukur dari
                                                    kunjungan sebelumnya.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTabAktif('kurva')
                                                }
                                                className="tombol-kedua text-sm"
                                            >
                                                ← Kembali ke Kurva KMS
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTabAktif('riwayat')
                                                }
                                                className="tombol-utama text-sm"
                                            >
                                                Buka Riwayat Pengukuran
                                                <ArrowRight
                                                    className="size-4"
                                                    strokeWidth={2.5}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        <section
                            id="panel-riwayat"
                            role="tabpanel"
                            aria-labelledby="tab-riwayat"
                            hidden={tabAktif !== 'riwayat'}
                        >
                            <div className="space-y-4">
                                <div className="kartu overflow-hidden">
                                    {/* Strip Kepala Informatif */}
                                    <div className="strip-kepala flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-md bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                                                    Rekap Bulanan
                                                </span>
                                                <span className="rounded-md bg-surface-subtle px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                                                    Buku KIA Kemenkes
                                                </span>
                                            </div>
                                            <h2 className="mt-1 text-xl font-extrabold text-foreground">
                                                Riwayat Penimbangan &amp;
                                                Antropometri
                                            </h2>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                Arsip lengkap hasil pengukuran
                                                bulanan · Klik tanggal untuk
                                                menyorot titik pada Kurva KMS
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-foreground">
                                                <BarChart3
                                                    className="size-3.5 text-primary"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {pengukuran.length} Kali
                                                    Pengukuran Tercatat
                                                </span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Banner Panduan Ibu Kader */}

                                    <div className="riwayat-wadah p-5 sm:p-6">
                                        <Table
                                            containerClassName="riwayat-gulir"
                                            className="riwayat-tabel"
                                        >
                                            <TableHeader>
                                                <TableRow className="border-b border-border bg-surface-subtle/50">
                                                    <TableHead
                                                        scope="col"
                                                        className="font-bold"
                                                    >
                                                        Tanggal &amp; Periode
                                                    </TableHead>
                                                    <TableHead
                                                        scope="col"
                                                        className="hidden font-bold lg:table-cell"
                                                    >
                                                        Umur
                                                    </TableHead>
                                                    <TableHead
                                                        scope="col"
                                                        className="font-bold"
                                                    >
                                                        Berat (kg)
                                                    </TableHead>
                                                    <TableHead
                                                        scope="col"
                                                        className="font-bold"
                                                    >
                                                        PB / TB (cm)
                                                    </TableHead>
                                                    <TableHead
                                                        scope="col"
                                                        className="font-bold"
                                                    >
                                                        <span>BB/U</span>
                                                        <span className="block text-[10px] font-normal text-muted-foreground">
                                                            Berat/Umur
                                                        </span>
                                                    </TableHead>
                                                    <TableHead
                                                        scope="col"
                                                        className="font-bold"
                                                    >
                                                        <span>
                                                            {labelIndeks(
                                                                'BB_TB',
                                                                umur,
                                                            )}
                                                        </span>
                                                        <span className="block text-[10px] font-normal text-muted-foreground">
                                                            Gizi/Wasting
                                                        </span>
                                                    </TableHead>
                                                    <TableHead
                                                        scope="col"
                                                        className="font-bold"
                                                    >
                                                        <span>
                                                            {labelIndeks(
                                                                'TB_U',
                                                                umur,
                                                            )}
                                                        </span>
                                                        <span className="block text-[10px] font-normal text-muted-foreground">
                                                            Stunting
                                                        </span>
                                                    </TableHead>
                                                    <TableHead
                                                        scope="col"
                                                        className="hidden font-bold md:table-cell"
                                                    >
                                                        <span>Pertumbuhan</span>
                                                        <span className="block text-[10px] font-normal text-muted-foreground">
                                                            Buku KIA (N/T)
                                                        </span>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pengukuran.map((p, urutan) => {
                                                    const sebab =
                                                        p.statusKehadiran ===
                                                        'hadir'
                                                            ? null
                                                            : (ARTI_KEHADIRAN[
                                                                  p
                                                                      .statusKehadiran
                                                              ] ?? null);
                                                    const peringatan =
                                                        janggal(urutan);
                                                    const disorot =
                                                        p.umurBulan ===
                                                        umurDisorot;
                                                    const isTerbaru =
                                                        urutan === 0;

                                                    return (
                                                        <TableRow
                                                            key={p.periodeId}
                                                            aria-current={
                                                                disorot
                                                                    ? 'true'
                                                                    : undefined
                                                            }
                                                            className={`transition-colors ${
                                                                disorot
                                                                    ? 'bg-primary/10 font-medium ring-1 ring-primary/30 ring-inset'
                                                                    : isTerbaru
                                                                      ? 'bg-emerald-50/40'
                                                                      : 'hover:bg-surface-subtle'
                                                            }`}
                                                        >
                                                            <TableCell className="py-2.5">
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setUmurDisorot(
                                                                                p.umurBulan,
                                                                            )
                                                                        }
                                                                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold transition-all ${
                                                                            disorot
                                                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                                                : 'text-primary underline underline-offset-2 hover:bg-primary/10'
                                                                        }`}
                                                                    >
                                                                        <span>
                                                                            {tanggalRingkas(
                                                                                p.tanggalUkur,
                                                                            )}
                                                                        </span>
                                                                    </button>
                                                                    {isTerbaru && (
                                                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                                                            Terbaru
                                                                        </span>
                                                                    )}
                                                                    {disorot &&
                                                                        !isTerbaru && (
                                                                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                                                                                <Sparkles
                                                                                    className="size-3 shrink-0"
                                                                                    aria-hidden="true"
                                                                                />
                                                                                <span>
                                                                                    Disorot
                                                                                </span>
                                                                            </span>
                                                                        )}
                                                                </div>
                                                                {sebab !==
                                                                    null && (
                                                                    <span className="block px-2.5 pt-1 text-xs text-muted-foreground">
                                                                        {sebab}
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="hidden text-sm font-semibold whitespace-nowrap lg:table-cell">
                                                                {umurRingkas(
                                                                    p.umurBulan,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-sm font-extrabold whitespace-nowrap text-foreground">
                                                                {satuan(
                                                                    p.bbKg,
                                                                    'kg',
                                                                    2,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm font-extrabold text-foreground">
                                                                    {satuan(
                                                                        p.tinggiCm,
                                                                        'cm',
                                                                    )}
                                                                </span>
                                                                {p.tinggiCm !==
                                                                    null && (
                                                                    <span className="block text-xs text-muted-foreground">
                                                                        {p.umurBulan !==
                                                                            null &&
                                                                        p.umurBulan <
                                                                            24
                                                                            ? 'panjang badan (terlentang)'
                                                                            : 'tinggi badan (berdiri)'}
                                                                    </span>
                                                                )}
                                                                {peringatan !==
                                                                    null && (
                                                                    <span className="mt-1 flex items-start gap-1.5 text-xs font-semibold text-tone-amber">
                                                                        <TriangleAlert
                                                                            className="mt-0.5 size-3.5 shrink-0"
                                                                            strokeWidth={
                                                                                2.5
                                                                            }
                                                                            aria-hidden="true"
                                                                        />
                                                                        {
                                                                            peringatan
                                                                        }
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <ZScoreCell
                                                                    nilai={
                                                                        p
                                                                            .penilaian
                                                                            .BB_U
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <ZScoreCell
                                                                    nilai={
                                                                        p
                                                                            .penilaian
                                                                            .BB_TB
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <ZScoreCell
                                                                    nilai={
                                                                        p
                                                                            .penilaian
                                                                            .TB_U
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="hidden md:table-cell">
                                                                {(() => {
                                                                    const raw =
                                                                        p.ntob?.toUpperCase() ??
                                                                        null;

                                                                    if (
                                                                        raw ===
                                                                        'N'
                                                                    ) {
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                                                                <CircleCheck
                                                                                    className="size-3.5 shrink-0 text-emerald-600"
                                                                                    aria-hidden="true"
                                                                                />
                                                                                <span>
                                                                                    Naik
                                                                                    (N)
                                                                                </span>
                                                                            </span>
                                                                        );
                                                                    }

                                                                    if (
                                                                        raw ===
                                                                        'T'
                                                                    ) {
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900">
                                                                                <TriangleAlert
                                                                                    className="size-3.5 shrink-0 text-amber-600"
                                                                                    aria-hidden="true"
                                                                                />
                                                                                <span>
                                                                                    Tidak
                                                                                    Naik
                                                                                    (T)
                                                                                </span>
                                                                            </span>
                                                                        );
                                                                    }

                                                                    if (
                                                                        raw ===
                                                                        'B'
                                                                    ) {
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-900">
                                                                                Baru
                                                                                (B)
                                                                            </span>
                                                                        );
                                                                    }

                                                                    if (
                                                                        raw ===
                                                                        'O'
                                                                    ) {
                                                                        return (
                                                                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                                                                                Tidak
                                                                                Hadir
                                                                                (O)
                                                                            </span>
                                                                        );
                                                                    }

                                                                    return p.ntob ===
                                                                        null
                                                                        ? KOSONG
                                                                        : (ARTI_NTOB[
                                                                              raw
                                                                          ] ??
                                                                              p.ntob);
                                                                })()}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Pedoman N/T/O/B Buku KIA */}
                                </div>

                                {/* Bilah Navigasi Penutup Detail Balita */}
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:px-6">
                                    <div className="flex items-center gap-2.5">
                                        <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                            10
                                        </span>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">
                                                Langkah berikutnya: tinjau hasil
                                                atau kembali ke daftar
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Buka kembali grafik bila perlu,
                                                atau kembali ke daftar balita.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setTabAktif('grafik')
                                            }
                                            className="tombol-kedua text-sm"
                                        >
                                            ← Grafik Pertumbuhan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTabAktif('kurva')}
                                            className="tombol-kedua text-sm"
                                        >
                                            Kurva KMS
                                        </button>
                                        <a
                                            href="#/balita"
                                            className="tombol-utama text-sm"
                                        >
                                            Kembali ke Daftar Balita
                                            <ArrowRight
                                                className="size-4"
                                                strokeWidth={2.5}
                                                aria-hidden="true"
                                            />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </>
                    {/* Tombol yang hanya memunculkan window.alert("Belum
                tersedia di demo") dibuang. Kontrol yang menjanjikan sesuatu
                lalu menolaknya lebih buruk daripada kontrol yang tidak ada;
                kalimat di atas sudah menyebut keadaannya. */}
                    {dialog === 'ubah' && (
                        <DialogUbah
                            anak={anak}
                            periodeId={periode.id}
                            noWa={noWa}
                            wilayahRt={wilayahRt}
                            fokusNomor={fokusNomorWa}
                            onTutup={() => setDialog(null)}
                            onSimpan={async (patch) => {
                                await onSimpan?.(patch);
                                setDialog(null);
                            }}
                        />
                    )}
                    {dialog === 'nomor-wa' && (
                        <Dialog
                            judul={
                                (noWa ?? '').trim() === ''
                                    ? 'Nomor WhatsApp belum diisi'
                                    : 'Nomor WhatsApp belum valid'
                            }
                            ikon={TriangleAlert}
                            lebar="w-[520px]"
                            onTutup={() => setDialog(null)}
                        >
                            <div className="px-7 py-5">
                                <p>
                                    Isi nomor WhatsApp orang tua di profil
                                    balita sebelum membuka pesan.
                                </p>
                                {(noWa ?? '').trim() !== '' && (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Gunakan nomor seluler dengan awalan 08
                                        atau +62.
                                    </p>
                                )}
                                {!bolehUbah && (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Minta petugas yang dapat mengubah profil
                                        untuk melengkapi nomor tersebut.
                                    </p>
                                )}
                            </div>
                            <KakiDialog>
                                <button
                                    type="button"
                                    className="tombol-kedua"
                                    onClick={() => setDialog(null)}
                                >
                                    Tutup
                                </button>
                                {bolehUbah && (
                                    <button
                                        type="button"
                                        className="tombol-utama"
                                        onClick={() => {
                                            setFokusNomorWa(true);
                                            setDialog('ubah');
                                        }}
                                    >
                                        {(noWa ?? '').trim() === ''
                                            ? 'Isi nomor WhatsApp'
                                            : 'Perbaiki nomor WhatsApp'}
                                    </button>
                                )}
                            </KakiDialog>
                        </Dialog>
                    )}
                    {dialog === 'wa' &&
                        terbaru !== null &&
                        nomorTujuan !== null && (
                            <DialogKirimWa
                                nama={nama}
                                nomor={nomorTujuan}
                                susun={(tautan) =>
                                    susunPesan({
                                        nama,
                                        umurBulan: umur,
                                        terbaru,
                                        duaBulanLalu,
                                        kesimpulan: kesimpulanWa,
                                        diskusiKia: infoKiaWa,
                                        tautan,
                                        lembaga,
                                    })
                                }
                                // Tautan butuh server; di demo barisnya dihilangkan.
                                buatTautan={
                                    sumberLive
                                        ? () =>
                                              buatTautanLembar(
                                                  anak.id,
                                                  periode.id,
                                              )
                                        : undefined
                                }
                                onTutup={() => setDialog(null)}
                            />
                        )}
                    {dialog === 'cetak' && (
                        <DialogCetak
                            anak={anak}
                            lembaga={lembaga}
                            onTutup={() => setDialog(null)}
                        />
                    )}
                </div>
                <BantuanDetail
                    bagian={tabAktif}
                    terbuka={bantuanTerbuka}
                    onTutup={() => {
                        setBantuanTerbuka(false);
                        tombolBantuan.current?.focus();
                    }}
                />
            </div>
        </Halaman>
    );
}

/**
 * Satu kartu indeks: judul, z-score 36 px berwarna, lalu kategorinya.
 *
 * Bentuk kartu artboard Detail. Kategori selalu ditulis penuh — warna tidak
 * pernah menjadi satu-satunya penanda (05-uiux-spec.md bagian 3).
 */
function KartuIndeks({
    label,
    nilai,
}: {
    label: string;
    nilai: PenilaianGizi | undefined;
}) {
    const kesimpulan = kesimpulanZScore(nilai?.kategori, nilai?.z);
    const nada = nadaKategori(kesimpulan);
    const warna = WARNA_NADA[nada];
    const artiLabel =
        label === 'BB/PB'
            ? 'Proporsi berat & panjang badan'
            : label === 'BB/TB'
              ? 'Proporsi berat & tinggi badan'
              : label === 'BB/U'
                ? 'Berat badan menurut umur'
                : label === 'PB/U'
                  ? 'Panjang badan menurut umur'
                  : 'Tinggi badan menurut umur';
    const batasNormal =
        label === 'PB/U' || label === 'TB/U'
            ? 'Rentang normal: −2,00 s/d +3,00 SD'
            : 'Rentang normal: −2,00 s/d +1,00 SD';
    const kelasLencana =
        nada === 'merah'
            ? 'bg-tone-red-bg text-tone-red'
            : nada === 'oranye'
              ? 'bg-tone-amber-bg text-tone-amber'
              : nada === 'biru'
                ? 'bg-tone-blue-bg text-tone-blue'
                : nada === 'hijau'
                  ? 'bg-tone-green-bg text-tone-green'
                  : 'bg-surface-subtle text-muted-foreground';

    return (
        <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-subtle/55 p-4">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-extrabold text-foreground">
                        {label}
                    </span>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {artiLabel}
                    </p>
                </div>
                <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-extrabold ${kelasLencana}`}
                >
                    {nada === 'hijau' && (
                        <Check
                            className="size-3.5 shrink-0"
                            aria-hidden="true"
                        />
                    )}
                    <span>{kesimpulan}</span>
                </span>
            </div>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-1.5">
                <span
                    className={`text-3xl leading-none font-extrabold tabular-nums ${warna}`}
                >
                    {nilai === undefined ? KOSONG : zScore(nilai.z)}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                    SD (Z-score)
                </span>
            </p>
            <p className="mt-2 border-t border-rule pt-2 text-xs font-medium text-muted-foreground">
                {batasNormal}
            </p>
        </div>
    );
}

type IsianUbah = {
    nama: string;
    jk: JenisKelamin;
    tglLahir: string;
    anakKe: string;
    bbLahir: string;
    rt: string;
    nik: string;
    bukuKia: boolean;
    kbIbu: string;
    desil: string;
    namaOrtu: string;
    noWa: string;
};

function DialogUbah({
    anak,
    periodeId,
    noWa,
    wilayahRt,
    fokusNomor = false,
    onTutup,
    onSimpan,
}: {
    anak: Anak;
    periodeId: string;
    noWa: string | null;
    wilayahRt: string[];
    fokusNomor?: boolean;
    onTutup: () => void;
    onSimpan: (patch: PatchAnak) => void | Promise<void>;
}) {
    const [isiAwal] = useState<IsianUbah>({
        nama: anak.nama ?? '',
        jk: anak.jk ?? 'P',
        tglLahir: anak.tglLahir ?? '',
        anakKe: anak.anakKe === null ? '' : String(anak.anakKe),
        bbLahir: anak.bbLahirKg === null ? '' : angka(anak.bbLahirKg, 2),
        rt: anak.rt ?? wilayahRt[0] ?? '',
        nik: anak.nik === null ? '' : nik(anak.nik),
        bukuKia: anak.bukuKia,
        kbIbu: anak.kbIbu == null ? '' : anak.kbIbu ? 'iya' : 'tidak',
        desil: anak.desil == null ? '' : String(anak.desil),
        namaOrtu: anak.namaOrtu ?? '',
        noWa: noWa ?? '',
    });
    const [isi, setIsi] = useState(isiAwal);
    const rtTersedia = Array.from(
        new Set([...wilayahRt, ...(anak.rt ? [anak.rt] : [])]),
    ).sort();
    const [galat, setGalat] = useState<
        Partial<Record<keyof IsianUbah, string>>
    >({});
    const [galatSimpan, setGalatSimpan] = useState('');
    const [menyimpan, setMenyimpan] = useState(false);
    useEffect(() => {
        if (!fokusNomor) {
            return;
        }

        const frame = requestAnimationFrame(() =>
            document.getElementById('ubah-noWa')?.focus(),
        );

        return () => cancelAnimationFrame(frame);
    }, [fokusNomor]);

    const ubah = <K extends keyof IsianUbah>(kunci: K, nilai: IsianUbah[K]) => {
        setIsi((lama) => ({ ...lama, [kunci]: nilai }));
        setGalat((lama) => ({ ...lama, [kunci]: undefined }));
    };

    const simpan = async (e: FormEvent) => {
        e.preventDefault();

        const salah: Partial<Record<keyof IsianUbah, string>> = {};
        const digit = isi.nik.replace(/\D/g, '');
        const bb =
            isi.bbLahir.trim() === ''
                ? null
                : Number(isi.bbLahir.replace(',', '.'));

        if (isi.nama.trim() === '') {
            salah.nama = 'Nama balita wajib diisi.';
        }

        if (isi.tglLahir === '') {
            salah.tglLahir = 'Tanggal lahir wajib diisi.';
        }

        if (isi.noWa.trim() !== '' && nomorBaku(isi.noWa) === null) {
            salah.noWa =
                'Nomor WhatsApp belum valid. Gunakan awalan 08 atau +62.';
        }

        if (!isi.rt) {
            salah.rt =
                'RT belum tersedia. Muat ulang halaman sebelum menyimpan.';
        }

        if (digit !== '' && digit.length !== 16) {
            salah.nik = `NIK harus 16 angka. Sekarang ${digit.length < 16 ? 'baru ' : ''}${digit.length}.`;
        }

        if (bb !== null && !(bb >= 0.5 && bb <= 6)) {
            salah.bbLahir = `Berat lahir ${isi.bbLahir.trim()} kg di luar batas wajar (0,5–6,0 kg). Periksa kembali angkanya.`;
        }

        setGalat(salah);

        const pertama = Object.keys(salah)[0];

        if (pertama !== undefined) {
            document.getElementById(`ubah-${pertama}`)?.focus();

            return;
        }

        setMenyimpan(true);
        setGalatSimpan('');

        try {
            await onSimpan({
                nama: isi.nama.trim(),
                nik: digit,
                namaOrtu: isi.namaOrtu.trim(),
                rt: isi.rt,
                jk: isi.jk,
                tglLahir: isi.tglLahir,
                anakKe: isi.anakKe === '' ? null : Number(isi.anakKe),
                bbLahirKg: bb,
                bukuKia: isi.bukuKia,
                kbIbu: isi.kbIbu === '' ? null : isi.kbIbu === 'iya',
                noWa: isi.noWa.trim(),
                ...(isi.desil !== (anak.desil == null ? '' : String(anak.desil))
                    ? {
                          desil: isi.desil === '' ? null : Number(isi.desil),
                          periodeId,
                      }
                    : {}),
            });
        } catch (error) {
            setGalatSimpan(
                error instanceof Error
                    ? error.message
                    : 'Perubahan profil belum tersimpan. Silakan coba lagi.',
            );
        } finally {
            setMenyimpan(false);
        }
    };

    return (
        <Dialog
            ikon={Pencil}
            judul="Ubah data balita"
            keterangan={`${namaTampil(anak.nama)} · Hasil ukur tidak diubah di sini.`}
            lebar="w-[920px]"
            onTutup={onTutup}
            berubah={JSON.stringify(isi) !== JSON.stringify(isiAwal)}
            menyimpan={menyimpan}
            galat={galatSimpan}
            onTutupGalat={() => setGalatSimpan('')}
            onCobaLagi={() => {
                setGalatSimpan('');
                document
                    .getElementById('form-ubah-balita')
                    ?.dispatchEvent(
                        new Event('submit', {
                            bubbles: true,
                            cancelable: true,
                        }),
                    );
            }}
        >
            <form
                id="form-ubah-balita"
                noValidate
                onSubmit={simpan}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="grid min-h-0 gap-y-5 overflow-y-auto px-7 pt-4.5 pb-5.5 md:grid-cols-2">
                    <section
                        aria-labelledby="kolom-balita"
                        className="flex min-w-0 flex-col gap-4 md:pr-7"
                    >
                        <h3
                            id="kolom-balita"
                            className="text-base font-extrabold"
                        >
                            Data balita
                        </h3>
                        <Kolom
                            id="ubah-nama"
                            label="Nama balita"
                            galat={galat.nama}
                        >
                            <input
                                id="ubah-nama"
                                value={isi.nama}
                                onChange={(e) => ubah('nama', e.target.value)}
                                aria-invalid={galat.nama !== undefined}
                                className={`isian w-full ${galat.nama === undefined ? '' : 'border-tone-red'}`}
                            />
                        </Kolom>
                        <fieldset className="min-w-0">
                            <legend className="text-sm font-semibold text-muted-foreground">
                                Jenis kelamin
                            </legend>
                            <div className="mt-1.5 grid grid-cols-2 gap-4.5">
                                <Pilihan
                                    nama="ubah-jk"
                                    terpilih={isi.jk === 'L'}
                                    onPilih={() => ubah('jk', 'L')}
                                >
                                    <Mars
                                        className="size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Laki-laki
                                </Pilihan>
                                <Pilihan
                                    nama="ubah-jk"
                                    terpilih={isi.jk === 'P'}
                                    onPilih={() => ubah('jk', 'P')}
                                >
                                    <Venus
                                        className="size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Perempuan
                                </Pilihan>
                            </div>
                        </fieldset>
                        <div className="grid grid-cols-2 gap-4.5">
                            <Kolom
                                id="ubah-tglLahir"
                                label="Tanggal lahir"
                                galat={galat.tglLahir}
                            >
                                {/* Kotak tanggal bawaan peramban: kalender,
                                    papan tombol, dan pembaca layarnya sudah
                                    benar tanpa kode tambahan. */}
                                <input
                                    id="ubah-tglLahir"
                                    type="date"
                                    value={isi.tglLahir}
                                    onChange={(e) =>
                                        ubah('tglLahir', e.target.value)
                                    }
                                    aria-invalid={galat.tglLahir !== undefined}
                                    className={`isian w-full ${galat.tglLahir === undefined ? '' : 'border-tone-red'}`}
                                />
                            </Kolom>
                            <Kolom id="ubah-anakKe" label="Anak ke-">
                                <input
                                    id="ubah-anakKe"
                                    inputMode="numeric"
                                    value={isi.anakKe}
                                    onChange={(e) =>
                                        ubah(
                                            'anakKe',
                                            e.target.value.replace(/\D/g, ''),
                                        )
                                    }
                                    className="isian w-full"
                                />
                            </Kolom>
                        </div>
                        <div className="grid grid-cols-2 gap-4.5">
                            <Kolom
                                id="ubah-bbLahir"
                                label="Berat lahir"
                                keterangan="(boleh kosong)"
                                galat={galat.bbLahir}
                            >
                                <div
                                    className={`isian flex overflow-hidden p-0 ${galat.bbLahir === undefined ? '' : 'border-tone-red'}`}
                                >
                                    <input
                                        id="ubah-bbLahir"
                                        aria-invalid={
                                            galat.bbLahir !== undefined
                                        }
                                        inputMode="decimal"
                                        value={isi.bbLahir}
                                        onChange={(e) =>
                                            ubah(
                                                'bbLahir',
                                                e.target.value.replace(
                                                    /[^\d.,]/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        className="min-w-0 grow bg-transparent px-3.5 text-right outline-none"
                                    />
                                    <span className="flex items-center border-l-2 border-border bg-surface-alt px-3.5 text-sm text-muted-foreground">
                                        kg
                                    </span>
                                </div>
                            </Kolom>
                            <Kolom id="ubah-rt" label="RT" galat={galat.rt}>
                                <div className="relative">
                                    <select
                                        id="ubah-rt"
                                        value={isi.rt}
                                        onChange={(e) =>
                                            ubah('rt', e.target.value)
                                        }
                                        className="isian w-full cursor-pointer appearance-none pr-11"
                                    >
                                        {rtTersedia.length === 0 && (
                                            <option value="">
                                                RT belum tersedia
                                            </option>
                                        )}
                                        {rtTersedia.map((w) => (
                                            <option key={w} value={w}>
                                                RT {w.padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                </div>
                            </Kolom>
                        </div>
                    </section>

                    <section
                        aria-labelledby="kolom-ortu"
                        className="flex min-w-0 flex-col gap-4 md:border-l md:border-border md:pl-7"
                    >
                        <h3
                            id="kolom-ortu"
                            className="text-base font-extrabold"
                        >
                            Dokumen dan orang tua
                        </h3>
                        <Kolom
                            id="ubah-nik"
                            label="NIK balita"
                            keterangan="(16 angka, sesuai kartu keluarga)"
                            galat={galat.nik}
                        >
                            <input
                                id="ubah-nik"
                                inputMode="numeric"
                                value={isi.nik}
                                onChange={(e) =>
                                    ubah(
                                        'nik',
                                        e.target.value.replace(/[^\d ]/g, ''),
                                    )
                                }
                                aria-invalid={galat.nik !== undefined}
                                className={`isian w-full ${galat.nik === undefined ? '' : 'border-tone-red'}`}
                            />
                        </Kolom>
                        <fieldset className="min-w-0">
                            <legend className="text-sm font-semibold text-muted-foreground">
                                Buku KIA
                            </legend>
                            <div className="mt-1.5 grid grid-cols-2 gap-4.5">
                                <Pilihan
                                    nama="ubah-kia"
                                    terpilih={isi.bukuKia}
                                    onPilih={() => ubah('bukuKia', true)}
                                >
                                    Ada
                                </Pilihan>
                                <Pilihan
                                    nama="ubah-kia"
                                    terpilih={!isi.bukuKia}
                                    onPilih={() => ubah('bukuKia', false)}
                                >
                                    Belum ada
                                </Pilihan>
                            </div>
                        </fieldset>
                        <Kolom
                            id="ubah-desil"
                            label="Kelompok Desil"
                            keterangan="Desil 1–4: Gakin; Desil 5–10: Non Gakin. Berlaku mulai periode yang dipilih untuk laporan F1."
                        >
                            <select
                                id="ubah-desil"
                                className="isian w-full"
                                value={isi.desil}
                                onChange={(e) => ubah('desil', e.target.value)}
                            >
                                <option value="">Belum tercatat</option>
                                {Array.from(
                                    { length: 10 },
                                    (_, i) => i + 1,
                                ).map((d) => (
                                    <option key={d} value={d}>
                                        Desil {d} ·{' '}
                                        {d <= 4
                                            ? 'G (Gakin)'
                                            : 'NG (Non Gakin)'}
                                    </option>
                                ))}
                            </select>
                        </Kolom>
                        <Kolom id="ubah-kbIbu" label="Data KB Ibu">
                            <select
                                id="ubah-kbIbu"
                                className="isian w-full"
                                value={isi.kbIbu}
                                onChange={(e) => ubah('kbIbu', e.target.value)}
                            >
                                <option value="">Belum tercatat</option>
                                <option value="iya">Iya</option>
                                <option value="tidak">Tidak</option>
                            </select>
                        </Kolom>
                        <Kolom id="ubah-namaOrtu" label="Nama ibu">
                            <input
                                id="ubah-namaOrtu"
                                value={isi.namaOrtu}
                                onChange={(e) =>
                                    ubah('namaOrtu', e.target.value)
                                }
                                className="isian w-full"
                            />
                        </Kolom>
                        <Kolom
                            id="ubah-noWa"
                            label="Nomor WhatsApp orang tua"
                            keterangan="(boleh kosong)"
                            galat={galat.noWa}
                        >
                            <input
                                id="ubah-noWa"
                                type="tel"
                                inputMode="tel"
                                value={isi.noWa}
                                onChange={(e) =>
                                    ubah(
                                        'noWa',
                                        e.target.value.replace(/[^\d +-]/g, ''),
                                    )
                                }
                                className="isian w-full"
                            />
                        </Kolom>
                    </section>
                </div>

                {galatSimpan !== '' && (
                    <p
                        role="alert"
                        className="mx-7 mb-3 rounded-lg bg-tone-red-bg px-4 py-3 text-sm font-semibold text-tone-red"
                    >
                        {galatSimpan}
                    </p>
                )}
                <KakiDialog>
                    <button
                        type="button"
                        onClick={onTutup}
                        data-tutup-dialog
                        disabled={menyimpan}
                        className="tombol-kedua px-5.5"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={menyimpan}
                        className="tombol-utama px-5.5"
                    >
                        {menyimpan ? (
                            <span
                                className="size-5 animate-spin rounded-full border-2 border-current border-r-transparent"
                                aria-hidden="true"
                            />
                        ) : (
                            <Save
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        )}
                        {menyimpan ? 'Menyimpan…' : 'Simpan perubahan'}
                    </button>
                </KakiDialog>
            </form>
        </Dialog>
    );
}

/** Satu isian berlabel dengan pesan galat di bawahnya. */
function Kolom({
    id,
    label,
    keterangan,
    galat,
    children,
}: {
    id: string;
    label: string;
    keterangan?: string;
    galat?: string;
    children: ReactNode;
}) {
    return (
        <div className="min-w-0">
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-muted-foreground"
            >
                {label}
                {keterangan !== undefined && (
                    <span className="font-medium"> {keterangan}</span>
                )}
            </label>
            <div className="mt-1.5">{children}</div>
            {galat !== undefined && (
                <p className="mt-1.5 text-sm font-semibold text-tone-red">
                    {galat}
                </p>
            )}
        </div>
    );
}

/** Kartu radio: seluruh kotak bisa disentuh, yang terpilih hijau lembut. */
function Pilihan({
    nama,
    terpilih,
    onPilih,
    children,
}: {
    nama: string;
    terpilih: boolean;
    onPilih: () => void;
    children: ReactNode;
}) {
    return (
        <label
            className={`flex h-14 cursor-pointer items-center gap-2.5 rounded-lg border-2 px-3.5 text-base ${
                terpilih
                    ? 'border-primary bg-accent font-bold text-primary'
                    : 'border-border bg-surface font-semibold'
            }`}
        >
            <input
                type="radio"
                name={nama}
                checked={terpilih}
                onChange={onPilih}
                className="size-5 shrink-0 accent-primary"
            />
            {children}
        </label>
    );
}

function DialogCetak({
    anak,
    lembaga,
    onTutup,
}: {
    anak: Anak;
    lembaga: string;
    onTutup: () => void;
}) {
    const kartu = {
        nama: anak.nama,
        tglLahir: anak.tglLahir,
        rt: anak.rt,
        namaIbu: anak.namaOrtu,
        nik: anak.nik,
        id: anak.id,
        kode: kodeKartuSasaran(anak),
    };

    return (
        <Dialog
            judul="Cetak kartu balita"
            keterangan="Periksa isi kartu sebelum dicetak."
            lebar="w-[900px]"
            onTutup={onTutup}
        >
            <div className="flex min-h-0 flex-wrap gap-7 overflow-y-auto px-7 py-4.5">
                <figure className="shrink-0">
                    <div className="flex justify-center rounded-lg bg-surface-alt p-5.5">
                        <KartuBalita kartu={kartu} lembaga={lembaga} />
                    </div>
                    <figcaption className="mt-2 text-sm text-muted-foreground">
                        Ukuran asli 85,6 × 54 mm, seukuran KTP. Garis
                        putus-putus adalah garis potong.
                    </figcaption>
                </figure>

                <div className="flex min-w-60 flex-1 flex-col gap-3.5">
                    <div>
                        <h3 className="text-base font-extrabold">
                            Ingin mencetak beberapa kartu sekaligus?
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Satu lembar A4 memuat 8 kartu. Pilih balita lain di
                            halaman Kartu Balita agar kertas tidak terbuang.
                        </p>
                    </div>
                    <Link
                        href={`/kartu-sasaran/${anak.id}`}
                        className="tombol-kedua"
                    >
                        <ArrowRight
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Buka Kartu Balita
                    </Link>
                    <div className="flex gap-2.5 rounded-lg bg-tone-blue-bg px-4 py-3.5">
                        <Info
                            className="mt-px size-5 shrink-0 text-tone-blue"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        <p className="text-sm">
                            Saat jendela cetak muncul, pilih kertas{' '}
                            <span className="font-bold">A4</span> dan skala{' '}
                            <span className="font-bold">100%</span> agar ukuran
                            kartu tepat.
                        </p>
                    </div>
                </div>
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
                    type="button"
                    onClick={() => window.print()}
                    className="tombol-utama px-5.5"
                >
                    <Printer
                        className="size-5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Cetak 1 kartu
                </button>
            </KakiDialog>

            <LembarCetak kartu={[kartu]} lembaga={lembaga} />
        </Dialog>
    );
}
