/**
 * Sasaran & impor — pintu masuk data Puskesmas ke perangkat Posyandu.
 *
 * Berkas Excel tidak dibaca paksa di peramban. Produk menerima berkas di
 * server, memeriksa struktur dan menyimpan audit impor sebelum sasaran
 * diterbitkan ke perangkat. Demo memperlihatkan seluruh keputusan itu tanpa
 * menyamarkan pengiriman sebagai proses yang sudah tersimpan.
 */

import {
    CheckCircle2,
    CircleAlert,
    CreditCard,
    FileSpreadsheet,
    ShieldCheck,
    Smartphone,
    Upload,
} from 'lucide-react';
import { useState } from 'react';
import Halaman from '@/components/halaman';
import { Link } from '@/lib/nav';

type StatusImpor = 'belum' | 'siap' | 'diterbitkan';

const KOLOM_DIBACA = [
    [
        'Identitas anak',
        'NIK/EPPGBM, nama lengkap, tanggal lahir, jenis kelamin',
    ],
    ['Keluarga & wilayah', 'Nama orang tua, NIK orang tua, RT'],
    ['Riwayat awal', 'BB/PB lahir, KIA dan IMD'],
    ['Skrining layanan', 'Imunisasi, BB, TB/PB, LILA, LIKA dan N/T/O/B'],
] as const;

export default function SasaranImpor() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<StatusImpor>('belum');
    const formatBenar = file?.name.toLowerCase().endsWith('.xlsx') ?? false;

    const periksa = () => {
        if (formatBenar) {
            setStatus('siap');
        }
    };

    const terbitkan = () => {
        setStatus('diterbitkan');
    };

    return (
        <Halaman
            ikon={Upload}
            judul="Sasaran & impor"
            subjudul="Masukkan data Puskesmas, periksa dulu, lalu terbitkan sasaran yang akan diterima perangkat Posyandu."
        >
            <div className="max-w-[1040px] space-y-7">
                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="border-b border-border bg-surface-subtle px-5 py-5 sm:px-6">
                        <h2 className="text-xl font-extrabold">
                            Unggah data sasaran
                        </h2>
                        <p className="mt-1 max-w-[76ch] text-base text-pretty text-muted-foreground">
                            Gunakan berkas .xlsx dari Puskesmas. Sistem akan
                            mencocokkan kolom sebelum satu sasaran pun masuk ke
                            perangkat kader.
                        </p>
                    </div>

                    <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <label
                            htmlFor="berkas-sasaran"
                            className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface px-5 py-7 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:bg-surface-subtle"
                        >
                            <FileSpreadsheet
                                className="size-10 text-primary"
                                strokeWidth={2}
                                aria-hidden="true"
                            />
                            <span className="mt-3 text-lg font-bold">
                                {file === null
                                    ? 'Pilih file Excel dari Puskesmas'
                                    : file.name}
                            </span>
                            <span className="mt-1 text-sm text-muted-foreground">
                                .xlsx saja · contoh yang ditinjau: 9 sheet
                                periode Januari–September 2026
                            </span>
                            <input
                                id="berkas-sasaran"
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                onChange={(event) => {
                                    setFile(event.target.files?.[0] ?? null);
                                    setStatus('belum');
                                }}
                                className="sr-only"
                            />
                        </label>

                        <div className="flex flex-col justify-between rounded-xl bg-primary p-5 text-primary-foreground">
                            <div>
                                <p className="text-base font-bold">
                                    Alur aman untuk data sasaran
                                </p>
                                <ol className="mt-4 space-y-3 text-sm text-primary-foreground/85">
                                    <li>1. Unggah dan periksa struktur.</li>
                                    <li>2. Tinjau data yang belum lengkap.</li>
                                    <li>3. Terbitkan target ke perangkat.</li>
                                </ol>
                            </div>
                            <p className="mt-6 text-sm text-primary-foreground/75">
                                Perubahan tidak mengganti arsip sebelumnya.
                                Setiap impor memiliki jejak waktu dan pelaku.
                            </p>
                        </div>
                    </div>

                    {file !== null && !formatBenar && (
                        <div className="mx-5 mb-5 flex items-start gap-3 rounded-lg bg-tone-red-bg p-4 text-tone-red sm:mx-6 sm:mb-6">
                            <CircleAlert
                                className="mt-0.5 size-5 shrink-0"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            <p className="text-base">
                                Pilih berkas Excel dengan akhiran .xlsx. File
                                ini belum dapat diperiksa.
                            </p>
                        </div>
                    )}

                    {status === 'belum' && file !== null && formatBenar && (
                        <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 sm:px-6">
                            <button
                                type="button"
                                onClick={periksa}
                                className="tombol-utama"
                            >
                                Periksa format dan data
                            </button>
                            <p className="text-sm text-muted-foreground">
                                Tidak ada sasaran yang diterbitkan pada tahap
                                pemeriksaan.
                            </p>
                        </div>
                    )}
                </section>

                {status !== 'belum' && (
                    <section className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
                            <div className="flex gap-3">
                                <CheckCircle2
                                    className="mt-0.5 size-6 shrink-0 text-tone-green"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                <div>
                                    <h2 className="text-xl font-extrabold">
                                        Struktur dapat dipetakan
                                    </h2>
                                    <p className="mt-1 text-base text-muted-foreground">
                                        Berdasarkan format Data Sasaran Posyandu
                                        Tulip yang ditinjau dari Puskesmas.
                                    </p>
                                </div>
                            </div>
                            <span className="rounded-md bg-tone-green-bg px-3 py-1.5 text-sm font-bold text-tone-green">
                                Siap ditinjau
                            </span>
                        </div>

                        <div className="grid gap-0 divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
                            <div className="p-5 sm:p-6">
                                <h3 className="font-bold">Kolom yang dibaca</h3>
                                <dl className="mt-4 space-y-4">
                                    {KOLOM_DIBACA.map(([label, nilai]) => (
                                        <div key={label}>
                                            <dt className="text-sm font-semibold text-muted-foreground">
                                                {label}
                                            </dt>
                                            <dd className="mt-0.5 text-base">
                                                {nilai}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            <div className="p-5 sm:p-6">
                                <h3 className="font-bold">Hasil pemeriksaan</h3>
                                <ul className="mt-4 space-y-3 text-base">
                                    <li className="flex gap-3">
                                        <CheckCircle2
                                            className="mt-0.5 size-5 shrink-0 text-tone-green"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                        9 sheet periode ditemukan.
                                    </li>
                                    <li className="flex gap-3">
                                        <CheckCircle2
                                            className="mt-0.5 size-5 shrink-0 text-tone-green"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                        Kolom identitas dan pengukuran dikenali.
                                    </li>
                                    <li className="flex gap-3 text-tone-amber">
                                        <CircleAlert
                                            className="mt-0.5 size-5 shrink-0"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                        7 sasaran tanpa NIK lengkap akan tetap
                                        masuk ke daftar verifikasi, bukan
                                        ditolak.
                                    </li>
                                </ul>

                                <div className="mt-6 rounded-lg bg-surface-subtle p-4">
                                    <p className="font-bold">
                                        Target perangkat
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        93 sasaran periode September siap
                                        diterbitkan. Perangkat hanya menerima
                                        sasaran sesuai wilayah dan perannya.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 sm:px-6">
                            {status === 'siap' ? (
                                <button
                                    type="button"
                                    onClick={terbitkan}
                                    className="tombol-utama"
                                >
                                    <Smartphone
                                        className="size-5"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Terbitkan ke perangkat
                                </button>
                            ) : (
                                <p className="flex items-center gap-2 text-base font-semibold text-tone-green">
                                    <ShieldCheck
                                        className="size-5"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Sasaran diterbitkan ke antrean sinkronisasi
                                    perangkat.
                                </p>
                            )}
                            {status === 'diterbitkan' && (
                                <Link
                                    href="/kartu-sasaran"
                                    className="tombol-kedua"
                                >
                                    <CreditCard
                                        className="size-5"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Buat kartu batch (93)
                                </Link>
                            )}
                            <p className="text-sm text-muted-foreground">
                                Demo menampilkan alurnya. Pembacaan file,
                                deduplikasi, audit, dan sinkronisasi dilakukan
                                aman oleh server pada aplikasi produksi.
                            </p>
                        </div>
                    </section>
                )}
            </div>
        </Halaman>
    );
}
