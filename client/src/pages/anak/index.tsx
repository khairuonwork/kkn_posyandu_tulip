/**
 * Data Balita — docs/riwayat/layar-demo.md bagian 6.4, tampilan Prototipe v2.
 *
 * Membuktikan bahwa mencari seorang anak butuh beberapa detik, bukan membuka
 * dua belas berkas Excel — dan sejak v2, bahwa memperbaiki satu angka salah
 * tidak perlu meninggalkan daftarnya.
 */

import {
    Baby,
    Loader2,
    BookOpen,
    ChevronDown,
    ChevronRight,
    CreditCard,
    Pencil,
    Search,
    TriangleAlert,
    UserPlus,
    RefreshCw,
    Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import Halaman from '@/components/halaman';
import Pilih from '@/components/pilih';
import StatusGiziBadge, { nadaKategori } from '@/components/status-gizi-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeadUrut,
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

/**
 * Perubahan data satu balita. Editor baris di Data Balita mengisi identitas
 * dasar dan angka ukurnya; dialog Ubah data di Detail Balita mengisi identitas
 * lengkap tanpa angka ukur. Kolom yang tidak diisi tidak diubah.
 */
export type PatchAnak = {
    nama: string;
    nik: string;
    namaOrtu: string;
    rt: string;
    bbKg?: number | null;
    tinggiCm?: number | null;
    jk?: JenisKelamin;
    tglLahir?: string;
    anakKe?: number | null;
    bbLahirKg?: number | null;
    bukuKia?: boolean;
    /** Nomor WhatsApp orang tua; belum ada kolomnya di arsip. */
    noWa?: string;
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
    sumberData?: 'live' | 'contoh';
    statusMuat?: 'memuat' | 'siap' | 'galat';
    pesanGalat?: string | null;
    onMuatUlang?: () => void;
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
 * Kolom `Status terakhir` hanya membaca BB/TB; penanda perhatian membaca ketiga
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

type Catatan = {
    nada: 'oranye' | 'biru';
    Ikon: ComponentType<{ className?: string; strokeWidth?: number }>;
    label: string;
    judul: string;
    isi: string;
};

/**
 * Catatan satu baris tabel, urut dari yang paling penting: alasan perhatian,
 * NIK, lalu riwayat lahir. Teks `risikoLahir` berbeda antara server dan data
 * contoh, jadi jenisnya dibaca dari kata kuncinya.
 */
function catatanBaris(baris: BarisAnak, bolehUbah: boolean): Catatan[] {
    const hasil: Catatan[] = [];

    if (
        baris.perluPerhatian &&
        baris.indeksPemicu !== null &&
        baris.indeksPemicu !== 'BB_TB' &&
        baris.kategoriPemicu !== null
    ) {
        const indeks = labelIndeks(baris.indeksPemicu, baris.umurBulan);

        hasil.push({
            nada: 'oranye',
            Ikon: TriangleAlert,
            label: indeks,
            judul: `Ditandai: ${baris.kategoriPemicu} (${indeks})`,
            isi:
                baris.kategoriGizi === null
                    ? 'BB/TB belum dapat dihitung, jadi status tertulis Belum dinilai.'
                    : 'Status terakhir hanya dinilai dari BB/TB.',
        });
    }

    if (!baris.nikLengkap) {
        hasil.push({
            nada: 'oranye',
            Ikon: CreditCard,
            label: 'NIK',
            judul: 'NIK belum lengkap',
            isi: bolehUbah
                ? 'NIK balita belum 16 angka. Lengkapi lewat Ubah data.'
                : 'NIK balita belum 16 angka.',
        });
    }

    const risiko = baris.risikoLahir ?? '';
    const bblr = risiko.includes('BBLR');
    const kia = risiko.includes('KIA');

    if (bblr && kia) {
        hasil.push({
            nada: 'biru',
            Ikon: Baby,
            label: 'BBLR · KIA',
            judul: 'Riwayat BBLR, belum punya Buku KIA',
            isi: 'Berat lahir di bawah 2,5 kg dan Buku KIA belum ada. Pantau lebih lama dan konfirmasi saat pendaftaran.',
        });
    } else if (bblr) {
        hasil.push({
            nada: 'biru',
            Ikon: Baby,
            label: 'BBLR',
            judul: 'Riwayat BBLR',
            isi: 'Berat lahir di bawah 2,5 kg. Tetap pantau lebih lama meski status gizinya baik.',
        });
    } else if (kia) {
        hasil.push({
            nada: 'biru',
            Ikon: BookOpen,
            label: 'Tanpa KIA',
            judul: 'Belum punya Buku KIA',
            isi: 'Konfirmasi saat pendaftaran.',
        });
    }

    return hasil;
}

const NADA_CATATAN = {
    oranye: 'bg-tone-amber-bg text-tone-amber ring-tone-amber/35',
    biru: 'bg-tone-blue-bg text-tone-blue ring-tone-blue/30',
};

/**
 * Satu lencana per baris: catatan terpenting ditambah hitungan sisanya. Isi
 * lengkapnya di popup bawaan peramban (`popover`): disorot tetikus di laptop,
 * diketuk di tablet, tertutup oleh Esc atau ketukan di luar. Popup duduk di
 * lapisan teratas, jadi tidak terpotong wadah tabel yang menggulir.
 */
function LencanaCatatan({ id, catatan }: { id: string; catatan: Catatan[] }) {
    const tombol = useRef<HTMLButtonElement>(null);
    const popup = useRef<HTMLDivElement>(null);

    if (catatan.length === 0) {
        return null;
    }

    const [utama] = catatan;
    const tetikus = () => matchMedia('(pointer: fine)').matches;
    const terbuka = () => popup.current?.matches(':popover-open') ?? false;

    // Di bawah lencana, atau di atasnya bila ruang di bawah tidak cukup.
    const letakkan = () => {
        const t = tombol.current?.getBoundingClientRect();
        const p = popup.current;

        if (t === undefined || p === null) {
            return;
        }

        const bawah = t.bottom + 8 + p.offsetHeight <= innerHeight;
        p.style.left = `${Math.max(8, Math.min(t.left, innerWidth - p.offsetWidth - 8))}px`;
        p.style.top = `${bawah ? t.bottom + 8 : t.top - 8 - p.offsetHeight}px`;
    };

    return (
        <>
            <button
                ref={tombol}
                type="button"
                popoverTarget={id}
                aria-label={catatan.map((c) => c.judul).join('; ')}
                onMouseEnter={() => {
                    if (tetikus() && !terbuka()) {
                        popup.current?.showPopover();
                    }
                }}
                onMouseLeave={() => {
                    if (tetikus() && terbuka()) {
                        popup.current?.hidePopover();
                    }
                }}
                // Dengan tetikus, popup sudah terbuka karena disorot; klik
                // (atau Enter) hanya memastikan ia terbuka, tidak menutupnya.
                onClick={(e) => {
                    if (tetikus()) {
                        e.preventDefault();

                        if (!terbuka()) {
                            popup.current?.showPopover();
                        }
                    }
                }}
                className="group -my-2 inline-flex min-h-11 items-center rounded-md focus-visible:outline-none"
            >
                <span
                    className={`inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-sm font-bold whitespace-nowrap ring-1 ring-inset group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring ${NADA_CATATAN[utama.nada]}`}
                >
                    <utama.Ikon
                        className="size-3.5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    {utama.label}
                    {catatan.length > 1 && (
                        <span className="ml-0.5 border-l border-current pl-1.5">
                            +{catatan.length - 1}
                        </span>
                    )}
                </span>
            </button>
            <div
                ref={popup}
                id={id}
                popover="auto"
                role="tooltip"
                onToggle={(e) => {
                    if (e.newState === 'open') {
                        letakkan();
                    }
                }}
                className="[inset:auto] m-0 w-70 rounded-xl bg-foreground px-3.5 py-3 text-sm leading-snug text-white shadow-[0_10px_24px_rgba(22,33,28,0.28)]"
            >
                {catatan.map((c) => (
                    <p
                        key={c.judul}
                        className="border-white/20 not-first:mt-2 not-first:border-t not-first:pt-2"
                    >
                        <span className="block text-base font-bold">
                            {c.judul}
                        </span>
                        <span className="text-white/80">{c.isi}</span>
                    </p>
                ))}
            </div>
        </>
    );
}

type KolomUrut = 'nama' | 'umur' | 'rt' | 'tanggal' | 'status';

/** Status riwayat paling mendesak di atas saat kolom diurutkan naik. */
const PERINGKAT_NADA = { merah: 0, oranye: 1, biru: 2, hijau: 3, netral: 4 };

const LABEL_URUT: Record<KolomUrut, string> = {
    nama: 'Nama balita',
    umur: 'Umur',
    rt: 'RT',
    tanggal: 'Ditimbang terakhir',
    status: 'Status terakhir',
};

function bandingkan(a: BarisAnak, b: BarisAnak, kolom: KolomUrut): number {
    switch (kolom) {
        case 'umur':
            return (a.umurBulan ?? -1) - (b.umurBulan ?? -1);

        case 'rt':
            return Number(a.rt ?? 99) - Number(b.rt ?? 99);

        case 'tanggal':
            return (a.tanggalUkurTerakhir ?? '').localeCompare(
                b.tanggalUkurTerakhir ?? '',
            );

        case 'status':
            return (
                PERINGKAT_NADA[nadaKategori(a.kategoriGizi)] -
                PERINGKAT_NADA[nadaKategori(b.kategoriGizi)]
            );

        default:
            return (a.nama ?? '').localeCompare(b.nama ?? '');
    }
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
    sumberData = 'contoh',
    statusMuat = 'siap',
    pesanGalat,
    onMuatUlang,
}: Props) {
    const [cari, setCari] = useState('');
    const [rt, setRt] = useState(rtTerkunci ?? '');
    const [hanyaPerhatian, setHanyaPerhatian] = useState(false);
    const [hanyaRisiko, setHanyaRisiko] = useState(false);
    const [dibuka, setDibuka] = useState<number | null>(null);
    const [menambah, setMenambah] = useState(false);
    const [urut, setUrut] = useState<{ kolom: KolomUrut; naik: boolean }>({
        kolom: 'nama',
        naik: true,
    });

    // Portal live hanya membaca data induk. Penambahan massal dilakukan lewat
    // Sasaran & Impor, sedangkan pencatatan lapangan dilakukan di Android.
    // Jangan tampilkan editor memori milik demo sebagai tindakan sungguhan.
    const bolehUbah = peran !== 'kader' && sumberData === 'contoh';
    const rtAktif = rtTerkunci ?? rt;
    // Kader hanya pernah melihat RT binaannya. Menyebut jumlah se-RW di
    // subjudulnya membuat dua angka berbeda berdiri 40 px bersebelahan.
    const terlihat =
        rtTerkunci === null ? anak : anak.filter((b) => b.rt === rtTerkunci);
    const lingkupRt = rtAktif === '' ? 'seluruh RT' : labelRt(rtAktif);
    const adaSaringan =
        cari.trim() !== '' || rtAktif !== '' || hanyaPerhatian || hanyaRisiko;

    // 906 baris standar hanya perlu disusun sekali, bukan tiap ketukan papan
    // tombol di dalam editor.
    const tabelLms = useMemo(
        () => (standarLms === undefined ? null : susunTabel(standarLms)),
        [standarLms],
    );

    const hasil = useMemo(() => {
        const kunci = cari.trim().toLowerCase();

        return anak
            .filter((baris) => {
                if (rtAktif !== '' && baris.rt !== rtAktif) {
                    return false;
                }

                if (hanyaPerhatian && !baris.perluPerhatian) {
                    return false;
                }

                if (hanyaRisiko && baris.risikoLahir === null) {
                    return false;
                }

                // Pencarian mencocokkan nama balita maupun nama ibu — itu
                // cara kader mengingat.
                const sasaran =
                    `${baris.nama ?? ''} ${baris.namaOrtu ?? ''}`.toLowerCase();

                return kunci === '' || sasaran.includes(kunci);
            })
            .sort(
                (a, b) =>
                    (urut.naik ? 1 : -1) * bandingkan(a, b, urut.kolom) ||
                    (a.nama ?? '').localeCompare(b.nama ?? ''),
            );
    }, [anak, cari, rtAktif, hanyaPerhatian, hanyaRisiko, urut]);

    const keteranganUrut =
        urut.kolom === 'nama'
            ? `urut nama ${urut.naik ? 'A–Z' : 'Z–A'}`
            : `urut ${LABEL_URUT[urut.kolom].toLowerCase()} ${urut.naik ? 'naik' : 'turun'}`;

    const kepalaUrut = (kolom: KolomUrut) => (
        <TableHeadUrut
            label={LABEL_URUT[kolom]}
            aktif={urut.kolom === kolom}
            naik={urut.naik}
            pertama={kolom === 'nama'}
            onUrut={() =>
                setUrut({
                    kolom,
                    naik: urut.kolom === kolom ? !urut.naik : true,
                })
            }
            className={kolom === 'tanggal' ? 'hidden lg:table-cell' : ''}
        />
    );

    return (
        <Halaman
            ikon={Baby}
            penuh="lg"
            judul="Data Balita"
            subjudul={
                sumberData === 'live'
                    ? statusMuat === 'memuat'
                        ? 'Memuat data balita…'
                        : statusMuat === 'galat'
                          ? 'Data belum dapat dimuat.'
                          : rtTerkunci === null
                            ? `${anak.length} balita terdaftar di RW ${rw}`
                            : `${terlihat.length} balita di ${labelRt(rtTerkunci)}`
                    : `${
                          rtTerkunci === null
                              ? `${anak.length} balita terdaftar di RW ${rw}`
                              : `${terlihat.length} balita di ${labelRt(rtTerkunci)}, wilayah binaan Anda`
                      }. Data contoh.`
            }
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
                        <UserPlus
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Tambah balita
                    </button>
                )
            }
        >
            {/* Satu kartu data: saringan di bilah atas, tabel yang digulir di
                dalam kartu, dan jumlah baris di bilah bawah. Halamannya
                sendiri tidak digulir dari 1024 px. */}
            <section className="kartu flex flex-col overflow-hidden lg:min-h-0 lg:flex-1">
                <div className="flex shrink-0 flex-wrap items-end gap-x-4.5 gap-y-3.5 border-b border-border px-5.5 py-4">
                    <div className="min-w-52 flex-1">
                        <label
                            htmlFor="cari-anak"
                            className="block text-base font-semibold text-muted-foreground"
                        >
                            Cari nama balita atau nama ibu
                        </label>
                        {/* `items-stretch`: seluruh tinggi kotak meneruskan
                            sentuhan ke <input>. Ini kotak pertama yang disentuh
                            kader tiap sesi. */}
                        <div className="isian mt-1.5 flex w-full items-stretch gap-2.5 bg-card px-3.5">
                            <Search
                                className="size-5 shrink-0 self-center text-muted-foreground"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            <input
                                id="cari-anak"
                                type="search"
                                placeholder="Ketik nama balita atau nama ibu"
                                value={cari}
                                onChange={(e) => setCari(e.target.value)}
                                className="min-w-0 flex-1 self-stretch bg-transparent text-base outline-none"
                            />
                        </div>
                    </div>

                    {/* Kader terkunci ke satu RT: keterangan biasa, bukan
                        kontrol mati yang masih berbentuk kontrol. */}
                    {rtTerkunci !== null ? (
                        <p className="flex min-h-14 items-center rounded-lg bg-surface-alt px-3.5 text-base">
                            {labelRt(rtTerkunci)}, wilayah binaan Anda
                        </p>
                    ) : (
                        <div className="w-44">
                            <label
                                htmlFor="filter-rt"
                                className="block text-base font-semibold text-muted-foreground"
                            >
                                RT
                            </label>
                            <div className="relative mt-1.5">
                                <select
                                    id="filter-rt"
                                    value={rtAktif}
                                    onChange={(e) => setRt(e.target.value)}
                                    className="isian w-full cursor-pointer appearance-none bg-card pr-11"
                                >
                                    <option value="">Semua RT</option>
                                    {wilayahRt.map((w) => (
                                        <option key={w} value={w}>
                                            {labelRt(w)}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                            </div>
                        </div>
                    )}

                    {/* <button aria-pressed>: keadaan tertekannya sampai ke
                        pembaca layar, bukan hanya ke mata. Dua saringan
                        terpisah: "perlu perhatian" membaca hasil ukur terakhir,
                        bukan status periode aktif; yang kedua riwayat lahir. */}
                    <div
                        role="group"
                        aria-label="Tampilkan hanya"
                        className="flex flex-wrap gap-3.5"
                    >
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
                            <TriangleAlert
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Perhatian pada hasil terakhir
                        </button>
                        <button
                            type="button"
                            aria-pressed={hanyaRisiko}
                            onClick={() => setHanyaRisiko((b) => !b)}
                            className={
                                hanyaRisiko
                                    ? 'tombol-utama'
                                    : 'tombol-kedua bg-surface'
                            }
                        >
                            <Baby
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            BBLR atau tanpa Buku KIA
                        </button>
                    </div>
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

                {statusMuat === 'memuat' && sumberData === 'live' ? (
                    <div className="flex flex-1 items-center justify-center px-6 py-14 text-center">
                        <div>
                            <Loader2
                                className="mx-auto size-7 animate-spin text-primary motion-reduce:[animation-duration:3s]"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            <p className="mt-3 text-base font-bold">
                                Memuat data…
                            </p>
                            <p className="mt-1 text-base text-muted-foreground">
                                Mohon tunggu sebentar.
                            </p>
                        </div>
                    </div>
                ) : statusMuat === 'galat' && sumberData === 'live' ? (
                    <div className="flex flex-1 items-center justify-center px-6 py-14 text-center">
                        <div className="max-w-lg">
                            <TriangleAlert
                                className="mx-auto mb-3 size-7 text-tone-red"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            <p className="text-base font-bold text-tone-red">
                                Data balita belum dapat dimuat
                            </p>
                            <p className="mt-1 text-base text-muted-foreground">
                                {pesanGalat ??
                                    'Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.'}
                            </p>
                            <button
                                type="button"
                                onClick={onMuatUlang}
                                className="tombol-utama mt-4"
                            >
                                <RefreshCw
                                    className="size-5"
                                    aria-hidden="true"
                                />
                                Coba lagi
                            </button>
                        </div>
                    </div>
                ) : hasil.length === 0 ? (
                    <div className="px-6 py-10 text-center lg:flex lg:flex-1 lg:flex-col lg:items-center lg:justify-center">
                        {sumberData === 'live' &&
                        anak.length === 0 &&
                        !adaSaringan ? (
                            <>
                                <p className="text-base font-bold">
                                    Belum ada data balita
                                </p>
                                <p className="mx-auto mt-1 max-w-xl text-base text-muted-foreground">
                                    Impor data sasaran untuk mengisi daftar
                                    balita dan membuat kartu QR.
                                </p>
                                <Link
                                    href="/sasaran"
                                    className="tombol-utama mt-4 inline-flex"
                                >
                                    <Upload
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                    Buka Sasaran &amp; Impor
                                </Link>
                            </>
                        ) : cari.trim() !== '' ? (
                            <>
                                <p className="text-base">
                                    Tidak ada balita bernama “{cari.trim()}” di{' '}
                                    {lingkupRt}.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setCari('')}
                                    className="tombol-kedua mt-4"
                                >
                                    Hapus pencarian
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="text-base">
                                    Tidak ada balita yang cocok dengan saringan
                                    di {lingkupRt}.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRt(rtTerkunci ?? '');
                                        setHanyaPerhatian(false);
                                        setHanyaRisiko(false);
                                    }}
                                    className="tombol-kedua mt-4"
                                >
                                    Hapus saringan
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Di bawah 768 px tabel tujuh kolom butuh geser
                            samping dan kolom Aksi berada di luar layar. Daftar
                            ini menaruh tiap balita dalam satu baris yang bisa
                            disentuh seluruhnya. */}
                        <ul className="md:hidden">
                            {hasil.map((baris) => (
                                <li
                                    key={baris.anakId}
                                    className="border-b border-rule last:border-b-0"
                                >
                                    <Link
                                        href={`/balita/${baris.anakId}`}
                                        className="flex min-h-16 items-center gap-3 px-4.5 py-3 hover:bg-surface-subtle"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-base font-bold text-primary">
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
                                                    kategori={
                                                        baris.kategoriGizi
                                                    }
                                                />
                                                {baris.tanggalUkurTerakhir !==
                                                    null && (
                                                    <span className="text-sm text-muted-foreground">
                                                        Hasil terakhir{' '}
                                                        {tanggalRingkas(
                                                            baris.tanggalUkurTerakhir,
                                                        )}
                                                    </span>
                                                )}
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

                        {/* Kepala kolom `sticky` berlabuh ke wadah gulir ini,
                            jadi ia tetap terbaca sampai baris ke-101. */}
                        <Table
                            aria-label="Daftar balita"
                            containerClassName="hidden md:block lg:min-h-0 lg:flex-1"
                        >
                            <TableHeader className="sticky top-0 z-10">
                                <TableRow>
                                    {kepalaUrut('nama')}
                                    {kepalaUrut('umur')}
                                    {kepalaUrut('rt')}
                                    {/* Nama ibu tetap dapat dicari, tapi ia
                                        bantuan ingatan, bukan kolom yang
                                        dipindai. Di tablet tegak ia mengalah
                                        supaya tabelnya tidak perlu digeser. */}
                                    <TableHead
                                        scope="col"
                                        className="hidden lg:table-cell"
                                    >
                                        Nama ibu
                                    </TableHead>
                                    {kepalaUrut('tanggal')}
                                    {kepalaUrut('status')}
                                    {bolehUbah && (
                                        <TableHead
                                            scope="col"
                                            className="text-right"
                                        >
                                            Aksi
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            {/* Di-key menurut saringan supaya barisnya dipasang
                                ulang, dan jeda bertahapnya terlihat setiap kali
                                hasil berganti (bagian 8.4). */}
                            <TableBody
                                key={`${cari}|${rtAktif}|${hanyaPerhatian}|${hanyaRisiko}`}
                            >
                                {hasil.map((baris, urutan) => {
                                    const terbuka = dibuka === baris.anakId;

                                    return [
                                        <TableRow
                                            key={baris.anakId}
                                            className={`baris-masuk ${terbuka ? 'bg-accent' : ''}`}
                                            style={{
                                                // Dibatasi delapan baris pertama:
                                                // lebih dari itu jedanya terasa
                                                // lambat.
                                                animationDelay: `${Math.min(urutan, 8) * 20}ms`,
                                            }}
                                        >
                                            {/* Nama adalah jalan ke Detail. Nama
                                                panjang membungkus, tidak dipotong. */}
                                            <TableCell className="py-1">
                                                <Link
                                                    href={`/balita/${baris.anakId}`}
                                                    className="inline-flex min-h-13 items-center gap-1 font-bold text-primary"
                                                >
                                                    {namaTampil(baris.nama)}
                                                    <ChevronRight
                                                        className="size-4.5 shrink-0"
                                                        strokeWidth={2.5}
                                                        aria-hidden="true"
                                                    />
                                                </Link>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {umurRingkas(baris.umurBulan)}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {baris.rt === null
                                                    ? KOSONG
                                                    : labelRt(baris.rt)}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell">
                                                {baris.namaOrtu ?? KOSONG}
                                            </TableCell>
                                            <TableCell className="hidden whitespace-nowrap lg:table-cell">
                                                {tanggalRingkas(
                                                    baris.tanggalUkurTerakhir,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <StatusGiziBadge
                                                        kategori={
                                                            baris.kategoriGizi
                                                        }
                                                    />
                                                    <LencanaCatatan
                                                        id={`catatan-${baris.anakId}`}
                                                        catatan={catatanBaris(
                                                            baris,
                                                            bolehUbah,
                                                        )}
                                                    />
                                                </span>
                                            </TableCell>
                                            {bolehUbah && (
                                                <TableCell className="py-1 text-right">
                                                    <button
                                                        type="button"
                                                        aria-expanded={terbuka}
                                                        aria-label={
                                                            terbuka
                                                                ? `Tutup ubah data ${namaTampil(baris.nama)}`
                                                                : `Ubah data ${namaTampil(baris.nama)}`
                                                        }
                                                        onClick={() => {
                                                            setDibuka(
                                                                terbuka
                                                                    ? null
                                                                    : baris.anakId,
                                                            );
                                                            setMenambah(false);
                                                        }}
                                                        className={`tombol-ubah ${
                                                            terbuka
                                                                ? 'bg-primary text-primary-foreground hover:bg-primary'
                                                                : ''
                                                        }`}
                                                    >
                                                        {!terbuka && (
                                                            <Pencil
                                                                className="size-4.5"
                                                                strokeWidth={
                                                                    2.5
                                                                }
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        {terbuka
                                                            ? 'Tutup'
                                                            : 'Ubah'}
                                                    </button>
                                                </TableCell>
                                            )}
                                        </TableRow>,

                                        terbuka && (
                                            <TableRow
                                                key={`${baris.anakId}-ubah`}
                                                className="bg-accent"
                                            >
                                                <TableCell
                                                    colSpan={7}
                                                    className="p-0 first:pl-0 last:pr-0"
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
                    </>
                )}

                <p
                    aria-live="polite"
                    className="shrink-0 border-t border-border px-5.5 py-3 text-sm text-muted-foreground"
                >
                    {statusMuat === 'memuat' && sumberData === 'live' ? (
                        'Memuat data…'
                    ) : statusMuat === 'galat' && sumberData === 'live' ? (
                        'Data belum dapat ditampilkan.'
                    ) : (
                        <>
                            Menampilkan{' '}
                            <span className="font-bold text-foreground">
                                {hasil.length}
                            </span>{' '}
                            dari {terlihat.length} balita · {keteranganUrut}
                        </>
                    )}
                </p>
            </section>
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
        <label htmlFor={id} className="flex flex-col gap-2">
            <span className="text-base font-semibold text-muted-foreground">
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
        <label htmlFor={id} className="flex flex-col gap-2">
            <span className="text-base font-semibold text-muted-foreground">
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
                <span className="flex items-center border-l-2 border-border-strong bg-surface-subtle px-3 text-base text-muted-foreground">
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
        <div className="border-t-2 border-border px-5.5 py-5">
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
                            className="flex flex-col gap-2"
                        >
                            <span className="text-base font-semibold text-muted-foreground">
                                RT
                            </span>
                            <Pilih id="ubah-rt" value={rt} onChange={setRt}>
                                {wilayahRt.map((w) => (
                                    <option key={w} value={w}>
                                        {labelRt(w)}
                                    </option>
                                ))}
                            </Pilih>
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
                                    menghitung ulang dan hasilnya yang tercatat.
                                    BB/PB dipakai untuk usia di bawah 24 bulan,
                                    BB/TB untuk 24 bulan ke atas.
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
        /* Di layar pendek (laptop 1230 × 572) form ini lebih tinggi dari
           ruang di kartu: ia merapat, lalu menggulir sendiri supaya tombol
           dan kaki kartu tidak terpotong. */
        <section className="gulir-dalam min-h-0 overflow-y-auto border-b border-border bg-accent px-5.5 py-5 lg:pendek:py-2">
            <div className="kartu p-5 sm:p-6 lg:pendek:p-4">
                <h2 className="text-xl font-extrabold">Tambah balita baru</h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:pendek:mt-3">
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
                    <label htmlFor="tambah-jk" className="flex flex-col gap-2">
                        <span className="text-base font-semibold text-muted-foreground">
                            Jenis kelamin
                        </span>
                        {/* v2 meminta mengetik "P atau L". Daftar pilihan menutup
                        satu sumber salah ketik yang membelokkan seluruh kurva
                        pertumbuhan anak: tabel WHO berbeda per jenis kelamin. */}
                        <Pilih
                            id="tambah-jk"
                            value={jk}
                            onChange={(v) => setJk(v as JenisKelamin)}
                        >
                            <option value="P">Perempuan</option>
                            <option value="L">Laki-laki</option>
                        </Pilih>
                    </label>
                    <Isian
                        label="Nama ibu"
                        nilai={namaOrtu}
                        onGanti={setNamaOrtu}
                        petunjuk="Nama lengkap ibu"
                    />
                    <label htmlFor="tambah-rt" className="flex flex-col gap-2">
                        <span className="text-base font-semibold text-muted-foreground">
                            RT
                        </span>
                        <Pilih id="tambah-rt" value={rt} onChange={setRt}>
                            {wilayahRt.map((w) => (
                                <option key={w} value={w}>
                                    {labelRt(w)}
                                </option>
                            ))}
                        </Pilih>
                    </label>
                </div>

                <p className="mt-4 max-w-[75ch] text-sm text-pretty text-muted-foreground lg:pendek:mt-3">
                    Balita baru berstatus Belum dinilai sampai ditimbang, dan
                    langsung dihitung sebagai sasaran (S).
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5 lg:pendek:mt-3 lg:pendek:pt-3">
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
                        <p className="text-base text-muted-foreground">
                            Nama balita dan tanggal lahir wajib diisi.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
