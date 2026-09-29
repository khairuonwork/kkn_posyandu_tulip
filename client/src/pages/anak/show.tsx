/**
 * Detail Balita — satu layar, mengikuti mockup yang disetujui 26 September
 * 2026 (rancangan awal: docs/riwayat/layar-demo.md bagian 6.5).
 *
 * Kiri: identitas ringkas dan kurva KMS. Kanan: status gizi penimbangan
 * terakhir dan riwayat penimbangan yang digulir di dalam kartunya. Seluruh
 * angka tiap penimbangan ada di layar Detail riwayat penimbangan; ubah data
 * dan cetak kartu dibuka sebagai dialog, bukan layar sendiri.
 *
 * Status N/T di kolom "Berat naik?" adalah nilai arsip apa adanya sampai OI-01
 * dijawab (docs/pertanyaan-terbuka.md); KBM hanya dipakai sebagai keterangan
 * "kurang dari … kg".
 */

import {
    ArrowRight,
    ChevronDown,
    ChevronRight,
    CircleCheck,
    Info,
    Mars,
    MessageCircle,
    OctagonAlert,
    Pencil,
    Printer,
    Save,
    TriangleAlert,
    Venus,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Dialog, { KakiDialog } from '@/components/dialog';
import Halaman from '@/components/halaman';
import KartuBalita, { LembarCetak } from '@/components/kartu-balita';
import KmsChart from '@/components/kms-chart';
import type { TitikKms } from '@/components/kms-chart';
import StatusGiziBadge, {
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
import {
    angka,
    KOSONG,
    labelIndeks,
    namaTampil,
    nik,
    satuan,
    tanggalPanjang,
    tanggalRingkas,
    umurBulanPada,
    umurRingkas,
    zScore,
} from '@/lib/format';
import { kodeKartuSasaran } from '@/lib/kartu-sasaran';
import { kbmKg } from '@/lib/kategori';
import { Link } from '@/lib/nav';
import type { PatchAnak } from '@/pages/anak/index';
import type {
    Anak,
    GarisSd,
    JenisKelamin,
    Pengukuran,
    Periode,
    Peran,
} from '@/types/posyandu';

export type AmbangDetail = {
    turunMax: number;
    naikMax: number;
    tinggiBerkurangMax: number;
    ambangWaspada: number;
    ambangRujukan: number;
};

type Props = {
    anak: Anak;
    /** Seluruh pengukuran lintas periode, terbaru di atas. */
    pengukuran: Pengukuran[];
    garisSd: GarisSd[];
    peran: Peran;
    /** Periode yang sedang dilihat. Menentukan umur dan data basi. */
    periode: Periode;
    /** Ambang dari Pengaturan, satu sumber dengan layar itu. */
    ambang: AmbangDetail;
    wilayahRt: string[];
    /** Nomor WhatsApp orang tua; null bila belum diisi. */
    noWa: string | null;
    /** Nama Posyandu di kepala kartu, mis. "Posyandu Tulip · RW 18 Citeureup". */
    lembaga: string;
    onSimpan?: (patch: PatchAnak) => void;
};

/**
 * Pengukuran yang berlaku untuk periode yang dilihat: yang terakhir sampai
 * tanggal kegiatannya, tidak pernah yang sesudahnya. Angka yang belum terjadi
 * pada periode ini bukan status periode ini.
 */
export function terbaruUntuk(
    pengukuran: Pengukuran[],
    periode: Periode,
): Pengukuran | null {
    const batas = periode.tanggalKegiatan;

    return (
        (batas === null
            ? pengukuran.find((p) => p.periodeId === periode.id)
            : pengukuran.find(
                  (p) =>
                      p.statusKehadiran === 'hadir' &&
                      p.tanggalUkur !== null &&
                      p.tanggalUkur <= batas,
              )) ?? null
    );
}

/** "13 Jun" — tanggal tanpa tahun untuk kolom yang sempit. */
function tanggalPendek(iso: string | null): string {
    return tanggalRingkas(iso).replace(/ \d{4}$/, '');
}

/** Umur dalam bulan pecahan, supaya titik kurva jatuh di tanggal ukurnya. */
function umurTepat(tglLahir: string | null, tanggal: string | null) {
    if (tglLahir === null || tanggal === null) {
        return null;
    }

    return (Date.parse(tanggal) - Date.parse(tglLahir)) / 86_400_000 / 30.4375;
}

/** "+0,15 kg" dengan tanda minus yang benar, atau `—`. */
function teksSelisih(kg: number | null): string {
    return kg === null ? KOSONG : `${kg >= 0 ? '+' : ''}${angka(kg, 2)} kg`;
}

/**
 * Isi kolom "Berat naik?": status arsip N/T/O/B, dengan batas KBM umurnya di
 * bawah "Tidak naik".
 */
export function StatusNaik({
    ntob,
    umurBulan,
    ikon = true,
}: {
    ntob: string | null;
    umurBulan: number | null;
    ikon?: boolean;
}) {
    const huruf = ntob?.toUpperCase() ?? null;

    if (huruf === 'N') {
        return (
            <span className="inline-flex items-center gap-1.5 font-bold whitespace-nowrap text-tone-green">
                {ikon && (
                    <CircleCheck
                        className="size-4 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                )}
                Naik
            </span>
        );
    }

    if (huruf === 'T') {
        const kbm = kbmKg(umurBulan);

        return (
            <>
                <span className="inline-flex items-center gap-1.5 font-bold whitespace-nowrap text-tone-amber">
                    {ikon && (
                        <TriangleAlert
                            className="size-4 shrink-0"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    )}
                    Tidak naik
                </span>
                {kbm !== null && (
                    <span className="block text-sm font-medium text-muted-foreground">
                        kurang dari {angka(kbm, 2)} kg
                    </span>
                )}
            </>
        );
    }

    return (
        <span className="text-muted-foreground">
            {huruf === 'B'
                ? 'Pertama kali ditimbang'
                : huruf === 'O'
                  ? 'Tidak ditimbang bulan lalu'
                  : KOSONG}
        </span>
    );
}

export default function DetailAnak({
    anak,
    pengukuran,
    garisSd,
    peran,
    periode,
    ambang,
    wilayahRt,
    noWa,
    lembaga,
    onSimpan,
}: Props) {
    const [dialog, setDialog] = useState<'ubah' | 'cetak' | null>(null);
    const [tanpaWa, setTanpaWa] = useState(false);
    const bolehUbah = peran !== 'kader';
    const nama = namaTampil(anak.nama);

    const terbaru = terbaruUntuk(pengukuran, periode);
    // Umur dihitung terhadap periode yang dilihat, bukan diambil dari
    // pengukuran terakhir: untuk balita yang dua bulan tidak hadir, umur lama
    // itu salah, dan umur jugalah yang memilih label PB/U atau TB/U.
    const umur = umurBulanPada(anak.tglLahir, periode.tanggalKegiatan);
    const berdiri = umur !== null && umur >= 24;
    const basi = terbaru !== null && terbaru.periodeId !== periode.id;

    const indeks =
        terbaru === null
            ? []
            : [
                  {
                      label: labelIndeks('BB_TB', umur),
                      nama: berdiri
                          ? 'berat menurut tinggi'
                          : 'berat menurut panjang',
                      nilai: terbaru.penilaian.BB_TB,
                  },
                  {
                      label: 'BB/U',
                      nama: 'berat menurut umur',
                      nilai: terbaru.penilaian.BB_U,
                  },
                  {
                      label: labelIndeks('TB_U', umur),
                      nama: berdiri
                          ? 'tinggi menurut umur'
                          : 'panjang menurut umur',
                      nilai: terbaru.penilaian.TB_U,
                  },
              ];

    const perluTindakLanjut = indeks.some(
        (i) =>
            i.nilai?.kategori != null &&
            PERLU_TINDAK_LANJUT.includes(i.nilai.kategori),
    );
    const perluRujukan = indeks.some(
        (i) => i.nilai !== undefined && i.nilai.z <= ambang.ambangRujukan,
    );
    const perluWaspada = indeks.some(
        (i) => i.nilai !== undefined && i.nilai.z <= ambang.ambangWaspada,
    );
    const arahan = perluRujukan
        ? 'Hasil pengukuran perlu ditindaklanjuti. Silakan hubungi fasilitas kesehatan atau dokter terdekat untuk penilaian lebih lanjut.'
        : perluWaspada || perluTindakLanjut
          ? 'Pertumbuhan perlu dipantau lebih dekat. Pastikan anak hadir pada penimbangan berikutnya dan diskusikan asupan makan dengan kader atau bidan.'
          : 'Pertumbuhan saat ini berada dalam pemantauan. Lanjutkan makan beragam sesuai usia dan datang kembali pada penimbangan bulan depan.';

    // Penimbangan yang dihadiri, terbaru di atas; selisih dihitung terhadap
    // penimbangan sebelumnya di daftar yang sama.
    const hadir = pengukuran.filter(
        (p): p is Pengukuran & { bbKg: number } =>
            p.statusKehadiran === 'hadir' && p.bbKg !== null,
    );
    const selisih = (i: number) =>
        hadir[i + 1] === undefined ? null : hadir[i].bbKg - hadir[i + 1].bbKg;

    const titik: TitikKms[] = hadir
        .map((p, i) => ({
            umur: umurTepat(anak.tglLahir, p.tanggalUkur) ?? p.umurBulan ?? 0,
            beratKg: p.bbKg,
            tanggal: p.tanggalUkur,
            umurBulan: p.umurBulan,
            tinggiCm: p.tinggiCm,
            naik: p.ntob,
            selisihKg: selisih(i),
            kbmKg: kbmKg(p.umurBulan),
            zBbTb: p.penilaian.BB_TB?.z ?? null,
            kategoriBbTb: p.penilaian.BB_TB?.kategori ?? null,
        }))
        .reverse();
    const panelAwal =
        umur === null ? 0 : Math.min(48, Math.floor(umur / 12) * 12);

    const kirimWa = () => {
        const nomor = (noWa ?? '').replace(/\D/g, '');

        if (nomor === '' || terbaru === null) {
            setTanpaWa(true);

            return;
        }

        const pesan = [
            `Hasil penimbangan ${nama} pada ${tanggalPanjang(terbaru.tanggalUkur)}:`,
            `berat badan ${satuan(terbaru.bbKg, 'kg', 2)}, ${berdiri ? 'tinggi' : 'panjang'} badan ${satuan(terbaru.tinggiCm, 'cm')}.`,
            `Status gizi (${labelIndeks('BB_TB', umur)}): ${terbaru.penilaian.BB_TB?.kategori ?? 'belum dinilai'}.`,
            arahan,
        ].join(' ');

        window.open(
            `https://wa.me/${nomor.replace(/^0/, '62')}?text=${encodeURIComponent(pesan)}`,
            '_blank',
            'noopener,noreferrer',
        );
    };

    const [kelasVonis, IkonVonis, teksVonis] = perluRujukan
        ? [
              'bg-tone-red-bg text-tone-red',
              OctagonAlert,
              'Perlu tindak lanjut bulan ini',
          ]
        : perluTindakLanjut
          ? [
                'bg-tone-amber-bg text-tone-amber',
                TriangleAlert,
                'Perlu tindak lanjut bulan ini',
            ]
          : [
                'bg-tone-green-bg text-tone-green',
                CircleCheck,
                'Tidak perlu tindak lanjut bulan ini',
            ];

    return (
        <Halaman
            penuh="xl"
            judul={nama}
            kembali={{ href: '/balita', label: 'Data Balita' }}
            subjudul={`${umur !== null ? `${umurRingkas(umur)} · ` : ''}Data contoh.`}
            aksi={
                <>
                    {bolehUbah && (
                        <button
                            type="button"
                            onClick={() => {
                                setTanpaWa(false);
                                setDialog('ubah');
                            }}
                            className="tombol-kedua"
                        >
                            <Pencil
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Ubah data
                        </button>
                    )}
                    {bolehUbah && (
                        <button
                            type="button"
                            onClick={() => setDialog('cetak')}
                            className="tombol-kedua"
                        >
                            <Printer
                                className="size-5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Cetak kartu
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={kirimWa}
                        className="tombol-utama"
                    >
                        <MessageCircle
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Kirim hasil ke WhatsApp
                    </button>
                </>
            }
        >
            {/* Kolom kanan paling sempit 350 px: di bawahnya tabel Riwayat
                tergulir ke samping. Yang mengalah kolom kurva, yang tetap
                terbaca meski sedikit menyempit. */}
            <div className="grid gap-3.5 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,634px)_minmax(350px,1fr)] xl:gap-4.5">
                <div className="flex min-w-0 flex-col gap-3.5">
                    <section
                        aria-label="Identitas"
                        className="kartu px-4.5 py-3"
                    >
                        <dl className="grid grid-cols-2 gap-x-4.5 gap-y-2 sm:grid-cols-4">
                            <Fakta label="Jenis kelamin">
                                {anak.jk === 'L'
                                    ? 'Laki-laki'
                                    : anak.jk === 'P'
                                      ? 'Perempuan'
                                      : KOSONG}
                            </Fakta>
                            <Fakta label="Tanggal lahir">
                                {tanggalRingkas(anak.tglLahir)}
                            </Fakta>
                            <Fakta label="Anak ke-">
                                {anak.anakKe ?? KOSONG}
                            </Fakta>
                            <Fakta label="Berat lahir">
                                {anak.bbLahirKg === null ? (
                                    <>
                                        {KOSONG}{' '}
                                        <span className="text-sm font-medium text-muted-foreground">
                                            tidak tercatat
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        {satuan(anak.bbLahirKg, 'kg', 2)}{' '}
                                        {/* BBLR hanya ditandai bila angkanya
                                            tepercaya; angka yang diragukan
                                            tidak boleh memicu penanda klinis. */}
                                        {anak.bbLahirMeragukan ? (
                                            <span className="text-sm font-semibold text-tone-amber">
                                                angka di arsip meragukan
                                            </span>
                                        ) : (
                                            anak.bbLahirKg < 2.5 && (
                                                <span className="text-sm font-semibold text-tone-blue">
                                                    BBLR
                                                </span>
                                            )
                                        )}
                                    </>
                                )}
                            </Fakta>
                            <Fakta label="Nama ibu">
                                {anak.namaOrtu ?? KOSONG}
                            </Fakta>
                            <Fakta label="RT">
                                {anak.rt === null
                                    ? KOSONG
                                    : anak.rt.padStart(2, '0')}
                            </Fakta>
                            <Fakta label="NIK" lebar>
                                {nik(anak.nik)}
                                {!anak.nikLengkap && (
                                    <span className="ml-2 text-sm font-semibold text-tone-amber">
                                        NIK belum lengkap
                                    </span>
                                )}
                            </Fakta>
                        </dl>
                    </section>

                    {titik.length === 0 || anak.jk === null ? (
                        <p className="kartu px-4.5 py-6 text-base text-muted-foreground">
                            Belum ada pengukuran berat yang dapat digambarkan.
                        </p>
                    ) : (
                        <KmsChart
                            judul="Kurva berat badan menurut umur"
                            namaAnak={nama}
                            kelamin={anak.jk}
                            garisSd={garisSd}
                            titik={titik}
                            panelAwal={panelAwal}
                        />
                    )}
                </div>

                <div className="flex min-w-0 flex-col gap-3.5 xl:min-h-0">
                    {tanpaWa && (
                        <div
                            role="alert"
                            className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-lg border border-tone-amber bg-tone-amber-bg px-4 py-2.5"
                        >
                            <TriangleAlert
                                className="size-5 shrink-0 text-tone-amber"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            <p className="min-w-0 flex-1 text-sm font-semibold">
                                {terbaru === null
                                    ? `Belum ada hasil penimbangan ${nama} untuk dikirim.`
                                    : 'Nomor WhatsApp orang tua belum diisi. Isi lewat Ubah data.'}
                            </p>
                            {bolehUbah && terbaru !== null && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTanpaWa(false);
                                        setDialog('ubah');
                                    }}
                                    className="tombol-kedua"
                                >
                                    Ubah data
                                </button>
                            )}
                        </div>
                    )}

                    <section
                        aria-labelledby="judul-status"
                        className="kartu @container shrink-0 px-4.5 pt-3.5 pb-4"
                    >
                        {terbaru === null ? (
                            <>
                                <h2
                                    id="judul-status"
                                    className="text-lg leading-tight font-extrabold"
                                >
                                    Status gizi
                                </h2>
                                <p className="mt-1 text-base text-muted-foreground">
                                    Belum ada penimbangan sampai {periode.label}
                                    , jadi status gizi belum dapat ditampilkan.
                                </p>
                            </>
                        ) : (
                            <>
                                <h2
                                    id="judul-status"
                                    className="text-lg leading-tight font-extrabold"
                                >
                                    Status gizi{' '}
                                    {tanggalPanjang(terbaru.tanggalUkur)}
                                </h2>
                                {basi && (
                                    <p className="mt-1 text-sm font-semibold text-tone-amber">
                                        Belum ditimbang bulan ini. Status
                                        terakhir dari{' '}
                                        {tanggalPanjang(terbaru.tanggalUkur)}.
                                    </p>
                                )}
                                <p className="mt-1.5">
                                    <span
                                        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-base font-bold ${kelasVonis}`}
                                    >
                                        <IkonVonis
                                            className="size-5 shrink-0"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                        {teksVonis}
                                    </span>
                                </p>
                                <div className="mt-2">
                                    {indeks.map((i) => (
                                        <div
                                            key={i.label}
                                            className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-rule py-1.5"
                                        >
                                            {/* Di kartu sempit (tablet mendatar) nama indeks
                                                mengambil barisnya sendiri; z dan
                                                lencananya turun ke kanan bawah. */}
                                            <span className="w-full text-sm font-semibold text-muted-foreground @sm:w-auto @sm:min-w-32 @sm:flex-1">
                                                {i.label} · {i.nama}
                                            </span>
                                            <span className="ml-auto text-base font-extrabold whitespace-nowrap tabular-nums @sm:ml-0">
                                                {i.nilai === undefined
                                                    ? KOSONG
                                                    : `${zScore(i.nilai.z)} SD`}
                                            </span>
                                            <StatusGiziBadge
                                                kategori={
                                                    i.nilai?.kategori ?? null
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <p className="mt-0 flex flex-wrap gap-x-4.5 gap-y-1 border-t border-rule pt-2 text-sm text-muted-foreground">
                            <span>
                                Buku KIA:{' '}
                                <span
                                    className={`font-bold ${anak.bukuKia ? 'text-tone-green' : 'text-tone-amber'}`}
                                >
                                    {anak.bukuKia ? 'ada' : 'belum ada'}
                                </span>
                            </span>
                            <span>
                                Imunisasi:{' '}
                                <span className="font-bold text-tone-amber">
                                    belum diperiksa
                                </span>
                            </span>
                        </p>
                    </section>

                    <section
                        aria-labelledby="judul-riwayat"
                        className="kartu flex flex-col overflow-hidden xl:min-h-0 xl:flex-1"
                    >
                        <div className="flex shrink-0 items-baseline justify-between gap-2 px-4.5 pt-3.5 pb-1.5">
                            <h2
                                id="judul-riwayat"
                                className="text-lg leading-tight font-extrabold"
                            >
                                Riwayat penimbangan
                            </h2>
                            <span className="text-sm text-muted-foreground">
                                {hadir.length} kali, terbaru di atas
                            </span>
                        </div>

                        {hadir.length > 0 && (
                            <Table
                                aria-label="Riwayat penimbangan"
                                containerClassName="xl:min-h-0 xl:flex-1"
                            >
                                <TableHeader className="sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="h-auto bg-card px-2 py-1.5 first:pl-4.5">
                                            Tanggal
                                        </TableHead>
                                        <TableHead className="h-auto bg-card px-2 py-1.5 text-right">
                                            Berat
                                        </TableHead>
                                        <TableHead className="h-auto bg-card px-2 py-1.5 text-right">
                                            Selisih
                                        </TableHead>
                                        <TableHead className="h-auto bg-card px-2 py-1.5 last:pr-4.5">
                                            Berat naik?
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hadir.map((p, i) => (
                                        <TableRow key={p.periodeId}>
                                            <TableCell className="px-2 py-1.5 font-bold whitespace-nowrap first:pl-4.5">
                                                {tanggalPendek(p.tanggalUkur)}
                                            </TableCell>
                                            <TableCell className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                                                {satuan(p.bbKg, 'kg', 2)}
                                            </TableCell>
                                            <TableCell className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                                                {teksSelisih(selisih(i))}
                                            </TableCell>
                                            {/* Tanpa nowrap: "Pertama kali ditimbang"
                                                membungkus, bukan mendorong tabel
                                                tergulir ke samping di kolom sempit. */}
                                            <TableCell className="px-2 py-1.5 last:pr-4.5">
                                                <StatusNaik
                                                    ntob={p.ntob}
                                                    umurBulan={p.umurBulan}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        <div className="shrink-0 border-t border-border p-3.5">
                            <Link
                                href={`/balita/${anak.id}/riwayat`}
                                className="tombol-kedua w-full"
                            >
                                Detail riwayat penimbangan
                                <ChevronRight
                                    className="size-5"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                />
                            </Link>
                        </div>
                    </section>
                </div>
            </div>

            {dialog === 'ubah' && (
                <DialogUbah
                    anak={anak}
                    noWa={noWa}
                    wilayahRt={wilayahRt}
                    onTutup={() => setDialog(null)}
                    onSimpan={(patch) => {
                        onSimpan?.(patch);
                        setDialog(null);
                    }}
                />
            )}

            {dialog === 'cetak' && (
                <DialogCetak
                    anak={anak}
                    lembaga={lembaga}
                    onTutup={() => setDialog(null)}
                />
            )}
        </Halaman>
    );
}

function Fakta({
    label,
    lebar = false,
    children,
}: {
    label: string;
    lebar?: boolean;
    children: ReactNode;
}) {
    return (
        <div className={`min-w-0 ${lebar ? 'col-span-2' : ''}`}>
            <dt className="text-sm font-semibold text-muted-foreground">
                {label}
            </dt>
            <dd className="font-bold">{children}</dd>
        </div>
    );
}

type IsianUbah = {
    nama: string;
    jk: JenisKelamin;
    tglLahir: string;
    anakKe: string;
    bbLahir: string;
    rt: string;
    nik: string;
    bukuKia: boolean;
    namaOrtu: string;
    noWa: string;
};

function DialogUbah({
    anak,
    noWa,
    wilayahRt,
    onTutup,
    onSimpan,
}: {
    anak: Anak;
    noWa: string | null;
    wilayahRt: string[];
    onTutup: () => void;
    onSimpan: (patch: PatchAnak) => void;
}) {
    const [isi, setIsi] = useState<IsianUbah>({
        nama: anak.nama ?? '',
        jk: anak.jk ?? 'P',
        tglLahir: anak.tglLahir ?? '',
        anakKe: anak.anakKe === null ? '' : String(anak.anakKe),
        bbLahir: anak.bbLahirKg === null ? '' : angka(anak.bbLahirKg, 2),
        rt: anak.rt ?? wilayahRt[0] ?? '',
        nik: anak.nik === null ? '' : nik(anak.nik),
        bukuKia: anak.bukuKia,
        namaOrtu: anak.namaOrtu ?? '',
        noWa: noWa ?? '',
    });
    const [galat, setGalat] = useState<
        Partial<Record<keyof IsianUbah, string>>
    >({});

    const ubah = <K extends keyof IsianUbah>(kunci: K, nilai: IsianUbah[K]) => {
        setIsi((lama) => ({ ...lama, [kunci]: nilai }));
        setGalat((lama) => ({ ...lama, [kunci]: undefined }));
    };

    const simpan = (e: FormEvent) => {
        e.preventDefault();

        const salah: Partial<Record<keyof IsianUbah, string>> = {};
        const digit = isi.nik.replace(/\D/g, '');
        const bb =
            isi.bbLahir.trim() === ''
                ? null
                : Number(isi.bbLahir.replace(',', '.'));

        if (isi.nama.trim() === '') {
            salah.nama = 'Nama balita wajib diisi.';
        }

        if (isi.tglLahir === '') {
            salah.tglLahir = 'Tanggal lahir wajib diisi.';
        }

        if (digit !== '' && digit.length !== 16) {
            salah.nik = `NIK harus 16 angka. Sekarang ${digit.length < 16 ? 'baru ' : ''}${digit.length}.`;
        }

        if (bb !== null && !(bb >= 0.5 && bb <= 6)) {
            salah.bbLahir = `Berat lahir ${isi.bbLahir.trim()} kg di luar batas wajar (0,5–6,0 kg). Periksa kembali angkanya.`;
        }

        setGalat(salah);

        const pertama = Object.keys(salah)[0];

        if (pertama !== undefined) {
            document.getElementById(`ubah-${pertama}`)?.focus();

            return;
        }

        onSimpan({
            nama: isi.nama.trim(),
            nik: digit,
            namaOrtu: isi.namaOrtu.trim(),
            rt: isi.rt,
            jk: isi.jk,
            tglLahir: isi.tglLahir,
            anakKe: isi.anakKe === '' ? null : Number(isi.anakKe),
            bbLahirKg: bb,
            bukuKia: isi.bukuKia,
            noWa: isi.noWa.trim(),
        });
    };

    return (
        <Dialog
            judul={`Ubah data ${namaTampil(anak.nama)}`}
            keterangan="Hasil ukur tidak diubah di sini. Setiap perubahan dicatat: siapa yang mengubah dan kapan."
            lebar="w-[920px]"
            onTutup={onTutup}
        >
            <form
                noValidate
                onSubmit={simpan}
                className="flex min-h-0 flex-1 flex-col"
            >
                <div className="grid min-h-0 gap-y-5 overflow-y-auto px-7 pt-4.5 pb-5.5 md:grid-cols-2">
                    <section
                        aria-labelledby="kolom-balita"
                        className="flex min-w-0 flex-col gap-4 md:pr-7"
                    >
                        <h3
                            id="kolom-balita"
                            className="text-base font-extrabold"
                        >
                            Data balita
                        </h3>
                        <Kolom
                            id="ubah-nama"
                            label="Nama balita"
                            galat={galat.nama}
                        >
                            <input
                                id="ubah-nama"
                                value={isi.nama}
                                onChange={(e) => ubah('nama', e.target.value)}
                                aria-invalid={galat.nama !== undefined}
                                className={`isian w-full ${galat.nama === undefined ? '' : 'border-tone-red'}`}
                            />
                        </Kolom>
                        <fieldset className="min-w-0">
                            <legend className="text-sm font-semibold text-muted-foreground">
                                Jenis kelamin
                            </legend>
                            <div className="mt-1.5 grid grid-cols-2 gap-4.5">
                                <Pilihan
                                    nama="ubah-jk"
                                    terpilih={isi.jk === 'L'}
                                    onPilih={() => ubah('jk', 'L')}
                                >
                                    <Mars
                                        className="size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Laki-laki
                                </Pilihan>
                                <Pilihan
                                    nama="ubah-jk"
                                    terpilih={isi.jk === 'P'}
                                    onPilih={() => ubah('jk', 'P')}
                                >
                                    <Venus
                                        className="size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Perempuan
                                </Pilihan>
                            </div>
                        </fieldset>
                        <div className="grid grid-cols-2 gap-4.5">
                            <Kolom
                                id="ubah-tglLahir"
                                label="Tanggal lahir"
                                galat={galat.tglLahir}
                            >
                                {/* Kotak tanggal bawaan peramban: kalender,
                                    papan tombol, dan pembaca layarnya sudah
                                    benar tanpa kode tambahan. */}
                                <input
                                    id="ubah-tglLahir"
                                    type="date"
                                    value={isi.tglLahir}
                                    onChange={(e) =>
                                        ubah('tglLahir', e.target.value)
                                    }
                                    aria-invalid={galat.tglLahir !== undefined}
                                    className={`isian w-full ${galat.tglLahir === undefined ? '' : 'border-tone-red'}`}
                                />
                            </Kolom>
                            <Kolom id="ubah-anakKe" label="Anak ke-">
                                <input
                                    id="ubah-anakKe"
                                    inputMode="numeric"
                                    value={isi.anakKe}
                                    onChange={(e) =>
                                        ubah(
                                            'anakKe',
                                            e.target.value.replace(/\D/g, ''),
                                        )
                                    }
                                    className="isian w-full"
                                />
                            </Kolom>
                        </div>
                        <div className="grid grid-cols-2 gap-4.5">
                            <Kolom
                                id="ubah-bbLahir"
                                label="Berat lahir"
                                keterangan="(boleh kosong)"
                                galat={galat.bbLahir}
                            >
                                <div
                                    className={`isian flex overflow-hidden p-0 ${galat.bbLahir === undefined ? '' : 'border-tone-red'}`}
                                >
                                    <input
                                        id="ubah-bbLahir"
                                        aria-invalid={
                                            galat.bbLahir !== undefined
                                        }
                                        inputMode="decimal"
                                        value={isi.bbLahir}
                                        onChange={(e) =>
                                            ubah(
                                                'bbLahir',
                                                e.target.value.replace(
                                                    /[^\d.,]/g,
                                                    '',
                                                ),
                                            )
                                        }
                                        className="min-w-0 grow bg-transparent px-3.5 text-right outline-none"
                                    />
                                    <span className="flex items-center border-l-2 border-border bg-surface-alt px-3.5 text-sm text-muted-foreground">
                                        kg
                                    </span>
                                </div>
                            </Kolom>
                            <Kolom id="ubah-rt" label="RT">
                                <div className="relative">
                                    <select
                                        id="ubah-rt"
                                        value={isi.rt}
                                        onChange={(e) =>
                                            ubah('rt', e.target.value)
                                        }
                                        className="isian w-full cursor-pointer appearance-none pr-11"
                                    >
                                        {wilayahRt.map((w) => (
                                            <option key={w} value={w}>
                                                RT {w.padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                </div>
                            </Kolom>
                        </div>
                    </section>

                    <section
                        aria-labelledby="kolom-ortu"
                        className="flex min-w-0 flex-col gap-4 md:border-l md:border-border md:pl-7"
                    >
                        <h3
                            id="kolom-ortu"
                            className="text-base font-extrabold"
                        >
                            Dokumen dan orang tua
                        </h3>
                        <Kolom
                            id="ubah-nik"
                            label="NIK balita"
                            keterangan="(16 angka, sesuai kartu keluarga)"
                            galat={galat.nik}
                        >
                            <input
                                id="ubah-nik"
                                inputMode="numeric"
                                value={isi.nik}
                                onChange={(e) =>
                                    ubah(
                                        'nik',
                                        e.target.value.replace(/[^\d ]/g, ''),
                                    )
                                }
                                aria-invalid={galat.nik !== undefined}
                                className={`isian w-full ${galat.nik === undefined ? '' : 'border-tone-red'}`}
                            />
                        </Kolom>
                        <fieldset className="min-w-0">
                            <legend className="text-sm font-semibold text-muted-foreground">
                                Buku KIA
                            </legend>
                            <div className="mt-1.5 grid grid-cols-2 gap-4.5">
                                <Pilihan
                                    nama="ubah-kia"
                                    terpilih={isi.bukuKia}
                                    onPilih={() => ubah('bukuKia', true)}
                                >
                                    Ada
                                </Pilihan>
                                <Pilihan
                                    nama="ubah-kia"
                                    terpilih={!isi.bukuKia}
                                    onPilih={() => ubah('bukuKia', false)}
                                >
                                    Belum ada
                                </Pilihan>
                            </div>
                        </fieldset>
                        <Kolom id="ubah-namaOrtu" label="Nama ibu">
                            <input
                                id="ubah-namaOrtu"
                                value={isi.namaOrtu}
                                onChange={(e) =>
                                    ubah('namaOrtu', e.target.value)
                                }
                                className="isian w-full"
                            />
                        </Kolom>
                        <Kolom
                            id="ubah-noWa"
                            label="Nomor WhatsApp orang tua"
                            keterangan="(boleh kosong)"
                        >
                            <input
                                id="ubah-noWa"
                                type="tel"
                                inputMode="tel"
                                value={isi.noWa}
                                onChange={(e) =>
                                    ubah(
                                        'noWa',
                                        e.target.value.replace(/[^\d +-]/g, ''),
                                    )
                                }
                                className="isian w-full"
                            />
                        </Kolom>
                    </section>
                </div>

                <KakiDialog>
                    <button
                        type="button"
                        onClick={onTutup}
                        className="tombol-kedua px-5.5"
                    >
                        Batal
                    </button>
                    <button type="submit" className="tombol-utama px-5.5">
                        <Save
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Simpan perubahan
                    </button>
                </KakiDialog>
            </form>
        </Dialog>
    );
}

/** Satu isian berlabel dengan pesan galat di bawahnya. */
function Kolom({
    id,
    label,
    keterangan,
    galat,
    children,
}: {
    id: string;
    label: string;
    keterangan?: string;
    galat?: string;
    children: ReactNode;
}) {
    return (
        <div className="min-w-0">
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-muted-foreground"
            >
                {label}
                {keterangan !== undefined && (
                    <span className="font-medium"> {keterangan}</span>
                )}
            </label>
            <div className="mt-1.5">{children}</div>
            {galat !== undefined && (
                <p className="mt-1.5 text-sm font-semibold text-tone-red">
                    {galat}
                </p>
            )}
        </div>
    );
}

/** Kartu radio: seluruh kotak bisa disentuh, yang terpilih hijau lembut. */
function Pilihan({
    nama,
    terpilih,
    onPilih,
    children,
}: {
    nama: string;
    terpilih: boolean;
    onPilih: () => void;
    children: ReactNode;
}) {
    return (
        <label
            className={`flex h-14 cursor-pointer items-center gap-2.5 rounded-lg border-2 px-3.5 text-base ${
                terpilih
                    ? 'border-primary bg-accent font-bold text-primary'
                    : 'border-border bg-surface font-semibold'
            }`}
        >
            <input
                type="radio"
                name={nama}
                checked={terpilih}
                onChange={onPilih}
                className="size-5 shrink-0 accent-primary"
            />
            {children}
        </label>
    );
}

function DialogCetak({
    anak,
    lembaga,
    onTutup,
}: {
    anak: Anak;
    lembaga: string;
    onTutup: () => void;
}) {
    const kartu = {
        nama: anak.nama,
        tglLahir: anak.tglLahir,
        rt: anak.rt,
        namaIbu: anak.namaOrtu,
        nik: anak.nik,
        id: anak.id,
        kode: kodeKartuSasaran(anak),
    };

    return (
        <Dialog
            judul="Cetak kartu balita"
            keterangan="Periksa isi kartu sebelum dicetak."
            lebar="w-[900px]"
            onTutup={onTutup}
        >
            <div className="flex min-h-0 flex-wrap gap-7 overflow-y-auto px-7 py-4.5">
                <figure className="shrink-0">
                    <div className="flex justify-center rounded-lg bg-surface-alt p-5.5">
                        <KartuBalita kartu={kartu} lembaga={lembaga} />
                    </div>
                    <figcaption className="mt-2 text-sm text-muted-foreground">
                        Ukuran asli 85,6 × 54 mm, seukuran KTP. Garis
                        putus-putus adalah garis potong.
                    </figcaption>
                </figure>

                <div className="flex min-w-60 flex-1 flex-col gap-3.5">
                    <div>
                        <h3 className="text-base font-extrabold">
                            Ingin mencetak beberapa kartu sekaligus?
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Satu lembar A4 memuat 8 kartu. Pilih balita lain di
                            halaman Kartu Balita agar kertas tidak terbuang.
                        </p>
                    </div>
                    <Link
                        href={`/kartu-sasaran/${anak.id}`}
                        className="tombol-kedua"
                    >
                        <ArrowRight
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Buka Kartu Balita
                    </Link>
                    <div className="flex gap-2.5 rounded-lg bg-tone-blue-bg px-4 py-3.5">
                        <Info
                            className="mt-px size-5 shrink-0 text-tone-blue"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        <p className="text-sm">
                            Saat jendela cetak muncul, pilih kertas{' '}
                            <span className="font-bold">A4</span> dan skala{' '}
                            <span className="font-bold">100%</span> agar ukuran
                            kartu tepat.
                        </p>
                    </div>
                </div>
            </div>

            <KakiDialog>
                <button
                    type="button"
                    onClick={onTutup}
                    className="tombol-kedua px-5.5"
                >
                    Batal
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="tombol-utama px-5.5"
                >
                    <Printer
                        className="size-5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Cetak 1 kartu
                </button>
            </KakiDialog>

            <LembarCetak kartu={[kartu]} lembaga={lembaga} />
        </Dialog>
    );
}
