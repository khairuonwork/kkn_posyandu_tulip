/**
 * Pendaftaran & pengukuran — alur kerja kader pada hari Posyandu.
 *
 * Kamera pemindai dan penyimpanan berada di aplikasi perangkat/backend. Layar
 * ini tetap dapat dipakai dengan memasukkan kode kartu secara manual, sehingga
 * satu alur yang sama tidak bergantung pada kemampuan kamera browser.
 */

import {
    CheckCircle2,
    CircleAlert,
    ClipboardPenLine,
    ScanLine,
    Syringe,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import Halaman from '@/components/halaman';

export type SasaranLayanan = {
    kodeKartu: string;
    nama: string;
    namaIbu: string | null;
    rt: string | null;
    umur: string;
    bukuKia: boolean;
    beratTerakhir: number | null;
    tanggalUkurTerakhir: string | null;
};

type Props = {
    sasaranContoh: SasaranLayanan;
};

function angka(teks: string): number | null {
    const nilai = Number(teks.trim().replace(',', '.'));

    return Number.isFinite(nilai) && nilai > 0 ? nilai : null;
}

export default function LayananPosyandu({ sasaranContoh }: Props) {
    const [kode, setKode] = useState('');
    const [sasaranDitemukan, setSasaranDitemukan] = useState(false);
    const [sudahCari, setSudahCari] = useState(false);
    const [bb, setBb] = useState(
        sasaranContoh.beratTerakhir === null
            ? ''
            : (sasaranContoh.beratTerakhir - 2).toFixed(1),
    );
    const [tb, setTb] = useState('92');
    const [lila, setLila] = useState('');
    const [lika, setLika] = useState('');
    const [tersimpan, setTersimpan] = useState(false);

    const kodeBersih = kode.replace(/\s/g, '');
    const kodeCocok = kodeBersih === sasaranContoh.kodeKartu;
    const berat = angka(bb);
    const selisihBerat = useMemo(() => {
        if (berat === null || sasaranContoh.beratTerakhir === null) {
            return null;
        }

        return berat - sasaranContoh.beratTerakhir;
    }, [berat, sasaranContoh.beratTerakhir]);
    const janggal = selisihBerat !== null && Math.abs(selisihBerat) >= 1.5;
    const lengkap = berat !== null && angka(tb) !== null;

    return (
        <Halaman
            ikon={ClipboardPenLine}
            judul="Pendaftaran & pengukuran"
            subjudul="Cari sasaran dengan kartu ID, lakukan skrining singkat, lalu catat hasil ukur pada satu alur."
        >
            <div className="max-w-[1120px] space-y-7">
                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="border-b border-border bg-surface-subtle px-5 py-5 sm:px-6">
                        <h2 className="text-xl font-extrabold">
                            Temukan sasaran
                        </h2>
                        <p className="mt-1 text-base text-muted-foreground">
                            Pindai kartu ID di perangkat atau masukkan kode
                            kartunya pada web.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3 p-5 sm:p-6">
                        <label htmlFor="kode-kartu" className="min-w-64 flex-1">
                            <span className="block text-sm font-semibold text-muted-foreground">
                                Kode kartu / NIK
                            </span>
                            <input
                                id="kode-kartu"
                                value={kode}
                                placeholder="Tempel hasil scan atau ketik kode"
                                onChange={(event) => {
                                    setKode(event.target.value);
                                    setSasaranDitemukan(false);
                                    setSudahCari(false);
                                    setTersimpan(false);
                                }}
                                className="isian mt-1.5 w-full"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setSasaranDitemukan(kodeCocok);
                                setSudahCari(true);
                                setTersimpan(false);
                            }}
                            disabled={kodeBersih === ''}
                            className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ScanLine className="size-5" strokeWidth={2.5} />
                            Cari sasaran
                        </button>
                        {sudahCari && !sasaranDitemukan && (
                            <p className="basis-full text-sm text-tone-amber">
                                Kode belum ditemukan. Pastikan hasil scan kartu
                                atau NIK yang dimasukkan sudah benar.
                            </p>
                        )}
                    </div>
                </section>

                {sasaranDitemukan && (
                    <>
                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
                                <div>
                                    <h2 className="text-xl font-extrabold">
                                        {sasaranContoh.nama}
                                    </h2>
                                    <p className="mt-1 text-base text-muted-foreground">
                                        {sasaranContoh.umur} ·{' '}
                                        {sasaranContoh.rt === null
                                            ? 'RT belum tercatat'
                                            : `RT ${sasaranContoh.rt.padStart(2, '0')}`}
                                        {sasaranContoh.namaIbu !== null &&
                                            ` · Ibu ${sasaranContoh.namaIbu}`}
                                    </p>
                                </div>
                                <span className="rounded-md bg-tone-green-bg px-3 py-1.5 text-sm font-bold text-tone-green">
                                    Sasaran ditemukan
                                </span>
                            </div>
                            <div className="grid gap-0 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                                <div className="flex gap-3 p-5 sm:p-6">
                                    <CheckCircle2
                                        className={`mt-0.5 size-5 shrink-0 ${
                                            sasaranContoh.bukuKia
                                                ? 'text-tone-green'
                                                : 'text-tone-amber'
                                        }`}
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <p className="font-bold">Buku KIA</p>
                                        <p className="mt-0.5 text-sm text-muted-foreground">
                                            {sasaranContoh.bukuKia
                                                ? 'Tercatat. Cocokkan kartu dengan identitas keluarga.'
                                                : 'Belum tercatat. Konfirmasi kepada orang tua.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3 p-5 sm:p-6">
                                    <Syringe
                                        className="mt-0.5 size-5 shrink-0 text-tone-amber"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <p className="font-bold">Imunisasi</p>
                                        <p className="mt-0.5 text-sm text-muted-foreground">
                                            Status perlu dikonfirmasi pada kartu
                                            KIA sebelum layanan dilanjutkan.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="overflow-hidden rounded-xl border border-border bg-card">
                            <div className="border-b border-border bg-surface-subtle px-5 py-5 sm:px-6">
                                <h2 className="text-xl font-extrabold">
                                    Catat hasil pengukuran
                                </h2>
                                <p className="mt-1 text-base text-muted-foreground">
                                    Berat dan panjang/tinggi wajib diisi. LILA
                                    dan LIKA dicatat bila diukur pada sesi ini.
                                </p>
                            </div>
                            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
                                <IsianUkur
                                    label="Berat badan"
                                    satuan="kg"
                                    nilai={bb}
                                    onGanti={setBb}
                                />
                                <IsianUkur
                                    label="Panjang / tinggi"
                                    satuan="cm"
                                    nilai={tb}
                                    onGanti={setTb}
                                />
                                <IsianUkur
                                    label="LILA"
                                    satuan="cm"
                                    nilai={lila}
                                    onGanti={setLila}
                                />
                                <IsianUkur
                                    label="LIKA"
                                    satuan="cm"
                                    nilai={lika}
                                    onGanti={setLika}
                                />
                            </div>

                            {janggal && (
                                <div className="mx-5 mb-5 flex items-start gap-3 rounded-lg bg-tone-amber-bg p-4 text-tone-amber sm:mx-6 sm:mb-6">
                                    <CircleAlert
                                        className="mt-0.5 size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <p className="font-extrabold">
                                            Ulangi pengukuran berat badan
                                        </p>
                                        <p className="mt-0.5 text-sm">
                                            Pengukuran terakhir{' '}
                                            {sasaranContoh.tanggalUkurTerakhir ??
                                                'belum tercatat'}{' '}
                                            adalah {sasaranContoh.beratTerakhir}{' '}
                                            kg. Nilai saat ini berbeda{' '}
                                            {Math.abs(selisihBerat ?? 0)
                                                .toFixed(1)
                                                .replace('.', ',')}{' '}
                                            kg. Pastikan timbangan dan penulisan
                                            angkanya sudah benar.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-4 sm:px-6">
                                <button
                                    type="button"
                                    disabled={!lengkap}
                                    onClick={() => setTersimpan(true)}
                                    className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {janggal
                                        ? 'Simpan setelah konfirmasi'
                                        : 'Simpan pengukuran'}
                                </button>
                                {!lengkap && (
                                    <p className="text-sm text-muted-foreground">
                                        Isi berat badan dan panjang/tinggi untuk
                                        melanjutkan.
                                    </p>
                                )}
                                {tersimpan && (
                                    <p className="flex items-center gap-2 text-sm font-semibold text-tone-green">
                                        <CheckCircle2
                                            className="size-5"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                        Dicatat pada demo. Produksi akan
                                        menghitung z-score di server dan
                                        menyinkronkan perangkat.
                                    </p>
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </Halaman>
    );
}

function IsianUkur({
    label,
    satuan,
    nilai,
    onGanti,
}: {
    label: string;
    satuan: string;
    nilai: string;
    onGanti: (nilai: string) => void;
}) {
    const id = `layanan-${label.toLowerCase().replace(/\W+/g, '-')}`;

    return (
        <label htmlFor={id} className="block">
            <span className="text-sm font-semibold text-muted-foreground">
                {label}
            </span>
            <span className="isian mt-1.5 flex overflow-hidden p-0">
                <input
                    id={id}
                    inputMode="decimal"
                    value={nilai}
                    onChange={(event) => onGanti(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3.5 text-right text-lg font-bold outline-none"
                />
                <span className="flex items-center border-l-2 border-border bg-surface-subtle px-3 text-sm text-muted-foreground">
                    {satuan}
                </span>
            </span>
        </label>
    );
}
