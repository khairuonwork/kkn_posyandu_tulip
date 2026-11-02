import {
    AlertTriangle,
    BookOpen,
    Check,
    CheckCircle2,
    CircleHelp,
    FileCheck2,
    FileSpreadsheet,
    Filter,
    Pencil,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    Upload,
    UserRoundPlus,
    UsersRound,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BantuanDetail from '@/components/bantuan-detail';
import DialogGagal from '@/components/dialog-gagal';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';

import { Link } from '@/lib/nav';
import type {
    CalonSasaran,
    HasilImpor,
    PeriodeSasaran,
    RingkasanResetHariIni,
    SasaranAktif,
    SheetSasaran,
    StatusSasaran,
} from '@/lib/sasaran';
import {
    ambilPeriodeSasaran,
    ambilSasaran,
    cariCalonSasaran,
    gantiSasaran,
    perbaruiSasaran,
    periksaFileSasaran,
    pratinjauResetHariIni,
    resetPengukuranHariIni,
    tambahAnakKeSasaran,
} from '@/lib/sasaran';

type Tahap = 'kosong' | 'memeriksa' | 'siap' | 'mengimpor' | 'selesai';

export type SasaranImporProps = {
    sasaranAwal?: SasaranAktif;
    periodeAwal?: PeriodeSasaran[];
    wilayahRt?: string[];
};

const LABEL_STATUS: Record<StatusSasaran, string> = {
    menunggu: 'Belum dilayani',
    selesai: 'Selesai ditimbang',
    tidak_hadir: 'Tidak hadir',
    pindah: 'Pindah domisili',
    batal: 'Dibatalkan',
};

const WARNA_STATUS: Record<StatusSasaran, string> = {
    menunggu: 'bg-amber-100 text-amber-900 border border-amber-300',
    selesai: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
    tidak_hadir: 'bg-slate-100 text-slate-700 border border-slate-300',
    pindah: 'bg-rose-100 text-rose-900 border border-rose-300',
    batal: 'bg-slate-100 text-slate-600 border border-slate-300',
};

function formatPeriode(kode: string | undefined): string {
    if (kode === undefined || kode === '') {
        return 'Belum dipilih';
    }

    const [tahun, bulan] = kode.split('-').map(Number);

    if (!tahun || !bulan) {
        return kode;
    }

    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(tahun, bulan - 1, 1));
}

function periodeJakartaSekarang(): string {
    const bagian = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(new Date());
    const nilai = Object.fromEntries(
        bagian.map((item) => [item.type, item.value]),
    );

    return `${nilai.year}-${nilai.month}`;
}

export default function SasaranImpor({
    sasaranAwal,
    periodeAwal = [],
    wilayahRt = [],
}: SasaranImporProps = {}) {
    const [sasaran, setSasaran] = useState<SasaranAktif | null>(
        sasaranAwal ?? null,
    );
    const [statusMuat, setStatusMuat] = useState<'memuat' | 'siap' | 'galat'>(
        sasaranAwal ? 'siap' : 'memuat',
    );
    const [bantuanTerbuka, setBantuanTerbuka] = useState(false);
    const tombolBantuan = useRef<HTMLButtonElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isiBase64, setIsiBase64] = useState('');
    const [sheets, setSheets] = useState<SheetSasaran[]>([]);
    const [sheetDipilih, setSheetDipilih] = useState('');
    const [tahap, setTahap] = useState<Tahap>('kosong');
    const [galat, setGalat] = useState('');
    const aksiUlang = useRef<(() => Promise<void>) | null>(null);
    const [hasil, setHasil] = useState<HasilImpor | null>(null);
    const [cari, setCari] = useState('');
    const [rtDipilih, setRtDipilih] = useState<string>('semua');
    const [pesanMutasi, setPesanMutasi] = useState('');
    const [tambahTerbuka, setTambahTerbuka] = useState(false);
    const [cariCalon, setCariCalon] = useState('');
    const [calon, setCalon] = useState<CalonSasaran[]>([]);
    const [memuatCalon, setMemuatCalon] = useState(false);
    const [anakDitambahkan, setAnakDitambahkan] = useState<number | null>(null);
    const [editId, setEditId] = useState<number | null>(null);
    const [editStatus, setEditStatus] = useState<StatusSasaran>('menunggu');
    const [editCatatan, setEditCatatan] = useState('');
    const [menyimpanEdit, setMenyimpanEdit] = useState(false);
    const [periodeDitampilkan, setPeriodeDitampilkan] = useState(
        sasaranAwal?.periode?.periode ?? '',
    );
    const [pilihanPeriode, setPilihanPeriode] = useState<PeriodeSasaran[]>(
        periodeAwal.length > 0
            ? periodeAwal
            : sasaranAwal?.periode
              ? [sasaranAwal.periode]
              : [],
    );
    const [pratinjauReset, setPratinjauReset] =
        useState<RingkasanResetHariIni | null>(null);
    const [memuatPratinjauReset, setMemuatPratinjauReset] = useState(false);
    const [konfirmasiReset, setKonfirmasiReset] = useState('');
    const [menjalankanReset, setMenjalankanReset] = useState(false);

    const muat = useCallback(
        async (periode?: string) => {
            try {
                setStatusMuat('memuat');
                setGalat('');
                const data = await ambilSasaran(periode || undefined);

                if (!data || !Array.isArray(data.items)) {
                    throw new Error(
                        'Data sasaran API kosong atau tidak valid.',
                    );
                }

                const resPeriode = await ambilPeriodeSasaran().catch(() => []);
                const listPeriode =
                    Array.isArray(resPeriode) && resPeriode.length > 0
                        ? resPeriode
                        : data.periode
                          ? [data.periode]
                          : [];
                setSasaran(data);
                setPilihanPeriode(listPeriode);
                setPeriodeDitampilkan(data.periode?.periode ?? '');
                setStatusMuat('siap');
            } catch (error) {
                if (sasaranAwal) {
                    const targetPeriode =
                        periode ?? sasaranAwal.periode?.periode ?? '';
                    const targetItem =
                        Array.isArray(periodeAwal) &&
                        periodeAwal.length > 0 &&
                        targetPeriode
                            ? (periodeAwal.find(
                                  (p) => p.periode === targetPeriode,
                              ) ?? sasaranAwal.periode)
                            : sasaranAwal.periode;
                    setSasaran({
                        ...sasaranAwal,
                        periode: targetItem,
                    });
                    setPilihanPeriode(
                        Array.isArray(periodeAwal) && periodeAwal.length > 0
                            ? periodeAwal
                            : sasaranAwal.periode
                              ? [sasaranAwal.periode]
                              : [],
                    );
                    setPeriodeDitampilkan(targetPeriode);
                    setStatusMuat('siap');

                    return;
                }

                setGalat(
                    error instanceof Error
                        ? error.message
                        : 'Daftar sasaran tidak dapat dimuat.',
                );
                setStatusMuat('galat');
            }
        },
        [sasaranAwal, periodeAwal],
    );

    useEffect(() => {
        void Promise.resolve().then(() =>
            muat(periodeDitampilkan || undefined),
        );
    }, [muat, periodeDitampilkan]);

    const sheetAktif = sheets.find((item) => item.sheet === sheetDipilih);

    const daftarRtTersedia = useMemo(() => {
        if (wilayahRt.length > 0) {
            return wilayahRt;
        }

        const setRt = new Set<string>();

        for (const item of sasaran?.items ?? []) {
            if (item.rt) {
                setRt.add(item.rt);
            }
        }

        return Array.from(setRt).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );
    }, [sasaran, wilayahRt]);

    const daftarTersaring = useMemo(() => {
        const q = cari.trim().toLocaleLowerCase('id-ID');
        let daftar = sasaran?.items ?? [];

        if (rtDipilih !== 'semua') {
            daftar = daftar.filter((item) => (item.rt ?? '') === rtDipilih);
        }

        if (q === '') {
            return daftar;
        }

        return daftar.filter(
            (item) =>
                item.nama.toLocaleLowerCase('id-ID').includes(q) ||
                (item.nik ?? '').includes(q) ||
                (item.namaOrtu ?? '').toLocaleLowerCase('id-ID').includes(q) ||
                item.kodeKartu.toLocaleLowerCase('id-ID').includes(q),
        );
    }, [cari, rtDipilih, sasaran]);

    const periksa = async () => {
        aksiUlang.current = periksa;

        if (file === null) {
            return;
        }

        try {
            setGalat('');
            setHasil(null);
            setTahap('memeriksa');
            const data = await periksaFileSasaran(file);
            setIsiBase64(data.isiBase64);
            setSheets(data.sheets);
            const terbaru = [...data.sheets].sort((a, b) =>
                b.periode.localeCompare(a.periode),
            )[0];
            setSheetDipilih(terbaru?.sheet ?? '');
            setTahap('siap');
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'File Excel tidak dapat diperiksa.',
            );
            setTahap('kosong');
        }
    };

    const terbitkan = async () => {
        aksiUlang.current = terbitkan;

        if (file === null || sheetAktif === undefined || isiBase64 === '') {
            return;
        }

        const lama =
            sasaran?.periode?.periode === sheetAktif.periode
                ? sasaran.ringkasan.total
                : 0;
        const jumlahDiterbitkan =
            sheetAktif.jumlahBaris - sheetAktif.jumlahDitahan;
        const catatanDuplikat =
            sheetAktif.jumlahDitahan > 0
                ? ` ${sheetAktif.jumlahDitahan} baris dengan NIK duplikat akan ditahan dan tidak diterbitkan.`
                : '';
        const pesan =
            lama > 0
                ? `Ganti ${lama} sasaran ${formatPeriode(sheetAktif.periode)} dengan maksimal ${jumlahDiterbitkan} baris dari ${file.name}?${catatanDuplikat} Master anak dan riwayat pengukuran tidak akan dihapus.`
                : `Terbitkan maksimal ${jumlahDiterbitkan} sasaran ${formatPeriode(sheetAktif.periode)} ke perangkat Android?${catatanDuplikat}`;

        if (!window.confirm(pesan)) {
            return;
        }

        try {
            setGalat('');
            setTahap('mengimpor');
            const selesai = await gantiSasaran(
                file.name,
                isiBase64,
                sheetAktif.sheet,
            );
            setHasil(selesai);
            setTahap('selesai');
            setPeriodeDitampilkan(selesai.periode);
            await muat(selesai.periode);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Sasaran tidak dapat diganti.',
            );
            setTahap('siap');
        }
    };

    const cariAnakMaster = async () => {
        aksiUlang.current = cariAnakMaster;

        if (!sasaran?.periode || cariCalon.trim().length < 2) {
            return;
        }

        try {
            setGalat('');
            setMemuatCalon(true);
            setCalon(
                await cariCalonSasaran(sasaran.periode.id, cariCalon.trim()),
            );
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Anak tidak dapat dicari.',
            );
        } finally {
            setMemuatCalon(false);
        }
    };

    const tambahAnak = async (item: CalonSasaran) => {
        aksiUlang.current = () => tambahAnak(item);

        if (!sasaran?.periode) {
            return;
        }

        try {
            setGalat('');
            setPesanMutasi('');
            setAnakDitambahkan(item.anakId);
            const hasilTambah = await tambahAnakKeSasaran(
                sasaran.periode.id,
                item.anakId,
            );
            setPesanMutasi(
                `${item.nama} ditambahkan ke sasaran${hasilTambah.sudahDiukur ? ' dan sudah memiliki pengukuran pada periode ini' : ''}.`,
            );
            setCalon((daftar) =>
                daftar.filter((anak) => anak.anakId !== item.anakId),
            );
            await muat(sasaran.periode.periode);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Anak tidak dapat ditambahkan.',
            );
        } finally {
            setAnakDitambahkan(null);
        }
    };

    const mulaiEdit = (item: SasaranAktif['items'][number]) => {
        setEditId(item.id);
        setEditStatus(item.status);
        setEditCatatan(item.catatan ?? '');
        setGalat('');
        setPesanMutasi('');
    };

    const simpanEdit = async () => {
        aksiUlang.current = simpanEdit;

        if (editId === null) {
            return;
        }

        try {
            setGalat('');
            setMenyimpanEdit(true);
            await perbaruiSasaran(editId, editStatus, editCatatan);
            setPesanMutasi('Status dan catatan sasaran berhasil diperbarui.');
            setEditId(null);
            await muat(sasaran?.periode?.periode);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Perubahan tidak dapat disimpan.',
            );
        } finally {
            setMenyimpanEdit(false);
        }
    };

    const bukaPratinjauReset = async () => {
        aksiUlang.current = bukaPratinjauReset;

        if (!sasaran?.periode) {
            return;
        }

        try {
            setGalat('');
            setMemuatPratinjauReset(true);
            setKonfirmasiReset('');
            setPratinjauReset(await pratinjauResetHariIni(sasaran.periode.id));
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Pratinjau reset tidak dapat dimuat.',
            );
        } finally {
            setMemuatPratinjauReset(false);
        }
    };

    const jalankanResetHariIni = async () => {
        aksiUlang.current = jalankanResetHariIni;

        if (
            !sasaran?.periode ||
            !pratinjauReset ||
            konfirmasiReset !== 'RESET HARI INI'
        ) {
            return;
        }

        try {
            setGalat('');
            setMenjalankanReset(true);
            const hasilReset = await resetPengukuranHariIni(
                sasaran.periode.id,
                pratinjauReset.jumlahPengukuran,
                pratinjauReset.jumlahAntrean,
            );
            setPratinjauReset(null);
            setKonfirmasiReset('');
            setPesanMutasi(
                `${hasilReset.jumlahPengukuran} hasil ukur dihapus dan ${hasilReset.jumlahAntrean} antrean hari ini dihapus. Nomor antrean berikutnya kembali ke 1. ${hasilReset.jumlahAnak} sasaran tanpa riwayat lain kembali ke status belum dilayani.`,
            );
            await muat(sasaran.periode.periode);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Hasil ukur hari ini tidak dapat direset.',
            );
        } finally {
            setMenjalankanReset(false);
        }
    };

    return (
        <Halaman
            ikon={Upload}
            judul="Sasaran & Impor Data Posyandu"
            aksi={
                <button
                    type="button"
                    ref={tombolBantuan}
                    aria-expanded={bantuanTerbuka}
                    aria-controls="bantuan-detail"
                    className="tombol-kedua"
                    onClick={() => setBantuanTerbuka(!bantuanTerbuka)}
                >
                    <CircleHelp className="size-4" aria-hidden="true" />
                    Bantuan
                </button>
            }
            subjudul="Kelola daftar sasaran bulanan dan penerbitan ke tablet Android Meja 1 tanpa menghapus master Data Balita atau arsip riwayat penimbangan."
        >
            <div
                className={
                    bantuanTerbuka
                        ? 'detail-area bantuan-terbuka'
                        : 'detail-area'
                }
            >
                <div className="detail-utama w-full space-y-6">
                    {/* Pesan Galat & Notifikasi Mutasi */}
                    {galat !== '' && statusMuat !== 'galat' && (
                        <DialogGagal
                            judul={
                                pratinjauReset !== null
                                    ? 'Data belum berhasil dihapus'
                                    : editId !== null
                                      ? 'Perubahan belum tersimpan'
                                      : 'Proses belum berhasil'
                            }
                            pesan={galat}
                            onTutup={() => setGalat('')}
                            onCobaLagi={() => {
                                setGalat('');
                                void aksiUlang.current?.();
                            }}
                        />
                    )}
                    {pesanMutasi !== '' && (
                        <p
                            role="status"
                            className="rounded-lg bg-tone-green-bg px-4 py-3 text-sm font-semibold text-tone-green shadow-xs"
                        >
                            {pesanMutasi}
                        </p>
                    )}

                    {/* Section 1: Panel Unggah & Pratinjau Excel Puskesmas */}
                    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <div className="border-b border-border bg-surface-subtle px-5 py-5 sm:px-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                                        Unggah atau Ganti Sasaran Bulanan
                                        (.xlsx)
                                    </h2>
                                    <p className="mt-1 max-w-[74ch] text-sm text-muted-foreground">
                                        Sistem mencari header setiap sheet
                                        secara otomatis, sehingga format sheet
                                        dari berbagai Puskesmas tetap dapat
                                        terbaca akurat.
                                    </p>
                                </div>
                                <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold text-muted-foreground">
                                    Maks. 3 MB
                                </span>
                            </div>
                        </div>

                        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_380px]">
                            <div>
                                <label
                                    htmlFor="berkas-sasaran"
                                    className="group flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-strong bg-surface px-5 py-6 text-center transition-all focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:border-primary hover:bg-surface-subtle"
                                >
                                    <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                                        <FileSpreadsheet
                                            className="size-7"
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="mt-3 text-base font-extrabold text-foreground group-hover:text-primary">
                                        {file?.name ??
                                            'Pilih atau Tarik Berkas Excel Puskesmas ke Sini'}
                                    </span>
                                    <span className="mt-1 max-w-sm text-xs text-muted-foreground">
                                        Format .xlsx resmi Puskesmas / e-PPGBM ·
                                        maksimum 3 MB · diperiksa sebelum data
                                        diganti
                                    </span>
                                    <input
                                        id="berkas-sasaran"
                                        type="file"
                                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        onChange={(event) => {
                                            setFile(
                                                event.target.files?.[0] ?? null,
                                            );
                                            setIsiBase64('');
                                            setSheets([]);
                                            setSheetDipilih('');
                                            setTahap('kosong');
                                            setHasil(null);
                                            setGalat('');
                                        }}
                                        className="sr-only"
                                    />
                                </label>
                                <div className="mt-4 flex flex-wrap items-center gap-3">
                                    <button
                                        type="button"
                                        disabled={
                                            file === null ||
                                            tahap === 'memeriksa' ||
                                            tahap === 'mengimpor'
                                        }
                                        onClick={() => void periksa()}
                                        className="tombol-utama px-5 py-2.5 text-sm font-bold shadow-sm"
                                    >
                                        {tahap === 'memeriksa' ? (
                                            <RefreshCw
                                                className="size-4 animate-spin"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <FileCheck2
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}
                                        {tahap === 'memeriksa'
                                            ? 'Memeriksa berkas Excel…'
                                            : 'Periksa Isi Excel Puskesmas'}
                                    </button>
                                    {file && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFile(null);
                                                setIsiBase64('');
                                                setSheets([]);
                                                setSheetDipilih('');
                                                setTahap('kosong');
                                            }}
                                            className="text-xs font-bold text-muted-foreground hover:text-tone-red"
                                        >
                                            Batal pilih berkas
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Kotak Edukasi Perlindungan Data */}
                            <aside className="flex flex-col justify-between rounded-2xl bg-[#0c5333] p-5 text-white shadow-sm">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck
                                            className="size-5 text-emerald-300"
                                            aria-hidden="true"
                                        />
                                        <h3 className="text-base font-extrabold tracking-wide">
                                            Perlindungan Data Posyandu
                                        </h3>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-white/80">
                                        Apa yang terjadi saat sasaran bulanan
                                        baru diterbitkan:
                                    </p>
                                    <ul className="mt-3.5 space-y-2.5 text-xs text-white/90">
                                        <li className="flex items-start gap-2">
                                            <Check className="mt-0.5 size-3.5 shrink-0 font-bold text-emerald-300" />
                                            <span>
                                                Daftar sasaran periode terpilih
                                                diperbarui ke aplikasi Android.
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="mt-0.5 size-3.5 shrink-0 font-bold text-emerald-300" />
                                            <span>
                                                Balita baru otomatis didaftarkan
                                                ke master Data Balita.
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="mt-0.5 size-3.5 shrink-0 font-bold text-emerald-300" />
                                            <span>
                                                Profil lama, kode kartu kendali,
                                                dan riwayat ukur tetap aman.
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <Check className="mt-0.5 size-3.5 shrink-0 font-bold text-emerald-300" />
                                            <span>
                                                Tablet Android Meja 1 langsung
                                                menerima daftar saat
                                                sinkronisasi.
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="mt-4 flex items-center gap-1.5 rounded-xl bg-black/20 p-2.5 text-[11px] text-white/75">
                                    <ShieldCheck
                                        className="size-3.5 shrink-0 text-emerald-400"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Aman: Riwayat penimbangan bulan-bulan
                                        lalu tidak akan hilang.
                                    </span>
                                </div>
                            </aside>
                        </div>

                        {/* Pratinjau Sheet Terbaca */}
                        {sheets.length > 0 && (
                            <div className="border-t border-border bg-surface-subtle/50 p-5 sm:p-6">
                                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                                    <div>
                                        <label
                                            htmlFor="sheet-sasaran"
                                            className="text-sm font-extrabold text-foreground"
                                        >
                                            Pilih sheet yang akan menjadi
                                            sasaran aktif:
                                        </label>
                                        <select
                                            id="sheet-sasaran"
                                            value={sheetDipilih}
                                            onChange={(event) =>
                                                setSheetDipilih(
                                                    event.target.value,
                                                )
                                            }
                                            className="mt-2 min-h-12 w-full rounded-xl border border-border-strong bg-surface px-3.5 text-base font-semibold outline-none focus:ring-2 focus:ring-ring"
                                        >
                                            {sheets.map((sheet) => (
                                                <option
                                                    key={sheet.sheet}
                                                    value={sheet.sheet}
                                                >
                                                    {sheet.labelPeriode} ·{' '}
                                                    {sheet.jumlahBaris} anak
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Ditemukan {sheets.length} sheet
                                            bulanan. Hanya sheet yang Anda pilih
                                            yang akan diterbitkan ke sistem.
                                        </p>
                                    </div>
                                    {sheetAktif !== undefined && (
                                        <dl className="grid grid-cols-3 gap-2.5 rounded-2xl border border-border bg-surface p-4 text-center shadow-xs">
                                            <div>
                                                <dt className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                                                    Terbaca
                                                </dt>
                                                <dd className="mt-1 text-xl font-extrabold text-foreground tabular-nums">
                                                    {sheetAktif.jumlahBaris}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-[11px] font-bold tracking-wider text-tone-green uppercase">
                                                    Siap
                                                </dt>
                                                <dd className="mt-1 text-xl font-extrabold text-tone-green tabular-nums">
                                                    {sheetAktif.jumlahSiap}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-[11px] font-bold tracking-wider text-tone-amber uppercase">
                                                    Verifikasi
                                                </dt>
                                                <dd className="mt-1 text-xl font-extrabold text-tone-amber tabular-nums">
                                                    {
                                                        sheetAktif.jumlahPerluVerifikasi
                                                    }
                                                </dd>
                                            </div>
                                        </dl>
                                    )}
                                </div>

                                {sheetAktif !== undefined &&
                                    sheetAktif.jumlahPerluVerifikasi > 0 && (
                                        <div className="mt-4 rounded-xl border border-amber-300 bg-tone-amber-bg p-4 text-sm text-tone-amber">
                                            <p className="flex items-start gap-2 font-bold">
                                                <AlertTriangle
                                                    className="mt-0.5 size-4 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {sheetAktif.jumlahDitahan >
                                                        0 && (
                                                        <>
                                                            {
                                                                sheetAktif.jumlahDitahan
                                                            }{' '}
                                                            baris dengan NIK
                                                            duplikat akan
                                                            ditahan dan tidak
                                                            diterbitkan.{' '}
                                                        </>
                                                    )}
                                                    {sheetAktif.jumlahPerluVerifikasi -
                                                        sheetAktif.jumlahDitahan}{' '}
                                                    baris lain dapat diterbitkan
                                                    tetapi akan ditandai untuk
                                                    ditinjau.
                                                </span>
                                            </p>
                                        </div>
                                    )}

                                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                                    <button
                                        type="button"
                                        onClick={() => void terbitkan()}
                                        disabled={
                                            sheetAktif === undefined ||
                                            tahap === 'mengimpor'
                                        }
                                        className="tombol-utama px-5 py-2.5 text-sm font-bold shadow-sm"
                                    >
                                        {tahap === 'mengimpor' ? (
                                            <RefreshCw
                                                className="size-4 animate-spin"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Upload
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        )}
                                        {tahap === 'mengimpor'
                                            ? 'Mengganti sasaran…'
                                            : 'Ganti dan Terbitkan Sasaran'}
                                    </button>
                                    <p className="text-xs text-muted-foreground">
                                        Kotak konfirmasi akan muncul sebelum
                                        daftar aktif diganti.
                                    </p>
                                </div>
                            </div>
                        )}

                        {hasil !== null && (
                            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-tone-green-bg px-5 py-4 text-tone-green sm:px-6">
                                <p className="flex items-center gap-2 font-bold">
                                    <CheckCircle2
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                    {hasil.jumlahSasaran} sasaran{' '}
                                    {hasil.labelPeriode} berhasil diterbitkan ke
                                    perangkat Android.
                                </p>
                                <p className="text-xs font-semibold">
                                    {hasil.anakBaru} anak baru ·{' '}
                                    {hasil.anakDiperbarui} diperbarui ·{' '}
                                    {hasil.perluVerifikasi} perlu verifikasi
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Section 2: Sasaran Aktif di Perangkat */}
                    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-surface-subtle px-5 py-5 sm:px-6">
                            <div>
                                <div className="flex items-center gap-2">
                                    <UsersRound
                                        className="size-5 text-primary"
                                        aria-hidden="true"
                                    />
                                    <h2 className="text-lg font-extrabold text-foreground sm:text-xl">
                                        Sasaran yang Aktif di Perangkat (Meja 1
                                        Pendaftaran)
                                    </h2>
                                </div>
                                <p className="mt-1 max-w-[72ch] text-sm text-muted-foreground">
                                    Tablet Android membaca daftar ini saat
                                    pendaftaran balita. Data Balita tetap
                                    menampilkan seluruh anak yang pernah
                                    terdaftar.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => void bukaPratinjauReset()}
                                    disabled={
                                        memuatPratinjauReset ||
                                        sasaran?.periode?.periode !==
                                            periodeJakartaSekarang()
                                    }
                                    className="tombol-kedua border-red-200 text-xs font-bold text-tone-red hover:bg-red-50"
                                    title="Khusus admin · hanya hasil ukur bertanggal hari ini pada periode aktif"
                                >
                                    {memuatPratinjauReset ? (
                                        <RefreshCw
                                            className="size-3.5 animate-spin"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Trash2
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                    )}
                                    Reset sesi hari ini
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTambahTerbuka((terbuka) => !terbuka);
                                        setCalon([]);
                                        setGalat('');
                                    }}
                                    className="tombol-utama text-xs font-bold"
                                >
                                    <UserRoundPlus
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Tambah anak dari master
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        void muat(
                                            periodeDitampilkan || undefined,
                                        )
                                    }
                                    disabled={statusMuat === 'memuat'}
                                    className="tombol-kedua text-xs font-bold"
                                >
                                    <RefreshCw
                                        className={`size-3.5 ${statusMuat === 'memuat' ? 'animate-spin' : ''}`}
                                        aria-hidden="true"
                                    />
                                    Muat ulang
                                </button>
                            </div>
                        </div>

                        {statusMuat === 'galat' && (
                            <StateHalaman
                                jenis="galat"
                                judul="Daftar sasaran belum dapat dimuat"
                                pesan="Periksa koneksi, lalu coba lagi."
                            >
                                <button
                                    type="button"
                                    onClick={() =>
                                        void muat(
                                            periodeDitampilkan || undefined,
                                        )
                                    }
                                    className="tombol-kedua text-xs"
                                >
                                    <RefreshCw
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Coba lagi
                                </button>
                            </StateHalaman>
                        )}

                        {statusMuat === 'memuat' && (
                            <StateHalaman
                                jenis="memuat"
                                judul="Memuat daftar sasaran…"
                            />
                        )}

                        {statusMuat === 'siap' && sasaran?.periode === null && (
                            <div className="state-halaman">
                                <span className="text-muted-foreground">
                                    <UsersRound
                                        className="size-10"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div>
                                    <h3 className="text-lg font-bold">
                                        Belum ada sasaran bulanan
                                    </h3>
                                    <p className="mt-1 max-w-[68ch] text-base text-muted-foreground">
                                        Periksa berkas Excel di atas, pilih
                                        sheet periode, lalu klik terbitkan.
                                        Tablet Android akan menerima daftar
                                        tersebut saat sinkronisasi berikutnya.
                                    </p>
                                </div>
                            </div>
                        )}

                        {statusMuat === 'siap' &&
                            sasaran !== null &&
                            sasaran.periode !== null && (
                                <>
                                    {/* Strip 5 Kartu Status Sasaran */}
                                    <div className="grid grid-cols-2 divide-x divide-y border-b border-border sm:grid-cols-5 sm:divide-y-0">
                                        {/* Kartu 1: Periode & Status Sesi */}
                                        <div className="col-span-2 flex flex-col justify-between bg-surface-subtle/30 p-4 sm:col-span-1 sm:p-5">
                                            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                Periode Sasaran
                                            </p>
                                            <select
                                                aria-label="Pilih periode daftar sasaran"
                                                value={periodeDitampilkan}
                                                onChange={(event) =>
                                                    void muat(
                                                        event.target.value,
                                                    )
                                                }
                                                className="isian mt-2 w-full max-w-full rounded-xl border-border-strong text-base font-extrabold capitalize"
                                            >
                                                {(Array.isArray(pilihanPeriode)
                                                    ? pilihanPeriode
                                                    : []
                                                ).map((item) => (
                                                    <option
                                                        key={item.id}
                                                        value={item.periode}
                                                    >
                                                        {formatPeriode(
                                                            item.periode,
                                                        )}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="mt-2.5">
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                                        sasaran?.periode
                                                            ?.sesiDitutupPada ===
                                                        null
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${
                                                            sasaran?.periode
                                                                ?.sesiDitutupPada ===
                                                            null
                                                                ? 'animate-pulse bg-emerald-600'
                                                                : 'bg-slate-500'
                                                        }`}
                                                    />
                                                    {sasaran?.periode
                                                        ?.sesiDitutupPada ===
                                                    null
                                                        ? 'Sesi Masih Terbuka'
                                                        : 'Sesi Sudah Ditutup'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Kartu 2: Total Sasaran */}
                                        <div className="flex flex-col justify-between p-4 sm:p-5">
                                            <div>
                                                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                    Total Sasaran
                                                </p>
                                                <p className="mt-1 text-2xl font-extrabold text-foreground tabular-nums sm:text-3xl">
                                                    {sasaran?.ringkasan.total ??
                                                        0}
                                                </p>
                                            </div>
                                            <p className="text-[11px] font-semibold text-muted-foreground">
                                                Semua anak terdaftar
                                            </p>
                                        </div>

                                        {/* Kartu 3: Belum Dilayani */}
                                        <div className="flex flex-col justify-between bg-amber-50/40 p-4 sm:p-5">
                                            <div>
                                                <p className="text-xs font-bold tracking-wider text-amber-900 uppercase">
                                                    Belum Dilayani
                                                </p>
                                                <p className="mt-1 text-2xl font-extrabold text-amber-900 tabular-nums sm:text-3xl">
                                                    {sasaran?.ringkasan
                                                        .menunggu ?? 0}
                                                </p>
                                            </div>
                                            <p className="text-[11px] font-semibold text-amber-800">
                                                Antrean di Meja 1
                                            </p>
                                        </div>

                                        {/* Kartu 4: Selesai Ditimbang */}
                                        <div className="flex flex-col justify-between bg-emerald-50/40 p-4 sm:p-5">
                                            <div>
                                                <p className="text-xs font-bold tracking-wider text-emerald-900 uppercase">
                                                    Selesai Ditimbang
                                                </p>
                                                <p className="mt-1 text-2xl font-extrabold text-emerald-900 tabular-nums sm:text-3xl">
                                                    {sasaran?.ringkasan
                                                        .selesai ?? 0}
                                                </p>
                                            </div>
                                            <p className="text-[11px] font-semibold text-emerald-800">
                                                Sudah lewat Meja 2–4
                                            </p>
                                        </div>

                                        {/* Kartu 5: Tidak Hadir / Pindah */}
                                        <div className="flex flex-col justify-between p-4 sm:p-5">
                                            <div>
                                                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                                    Tidak Hadir / Pindah
                                                </p>
                                                <p className="mt-1 text-2xl font-extrabold text-slate-700 tabular-nums sm:text-3xl">
                                                    {(sasaran?.ringkasan
                                                        .tidakHadir ?? 0) +
                                                        (sasaran?.ringkasan
                                                            .pindah ?? 0)}
                                                </p>
                                            </div>
                                            <p className="text-[11px] font-semibold text-muted-foreground">
                                                {sasaran?.ringkasan
                                                    .tidakHadir ?? 0}{' '}
                                                absen ·{' '}
                                                {sasaran?.ringkasan.pindah ?? 0}{' '}
                                                pindah
                                            </p>
                                        </div>
                                    </div>

                                    {/* Panel Form Tambah Anak dari Master */}
                                    {tambahTerbuka && (
                                        <div className="border-b border-border bg-emerald-50/50 p-5 sm:px-6">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <h3 className="font-extrabold text-foreground">
                                                        Tambahkan Balita dari
                                                        Master Data Balita
                                                    </h3>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Pilih balita yang sudah
                                                        ada di database untuk
                                                        dimasukkan ke daftar
                                                        sasaran bulan ini. Data
                                                        master dan riwayat
                                                        ukurnya tidak akan
                                                        diubah.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setTambahTerbuka(false)
                                                    }
                                                    className="tombol-kedua min-h-8 px-2.5 text-xs font-bold"
                                                    aria-label="Tutup pencarian anak"
                                                >
                                                    <X
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    Tutup
                                                </button>
                                            </div>
                                            <form
                                                className="mt-4 flex max-w-3xl flex-wrap gap-2"
                                                onSubmit={(event) => {
                                                    event.preventDefault();
                                                    void cariAnakMaster();
                                                }}
                                            >
                                                <label className="flex min-h-11 min-w-[240px] flex-1 items-center gap-3 rounded-xl border border-border-strong bg-surface px-3.5 focus-within:ring-2 focus-within:ring-ring">
                                                    <Search
                                                        className="size-4 text-muted-foreground"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="sr-only">
                                                        Cari anak di Data Balita
                                                    </span>
                                                    <input
                                                        value={cariCalon}
                                                        onChange={(event) =>
                                                            setCariCalon(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Ketik nama balita, NIK, atau nama ibu..."
                                                        className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                                                    />
                                                </label>
                                                <button
                                                    type="submit"
                                                    disabled={
                                                        memuatCalon ||
                                                        cariCalon.trim()
                                                            .length < 2
                                                    }
                                                    className="tombol-utama px-4 py-2 text-xs font-bold shadow-sm"
                                                >
                                                    {memuatCalon ? (
                                                        <RefreshCw
                                                            className="size-3.5 animate-spin"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <Search
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    Cari Balita
                                                </button>
                                            </form>

                                            {calon.length > 0 && (
                                                <ul className="mt-3 max-w-3xl divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                                                    {calon.map((item) => (
                                                        <li
                                                            key={item.anakId}
                                                            className="flex flex-wrap items-center justify-between gap-3 p-3.5"
                                                        >
                                                            <div>
                                                                <p className="text-sm font-bold text-foreground">
                                                                    {item.nama}
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                                    {item.nik ??
                                                                        'NIK belum tercatat'}{' '}
                                                                    · RT{' '}
                                                                    {item.rt} ·
                                                                    Ibu:{' '}
                                                                    {item.namaOrtu ??
                                                                        'Belum tercatat'}
                                                                </p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void tambahAnak(
                                                                        item,
                                                                    )
                                                                }
                                                                disabled={
                                                                    anakDitambahkan !==
                                                                    null
                                                                }
                                                                className="tombol-utama min-h-8 px-3 text-xs font-bold"
                                                            >
                                                                {anakDitambahkan ===
                                                                item.anakId ? (
                                                                    <RefreshCw
                                                                        className="size-3.5 animate-spin"
                                                                        aria-hidden="true"
                                                                    />
                                                                ) : (
                                                                    <UserRoundPlus
                                                                        className="size-3.5"
                                                                        aria-hidden="true"
                                                                    />
                                                                )}
                                                                Masukkan ke
                                                                Sasaran
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {/* Bilah Pencarian & Filter RT */}
                                    <div className="border-b border-border bg-surface-subtle/40 p-4 sm:px-6">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div className="flex max-w-md min-w-[280px] flex-1 items-center gap-3 rounded-xl border border-border-strong bg-surface px-3.5 py-2 shadow-2xs focus-within:ring-2 focus-within:ring-ring">
                                                <Search
                                                    className="size-4 shrink-0 text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                                <input
                                                    value={cari}
                                                    onChange={(event) =>
                                                        setCari(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Cari nama balita, NIK, nama ibu, atau kode SPT..."
                                                    className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                                                />
                                                {cari !== '' && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setCari('')
                                                        }
                                                        className="text-muted-foreground hover:text-foreground"
                                                        aria-label="Hapus kata kunci pencarian"
                                                    >
                                                        <X
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Filter RT Pills */}
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="mr-1 flex items-center gap-1 text-xs font-bold text-muted-foreground">
                                                    <Filter
                                                        className="size-3"
                                                        aria-hidden="true"
                                                    />
                                                    RT:
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setRtDipilih('semua')
                                                    }
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                                        rtDipilih === 'semua'
                                                            ? 'bg-primary text-white shadow-xs'
                                                            : 'border border-border bg-surface text-muted-foreground hover:bg-surface-subtle'
                                                    }`}
                                                >
                                                    Semua RT (
                                                    {sasaran?.items.length ?? 0}
                                                    )
                                                </button>
                                                {daftarRtTersedia.map((rt) => {
                                                    const hitungRt = (
                                                        sasaran?.items ?? []
                                                    ).filter(
                                                        (i) => i.rt === rt,
                                                    ).length;

                                                    return (
                                                        <button
                                                            key={rt}
                                                            type="button"
                                                            onClick={() =>
                                                                setRtDipilih(rt)
                                                            }
                                                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                                                rtDipilih === rt
                                                                    ? 'bg-primary text-white shadow-xs'
                                                                    : 'border border-border bg-surface text-muted-foreground hover:bg-surface-subtle'
                                                            }`}
                                                        >
                                                            RT {rt} ({hitungRt})
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Counter Live */}
                                        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                                            <p>
                                                Menampilkan{' '}
                                                <strong className="text-foreground">
                                                    {daftarTersaring.length}
                                                </strong>{' '}
                                                dari{' '}
                                                <strong className="text-foreground">
                                                    {sasaran?.items.length ?? 0}
                                                </strong>{' '}
                                                balita sasaran
                                                {rtDipilih !== 'semua' &&
                                                    ` · Saringan RT ${rtDipilih}`}
                                                {cari !== '' &&
                                                    ` · Kata kunci: "${cari}"`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tampilan Ponsel: Daftar Kartu Modern */}
                                    <div className="divide-y divide-border md:hidden">
                                        {daftarTersaring.map((item) => (
                                            <div
                                                key={item.id}
                                                className="space-y-3 p-4 transition-colors hover:bg-surface-subtle/50"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/balita/${item.anakId}`}
                                                            className="flex items-center gap-1.5 font-extrabold text-foreground underline-offset-4 hover:text-primary hover:underline"
                                                        >
                                                            <span className="truncate">
                                                                {item.nama}
                                                            </span>
                                                            <span
                                                                className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                                                                    item.jk ===
                                                                    'L'
                                                                        ? 'bg-blue-100 text-blue-800'
                                                                        : 'bg-pink-100 text-pink-800'
                                                                }`}
                                                            >
                                                                {item.jk === 'L'
                                                                    ? 'Laki-laki'
                                                                    : 'Perempuan'}
                                                            </span>
                                                        </Link>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {item.nik
                                                                ? `NIK: ${item.nik}`
                                                                : 'NIK perlu verifikasi'}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${WARNA_STATUS[item.status]}`}
                                                    >
                                                        {
                                                            LABEL_STATUS[
                                                                item.status
                                                            ]
                                                        }
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-subtle/60 p-3 text-xs text-muted-foreground">
                                                    <div>
                                                        <span className="block font-medium text-foreground">
                                                            Orang tua / Ibu
                                                        </span>
                                                        <span className="truncate font-semibold text-foreground">
                                                            {item.namaOrtu ??
                                                                'Belum tercatat'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block font-medium text-foreground">
                                                            Wilayah RT
                                                        </span>
                                                        <span className="font-semibold text-foreground">
                                                            RT {item.rt ?? '—'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block font-medium text-foreground">
                                                            Kode kartu kendali
                                                        </span>
                                                        <span className="font-mono font-bold text-foreground">
                                                            {item.kodeKartu}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-end justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                mulaiEdit(item)
                                                            }
                                                            className="tombol-kedua min-h-8 px-2.5 py-1 text-xs font-bold"
                                                            aria-label={`Edit sasaran ${item.nama}`}
                                                        >
                                                            <Pencil
                                                                className="mr-1 size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                            Ubah Status
                                                        </button>
                                                    </div>
                                                </div>

                                                {item.catatan !== null && (
                                                    <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-tone-amber-bg/60 p-2 text-xs font-medium text-tone-amber">
                                                        <AlertTriangle
                                                            className="mt-0.5 size-3.5 shrink-0"
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {item.catatan}
                                                        </span>
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Tampilan Desktop & Tablet Lebar: Tabel Lengkap */}
                                    <div className="hidden max-h-[520px] overflow-auto md:block">
                                        <table className="w-full min-w-[760px] text-left text-sm">
                                            <thead className="sticky top-0 z-[1] border-b border-border bg-surface-subtle text-muted-foreground">
                                                <tr>
                                                    <th className="px-6 py-3.5 font-extrabold text-foreground">
                                                        Balita
                                                    </th>
                                                    <th className="px-4 py-3.5 font-extrabold text-foreground">
                                                        Orang Tua / Ibu
                                                    </th>
                                                    <th className="px-4 py-3.5 font-extrabold text-foreground">
                                                        RT
                                                    </th>
                                                    <th className="px-4 py-3.5 font-extrabold text-foreground">
                                                        Kode Kartu
                                                    </th>
                                                    <th className="px-6 py-3.5 text-center font-extrabold text-foreground">
                                                        Status Kehadiran
                                                    </th>
                                                    <th className="px-4 py-3.5 text-right font-extrabold text-foreground">
                                                        Aksi
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {daftarTersaring.map((item) => (
                                                    <tr
                                                        key={item.id}
                                                        className="transition-colors hover:bg-surface-subtle/60"
                                                    >
                                                        <td className="px-6 py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <Link
                                                                    href={`/balita/${item.anakId}`}
                                                                    className="font-extrabold text-foreground underline-offset-4 hover:text-primary hover:underline"
                                                                >
                                                                    {item.nama}
                                                                </Link>
                                                                <span
                                                                    className={`py-0.2 rounded px-1.5 text-[10px] font-extrabold ${
                                                                        item.jk ===
                                                                        'L'
                                                                            ? 'bg-blue-100 text-blue-800'
                                                                            : 'bg-pink-100 text-pink-800'
                                                                    }`}
                                                                >
                                                                    {item.jk}
                                                                </span>
                                                            </div>
                                                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                                                {item.nik ??
                                                                    'NIK perlu verifikasi'}
                                                            </p>
                                                            {item.catatan !==
                                                                null && (
                                                                <p className="mt-1 max-w-[34rem] text-xs font-medium text-tone-amber">
                                                                    <AlertTriangle
                                                                        className="mr-1 inline size-3.5 align-[-2px]"
                                                                        aria-hidden="true"
                                                                    />
                                                                    {
                                                                        item.catatan
                                                                    }
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 font-medium text-foreground">
                                                            {item.namaOrtu ??
                                                                'Belum tercatat'}
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <span className="rounded-md bg-surface-subtle px-2 py-1 text-xs font-bold text-foreground">
                                                                RT{' '}
                                                                {item.rt ?? '—'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-foreground tabular-nums">
                                                            <span className="rounded border border-border bg-surface-subtle px-2 py-1">
                                                                {item.kodeKartu}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3.5 text-center">
                                                            <span
                                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-2xs ${WARNA_STATUS[item.status]}`}
                                                            >
                                                                {
                                                                    LABEL_STATUS[
                                                                        item
                                                                            .status
                                                                    ]
                                                                }
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    mulaiEdit(
                                                                        item,
                                                                    )
                                                                }
                                                                className="tombol-kedua min-h-8 px-3 text-xs font-bold shadow-2xs"
                                                                aria-label={`Ubah status sasaran ${item.nama}`}
                                                            >
                                                                <Pencil
                                                                    className="mr-1 size-3.5 text-muted-foreground"
                                                                    aria-hidden="true"
                                                                />
                                                                Ubah Status
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {daftarTersaring.length === 0 && (
                                        <div className="p-10 text-center text-sm text-muted-foreground">
                                            <Search className="mx-auto mb-2 size-8 text-muted-foreground/60" />
                                            <p className="font-bold text-foreground">
                                                Tidak ada balita sasaran yang
                                                cocok.
                                            </p>
                                            <p className="mt-1 text-xs">
                                                Coba sesuaikan kata kunci
                                                pencarian atau pilih tombol
                                                "Semua RT".
                                            </p>
                                        </div>
                                    )}

                                    {/* Modal / Panel Form Edit Status */}
                                    {editId !== null && (
                                        <div className="border-t border-border bg-amber-50/40 p-4 sm:px-6">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="font-extrabold text-foreground">
                                                        Ubah Status Kehadiran
                                                        Sasaran
                                                    </h3>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        Perubahan status hanya
                                                        berlaku untuk daftar
                                                        periode ini dan tidak
                                                        menghapus data master
                                                        anak.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditId(null)
                                                    }
                                                    className="tombol-kedua min-h-8 px-3 text-xs font-bold"
                                                >
                                                    <X
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />{' '}
                                                    Batal
                                                </button>
                                            </div>
                                            <div className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-end">
                                                <label className="text-xs font-bold text-foreground">
                                                    Status Kehadiran
                                                    <select
                                                        value={editStatus}
                                                        onChange={(event) =>
                                                            setEditStatus(
                                                                event.target
                                                                    .value as StatusSasaran,
                                                            )
                                                        }
                                                        className="mt-1 min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm font-semibold"
                                                    >
                                                        {(
                                                            Object.keys(
                                                                LABEL_STATUS,
                                                            ) as StatusSasaran[]
                                                        ).map((status) => (
                                                            <option
                                                                key={status}
                                                                value={status}
                                                            >
                                                                {
                                                                    LABEL_STATUS[
                                                                        status
                                                                    ]
                                                                }
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label className="text-xs font-bold text-foreground">
                                                    Catatan Kunjungan{' '}
                                                    <span className="font-normal text-muted-foreground">
                                                        (opsional)
                                                    </span>
                                                    <input
                                                        value={editCatatan}
                                                        maxLength={500}
                                                        onChange={(event) =>
                                                            setEditCatatan(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="Contoh: balita sedang sakit / orang tua ke luar kota"
                                                        className="mt-1 min-h-11 w-full rounded-xl border border-border-strong bg-surface px-3 text-sm font-medium"
                                                    />
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void simpanEdit()
                                                    }
                                                    disabled={menyimpanEdit}
                                                    className="tombol-utama px-4 py-2.5 text-xs font-bold shadow-sm"
                                                >
                                                    {menyimpanEdit ? (
                                                        <RefreshCw
                                                            className="size-3.5 animate-spin"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <CheckCircle2
                                                            className="size-3.5"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                    Simpan Status
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                    </section>

                    {/* Bilah Navigasi Langkah Antar Layar */}
                    <></>
                </div>
                <BantuanDetail
                    bagian="sasaran"
                    terbuka={bantuanTerbuka}
                    onTutup={() => {
                        setBantuanTerbuka(false);
                        tombolBantuan.current?.focus();
                    }}
                >
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-5 text-sky-950 shadow-sm sm:p-6">
                        <div className="flex items-start gap-3.5">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                                <BookOpen
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-extrabold text-sky-950 sm:text-lg">
                                        Panduan Ibu Kader: Alur Pengelolaan
                                        Sasaran Bulanan
                                    </h3>
                                    <span className="rounded-full bg-sky-200/80 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                                        Langkah Awal Posyandu
                                    </span>
                                </div>
                                <p className="mt-1 text-sm leading-relaxed text-sky-800">
                                    Sasaran bulanan adalah daftar balita yang
                                    dijadwalkan hadir untuk ditimbang. Gunakan
                                    alur 3 langkah berikut sebelum hari buka
                                    posyandu:
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-xs">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-sky-100 text-xs font-extrabold text-sky-800">
                                                1
                                            </span>
                                            <h4 className="text-xs font-extrabold tracking-wider text-sky-950 uppercase">
                                                Terima Berkas Excel
                                            </h4>
                                        </div>
                                        <p className="text-xs leading-normal text-sky-700">
                                            Minta berkas <code>.xlsx</code>{' '}
                                            sasaran dari Bidan Desa atau
                                            Puskesmas pada awal bulan.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-xs">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-sky-100 text-xs font-extrabold text-sky-800">
                                                2
                                            </span>
                                            <h4 className="text-xs font-extrabold tracking-wider text-sky-950 uppercase">
                                                Pilih Sheet & Terbitkan
                                            </h4>
                                        </div>
                                        <p className="text-xs leading-normal text-sky-700">
                                            Sistem membaca header otomatis.
                                            Pilih sheet bulan terkait lalu klik{' '}
                                            <em>Ganti dan Terbitkan</em>.
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-sky-200/80 bg-white/90 p-3.5 shadow-xs">
                                        <div className="mb-1.5 flex items-center gap-2">
                                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-sky-100 text-xs font-extrabold text-sky-800">
                                                3
                                            </span>
                                            <h4 className="text-xs font-extrabold tracking-wider text-sky-950 uppercase">
                                                Sinkronisasi Android
                                            </h4>
                                        </div>
                                        <p className="text-xs leading-normal text-sky-700">
                                            Kader Meja 1 tinggal menekan{' '}
                                            <em>Sinkronkan</em> pada tablet.
                                            Seluruh antrean balita otomatis siap
                                            dipanggil.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </BantuanDetail>
            </div>

            {/* Modal Dialog Reset Hari Ini */}
            {pratinjauReset !== null && galat === '' && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/55 p-4"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !menjalankanReset
                        ) {
                            setPratinjauReset(null);
                        }
                    }}
                >
                    <section
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="judul-reset-harian"
                        className="my-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl"
                    >
                        <div className="flex items-start gap-3">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tone-red-bg text-tone-red">
                                <AlertTriangle
                                    className="size-6"
                                    aria-hidden="true"
                                />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2
                                    id="judul-reset-harian"
                                    className="text-xl font-extrabold"
                                >
                                    Reset data sesi hari ini?
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Aksi admin ini akan menghapus{' '}
                                    <strong className="text-foreground">
                                        {pratinjauReset.jumlahPengukuran}{' '}
                                        catatan pengukuran
                                    </strong>{' '}
                                    bertanggal {pratinjauReset.tanggal} dari
                                    periode sasaran aktif beserta penilaian
                                    gizinya, lalu menghapus{' '}
                                    <strong className="text-foreground">
                                        {pratinjauReset.jumlahAntrean} antrean
                                        hari ini
                                    </strong>{' '}
                                    agar anak dapat check-in lagi dengan nomor
                                    antrean mulai dari 1. Sasaran tanpa catatan
                                    ukur periode lain akan kembali ke “Belum
                                    dilayani”.
                                </p>
                            </div>
                            <button
                                type="button"
                                aria-label="Tutup"
                                onClick={() => setPratinjauReset(null)}
                                disabled={menjalankanReset}
                                className="rounded-lg p-2 text-muted-foreground hover:bg-surface-subtle"
                            >
                                <X className="size-5" aria-hidden="true" />
                            </button>
                        </div>
                        {pratinjauReset.jumlahPengukuran +
                            pratinjauReset.jumlahAntrean >
                        0 ? (
                            <>
                                {pratinjauReset.namaAnak.length > 0 && (
                                    <div className="mt-4 max-h-32 overflow-y-auto rounded-lg bg-surface-subtle p-3 text-sm">
                                        {pratinjauReset.namaAnak.join(' · ')}
                                    </div>
                                )}
                                <p className="mt-4 text-sm font-semibold">
                                    Data master balita dan pengukuran tanggal
                                    lain tidak dihapus. Pastikan semua tablet
                                    sudah tersinkron.
                                </p>
                                <label
                                    className="mt-4 block text-sm font-semibold"
                                    htmlFor="konfirmasi-reset-harian"
                                >
                                    Ketik{' '}
                                    <code className="rounded bg-surface-subtle px-1.5 py-0.5">
                                        RESET HARI INI
                                    </code>{' '}
                                    untuk mengaktifkan reset.
                                </label>
                                <input
                                    id="konfirmasi-reset-harian"
                                    value={konfirmasiReset}
                                    onChange={(event) =>
                                        setKonfirmasiReset(event.target.value)
                                    }
                                    autoComplete="off"
                                    className="mt-2 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3"
                                />
                            </>
                        ) : (
                            <p className="mt-4 rounded-lg bg-tone-green-bg p-4 text-sm font-semibold text-tone-green">
                                Tidak ada hasil ukur maupun antrean hari ini di
                                periode sasaran aktif.
                            </p>
                        )}
                        <div className="mt-6 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPratinjauReset(null)}
                                disabled={menjalankanReset}
                                className="tombol-kedua"
                            >
                                Batal
                            </button>
                            {pratinjauReset.jumlahPengukuran +
                                pratinjauReset.jumlahAntrean >
                                0 && (
                                <button
                                    type="button"
                                    onClick={() => void jalankanResetHariIni()}
                                    disabled={
                                        menjalankanReset ||
                                        konfirmasiReset !== 'RESET HARI INI'
                                    }
                                    className="tombol-utama bg-tone-red text-white hover:bg-tone-red/90 disabled:opacity-50"
                                >
                                    {menjalankanReset ? (
                                        <RefreshCw
                                            className="size-4 animate-spin"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Trash2
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {menjalankanReset
                                        ? 'Mereset data…'
                                        : 'Reset data hari ini'}
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </Halaman>
    );
}
