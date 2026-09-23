/**
 * Kurva pertumbuhan KMS — docs/rujukan/layar-demo.md bagian 6.5.
 *
 * SVG langsung, tanpa pustaka grafik: yang dibutuhkan hanya beberapa `path`
 * garis SD dan sederet titik, sedangkan membuat pustaka chart menggambar
 * overlay SD menuntut kustomisasi yang lebih panjang daripada SVG-nya sendiri
 * (docs/rujukan/ui-ux.md bagian 4.3).
 *
 * **Indeksnya hanya satu: berat badan menurut umur.** KMS pada Buku KIA memang
 * kartu berat-menurut-umur, dan menyamakannya membuat grafik di layar dapat
 * dibandingkan langsung dengan buku yang dipegang ibu.
 *
 * Warna pita **dikecualikan dari palet aplikasi**. Ini satu-satunya tempat
 * warna di luar token bagian 8 dibolehkan, karena tujuannya justru menyamai
 * buku cetak, bukan menyamai aplikasi.
 */

import { useState } from 'react';
import { satuan, tanggalRingkas, zScore } from '@/lib/format';
import type { GarisSd, JenisKelamin } from '@/types/posyandu';

/* Ukuran teks di dalam SVG memakai satuan viewBox, bukan piksel: pada lebar
   tayang 992 px terhadap viewBox 1500, tiap satuan menyusut 1,5x. Nilai lama
   16-17 satuan jatuh ke 10,6 px di layar — di bawah badan teks halamannya
   sendiri, pada grafik yang justru harus dibaca kader. 23-24 satuan mendarat
   di sekitar 15 px. */
/**
 * Geometri kartu, dua ragam.
 *
 * Seluruh angka di dalam SVG memakai satuan viewBox, dan ukuran tayangnya
 * `px = satuan x lebarTayang / g.LEBAR`. Karena itu ragam kompak bukan sekadar
 * "teks lebih besar": pinggirannya ikut melebar untuk menampung teks yang lebih
 * besar itu, dan kartunya dibuat lebih jangkung supaya garis kilogram tidak
 * berdempetan. Menaikkan ukuran teks tanpa menaikkan pinggirannya persis yang
 * membuat angka kg saling menimpa dan judul sumbu terpotong.
 */
/**
 * Ukuran teks ragam kompak, dan seluruh pinggiran diturunkan darinya.
 *
 * Diturunkan, bukan ditulis satu-satu: tiga kali berturut-turut angka ini
 * dinaikkan tanpa pinggirannya ikut ditinjau, dan tiga kali pula teksnya
 * bertabrakan — angka kg saling menimpa, judul sumbu menimpa angka, angka
 * bulan menimpa judulnya. Sekarang semuanya bergerak bersama.
 *
 * 48 dihitung dari kasus tersempit yang terukur. Pada jendela 1088-1180 x 645
 * SVG-nya dibatasi tinggi, bukan lebar: kotaknya berhenti di ~203 px, jadi
 * skalanya 203/620 dan bukan lebar/1500. Lantai 15 px pada docs/rujukan/ui-ux.md
 * §8 menuntut 15 x 620 / 203 = 45,8 -- tetapi angka 46 mendarat di 14,9 px
 * karena tinggi sebenarnya 201 px. 48 memberi 15,6 px dengan sisa aman.
 */
const KOMPAK_TIK = 48;

const GEOMETRI = {
    /** Kurva selebar halaman. */
    lebar: {
        LEBAR: 1500,
        TINGGI: 540,
        KIRI: 64,
        KANAN: 64,
        ATAS: 12,
        BAWAH: 96,
        tik: 23,
        judulSumbu: 24,
        tikBawah: 26,
        labelTitik: true,
    },
    /** Kurva di kolom sempit. Pinggirannya ikut ukuran teks, lihat di atas. */
    kompak: {
        LEBAR: 1500,
        TINGGI: 620,
        /* Menampung angka kg dua digit dan judul sumbu tegak berdampingan. */
        KIRI: Math.round(KOMPAK_TIK * 3.3),
        KANAN: Math.round(KOMPAK_TIK * 1.7),
        ATAS: 16,
        /* Garis sumbu, angka bulan, lalu judul "Umur, bulan" — tiga hal
           berurutan, masing-masing setinggi ~1,28 kali ukuran teksnya. */
        BAWAH: Math.round(KOMPAK_TIK * 3.3),
        tik: KOMPAK_TIK,
        judulSumbu: KOMPAK_TIK,
        /* Cukup jauh supaya angka bulan lepas dari angka kg di pojok, dan
           masih menyisakan ruang untuk judul sumbu di bawahnya. */
        tikBawah: Math.round(KOMPAK_TIK * 1.45),
        labelTitik: false,
    },
};

/* Label z-score di atas tiap titik, dan jarak angkatnya.
   Diikat menjadi satu kelompok dengan sengaja: ukuran teksnya pernah dinaikkan
   15 -> 21 satuan tanpa jarak angkatnya ikut ditinjau, dan labelnya jadi
   menempel ke penanda titik. Yang di bawah ini bergerak bersama. */
const LABEL_UKURAN = 21;
const TITIK_JARI = 7;
const TITIK_GARIS = 3.5;
/* Dari pusat titik ke garis alas teks: jari-jari penanda, tebal garisnya, lalu
   sisa ruang supaya halo putih teks tidak menyentuh penandanya. */
const LABEL_ANGKAT = TITIK_JARI + TITIK_GARIS / 2 + 7;

/** Satu panel memuat jendela 12 bulan, sama seperti lembar KMS Buku KIA. */
const PANEL_BULAN = 12;
const PANEL_AWAL = [0, 12, 24, 36, 48];

/** Warna Buku KIA, sengaja di luar palet aplikasi. */
const PITA_KUNING = '#F2C300';
const PITA_HIJAU_MUDA = '#6FB63C';
const PITA_HIJAU_TUA = '#1E8C34';
const GARIS_MERAH = '#D92B0C';
const TINTA = '#16211C';
const TEKS_SEKUNDER = '#4A5750';

const EPSILON_L = 1e-7;

/** M × (1 + L×S×z)^(1/L) — rumus yang sama dengan ZScore::nilaiPadaZ. */
function nilaiPadaZ(baris: GarisSd, z: number): number {
    if (Math.abs(baris.l) < EPSILON_L) {
        return baris.m * Math.exp(baris.s * z);
    }

    return baris.m * (1 + baris.l * baris.s * z) ** (1 / baris.l);
}

export type TitikDetail = {
    umurBulan: number;
    beratKg: number;
    tanggal: string | null;
    z: number | null;
    kategori: string | null;
};

/**
 * Kunci pencarian detail titik: umur dan berat sekaligus.
 *
 * Empat belas anak pada arsip punya dua penimbangan yang jatuh pada umur bulan
 * penuh yang sama, karena tanggal ukurnya bergeser terhadap tanggal lahir.
 * Satu anak bahkan punya dua penimbangan beruntun dengan berat yang persis
 * sama, sehingga kedua titiknya benar-benar berimpit di kartu. Karena itu kunci
 * React memakai urutan, bukan nilai — lihat pemakaiannya di bawah.
 */
const kunciTitik = (umur: number, kg: number) => `${umur}|${kg}`;

type Props = {
    kelamin: JenisKelamin;
    panelAwal: number;
    skalaMax: number;
    /** Pasangan [umurBulan, beratKg]. */
    riwayat: [number, number][];
    /**
     * Parameter LMS BB/U. Tidak ada di kontrak artboard, tetapi pita SD tidak
     * dapat digambar tanpanya — lihat D-06 di docs/riwayat/catatan-tahap-demo.md.
     */
    garisSd: GarisSd[];
    /** Isi tooltip titik. Opsional supaya kontrak empat props tetap berlaku. */
    detail?: TitikDetail[];
    /** Titik yang sedang disorot dari tabel riwayat. */
    umurDisorot?: number | null;
    onGantiPanel?: (awal: number) => void;
    /**
     * Kurva berdiri di kolom sempit, bukan selebar halaman.
     *
     * Ukuran teks di dalam SVG berbanding lurus dengan lebar tayangnya:
     * `px = satuan x lebarTayang / 1500`. Pada kolom ~790 px, satuan 23-24
     * mendarat di 12 px — di bawah batas 15 px yang docs/rujukan/ui-ux.md
     * bagian 8 sebut tidak diturunkan. Mode ini menaikkan satuannya supaya
     * hasil akhirnya tetap di atas batas itu.
     *
     * Konsekuensinya label z-score per titik ditiadakan: pada satuan sebesar
     * itu lebarnya 132 satuan sementara jarak antar bulan hanya 114, jadi
     * pasti bertabrakan. Angkanya tetap ada di tooltip titik dan di tabel
     * Riwayat, yang pada tata letak ini berdiri tepat di sebelahnya.
     */
    kompak?: boolean;
    /**
     * Kurva mengisi tinggi wadahnya, bukan lebarnya.
     *
     * Dipakai layar Detail yang dibatasi tinggi jendela. Bawaannya `w-full`
     * dengan tinggi mengikuti rasio — bagus untuk satu kolom penuh, tapi di
     * kolom setengah lebar ia tetap selebar `min-w` dan tingginya ikut memaksa
     * halaman menggulir. Dengan `penuh`, tingginya yang dipatok dan lebarnya
     * yang mengikuti; kelebihan lebar digeser mendatar di dalam wadahnya
     * sendiri, seperti sebelumnya.
     */
    penuh?: boolean;
};

export default function KmsChart({
    kelamin,
    panelAwal,
    skalaMax,
    riwayat,
    garisSd,
    detail = [],
    umurDisorot = null,
    onGantiPanel,
    penuh = false,
    kompak = false,
}: Props) {
    const g = kompak ? GEOMETRI.kompak : GEOMETRI.lebar;
    const plotLebar = g.LEBAR - g.KIRI - g.KANAN;
    const plotTinggi = g.TINGGI - g.ATAS - g.BAWAH;
    const [panel, setPanel] = useState(panelAwal);
    const gantiPanel = (awal: number) => {
        setPanel(awal);
        onGantiPanel?.(awal);
    };

    const umurTerakhir = riwayat.reduce((maks, [u]) => Math.max(maks, u), 0);
    // Hanya panel sampai umur pengukuran terakhir yang ditampilkan.
    const panelTampil = PANEL_AWAL.filter((awal) => awal <= umurTerakhir);

    const lms = new Map(
        garisSd.filter((g) => g.jk === kelamin).map((g) => [g.umurBulan, g]),
    );

    const bulanPanel = Array.from(
        { length: PANEL_BULAN + 1 },
        (_, i) => panel + i,
    );

    // `skalaMax` diperlakukan sebagai batas bawah, bukan batas mati. Pada panel
    // 48-60 bulan garis +3 SD sudah melewati 25 kg, sehingga skala tetap 18 kg
    // akan membuang pita atas ke luar kartu dan menimpa judul sumbu. Kartu KMS
    // cetak pun memakai rentang berat berbeda untuk tiap lembar umur.
    const sdTertinggi = bulanPanel.reduce((maks, bulan) => {
        const baris = lms.get(bulan);

        return baris === undefined
            ? maks
            : Math.max(maks, nilaiPadaZ(baris, 3));
    }, 0);
    const skala = Math.max(skalaMax, Math.ceil(sdTertinggi));

    const x = (umur: number) =>
        g.KIRI + ((umur - panel) / PANEL_BULAN) * plotLebar;
    const y = (kg: number) =>
        g.ATAS + (1 - (kg - 1) / (skala - 1)) * plotTinggi;

    const kgPanel = Array.from({ length: skala }, (_, i) => i + 1);
    /* Garis bantu tetap tiap 1 kg, tetapi angkanya diencerkan bila jaraknya
       lebih rapat daripada tinggi hurufnya sendiri. Pada ragam kompak jarak
       antar garis kg ~30 satuan sementara hurufnya 40 — tanpa ini angkanya
       saling menimpa, persis yang terjadi sebelum perbaikan ini. */
    const jarakKg = plotTinggi / Math.max(1, skala - 1);
    /* Yang harus muat adalah **kotak** teksnya, bukan ukuran fontnya. Kotak
       satu baris kira-kira 1,3 kali ukuran font; memakai ukuran font apa adanya
       membuat langkahnya kurang satu, dan angka kg tetap bersinggungan. */
    const tinggiBarisTeks = g.tik * 1.3;
    const langkahLabelKg = Math.max(1, Math.ceil(tinggiBarisTeks / jarakKg));
    /* Angka teratas ikut diberi label hanya bila jaraknya dari angka berlabel
       sebelumnya memang cukup. Tanpa syarat itu, skala 18 kg berlangkah 2
       menghasilkan "17" dan "18" berdempetan di ujung atas. */
    const labelKg = kgPanel.filter((kg) => (kg - 1) % langkahLabelKg === 0);
    const kgTerakhir = labelKg[labelKg.length - 1];

    if (kgTerakhir !== skala && skala - kgTerakhir >= langkahLabelKg) {
        labelKg.push(skala);
    }

    /** Titik sepanjang satu garis SD di dalam panel aktif. */
    const titikSd = (z: number) =>
        bulanPanel
            .map((bulan) => {
                const baris = lms.get(bulan);

                return baris === undefined
                    ? null
                    : ([x(bulan), y(nilaiPadaZ(baris, z))] as [number, number]);
            })
            .filter((t): t is [number, number] => t !== null);

    const garisKe = (titik: [number, number][]) =>
        titik.map(([px, py]) => `${px},${py}`).join(' ');

    /** Pita antara dua garis SD, digambar sebagai satu bidang tertutup. */
    const pita = (bawah: number, atas: number, warna: string) => {
        const a = titikSd(atas);
        const b = titikSd(bawah);

        if (a.length === 0 || b.length === 0) {
            return null;
        }

        return (
            <polygon
                key={`${bawah}-${atas}`}
                points={garisKe([...a, ...b.slice().reverse()])}
                fill={warna}
                opacity={0.55}
            />
        );
    };

    // Kurva dipecah setiap kali selisih umur antar pengukuran lebih dari satu
    // bulan: garis lurus melintasi bulan tanpa penimbangan akan mengarang data.
    const dalamPanel = riwayat
        .filter(([u]) => u >= panel && u <= panel + PANEL_BULAN)
        .sort((a, b) => a[0] - b[0]);
    const segmen: [number, number][][] = [];

    for (const titik of dalamPanel) {
        const terakhir = segmen[segmen.length - 1];
        const sebelum = terakhir?.[terakhir.length - 1];

        if (
            terakhir === undefined ||
            sebelum === undefined ||
            titik[0] - sebelum[0] > 1
        ) {
            segmen.push([titik]);
        } else {
            terakhir.push(titik);
        }
    }

    const petaDetail = new Map(
        detail.map((d) => [kunciTitik(d.umurBulan, d.beratKg), d]),
    );
    const acuan = kelamin === 'P' ? 'perempuan' : 'laki-laki';

    /* `flex-1 min-h-0`, bukan `h-full`: di dalam kolom lentur `h-full` mengacu
       pada tinggi yang belum pasti, sehingga `max-h-full` pada SVG di bawahnya
       tidak punya patokan dan kartunya tetap meluber. */
    return (
        <div className={penuh ? 'flex min-h-0 flex-1 flex-col' : ''}>
            {/* Dua baris slogan Buku KIA - "Timbanglah Anak Anda Setiap
                Bulan" dan "Anak Sehat, Tambah Umur, Tambah Berat, Tambah
                Pandai" - dicabut dari sini. Keduanya menyapa orang tua, bukan
                petugas, dan satu-satunya Title Case di seluruh Portal, tepat di
                bawah judul aslinya. Slogan itu memang ada di KMS fisik; di sana
                pembacanya orang tua. */}
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex flex-wrap gap-2">
                    {panelTampil.map((awal) => (
                        <button
                            key={awal}
                            type="button"
                            onClick={() => gantiPanel(awal)}
                            aria-pressed={panel === awal}
                            className={`min-h-13 rounded-lg px-3.5 text-sm font-semibold ${
                                panel === awal
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border border-muted-foreground text-foreground'
                            }`}
                        >
                            {awal}-{awal + PANEL_BULAN} bulan
                        </button>
                    ))}
                </div>

                <p className="text-sm font-semibold text-muted-foreground">
                    Acuan {acuan}, WHO 2006
                </p>
            </div>

            {/* Grafik menggulir di dalam wadahnya sendiri; badan halaman tidak
                pernah menggulir mendatar (docs/rujukan/ui-ux.md bagian 7).
                `tabIndex` membuat wadah yang menggulir bisa digeser dengan
                panah papan tombol, bukan hanya dengan jari. */}
            <div
                className={`gulir-dalam mt-3 overflow-auto ${
                    penuh ? 'lg:min-h-0 lg:flex-1' : ''
                }`}
                tabIndex={0}
                role="region"
                aria-label="Kurva pertumbuhan, dapat digeser mendatar"
            >
                <svg
                    viewBox={`0 0 ${g.LEBAR} ${g.TINGGI}`}
                    className={
                        // Lebar yang menentukan, di semua ukuran. Dulu pada `lg`
                        // ia `h-full w-auto`: lebarnya mengikuti rasio 3:1
                        // viewBox terhadap tinggi kartu, sehingga kolom 918 px
                        // diminta memuat gambar 2.457 px - label sumbu
                        // "Umur, bulan" terpotong jadi "U" di tepi kanan, dengan
                        // bilah gulir mendatar di bawahnya. Di bawah `lg` gulir
                        // mendatar itu memang disengaja (lihat aria-label
                        // pembungkusnya), jadi hanya `min-w` yang dilepas.
                        // `max-h-full` menutup tegangan pokok kartu ini: tinggi
                        // gambar sebanding dengan lebarnya, sedangkan tinggi
                        // jendela tidak ikut tumbuh secepat itu. Pada 1366x660
                        // kurvanya jadi 21 px lebih tinggi daripada di
                        // 1280x645 padahal ruang tegaknya hanya bertambah 15 px,
                        // dan halamannya menggulir lagi. Dengan batas ini
                        // gambarnya mengecil dan memusat sendiri, tidak pernah
                        // meluber.
                        penuh
                            ? 'h-auto max-h-full w-full min-w-[820px] lg:min-w-0'
                            : 'h-auto w-full min-w-[820px]'
                    }
                    role="img"
                    aria-label={`Kurva berat badan menurut umur, acuan ${acuan} WHO 2006, panel ${panel} sampai ${panel + PANEL_BULAN} bulan`}
                >
                    <defs>
                        <clipPath id="kms-bidang">
                            <rect
                                x={g.KIRI}
                                y={g.ATAS}
                                width={plotLebar}
                                height={plotTinggi}
                            />
                        </clipPath>
                    </defs>

                    <g clipPath="url(#kms-bidang)">
                        {pita(-3, -2, PITA_KUNING)}
                        {pita(2, 3, PITA_KUNING)}
                        {pita(-2, -1, PITA_HIJAU_MUDA)}
                        {pita(1, 2, PITA_HIJAU_MUDA)}
                        {pita(-1, 1, PITA_HIJAU_TUA)}

                        {/* Garis bantu minggu: tiga per bulan. */}
                        {bulanPanel
                            .slice(0, -1)
                            .flatMap((bulan) =>
                                [0.25, 0.5, 0.75].map((pecahan) => (
                                    <line
                                        key={`m${bulan}-${pecahan}`}
                                        x1={x(bulan + pecahan)}
                                        x2={x(bulan + pecahan)}
                                        y1={g.ATAS}
                                        y2={g.ATAS + plotTinggi}
                                        stroke={TINTA}
                                        strokeWidth={0.6}
                                        opacity={0.35}
                                    />
                                )),
                            )}

                        {kgPanel.map((kg) => (
                            <line
                                key={`kg${kg}`}
                                x1={g.KIRI}
                                x2={g.KIRI + plotLebar}
                                y1={y(kg)}
                                y2={y(kg)}
                                stroke={TINTA}
                                strokeWidth={0.6}
                                opacity={0.3}
                            />
                        ))}

                        {bulanPanel.map((bulan) => (
                            <line
                                key={`b${bulan}`}
                                x1={x(bulan)}
                                x2={x(bulan)}
                                y1={g.ATAS}
                                y2={g.ATAS + plotTinggi}
                                stroke={TINTA}
                                strokeWidth={1.6}
                            />
                        ))}

                        {[-3, -2, -1, 0, 1, 2, 3].map((z) => (
                            <polyline
                                key={`sd${z}`}
                                points={garisKe(titikSd(z))}
                                fill="none"
                                stroke={z === -3 ? GARIS_MERAH : TINTA}
                                strokeWidth={
                                    z === -3 ? 2.4 : z === 0 ? 1.6 : 1.2
                                }
                            />
                        ))}
                    </g>

                    {/* Label kg di kiri dan kanan sekaligus, supaya mata tidak
                        perlu menyeberangi seluruh lebar kartu. */}
                    {labelKg.map((kg) => (
                        <g key={`lkg${kg}`}>
                            <text
                                x={g.KIRI - 10}
                                y={y(kg) + 5}
                                textAnchor="end"
                                fontSize={g.tik}
                                fontWeight={600}
                                fill={TEKS_SEKUNDER}
                            >
                                {kg}
                            </text>
                            <text
                                x={g.KIRI + plotLebar + 10}
                                y={y(kg) + 5}
                                fontSize={g.tik}
                                fontWeight={600}
                                fill={TEKS_SEKUNDER}
                            >
                                {kg}
                            </text>
                        </g>
                    ))}

                    {bulanPanel.map((bulan) => (
                        <text
                            key={`lb${bulan}`}
                            x={x(bulan)}
                            y={g.ATAS + plotTinggi + g.tikBawah}
                            textAnchor="middle"
                            fontSize={g.judulSumbu}
                            fontWeight={600}
                            fill={TEKS_SEKUNDER}
                        >
                            {bulan}
                        </text>
                    ))}

                    <text
                        x={g.KIRI + plotLebar / 2}
                        y={g.TINGGI - 18}
                        textAnchor="middle"
                        fontSize={g.judulSumbu}
                        fontWeight={700}
                        fill={TINTA}
                    >
                        Umur, bulan
                    </text>
                    <text
                        x={-(g.ATAS + plotTinggi / 2)}
                        y={22}
                        transform="rotate(-90)"
                        textAnchor="middle"
                        fontSize={g.judulSumbu}
                        fontWeight={700}
                        fill={TINTA}
                    >
                        Berat badan, kg
                    </text>

                    <g clipPath="url(#kms-bidang)">
                        {segmen.map((bagian, i) => (
                            <g key={`seg${i}`}>
                                {/* Halo putih supaya kurva tetap terbaca di atas
                                pita berwarna. */}
                                <polyline
                                    points={garisKe(
                                        bagian.map(([u, kg]) => [x(u), y(kg)]),
                                    )}
                                    fill="none"
                                    stroke="#FFFFFF"
                                    strokeWidth={8}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <polyline
                                    points={garisKe(
                                        bagian.map(([u, kg]) => [x(u), y(kg)]),
                                    )}
                                    fill="none"
                                    stroke={TINTA}
                                    strokeWidth={3.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </g>
                        ))}

                        {dalamPanel.map(([umur, kg], urutan) => {
                            const d = petaDetail.get(kunciTitik(umur, kg));
                            /* Jarak angkat tetap, tidak lagi berselang-seling
                               menurut ganjil-genap urutan.
                               Selang-seling itu dipasang untuk menghindari
                               tabrakan yang ternyata tidak pernah ada: label
                               selebar 92 satuan berdiri pada jarak bulan 114
                               satuan, jadi masih sisa 22. Yang dihasilkannya
                               justru salah baca — pada anak ini +1,31 dan +1,30
                               hampir sama nilainya tetapi labelnya terpaut 26
                               satuan, sehingga tinggi label membaca parity
                               indeks, bukan angkanya. Di kartu pertumbuhan itu
                               bukan sekadar tidak rapi. */
                            const labelY = Math.max(
                                g.ATAS + LABEL_UKURAN,
                                y(kg) - LABEL_ANGKAT,
                            );
                            const nilaiTitik =
                                d?.z === null || d?.z === undefined
                                    ? null
                                    : `${zScore(d.z)} SD`;
                            const labelTampil = g.labelTitik
                                ? nilaiTitik
                                : null;

                            return (
                                <g key={`${kunciTitik(umur, kg)}|${urutan}`}>
                                    {labelTampil !== null && (
                                        <text
                                            x={x(umur)}
                                            y={labelY}
                                            textAnchor="middle"
                                            fontSize={LABEL_UKURAN}
                                            fontWeight={700}
                                            fill={TINTA}
                                            stroke="#FFFFFF"
                                            strokeWidth={4}
                                            paintOrder="stroke"
                                        >
                                            {labelTampil}
                                        </text>
                                    )}
                                    <circle
                                        cx={x(umur)}
                                        cy={y(kg)}
                                        r={
                                            umur === umurDisorot
                                                ? TITIK_JARI + 3
                                                : TITIK_JARI
                                        }
                                        fill="#FFFFFF"
                                        stroke={TINTA}
                                        strokeWidth={TITIK_GARIS}
                                    >
                                        {/* <title> memberi tooltip asli
                                            peramban tanpa JS, dan ikut terbaca
                                            pembaca layar. */}
                                        <title>
                                            {[
                                                tanggalRingkas(
                                                    d?.tanggal ?? null,
                                                ),
                                                satuan(kg, 'kg', 2),
                                                nilaiTitik,
                                                `${umur} bulan`,
                                                d?.kategori ?? null,
                                            ]
                                                .filter((b) => b !== null)
                                                .join(' · ')}
                                        </title>
                                    </circle>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                <Legenda warna={PITA_HIJAU_TUA} teks="−1 sampai +1 SD" />
                <Legenda
                    warna={PITA_HIJAU_MUDA}
                    teks="−2 sampai −1 dan +1 sampai +2 SD"
                />
                <Legenda
                    warna={PITA_KUNING}
                    teks="−3 sampai −2 dan +2 sampai +3 SD"
                />
                <Legenda warna={GARIS_MERAH} teks="Garis merah, −3 SD" />
            </ul>
        </div>
    );
}

function Legenda({ warna, teks }: { warna: string; teks: string }) {
    return (
        <li className="flex items-center gap-2">
            <span
                aria-hidden="true"
                className="inline-block size-4 rounded-xs"
                style={{ backgroundColor: warna }}
            />
            {teks}
        </li>
    );
}
