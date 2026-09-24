/**
 * Kerangka aplikasi demo: router hash, state peran, dan shell tujuh layar.
 *
 * docs/10-prd-demo-frontend.md bagian 6.2. Berkas ini perancah — saat backend
 * siap, Inertia dan layout Laravel yang menggantikannya.
 */

import {
    Baby,
    Calendar,
    CreditCard,
    FileText,
    House,
    LogOut,
    Settings,
    Stethoscope,
    Upload,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import FilterPeriode from '@/components/filter-periode';
import { umurBulanPada } from '@/lib/format';
import DaftarAnak from '@/pages/anak/index';
import type { AnakBaru, BarisAnak, PatchAnak } from '@/pages/anak/index';
import DetailAnak from '@/pages/anak/show';
import Dashboard from '@/pages/dashboard';
import KartuSasaran from '@/pages/kartu-sasaran/index';
import Laporan from '@/pages/laporan/index';
import type { TabPeriode } from '@/pages/laporan/index';
import LayananPosyandu from '@/pages/layanan/index';
import Pengaturan from '@/pages/pengaturan/index';
import type {
    Ambang,
    StandarisasiAntropometri,
} from '@/pages/pengaturan/index';
import DaftarPeriode from '@/pages/periode/index';
import SasaranImpor from '@/pages/sasaran/index';
import type { Peran, Periode } from '@/types/posyandu';
import Login from './Login';
import { Link, navigate, useAlamat } from './nav';
import {
    cakupanEnamBulan,
    cariPeriode,
    daftarAnak,
    daftarRt,
    data,
    detailAnak,
    periodeTerakhirTerisi,
    periodeTerbaru,
    csvLaporan,
    daftarPeriode,
    PENGATURAN_BAWAAN,
    PENGATURAN_TERAKHIR_DIUBAH,
    STANDARISASI_BAWAAN,
    perluPerhatian,
    rekapPerRt,
    ringkasan,
    RT_KADER,
    standarLms,
    statusGizi,
} from './store';

/**
 * Unduhan berkas di sisi peramban.
 *
 * Di produk nanti ini menjadi respons streaming dari `LaporanController@export`
 * (bagian 10); di demo berkasnya disusun dari data JSON lalu diserahkan ke
 * peramban lewat blob.
 */
function unduhBerkas(nama: string, isi: string): void {
    const alamat = URL.createObjectURL(
        new Blob([isi], { type: 'text/csv;charset=utf-8' }),
    );
    const tautan = document.createElement('a');

    tautan.href = alamat;
    tautan.download = nama;
    tautan.click();
    URL.revokeObjectURL(alamat);
}

type ButirNav = {
    href: string;
    label: string;
    ikon: ComponentType<{ className?: string; strokeWidth?: number }>;
    peran: Peran[];
};

const SEMUA: Peran[] = ['kader', 'bidan', 'admin'];

const NAV: ButirNav[] = [
    { href: '/beranda', label: 'Beranda', ikon: House, peran: SEMUA },
    {
        href: '/layanan',
        label: 'Pendaftaran & Ukur',
        ikon: Stethoscope,
        peran: SEMUA,
    },
    { href: '/balita', label: 'Data Anak', ikon: Baby, peran: SEMUA },
    {
        href: '/kartu-sasaran',
        label: 'Kartu Sasaran',
        ikon: CreditCard,
        peran: ['bidan', 'admin'],
    },
    { href: '/laporan', label: 'Laporan', ikon: FileText, peran: SEMUA },
    {
        href: '/sasaran',
        label: 'Sasaran & Impor',
        ikon: Upload,
        peran: ['admin'],
    },
    {
        href: '/pengaturan',
        label: 'Pengaturan',
        ikon: Settings,
        peran: ['bidan', 'admin'],
    },
    { href: '/periode', label: 'Periode', ikon: Calendar, peran: ['admin'] },
];

/**
 * Antrean kirim contoh untuk Beranda.
 *
 * Aplikasi Tablet-lah yang mengantre pengukuran saat sinyal hilang
 * (ADR-0003); Portal hanya melaporkannya. Di demo angkanya tetap, supaya
 * keadaan ini terlihat tanpa harus mematikan jaringan.
 */
const ANTREAN_CONTOH = { jumlah: 3, sejak: '14 Agustus, 09.12' };

const KETERANGAN_PERAN: Record<Peran, string> = {
    kader: 'Melihat data RT binaannya saja.',
    bidan: 'Boleh mengubah batas pengukuran.',
    admin: 'Boleh mengelola akun dan periode.',
};

const NAMA_PERAN: Record<Peran, string> = {
    kader: 'Kader',
    bidan: 'Bidan',
    admin: 'Admin',
};

type Rute =
    | { nama: 'beranda' }
    | { nama: 'layanan' }
    | { nama: 'balita' }
    | { nama: 'detail'; id: number }
    | { nama: 'laporan' }
    | { nama: 'sasaran' }
    | { nama: 'kartu-sasaran'; id?: number }
    | { nama: 'pengaturan' }
    | { nama: 'periode' };

/** Router demo, seluruhnya. Tanpa pustaka: enam alamat dan satu parameter. */
function bacaRute(alamat: string): Rute {
    const detail = /^\/balita\/(\d+)$/.exec(alamat);
    const kartu = /^\/kartu-sasaran\/(\d+)$/.exec(alamat);

    if (detail !== null) {
        return { nama: 'detail', id: Number(detail[1]) };
    }

    if (kartu !== null) {
        return { nama: 'kartu-sasaran', id: Number(kartu[1]) };
    }

    switch (alamat) {
        case '/balita':
            return { nama: 'balita' };

        case '/layanan':
            return { nama: 'layanan' };

        case '/laporan':
            return { nama: 'laporan' };

        case '/sasaran':
            return { nama: 'sasaran' };

        case '/kartu-sasaran':
            return { nama: 'kartu-sasaran' };

        case '/pengaturan':
            return { nama: 'pengaturan' };

        case '/periode':
            return { nama: 'periode' };

        default:
            return { nama: 'beranda' };
    }
}

/** Layar mana yang boleh dibuka peran ini. Di demo ini tampilan, bukan pengamanan. */
function boleh(rute: Rute, peran: Peran): boolean {
    if (rute.nama === 'pengaturan') {
        return peran !== 'kader';
    }

    if (rute.nama === 'periode') {
        return peran === 'admin';
    }

    return true;
}

export default function DemoApp() {
    const [peran, setPeran] = useState<Peran | null>(null);
    const [periodeId, setPeriodeId] = useState(periodeTerbaru);
    const [tabLaporan, setTabLaporan] = useState<TabPeriode>('bulanan');
    /**
     * Hasil editor baris dan form tambah.
     *
     * Hanya di memori: memuat ulang mengembalikan data contoh seperti
     * semula, sama seperti selektor lainnya. Di produk nanti
     * `AnakController` yang menerimanya lewat Inertia, dan
     * `PenilaianGiziService` yang menghitung ulang z-score-nya — bukan
     * pratinjau di peramban.
     */
    const [koreksi, setKoreksi] = useState<Record<number, PatchAnak>>({});
    const [tambahan, setTambahan] = useState<AnakBaru[]>([]);
    const [antrean, setAntrean] = useState<typeof ANTREAN_CONTOH | undefined>(
        ANTREAN_CONTOH,
    );
    const [ambang, setAmbang] = useState<Ambang>(PENGATURAN_BAWAAN);
    const [standarisasi, setStandarisasi] =
        useState<StandarisasiAntropometri>(STANDARISASI_BAWAAN);
    const alamat = useAlamat();
    const rute = bacaRute(alamat);

    // Mengganti peran ke yang lebih terbatas bisa meninggalkan pengguna di layar
    // yang tidak lagi boleh dibuka; alamatnya dikembalikan ke Beranda.
    useEffect(() => {
        if (peran !== null && !boleh(rute, peran)) {
            navigate('/beranda');
        }
    }, [peran, rute]);

    if (peran === null) {
        return (
            <Login
                onMasuk={(dipilih) => {
                    setPeran(dipilih);
                    navigate('/beranda');
                }}
            />
        );
    }

    return (
        <div className="flex min-h-screen flex-col lg:flex-row">
            {/* Di bawah 1024 px bilah ini menempel di atas layar sebagai dua
                baris ringkas — merek dengan periode, lalu menu mendatar.
                Sebelumnya ia blok setinggi 342 px yang mendorong baris data
                pertama ke y=912, di bawah lipatan ponsel. */}
            <aside className="sticky top-0 z-20 flex w-full shrink-0 flex-col border-b border-border bg-sidebar lg:h-screen lg:w-64 lg:overflow-y-auto lg:border-r lg:border-b-0">
                <div className="flex items-center justify-between gap-4 px-4 py-3 lg:block lg:px-5 lg:py-4">
                    <div className="min-w-0">
                        <p className="truncate text-base font-extrabold">
                            Portal Posyandu Tulip
                        </p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                            RW {data.meta.rw} Kelurahan {data.meta.kelurahan}
                        </p>
                    </div>

                    {/* Periode adalah lingkup seluruh aplikasi, bukan milik satu
                        layar — tempatnya bersama navigasi. Dulu ia sendirian di
                        dalam header setinggi 72 px yang 90% kosong. */}
                    <div className="shrink-0 lg:mt-3">
                        <FilterPeriode
                            periode={data.periode}
                            nilai={periodeId}
                            onGanti={setPeriodeId}
                        />
                    </div>
                </div>

                {/* Membungkus, bukan menggulir mendatar. Dengan lima butir di
                    layar 375 px, `overflow-x-auto` menyembunyikan Pengaturan dan
                    Periode di luar tepi layar - persis "gerakan tersembunyi"
                    yang dilarang prinsip P1. Dua baris menampilkan semuanya. */}
                <nav className="flex flex-wrap gap-0.5 px-3 pb-2 lg:flex-col lg:pb-0">
                    {/* Butir yang tidak berhak dihapus dari DOM, bukan dinonaktifkan. */}
                    {NAV.filter((butir) => butir.peran.includes(peran)).map(
                        (butir) => {
                            const aktif = alamat.startsWith(butir.href);
                            const Ikon = butir.ikon;

                            return (
                                <Link
                                    key={butir.href}
                                    href={butir.href}
                                    aria-current={aktif ? 'page' : undefined}
                                    className={`flex min-h-13 shrink-0 items-center gap-2 rounded-lg px-3.5 text-base lg:gap-3 ${
                                        aktif
                                            ? 'bg-primary font-bold text-primary-foreground'
                                            : 'text-foreground'
                                    }`}
                                >
                                    <Ikon
                                        className="size-5 shrink-0"
                                        strokeWidth={2.5}
                                    />
                                    {butir.label}
                                </Link>
                            );
                        },
                    )}
                </nav>

                <div className="hidden lg:mt-auto lg:block">
                    <PemilihPeran
                        ruang="sisi"
                        peran={peran}
                        onGanti={setPeran}
                        onKeluar={() => {
                            setPeran(null);
                            navigate('/');
                        }}
                    />
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                {/* Tanpa jarak tepi sendiri: bilah kepala tiap layar
                    membentang penuh sampai tepi, dan `Halaman` yang memberi
                    pinggir pada isinya. */}
                <main className="min-w-0 flex-1">
                    <Layar
                        rute={rute}
                        peran={peran}
                        periodeId={periodeId}
                        onPindahPeriode={setPeriodeId}
                        tabLaporan={tabLaporan}
                        onGantiTabLaporan={setTabLaporan}
                        koreksi={koreksi}
                        tambahan={tambahan}
                        antrean={antrean}
                        onCobaKirim={() => setAntrean(undefined)}
                        onSimpanAnak={(anakId, patch) =>
                            setKoreksi((k) => ({ ...k, [anakId]: patch }))
                        }
                        onTambahAnak={(baru) =>
                            setTambahan((t) => [...t, baru])
                        }
                        ambang={ambang}
                        onSimpanAmbang={setAmbang}
                        standarisasi={standarisasi}
                        onSimpanStandarisasi={setStandarisasi}
                    />
                </main>

                {/* Di ponsel pemilih peran turun ke kaki halaman. Ia perkakas
                    demo, bukan navigasi, dan tidak pantas memakan 143 px di
                    puncak layar sebelum satu pun data terlihat. */}
                <div className="border-t border-border bg-sidebar lg:hidden">
                    <PemilihPeran
                        ruang="kaki"
                        peran={peran}
                        onGanti={setPeran}
                        onKeluar={() => {
                            setPeran(null);
                            navigate('/');
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Pemilih peran. Menetap di sidebar pada desktop dan di kaki halaman pada
 * ponsel, bukan tersembunyi di menu profil: saat demo, pemirsa harus melihat
 * sendiri peran yang sedang aktif.
 */
function PemilihPeran({
    ruang,
    peran,
    onGanti,
    onKeluar,
}: {
    /**
     * Membedakan salinan sidebar dari salinan kaki halaman. Keduanya ada di DOM
     * sekaligus - hanya CSS yang menyembunyikan salah satunya - jadi tanpa ini
     * keduanya berbagi satu `name` dan `id`: peramban memperlakukannya sebagai
     * satu grup radio dan salinan kedua membatalkan centang salinan pertama.
     */
    ruang: string;
    peran: Peran;
    onGanti: (p: Peran) => void;
    /** Mengembalikan peran ke null, yang memulangkan demo ke layar Masuk. */
    onKeluar: () => void;
}) {
    return (
        <div className="border-t border-border">
            <fieldset className="px-5 py-3">
                <legend className="text-sm font-semibold text-muted-foreground">
                    Masuk sebagai
                </legend>

                {/* Satu kelompok bersegmen seperti v2. Tombol radionya tetap
                tombol radio - hanya disembunyikan dari mata, bukan dari papan
                tombol maupun pembaca layar: panah kiri dan kanan tetap
                berpindah peran, dan keadaan terpilih tetap diumumkan. Tombol
                `aria-pressed` kehilangan keduanya. */}
                <div className="mt-2 flex overflow-hidden rounded-lg border border-border-strong bg-card">
                    {SEMUA.map((p) => (
                        <label
                            key={p}
                            htmlFor={`peran-${ruang}-${p}`}
                            className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center px-2 text-base has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${
                                peran === p
                                    ? 'bg-primary font-bold text-primary-foreground'
                                    : 'text-foreground'
                            }`}
                        >
                            <input
                                id={`peran-${ruang}-${p}`}
                                type="radio"
                                name={`peran-aktif-${ruang}`}
                                value={p}
                                checked={peran === p}
                                onChange={() => onGanti(p)}
                                className="sr-only"
                            />
                            {NAMA_PERAN[p]}
                        </label>
                    ))}
                </div>

                <p className="mt-2 text-sm text-pretty text-muted-foreground">
                    {KETERANGAN_PERAN[peran]}
                </p>
            </fieldset>

            {/* Keluar berdiri terpisah dari pemilih peran, dipisah garis:
            berpindah peran itu perkakas demo, keluar itu meninggalkan
            aplikasi — dua hal yang tidak boleh tertukar saat diklik. */}
            <div className="border-t border-border px-5 py-3">
                <button
                    type="button"
                    onClick={onKeluar}
                    className="tombol-kedua w-full"
                >
                    <LogOut className="size-5" strokeWidth={2.5} />
                    Keluar
                </button>
            </div>
        </div>
    );
}

/**
 * Anak baru menjadi satu baris daftar.
 *
 * Id-nya negatif supaya tidak pernah bentrok dengan id dari arsip, dan
 * seketika terbaca sebagai "belum ada di basis data" saat menelusuri.
 * Umurnya dihitung terhadap tanggal kegiatan periode yang sedang dilihat,
 * bukan hari ini — sama seperti baris lainnya.
 */
function keBaris(
    baru: AnakBaru,
    urutan: number,
    periode: Periode | null,
): BarisAnak {
    return {
        anakId: -1 - urutan,
        nama: baru.nama,
        nik: null,
        nikLengkap: false,
        jk: baru.jk,
        umurBulan: umurBulanPada(
            baru.tglLahir,
            periode?.tanggalKegiatan ?? null,
        ),
        rt: baru.rt,
        namaOrtu: baru.namaOrtu === '' ? null : baru.namaOrtu,
        tanggalUkurTerakhir: null,
        kategoriGizi: null,
        perluPerhatian: false,
        // Belum pernah ditimbang: null, bukan nol (DR-04).
        bbKg: null,
        tinggiCm: null,
    };
}

/** Koreksi editor baris ditempelkan di atas baris arsipnya. */
function terapkanKoreksi(
    baris: BarisAnak,
    patch: PatchAnak | undefined,
): BarisAnak {
    if (patch === undefined) {
        return baris;
    }

    return {
        ...baris,
        nama: patch.nama === '' ? null : patch.nama,
        nik: patch.nik === '' ? null : patch.nik,
        nikLengkap: patch.nik.replace(/\D/g, '').length === 16,
        namaOrtu: patch.namaOrtu === '' ? null : patch.namaOrtu,
        rt: patch.rt === '' ? null : patch.rt,
        bbKg: patch.bbKg,
        tinggiCm: patch.tinggiCm,
    };
}

type LayarProps = {
    rute: Rute;
    peran: Peran;
    periodeId: string;
    onPindahPeriode: (id: string) => void;
    koreksi: Record<number, PatchAnak>;
    tambahan: AnakBaru[];
    antrean?: { jumlah: number; sejak: string };
    onCobaKirim: () => void;
    onSimpanAnak: (anakId: number, patch: PatchAnak) => void;
    onTambahAnak: (baru: AnakBaru) => void;
    ambang: Ambang;
    onSimpanAmbang: (nilai: Ambang) => void;
    standarisasi: StandarisasiAntropometri;
    onSimpanStandarisasi: (nilai: StandarisasiAntropometri) => void;
    tabLaporan: TabPeriode;
    onGantiTabLaporan: (tab: TabPeriode) => void;
};

/**
 * Pemasok props tiap halaman — inilah yang nanti digantikan controller.
 *
 * Layar diisi bertahap mengikuti bagian 12: Beranda di T3, Data Anak dan Detail
 * anak di T4, Laporan di T5, Pengaturan dan Periode di T6.
 */
function Layar({
    rute,
    peran,
    periodeId,
    onPindahPeriode,
    tabLaporan,
    onGantiTabLaporan,
    koreksi,
    tambahan,
    antrean,
    onCobaKirim,
    onSimpanAnak,
    onTambahAnak,
    ambang,
    onSimpanAmbang,
    standarisasi,
    onSimpanStandarisasi,
}: LayarProps) {
    const periode = cariPeriode(periodeId);

    if (rute.nama === 'beranda' && periode !== null) {
        return (
            <Dashboard
                periode={periode}
                ringkasan={ringkasan(periodeId)}
                statusGizi={statusGizi(periodeId)}
                cakupanEnamBulan={cakupanEnamBulan()}
                perluPerhatian={perluPerhatian(periodeId)}
                periodeTerisi={periodeTerakhirTerisi()}
                belumTerkirim={antrean}
                onCobaKirim={onCobaKirim}
                onPindahPeriode={onPindahPeriode}
            />
        );
    }

    if (rute.nama === 'balita' && periode !== null) {
        // Baris arsip dulu dengan koreksinya, lalu anak yang baru ditambah.
        // Anak baru berada di bawah dengan sengaja: ia satu-satunya baris tanpa
        // status gizi, dan menaruhnya di puncak daftar terbaca seperti galat.
        const baris = daftarAnak(periodeId)
            .map((b) => terapkanKoreksi(b, koreksi[b.anakId]))
            .concat(tambahan.map((t, i) => keBaris(t, i, periode)));

        return (
            <DaftarAnak
                anak={baris}
                wilayahRt={daftarRt()}
                rw={data.meta.rw}
                peran={peran}
                rtTerkunci={peran === 'kader' ? RT_KADER : null}
                periode={periode}
                standarLms={standarLms}
                onSimpanAnak={onSimpanAnak}
                onTambahAnak={onTambahAnak}
            />
        );
    }

    if (rute.nama === 'layanan') {
        return (
            <LayananPosyandu
                sasaran={data.anak.map((anak) => {
                    const terbaru = detailAnak(anak.id)?.pengukuran[0] ?? null;

                    return {
                        id: anak.id,
                        nama: anak.nama,
                        nik: anak.nik,
                        nikLengkap: anak.nikLengkap,
                        namaIbu: anak.namaOrtu,
                        nikOrtu: anak.nikOrtu,
                        rt: anak.rt,
                        umur:
                            terbaru?.umurBulan === null ||
                            terbaru?.umurBulan === undefined
                                ? 'umur belum tersedia'
                                : `${terbaru.umurBulan} bulan`,
                        tglLahir: anak.tglLahir,
                        jk: anak.jk,
                        anakKe: anak.anakKe,
                        bbLahirKg: anak.bbLahirKg,
                        pbLahirCm: anak.pbLahirCm,
                        bukuKia: anak.bukuKia,
                        imd: anak.imd,
                        imunisasiLengkap: null,
                        beratTerakhir: terbaru?.bbKg ?? null,
                        tanggalUkurTerakhir: terbaru?.tanggalUkur ?? null,
                    };
                })}
            />
        );
    }

    if (rute.nama === 'detail' && periode !== null) {
        const detail = detailAnak(rute.id);

        if (detail === null) {
            return <Segera nama="detail anak tidak ditemukan" />;
        }

        return (
            // Di-key menurut anak: tanpa ini React memakai ulang instance yang
            // sama saat berpindah anak, sehingga panel umur kurva KMS dan baris
            // riwayat yang tersorot masih milik anak sebelumnya.
            <DetailAnak
                key={detail.anak.id}
                anak={detail.anak}
                pengukuran={detail.pengukuran}
                garisSd={detail.garisSd}
                peran={peran}
                // Tanpa periode, layar ini diam-diam menampilkan pengukuran
                // terakhir kapan pun itu - 22 dari 123 anak terakhir ditimbang
                // sebelum Juni - sementara pemilih periode di sidebar berkata
                // lain.
                periode={periode}
                ambang={ambang}
            />
        );
    }

    if (rute.nama === 'laporan' && periode !== null) {
        // Tab Tahunan menjumlahkan seluruh periode, sedangkan Bulanan memakai
        // periode yang dipilih.
        const periodeDipakai =
            tabLaporan === 'tahunan'
                ? data.periode.map((p) => p.id)
                : [periodeId];
        const rekap = rekapPerRt(periodeDipakai);

        return (
            <Laporan
                periode={periode}
                tab={tabLaporan}
                onGantiTab={onGantiTabLaporan}
                rekapPerRt={rekap.baris}
                total={rekap.total}
                wilayahRt={daftarRt()}
                rw={data.meta.rw}
                kelurahan={data.meta.kelurahan}
                jumlahPeriode={periodeDipakai.length}
                peran={peran}
                periodeTerisi={periodeTerakhirTerisi()}
                onPindahPeriode={onPindahPeriode}
                onUnduhCsv={() =>
                    unduhBerkas(
                        `posyandu-tulip-${tabLaporan === 'tahunan' ? '2026' : periodeId}.csv`,
                        csvLaporan(periodeDipakai),
                    )
                }
            />
        );
    }

    if (rute.nama === 'sasaran') {
        return <SasaranImpor />;
    }

    if (rute.nama === 'kartu-sasaran') {
        return (
            <KartuSasaran
                sasaran={data.anak.map((anak) => ({
                    id: anak.id,
                    nama: anak.nama,
                    nik: anak.nik,
                    namaIbu: anak.namaOrtu,
                    tglLahir: anak.tglLahir ?? 'Tanggal lahir belum dicatat',
                    rt: anak.rt,
                }))}
                terpilihAwal={rute.id}
            />
        );
    }

    if (rute.nama === 'pengaturan') {
        return (
            <Pengaturan
                ambang={ambang}
                standarisasi={standarisasi}
                onSimpan={onSimpanAmbang}
                onSimpanStandarisasi={onSimpanStandarisasi}
                standarVersi={data.meta.versiStandar}
                barisStandar={data.meta.barisStandar}
                terakhirDiubah={PENGATURAN_TERAKHIR_DIUBAH}
            />
        );
    }

    if (rute.nama === 'periode') {
        return (
            <DaftarPeriode
                periode={daftarPeriode()}
                periodeAktif={periodeId}
                onPilih={(id) => {
                    onPindahPeriode(id);
                    navigate('/beranda');
                }}
            />
        );
    }

    return <Segera nama={rute.nama} />;
}

function Segera({ nama }: { nama: string }) {
    return (
        <div className="rounded-lg border border-border bg-surface-subtle p-6">
            <p className="text-base font-bold">Layar {nama}</p>
            <p className="mt-1 text-base text-muted-foreground">
                Belum dibangun. Kerangka, menu, dan pergantian peran sudah
                berjalan.
            </p>
        </div>
    );
}
