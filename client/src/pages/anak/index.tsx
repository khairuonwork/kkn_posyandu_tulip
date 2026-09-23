/**
 * Data Balita — docs/rujukan/layar-demo.md bagian 6.4, tampilan Prototipe v2.
 *
 * Membuktikan bahwa mencari seorang anak butuh beberapa detik, bukan membuka
 * dua belas berkas Excel — dan sejak v2, bahwa memperbaiki satu angka salah
 * tidak perlu meninggalkan daftarnya.
 */

import { Baby, ChevronRight, Filter, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import EmptyState from '@/components/empty-state';
import Halaman from '@/components/halaman';
import StatusGiziBadge from '@/components/status-gizi-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    angka,
    KOSONG,
    labelIndeks,
    namaTampil,
    tanggalRingkas,
    umurRingkas,
    zScore,
} from '@/lib/format';
import { kategoriDariZ } from '@/lib/kategori';
import { Link } from '@/lib/nav';
import { hitungZ, susunTabel } from '@/lib/z-score';
import type { BarisLms } from '@/lib/z-score';
import type { Indeks, JenisKelamin, Peran, Periode } from '@/types/posyandu';

export type BarisAnak = {
    anakId: number;
    nama: string | null;
    nik: string | null;
    nikLengkap: boolean;
    jk: JenisKelamin | null;
    umurBulan: number | null;
    rt: string | null;
    namaOrtu: string | null;
    tanggalUkurTerakhir: string | null;
    /** Kategori BB/TB saja — bukan alasan anak ini ditandai. */
    kategoriGizi: string | null;
    perluPerhatian: boolean;
    /**
     * Risiko yang dibawa sejak lahir, atau null.
     *
     * Berat lahir rendah dan tidak punya Buku KIA — keduanya sudah tercatat di
     * arsip sejak impor dan tidak pernah sekali pun muncul di layar. Keduanya
     * menaikkan kewaspadaan pada anak yang hari ini berstatus gizi baik.
     */
    risikoLahir: string | null;
    /** Indeks yang memicu penanda perhatian: bisa BB/U atau TB/U, bukan BB/TB. */
    indeksPemicu: Indeks | null;
    kategoriPemicu: string | null;
    /** Null berarti tidak ada pengukuran pada periode ini, bukan nol. */
    bbKg: number | null;
    tinggiCm: number | null;
};

/** Perubahan identitas dan pengukuran dari satu baris yang dibuka. */
export type PatchAnak = {
    nama: string;
    nik: string;
    namaOrtu: string;
    rt: string;
    bbKg: number | null;
    tinggiCm: number | null;
};

export type AnakBaru = {
    nama: string;
    tglLahir: string;
    jk: JenisKelamin;
    namaOrtu: string;
    rt: string;
};

type Props = {
    anak: BarisAnak[];
    wilayahRt: string[];
    rw: string;
    peran: Peran;
    /** Kader terkunci ke RT binaannya; null berarti bebas memilih. */
    rtTerkunci: string | null;
    periode: Periode;
    /**
     * Tabel LMS WHO untuk pratinjau z-score saat mengetik. Tanpa ini editor
     * tetap jalan, hanya angka gizinya yang menunggu sampai disimpan.
     */
    standarLms?: BarisLms[];
    onSimpanAnak?: (anakId: number, patch: PatchAnak) => void;
    onTambahAnak?: (baru: AnakBaru) => void;
};

/** `RT 01` … `RT 07`, bukan `RT 1`. */
function labelRt(rt: string): string {
    return `RT ${rt.padStart(2, '0')}`;
}

/** Titik desimal maupun koma diterima; kader mengetik apa yang tertera di alat. */
function keAngka(teks: string): number | null {
    const bersih = teks.trim().replace(',', '.');

    if (bersih === '') {
        return null;
    }

    const n = Number(bersih);

    return Number.isFinite(n) ? n : null;
}

/**
 * Alasan baris ini ditandai, saat alasannya bukan BB/TB.
 *
 * Kolom `Status gizi` hanya membaca BB/TB; penanda perhatian membaca ketiga
 * indeks. Tanpa baris ini, menyalakan "Hanya yang perlu perhatian" memulangkan
 * sepuluh anak yang tujuh di antaranya berlabel `Gizi baik` - kolom yang
 * seharusnya menjawab "kenapa dia di sini" justru berkata dia tidak apa-apa,
 * dan penandanya terbaca rusak.
 */
function Pemicu({ baris }: { baris: BarisAnak }) {
    if (
        !baris.perluPerhatian ||
        baris.indeksPemicu === null ||
        baris.indeksPemicu === 'BB_TB' ||
        baris.kategoriPemicu === null
    ) {
        return null;
    }

    return (
        <span className="mt-1 block text-sm text-tone-amber">
            Ditandai: {baris.kategoriPemicu} (
            {labelIndeks(baris.indeksPemicu, baris.umurBulan)})
        </span>
    );
}

/**
 * Risiko sejak lahir pada satu baris.
 *
 * Nada biru, bukan oranye: ini riwayat, bukan vonis bulan ini. Anak BBLR yang
 * hari ini gizi baik tetap gizi baik — yang ditambahkan hanya alasan untuk
 * memperhatikannya lebih lama.
 */
function Risiko({ baris }: { baris: BarisAnak }) {
    if (baris.risikoLahir === null) {
        return null;
    }

    return (
        <span className="mt-1 block text-sm text-tone-blue">
            {baris.risikoLahir}
        </span>
    );
}

export default function DaftarAnak({
    anak,
    wilayahRt,
    rw,
    peran,
    rtTerkunci,
    periode,
    standarLms,
    onSimpanAnak,
    onTambahAnak,
}: Props) {
    const [cari, setCari] = useState('');
    const [rt, setRt] = useState(rtTerkunci ?? '');
    const [hanyaPerhatian, setHanyaPerhatian] = useState(false);
    const [hanyaRisiko, setHanyaRisiko] = useState(false);
    const [dibuka, setDibuka] = useState<number | null>(null);
    const [menambah, setMenambah] = useState(false);

    const bolehUbah = peran !== 'kader';
    const rtAktif = rtTerkunci ?? rt;
    // Kader hanya pernah melihat RT binaannya. Menyebut jumlah se-RW di
    // subjudulnya membuat dua angka berbeda berdiri 40 px bersebelahan.
    const terlihat =
        rtTerkunci === null ? anak : anak.filter((b) => b.rt === rtTerkunci);

    // 906 baris standar hanya perlu disusun sekali, bukan tiap ketukan papan
    // tombol di dalam editor.
    const tabelLms = useMemo(
        () => (standarLms === undefined ? null : susunTabel(standarLms)),
        [standarLms],
    );

    const hasil = useMemo(() => {
        const kunci = cari.trim().toLowerCase();

        return anak.filter((baris) => {
            if (rtAktif !== '' && baris.rt !== rtAktif) {
                return false;
            }

            if (hanyaPerhatian && !baris.perluPerhatian) {
                return false;
            }

            if (hanyaRisiko && baris.risikoLahir === null) {
                return false;
            }

            // Pencarian mencocokkan nama balita maupun nama ibu — itu cara kader
            // mengingat.
            const sasaran =
                `${baris.nama ?? ''} ${baris.namaOrtu ?? ''}`.toLowerCase();

            return kunci === '' || sasaran.includes(kunci);
        });
    }, [anak, cari, rtAktif, hanyaPerhatian, hanyaRisiko]);

    return (
        <Halaman
            ikon={Baby}
            penuh="lg"
            judul="Data Balita"
            subjudul={`${
                rtTerkunci === null
                    ? `${anak.length} balita terdaftar di RW ${rw}`
                    : `${terlihat.length} balita di ${labelRt(rtTerkunci)}, wilayah binaan Anda`
            }. Data contoh.`}
            aksi={
                bolehUbah && (
                    <button
                        type="button"
                        onClick={() => {
                            setMenambah((b) => !b);
                            setDibuka(null);
                        }}
                        aria-expanded={menambah}
                        className="tombol-utama"
                    >
                        <Plus className="size-5" strokeWidth={2.5} />
                        Tambah balita
                    </button>
                )
            }
        >
            {/* Bilah saring artboard: membentang penuh tepat di bawah bilah
                kepala, dipisah satu garis — bukan kartu melayang di atas abu.
                Label selalu di atas kotaknya, tidak pernah jadi placeholder. */}
            <div className="-mx-4 -mt-6 mb-6 flex flex-wrap items-end gap-3.5 border-b border-border bg-card px-4 py-4.5 sm:-mx-7 sm:-mt-7 sm:px-7">
                <div className="max-w-100 min-w-64 flex-1">
                    <label
                        htmlFor="cari-anak"
                        className="block text-sm font-semibold text-muted-foreground"
                    >
                        Cari nama balita atau nama ibu
                    </label>
                    {/* `items-stretch`, bukan `items-center`: dengan
                        `items-center` kotak isian setinggi 45 px hanya
                        meneruskan 15 px ke <input>, dan bantalan di atas serta
                        di bawahnya mati terhadap sentuhan. Ini kotak pertama
                        yang disentuh kader tiap sesi. */}
                    <div className="isian mt-1.5 flex w-full items-stretch gap-2.5 px-3.5">
                        <Search
                            className="size-5 shrink-0 self-center text-muted-foreground"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        <input
                            id="cari-anak"
                            type="search"
                            value={cari}
                            onChange={(e) => setCari(e.target.value)}
                            className="min-w-0 flex-1 self-stretch bg-transparent text-base outline-none"
                        />
                    </div>
                </div>

                {/* Kader terkunci ke satu RT. Dulu ini <select disabled> yang
                    tetap memuat ketujuh RT dengan opacity 0.6 - kontrol mati
                    yang masih berbentuk kontrol, dan kontrasnya jatuh ke 4,6:1.
                    Sekarang ia keterangan biasa. */}
                {rtTerkunci !== null ? (
                    <p className="flex min-h-13 items-center rounded-lg bg-surface-alt px-3.5 text-base">
                        {labelRt(rtTerkunci)}, wilayah binaan Anda
                    </p>
                ) : (
                    <div>
                        <label
                            htmlFor="filter-rt"
                            className="block text-sm font-semibold text-muted-foreground"
                        >
                            RT
                        </label>
                        <select
                            id="filter-rt"
                            value={rtAktif}
                            onChange={(e) => setRt(e.target.value)}
                            className="isian mt-1.5 font-semibold"
                        >
                            <option value="">Semua RT</option>
                            {wilayahRt.map((w) => (
                                <option key={w} value={w}>
                                    {labelRt(w)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Tombol saring artboard: menyala penuh saat aktif. Ditulis
                    sebagai <button aria-pressed>, bukan span role=button milik
                    prototipe — keadaan tertekannya harus sampai ke pembaca
                    layar, bukan hanya ke mata. */}
                <button
                    type="button"
                    aria-pressed={hanyaPerhatian}
                    onClick={() => setHanyaPerhatian((b) => !b)}
                    className={
                        hanyaPerhatian
                            ? 'tombol-utama'
                            : 'tombol-kedua bg-surface'
                    }
                >
                    <Filter className="size-5" strokeWidth={2.5} />
                    Hanya yang perlu perhatian
                </button>

                {/* Saringan kedua, bukan gabungan: "perlu perhatian" menyaring
                    status gizi bulan ini, ini menyaring riwayat sejak lahir.
                    Dua pertanyaan berbeda, dan seorang anak bisa masuk salah
                    satu tanpa masuk yang lain. */}
                <button
                    type="button"
                    aria-pressed={hanyaRisiko}
                    onClick={() => setHanyaRisiko((b) => !b)}
                    className={
                        hanyaRisiko ? 'tombol-utama' : 'tombol-kedua bg-surface'
                    }
                >
                    <Filter className="size-5" strokeWidth={2.5} />
                    Berisiko sejak lahir
                </button>
            </div>

            {menambah && (
                <FormTambah
                    wilayahRt={wilayahRt}
                    rtAwal={rtTerkunci ?? ''}
                    onBatal={() => setMenambah(false)}
                    onSimpan={(baru) => {
                        onTambahAnak?.(baru);
                        setMenambah(false);
                    }}
                />
            )}

            {/* Jumlah hasil selalu terlihat. */}
            <p className="text-base" aria-live="polite">
                {hasil.length} dari {terlihat.length} balita
            </p>

            {hasil.length === 0 ? (
                <div className="mt-4">
                    <EmptyState
                        sebab={
                            cari.trim() === ''
                                ? `Tidak ada balita yang cocok dengan filter di ${rtAktif === '' ? 'seluruh RT' : labelRt(rtAktif)}.`
                                : `Tidak ada anak bernama "${cari.trim()}" di ${rtAktif === '' ? 'seluruh RT' : labelRt(rtAktif)}.`
                        }
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setCari('');
                                setRt(rtTerkunci ?? '');
                                setHanyaPerhatian(false);
                            }}
                            className="tombol-kedua"
                        >
                            Kosongkan filter
                        </button>
                    </EmptyState>
                </div>
            ) : (
                <>
                    {/* Di bawah 768 px tabel tujuh kolom butuh geser samping
                        2,3x dan kolom Aksi berada di luar layar. Daftar kartu
                        menaruh tiap anak dalam satu blok yang bisa disentuh
                        seluruhnya. */}
                    <ul className="mt-4 flex flex-col gap-3 md:hidden">
                        {hasil.map((baris) => (
                            <li key={baris.anakId}>
                                <Link
                                    href={`/balita/${baris.anakId}`}
                                    className="kartu flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface-subtle"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-base font-bold">
                                            {namaTampil(baris.nama)}
                                        </span>
                                        <span className="mt-0.5 block text-sm text-muted-foreground">
                                            {umurRingkas(baris.umurBulan)}
                                            {baris.rt !== null &&
                                                `, ${labelRt(baris.rt)}`}
                                            {baris.namaOrtu !== null &&
                                                `, ibu ${baris.namaOrtu}`}
                                        </span>
                                        <span className="mt-2 flex flex-wrap items-center gap-2">
                                            <StatusGiziBadge
                                                kategori={baris.kategoriGizi}
                                            />
                                            {!baris.nikLengkap && (
                                                <span className="text-sm text-tone-amber">
                                                    NIK belum lengkap
                                                </span>
                                            )}
                                        </span>
                                        <Pemicu baris={baris} />
                                        <Risiko baris={baris} />
                                    </span>
                                    <ChevronRight
                                        className="size-5 shrink-0 text-muted-foreground"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Tabelnya dibatasi tinggi jendela: kartunya menyerap
                        sisa ruang dan badan tabel yang menggulir, bukan
                        halamannya. Kepala kolom `sticky` berlabuh ke wadah
                        gulir itu, jadi ia tetap terbaca sampai baris ke-101. */}
                    <div className="kartu mt-4 hidden overflow-hidden md:block lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
                        <Table containerClassName="lg:min-h-0 lg:flex-1">
                            <TableHeader>
                                {/* Menempel saat digulir: 101 baris tanpa ini
                                    berarti tujuh kolom tanpa nama begitu baris
                                    ketiga lewat. */}
                                <TableRow className="sticky top-0 z-10">
                                    <TableHead scope="col" className="w-[28%]">
                                        Nama balita
                                    </TableHead>
                                    <TableHead scope="col">Umur</TableHead>
                                    <TableHead scope="col">RT</TableHead>
                                    {/* Nama ibu tetap dapat dicari, tapi ia
                                        bantuan ingatan - bukan kolom yang
                                        dipindai. Di tablet ia mengalah supaya
                                        tabelnya tidak perlu digeser. */}
                                    <TableHead
                                        scope="col"
                                        className="hidden lg:table-cell"
                                    >
                                        Ibu
                                    </TableHead>
                                    {/* Sama seperti kolom Ibu: di bawah 1024 px
                                        tabel ini hanya menyisakan nama, umur,
                                        RT, status, dan aksi. Kolom rinci kembali
                                        di layar lebar - keduanya juga ada di
                                        halaman anaknya sendiri. */}
                                    <TableHead
                                        scope="col"
                                        className="hidden lg:table-cell"
                                    >
                                        Ditimbang terakhir
                                    </TableHead>
                                    {/* Menyebut indeksnya sekarang: kolom ini
                                        hanya membaca BB/TB, sementara penanda
                                        perhatian membaca ketiganya. Tanpa nama
                                        indeks di kepala kolom, `Gizi baik` pada
                                        baris bertanda terbaca sebagai bantahan,
                                        bukan sebagai jawaban atas indeks lain. */}
                                    <TableHead scope="col">
                                        Status gizi (BB/TB)
                                    </TableHead>
                                    <TableHead
                                        scope="col"
                                        className="text-right"
                                    >
                                        Aksi
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            {/* Di-key menurut filter supaya barisnya benar-benar
                                dipasang ulang, dan jeda bertahapnya terlihat
                                setiap kali hasil pencarian berganti (bagian 8.4). */}
                            <TableBody
                                key={`${cari}|${rtAktif}|${hanyaPerhatian}`}
                            >
                                {hasil.map((baris, urutan) => {
                                    const terbuka = dibuka === baris.anakId;

                                    return [
                                        <TableRow
                                            key={baris.anakId}
                                            className={`baris-masuk ${terbuka ? 'bg-accent' : ''}`}
                                            style={{
                                                // Dibatasi delapan baris pertama: lebih
                                                // dari itu jedanya terasa seperti lambat,
                                                // bukan seperti berganti isi.
                                                animationDelay: `${Math.min(urutan, 8) * 20}ms`,
                                            }}
                                        >
                                            {/* Nama panjang membungkus ke baris kedua,
                                                tidak dipotong elipsis. */}
                                            <TableCell className="font-semibold">
                                                {namaTampil(baris.nama)}
                                                {!baris.nikLengkap && (
                                                    <span className="block text-sm font-normal text-tone-amber">
                                                        NIK belum lengkap
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {umurRingkas(baris.umurBulan)}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {baris.rt === null
                                                    ? KOSONG
                                                    : labelRt(baris.rt)}
                                            </TableCell>
                                            <TableCell className="hidden max-w-56 lg:table-cell">
                                                {baris.namaOrtu ?? KOSONG}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                {tanggalRingkas(
                                                    baris.tanggalUkurTerakhir,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusGiziBadge
                                                    kategori={
                                                        baris.kategoriGizi
                                                    }
                                                />
                                                <Pemicu baris={baris} />
                                                <Risiko baris={baris} />
                                            </TableCell>
                                            {/* Dulu dua tautan teks setinggi 26 px.
                                                Sekarang keduanya kotak sentuh penuh. */}
                                            <TableCell className="py-1">
                                                <span className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/balita/${baris.anakId}`}
                                                        className="inline-flex min-h-13 items-center rounded-lg px-3 font-semibold text-primary underline"
                                                    >
                                                        Detail
                                                    </Link>
                                                    {bolehUbah && (
                                                        <button
                                                            type="button"
                                                            aria-expanded={
                                                                terbuka
                                                            }
                                                            onClick={() => {
                                                                setDibuka(
                                                                    terbuka
                                                                        ? null
                                                                        : baris.anakId,
                                                                );
                                                                setMenambah(
                                                                    false,
                                                                );
                                                            }}
                                                            className={`inline-flex min-h-13 items-center rounded-lg px-3.5 font-bold ${
                                                                terbuka
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'text-primary underline'
                                                            }`}
                                                        >
                                                            {terbuka
                                                                ? 'Tutup'
                                                                : 'Ubah'}
                                                        </button>
                                                    )}
                                                </span>
                                            </TableCell>
                                        </TableRow>,

                                        terbuka && (
                                            <TableRow
                                                key={`${baris.anakId}-ubah`}
                                                className="bg-accent"
                                            >
                                                <TableCell
                                                    colSpan={7}
                                                    className="p-0"
                                                >
                                                    <EditorBaris
                                                        baris={baris}
                                                        periode={periode}
                                                        wilayahRt={wilayahRt}
                                                        tabelLms={tabelLms}
                                                        onTutup={() =>
                                                            setDibuka(null)
                                                        }
                                                        onSimpan={(patch) => {
                                                            onSimpanAnak?.(
                                                                baris.anakId,
                                                                patch,
                                                            );
                                                            setDibuka(null);
                                                        }}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ),
                                    ];
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </Halaman>
    );
}

/** Satu kotak isian berlabel. Bentuk yang sama dipakai editor dan form tambah. */
function Isian({
    label,
    nilai,
    onGanti,
    tipe = 'text',
    petunjuk,
}: {
    label: string;
    nilai: string;
    onGanti: (v: string) => void;
    tipe?: string;
    petunjuk?: string;
}) {
    const id = `isian-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <label htmlFor={id} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-muted-foreground">
                {label}
            </span>
            <input
                id={id}
                type={tipe}
                value={nilai}
                placeholder={petunjuk}
                onChange={(e) => onGanti(e.target.value)}
                className="isian w-full"
            />
        </label>
    );
}

/** Isian bersatuan: angka rata kanan, satuannya melekat di tepi kotak. */
function IsianUkur({
    label,
    satuan,
    nilai,
    onGanti,
}: {
    label: string;
    satuan: string;
    nilai: string;
    onGanti: (v: string) => void;
}) {
    const id = `ukur-${satuan}`;

    return (
        <label htmlFor={id} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-muted-foreground">
                {label}
            </span>
            <span className="isian flex items-stretch overflow-hidden p-0">
                <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    value={nilai}
                    onChange={(e) => onGanti(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3.5 text-right text-lg font-bold outline-none"
                />
                <span className="flex items-center border-l-2 border-border bg-surface-subtle px-3 text-sm text-muted-foreground">
                    {satuan}
                </span>
            </span>
        </label>
    );
}

/**
 * Editor satu baris.
 *
 * Angka gizi dihitung ulang saat mengetik supaya kader melihat akibat koreksinya
 * sebelum menyimpan — itulah gunanya membuka baris, bukan sekadar mengubah teks.
 * Server tetap yang menghitung ulang dan menyimpan (lib/z-score.ts).
 */
function EditorBaris({
    baris,
    periode,
    wilayahRt,
    tabelLms,
    onTutup,
    onSimpan,
}: {
    baris: BarisAnak;
    periode: Periode;
    wilayahRt: string[];
    tabelLms: ReturnType<typeof susunTabel> | null;
    onTutup: () => void;
    onSimpan: (patch: PatchAnak) => void;
}) {
    const [nama, setNama] = useState(baris.nama ?? '');
    const [nik, setNik] = useState(baris.nik ?? '');
    const [namaOrtu, setNamaOrtu] = useState(baris.namaOrtu ?? '');
    const [rt, setRt] = useState(baris.rt ?? '');
    const [bb, setBb] = useState(
        baris.bbKg === null ? '' : angka(baris.bbKg, 1),
    );
    const [tinggi, setTinggi] = useState(
        baris.tinggiCm === null ? '' : angka(baris.tinggiCm, 1),
    );

    const adaUkuran = baris.bbKg !== null || baris.tinggiCm !== null;
    const bbAngka = keAngka(bb);
    const tinggiAngka = keAngka(tinggi);
    const umur = baris.umurBulan;
    const jk = baris.jk;

    // Ketiga indeks inti, dihitung dari isi kotak saat ini.
    const kartuZ = useMemo(() => {
        if (tabelLms === null || jk === null || umur === null) {
            return null;
        }

        const permintaan: [Indeks, number | null, number | null][] = [
            ['BB_TB', tinggiAngka, bbAngka],
            ['BB_U', umur, bbAngka],
            ['TB_U', umur, tinggiAngka],
        ];

        return permintaan.map(([indeks, kunci, nilai]) => {
            const z =
                kunci === null || nilai === null
                    ? null
                    : hitungZ(tabelLms, indeks, jk, kunci, nilai);

            return {
                indeks,
                label: labelIndeks(indeks, umur),
                z,
                kategori: z === null ? null : kategoriDariZ(indeks, z),
            };
        });
    }, [tabelLms, jk, umur, bbAngka, tinggiAngka]);

    return (
        /* Pita hijau menandai baris yang sedang dibuka; formulirnya sendiri
           berdiri di kartu putih di dalamnya — susunan artboard. Kotak isian
           berlatar --surface tidak terbaca langsung di atas hijau. */
        <div className="border-t-2 border-border px-5 py-6 sm:px-6">
            <div className="kartu flex flex-col gap-6 p-5 sm:p-6">
                <section className="flex flex-col gap-3.5">
                    <h3 className="text-base font-bold">Identitas</h3>
                    {/* Telepon ada di v2 tapi tidak ada kolomnya di basis data
                        (app/Models/OrangTua.php hanya menyimpan nik dan nama).
                        Kotak yang tidak punya tempat menyimpan lebih buruk
                        daripada kotak yang tidak ada. */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Isian
                            label="Nama balita"
                            nilai={nama}
                            onGanti={setNama}
                        />
                        <Isian label="NIK" nilai={nik} onGanti={setNik} />
                        <Isian
                            label="Ibu"
                            nilai={namaOrtu}
                            onGanti={setNamaOrtu}
                        />
                        <label
                            htmlFor="ubah-rt"
                            className="flex flex-col gap-1.5"
                        >
                            <span className="text-sm font-semibold text-muted-foreground">
                                RT
                            </span>
                            <select
                                id="ubah-rt"
                                value={rt}
                                onChange={(e) => setRt(e.target.value)}
                                className="isian w-full"
                            >
                                {wilayahRt.map((w) => (
                                    <option key={w} value={w}>
                                        {labelRt(w)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </section>

                {adaUkuran ? (
                    <section className="flex flex-col gap-3.5 border-t border-border pt-6">
                        <h3 className="text-base font-bold">
                            Pengukuran {periode.label}
                        </h3>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <IsianUkur
                                label="Berat badan"
                                satuan="kg"
                                nilai={bb}
                                onGanti={setBb}
                            />
                            <IsianUkur
                                label={
                                    umur !== null && umur >= 24
                                        ? 'Tinggi badan'
                                        : 'Panjang badan'
                                }
                                satuan="cm"
                                nilai={tinggi}
                                onGanti={setTinggi}
                            />
                        </div>

                        {kartuZ !== null && (
                            <div className="mt-1 rounded-xl border border-border bg-surface p-4 sm:p-5">
                                <h4 className="text-sm font-bold text-muted-foreground">
                                    Hasil hitung WHO 2006
                                </h4>

                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    {kartuZ.map((k) => (
                                        <div
                                            key={k.indeks}
                                            className="rounded-lg border border-border bg-card px-4 py-3"
                                        >
                                            <p className="flex items-baseline gap-1.5">
                                                <span className="text-xl font-extrabold">
                                                    {k.z === null
                                                        ? KOSONG
                                                        : zScore(k.z)}
                                                </span>
                                                {k.z !== null && (
                                                    <span className="text-sm text-muted-foreground">
                                                        SD
                                                    </span>
                                                )}
                                            </p>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                {k.label}
                                            </p>
                                            {k.kategori !== null && (
                                                <p className="mt-1.5">
                                                    <StatusGiziBadge
                                                        kategori={k.kategori}
                                                    />
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-3 text-sm text-pretty text-muted-foreground">
                                    Angka pratinjau. Saat disimpan, server
                                    menghitung ulang dan nilainya itu yang
                                    tercatat. Indeks mengikuti umur anak: BB/PB
                                    di bawah 24 bulan, BB/TB untuk 24 bulan ke
                                    atas.
                                </p>
                            </div>
                        )}
                    </section>
                ) : (
                    <div className="rounded-xl border border-tone-amber bg-tone-amber-bg px-5 py-4">
                        <p className="text-base font-bold text-tone-amber">
                            Belum ada pengukuran {periode.label}
                        </p>
                        <p className="mt-0.5 text-base text-pretty">
                            Identitas tetap bisa diubah. Berat dan tinggi baru
                            bisa dicatat lewat penimbangan.
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
                    <button
                        type="button"
                        onClick={() =>
                            onSimpan({
                                nama: nama.trim(),
                                nik: nik.trim(),
                                namaOrtu: namaOrtu.trim(),
                                rt,
                                bbKg: bbAngka,
                                tinggiCm: tinggiAngka,
                            })
                        }
                        className="tombol-utama"
                    >
                        Simpan perubahan
                    </button>
                    <button
                        type="button"
                        onClick={onTutup}
                        className="tombol-kedua"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Form balita baru. Hanya kolom yang wajib; sisanya diisi lewat penimbangan. */
function FormTambah({
    wilayahRt,
    rtAwal,
    onBatal,
    onSimpan,
}: {
    wilayahRt: string[];
    rtAwal: string;
    onBatal: () => void;
    onSimpan: (baru: AnakBaru) => void;
}) {
    const [nama, setNama] = useState('');
    const [tglLahir, setTglLahir] = useState('');
    const [jk, setJk] = useState<JenisKelamin>('P');
    const [namaOrtu, setNamaOrtu] = useState('');
    const [rt, setRt] = useState(rtAwal === '' ? (wilayahRt[0] ?? '') : rtAwal);

    // Nama dan tanggal lahir menentukan umur, dan umur menentukan seluruh
    // penilaian gizi. Tanpa keduanya baris barunya tidak bisa dibaca siapa pun.
    const lengkap = nama.trim() !== '' && tglLahir !== '';

    return (
        <section className="-mx-4 mb-6 bg-accent px-4 py-6 sm:-mx-7 sm:px-7">
            <div className="kartu p-5 sm:p-6">
                <h2 className="text-xl font-extrabold">Tambah balita baru</h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Isian
                        label="Nama balita"
                        nilai={nama}
                        onGanti={setNama}
                        petunjuk="Nama lengkap"
                    />
                    {/* Kotak tanggal bawaan peramban: kalendernya, papan tombolnya,
                    dan pembacaan pembaca layarnya sudah benar tanpa satu baris
                    pun kode kita. */}
                    <Isian
                        label="Tanggal lahir"
                        nilai={tglLahir}
                        onGanti={setTglLahir}
                        tipe="date"
                    />
                    <label
                        htmlFor="tambah-jk"
                        className="flex flex-col gap-1.5"
                    >
                        <span className="text-sm font-semibold text-muted-foreground">
                            Jenis kelamin
                        </span>
                        {/* v2 meminta mengetik "P atau L". Daftar pilihan menutup
                        satu sumber salah ketik yang membelokkan seluruh kurva
                        pertumbuhan anak: tabel WHO berbeda per jenis kelamin. */}
                        <select
                            id="tambah-jk"
                            value={jk}
                            onChange={(e) =>
                                setJk(e.target.value as JenisKelamin)
                            }
                            className="isian w-full"
                        >
                            <option value="P">Perempuan</option>
                            <option value="L">Laki-laki</option>
                        </select>
                    </label>
                    <Isian
                        label="Nama ibu"
                        nilai={namaOrtu}
                        onGanti={setNamaOrtu}
                        petunjuk="Nama lengkap ibu"
                    />
                    <label
                        htmlFor="tambah-rt"
                        className="flex flex-col gap-1.5"
                    >
                        <span className="text-sm font-semibold text-muted-foreground">
                            RT
                        </span>
                        <select
                            id="tambah-rt"
                            value={rt}
                            onChange={(e) => setRt(e.target.value)}
                            className="isian w-full"
                        >
                            {wilayahRt.map((w) => (
                                <option key={w} value={w}>
                                    {labelRt(w)}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <p className="mt-4 max-w-[75ch] text-sm text-pretty text-muted-foreground">
                    Anak baru belum punya pengukuran, jadi statusnya Belum
                    dinilai sampai ditimbang. Sasaran S ikut bertambah.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                    <button
                        type="button"
                        disabled={!lengkap}
                        onClick={() =>
                            onSimpan({
                                nama: nama.trim(),
                                tglLahir,
                                jk,
                                namaOrtu: namaOrtu.trim(),
                                rt,
                            })
                        }
                        className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                        Simpan balita baru
                    </button>
                    <button
                        type="button"
                        onClick={onBatal}
                        className="tombol-kedua"
                    >
                        Batal
                    </button>
                    {!lengkap && (
                        <p className="text-sm text-muted-foreground">
                            Nama balita dan tanggal lahir harus diisi — umurnya
                            dihitung dari tanggal itu.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
