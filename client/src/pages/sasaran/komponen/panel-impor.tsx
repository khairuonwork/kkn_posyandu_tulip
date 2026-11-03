import {
    AlertTriangle,
    CheckCircle2,
    FileCheck2,
    FileSpreadsheet,
    RefreshCw,
    Upload,
} from 'lucide-react';
import type { HasilImpor, SheetSasaran } from '@/lib/sasaran';
import type { Tahap } from './tipe';

export function PanelImpor({
    file,
    setFile,
    tahap,
    periksa,
    sheets,
    sheetDipilih,
    setSheetDipilih,
    sheetAktif,
    terbitkan,
    hasil,
    onResetFile,
}: {
    file: File | null;
    setFile: (file: File | null) => void;
    tahap: Tahap;
    periksa: () => void | Promise<void>;
    sheets: SheetSasaran[];
    sheetDipilih: string;
    setSheetDipilih: (sheet: string) => void;
    sheetAktif: SheetSasaran | undefined;
    terbitkan: () => void | Promise<void>;
    hasil: HasilImpor | null;
    onResetFile: () => void;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border bg-surface-subtle px-5 py-5 sm:px-6">
                <h2 className="text-xl font-extrabold">
                    Unggah atau ganti sasaran bulanan
                </h2>
                <p className="mt-1 max-w-[74ch] text-base text-muted-foreground">
                    Sistem mencari header setiap sheet, sehingga format Januari
                    dan Februari yang berbeda posisi tetap dapat dibaca.
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
                            .xlsx · maksimum 3 MB · file diperiksa sebelum data
                            diganti
                        </span>
                        <input
                            id="berkas-sasaran"
                            type="file"
                            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={(event) => {
                                setFile(event.target.files?.[0] ?? null);
                                onResetFile();
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
                            <FileCheck2 className="size-5" aria-hidden="true" />
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
                        <li>Daftar sasaran periode terpilih diganti.</li>
                        <li>Anak baru ditambahkan ke master Data Balita.</li>
                        <li>
                            Profil lama, kartu, dan riwayat ukur tetap
                            tersimpan.
                        </li>
                        <li>
                            Android menerima daftar terbaru saat sinkronisasi.
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
                                Pilih sheet yang akan menjadi sasaran aktif
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
                                Ditemukan {sheets.length} sheet bulanan. Hanya
                                sheet terpilih yang diterbitkan.
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
                                        {sheetAktif.jumlahPerluVerifikasi}
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
                                        {sheetAktif.jumlahDitahan > 0 && (
                                            <>
                                                {sheetAktif.jumlahDitahan}{' '}
                                                baris dengan NIK duplikat akan
                                                ditahan dan tidak diterbitkan.{' '}
                                            </>
                                        )}
                                        {sheetAktif.jumlahPerluVerifikasi -
                                            sheetAktif.jumlahDitahan}{' '}
                                        baris lain dapat diterbitkan, tetapi
                                        akan ditandai untuk ditinjau. Periksa
                                        rincian sebelum menerbitkan.
                                    </span>
                                </p>
                                <ul className="mt-3 grid gap-2 border-t border-tone-amber/20 pt-3">
                                    {(sheetAktif.barisVerifikasi ?? []).map(
                                        (baris) => (
                                            <li
                                                key={baris.barisAsal}
                                                className="rounded-md bg-white/50 px-3 py-2"
                                            >
                                                <p className="font-semibold">
                                                    Baris {baris.barisAsal}:{' '}
                                                    {baris.nama}
                                                    {baris.ditahan &&
                                                        ' — ditahan'}
                                                </p>
                                                <p className="mt-0.5 text-xs">
                                                    {(
                                                        baris.masalah ?? []
                                                    ).join(' · ')}
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
                            Konfirmasi ditampilkan sebelum daftar aktif diganti.
                        </p>
                    </div>
                </div>
            )}

            {hasil !== null && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-tone-green-bg px-5 py-4 text-tone-green sm:px-6">
                    <p className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="size-5" aria-hidden="true" />
                        {hasil.jumlahSasaran} sasaran {hasil.labelPeriode} sudah
                        diterbitkan ke REST API.
                    </p>
                    <p className="text-sm">
                        {hasil.anakBaru} anak baru · {hasil.anakDiperbarui}{' '}
                        diperbarui · {hasil.perluVerifikasi} perlu verifikasi
                        {hasil.pengukuran && (
                            <span className="mt-2 block">
                                Hasil ukur: {hasil.pengukuran.tersimpan} disimpan ·{' '}
                                {hasil.pengukuran.sudahAda} sudah ada ·{' '}
                                {hasil.pengukuran.ditahan.length} ditahan
                            </span>
                        )}
                    </p>
                </div>
            )}
        </section>
    );
}
