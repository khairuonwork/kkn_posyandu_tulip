import {
    AlertTriangle,
    CheckCircle2,
    CreditCard,
    FileCheck2,
    FileSpreadsheet,
    RefreshCw,
    Save,
    Search,
    Upload,
    UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Dialog, { KakiDialog } from '@/components/dialog';
import Halaman from '@/components/halaman';
import Pilih from '@/components/pilih';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Link } from '@/lib/nav';
import { ambilSasaran, gantiSasaran, periksaFileSasaran } from '@/lib/sasaran';
import type { HasilImpor, SasaranAktif, SheetSasaran } from '@/lib/sasaran';

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

export default function SasaranImpor({
    onImporBerhasil,
}: {
    /** Dipanggil setelah impor berhasil, supaya periode barunya langsung tampil. */
    onImporBerhasil?: (periode: string) => void;
}) {
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

    const muat = useCallback(async () => {
        try {
            setStatusMuat('memuat');
            setSasaran(await ambilSasaran());
            setStatusMuat('siap');
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Daftar sasaran belum dapat dimuat. Coba lagi.',
            );
            setStatusMuat('galat');
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(muat);
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
                    : 'File Excel belum dapat diperiksa. Coba lagi.',
            );
            setTahap('kosong');
        }
    };

    const [konfirmasi, setKonfirmasi] = useState(false);
    const lamaAktif =
        sheetAktif !== undefined &&
        sasaran?.periode?.periode === sheetAktif.periode
            ? sasaran.ringkasan.total
            : 0;

    const gantiDaftar = async () => {
        if (file === null || sheetAktif === undefined || isiBase64 === '') {
            return;
        }

        setKonfirmasi(false);

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
            onImporBerhasil?.(selesai.periode);
            await muat();
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Sasaran belum dapat diganti. Coba lagi.',
            );
            setTahap('siap');
        }
    };

    return (
        <Halaman
            ikon={Upload}
            judul="Sasaran & Impor"
            subjudul="Kelola daftar sasaran bulanan. Data Balita dan riwayat ukur tidak ikut terhapus."
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
                            <p className="mt-0.5 text-base">{galat}</p>
                        </div>
                    </div>
                )}

                <section className="kartu overflow-hidden">
                    <div className="strip-kepala">
                        <h2 className="text-xl font-extrabold">
                            Unggah atau ganti sasaran bulanan
                        </h2>
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
                                    .xlsx · maksimal 3 MB
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
                                Yang berubah setelah daftar diganti
                            </h3>
                            <ul className="mt-4 space-y-3 text-base text-primary-foreground/85">
                                <li>
                                    Daftar sasaran periode terpilih diganti.
                                </li>
                                <li>Balita baru ditambahkan ke Data Balita.</li>
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
                                        className="block text-base font-semibold text-muted-foreground"
                                    >
                                        Pilih bulan yang akan dijadikan sasaran
                                        aktif
                                    </label>
                                    <div className="mt-2">
                                        <Pilih
                                            id="sheet-sasaran"
                                            value={sheetDipilih}
                                            onChange={setSheetDipilih}
                                        >
                                            {sheets.map((sheet) => (
                                                <option
                                                    key={sheet.sheet}
                                                    value={sheet.sheet}
                                                >
                                                    {sheet.labelPeriode} ·{' '}
                                                    {sheet.jumlahBaris} balita
                                                </option>
                                            ))}
                                        </Pilih>
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Ditemukan {sheets.length} lembar
                                        bulanan. Hanya bulan yang dipilih yang
                                        dipakai.
                                    </p>
                                </div>
                                {sheetAktif !== undefined && (
                                    <dl className="grid grid-cols-3 content-center gap-3 rounded-xl bg-surface-subtle p-4 text-center">
                                        <div>
                                            <dt className="text-sm text-muted-foreground">
                                                Baris
                                            </dt>
                                            <dd className="mt-1 text-xl font-extrabold tabular-nums">
                                                {sheetAktif.jumlahBaris}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">
                                                Siap
                                            </dt>
                                            <dd className="mt-1 text-xl font-extrabold text-tone-green tabular-nums">
                                                {sheetAktif.jumlahSiap}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm text-muted-foreground">
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
                                    <p className="mt-4 flex items-start gap-2 rounded-lg bg-tone-amber-bg p-3 text-sm text-tone-amber">
                                        <AlertTriangle
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        {sheetAktif.jumlahPerluVerifikasi} baris
                                        tetap dapat masuk, tetapi dicatat
                                        sebagai konflik impor untuk ditinjau
                                        karena NIK atau satuan data belum
                                        lengkap.
                                    </p>
                                )}
                            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                                <button
                                    type="button"
                                    onClick={() => setKonfirmasi(true)}
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
                                        : lamaAktif > 0
                                          ? 'Ganti daftar sasaran'
                                          : 'Simpan daftar sasaran'}
                                </button>
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
                                {hasil.labelPeriode} sudah aktif.
                            </p>
                            <p className="text-sm">
                                {hasil.anakBaru} anak baru ·{' '}
                                {hasil.anakDiperbarui} diperbarui ·{' '}
                                {hasil.perluVerifikasi} perlu verifikasi
                            </p>
                        </div>
                    )}
                </section>

                <section className="kartu overflow-hidden">
                    <div className="strip-kepala flex flex-wrap items-start justify-between gap-x-2 gap-y-4">
                        <div>
                            <h2 className="text-xl font-extrabold">
                                Sasaran aktif di perangkat
                            </h2>
                            <p className="mt-1 max-w-[72ch] text-base text-muted-foreground">
                                Daftar ini dipakai aplikasi Android.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void muat()}
                                disabled={statusMuat === 'memuat'}
                                className="tombol-kedua"
                            >
                                <RefreshCw
                                    className={`size-5 ${statusMuat === 'memuat' ? 'animate-spin' : ''}`}
                                    aria-hidden="true"
                                />
                                Muat ulang
                            </button>
                            <Link
                                href="/kartu-sasaran"
                                className="tombol-kedua"
                            >
                                <CreditCard
                                    className="size-5"
                                    aria-hidden="true"
                                />
                                Kartu semua balita
                            </Link>
                        </div>
                    </div>

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
                                    Periksa file Excel di atas, pilih bulannya,
                                    lalu simpan daftarnya. Perangkat Android
                                    akan menerima daftar itu saat sinkronisasi
                                    berikutnya.
                                </p>
                            </div>
                        </div>
                    )}

                    {statusMuat === 'siap' && sasaran?.periode !== null && (
                        <>
                            <div className="grid border-b border-border sm:grid-cols-[1.3fr_repeat(4,minmax(110px,1fr))]">
                                <div className="p-5 sm:p-6">
                                    <p className="text-sm font-semibold text-muted-foreground">
                                        Periode aktif
                                    </p>
                                    <p className="mt-1 text-2xl font-extrabold capitalize">
                                        {formatPeriode(
                                            sasaran?.periode?.periode,
                                        )}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {sasaran?.periode?.sesiDitutupPada ===
                                        null
                                            ? 'Sesi masih terbuka'
                                            : 'Sesi sudah ditutup'}
                                    </p>
                                </div>
                                {[
                                    ['Total', sasaran?.ringkasan.total ?? 0],
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
                                        className="border-t border-border p-5 sm:border-t-0 sm:border-l sm:p-6"
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
                            <div className="border-b border-border p-4 sm:px-6">
                                {/* `relative`: label "Cari sasaran" yang tersembunyi berlabuh di
                                    sini. Tanpanya ia mengambang di halaman dan memanjangkannya,
                                    sehingga muncul bilah gulir kedua. */}
                                <label className="isian relative flex max-w-lg items-center gap-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
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
                                        placeholder="Cari nama balita, NIK, atau orang tua"
                                        className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                                    />
                                </label>
                            </div>
                            <div>
                                <Table
                                    aria-label="Sasaran yang aktif"
                                    containerClassName="max-h-[430px] overflow-y-auto"
                                    className="min-w-[760px]"
                                >
                                    <TableHeader className="sticky top-0 z-[1]">
                                        <TableRow>
                                            <TableHead
                                                scope="col"
                                                className="first:pl-6"
                                            >
                                                Balita
                                            </TableHead>
                                            <TableHead scope="col">
                                                Orang tua
                                            </TableHead>
                                            <TableHead scope="col">
                                                RT
                                            </TableHead>
                                            <TableHead scope="col">
                                                Kode kartu
                                            </TableHead>
                                            <TableHead
                                                scope="col"
                                                className="text-right last:pr-6"
                                            >
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {daftarTersaring.map((item) => (
                                            <TableRow
                                                key={item.id}
                                                className="hover:bg-surface-subtle"
                                            >
                                                <TableCell className="py-3 first:pl-6">
                                                    <Link
                                                        href={`/balita/${item.anakId}`}
                                                        className="font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
                                                    >
                                                        {item.nama}
                                                    </Link>
                                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                                        {item.nik ??
                                                            'NIK perlu verifikasi'}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    {item.namaOrtu ??
                                                        'Belum tercatat'}
                                                </TableCell>
                                                <TableCell className="tabular-nums">
                                                    {item.rt ?? '—'}
                                                </TableCell>
                                                <TableCell className="font-semibold whitespace-nowrap tabular-nums">
                                                    {item.kodeKartu}
                                                </TableCell>
                                                <TableCell className="text-right last:pr-6">
                                                    <span
                                                        className={`inline-flex rounded-md px-3 py-1 text-sm font-bold whitespace-nowrap ${WARNA_STATUS[item.status]}`}
                                                    >
                                                        {
                                                            LABEL_STATUS[
                                                                item.status
                                                            ]
                                                        }
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {daftarTersaring.length === 0 && (
                                    <p className="p-8 text-center text-muted-foreground">
                                        Tidak ada sasaran yang cocok dengan
                                        pencarian.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </section>
            </div>
            {konfirmasi && sheetAktif !== undefined && file !== null && (
                <DialogGantiDaftar
                    bulan={formatPeriode(sheetAktif.periode)}
                    namaFile={file.name}
                    baru={sheetAktif.jumlahBaris}
                    lama={lamaAktif}
                    perluTinjau={sheetAktif.jumlahPerluVerifikasi}
                    onBatal={() => setKonfirmasi(false)}
                    onLanjut={() => void gantiDaftar()}
                />
            )}
        </Halaman>
    );
}

/** Konfirmasi sebelum daftar sasaran aktif diganti. Fokus awal di Batal. */
function DialogGantiDaftar({
    bulan,
    namaFile,
    baru,
    lama,
    perluTinjau,
    onBatal,
    onLanjut,
}: {
    bulan: string;
    namaFile: string;
    baru: number;
    /** Sasaran aktif untuk bulan yang sama; 0 bila belum ada. */
    lama: number;
    perluTinjau: number;
    onBatal: () => void;
    onLanjut: () => void;
}) {
    const angka: [string, number, string][] = [
        ...(lama > 0
            ? [['Sekarang aktif', lama, ''] as [string, number, string]]
            : []),
        [
            lama > 0 ? 'Akan menggantikan' : 'Akan disimpan',
            baru,
            'text-primary',
        ],
        ...(perluTinjau > 0
            ? [
                  ['Perlu ditinjau', perluTinjau, 'text-tone-amber'] as [
                      string,
                      number,
                      string,
                  ],
              ]
            : []),
    ];

    return (
        <Dialog
            judul={`${lama > 0 ? 'Ganti' : 'Simpan'} daftar sasaran ${bulan}?`}
            lebar="w-[520px]"
            onTutup={onBatal}
        >
            <div className="px-7 py-5 text-base">
                <p>
                    {lama > 0
                        ? `Daftar sasaran ${bulan} yang aktif sekarang akan diganti dengan isi berkas `
                        : `${baru} sasaran dari berkas `}
                    <b>{namaFile}</b>
                    {lama > 0 ? '.' : ' akan dijadikan daftar sasaran aktif.'}
                </p>
                <dl
                    className={`mt-4 grid gap-3 rounded-xl bg-surface-subtle p-4 text-center ${
                        angka.length === 3
                            ? 'grid-cols-3'
                            : angka.length === 2
                              ? 'grid-cols-2'
                              : 'grid-cols-1'
                    }`}
                >
                    {angka.map(([label, nilai, warna]) => (
                        <div key={label}>
                            <dt className="text-sm text-muted-foreground">
                                {label}
                            </dt>
                            <dd
                                className={`mt-1 text-xl font-extrabold ${warna}`}
                            >
                                {nilai}
                            </dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-4 text-muted-foreground">
                    Data Balita dan riwayat ukur tidak ikut terhapus.
                </p>
            </div>
            <KakiDialog>
                <button
                    type="button"
                    autoFocus
                    onClick={onBatal}
                    className="tombol-kedua px-5.5"
                >
                    Batal
                </button>
                <button
                    type="button"
                    onClick={onLanjut}
                    className="tombol-utama px-5.5"
                >
                    {lama > 0 ? (
                        <RefreshCw className="size-5" aria-hidden="true" />
                    ) : (
                        <Save className="size-5" aria-hidden="true" />
                    )}
                    {lama > 0 ? 'Ganti daftar' : 'Simpan daftar'}
                </button>
            </KakiDialog>
        </Dialog>
    );
}
