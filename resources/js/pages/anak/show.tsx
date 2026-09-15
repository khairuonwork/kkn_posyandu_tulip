/**
 * Detail anak — docs/10-prd-demo-frontend.md bagian 6.5.
 *
 * Layar yang paling sering membuat client mengangguk: riwayat pertumbuhan satu
 * anak sebagai satu garis.
 *
 * Enam kalimat keterangan — acuan WHO, asumsi cara ukur, arti kolom N/T/O/B,
 * dan keterangan kurva — dicabut dari layar ini atas permintaan pemilik produk.
 * Teksnya beserta alasan dan risikonya ada di
 * docs/12-teks-keterangan-layar-detail.md; dua di antaranya menyatakan asumsi
 * sistem yang menurut prinsip P4 seharusnya terlihat di antarmuka, jadi berkas
 * itu penampungan, bukan keputusan akhir.
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
    // Pengukuran yang benar-benar berlaku untuk periode yang sedang dilihat.
    //
    // Dulu ini `pengukuran[0]`: yang terbaru lintas periode, tanpa melihat
    // periode mana yang dipilih. Membuka Februari 2026 menampilkan pengukuran
    // 13 Juni - DI BAWAH spanduk berbunyi "Belum ditimbang pada Februari
    // 2026", padahal tabel riwayat tepat di bawahnya memuat baris 14 Feb.
    // Spanduk itu klaim faktual tentang seorang anak bernama, digayakan
    // sebagai peringatan paling mendesak di halaman, dan salah.
    //
    // `pengukuran` sudah terurut terbaru di atas, jadi yang pertama lolos
    // saringan adalah yang paling dekat ke belakang. Tidak pernah ke depan:
    // angka yang belum terjadi pada periode ini bukan status periode ini.
    const batasTanggal = periode.tanggalKegiatan;
    const terbaru =
        (batasTanggal === null
            ? pengukuran.find((p) => p.periodeId === periode.id)
            : pengukuran.find(
                  (p) =>
                      p.tanggalUkur !== null && p.tanggalUkur <= batasTanggal,
              )) ?? null;
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
            penuh="lebar"
            judul={namaTampil(anak.nama)}
            /* Jalan kembali menggantikan petak ikon. Labelnya ditulis lengkap:
               dulu ini kotak 44 px berisi panah saja - satu-satunya ikon tanpa
               teks di seluruh Portal, padahal prinsip P1 justru menyebut
               pengguna yang bukan pemakai komputer harian. */
            kembali={{ href: '/balita', label: 'Data Balita' }}
            /* Dulu berbunyi "Data Anak, detail. Data contoh." - remah
               breadcrumb dan catatan build, bukan kalimat tentang seorang
               anak. */
            subjudul={`${umur !== null ? `${umurPanjang(umur)}, ` : ''}${
                anak.rt === null
                    ? 'RT belum tercatat'
                    : `RT ${anak.rt.padStart(2, '0')}`
            }. Data contoh.`}
            aksi={
                /* Tombol Ubah data membuka baris balita ini di Data Balita, tempat
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
            {/* Dua kolom dari 1536 px ke atas, bukan 1024: fakta dan angka
                di kiri, kurva di kanan.

                Ambangnya dinaikkan bersama skala tipografi. Pada 1280 px kolom
                kanan hanya selebar 470 px, dan viewBox kurva 1500 satuan
                mengecil 3,2x di sana — seluruh teks di dalam grafik (sumbu,
                angka kg, label SD) turun ke sekitar 6 px, lebih kecil daripada
                9 px yang baru saja dinaikkan. Di bawah 1536 px halaman ini
                menumpuk satu kolom dan menggulir: kurva dapat lebar penuh dan
                terbaca, dengan ongkos halaman yang tidak lagi muat sekali
                tampil. Terbaca mengalahkan muat-sekali-layar. */}
            <div className="flex flex-col gap-4 lebar:min-h-0 lebar:flex-1">
                {/* Grid dua baris, bukan tumpukan. Identitas dan Status pengukuran
                    mengisi baris pertama berdampingan lewat penempatan otomatis,
                    jadi susunan DOM-nya tidak perlu diubah sama sekali; baris
                    kedua membentang dua kolom dan menyerap sisa tinggi. */}
                <div className="flex flex-col gap-3 lebar:grid lebar:min-h-0 lebar:flex-1 lebar:grid-cols-[1.6fr_1fr] lebar:grid-rows-[auto_1fr]">
                    {/* Identitas memimpin halaman, seperti artboard Detail: satu
                petak fakta registri yang dipisahkan garis tebal dari vonis di
                bawahnya. Petak foto artboard tidak ikut — tidak ada satu pun
                anak yang punya potret di arsip, dan kotak kosong bertuliskan
                "Foto anak" pada 101 halaman adalah janji yang tidak ditepati. */}
                    {/* `self-start`: tanpa ini blok ini diregangkan menyamai tinggi kartu
                        Status di sebelahnya, dan baris terakhirnya mengambang di
                        atas ruang kosong. */}
                    <section className="shrink-0 border-b-2 border-border pb-3 lebar:self-start">
                        <h2 className="sr-only">Identitas</h2>
                        {/* Empat kolom tetap, bukan `auto-fit`. Jumlah kolom yang
                                dihitung dari lebar wadah terdengar lebih benar,
                                tetapi wadahnya di sini cuma 1,6fr dari setengah
                                halaman, jadi hasilnya dua atau tiga kolom — dan
                                delapan ruas yang menumpuk jadi tiga baris itulah
                                yang membuat blok ini terlihat menuhin layar.
                                Delapan ruas dibagi empat kolom = dua baris rapi,
                                sama di seluruh lebar di atas ambang `lebar`. */}
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5 lebar:grid-cols-4">
                            <BarisDefinisi tumpuk label="Jenis kelamin">
                                {anak.jk === 'L'
                                    ? 'Laki-laki'
                                    : anak.jk === 'P'
                                      ? 'Perempuan'
                                      : KOSONG}
                            </BarisDefinisi>
                            {/* Umur berdampingan dengan tanggal yang
                                menghasilkannya, bentuk bagian 6.5. Umur adalah
                                kunci seluruh z-score di layar ini; sebelumnya ia
                                hanya ada di subjudul header, jauh dari tanggal
                                lahirnya. */}
                            <BarisDefinisi tumpuk label="Tanggal lahir">
                                {tanggalPanjang(anak.tglLahir)}
                                {umur !== null && `, ${umurPanjang(umur)}`}
                            </BarisDefinisi>
                            <BarisDefinisi tumpuk label="NIK">
                                {nik(anak.nik)}
                                {!anak.nikLengkap && (
                                    <span className="block text-sm text-tone-amber">
                                        NIK belum lengkap
                                    </span>
                                )}
                            </BarisDefinisi>
                            <BarisDefinisi tumpuk label="Ibu">
                                {anak.namaOrtu ?? KOSONG}
                            </BarisDefinisi>
                            {/* Urutan kelahiran dulu ikut menumpang di baris
                                "Alamat", padahal ia bukan alamat: layar berbunyi
                                "Alamat: RT 02, anak ke-3". Dua fakta, dua baris. */}
                            <BarisDefinisi tumpuk label="RT">
                                {anak.rt === null
                                    ? KOSONG
                                    : `RT ${anak.rt.padStart(2, '0')}`}
                            </BarisDefinisi>
                            <BarisDefinisi tumpuk label="Anak ke-">
                                {anak.anakKe ?? KOSONG}
                            </BarisDefinisi>
                            <BarisDefinisi tumpuk label="Berat lahir">
                                {satuan(anak.bbLahirKg, 'kg', 2)}
                                {anak.bbLahirMeragukan && (
                                    <span className="block text-sm text-tone-amber">
                                        Angka di arsip meragukan
                                    </span>
                                )}
                                {/* BBLR hanya ditandai bila angkanya
                                    tepercaya: satu baris di arsip menyimpan
                                    berat lahir yang satuannya diragukan, dan
                                    angka yang diragukan tidak boleh memicu
                                    penanda klinis. Berat lahir kosong juga
                                    bukan BBLR - kosong berarti tidak tercatat,
                                    bukan rendah. */}
                                {anak.bbLahirKg !== null &&
                                    !anak.bbLahirMeragukan &&
                                    anak.bbLahirKg < 2.5 && (
                                        <span className="block text-sm font-semibold text-tone-blue">
                                            BBLR, di bawah 2,5 kg
                                        </span>
                                    )}
                            </BarisDefinisi>
                            {/* Dua fakta yang sudah ada di arsip sejak impor dan
                                tidak pernah sekali pun muncul di layar. */}
                            <BarisDefinisi tumpuk label="Buku KIA">
                                {anak.bukuKia ? (
                                    'Ada'
                                ) : (
                                    <span className="font-semibold text-tone-blue">
                                        Belum ada
                                    </span>
                                )}
                            </BarisDefinisi>
                        </dl>
                    </section>

                    {terbaru === null ? (
                        <p className="kartu bg-surface-subtle px-6 py-6 text-base">
                            Belum ada pengukuran untuk anak ini sampai{' '}
                            {periode.label}, jadi status gizi belum dapat
                            ditampilkan.
                        </p>
                    ) : (
                        <>
                            {/* Pemilih periode di sidebar dulu tidak berpengaruh apa pun
                        di layar ini: 22 dari 123 anak terakhir ditimbang sebelum
                        Juni dan tetap menampilkan status hijau tanpa satu kata
                        pun bahwa angkanya sudah dua bulan. */}
                            {basi && (
                                <p className="flex max-w-[90ch] shrink-0 items-start gap-3 rounded-xl border border-tone-amber bg-tone-amber-bg p-5 text-base text-tone-amber">
                                    <TriangleAlert
                                        className="mt-0.5 size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    <span>
                                        <span className="font-bold">
                                            Belum ditimbang pada {periode.label}
                                            .
                                        </span>{' '}
                                        Angka di bawah berasal dari pengukuran{' '}
                                        {tanggalPanjang(terbaru.tanggalUkur)}.
                                    </span>
                                </p>
                            )}

                            <section>
                                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                                    <h2 className="text-xl font-extrabold">
                                        Status pengukuran{' '}
                                        {tanggalPanjang(terbaru.tanggalUkur)}
                                    </h2>
                                    {/* Vonis naik sebaris dengan judulnya: dulu ia
                                        baris tersendiri di bawah ketiga kartu, satu
                                        baris penuh untuk lima kata. */}
                                    <p className="text-base font-bold">
                                        {perluTindakLanjut
                                            ? 'Perlu tindak lanjut bulan ini.'
                                            : 'Tidak perlu tindak lanjut bulan ini.'}
                                    </p>
                                </div>

                                {/* Tiga kartu indeks berdampingan, susunan artboard.
                            Yang terberat tetap di depan: urutannya dihitung
                            dari nadanya, bukan dari urutan tulis — supaya mata
                            jatuh lebih dulu pada vonis yang menentukan. */}
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                            </section>

                            {/* Kurva berdiri sebelum tabel riwayat, mengikuti urutan
                                bagian 6.5 — dan membuat kalimat "kurva di atas" pada
                                kepala tabel itu benar. Lebarnya penuh: di kolom
                                setengah halaman gambarnya hanya 614 x 221 px dan teks
                                labelnya 8,6 px, di bawah batas 15 px yang
                                docs/05-uiux-spec.md bagian 8 sebut tidak diturunkan. */}
                            {/* Baris bawah menyerap sisa tinggi layar: kurva di kiri,
                                riwayat di kanan yang menggulir sendiri. Pembagian 1,6:1
                                dipilih dari batas keterbacaan, bukan dari selera —
                                kolom kurva harus tetap di atas ~780 px supaya teks di
                                dalamnya bertahan di atas 15 px. */}
                            <div className="grid gap-4 lebar:col-span-2 lebar:min-h-0 lebar:grid-cols-[1.6fr_1fr]">
                                <section className="flex min-w-0 flex-col lebar:min-h-0">
                                    {/* Dulu bagian ini tidak punya judul sama sekali: yang
                                        terlihat hanya slogan Buku KIA, sehingga navigasi
                                        judul pembaca layar melewati 35% halaman. */}
                                    <h2 className="text-xl font-extrabold">
                                        Kurva berat badan menurut umur
                                    </h2>

                                    {riwayatKurva.length === 0 ? (
                                        <p className="mt-2 text-base text-muted-foreground">
                                            Belum ada pengukuran berat yang
                                            dapat digambarkan.
                                        </p>
                                    ) : riwayatKurva.length < 2 ? (
                                        <p className="mt-2 text-base text-muted-foreground">
                                            Baru satu kali pengukuran — kurva
                                            muncul setelah pengukuran
                                            berikutnya.
                                        </p>
                                    ) : (
                                        anak.jk !== null && (
                                            <KmsChart
                                                kompak
                                                penuh
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
                                                            p.umurBulan !==
                                                                null &&
                                                            p.bbKg !== null,
                                                    )
                                                    .map((p) => ({
                                                        umurBulan: p.umurBulan,
                                                        beratKg: p.bbKg,
                                                        tanggal: p.tanggalUkur,
                                                        z:
                                                            p.penilaian.BB_U
                                                                ?.z ?? null,
                                                        kategori:
                                                            p.penilaian.BB_U
                                                                ?.kategori ??
                                                            null,
                                                    }))}
                                            />
                                        )
                                    )}
                                </section>
                                <section className="flex min-w-0 flex-col lebar:min-h-0">
                                    <div className="kartu flex flex-col overflow-hidden lebar:min-h-0 lebar:flex-1">
                                        {/* Judul menyatu dengan kartunya di strip kepala,
                                    seperti artboard. */}
                                        <div className="strip-kepala shrink-0">
                                            <h2 className="text-xl font-extrabold">
                                                Riwayat pengukuran
                                            </h2>
                                            {/* Mengklik baris menyorot titiknya di kurva.
                                        Dulu tidak ada satu pun tanda bahwa itu
                                        mungkin, dan <tr onClick> tidak bisa
                                        dijangkau papan tombol sama sekali. */}
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                Pilih tanggal untuk menyorot
                                                titiknya pada kurva di atas.
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground md:hidden">
                                                Tabel ini lebih lebar daripada
                                                layar. Geser ke samping untuk
                                                melihat kolom status gizi.
                                            </p>
                                        </div>

                                        <Table containerClassName="lebar:min-h-0 lebar:flex-1">
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
                                                    <TableHead scope="col">
                                                        Berat
                                                    </TableHead>
                                                    <TableHead scope="col">
                                                        Panjang atau Tinggi
                                                    </TableHead>
                                                    <TableHead scope="col">
                                                        {labelIndeks(
                                                            'BB_TB',
                                                            umur,
                                                        )}
                                                    </TableHead>
                                                    <TableHead scope="col">
                                                        {labelIndeks(
                                                            'TB_U',
                                                            umur,
                                                        )}
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
                                                        p.statusKehadiran ===
                                                        'hadir'
                                                            ? null
                                                            : (ARTI_KEHADIRAN[
                                                                  p
                                                                      .statusKehadiran
                                                              ] ?? null);
                                                    const peringatan =
                                                        janggal(urutan);

                                                    return (
                                                        <TableRow
                                                            key={p.periodeId}
                                                            aria-current={
                                                                p.umurBulan ===
                                                                umurDisorot
                                                                    ? 'true'
                                                                    : undefined
                                                            }
                                                            className={
                                                                p.umurBulan ===
                                                                umurDisorot
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
                                                                {sebab !==
                                                                    null && (
                                                                    <span className="block px-3 pb-1 text-sm text-muted-foreground">
                                                                        {sebab}
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="hidden whitespace-nowrap lg:table-cell">
                                                                {umurRingkas(
                                                                    p.umurBulan,
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="whitespace-nowrap">
                                                                {satuan(
                                                                    p.bbKg,
                                                                    'kg',
                                                                    2,
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {satuan(
                                                                    p.tinggiCm,
                                                                    'cm',
                                                                )}
                                                                {/* Keterangan cara ukur
                                                            hanya bila ada angkanya:
                                                            dulu ia tetap dicetak di
                                                            bawah pengukuran yang
                                                            tidak pernah terjadi. */}
                                                                {p.tinggiCm !==
                                                                    null && (
                                                                    <span className="block text-sm text-muted-foreground">
                                                                        {p.umurBulan !==
                                                                            null &&
                                                                        p.umurBulan <
                                                                            24
                                                                            ? 'panjang badan'
                                                                            : 'tinggi badan'}
                                                                    </span>
                                                                )}
                                                                {peringatan !==
                                                                    null && (
                                                                    <span className="mt-1 flex items-start gap-1.5 text-sm text-tone-amber">
                                                                        <TriangleAlert
                                                                            className="mt-0.5 size-4 shrink-0"
                                                                            strokeWidth={
                                                                                2.5
                                                                            }
                                                                            aria-hidden="true"
                                                                        />
                                                                        {
                                                                            peringatan
                                                                        }
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <ZScoreCell
                                                                    nilai={
                                                                        p
                                                                            .penilaian
                                                                            .BB_TB
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <ZScoreCell
                                                                    nilai={
                                                                        p
                                                                            .penilaian
                                                                            .TB_U
                                                                    }
                                                                />
                                                            </TableCell>
                                                            <TableCell className="hidden md:table-cell">
                                                                {p.ntob === null
                                                                    ? KOSONG
                                                                    : (ARTI_NTOB[
                                                                          p.ntob.toUpperCase()
                                                                      ] ??
                                                                      p.ntob)}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </section>
                            </div>
                        </>
                    )}

                    {/* Tombol yang hanya memunculkan window.alert("Belum
                tersedia di demo") dibuang. Kontrol yang menjanjikan sesuatu
                lalu menolaknya lebih buruk daripada kontrol yang tidak ada;
                kalimat di atas sudah menyebut keadaannya. */}
                </div>
            </div>
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
        <div className="kartu p-3.5">
            <p className="text-sm font-bold text-muted-foreground">{label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <span
                    className={`text-2xl leading-none font-extrabold ${warna}`}
                >
                    {nilai === undefined ? KOSONG : zScore(nilai.z)}
                </span>
                <span className="text-sm text-muted-foreground">SD</span>
            </p>
            <p className={`mt-1.5 text-sm font-bold text-pretty ${warna}`}>
                {nilai?.kategori ?? 'Belum dapat dinilai'}
            </p>
        </div>
    );
}
