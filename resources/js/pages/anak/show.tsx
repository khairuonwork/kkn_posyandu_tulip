/**
 * Detail anak — docs/10-prd-demo-frontend.md bagian 6.5.
 *
 * Layar yang paling sering membuat client mengangguk: riwayat pertumbuhan satu
 * anak sebagai satu garis.
 *
 * Urutannya sengaja vonis dulu, identitas belakangan. Kader membuka layar ini
 * untuk tahu kondisi anaknya, bukan untuk membaca ulang NIK yang barusan ia
 * klik namanya.
 */

import { Pencil, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import BarisDefinisi from '@/components/baris-definisi';
import Halaman from '@/components/halaman';
import KmsChart from '@/components/kms-chart';
import {
    nadaKategori,
    PERLU_TINDAK_LANJUT,
} from '@/components/status-gizi-badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import ZScoreCell from '@/components/z-score-cell';
import {
    KOSONG,
    labelIndeks,
    namaTampil,
    nik,
    satuan,
    tanggalPanjang,
    tanggalRingkas,
    umurBulanPada,
    umurPanjang,
    umurRingkas,
    zScore,
} from '@/lib/format';
import { Link } from '@/lib/nav';
import type {
    Anak,
    GarisSd,
    PenilaianGizi,
    Pengukuran,
    Periode,
    Peran,
} from '@/types/posyandu';

/** Skala tegak bawaan kartu KMS, dinaikkan bila anaknya melebihi itu. */
const SKALA_MAX_BAWAAN = 18;

const ARTI_NTOB: Record<string, string> = {
    N: 'N, naik',
    T: 'T, tidak naik',
    O: 'O, tidak ditimbang bulan lalu',
    B: 'B, baru pertama',
};

/**
 * Sebab baris kosong. Ketidakhadiran bukan berat badan nol (DR-04), dan
 * sebabnya ada di data sejak awal — dulu tidak pernah sampai ke layar.
 */
const ARTI_KEHADIRAN: Record<string, string> = {
    tidak_hadir: 'Tidak hadir',
    pindah: 'Pindah',
    tidak_dapat_diukur: 'Tidak dapat diukur',
};

/** Nada mana yang harus memimpin bila satu anak punya tiga vonis sekaligus. */
const URUT_NADA: Record<string, number> = {
    merah: 0,
    oranye: 1,
    biru: 2,
    hijau: 3,
    netral: 4,
};

const WARNA_NADA: Record<string, string> = {
    merah: 'text-tone-red',
    oranye: 'text-tone-amber',
    hijau: 'text-tone-green',
    biru: 'text-tone-blue',
    netral: 'text-muted-foreground',
};

type Ambang = {
    turunMax: number;
    naikMax: number;
    tinggiBerkurangMax: number;
};

type Props = {
    anak: Anak;
    /** Seluruh pengukuran lintas periode, terbaru di atas. */
    pengukuran: Pengukuran[];
    garisSd: GarisSd[];
    peran: Peran;
    /** Periode yang sedang dilihat. Menentukan umur dan data basi. */
    periode: Periode;
    /** Ambang kewajaran dari Pengaturan, satu sumber dengan layar itu. */
    ambang: Ambang;
};

export default function DetailAnak({
    anak,
    pengukuran,
    garisSd,
    peran,
    periode,
    ambang,
}: Props) {
    const [umurDisorot, setUmurDisorot] = useState<number | null>(null);
    const bolehUbah = peran !== 'kader';
    const terbaru = pengukuran[0] ?? null;

    // Umur dihitung terhadap periode yang dilihat, bukan diambil dari
    // pengukuran terakhir. Untuk anak yang dua bulan tidak hadir, umur lama itu
    // salah — dan ia juga yang memilih label PB/U atau TB/U serta kalimat cara
    // ukur, sehingga seluruh halaman bisa memakai protokol yang keliru.
    const umur = umurBulanPada(anak.tglLahir, periode.tanggalKegiatan);

    // Pengukuran terakhir belum tentu dari periode ini.
    const basi = terbaru !== null && terbaru.periodeId !== periode.id;

    const indeks =
        terbaru === null
            ? []
            : [
                  {
                      label: labelIndeks('BB_TB', umur),
                      nilai: terbaru.penilaian.BB_TB,
                  },
                  { label: 'BB/U', nilai: terbaru.penilaian.BB_U },
                  {
                      label: labelIndeks('TB_U', umur),
                      nilai: terbaru.penilaian.TB_U,
                  },
              ];

    // Vonis terberat memimpin. Array.sort stabil, jadi saat semuanya sama
    // beratnya urutan aslinya bertahan dan BB/TB tetap di depan.
    const terurut = [...indeks].sort(
        (a, b) =>
            URUT_NADA[nadaKategori(a.nilai?.kategori ?? null)] -
            URUT_NADA[nadaKategori(b.nilai?.kategori ?? null)],
    );

    const perluTindakLanjut = indeks.some(
        (i) =>
            i.nilai?.kategori !== null &&
            i.nilai?.kategori !== undefined &&
            PERLU_TINDAK_LANJUT.includes(i.nilai.kategori),
    );

    // Titik kurva hanya dari pengukuran yang punya umur dan berat sekaligus.
    const riwayatKurva = pengukuran
        .filter(
            (p): p is Pengukuran & { umurBulan: number; bbKg: number } =>
                p.umurBulan !== null && p.bbKg !== null,
        )
        .map((p) => [p.umurBulan, p.bbKg] as [number, number])
        .sort((a, b) => a[0] - b[0]);

    const beratTertinggi = riwayatKurva.reduce(
        (m, [, kg]) => Math.max(m, kg),
        0,
    );
    const skalaMax = Math.max(SKALA_MAX_BAWAAN, Math.ceil(beratTertinggi) + 2);
    const panelAwal =
        umur === null ? 0 : Math.min(48, Math.floor(umur / 12) * 12);

    /**
     * Selisih yang tidak masuk akal secara biologis terhadap bulan sebelumnya.
     *
     * `tidakWajar` hanya menangkap nilai di luar rentang mutlak — 2 baris dari
     * 633. Tinggi yang turun 11,5 cm lolos bersih karena kedua angkanya
     * sendiri-sendiri masih wajar. Yang salah adalah selisihnya.
     */
    const janggal = (urutan: number): string | null => {
        const kini = pengukuran[urutan];
        const lalu = pengukuran[urutan + 1];

        if (lalu === undefined) {
            return null;
        }

        if (
            kini.tinggiCm !== null &&
            lalu.tinggiCm !== null &&
            lalu.tinggiCm - kini.tinggiCm > ambang.tinggiBerkurangMax
        ) {
            return `Tinggi berkurang ${satuan(lalu.tinggiCm - kini.tinggiCm, 'cm')} dari bulan sebelumnya`;
        }

        if (kini.bbKg !== null && lalu.bbKg !== null) {
            const selisih = kini.bbKg - lalu.bbKg;

            if (selisih > ambang.naikMax) {
                return `Berat naik ${satuan(selisih, 'kg', 2)} dalam sebulan`;
            }

            if (-selisih > ambang.turunMax) {
                return `Berat turun ${satuan(-selisih, 'kg', 2)} dalam sebulan`;
            }
        }

        return null;
    };

    return (
        <Halaman
            judul={namaTampil(anak.nama)}
            /* Jalan kembali menggantikan petak ikon. Labelnya ditulis lengkap:
               dulu ini kotak 44 px berisi panah saja - satu-satunya ikon tanpa
               teks di seluruh Portal, padahal prinsip P1 justru menyebut
               pengguna yang bukan pemakai komputer harian. */
            kembali={{ href: '/balita', label: 'Data Anak' }}
            /* Dulu berbunyi "Data Anak, detail. Data contoh." - remah
               breadcrumb dan catatan build, bukan kalimat tentang seorang
               anak. */
            subjudul={`${umur !== null ? `${umurPanjang(umur)}, ` : ''}${
                anak.rt === null
                    ? 'RT belum tercatat'
                    : `RT ${anak.rt.padStart(2, '0')}`
            }. Data contoh.`}
            aksi={
                /* Tombol Ubah data membuka baris anak ini di Data Anak, tempat
                   editornya benar-benar ada. Dulu ia memanggil window.alert
                   berbunyi "Belum tersedia di demo". */
                bolehUbah && (
                    <Link href="/balita" className="tombol-kedua">
                        <Pencil
                            className="size-5 text-muted-foreground"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Ubah data
                    </Link>
                )
            }
        >
            {/* Identitas memimpin halaman, seperti artboard Detail: satu
                petak fakta registri yang dipisahkan garis tebal dari vonis di
                bawahnya. Petak foto artboard tidak ikut — tidak ada satu pun
                anak yang punya potret di arsip, dan kotak kosong bertuliskan
                "Foto anak" pada 101 halaman adalah janji yang tidak ditepati. */}
            <section className="mb-7 border-b-2 border-border pb-6">
                <h2 className="sr-only">Identitas</h2>
                <dl className="grid gap-x-10 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    <BarisDefinisi label="Jenis kelamin">
                        {anak.jk === 'L'
                            ? 'Laki-laki'
                            : anak.jk === 'P'
                              ? 'Perempuan'
                              : KOSONG}
                    </BarisDefinisi>
                    <BarisDefinisi label="Tanggal lahir">
                        {tanggalPanjang(anak.tglLahir)}
                    </BarisDefinisi>
                    <BarisDefinisi label="NIK">
                        {nik(anak.nik)}
                        {!anak.nikLengkap && (
                            <span className="block text-sm text-tone-amber">
                                NIK belum lengkap
                            </span>
                        )}
                    </BarisDefinisi>
                    <BarisDefinisi label="Ibu">
                        {anak.namaOrtu ?? KOSONG}
                    </BarisDefinisi>
                    <BarisDefinisi label="Alamat">
                        {anak.rt === null
                            ? KOSONG
                            : `RT ${anak.rt.padStart(2, '0')}`}
                        {anak.anakKe !== null && `, anak ke-${anak.anakKe}`}
                    </BarisDefinisi>
                    <BarisDefinisi label="Berat lahir">
                        {satuan(anak.bbLahirKg, 'kg', 2)}
                        {anak.bbLahirMeragukan && (
                            <span className="block text-sm text-tone-amber">
                                Angka di arsip meragukan
                            </span>
                        )}
                    </BarisDefinisi>
                </dl>
            </section>

            {terbaru === null ? (
                <p className="kartu bg-surface-subtle px-6 py-6 text-base">
                    Belum ada satu pun pengukuran untuk anak ini, jadi status
                    gizi dan kurva belum dapat ditampilkan.
                </p>
            ) : (
                <>
                    {/* Pemilih periode di sidebar dulu tidak berpengaruh apa pun
                        di layar ini: 22 dari 123 anak terakhir ditimbang sebelum
                        Juni dan tetap menampilkan status hijau tanpa satu kata
                        pun bahwa angkanya sudah dua bulan. */}
                    {basi && (
                        <p className="mb-7 flex max-w-[90ch] items-start gap-3 rounded-xl border border-tone-amber bg-tone-amber-bg p-5 text-base text-tone-amber">
                            <TriangleAlert
                                className="mt-0.5 size-5 shrink-0"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            <span>
                                <span className="font-bold">
                                    Belum ditimbang pada {periode.label}.
                                </span>{' '}
                                Angka di bawah berasal dari pengukuran{' '}
                                {tanggalPanjang(terbaru.tanggalUkur)}.
                            </span>
                        </p>
                    )}

                    <section>
                        <h2 className="text-xl font-extrabold">
                            Status pengukuran{' '}
                            {tanggalPanjang(terbaru.tanggalUkur)}
                        </h2>

                        {/* Tiga kartu indeks berdampingan, susunan artboard.
                            Yang terberat tetap di depan: urutannya dihitung
                            dari nadanya, bukan dari urutan tulis — supaya mata
                            jatuh lebih dulu pada vonis yang menentukan. */}
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {terurut.map((i) => (
                                <KartuIndeks
                                    key={i.label}
                                    label={i.label}
                                    nilai={i.nilai}
                                />
                            ))}
                        </div>

                        {/* Layar ini dulu tidak pernah menjawab pertanyaan yang
                            jadi alasan keberadaannya: anak ini perlu
                            ditindaklanjuti atau tidak. */}
                        <p className="mt-4 text-base font-bold">
                            {perluTindakLanjut
                                ? 'Perlu tindak lanjut bulan ini.'
                                : 'Tidak perlu tindak lanjut bulan ini.'}
                        </p>

                        <p className="mt-2 max-w-[80ch] text-sm text-pretty text-muted-foreground">
                            Acuan standar pertumbuhan WHO 2006, dihitung dari
                            parameter LMS. Nilainya sama dengan tabel Permenkes
                            No. 2 Tahun 2020. Indeks mengikuti umur anak: BB/PB
                            di bawah 24 bulan, BB/TB untuk 24 bulan ke atas.
                        </p>

                        {/* Asumsi sistem harus terlihat di antarmuka, bukan hanya
                            di basis data (prinsip P4). */}
                        {terbaru.catatanUkur?.jenisUkur !== undefined && (
                            <p className="mt-2 max-w-[80ch] text-sm text-muted-foreground">
                                Cara ukur {terbaru.catatanUkur.jenisUkur}:{' '}
                                {umur !== null && umur < 24
                                    ? 'panjang badan, telentang'
                                    : 'tinggi badan, berdiri'}
                                . Berkas sumber tidak mencatatnya.
                            </p>
                        )}
                    </section>

                    {/* Kurva dan riwayat adalah cerita yang sama, jadi jaraknya
                        lebih rapat satu sama lain daripada ke bagian lain. */}
                    <section className="mt-7">
                        {/* Dulu bagian ini tidak punya judul sama sekali: yang
                            terlihat hanya slogan Buku KIA, sehingga navigasi
                            judul pembaca layar melewati 35% halaman. */}
                        <h2 className="text-xl font-extrabold">
                            Kurva berat badan menurut umur
                        </h2>

                        {riwayatKurva.length === 0 ? (
                            <p className="mt-2 text-base text-muted-foreground">
                                Belum ada pengukuran berat yang dapat
                                digambarkan.
                            </p>
                        ) : riwayatKurva.length < 2 ? (
                            <p className="mt-2 text-base text-muted-foreground">
                                Baru satu kali pengukuran — kurva muncul setelah
                                pengukuran berikutnya.
                            </p>
                        ) : (
                            anak.jk !== null && (
                                <KmsChart
                                    kelamin={anak.jk}
                                    panelAwal={panelAwal}
                                    skalaMax={skalaMax}
                                    riwayat={riwayatKurva}
                                    garisSd={garisSd}
                                    umurDisorot={umurDisorot}
                                    detail={pengukuran
                                        .filter(
                                            (
                                                p,
                                            ): p is Pengukuran & {
                                                umurBulan: number;
                                                bbKg: number;
                                            } =>
                                                p.umurBulan !== null &&
                                                p.bbKg !== null,
                                        )
                                        .map((p) => ({
                                            umurBulan: p.umurBulan,
                                            beratKg: p.bbKg,
                                            tanggal: p.tanggalUkur,
                                            z: p.penilaian.BB_U?.z ?? null,
                                            kategori:
                                                p.penilaian.BB_U?.kategori ??
                                                null,
                                        }))}
                                />
                            )
                        )}
                    </section>

                    <section className="mt-7">
                        <div className="kartu overflow-hidden">
                            {/* Judul menyatu dengan kartunya di strip kepala,
                                seperti artboard. */}
                            <div className="strip-kepala">
                                <h2 className="text-xl font-extrabold">
                                    Riwayat pengukuran
                                </h2>
                                {/* Mengklik baris menyorot titiknya di kurva.
                                    Dulu tidak ada satu pun tanda bahwa itu
                                    mungkin, dan <tr onClick> tidak bisa
                                    dijangkau papan tombol sama sekali. */}
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Pilih tanggal untuk menyorot titiknya pada
                                    kurva di atas.
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground md:hidden">
                                    Tabel ini lebih lebar daripada layar. Geser
                                    ke samping untuk melihat kolom z-score.
                                </p>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead scope="col">
                                            Tanggal
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            className="hidden lg:table-cell"
                                        >
                                            Umur
                                        </TableHead>
                                        <TableHead scope="col">Berat</TableHead>
                                        <TableHead scope="col">
                                            Panjang atau Tinggi
                                        </TableHead>
                                        <TableHead scope="col">
                                            {labelIndeks('BB_TB', umur)}
                                        </TableHead>
                                        <TableHead scope="col">
                                            {labelIndeks('TB_U', umur)}
                                        </TableHead>
                                        <TableHead
                                            scope="col"
                                            className="hidden md:table-cell"
                                        >
                                            Pertumbuhan
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pengukuran.map((p, urutan) => {
                                        const sebab =
                                            p.statusKehadiran === 'hadir'
                                                ? null
                                                : (ARTI_KEHADIRAN[
                                                      p.statusKehadiran
                                                  ] ?? null);
                                        const peringatan = janggal(urutan);

                                        return (
                                            <TableRow
                                                key={p.periodeId}
                                                aria-current={
                                                    p.umurBulan === umurDisorot
                                                        ? 'true'
                                                        : undefined
                                                }
                                                className={
                                                    p.umurBulan === umurDisorot
                                                        ? 'bg-accent'
                                                        : ''
                                                }
                                            >
                                                <TableCell className="py-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setUmurDisorot(
                                                                p.umurBulan,
                                                            )
                                                        }
                                                        className="inline-flex min-h-13 items-center rounded-lg px-3 font-semibold text-primary underline"
                                                    >
                                                        {tanggalRingkas(
                                                            p.tanggalUkur,
                                                        )}
                                                    </button>
                                                    {/* Baris kosong sekarang
                                                        menyebutkan sebabnya. */}
                                                    {sebab !== null && (
                                                        <span className="block px-3 pb-1 text-sm text-muted-foreground">
                                                            {sebab}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden whitespace-nowrap lg:table-cell">
                                                    {umurRingkas(p.umurBulan)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {satuan(p.bbKg, 'kg', 2)}
                                                </TableCell>
                                                <TableCell>
                                                    {satuan(p.tinggiCm, 'cm')}
                                                    {/* Keterangan cara ukur
                                                        hanya bila ada angkanya:
                                                        dulu ia tetap dicetak di
                                                        bawah pengukuran yang
                                                        tidak pernah terjadi. */}
                                                    {p.tinggiCm !== null && (
                                                        <span className="block text-sm text-muted-foreground">
                                                            {p.umurBulan !==
                                                                null &&
                                                            p.umurBulan < 24
                                                                ? 'panjang badan'
                                                                : 'tinggi badan'}
                                                        </span>
                                                    )}
                                                    {peringatan !== null && (
                                                        <span className="mt-1 flex items-start gap-1.5 text-sm text-tone-amber">
                                                            <TriangleAlert
                                                                className="mt-0.5 size-4 shrink-0"
                                                                strokeWidth={
                                                                    2.5
                                                                }
                                                                aria-hidden="true"
                                                            />
                                                            {peringatan}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <ZScoreCell
                                                        nilai={
                                                            p.penilaian.BB_TB
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <ZScoreCell
                                                        nilai={p.penilaian.TB_U}
                                                    />
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    {p.ntob === null
                                                        ? KOSONG
                                                        : (ARTI_NTOB[
                                                              p.ntob.toUpperCase()
                                                          ] ?? p.ntob)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <p className="mt-3 max-w-[80ch] text-sm text-muted-foreground">
                            Kolom Pertumbuhan menampilkan huruf N, T, O, dan B
                            apa adanya dari arsip. Aturan 1T/2T/3T belum
                            diterapkan karena definisinya masih dikonfirmasi.
                        </p>
                    </section>
                </>
            )}

            {/* Dulu dua section penuh - "Imunisasi" dan "Catatan bidan" -
                masing-masing dengan judul sendiri, keduanya selalu kosong, di
                setiap satu dari 101 anak. Faktanya muat dalam satu kalimat. */}
            <p className="mt-10 max-w-[80ch] text-base text-muted-foreground">
                Belum ada catatan imunisasi maupun catatan bidan untuk anak ini.
                Detail per vaksin ada di Buku KIA fisik; aplikasi hanya
                menyimpan status ringkas.
            </p>

            {/* Tombol yang hanya memunculkan window.alert("Belum
                tersedia di demo") dibuang. Kontrol yang menjanjikan sesuatu
                lalu menolaknya lebih buruk daripada kontrol yang tidak ada;
                kalimat di atas sudah menyebut keadaannya. */}
        </Halaman>
    );
}

/**
 * Satu kartu indeks: judul, z-score 36 px berwarna, lalu kategorinya.
 *
 * Bentuk kartu artboard Detail. Kategori selalu ditulis penuh — warna tidak
 * pernah menjadi satu-satunya penanda (05-uiux-spec.md bagian 3).
 */
function KartuIndeks({
    label,
    nilai,
}: {
    label: string;
    nilai: PenilaianGizi | undefined;
}) {
    const warna = WARNA_NADA[nadaKategori(nilai?.kategori ?? null)];

    return (
        <div className="kartu p-5">
            <p className="text-sm font-bold text-muted-foreground">{label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span
                    className={`text-3xl leading-none font-extrabold ${warna}`}
                >
                    {nilai === undefined ? KOSONG : zScore(nilai.z)}
                </span>
                <span className="text-sm text-muted-foreground">SD</span>
            </p>
            <p className={`mt-1.5 text-base font-bold text-pretty ${warna}`}>
                {nilai?.kategori ?? 'Belum dapat dinilai'}
            </p>
        </div>
    );
}
