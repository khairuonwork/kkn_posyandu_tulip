/**
 * Penimbangan — alur kerja kader pada hari Posyandu, mengikuti mockup yang
 * disetujui 26 September 2026: cari balita, periksa kelengkapan dan catat
 * hasil ukur, lalu ringkasan yang tersimpan.
 *
 * Kamera pemindai ada di Aplikasi Tablet. Di Portal, "Pindai kartu" hanya
 * menunjukkan jalan lain, dan alurnya tetap utuh dengan mengetik kode kartu,
 * NIK, atau nama.
 *
 * ponytail: hasil ukur belum dikirim ke mana pun — endpoint pencatatan belum
 * ada. Ringkasan dihitung di peramban dengan tabel LMS yang sama dengan server.
 */

import {
    ArrowRight,
    CircleCheck,
    ClipboardList,
    Plus,
    RotateCw,
    ScanLine,
    Search,
    TriangleAlert,
    UserPlus,
} from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Halaman from '@/components/halaman';
import StatusGiziBadge from '@/components/status-gizi-badge';
import {
    angka,
    inisial,
    labelIndeks,
    namaTampil,
    tanggalPanjang,
    tanggalTanpaTahun,
    umurRingkas,
} from '@/lib/format';
import { kategoriDariZ } from '@/lib/kategori';
import { Link, navigate } from '@/lib/nav';
import { hitungZ, susunTabel } from '@/lib/z-score';
import type { BarisLms } from '@/lib/z-score';
import type { Ambang } from '@/pages/pengaturan/index';
import type { JenisKelamin } from '@/types/posyandu';

export type BalitaTimbang = {
    anakId: number;
    nama: string | null;
    jk: JenisKelamin | null;
    umurBulan: number | null;
    rt: string | null;
    namaIbu: string | null;
    /** `SPT-` dan delapan digit, sama dengan yang tercetak di kartu. */
    kodeKartu: string;
    nik: string | null;
    bukuKia: boolean;
    /** Penimbangan terakhir yang dihadiri, atau null bila belum pernah. */
    terakhir: {
        tanggal: string | null;
        bbKg: number | null;
        tinggiCm: number | null;
        kategori: string | null;
    } | null;
};

type Props = {
    balita: BalitaTimbang[];
    /** Rentang wajar dan batas selisih, dari Pengaturan. */
    ambang: Ambang;
    standarLms?: BarisLms[];
};

type HasilCari =
    | { jenis: 'daftar'; kueri: string; balita: BalitaTimbang[] }
    | { jenis: 'kode-kosong'; kueri: string }
    | { jenis: 'nama-kosong'; kueri: string }
    | { jenis: 'kamera' };

type Kolom = 'bb' | 'tinggi' | 'lila' | 'lika';

type Tersimpan = {
    bb: number;
    tinggi: number;
    kategori: string | null;
    daring: boolean;
};

/** "8,4" atau "8.4" menjadi 8,4; teks kosong atau rusak menjadi null. */
function keAngka(teks: string): number | null {
    const nilai = Number(teks.trim().replace(',', '.'));

    return teks.trim() === '' || !Number.isFinite(nilai) ? null : nilai;
}

/**
 * Kode kartu atau NIK memilih satu balita langsung; teks lain dicari pada
 * nama balita dan nama ibu.
 */
function cariBalita(
    daftar: BalitaTimbang[],
    kueri: string,
): BalitaTimbang | HasilCari {
    const kode = kueri.replace(/\s/g, '').toUpperCase();

    if (/^(SPT-?)?\d+$/.test(kode)) {
        const nomor = kode.replace(/^SPT-?/, '');
        const cocok = daftar.find(
            (b) => b.kodeKartu === `SPT-${nomor}` || b.nik === nomor,
        );

        return cocok ?? { jenis: 'kode-kosong', kueri: kueri.trim() };
    }

    const kata = kueri.trim().toLowerCase();
    const cocok = daftar
        .filter(
            (b) =>
                (b.nama ?? '').toLowerCase().includes(kata) ||
                (b.namaIbu ?? '').toLowerCase().includes(kata),
        )
        .sort((a, b) => (a.nama ?? '').localeCompare(b.nama ?? ''));

    return cocok.length === 0
        ? { jenis: 'nama-kosong', kueri: kueri.trim() }
        : { jenis: 'daftar', kueri: kueri.trim(), balita: cocok };
}

/** Id kotak isian yang bisa menerima fokus. */
const ID_FOKUS = {
    cari: 'cari-balita',
    bb: 'berat',
    tinggi: 'tinggi',
    lila: 'lila',
    lika: 'lika',
};

/** Fokus dipindah sesudah render berikutnya, saat kotak tujuannya sudah ada. */
function fokuskan(sasaran: keyof typeof ID_FOKUS) {
    requestAnimationFrame(() =>
        document.getElementById(ID_FOKUS[sasaran])?.focus(),
    );
}

export default function LayananPosyandu({ balita, ambang, standarLms }: Props) {
    const [kueri, setKueri] = useState('');
    const [hasilCari, setHasilCari] = useState<HasilCari | null>(null);
    const [dipilih, setDipilih] = useState<BalitaTimbang | null>(null);
    const [isian, setIsian] = useState<Record<Kolom, string>>({
        bb: '',
        tinggi: '',
        lila: '',
        lika: '',
    });
    const [lengkap, setLengkap] = useState(false);
    const [galat, setGalat] = useState<Partial<Record<Kolom, string>>>({});
    const [konfirmasi, setKonfirmasi] = useState(false);
    const [tersimpan, setTersimpan] = useState<Tersimpan | null>(null);
    const tabelLms = useMemo(
        () => (standarLms === undefined ? null : susunTabel(standarLms)),
        [standarLms],
    );

    const tahap: 1 | 2 | 3 = dipilih === null ? 1 : tersimpan === null ? 2 : 3;
    const berdiri = dipilih?.umurBulan != null && dipilih.umurBulan >= 24;
    const namaTinggi = berdiri ? 'Tinggi badan' : 'Panjang badan';
    const terakhir = dipilih?.terakhir ?? null;
    const bb = keAngka(isian.bb);

    /* Lonjakan berat dibanding penimbangan terakhir, bila melewati batas
       selisih di Pengaturan. */
    const lonjakan = useMemo(() => {
        if (bb === null || terakhir === null || terakhir.bbKg === null) {
            return null;
        }

        const selisih = bb - terakhir.bbKg;
        const naik = selisih > 0;
        const batas = naik ? ambang.naikMax : ambang.turunMax;

        return Math.abs(selisih) > batas
            ? { naik, selisih: Math.abs(selisih), batas }
            : null;
    }, [bb, terakhir, ambang.naikMax, ambang.turunMax]);

    const kosongkanUkur = () => {
        setIsian({ bb: '', tinggi: '', lila: '', lika: '' });
        setLengkap(false);
        setGalat({});
        setKonfirmasi(false);
        setTersimpan(null);
    };

    const pilih = (b: BalitaTimbang) => {
        kosongkanUkur();
        setDipilih(b);
        fokuskan('bb');
    };

    const cari = (e: FormEvent) => {
        e.preventDefault();

        if (kueri.trim() === '') {
            fokuskan('cari');

            return;
        }

        const hasil = cariBalita(balita, kueri);

        if ('anakId' in hasil) {
            pilih(hasil);
        } else {
            setHasilCari(hasil);
        }
    };

    const gantiBalita = () => {
        kosongkanUkur();
        setDipilih(null);
        fokuskan('cari');
    };

    const berikutnya = () => {
        gantiBalita();
        setKueri('');
        setHasilCari(null);
    };

    /** Pesan untuk kolom kosong atau di luar rentang wajar Pengaturan. */
    const periksa = () => {
        const hasil: Partial<Record<Kolom, string>> = {};
        const aturan: [
            Kolom,
            string,
            string,
            string,
            number,
            number,
            boolean,
        ][] = [
            [
                'bb',
                'Berat badan',
                'Berat',
                'kg',
                ambang.beratMin,
                ambang.beratMax,
                true,
            ],
            [
                'tinggi',
                namaTinggi,
                namaTinggi.split(' ')[0],
                'cm',
                ambang.tinggiMin,
                ambang.tinggiMax,
                true,
            ],
            [
                'lila',
                'LILA',
                'LILA',
                'cm',
                ambang.lilaMin,
                ambang.lilaMax,
                false,
            ],
            [
                'lika',
                'LIKA',
                'LIKA',
                'cm',
                ambang.likaMin,
                ambang.likaMax,
                false,
            ],
        ];

        for (const [kolom, nama, pendek, unit, min, maks, wajib] of aturan) {
            const teks = isian[kolom].trim();
            const nilai = keAngka(teks);

            if (teks === '') {
                if (wajib) {
                    hasil[kolom] = `${nama} wajib diisi.`;
                }
            } else if (nilai === null || nilai < min || nilai > maks) {
                hasil[kolom] =
                    `${pendek} ${teks} ${unit} di luar batas wajar ` +
                    `(${angka(min, 1)}–${angka(maks, 1)} ${unit}). Periksa kembali angkanya.`;
            }
        }

        return hasil;
    };

    const simpan = (paksa: boolean) => {
        const salah = periksa();
        const pertama = (['bb', 'tinggi', 'lila', 'lika'] as const).find(
            (k) => salah[k] !== undefined,
        );

        setGalat(salah);

        if (pertama !== undefined) {
            fokuskan(pertama);

            return;
        }

        if (!paksa && lonjakan !== null) {
            setKonfirmasi(true);

            return;
        }

        const tinggi = keAngka(isian.tinggi) ?? 0;
        const z =
            tabelLms === null || dipilih?.jk == null || bb === null
                ? null
                : hitungZ(tabelLms, 'BB_TB', dipilih.jk, tinggi, bb);

        setKonfirmasi(false);
        setTersimpan({
            bb: bb ?? 0,
            tinggi,
            kategori: z === null ? null : kategoriDariZ('BB_TB', z),
            daring: navigator.onLine,
        });
    };

    const ubahKolom = (kolom: Kolom, nilai: string) => {
        // Hanya angka dan satu pemisah desimal yang bisa diketik.
        setIsian((lama) => ({
            ...lama,
            [kolom]: nilai.replace(/[^\d.,]/g, ''),
        }));
        setGalat((lama) => ({ ...lama, [kolom]: undefined }));

        if (kolom === 'bb') {
            setKonfirmasi(false);
        }
    };

    const tanggalLalu = tanggalTanpaTahun(terakhir?.tanggal ?? null);
    const keteranganLalu = (nilai: number | null | undefined, unit: string) =>
        terakhir === null
            ? 'Belum pernah ditimbang'
            : `Terakhir ${nilai == null ? '—' : `${angka(nilai, 1)} ${unit}`} · ${tanggalPanjang(terakhir.tanggal)}`;

    return (
        <Halaman
            ikon={ClipboardList}
            judul="Penimbangan"
            subjudul="Cari balita, periksa kelengkapan, lalu catat hasil ukur. Data contoh."
            aksi={<Langkah aktif={tahap} />}
        >
            <div className="flex max-w-[880px] flex-col gap-4.5">
                {dipilih === null && (
                    <section className="kartu px-7 pt-5 pb-5.5">
                        <h2 className="text-xl leading-tight font-extrabold">
                            Cari balita
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Pindai kartu, atau ketik kode kartu (SPT-…), NIK,
                            nama balita, atau nama ibu.
                        </p>

                        <form
                            role="search"
                            onSubmit={cari}
                            className="mt-4 flex flex-wrap items-end gap-3.5"
                        >
                            <div className="min-w-70 grow">
                                <label
                                    htmlFor="cari-balita"
                                    className="block text-sm font-semibold text-muted-foreground"
                                >
                                    Kode kartu, NIK, atau nama
                                </label>
                                <div
                                    className={`isian mt-1.5 flex items-center gap-3 ${
                                        hasilCari?.jenis === 'kode-kosong' ||
                                        hasilCari?.jenis === 'nama-kosong'
                                            ? 'border-tone-amber'
                                            : ''
                                    }`}
                                >
                                    <Search
                                        className="size-5 shrink-0 text-muted-foreground"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    <input
                                        id="cari-balita"
                                        value={kueri}
                                        autoComplete="off"
                                        onChange={(e) =>
                                            setKueri(e.target.value)
                                        }
                                        className="h-full min-w-0 grow bg-transparent outline-none"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="tombol-utama">
                                <Search
                                    className="size-5"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                Cari
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setHasilCari({ jenis: 'kamera' })
                                }
                                className="tombol-kedua"
                            >
                                <ScanLine
                                    className="size-5"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                Pindai kartu
                            </button>
                        </form>

                        {hasilCari?.jenis === 'kamera' && (
                            <Peringatan judul="Kamera tidak bisa dibuka. Ketik kode kartu atau cari dengan nama." />
                        )}

                        {hasilCari?.jenis === 'kode-kosong' && (
                            <Peringatan
                                judul={`Tidak ada balita dengan kode “${hasilCari.kueri}”.`}
                                isi="Periksa kembali kode pada kartu. Jika kartu tidak dibawa, cari dengan nama. Jika belum terdaftar, tambahkan sebagai balita baru."
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setKueri('');
                                        setHasilCari(null);
                                        fokuskan('cari');
                                    }}
                                    className="tombol-kedua"
                                >
                                    <Search
                                        className="size-5"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Cari dengan nama
                                </button>
                                <TombolTambah />
                            </Peringatan>
                        )}

                        {hasilCari?.jenis === 'nama-kosong' && (
                            <Peringatan
                                judul={`Tidak ada balita bernama “${hasilCari.kueri}”.`}
                                isi="Periksa ejaan, atau tambahkan sebagai balita baru."
                            >
                                <TombolTambah />
                            </Peringatan>
                        )}

                        {hasilCari?.jenis === 'daftar' && (
                            <>
                                <p className="mt-4 mb-2 text-sm text-muted-foreground">
                                    {hasilCari.balita.length} balita cocok
                                    dengan “{hasilCari.kueri}”. Pilih yang
                                    datang hari ini.
                                </p>
                                <ul className="gulir-dalam max-h-[340px] overflow-y-auto rounded-lg border border-border">
                                    {hasilCari.balita.map((b) => (
                                        <li
                                            key={b.anakId}
                                            className="flex items-center gap-3.5 border-b border-rule py-1 pr-2 pl-4.5 last:border-b-0"
                                        >
                                            <span className="flex min-w-0 grow flex-col">
                                                <span className="text-base font-bold">
                                                    {namaTampil(b.nama)}
                                                </span>
                                                <span className="text-sm text-muted-foreground">
                                                    {identitasSingkat(b)}
                                                </span>
                                            </span>
                                            <button
                                                type="button"
                                                aria-label={`Pilih ${namaTampil(b.nama)}`}
                                                onClick={() => pilih(b)}
                                                className="tombol-kedua shrink-0 px-5"
                                            >
                                                Pilih
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </section>
                )}

                {dipilih !== null && (
                    <section className="kartu flex flex-wrap items-center gap-4.5 px-5.5 py-4">
                        <span
                            aria-hidden="true"
                            className="flex size-13.5 shrink-0 items-center justify-center rounded-full bg-surface-alt text-base font-extrabold text-muted-foreground"
                        >
                            {inisial(dipilih.nama)}
                        </span>
                        <div className="flex min-w-60 grow flex-col">
                            <h2 className="text-xl leading-tight font-extrabold">
                                {namaTampil(dipilih.nama)}
                            </h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                {identitasSingkat(dipilih, true)}
                            </p>
                        </div>
                        <div className="flex flex-col items-start gap-1.5">
                            {dipilih.bukuKia ? (
                                <Lencana nada="hijau">Buku KIA ada</Lencana>
                            ) : (
                                <Lencana nada="amber">Tanpa Buku KIA</Lencana>
                            )}
                            <Lencana nada="amber">
                                Imunisasi: periksa Buku KIA
                            </Lencana>
                        </div>
                        <button
                            type="button"
                            onClick={gantiBalita}
                            className="tombol-kedua"
                        >
                            Ganti balita
                        </button>
                    </section>
                )}

                {dipilih !== null && tersimpan === null && (
                    <form
                        noValidate
                        onSubmit={(e) => {
                            e.preventDefault();
                            simpan(false);
                        }}
                        className="kartu px-7 pt-5 pb-5.5"
                    >
                        <div className="flex flex-wrap items-baseline justify-between gap-3.5">
                            <h2 className="text-xl leading-tight font-extrabold">
                                Catat hasil ukur
                            </h2>
                            <span className="text-sm text-muted-foreground">
                                Berat dan {berdiri ? 'tinggi' : 'panjang'} wajib
                                diisi
                            </span>
                        </div>

                        <div className="mt-4 grid gap-4.5 sm:grid-cols-2">
                            <IsianUkur
                                id="berat"
                                label="Berat badan"
                                satuan="kg"
                                nilai={isian.bb}
                                onGanti={(v) => ubahKolom('bb', v)}
                                galat={galat.bb}
                                waspada={konfirmasi && lonjakan !== null}
                                keterangan={keteranganLalu(
                                    terakhir?.bbKg,
                                    'kg',
                                )}
                            />
                            <IsianUkur
                                id="tinggi"
                                label={namaTinggi}
                                satuan="cm"
                                nilai={isian.tinggi}
                                onGanti={(v) => ubahKolom('tinggi', v)}
                                galat={galat.tinggi}
                                keterangan={keteranganLalu(
                                    terakhir?.tinggiCm,
                                    'cm',
                                )}
                            />
                            {lengkap && (
                                <>
                                    <IsianUkur
                                        id="lila"
                                        label="LILA (lingkar lengan atas)"
                                        satuan="cm"
                                        nilai={isian.lila}
                                        onGanti={(v) => ubahKolom('lila', v)}
                                        galat={galat.lila}
                                    />
                                    <IsianUkur
                                        id="lika"
                                        label="LIKA (lingkar kepala)"
                                        satuan="cm"
                                        nilai={isian.lika}
                                        onGanti={(v) => ubahKolom('lika', v)}
                                        galat={galat.lika}
                                    />
                                </>
                            )}
                        </div>

                        {!lengkap && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLengkap(true);
                                    fokuskan('lila');
                                }}
                                className="mt-2 inline-flex min-h-13 items-center gap-2 px-1 text-base font-bold text-primary"
                            >
                                <Plus
                                    className="size-5"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                                Tambah LILA dan LIKA, bila diukur
                            </button>
                        )}

                        {konfirmasi &&
                        lonjakan !== null &&
                        terakhir !== null ? (
                            <div
                                role="alert"
                                className="mt-2 rounded-lg border border-tone-amber bg-tone-amber-bg px-5 pt-4 pb-4.5"
                            >
                                <div className="flex gap-3.5">
                                    <TriangleAlert
                                        className="mt-0.5 size-5.5 shrink-0 text-tone-amber"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <p className="text-base font-bold text-tone-amber">
                                            Berat{' '}
                                            {lonjakan.naik ? 'naik' : 'turun'}{' '}
                                            {angka(lonjakan.selisih, 1)} kg
                                            sejak {tanggalLalu}
                                        </p>
                                        <p className="mt-0.5 text-sm">
                                            {tanggalLalu}{' '}
                                            {angka(terakhir.bbKg, 1)} kg, hari
                                            ini {angka(bb, 1)} kg. Batas wajar{' '}
                                            {lonjakan.naik ? 'naik' : 'turun'}{' '}
                                            sebulan {angka(lonjakan.batas, 1)}{' '}
                                            kg.
                                        </p>
                                        <p className="mt-2 text-base font-bold">
                                            Mohon timbang ulang untuk
                                            memastikan.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3.5 flex flex-wrap gap-3.5 pl-9">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            ubahKolom('bb', '');
                                            fokuskan('bb');
                                        }}
                                        className="tombol-kedua"
                                    >
                                        <RotateCw
                                            className="size-5"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                        Timbang ulang
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => simpan(true)}
                                        className="tombol-utama"
                                    >
                                        Simpan angka ini
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-3.5 flex flex-wrap items-center gap-4.5 border-t border-border pt-4.5">
                                <button type="submit" className="tombol-utama">
                                    Simpan hasil ukur
                                </button>
                                <span className="text-sm text-muted-foreground">
                                    Status gizi dihitung otomatis setelah
                                    disimpan.
                                </span>
                            </div>
                        )}
                    </form>
                )}

                {dipilih !== null && tersimpan !== null && (
                    <section role="status" className="kartu px-7 pt-5.5 pb-6">
                        <div className="flex items-center gap-4">
                            <span
                                aria-hidden="true"
                                className="flex size-15 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
                            >
                                <CircleCheck
                                    className="size-8"
                                    strokeWidth={2.5}
                                />
                            </span>
                            <div>
                                <h2 className="text-xl leading-tight font-extrabold text-primary">
                                    Tersimpan
                                </h2>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {tersimpan.daring
                                        ? `Hasil ukur ${namaTampil(dipilih.nama)} hari ini sudah tercatat.`
                                        : 'Tersimpan di perangkat ini dan akan dikirim otomatis saat ada sinyal.'}
                                </p>
                            </div>
                        </div>

                        <dl className="mt-5 grid gap-3.5 sm:grid-cols-3">
                            <Ringkasan
                                judul="Berat badan"
                                nilai={`${angka(tersimpan.bb, 1)} kg`}
                                banding={banding(
                                    tersimpan.bb,
                                    terakhir?.bbKg ?? null,
                                    'kg',
                                    'turun',
                                    tanggalLalu,
                                )}
                            />
                            <Ringkasan
                                judul={namaTinggi}
                                nilai={`${angka(tersimpan.tinggi, 1)} cm`}
                                banding={banding(
                                    tersimpan.tinggi,
                                    terakhir?.tinggiCm ?? null,
                                    'cm',
                                    'berkurang',
                                    tanggalLalu,
                                )}
                            />
                            <div className="rounded-lg bg-surface px-4 py-3.5">
                                <dt className="text-sm font-semibold text-muted-foreground">
                                    Status gizi (
                                    {labelIndeks('BB_TB', dipilih.umurBulan)})
                                </dt>
                                <dd className="mt-1.5">
                                    <StatusGiziBadge
                                        kategori={tersimpan.kategori}
                                    />
                                </dd>
                                <dd className="mt-1 text-sm">
                                    {terakhir?.kategori == null ||
                                    tersimpan.kategori === null
                                        ? 'pertama kali dinilai'
                                        : terakhir.kategori ===
                                            tersimpan.kategori
                                          ? 'sama seperti bulan lalu'
                                          : `bulan lalu ${terakhir.kategori}`}
                                </dd>
                            </div>
                        </dl>

                        <div className="mt-5 flex flex-wrap gap-3.5">
                            <button
                                type="button"
                                onClick={berikutnya}
                                className="tombol-utama"
                            >
                                Catat balita berikutnya
                                <ArrowRight
                                    className="size-5"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                            </button>
                            <Link
                                href={`/balita/${dipilih.anakId}`}
                                className="tombol-kedua"
                            >
                                Lihat grafik{' '}
                                {namaTampil(dipilih.nama).split(' ')[0]}
                            </Link>
                        </div>
                    </section>
                )}
            </div>
        </Halaman>
    );
}

/** "8 bulan · RT 02 · Ibu Euis Sopandi", dengan jenis kelamin bila diminta. */
function identitasSingkat(b: BalitaTimbang, denganJk = false): string {
    return [
        umurRingkas(b.umurBulan),
        denganJk && b.jk !== null
            ? b.jk === 'P'
                ? 'Perempuan'
                : 'Laki-laki'
            : null,
        b.rt === null ? null : `RT ${b.rt.padStart(2, '0')}`,
        b.namaIbu === null ? null : `Ibu ${b.namaIbu}`,
    ]
        .filter((bagian) => bagian !== null)
        .join(' · ');
}

/** "naik 0,3 kg sejak 13 Juni", atau "pertama kali ditimbang". */
function banding(
    kini: number,
    lalu: number | null,
    unit: string,
    kataTurun: string,
    tanggal: string,
): string {
    if (lalu === null) {
        return 'pertama kali ditimbang';
    }

    const selisih = Math.round((kini - lalu) * 10) / 10;

    if (selisih === 0) {
        return `sama seperti ${tanggal}`;
    }

    return `${selisih > 0 ? 'naik' : kataTurun} ${angka(Math.abs(selisih), 1)} ${unit} sejak ${tanggal}`;
}

/** Tiga langkah alur di bilah kepala; yang sedang dikerjakan hijau solid. */
function Langkah({ aktif }: { aktif: 1 | 2 | 3 }) {
    const butir = ['Cari balita', 'Periksa dan ukur', 'Tersimpan'];

    return (
        <ol
            aria-label="Langkah"
            className="flex flex-wrap items-center gap-2.5"
        >
            {butir.map((label, i) => {
                const n = i + 1;
                const [teks, lingkar] =
                    n === aktif
                        ? ['font-bold', 'bg-primary text-primary-foreground']
                        : n < aktif
                          ? [
                                'font-semibold text-muted-foreground',
                                'bg-accent text-primary',
                            ]
                          : [
                                'font-medium text-muted-foreground',
                                'bg-surface-alt text-muted-foreground',
                            ];

                return (
                    <Fragment key={label}>
                        {i > 0 && (
                            <li
                                aria-hidden="true"
                                className="h-0.5 w-6 bg-border"
                            />
                        )}
                        <li
                            aria-current={n === aktif ? 'step' : undefined}
                            className={`flex items-center gap-2 text-sm ${teks}`}
                        >
                            <span
                                className={`flex size-8 shrink-0 items-center justify-center rounded-full font-extrabold ${lingkar}`}
                            >
                                {n}
                            </span>
                            {label}
                        </li>
                    </Fragment>
                );
            })}
        </ol>
    );
}

/** Kotak peringatan amber di kartu Cari balita. */
function Peringatan({
    judul,
    isi,
    children,
}: {
    judul: string;
    isi?: string;
    children?: ReactNode;
}) {
    return (
        <div
            role="alert"
            className="mt-4 flex gap-3.5 rounded-lg border border-tone-amber bg-tone-amber-bg px-5 pt-4 pb-4.5"
        >
            <TriangleAlert
                className="mt-0.5 size-5.5 shrink-0 text-tone-amber"
                strokeWidth={2.5}
                aria-hidden="true"
            />
            <div className="flex flex-col gap-1">
                <p className="text-base font-bold text-tone-amber">{judul}</p>
                {isi !== undefined && <p className="text-sm">{isi}</p>}
                {children !== undefined && (
                    <div className="mt-2 flex flex-wrap gap-3.5">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Menambah balita dikerjakan di Data Balita, satu-satunya tempat formulir
 * lengkapnya berada.
 */
function TombolTambah() {
    return (
        <button
            type="button"
            onClick={() => navigate('/balita')}
            className="tombol-kedua"
        >
            <UserPlus className="size-5" strokeWidth={2.5} aria-hidden="true" />
            Tambah balita
        </button>
    );
}

function Lencana({
    nada,
    children,
}: {
    nada: 'hijau' | 'amber';
    children: ReactNode;
}) {
    const Ikon = nada === 'hijau' ? CircleCheck : TriangleAlert;

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-bold whitespace-nowrap ${
                nada === 'hijau'
                    ? 'bg-tone-green-bg text-tone-green'
                    : 'bg-tone-amber-bg text-tone-amber'
            }`}
        >
            <Ikon
                className="size-4 shrink-0"
                strokeWidth={2.5}
                aria-hidden="true"
            />
            {children}
        </span>
    );
}

function IsianUkur({
    id,
    label,
    satuan,
    nilai,
    onGanti,
    galat,
    waspada = false,
    keterangan,
}: {
    id: string;
    label: string;
    satuan: string;
    nilai: string;
    onGanti: (nilai: string) => void;
    galat?: string;
    /** Bingkai amber saat angkanya sedang diminta dipastikan. */
    waspada?: boolean;
    keterangan?: string;
}) {
    const pesan = galat ?? keterangan;

    return (
        <div>
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-muted-foreground"
            >
                {label}
            </label>
            <div
                className={`isian mt-1.5 flex overflow-hidden p-0 ${
                    galat !== undefined
                        ? 'border-tone-red'
                        : waspada
                          ? 'border-tone-amber'
                          : ''
                }`}
            >
                <input
                    id={id}
                    inputMode="decimal"
                    autoComplete="off"
                    value={nilai}
                    aria-invalid={galat !== undefined}
                    aria-describedby={
                        pesan === undefined ? undefined : `${id}-ket`
                    }
                    onChange={(e) => onGanti(e.target.value)}
                    className="min-w-0 grow bg-transparent px-3.5 text-right text-lg font-bold outline-none"
                />
                <span className="flex items-center border-l-2 border-border bg-surface-alt px-3.5 text-sm text-muted-foreground">
                    {satuan}
                </span>
            </div>
            {pesan !== undefined && (
                <p
                    id={`${id}-ket`}
                    className={`mt-1.5 text-sm ${
                        galat !== undefined
                            ? 'font-semibold text-tone-red'
                            : 'text-muted-foreground'
                    }`}
                >
                    {pesan}
                </p>
            )}
        </div>
    );
}

function Ringkasan({
    judul,
    nilai,
    banding: teksBanding,
}: {
    judul: string;
    nilai: string;
    banding: string;
}) {
    return (
        <div className="rounded-lg bg-surface px-4 py-3.5">
            <dt className="text-sm font-semibold text-muted-foreground">
                {judul}
            </dt>
            <dd className="mt-0.5 text-2xl leading-tight font-extrabold tabular-nums">
                {nilai}
            </dd>
            <dd className="mt-0.5 text-sm">{teksBanding}</dd>
        </div>
    );
}
