import {
    Baby,
    Check,
    CheckCheck,
    CreditCard,
    CircleHelp,
    X,
    Printer,
    Scissors,
    Search,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import BantuanDetail from '@/components/bantuan-detail';
/**
 * Kartu Balita — pilih balita, periksa tampilan kartunya, lalu cetak per
 * lembar A4 (mockup yang disetujui 26 September 2026).
 *
 * Kiri daftar balita yang digulir di dalam kartunya; kanan tampilan satu kartu
 * dengan desain yang sama persis dengan dialog Cetak kartu di Detail Balita.
 * Kartu yang ditampilkan dipilih lewat <select>, karena pilihannya bisa
 * puluhan.
 */

import Halaman from '@/components/halaman';
import KartuBalita, { LembarCetak } from '@/components/kartu-balita';
import Pilih from '@/components/pilih';
import StateHalaman from '@/components/state-halaman';
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
    const [bantuanTerbuka, setBantuanTerbuka] = useState(false);
    const tombolBantuan = useRef<HTMLButtonElement>(null);
    const [rt, setRt] = useState('');
    const [hanyaAktif, setHanyaAktif] = useState(false);
    const [pilihan, setPilihan] = useState<Set<number>>(
        () =>
            new Set(
                terpilihAwal !== undefined
                    ? [terpilihAwal]
                    : balita.length > 0
                      ? [balita[0].anakId]
                      : [],
            ),
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

    const semuaTerlihatDipilih =
        terlihat.length > 0 && terlihat.every((b) => pilihan.has(b.anakId));

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
            aksi={
                <button
                    type="button"
                    className="tombol-kedua"
                    ref={tombolBantuan}
                    aria-expanded={bantuanTerbuka}
                    aria-controls="bantuan-detail"
                    onClick={() => setBantuanTerbuka((v) => !v)}
                >
                    <CircleHelp className="size-4" aria-hidden="true" />
                    Bantuan
                </button>
            }
            judul="Kartu Identitas Balita"
            subjudul="Cetak kartu ber-QR Code untuk pendaftaran cepat di meja Posyandu. 1 Lembar kertas A4 memuat tepat 8 kartu balita."
        >
            {/* Banner Edukasi & Panduan Ibu Kader */}
            <div
                className={
                    bantuanTerbuka
                        ? 'kartu-identitas-area detail-area bantuan-terbuka'
                        : 'kartu-identitas-area detail-area'
                }
            >
                {' '}
                <div className="kartu-identitas-grid grid min-w-0 gap-4.5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_430px]">
                    <section className="kartu flex min-w-0 flex-col overflow-hidden lg:min-h-0">
                        <div className="flex shrink-0 flex-wrap items-end gap-x-4.5 gap-y-3.5 border-b border-border px-5.5 py-4">
                            <div className="min-w-56 flex-1">
                                <label
                                    htmlFor="cari-kartu"
                                    className="block text-sm font-semibold text-muted-foreground"
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
                                        placeholder="Ketik nama balita, ibu, atau kode SPT..."
                                        value={cari}
                                        onChange={(e) =>
                                            setCari(e.target.value)
                                        }
                                        className="min-w-0 flex-1 bg-transparent outline-none"
                                    />
                                </div>
                            </div>
                            <div className="w-40">
                                <label
                                    htmlFor="rt-kartu"
                                    className="block text-sm font-semibold text-muted-foreground"
                                >
                                    Wilayah RT
                                </label>
                                <div className="mt-1.5">
                                    <Pilih
                                        id="rt-kartu"
                                        value={rt}
                                        onChange={setRt}
                                    >
                                        <option value="">
                                            Semua Wilayah RT
                                        </option>
                                        {wilayahRt.map((w) => (
                                            <option key={w} value={w}>
                                                RT {w.padStart(2, '0')}
                                            </option>
                                        ))}
                                    </Pilih>
                                </div>
                            </div>
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
                                {hanyaAktif ? (
                                    <span className="inline-flex items-center gap-1">
                                        <Check
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>Hanya Balita Aktif</span>
                                    </span>
                                ) : (
                                    <span>Semua Status Balita</span>
                                )}
                            </button>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3.5 border-b-2 border-border-strong bg-surface px-5.5 py-2.5">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex size-2 rounded-full bg-primary" />
                                <p
                                    className="text-sm font-extrabold text-foreground"
                                    aria-live="polite"
                                >
                                    {terlihat.length} Balita Sasaran ·{' '}
                                    <span className="ml-1 inline-flex rounded-md bg-accent px-2 py-1 text-sm font-bold text-primary">
                                        {pilihan.size} Dipilih
                                    </span>
                                </p>
                            </div>
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
                                    disabled={
                                        terlihat.length === 0 ||
                                        semuaTerlihatDipilih
                                    }
                                    data-lengkap={semuaTerlihatDipilih}
                                    className="kartu-aksi-pilih tombol-kedua gap-2 px-4 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <CheckCheck
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {semuaTerlihatDipilih
                                            ? 'Semua terpilih'
                                            : 'Pilih semua'}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPilihan(new Set())}
                                    disabled={pilihan.size === 0}
                                    className="kartu-aksi-kosongkan tombol-kedua gap-2 px-4 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                    Kosongkan
                                </button>
                            </div>
                        </div>

                        {terlihat.length === 0 ? (
                            <StateHalaman
                                jenis="kosong"
                                judul={
                                    balita.length === 0
                                        ? 'Belum ada data balita'
                                        : 'Tidak ada balita yang cocok'
                                }
                                pesan={
                                    balita.length === 0
                                        ? 'Tambahkan data balita melalui menu Data Balita atau Sasaran & Impor.'
                                        : 'Ubah pencarian atau filter untuk melihat daftar kembali.'
                                }
                            >
                                {(cari !== '' || rt !== '' || hanyaAktif) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCari('');
                                            setRt('');
                                            setHanyaAktif(false);
                                        }}
                                        className="tombol-kedua mt-4"
                                    >
                                        Reset pencarian dan filter
                                    </button>
                                )}
                            </StateHalaman>
                        ) : (
                            <ul className="gulir-dalam max-h-[60vh] overflow-y-auto lg:max-h-none lg:min-h-0 lg:flex-1">
                                {terlihat.map((b) => {
                                    const terpilih = pilihan.has(b.anakId);

                                    return (
                                        <li key={b.anakId}>
                                            <label
                                                className={`kartu-baris-pilihan flex min-h-16 cursor-pointer items-center gap-3.5 border-b px-5.5 py-2.5 ${
                                                    terpilih
                                                        ? 'border-emerald-300 bg-emerald-50/70'
                                                        : 'border-rule hover:bg-surface-subtle'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={terpilih}
                                                    onChange={() =>
                                                        ubah(b.anakId)
                                                    }
                                                    className="size-5 shrink-0 rounded accent-primary"
                                                />
                                                <span className="flex min-w-0 flex-1 flex-col">
                                                    <span className="font-bold text-foreground">
                                                        {namaTampil(b.nama)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
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
                                                                (x) =>
                                                                    x !== null,
                                                            )
                                                            .join(' · ')}
                                                    </span>
                                                </span>
                                                <span className="rounded bg-surface-subtle px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                                                    {b.kode}
                                                </span>
                                                {terpilih ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                                        <Check
                                                            className="size-3.5"
                                                            strokeWidth={2.5}
                                                            aria-hidden="true"
                                                        />
                                                        Terpilih
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        Pilih
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
                        className="kartu flex min-w-0 flex-col p-4.5 lg:min-h-0 lg:overflow-y-auto"
                    >
                        <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                                        Format Cetak Asli
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                        85.6 × 54 mm
                                    </span>
                                </div>
                                <h2
                                    id="judul-tampilan"
                                    className="mt-1 text-base font-extrabold text-foreground"
                                >
                                    Pratinjau Kartu Fisik
                                </h2>
                            </div>
                            {kartu.length > 0 && (
                                <span className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-extrabold text-foreground">
                                    {aktif + 1} dari {kartu.length} kartu
                                </span>
                            )}
                        </div>

                        {kartu.length === 0 ? (
                            <div className="my-auto rounded-xl border border-dashed border-border bg-surface-alt p-6 text-center">
                                <CreditCard
                                    className="mx-auto size-10 text-muted-foreground/60"
                                    strokeWidth={1.5}
                                />
                                <p className="mt-2 text-sm font-bold text-foreground">
                                    Belum Ada Kartu Terpilih
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Centang minimal satu balita di daftar
                                    sebelah kiri untuk melihat tampilan kartu
                                    fisik.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Kotak Pratinjau Kartu */}
                                <div
                                    key={`${dipilih.map((b) => b.anakId).join(',')}:${aktif}`}
                                    className="kartu-pratinjau-masuk mt-3 flex shrink-0 flex-col items-center justify-center rounded-xl border border-border/80 bg-surface-subtle/80 p-3 shadow-inner lg:pendek:mt-2 lg:pendek:p-2"
                                >
                                    <KartuBalita
                                        kartu={kartu[aktif]}
                                        lembaga={lembaga}
                                        skala={bantuanTerbuka ? 0.54 : 0.82}
                                    />
                                    <p className="mt-2 inline-flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-muted-foreground">
                                        <Scissors
                                            className="size-3.5 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <span>
                                            Garis luar putus-putus adalah
                                            panduan gunting setelah dicetak
                                        </span>
                                    </p>
                                </div>

                                <div className="mt-3">
                                    <label
                                        htmlFor="pilih-kartu"
                                        className="block text-xs font-bold text-muted-foreground"
                                    >
                                        Pilih Kartu untuk Dilihat:
                                    </label>
                                    <div className="mt-1">
                                        <Pilih
                                            id="pilih-kartu"
                                            value={String(aktif)}
                                            onChange={(v) =>
                                                setTampil(Number(v))
                                            }
                                            className="bg-card text-xs font-bold"
                                        >
                                            {dipilih.map((b, i) => (
                                                <option
                                                    key={b.anakId}
                                                    value={i}
                                                >
                                                    {i + 1}.{' '}
                                                    {namaTampil(b.nama)} (
                                                    {b.kode})
                                                    {b.rt !== null &&
                                                        ` · RT ${b.rt.padStart(2, '0')}`}
                                                </option>
                                            ))}
                                        </Pilih>
                                    </div>
                                </div>

                                {/* Ringkasan Lembar Cetak A4 */}
                                <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs">
                                    <span className="inline-flex items-center gap-1.5 font-extrabold tracking-wide text-foreground uppercase">
                                        <Printer
                                            className="size-4 shrink-0 text-primary"
                                            aria-hidden="true"
                                        />
                                        <span>Rincian Lembar Kertas A4:</span>
                                    </span>
                                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
                                        <div className="rounded-lg bg-surface-subtle p-2">
                                            <span className="text-muted-foreground">
                                                Kebutuhan Kertas:
                                            </span>
                                            <p className="text-sm font-extrabold text-primary">
                                                {lembar} Lembar A4
                                            </p>
                                        </div>
                                        <div className="rounded-lg bg-surface-subtle p-2">
                                            <span className="text-muted-foreground">
                                                Kapasitas Slot:
                                            </span>
                                            <p className="text-sm font-extrabold text-foreground">
                                                {kartu.length} /{' '}
                                                {lembar * KARTU_PER_LEMBAR}{' '}
                                                Kartu
                                            </p>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-[11px] text-muted-foreground">
                                        {kosong > 0
                                            ? `Terdapat ${kosong} slot kartu kosong pada lembar A4 terakhir.`
                                            : 'Lembar A4 pas terisi penuh tanpa slot kosong.'}
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="mt-auto pt-4">
                            <button
                                type="button"
                                disabled={kartu.length === 0}
                                onClick={() => window.print()}
                                className="tombol-utama w-full py-2.5 text-sm font-extrabold shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Printer
                                    className="size-4.5"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                {kartu.length === 0
                                    ? 'Pilih Balita untuk Cetak'
                                    : `Cetak ${kartu.length} Kartu (${lembar} Lembar A4)`}
                            </button>
                        </div>
                    </section>
                </div>
                <BantuanDetail
                    bagian="kartu"
                    sop="admin"
                    terbuka={bantuanTerbuka}
                    onTutup={() => {
                        setBantuanTerbuka(false);
                        tombolBantuan.current?.focus();
                    }}
                />
            </div>{' '}
            {/* Bilah Navigasi Langkah Berikutnya */}
            <></>
            {kartu.length > 0 && (
                <LembarCetak kartu={kartu} lembaga={lembaga} />
            )}
        </Halaman>
    );
}
