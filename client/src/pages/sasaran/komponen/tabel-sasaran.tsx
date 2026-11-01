import {
    AlertTriangle,
    CreditCard,
    Pencil,
    RefreshCw,
    Search,
    Trash2,
    UserRoundPlus,
    UsersRound,
} from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { Link } from '@/lib/nav';
import type { PeriodeSasaran, SasaranAktif } from '@/lib/sasaran';
import { formatPeriode, LABEL_STATUS, WARNA_STATUS } from './tipe';

export function TabelSasaran({
    statusMuat,
    galat,
    sasaran,
    periodeDitampilkan,
    pilihanPeriode,
    muat,
    memuatPratinjauReset,
    bukaPratinjauReset,
    setTambahTerbuka,
    setCalon,
    setGalat,
    cari,
    setCari,
    daftarTersaring,
    mulaiEdit,
    periodeAktifSekarang,
}: {
    statusMuat: 'memuat' | 'siap' | 'galat';
    galat: string;
    sasaran: SasaranAktif | null;
    periodeDitampilkan: string;
    pilihanPeriode: PeriodeSasaran[];
    muat: (periode?: string) => void | Promise<void>;
    memuatPratinjauReset: boolean;
    bukaPratinjauReset: () => void | Promise<void>;
    setTambahTerbuka: Dispatch<SetStateAction<boolean>>;
    setCalon: (calon: any[]) => void;
    setGalat: (galat: string) => void;
    cari: string;
    setCari: (cari: string) => void;
    daftarTersaring: SasaranAktif['items'];
    mulaiEdit: (item: SasaranAktif['items'][number]) => void;
    periodeAktifSekarang: string;
}) {
    return (
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
                        onClick={() => void bukaPratinjauReset()}
                        disabled={
                            memuatPratinjauReset ||
                            sasaran?.periode?.periode !== periodeAktifSekarang
                        }
                        className="tombol-kedua text-tone-red"
                        title="Khusus admin · hanya hasil ukur bertanggal hari ini pada periode aktif"
                    >
                        {memuatPratinjauReset ? (
                            <RefreshCw
                                className="size-4 animate-spin"
                                aria-hidden="true"
                            />
                        ) : (
                            <Trash2 className="size-4" aria-hidden="true" />
                        )}
                        Reset data sesi hari ini
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setTambahTerbuka((terbuka) => !terbuka);
                            setCalon([]);
                            setGalat('');
                        }}
                        className="tombol-utama"
                    >
                        <UserRoundPlus className="size-4" aria-hidden="true" />
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
                    <Link href="/kartu-sasaran" className="tombol-kedua">
                        <CreditCard className="size-4" aria-hidden="true" />
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
                        <RefreshCw className="size-4" aria-hidden="true" />
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
                        <UsersRound className="size-6" aria-hidden="true" />
                    </span>
                    <div>
                        <h3 className="text-lg font-bold">
                            Belum ada sasaran bulanan
                        </h3>
                        <p className="mt-1 max-w-[68ch] text-base text-muted-foreground">
                            Periksa file Excel di bawah, pilih sheet periode,
                            lalu terbitkan. Perangkat Android akan menerima
                            daftar itu pada sinkronisasi berikutnya.
                        </p>
                    </div>
                </div>
            )}

            {statusMuat === 'siap' &&
                sasaran !== null &&
                sasaran.periode !== null && (
                    <>
                        <div className="grid border-b border-border sm:grid-cols-[1.3fr_repeat(4,minmax(110px,1fr))]">
                            <div className="flex flex-col justify-between p-4 sm:p-5">
                                <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                                    Periode daftar
                                </p>
                                <select
                                    aria-label="Pilih periode daftar sasaran"
                                    value={periodeDitampilkan}
                                    onChange={(event) =>
                                        void muat(event.target.value)
                                    }
                                    className="isian mt-1.5 w-full max-w-full font-bold capitalize"
                                >
                                    {(pilihanPeriode ?? []).map((item) => (
                                        <option
                                            key={item.id}
                                            value={item.periode}
                                        >
                                            {formatPeriode(item.periode)}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                                    {sasaran?.periode?.sesiDitutupPada === null
                                        ? 'Sesi masih terbuka'
                                        : 'Sesi sudah ditutup'}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-y border-t border-border sm:col-span-4 sm:grid-cols-4 sm:divide-y-0 sm:border-t-0 sm:border-l">
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
                                        className="flex flex-col justify-between p-4 sm:p-5"
                                    >
                                        <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
                                            {label}
                                        </p>
                                        <p className="mt-2 text-2xl font-extrabold tabular-nums sm:text-3xl">
                                            {nilai}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-b border-border p-4 sm:px-6">
                            <label className="flex min-h-11 max-w-lg items-center gap-3 rounded-lg border border-border-strong bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
                                <Search
                                    className="size-5 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <span className="sr-only">Cari sasaran</span>
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
                                                className="flex items-center gap-1.5 font-bold text-foreground underline-offset-4 hover:text-primary hover:underline"
                                            >
                                                <span className="truncate">
                                                    {item.nama}
                                                </span>
                                                <span className="rounded bg-surface-subtle px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
                                                    {item.jk}
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
                                            {LABEL_STATUS[item.status]}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-subtle/40 p-2.5 text-xs text-muted-foreground">
                                        <div>
                                            <span className="block font-medium text-foreground">
                                                Orang tua
                                            </span>
                                            <span className="truncate">
                                                {item.namaOrtu ??
                                                    'Belum tercatat'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="block font-medium text-foreground">
                                                Wilayah RT
                                            </span>
                                            <span>RT {item.rt ?? '—'}</span>
                                        </div>
                                        <div>
                                            <span className="block font-medium text-foreground">
                                                Kode kartu
                                            </span>
                                            <span className="font-semibold text-foreground">
                                                {item.kodeKartu}
                                            </span>
                                        </div>
                                        <div className="flex items-end justify-end">
                                            <button
                                                type="button"
                                                onClick={() => mulaiEdit(item)}
                                                className="tombol-kedua min-h-8 px-2.5 py-1 text-xs font-semibold"
                                                aria-label={`Edit sasaran ${item.nama}`}
                                            >
                                                <Pencil
                                                    className="mr-1 size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Edit
                                            </button>
                                        </div>
                                    </div>

                                    {item.catatan !== null && (
                                        <p className="flex items-start gap-1.5 rounded bg-tone-amber-bg/50 p-2 text-xs font-medium text-tone-amber">
                                            <AlertTriangle
                                                className="mt-0.5 size-3.5 shrink-0"
                                                aria-hidden="true"
                                            />
                                            <span>{item.catatan}</span>
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Tampilan Desktop & Tablet Lebar: Tabel Lengkap */}
                        <div className="hidden md:block max-h-[460px] overflow-auto">
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
                                                    {LABEL_STATUS[item.status]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        mulaiEdit(item)
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
                        </div>
                        {daftarTersaring.length === 0 && (
                            <p className="p-8 text-center text-sm text-muted-foreground">
                                Tidak ada sasaran yang cocok dengan pencarian.
                            </p>
                        )}
                    </>
                )}
        </section>
    );
}
