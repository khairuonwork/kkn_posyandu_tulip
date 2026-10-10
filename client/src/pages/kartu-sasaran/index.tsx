/**
 * Kartu Balita — pilih balita, periksa tampilan kartunya, lalu cetak per
 * lembar A4 (mockup yang disetujui 26 September 2026).
 *
 * Kiri daftar balita yang digulir di dalam kartunya; kanan tampilan satu kartu
 * dengan desain yang sama persis dengan dialog Cetak kartu di Detail Balita.
 * Kartu yang ditampilkan dipilih lewat <select>, karena pilihannya bisa
 * puluhan.
 */

import { Baby, Check, CreditCard, Printer, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import Halaman from '@/components/halaman';
import KartuBalita, { LembarCetak } from '@/components/kartu-balita';
import Pilih from '@/components/pilih';
import { namaTampil, umurRingkas } from '@/lib/format';

export type BalitaKartu = {
    anakId: number;
    nama: string | null;
    tglLahir: string | null;
    rt: string | null;
    namaIbu: string | null;
    nik: string | null;
    kode: string;
    umurBulan: number | null;
    /** Belum pindah dan belum berumur 5 tahun. */
    aktif: boolean;
};

type Props = {
    balita: BalitaKartu[];
    wilayahRt: string[];
    /** Id balita yang langsung terpilih, dari tombol di Detail Balita. */
    terpilihAwal?: number;
    /** Nama Posyandu di kepala kartu. */
    lembaga: string;
};

const KARTU_PER_LEMBAR = 8;

export default function KartuSasaran({
    balita,
    wilayahRt,
    terpilihAwal,
    lembaga,
}: Props) {
    const [cari, setCari] = useState('');
    const [rt, setRt] = useState('');
    const [hanyaAktif, setHanyaAktif] = useState(false);
    const [pilihan, setPilihan] = useState<Set<number>>(
        () => new Set(terpilihAwal === undefined ? [] : [terpilihAwal]),
    );
    const [tampil, setTampil] = useState(0);

    const terlihat = useMemo(() => {
        const kata = cari.trim().toLowerCase();

        return balita.filter(
            (b) =>
                (!hanyaAktif || b.aktif) &&
                (rt === '' || b.rt === rt) &&
                (kata === '' ||
                    `${b.nama ?? ''} ${b.namaIbu ?? ''} ${b.kode}`
                        .toLowerCase()
                        .includes(kata)),
        );
    }, [balita, cari, rt, hanyaAktif]);

    // Urutan kartu mengikuti urutan daftar, bukan urutan klik.
    const dipilih = balita.filter((b) => pilihan.has(b.anakId));
    const kartu = dipilih.map((b) => ({
        nama: b.nama,
        tglLahir: b.tglLahir,
        rt: b.rt,
        namaIbu: b.namaIbu,
        nik: b.nik,
        id: b.anakId,
        kode: b.kode,
    }));
    const aktif = Math.min(tampil, Math.max(0, kartu.length - 1));
    const lembar = Math.ceil(kartu.length / KARTU_PER_LEMBAR);
    const kosong = lembar * KARTU_PER_LEMBAR - kartu.length;

    const ubah = (id: number) =>
        setPilihan((lama) => {
            const baru = new Set(lama);

            if (baru.has(id)) {
                baru.delete(id);
            } else {
                baru.add(id);
            }

            return baru;
        });

    return (
        <Halaman
            ikon={CreditCard}
            penuh="lg"
            judul="Kartu Balita"
            subjudul="Setiap balita di Data Balita otomatis memiliki kartu. Pilih satu atau beberapa kartu untuk dicetak di kertas A4."
        >
            <div className="grid gap-4.5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_420px]">
                <section className="kartu flex min-w-0 flex-col overflow-hidden lg:min-h-0">
                    <div className="flex shrink-0 flex-wrap items-end gap-x-4.5 gap-y-3.5 border-b border-border px-5.5 py-4">
                        <div className="min-w-56 flex-1">
                            <label
                                htmlFor="cari-kartu"
                                className="block text-base font-semibold text-muted-foreground"
                            >
                                Cari nama balita, ibu, atau kode
                            </label>
                            <div className="isian mt-1.5 flex w-full items-stretch gap-2.5 px-3.5">
                                <Search
                                    className="size-5 shrink-0 self-center text-muted-foreground"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                <input
                                    id="cari-kartu"
                                    type="search"
                                    value={cari}
                                    onChange={(e) => setCari(e.target.value)}
                                    className="min-w-0 flex-1 bg-transparent outline-none"
                                />
                            </div>
                        </div>
                        <div className="w-40">
                            <label
                                htmlFor="rt-kartu"
                                className="block text-base font-semibold text-muted-foreground"
                            >
                                RT
                            </label>
                            <div className="mt-1.5">
                                <Pilih
                                    id="rt-kartu"
                                    value={rt}
                                    onChange={setRt}
                                >
                                    <option value="">Semua RT</option>
                                    {wilayahRt.map((w) => (
                                        <option key={w} value={w}>
                                            RT {w.padStart(2, '0')}
                                        </option>
                                    ))}
                                </Pilih>
                            </div>
                        </div>
                        {/* Tombol saringan yang sama dengan Data Balita: menyala
                            hijau solid saat aktif, bukan kotak centang. */}
                        <button
                            type="button"
                            aria-pressed={hanyaAktif}
                            aria-describedby="keterangan-aktif"
                            onClick={() => setHanyaAktif((b) => !b)}
                            className={
                                hanyaAktif
                                    ? 'tombol-utama'
                                    : 'tombol-kedua bg-surface'
                            }
                        >
                            <Baby
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Hanya balita aktif
                        </button>
                        <p
                            id="keterangan-aktif"
                            className="-mt-1 basis-full text-sm text-muted-foreground"
                        >
                            Tidak termasuk balita yang sudah pindah atau berumur
                            5 tahun.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3.5 border-b-2 border-border-strong bg-surface px-5.5 py-2">
                        <p className="font-bold" aria-live="polite">
                            {terlihat.length} balita ·{' '}
                            <span className="text-primary">
                                {pilihan.size} dipilih
                            </span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setPilihan(
                                        (lama) =>
                                            new Set([
                                                ...lama,
                                                ...terlihat.map(
                                                    (b) => b.anakId,
                                                ),
                                            ]),
                                    )
                                }
                                className="tombol-kedua px-3.5"
                            >
                                Pilih semua
                            </button>
                            <button
                                type="button"
                                onClick={() => setPilihan(new Set())}
                                className="tombol-kedua px-3.5"
                            >
                                Kosongkan pilihan
                            </button>
                        </div>
                    </div>

                    {terlihat.length === 0 ? (
                        <div className="px-6 py-10 text-center lg:flex lg:flex-1 lg:flex-col lg:items-center lg:justify-center">
                            <p className="text-base">
                                Tidak ada balita yang cocok dengan pencarian
                                ini.
                            </p>
                            {/* Sama dengan Data Balita: jalan keluar satu ketukan. */}
                            {cari !== '' && (
                                <button
                                    type="button"
                                    onClick={() => setCari('')}
                                    className="tombol-kedua mt-4"
                                >
                                    Hapus pencarian
                                </button>
                            )}
                        </div>
                    ) : (
                        <ul className="gulir-dalam max-h-[60vh] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
                            {terlihat.map((b) => {
                                const terpilih = pilihan.has(b.anakId);

                                return (
                                    <li key={b.anakId}>
                                        <label
                                            className={`flex min-h-16 cursor-pointer items-center gap-3.5 border-b border-rule px-5.5 py-2 ${
                                                terpilih
                                                    ? 'bg-accent'
                                                    : 'hover:bg-surface-subtle'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={terpilih}
                                                onChange={() => ubah(b.anakId)}
                                                className="size-6 shrink-0 accent-primary"
                                            />
                                            <span className="flex min-w-0 flex-1 flex-col">
                                                <span className="font-bold">
                                                    {namaTampil(b.nama)}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {[
                                                        umurRingkas(
                                                            b.umurBulan,
                                                        ),
                                                        b.rt === null
                                                            ? null
                                                            : `RT ${b.rt.padStart(2, '0')}`,
                                                        b.namaIbu === null
                                                            ? null
                                                            : `Ibu ${b.namaIbu}`,
                                                    ]
                                                        .filter(
                                                            (x) => x !== null,
                                                        )
                                                        .join(' · ')}
                                                </span>
                                            </span>
                                            <span className="text-sm font-bold whitespace-nowrap text-muted-foreground">
                                                {b.kode}
                                            </span>
                                            {terpilih && (
                                                <span className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-1 text-sm font-bold whitespace-nowrap text-primary ring-1 ring-primary/35 ring-inset">
                                                    <Check
                                                        className="size-4"
                                                        strokeWidth={2.5}
                                                        aria-hidden="true"
                                                    />
                                                    Dipilih
                                                </span>
                                            )}
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                <section
                    aria-labelledby="judul-tampilan"
                    className="kartu flex min-w-0 flex-col px-4.5 pt-4 pb-4.5 lg:min-h-0"
                >
                    <div className="flex items-baseline justify-between gap-2">
                        <h2
                            id="judul-tampilan"
                            className="text-lg leading-tight font-extrabold"
                        >
                            Tampilan kartu
                        </h2>
                        {kartu.length > 0 && (
                            <span className="text-sm font-semibold text-muted-foreground">
                                Kartu {aktif + 1} dari {kartu.length}
                            </span>
                        )}
                    </div>

                    {kartu.length === 0 ? (
                        <p className="mt-3 rounded-lg bg-surface-alt px-4 py-10 text-center text-base">
                            Pilih minimal satu balita.
                        </p>
                    ) : (
                        <>
                            {/* Tidak boleh menyusut: kotak ini memotong kartunya. Di layar
                                pendek jarak di sekitarnya yang dirapatkan. */}
                            <div className="mt-3 flex shrink-0 justify-center overflow-hidden rounded-lg bg-surface-alt p-3.5 lg:pendek:mt-2 lg:pendek:p-2">
                                <KartuBalita
                                    kartu={kartu[aktif]}
                                    lembaga={lembaga}
                                    skala={0.85}
                                />
                            </div>
                            <div className="mt-3.5 lg:pendek:mt-2">
                                <label
                                    htmlFor="pilih-kartu"
                                    className="block text-base font-semibold text-muted-foreground"
                                >
                                    Kartu yang ditampilkan
                                </label>
                                <div className="mt-1.5">
                                    <Pilih
                                        id="pilih-kartu"
                                        value={String(aktif)}
                                        onChange={(v) => setTampil(Number(v))}
                                        className="bg-card font-semibold"
                                    >
                                        {dipilih.map((b, i) => (
                                            <option key={b.anakId} value={i}>
                                                {i + 1}. {namaTampil(b.nama)}
                                                {b.rt !== null &&
                                                    ` · RT ${b.rt.padStart(2, '0')}`}
                                            </option>
                                        ))}
                                    </Pilih>
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground lg:pendek:mt-2">
                                <span className="font-bold text-foreground">
                                    {kartu.length} kartu · {lembar} lembar A4
                                </span>
                                {kosong > 0 && ` · ${kosong} tempat kosong`}
                            </p>
                        </>
                    )}

                    <div className="mt-auto pt-3.5 lg:pendek:pt-2">
                        <button
                            type="button"
                            disabled={kartu.length === 0}
                            onClick={() => window.print()}
                            className="tombol-utama w-full disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                        >
                            <Printer
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            {kartu.length === 0
                                ? 'Cetak kartu'
                                : `Cetak ${kartu.length} kartu`}
                        </button>
                    </div>
                </section>
            </div>

            {kartu.length > 0 && (
                <LembarCetak kartu={kartu} lembaga={lembaga} />
            )}
        </Halaman>
    );
}
