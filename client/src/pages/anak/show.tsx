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
    CircleCheck,
    CreditCard,
    Info,
    Mars,
    Pencil,
    Printer,
    Save,
    ShieldCheck,
    Syringe,
    TriangleAlert,
    Venus,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import BarisDefinisi from '@/components/baris-definisi';
import Dialog, { KakiDialog } from '@/components/dialog';
import DialogKirimWa from '@/components/dialog-kirim-wa';
import GrafikPertumbuhan from '@/components/grafik-pertumbuhan';
import Halaman from '@/components/halaman';
import IkonWhatsApp from '@/components/ikon-whatsapp';
import KartuBalita, { LembarCetak } from '@/components/kartu-balita';
import KmsChart from '@/components/kms-chart-sep24';
import Pilih from '@/components/pilih';
import { nadaKategori } from '@/components/status-gizi-badge';
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
import { kbmKg } from '@/lib/kategori';
import { tandaGizi, tentukanKesimpulan } from '@/lib/kesimpulan-gizi';
import { buatTautanLembar } from '@/lib/lembar';
import { Link } from '@/lib/nav';
import { penilaianLayak, terbaruUntuk } from '@/lib/penilaian-utama';
import { kalimatKesimpulan, nomorBaku, susunPesan } from '@/lib/pesan-wa';
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
const NOMOR_UJI = nomorBaku(import.meta.env.VITE_WA_NOMOR_UJI);

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
    { nilai: 'profil', label: 'Profil Balita' },
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
}: Props) {
    const [umurDisorot, setUmurDisorot] = useState<number | null>(null);
    const [tabAktif, setTabAktif] = useState<TabDetail>('profil');
    const [dialog, setDialog] = useState<'ubah' | 'cetak' | 'wa' | null>(null);
    const bolehUbah = peran !== 'kader' && onSimpan !== undefined;
    const bolehCetak = peran !== 'kader';
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

    // Nomor uji (client/.env.local) menggantikan nomor orang tua, sehingga
    // pengujian tidak pernah menyentuh nomor yang sebenarnya.
    const nomorTujuan = NOMOR_UJI ?? nomorBaku(noWa);

    const umurTerbaru = terbaru?.umurBulan ?? null;
    const duaBulanLalu =
        umurTerbaru === null
            ? undefined
            : pengukuran.find(
                  (p) =>
                      p.statusKehadiran === 'hadir' &&
                      p.umurBulan === umurTerbaru - 2,
              );

    // Tombol kirim tidak dirender bila tak ada yang dapat dikirim; sebabnya
    // ditulis sebagai satu baris di bawah judul (docs/prd/feedback/F03).
    const alasanTanpaWa =
        terbaru === null
            ? `Belum ada hasil pengukuran pada ${periode.label}, sehingga tidak ada yang dapat dikirim.${
                  hasilTerakhir === undefined
                      ? ''
                      : ` Pengukuran terakhir tercatat ${tanggalPanjang(hasilTerakhir.tanggalUkur)}; lihat tab Riwayat Ukur, lalu pilih periode bulan itu di kiri atas.`
              }`
            : indeksTidakWajar.length > 0
              ? 'Hasil periode ini ditandai tidak wajar. Verifikasi ulang sebelum dikirim ke orang tua.'
              : nomorTujuan !== null
                ? null
                : (noWa ?? '').trim() === ''
                  ? 'Nomor WhatsApp orang tua belum diisi. Isi lewat Ubah data.'
                  : 'Nomor WhatsApp orang tua tidak valid. Periksa lewat Ubah data.';

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
            kembali={{ href: '/balita', label: 'Data Balita' }}
            subjudul={`${umur !== null ? `${umurPanjang(umur)}, ` : ''}${
                anak.rt === null
                    ? 'RT belum tercatat'
                    : `RT ${anak.rt.padStart(2, '0')}`
            }${sumberLive ? '' : '. Data contoh'}.`}
            aksi={
                <>
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
                            onClick={() => setDialog('ubah')}
                            className="tombol-kedua"
                        >
                            <Pencil
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Ubah data
                        </button>
                    )}
                    {alasanTanpaWa === null && (
                        <button
                            type="button"
                            onClick={() => setDialog('wa')}
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
                    className="mb-5 flex items-start gap-2.5 text-base text-muted-foreground"
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
            <div
                className="bilah-tab mb-7"
                role="tablist"
                aria-label="Kategori detail balita"
            >
                {TAB_DETAIL.map((tab) => (
                    <button
                        key={tab.nilai}
                        id={`tab-${tab.nilai}`}
                        type="button"
                        role="tab"
                        aria-selected={tabAktif === tab.nilai}
                        aria-controls={`panel-${tab.nilai}`}
                        onClick={() => setTabAktif(tab.nilai)}
                        className="tab"
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

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
                className="mb-7 overflow-hidden rounded-xl border border-border bg-card"
            >
                <div className="flex flex-wrap items-center gap-4 bg-primary px-5 py-4 text-primary-foreground sm:px-6">
                    <div
                        aria-hidden="true"
                        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-card text-xl font-extrabold text-primary"
                    >
                        {inisial || '—'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-extrabold">
                            Profil balita
                        </h2>
                        <p className="mt-0.5 text-base text-primary-foreground/80">
                            {nama}
                        </p>
                    </div>
                    <p className="text-base font-semibold text-primary-foreground">
                        {anak.jk === 'L'
                            ? 'Laki-laki'
                            : anak.jk === 'P'
                              ? 'Perempuan'
                              : KOSONG}
                        {umur !== null && ` · ${umurPanjang(umur)}`}
                    </p>
                </div>

                <div className="p-5 sm:p-6">
                    <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                        <BarisDefinisi label="Tanggal lahir">
                            {tanggalPanjang(anak.tglLahir)}
                        </BarisDefinisi>
                        <BarisDefinisi label="NIK">
                            {nik(anak.nik)}
                            {!anak.nikLengkap && (
                                <span className="block text-sm text-tone-amber">
                                    NIK belum lengkap
                                </span>
                            )}
                        </BarisDefinisi>
                        <BarisDefinisi label="Berat lahir">
                            {satuan(anak.bbLahirKg, 'kg', 2)}
                            {anak.bbLahirMeragukan && (
                                <span className="block text-sm text-tone-amber">
                                    Angka di arsip meragukan
                                </span>
                            )}
                        </BarisDefinisi>
                        <BarisDefinisi label="Ibu">
                            {anak.namaOrtu ?? KOSONG}
                        </BarisDefinisi>
                        <BarisDefinisi label="Alamat">
                            {anak.rt === null
                                ? KOSONG
                                : `RT ${anak.rt.padStart(2, '0')}`}
                            {anak.anakKe !== null && `, anak ke-${anak.anakKe}`}
                        </BarisDefinisi>
                    </dl>

                    <div className="mt-6 border-t border-border pt-5">
                        <h3 className="text-base font-bold">
                            Skrining saat pendaftaran
                        </h3>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div className="flex gap-3 rounded-lg bg-surface-subtle p-4">
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
                                    <p className="font-bold">Buku KIA</p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        {anak.bukuKia
                                            ? 'Tercatat pada data sasaran.'
                                            : 'Belum tercatat. Konfirmasi saat daftar.'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 rounded-lg bg-surface-subtle p-4">
                                <Syringe
                                    className="mt-0.5 size-5 shrink-0 text-tone-amber"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="font-bold">Imunisasi</p>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                        Belum tercatat. Konfirmasi saat
                                        pendaftaran.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <p className="mt-3 max-w-[78ch] text-sm text-muted-foreground">
                            Saat kartu dipindai, item yang belum lengkap muncul
                            sebagai skrining awal sebelum balita dicatat hadir.
                        </p>
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
                            Pengukuran dari periode lain tidak dipakai sebagai
                            status bulan ini.
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
                        className="kartu overflow-hidden"
                    >
                        <h2 className="strip-kepala text-xl font-extrabold">
                            Status pengukuran{' '}
                            {tanggalPanjang(terbaru.tanggalUkur)}
                        </h2>
                        <div className="p-5 sm:p-6">
                            {/* Tiga kartu indeks berdampingan, susunan artboard.
                            Yang terberat tetap di depan: urutannya dihitung
                            dari nadanya, bukan dari urutan tulis — supaya mata
                            jatuh lebih dulu pada vonis yang menentukan. */}
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                                    {indeksTidakWajar.join(', ')} ditandai tidak
                                    wajar dan tidak dipakai untuk penilaian.
                                    Periksa ulang hasil ukur sebelum memberi
                                    arahan.
                                </p>
                            )}

                            {/* Layar ini dulu tidak pernah menjawab pertanyaan yang
                            jadi alasan keberadaannya: anak ini perlu
                            ditindaklanjuti atau tidak. */}
                            <p className="mt-4 text-base font-bold">
                                {indeksTidakWajar.length > 0
                                    ? 'Sebagian hasil perlu verifikasi ulang sebelum keputusan tindak lanjut.'
                                    : indeks.every((i) => i.nilai === undefined)
                                      ? 'Belum dapat dinilai dari data periode ini.'
                                      : perluTindakLanjut
                                        ? 'Perlu tindak lanjut bulan ini.'
                                        : 'Tidak perlu tindak lanjut bulan ini.'}
                            </p>

                            <div
                                className={`mt-5 rounded-xl p-5 ${
                                    perluRujukan
                                        ? 'bg-tone-red-bg text-tone-red'
                                        : 'bg-surface-subtle text-foreground'
                                }`}
                            >
                                <h3 className="text-base font-extrabold">
                                    Arahan untuk keluarga
                                </h3>
                                <p className="mt-1 max-w-[76ch] text-base text-pretty">
                                    {edukasiKms}
                                </p>
                                {perluRujukan && (
                                    <p className="mt-2 text-sm font-semibold">
                                        Ambang kerja rujukan: z-score ≤{' '}
                                        {zScore(ambang.ambangRujukan)} SD. Perlu
                                        pengesahan Puskesmas sebelum digunakan
                                        sebagai aturan produksi.
                                    </p>
                                )}
                                {perluWaspada && !perluRujukan && (
                                    <p className="mt-2 text-sm font-semibold">
                                        Zona waspada dimulai pada z-score ≤{' '}
                                        {zScore(ambang.ambangWaspada)} SD.
                                    </p>
                                )}
                            </div>

                            <p className="mt-2 max-w-[80ch] text-sm text-pretty text-muted-foreground">
                                Acuan: standar pertumbuhan WHO 2006 (sama dengan
                                tabel Permenkes No. 2 Tahun 2020). BB/PB dipakai
                                untuk usia di bawah 24 bulan, BB/TB untuk 24
                                bulan ke atas.
                            </p>

                            {/* Asumsi sistem harus terlihat di antarmuka, bukan hanya
                            di basis data (prinsip P4). */}
                            {terbaru.catatanUkur?.jenisUkur !== undefined && (
                                <p className="mt-2 max-w-[80ch] text-sm text-muted-foreground">
                                    Cara ukur mengikuti umur (
                                    {umur !== null && umur < 24
                                        ? 'panjang badan, telentang'
                                        : 'tinggi badan, berdiri'}
                                    ) karena tidak tercatat di data.
                                </p>
                            )}
                        </div>
                    </section>
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
                            Belum ada pengukuran berat yang dapat digambarkan.
                        </p>
                    ) : (
                        anak.jk !== null && (
                            <div className="overflow-hidden rounded-xl border border-border bg-card">
                                <div className="strip-kepala flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-xl font-extrabold">
                                            Kartu Menuju Sehat
                                        </h2>
                                        <p className="mt-0.5 text-sm text-muted-foreground">
                                            Berat badan menurut umur · WHO 2006
                                        </p>
                                    </div>
                                    <p className="text-sm font-semibold text-muted-foreground">
                                        {nama} · {umurPanjang(umur)}
                                    </p>
                                </div>
                                <div className="px-5 py-4 sm:px-6">
                                    <p className="mb-3 text-sm text-muted-foreground">
                                        {terbaru === null
                                            ? `Kurva ini hanya menampilkan riwayat; belum ada pengukuran pada ${periode.label}.`
                                            : `Hasil ${periode.label} tersedia pada tab Status Gizi.`}
                                        {umur !== null &&
                                            umur > 60 &&
                                            ' Kurva BB/U WHO 2006 ini hanya mencakup usia 0–60 bulan.'}
                                        {titikPerluVerifikasi > 0 &&
                                            ` ${titikPerluVerifikasi} titik BB/U yang ditandai tidak wajar disisihkan dari gambar dan tetap tersimpan di Riwayat Ukur.`}
                                    </p>
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
                                                    p.umurBulan !== null &&
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
                                                z: p.penilaian.BB_U?.z ?? null,
                                                kategori:
                                                    p.penilaian.BB_U
                                                        ?.kategori ?? null,
                                            }))}
                                    />
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
                            Jenis kelamin belum tercatat, sehingga grafik belum
                            dapat digambarkan. Lengkapi lewat Ubah data.
                        </p>
                    ) : (
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
                    )}
                </section>

                <section
                    id="panel-riwayat"
                    role="tabpanel"
                    aria-labelledby="tab-riwayat"
                    hidden={tabAktif !== 'riwayat'}
                >
                    <div className="kartu overflow-hidden">
                        {/* Judul menyatu dengan kartunya di strip kepala,
                                seperti artboard. */}
                        <div className="strip-kepala">
                            <h2 className="text-xl font-extrabold">
                                Riwayat pengukuran
                            </h2>
                            {/* Mengklik baris menyorot titiknya di kurva.
                                    Dulu tidak ada satu pun tanda bahwa itu
                                    mungkin, dan <tr onClick> tidak bisa
                                    dijangkau papan tombol sama sekali. */}
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Pilih tanggal untuk menyorot titiknya saat
                                membuka tab Kurva KMS.
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground md:hidden">
                                Tabel ini lebih lebar daripada layar. Geser ke
                                samping untuk melihat kolom z-score.
                            </p>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead scope="col">Tanggal</TableHead>
                                    <TableHead
                                        scope="col"
                                        className="hidden lg:table-cell"
                                    >
                                        Umur
                                    </TableHead>
                                    <TableHead scope="col">Berat</TableHead>
                                    <TableHead scope="col">
                                        Panjang atau Tinggi
                                    </TableHead>
                                    <TableHead scope="col">
                                        {labelIndeks('BB_TB', umur)}
                                    </TableHead>
                                    <TableHead scope="col">
                                        {labelIndeks('TB_U', umur)}
                                    </TableHead>
                                    <TableHead
                                        scope="col"
                                        className="hidden md:table-cell"
                                    >
                                        Pertumbuhan
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pengukuran.map((p, urutan) => {
                                    const sebab =
                                        p.statusKehadiran === 'hadir'
                                            ? null
                                            : (ARTI_KEHADIRAN[
                                                  p.statusKehadiran
                                              ] ?? null);
                                    const peringatan = janggal(urutan);

                                    return (
                                        <TableRow
                                            key={p.periodeId}
                                            aria-current={
                                                p.umurBulan === umurDisorot
                                                    ? 'true'
                                                    : undefined
                                            }
                                            className={
                                                p.umurBulan === umurDisorot
                                                    ? 'bg-accent'
                                                    : ''
                                            }
                                        >
                                            <TableCell className="py-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setUmurDisorot(
                                                            p.umurBulan,
                                                        )
                                                    }
                                                    className="-ml-3 inline-flex min-h-13 items-center rounded-lg px-3 font-semibold text-primary underline"
                                                >
                                                    {tanggalRingkas(
                                                        p.tanggalUkur,
                                                    )}
                                                </button>
                                                {/* Baris kosong sekarang
                                                        menyebutkan sebabnya. */}
                                                {sebab !== null && (
                                                    <span className="block pb-1 text-sm text-muted-foreground">
                                                        {sebab}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="hidden whitespace-nowrap lg:table-cell">
                                                {umurRingkas(p.umurBulan)}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {satuan(p.bbKg, 'kg', 2)}
                                            </TableCell>
                                            <TableCell>
                                                {satuan(p.tinggiCm, 'cm')}
                                                {/* Keterangan cara ukur
                                                        hanya bila ada angkanya:
                                                        dulu ia tetap dicetak di
                                                        bawah pengukuran yang
                                                        tidak pernah terjadi. */}
                                                {p.tinggiCm !== null && (
                                                    <span className="block text-sm text-muted-foreground">
                                                        {p.umurBulan !== null &&
                                                        p.umurBulan < 24
                                                            ? 'panjang badan'
                                                            : 'tinggi badan'}
                                                    </span>
                                                )}
                                                {peringatan !== null && (
                                                    <span className="mt-1 flex items-start gap-1.5 text-sm text-tone-amber">
                                                        <TriangleAlert
                                                            className="mt-0.5 size-4 shrink-0"
                                                            strokeWidth={2.5}
                                                            aria-hidden="true"
                                                        />
                                                        {peringatan}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <ZScoreCell
                                                    nilai={p.penilaian.BB_TB}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <ZScoreCell
                                                    nilai={p.penilaian.TB_U}
                                                />
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                {p.ntob === null
                                                    ? KOSONG
                                                    : (ARTI_NTOB[
                                                          p.ntob.toUpperCase()
                                                      ] ?? p.ntob)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <p className="mt-3 max-w-[80ch] text-sm text-muted-foreground">
                        Kolom Pertumbuhan menampilkan huruf N, T, O, dan B apa
                        adanya dari arsip. Aturan 1T/2T/3T belum diterapkan
                        karena definisinya masih dikonfirmasi.
                    </p>
                </section>
            </>

            {/* Tombol yang hanya memunculkan window.alert("Belum
                tersedia di demo") dibuang. Kontrol yang menjanjikan sesuatu
                lalu menolaknya lebih buruk daripada kontrol yang tidak ada;
                kalimat di atas sudah menyebut keadaannya. */}
            {dialog === 'ubah' && (
                <DialogUbah
                    anak={anak}
                    noWa={noWa}
                    wilayahRt={wilayahRt}
                    onTutup={() => setDialog(null)}
                    onSimpan={(patch) => {
                        onSimpan?.(patch);
                        setDialog(null);
                    }}
                />
            )}
            {dialog === 'wa' && terbaru !== null && nomorTujuan !== null && (
                <DialogKirimWa
                    nama={nama}
                    nomor={nomorTujuan}
                    modeUji={NOMOR_UJI !== null}
                    susun={(tautan) =>
                        susunPesan({
                            nama,
                            umurBulan: umur,
                            terbaru,
                            duaBulanLalu,
                            kesimpulan: kesimpulanWa,
                            tautan,
                            lembaga,
                        })
                    }
                    // Tautan butuh server; di demo barisnya dihilangkan.
                    buatTautan={
                        sumberLive
                            ? () => buatTautanLembar(anak.id, periode.id)
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
    const warna = WARNA_NADA[nadaKategori(nilai?.kategori ?? null)];

    return (
        <div className="kartu p-5">
            <p className="text-base font-bold text-muted-foreground">{label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span
                    className={`text-3xl leading-none font-extrabold ${warna}`}
                >
                    {nilai === undefined ? KOSONG : zScore(nilai.z)}
                </span>
                <span className="text-sm text-muted-foreground">SD</span>
            </p>
            <p className={`mt-1.5 text-base font-bold text-pretty ${warna}`}>
                {nilai?.kategori ?? 'Belum dapat dinilai'}
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
    namaOrtu: string;
    noWa: string;
};

function DialogUbah({
    anak,
    noWa,
    wilayahRt,
    onTutup,
    onSimpan,
}: {
    anak: Anak;
    noWa: string | null;
    wilayahRt: string[];
    onTutup: () => void;
    onSimpan: (patch: PatchAnak) => void;
}) {
    const [isi, setIsi] = useState<IsianUbah>({
        nama: anak.nama ?? '',
        jk: anak.jk ?? 'P',
        tglLahir: anak.tglLahir ?? '',
        anakKe: anak.anakKe === null ? '' : String(anak.anakKe),
        bbLahir: anak.bbLahirKg === null ? '' : angka(anak.bbLahirKg, 2),
        rt: anak.rt ?? wilayahRt[0] ?? '',
        nik: anak.nik === null ? '' : nik(anak.nik),
        bukuKia: anak.bukuKia,
        namaOrtu: anak.namaOrtu ?? '',
        noWa: noWa ?? '',
    });
    const [galat, setGalat] = useState<
        Partial<Record<keyof IsianUbah, string>>
    >({});

    const ubah = <K extends keyof IsianUbah>(kunci: K, nilai: IsianUbah[K]) => {
        setIsi((lama) => ({ ...lama, [kunci]: nilai }));
        setGalat((lama) => ({ ...lama, [kunci]: undefined }));
    };

    const simpan = (e: FormEvent) => {
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

        onSimpan({
            nama: isi.nama.trim(),
            nik: digit,
            namaOrtu: isi.namaOrtu.trim(),
            rt: isi.rt,
            jk: isi.jk,
            tglLahir: isi.tglLahir,
            anakKe: isi.anakKe === '' ? null : Number(isi.anakKe),
            bbLahirKg: bb,
            bukuKia: isi.bukuKia,
            noWa: isi.noWa.trim(),
        });
    };

    return (
        <Dialog
            judul={`Ubah data ${namaTampil(anak.nama)}`}
            keterangan="Hasil ukur tidak diubah di sini. Setiap perubahan dicatat: siapa yang mengubah dan kapan."
            lebar="w-[920px]"
            onTutup={onTutup}
        >
            <form
                noValidate
                onSubmit={simpan}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="grid min-h-0 gap-y-5 overflow-y-auto px-7 py-4.5 md:grid-cols-2 lg:pendek:py-3">
                    <section
                        aria-labelledby="kolom-balita"
                        className="flex min-w-0 flex-col gap-4 md:pr-7 lg:pendek:gap-3"
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
                            <legend className="text-base font-semibold text-muted-foreground">
                                Jenis kelamin
                            </legend>
                            <div className="mt-2 grid grid-cols-2 gap-4.5">
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
                                    <span className="flex items-center border-l-2 border-border-strong bg-surface-alt px-3.5 text-base text-muted-foreground">
                                        kg
                                    </span>
                                </div>
                            </Kolom>
                            <Kolom id="ubah-rt" label="RT">
                                <Pilih
                                    id="ubah-rt"
                                    value={isi.rt}
                                    onChange={(v) => ubah('rt', v)}
                                >
                                    {wilayahRt.map((w) => (
                                        <option key={w} value={w}>
                                            RT {w.padStart(2, '0')}
                                        </option>
                                    ))}
                                </Pilih>
                            </Kolom>
                        </div>
                    </section>

                    <section
                        aria-labelledby="kolom-ortu"
                        className="flex min-w-0 flex-col gap-4 md:border-l md:border-border md:pl-7 lg:pendek:gap-3"
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
                            <legend className="text-base font-semibold text-muted-foreground">
                                Buku KIA
                            </legend>
                            <div className="mt-2 grid grid-cols-2 gap-4.5">
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

                <KakiDialog>
                    <button
                        type="button"
                        onClick={onTutup}
                        className="tombol-kedua px-5.5"
                    >
                        Batal
                    </button>
                    <button type="submit" className="tombol-utama px-5.5">
                        <Save
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Simpan perubahan
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
                className="block text-base font-semibold text-muted-foreground"
            >
                {label}
                {keterangan !== undefined && (
                    <span className="font-medium"> {keterangan}</span>
                )}
            </label>
            <div className="mt-2">{children}</div>
            {galat !== undefined && (
                <p className="mt-1.5 text-base font-semibold text-tone-red">
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
                    : 'border-border-strong bg-surface font-semibold'
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
                    <figcaption className="mt-2 text-base text-muted-foreground">
                        Ukuran asli 85,6 × 54 mm, seukuran KTP. Garis
                        putus-putus adalah garis potong.
                    </figcaption>
                </figure>

                <div className="flex min-w-60 flex-1 flex-col gap-3.5">
                    <div>
                        <h3 className="text-base font-extrabold">
                            Ingin mencetak beberapa kartu sekaligus?
                        </h3>
                        <p className="mt-1 text-base text-muted-foreground">
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
                        <p className="text-base">
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
