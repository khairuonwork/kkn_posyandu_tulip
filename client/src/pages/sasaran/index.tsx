import {
    AlertTriangle,
    CheckCircle2,
    CreditCard,
    FileCheck2,
    FileSpreadsheet,
    Pencil,
    RefreshCw,
    Search,
    UserRoundPlus,
    Upload,
    UsersRound,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Halaman from '@/components/halaman';
import { Link } from '@/lib/nav';
import {
    ambilSasaran,
    ambilPeriodeSasaran,
    cariCalonSasaran,
    gantiSasaran,
    perbaruiSasaran,
    periksaFileSasaran,
    tambahAnakKeSasaran,
} from '@/lib/sasaran';
import type {
    CalonSasaran,
    HasilImpor,
    PeriodeSasaran,
    SasaranAktif,
    SheetSasaran,
    StatusSasaran,
} from '@/lib/sasaran';

type Tahap = 'kosong' | 'memeriksa' | 'siap' | 'mengimpor' | 'selesai';

const LABEL_STATUS = {
    menunggu: 'Belum dilayani',
    selesai: 'Selesai',
    tidak_hadir: 'Tidak hadir',
    pindah: 'Pindah',
    batal: 'Dibatalkan',
} as const;

const WARNA_STATUS = {
    menunggu: 'bg-tone-amber-bg text-tone-amber',
    selesai: 'bg-tone-green-bg text-tone-green',
    tidak_hadir: 'bg-surface-subtle text-muted-foreground',
    pindah: 'bg-tone-red-bg text-tone-red',
    batal: 'bg-surface-subtle text-muted-foreground',
} as const;

function formatPeriode(kode: string | undefined): string {
    if (kode === undefined) {
        return 'Belum dipilih';
    }

    const [tahun, bulan] = kode.split('-').map(Number);

    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(tahun, bulan - 1, 1));
}

export default function SasaranImpor() {
    const [sasaran, setSasaran] = useState<SasaranAktif | null>(null);
    const [statusMuat, setStatusMuat] = useState<'memuat' | 'siap' | 'galat'>(
        'memuat',
    );
    const [file, setFile] = useState<File | null>(null);
    const [isiBase64, setIsiBase64] = useState('');
    const [sheets, setSheets] = useState<SheetSasaran[]>([]);
    const [sheetDipilih, setSheetDipilih] = useState('');
    const [tahap, setTahap] = useState<Tahap>('kosong');
    const [galat, setGalat] = useState('');
    const [hasil, setHasil] = useState<HasilImpor | null>(null);
    const [cari, setCari] = useState('');
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
    const [periodeDitampilkan, setPeriodeDitampilkan] = useState('');
    const [pilihanPeriode, setPilihanPeriode] = useState<PeriodeSasaran[]>([]);

    const muat = useCallback(async (periode?: string) => {
        try {
            setStatusMuat('memuat');
            setGalat('');
            const data = await ambilSasaran(periode || undefined);
            const periodeTersedia = await ambilPeriodeSasaran().catch(() =>
                data.periode === null ? [] : [data.periode],
            );
            setSasaran(data);
            setPilihanPeriode(periodeTersedia);
            setPeriodeDitampilkan(data.periode?.periode ?? '');
            setStatusMuat('siap');
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Daftar sasaran tidak dapat dimuat.',
            );
            setStatusMuat('galat');
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(() => muat());
    }, [muat]);

    const sheetAktif = sheets.find((item) => item.sheet === sheetDipilih);
    const daftarTersaring = useMemo(() => {
        const q = cari.trim().toLocaleLowerCase('id-ID');

        if (q === '') {
            return sasaran?.items ?? [];
        }

        return (sasaran?.items ?? []).filter(
            (item) =>
                item.nama.toLocaleLowerCase('id-ID').includes(q) ||
                (item.nik ?? '').includes(q) ||
                (item.namaOrtu ?? '').toLocaleLowerCase('id-ID').includes(q),
        );
    }, [cari, sasaran]);

    const periksa = async () => {
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

    return (
        <Halaman
            ikon={Upload}
            judul="Sasaran & impor"
            subjudul="Kelola daftar layanan bulanan tanpa menghapus master Data Balita atau riwayat pengukuran."
        >
            <div className="w-full space-y-6">
                {galat !== '' && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-xl bg-tone-red-bg p-4 text-tone-red"
                    >
                        <AlertTriangle
                            className="mt-0.5 size-5 shrink-0"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        <div className="min-w-0">
                            <p className="font-bold">Proses belum berhasil</p>
                            <p className="mt-0.5 text-sm">{galat}</p>
                        </div>
                    </div>
                )}
                {pesanMutasi !== '' && (
                    <p
                        role="status"
                        className="rounded-lg bg-tone-green-bg px-4 py-3 text-sm font-semibold text-tone-green"
                    >
                        {pesanMutasi}
                    </p>
                )}

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="border-b border-border bg-surface-subtle px-5 py-5 sm:px-6">
                        <h2 className="text-xl font-extrabold">
                            Unggah atau ganti sasaran bulanan
                        </h2>
                        <p className="mt-1 max-w-[74ch] text-base text-muted-foreground">
                            Sistem mencari header setiap sheet, sehingga format
                            Januari dan Februari yang berbeda posisi tetap dapat
                            dibaca.
                        </p>
                    </div>
                    <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                        <div>
                            <label
                                htmlFor="berkas-sasaran"
                                className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface px-5 py-6 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:bg-surface-subtle"
                            >
                                <FileSpreadsheet
                                    className="size-9 text-primary"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                />
                                <span className="mt-3 text-lg font-bold">
                                    {file?.name ?? 'Pilih file Excel Puskesmas'}
                                </span>
                                <span className="mt-1 text-sm text-muted-foreground">
                                    .xlsx · maksimum 3 MB · file diperiksa
                                    sebelum data diganti
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
                            <button
                                type="button"
                                disabled={
                                    file === null ||
                                    tahap === 'memeriksa' ||
                                    tahap === 'mengimpor'
                                }
                                onClick={() => void periksa()}
                                className="tombol-utama mt-4"
                            >
                                {tahap === 'memeriksa' ? (
                                    <RefreshCw
                                        className="size-5 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <FileCheck2
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                )}
                                {tahap === 'memeriksa'
                                    ? 'Memeriksa file…'
                                    : 'Periksa isi Excel'}
                            </button>
                        </div>
                        <aside className="rounded-xl bg-primary p-5 text-primary-foreground">
                            <h3 className="font-bold">
                                Yang berubah saat diterbitkan
                            </h3>
                            <ul className="mt-4 space-y-3 text-sm text-primary-foreground/85">
                                <li>
                                    Daftar sasaran periode terpilih diganti.
                                </li>
                                <li>
                                    Anak baru ditambahkan ke master Data Balita.
                                </li>
                                <li>
                                    Profil lama, kartu, dan riwayat ukur tetap
                                    tersimpan.
                                </li>
                                <li>
                                    Android menerima daftar terbaru saat
                                    sinkronisasi.
                                </li>
                            </ul>
                        </aside>
                    </div>

                    {sheets.length > 0 && (
                        <div className="border-t border-border p-5 sm:p-6">
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                                <div>
                                    <label
                                        htmlFor="sheet-sasaran"
                                        className="text-sm font-bold"
                                    >
                                        Pilih sheet yang akan menjadi sasaran
                                        aktif
                                    </label>
                                    <select
                                        id="sheet-sasaran"
                                        value={sheetDipilih}
                                        onChange={(event) =>
                                            setSheetDipilih(event.target.value)
                                        }
                                        className="mt-2 min-h-12 w-full rounded-lg border border-border-strong bg-surface px-3 text-base outline-none focus:ring-2 focus:ring-ring"
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
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Ditemukan {sheets.length} sheet bulanan.
                                        Hanya sheet terpilih yang diterbitkan.
                                    </p>
                                </div>
                                {sheetAktif !== undefined && (
                                    <dl className="grid grid-cols-3 gap-3 rounded-xl bg-surface-subtle p-4 text-center">
                                        <div>
                                            <dt className="text-xs text-muted-foreground">
                                                Terbaca
                                            </dt>
                                            <dd className="mt-1 text-xl font-extrabold tabular-nums">
                                                {sheetAktif.jumlahBaris}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-muted-foreground">
                                                Siap
                                            </dt>
                                            <dd className="mt-1 text-xl font-extrabold text-tone-green tabular-nums">
                                                {sheetAktif.jumlahSiap}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-muted-foreground">
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
                                    <div className="mt-4 rounded-lg bg-tone-amber-bg p-3 text-sm text-tone-amber">
                                        <p className="flex items-start gap-2">
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
                                                        duplikat akan ditahan
                                                        dan tidak
                                                        diterbitkan.{' '}
                                                    </>
                                                )}
                                                {sheetAktif.jumlahPerluVerifikasi -
                                                    sheetAktif.jumlahDitahan}{' '}
                                                baris lain dapat diterbitkan,
                                                tetapi akan ditandai untuk
                                                ditinjau. Periksa rincian
                                                sebelum menerbitkan.
                                            </span>
                                        </p>
                                        <ul className="mt-3 grid gap-2 border-t border-tone-amber/20 pt-3">
                                            {sheetAktif.barisVerifikasi.map(
                                                (baris) => (
                                                    <li
                                                        key={baris.barisAsal}
                                                        className="rounded-md bg-white/50 px-3 py-2"
                                                    >
                                                        <p className="font-semibold">
                                                            Baris{' '}
                                                            {baris.barisAsal}:{' '}
                                                            {baris.nama}
                                                            {baris.ditahan &&
                                                                ' — ditahan'}
                                                        </p>
                                                        <p className="mt-0.5 text-xs">
                                                            {baris.masalah.join(
                                                                ' · ',
                                                            )}
                                                        </p>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
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
                                    className="tombol-utama"
                                >
                                    {tahap === 'mengimpor' ? (
                                        <RefreshCw
                                            className="size-5 animate-spin"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Upload
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {tahap === 'mengimpor'
                                        ? 'Mengganti sasaran…'
                                        : 'Ganti dan terbitkan sasaran'}
                                </button>
                                <p className="text-sm text-muted-foreground">
                                    Konfirmasi ditampilkan sebelum daftar aktif
                                    diganti.
                                </p>
                            </div>
                        </div>
                    )}

                    {hasil !== null && (
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-tone-green-bg px-5 py-4 text-tone-green sm:px-6">
                            <p className="flex items-center gap-2 font-semibold">
                                <CheckCircle2
                                    className="size-5"
                                    aria-hidden="true"
                                />
                                {hasil.jumlahSasaran} sasaran{' '}
                                {hasil.labelPeriode} sudah diterbitkan ke REST
                                API.
                            </p>
                            <p className="text-sm">
                                {hasil.anakBaru} anak baru ·{' '}
                                {hasil.anakDiperbarui} diperbarui ·{' '}
                                {hasil.perluVerifikasi} perlu verifikasi
                            </p>
                        </div>
                    )}
                </section>

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
                        <div>
                            <h2 className="text-xl font-extrabold">
                                Sasaran yang aktif di perangkat
                            </h2>
                            <p className="mt-1 max-w-[72ch] text-base text-muted-foreground">
                                Android membaca daftar ini. Data Balita tetap
                                menampilkan seluruh anak yang pernah terdaftar.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setTambahTerbuka((terbuka) => !terbuka);
                                    setCalon([]);
                                    setGalat('');
                                }}
                                disabled={
                                    sasaran?.periode?.sesiDitutupPada !== null
                                }
                                className="tombol-utama"
                                title={
                                    sasaran?.periode?.sesiDitutupPada !== null
                                        ? 'Sesi periode sudah ditutup'
                                        : undefined
                                }
                            >
                                <UserRoundPlus
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Tambah anak
                            </button>
                            <button
                                type="button"
                                onClick={() => void muat()}
                                disabled={statusMuat === 'memuat'}
                                className="tombol-kedua"
                            >
                                <RefreshCw
                                    className={`size-4 ${statusMuat === 'memuat' ? 'animate-spin' : ''}`}
                                    aria-hidden="true"
                                />
                                Muat ulang
                            </button>
                            <Link
                                href="/kartu-sasaran"
                                className="tombol-kedua"
                            >
                                <CreditCard
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Kartu semua anak
                            </Link>
                        </div>
                    </div>

                    {statusMuat === 'galat' && (
                        <div
                            role="alert"
                            className="flex flex-wrap items-center justify-between gap-3 border-b border-tone-amber/30 bg-tone-amber-bg px-5 py-4 text-tone-amber sm:px-6"
                        >
                            <div>
                                <p className="font-bold">
                                    Daftar sasaran belum berhasil dimuat.
                                </p>
                                <p className="mt-1 text-sm">
                                    {galat ||
                                        'Periksa koneksi website ke REST API, lalu coba lagi.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    void muat(periodeDitampilkan || undefined)
                                }
                                className="tombol-kedua"
                            >
                                <RefreshCw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Coba lagi
                            </button>
                        </div>
                    )}

                    {statusMuat === 'memuat' && (
                        <div
                            className="grid gap-3 p-5 sm:grid-cols-4 sm:p-6"
                            aria-label="Memuat sasaran"
                        >
                            {[0, 1, 2, 3].map((item) => (
                                <div
                                    key={item}
                                    className="h-20 animate-pulse rounded-xl bg-surface-subtle"
                                />
                            ))}
                        </div>
                    )}

                    {statusMuat === 'siap' && sasaran?.periode === null && (
                        <div className="flex items-start gap-4 p-6 sm:p-8">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-subtle text-primary">
                                <UsersRound
                                    className="size-6"
                                    aria-hidden="true"
                                />
                            </span>
                            <div>
                                <h3 className="text-lg font-bold">
                                    Belum ada sasaran bulanan
                                </h3>
                                <p className="mt-1 max-w-[68ch] text-base text-muted-foreground">
                                    Periksa file Excel di bawah, pilih sheet
                                    periode, lalu terbitkan. Perangkat Android
                                    akan menerima daftar itu pada sinkronisasi
                                    berikutnya.
                                </p>
                            </div>
                        </div>
                    )}

                    {statusMuat === 'siap' &&
                        sasaran !== null &&
                        sasaran.periode !== null && (
                            <>
                                <div className="grid border-b border-border sm:grid-cols-[1.3fr_repeat(4,minmax(110px,1fr))]">
                                    <div className="p-5 sm:p-6">
                                        <p className="text-sm font-semibold text-muted-foreground">
                                            Periode daftar
                                        </p>
                                        <select
                                            aria-label="Pilih periode daftar sasaran"
                                            value={periodeDitampilkan}
                                            onChange={(event) =>
                                                void muat(event.target.value)
                                            }
                                            className="mt-1 min-h-11 max-w-full rounded-lg border border-border-strong bg-surface px-3 text-lg font-bold capitalize"
                                        >
                                            {pilihanPeriode.map((item) => (
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
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {sasaran?.periode
                                                ?.sesiDitutupPada === null
                                                ? 'Sesi masih terbuka'
                                                : 'Sesi sudah ditutup'}
                                        </p>
                                    </div>
                                    {[
                                        [
                                            'Total',
                                            sasaran?.ringkasan.total ?? 0,
                                        ],
                                        [
                                            'Belum dilayani',
                                            sasaran?.ringkasan.menunggu ?? 0,
                                        ],
                                        [
                                            'Selesai',
                                            sasaran?.ringkasan.selesai ?? 0,
                                        ],
                                        [
                                            'Tidak hadir',
                                            sasaran?.ringkasan.tidakHadir ?? 0,
                                        ],
                                    ].map(([label, nilai]) => (
                                        <div
                                            key={String(label)}
                                            className="border-t border-border p-5 sm:border-t-0 sm:border-l"
                                        >
                                            <p className="text-sm text-muted-foreground">
                                                {label}
                                            </p>
                                            <p className="mt-1 text-2xl font-extrabold tabular-nums">
                                                {nilai}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {tambahTerbuka && (
                                    <div className="border-b border-border bg-surface-subtle/60 p-4 sm:px-6">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h3 className="font-bold">
                                                    Tambahkan anak dari Data
                                                    Balita
                                                </h3>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Pilih profil yang sudah ada
                                                    di database. Profil master
                                                    dan riwayatnya tidak diubah.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTambahTerbuka(false)
                                                }
                                                className="tombol-kedua min-h-9 px-3"
                                                aria-label="Tutup pencarian anak"
                                            >
                                                <X
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </div>
                                        <form
                                            className="mt-4 flex max-w-3xl flex-wrap gap-2"
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                void cariAnakMaster();
                                            }}
                                        >
                                            <label className="flex min-h-11 min-w-[220px] flex-1 items-center gap-3 rounded-lg border border-border-strong bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
                                                <Search
                                                    className="size-5 text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                                <span className="sr-only">
                                                    Cari anak di Data Balita
                                                </span>
                                                <input
                                                    value={cariCalon}
                                                    onChange={(event) =>
                                                        setCariCalon(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Nama, NIK, atau nama orang tua"
                                                    className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                                                />
                                            </label>
                                            <button
                                                type="submit"
                                                disabled={
                                                    memuatCalon ||
                                                    cariCalon.trim().length < 2
                                                }
                                                className="tombol-kedua"
                                            >
                                                {memuatCalon ? (
                                                    <RefreshCw
                                                        className="size-4 animate-spin"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <Search
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                Cari anak
                                            </button>
                                        </form>
                                        {calon.length > 0 && (
                                            <ul className="mt-3 max-w-3xl divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                                                {calon.map((item) => (
                                                    <li
                                                        key={item.anakId}
                                                        className="flex flex-wrap items-center justify-between gap-3 p-3"
                                                    >
                                                        <div>
                                                            <p className="font-bold">
                                                                {item.nama}
                                                            </p>
                                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                                {item.nik ??
                                                                    'NIK belum tercatat'}{' '}
                                                                · RT {item.rt} ·{' '}
                                                                {item.namaOrtu ??
                                                                    'Orang tua belum tercatat'}
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
                                                            className="tombol-utama min-h-9 px-3"
                                                        >
                                                            {anakDitambahkan ===
                                                            item.anakId ? (
                                                                <RefreshCw
                                                                    className="size-4 animate-spin"
                                                                    aria-hidden="true"
                                                                />
                                                            ) : (
                                                                <UserRoundPlus
                                                                    className="size-4"
                                                                    aria-hidden="true"
                                                                />
                                                            )}
                                                            Tambahkan
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        {!memuatCalon &&
                                            cariCalon.trim().length >= 2 &&
                                            calon.length === 0 && (
                                                <p className="mt-3 text-sm text-muted-foreground">
                                                    Tidak ada anak aktif yang
                                                    cocok, atau semua hasil
                                                    sudah masuk sasaran periode
                                                    ini.
                                                </p>
                                            )}
                                    </div>
                                )}
                                <div className="border-b border-border p-4 sm:px-6">
                                    <label className="flex min-h-11 max-w-lg items-center gap-3 rounded-lg border border-border-strong bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
                                        <Search
                                            className="size-5 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        <span className="sr-only">
                                            Cari sasaran
                                        </span>
                                        <input
                                            value={cari}
                                            onChange={(event) =>
                                                setCari(event.target.value)
                                            }
                                            placeholder="Cari nama anak, NIK, atau orang tua"
                                            className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                                        />
                                    </label>
                                </div>
                                <div className="max-h-[430px] overflow-auto">
                                    <table className="w-full min-w-[760px] text-left text-sm">
                                        <thead className="sticky top-0 z-[1] bg-surface-subtle text-muted-foreground">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">
                                                    Anak
                                                </th>
                                                <th className="px-4 py-3 font-semibold">
                                                    Orang tua
                                                </th>
                                                <th className="px-4 py-3 font-semibold">
                                                    RT
                                                </th>
                                                <th className="px-4 py-3 font-semibold">
                                                    Kode kartu
                                                </th>
                                                <th className="px-6 py-3 text-right font-semibold">
                                                    Status
                                                </th>
                                                <th className="px-4 py-3 text-right font-semibold">
                                                    Aksi
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {daftarTersaring.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-surface-subtle"
                                                >
                                                    <td className="px-6 py-3.5">
                                                        <Link
                                                            href={`/balita/${item.anakId}`}
                                                            className="font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
                                                        >
                                                            {item.nama}
                                                        </Link>
                                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                                            {item.nik ??
                                                                'NIK perlu verifikasi'}
                                                        </p>
                                                        {item.catatan !== null && (
                                                            <p className="mt-1 max-w-[34rem] text-xs font-medium text-tone-amber">
                                                                <AlertTriangle
                                                                    className="mr-1 inline size-3.5 align-[-2px]"
                                                                    aria-hidden="true"
                                                                />
                                                                {item.catatan}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {item.namaOrtu ??
                                                            'Belum tercatat'}
                                                    </td>
                                                    <td className="px-4 py-3.5 tabular-nums">
                                                        {item.rt ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3.5 font-semibold tabular-nums">
                                                        {item.kodeKartu}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right">
                                                        <span
                                                            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${WARNA_STATUS[item.status]}`}
                                                        >
                                                            {
                                                                LABEL_STATUS[
                                                                    item.status
                                                                ]
                                                            }
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                mulaiEdit(item)
                                                            }
                                                            disabled={
                                                                sasaran?.periode
                                                                    ?.sesiDitutupPada !==
                                                                null
                                                            }
                                                            className="tombol-kedua min-h-9 px-3"
                                                            aria-label={`Edit sasaran ${item.nama}`}
                                                        >
                                                            <Pencil
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {daftarTersaring.length === 0 && (
                                        <p className="p-8 text-center text-muted-foreground">
                                            Tidak ada sasaran yang cocok dengan
                                            pencarian.
                                        </p>
                                    )}
                                </div>
                                {editId !== null && (
                                    <div className="border-t border-border bg-surface-subtle/60 p-4 sm:px-6">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="font-bold">
                                                    Edit status sasaran
                                                </h3>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Perubahan hanya berlaku
                                                    untuk daftar periode ini,
                                                    bukan profil anak.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditId(null)}
                                                className="tombol-kedua min-h-9 px-3"
                                            >
                                                <X
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />{' '}
                                                Batal
                                            </button>
                                        </div>
                                        <div className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-[220px_minmax(0,1fr)_auto] sm:items-end">
                                            <label className="text-sm font-semibold">
                                                Status
                                                <select
                                                    value={editStatus}
                                                    onChange={(event) =>
                                                        setEditStatus(
                                                            event.target
                                                                .value as StatusSasaran,
                                                        )
                                                    }
                                                    className="mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-base"
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
                                            <label className="text-sm font-semibold">
                                                Catatan{' '}
                                                <span className="font-normal text-muted-foreground">
                                                    (opsional)
                                                </span>
                                                <input
                                                    value={editCatatan}
                                                    maxLength={500}
                                                    onChange={(event) =>
                                                        setEditCatatan(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Contoh: orang tua tidak hadir"
                                                    className="mt-1 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-base"
                                                />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    void simpanEdit()
                                                }
                                                disabled={menyimpanEdit}
                                                className="tombol-utama"
                                            >
                                                {menyimpanEdit ? (
                                                    <RefreshCw
                                                        className="size-4 animate-spin"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <CheckCircle2
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                Simpan
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                </section>
            </div>
        </Halaman>
    );
}
