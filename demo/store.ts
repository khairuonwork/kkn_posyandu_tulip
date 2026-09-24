/**
 * Sumber data demo dan selektor di atasnya.
 *
 * Seluruh isinya berasal dari demo/data/posyandu.json yang dihasilkan
 * demo/data/extract-demo-data.py. Tidak ada yang tersimpan: muat ulang
 * mengembalikan semuanya seperti semula.
 *
 * Berkas ini perancah demo. Saat backend siap, controller yang memasok props
 * yang sama dan berkas ini dibuang (docs/10-prd-demo-frontend.md bagian 10).
 */

import {
    nadaKategori,
    PERLU_TINDAK_LANJUT,
} from '@/components/status-gizi-badge';
import { labelIndeks, zScore } from '@/lib/format';
import type { BarisLms } from '@/lib/z-score';
import type { BarisAnak } from '@/pages/anak/index';
import type {
    Anak,
    GarisSd,
    Indeks,
    Pengukuran,
    Periode,
} from '@/types/posyandu';
import lms from '../database/data/who-lms.json';
import mentah from './data/posyandu.json';

export type MetaPosyandu = {
    versiStandar: string;
    barisStandar: number;
    posyandu: string;
    rw: string;
    kelurahan: string;
    catatan: string;
};

export type DataPosyandu = {
    meta: MetaPosyandu;
    periode: Periode[];
    anak: Anak[];
    pengukuran: Pengukuran[];
    garisSdBbU: GarisSd[];
};

// JSON diimpor sebagai literal, jadi tipenya dilebarkan sekali di sini menjadi
// tipe domain. Tanpa ini setiap pemakaian menanggung tipe literal 585 KB.
export const data = mentah as unknown as DataPosyandu;

/** Periode aktif bawaan: yang terbaru, yaitu Juni 2026. */
export const periodeTerbaru = data.periode[data.periode.length - 1].id;

/**
 * RT binaan kader pada demo.
 *
 * RT 1 dipilih karena memuat hampir 40% sasaran, sehingga jumlah hasil berubah
 * dari 101 menjadi 39 di depan client saat peran diganti (bagian 9 langkah 7).
 */
export const RT_KADER = '1';

export function cariPeriode(id: string): Periode | null {
    return data.periode.find((p) => p.id === id) ?? null;
}

export function cariAnak(id: number): Anak | null {
    return data.anak.find((a) => a.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Selektor Beranda — docs/10-prd-demo-frontend.md bagian 6.3
// ---------------------------------------------------------------------------

export type Ringkasan = {
    /** S — seluruh balita terdaftar pada periode itu. */
    sasaran: number;
    /** D — yang benar-benar ditimbang; ketidakhadiran bukan berat nol. */
    ditimbang: number;
    /** N — dibaca apa adanya dari kolom NTOB arsip, tanpa logika turunan (OI-01). */
    naik: number;
    tanggalUkur: string | null;
};

export type StatusGizi = {
    giziBaik: number;
    giziKurang: number;
    giziBuruk: number;
    giziLebih: number;
    belumDinilai: number;
    /** Berapa anak yang belum punya angka bulan ini, yaitu S dikurangi D. */
    belumDiukur: number;
    ditimbang: number;
};

export type CakupanPeriode = {
    periodeId: string;
    label: string;
    sasaran: number;
    ditimbang: number;
};

export type BarisPerhatian = {
    anakId: number;
    nama: string | null;
    umurBulan: number | null;
    rt: string | null;
    kategori: string;
    /** Wajib ada: angka tanpa sebab tidak bisa ditindaklanjuti (bagian 6.3). */
    alasan: string;
};

export function pengukuranPeriode(periodeId: string): Pengukuran[] {
    return data.pengukuran.filter((p) => p.periodeId === periodeId);
}

function ditimbang(baris: Pengukuran[]): number {
    return baris.filter((p) => p.statusKehadiran === 'hadir').length;
}

export function ringkasan(periodeId: string): Ringkasan {
    const baris = pengukuranPeriode(periodeId);

    return {
        // Satu anak pada arsip Juni sudah berumur 60 bulan dan tetap terdaftar
        // sebagai sasaran. S mengikuti arsip, sehingga angkanya tetap 101
        // seperti bagian 5.5 — lihat catatan T3 di docs/11-catatan-tahap-demo.md.
        sasaran: baris.length,
        ditimbang: ditimbang(baris),
        naik: baris.filter((p) => (p.ntob ?? '').toUpperCase() === 'N').length,
        tanggalUkur: cariPeriode(periodeId)?.tanggalKegiatan ?? null,
    };
}

export function statusGizi(periodeId: string): StatusGizi {
    const baris = pengukuranPeriode(periodeId);
    const hitung = (kategori: string) =>
        baris.filter((p) => p.penilaian.BB_TB?.kategori === kategori).length;

    const d = ditimbang(baris);
    const baik = hitung('Gizi baik');
    const kurang = hitung('Gizi kurang');
    const buruk = hitung('Gizi buruk');
    // PMK 2/2020 punya enam kategori BB/TB, bukan tiga. Sisi lebihnya
    // digabung jadi satu angka: tanpa itu panel ini pernah menulis
    // `0 gizi kurang, 0 gizi buruk` tepat di atas daftar berisi tiga anak
    // obesitas, dan keempat angkanya tidak pernah berjumlah D.
    const lebih =
        hitung('Berisiko gizi lebih') +
        hitung('Gizi lebih') +
        hitung('Obesitas');

    return {
        giziBaik: baik,
        giziKurang: kurang,
        giziBuruk: buruk,
        giziLebih: lebih,
        // Ditimbang tapi BB/TB tidak dapat dihitung — bukan nol, bukan sehat.
        belumDinilai: Math.max(0, d - baik - kurang - buruk - lebih),
        ditimbang: d,
        // Sasaran yang tidak hadir. Ini `S - D`, bukan bagian dari D.
        belumDiukur: baris.length - d,
    };
}

export function cakupanEnamBulan(): CakupanPeriode[] {
    return data.periode.map((p) => {
        const baris = pengukuranPeriode(p.id);

        return {
            periodeId: p.id,
            label: p.label,
            sasaran: baris.length,
            ditimbang: ditimbang(baris),
        };
    });
}

/** Merah lebih mendesak daripada oranye; sisanya bukan tindak lanjut. */
const URUTAN_NADA: Record<string, number> = { merah: 0, oranye: 1 };

/**
 * Anak yang perlu ditindaklanjuti, paling mendesak di atas.
 *
 * Disusun dari kategori status gizi saja, bukan dari 1T/2T/3T
 * (docs/05-uiux-spec.md bagian 5.2, OI-01).
 */
export function perluPerhatian(periodeId: string): BarisPerhatian[] {
    const sebelumnya = periodeSebelum(periodeId);
    const baris: (BarisPerhatian & { peringkat: number; z: number })[] = [];

    for (const ukur of pengukuranPeriode(periodeId)) {
        const terparah = indeksTerparah(ukur);

        if (terparah === null) {
            continue;
        }

        const anak = cariAnak(ukur.anakId);
        const nilai = ukur.penilaian[terparah];

        if (anak === null || nilai === undefined || nilai.kategori === null) {
            continue;
        }

        baris.push({
            anakId: ukur.anakId,
            nama: anak.nama,
            umurBulan: ukur.umurBulan,
            rt: anak.rt,
            kategori: nilai.kategori,
            alasan: susunAlasan(ukur, terparah, sebelumnya),
            peringkat: URUTAN_NADA[nadaKategori(nilai.kategori)] ?? 2,
            z: nilai.z,
        });
    }

    // Di dalam satu nada, yang paling jauh dari rentang normal lebih dulu.
    // Mengurutkan menaik menurut z saja salah untuk Obesitas: +3,9 lebih
    // mendesak daripada +3,3, bukan sebaliknya.
    return baris
        .sort(
            (a, b) =>
                a.peringkat - b.peringkat || Math.abs(b.z) - Math.abs(a.z),
        )
        .map((b) => ({
            anakId: b.anakId,
            nama: b.nama,
            umurBulan: b.umurBulan,
            rt: b.rt,
            kategori: b.kategori,
            alasan: b.alasan,
        }));
}

/** Indeks dengan kategori paling berat pada satu pengukuran, atau null. */
function indeksTerparah(ukur: Pengukuran): Indeks | null {
    let terpilih: Indeks | null = null;
    let terbaik = Number.POSITIVE_INFINITY;

    for (const [indeks, nilai] of Object.entries(ukur.penilaian)) {
        if (
            nilai.kategori === null ||
            !PERLU_TINDAK_LANJUT.includes(nilai.kategori)
        ) {
            continue;
        }

        const peringkat = URUTAN_NADA[nadaKategori(nilai.kategori)] ?? 2;

        if (peringkat < terbaik) {
            terbaik = peringkat;
            terpilih = indeks as Indeks;
        }
    }

    return terpilih;
}

function periodeSebelum(periodeId: string): string | null {
    const urutan = data.periode.findIndex((p) => p.id === periodeId);

    return urutan > 0 ? data.periode[urutan - 1].id : null;
}

/**
 * Satu baris alasan di bawah tiap anak.
 *
 * Menyebut arah perubahan sejak bulan lalu, bukan hanya angka hari ini —
 * "turun dari −2,6" memberi tahu apa yang harus ditindaklanjuti, "−3,1" saja
 * tidak.
 */
function susunAlasan(
    ukur: Pengukuran,
    indeks: Indeks,
    periodeSebelumnya: string | null,
): string {
    const nilai = ukur.penilaian[indeks];

    if (nilai === undefined) {
        return '';
    }

    const label = labelIndeks(indeks, ukur.umurBulan);
    const sekarang = `${label} ${zScore(nilai.z)} SD`;

    if (periodeSebelumnya === null) {
        return `${sekarang}, periode pertama`;
    }

    const lalu = data.pengukuran.find(
        (p) => p.anakId === ukur.anakId && p.periodeId === periodeSebelumnya,
    )?.penilaian[indeks];

    if (lalu === undefined) {
        return `${sekarang}, belum ada pembanding bulan lalu`;
    }

    const arah =
        nilai.z < lalu.z ? 'turun' : nilai.z > lalu.z ? 'naik' : 'tetap';

    return `${sekarang}, ${arah} dari ${zScore(lalu.z)} SD`;
}

/** Periode terakhir yang benar-benar berisi pengukuran, untuk state kosong. */
export function periodeTerakhirTerisi(): Periode | null {
    for (let i = data.periode.length - 1; i >= 0; i--) {
        if (pengukuranPeriode(data.periode[i].id).length > 0) {
            return data.periode[i];
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Selektor Data Anak dan Detail anak — bagian 6.4 dan 6.5
// ---------------------------------------------------------------------------

/**
 * Bentuk baris daftar anak.
 *
 * Bukan tipe tersendiri: yang berlaku adalah kontrak props halamannya, dan
 * dulu berkas ini menyalinnya — dua daftar kolom yang harus diingat untuk
 * diubah bersama. Sekarang salinannya hilang.
 */
export type BarisDaftarAnak = BarisAnak;

/** RT yang benar-benar ada di data, terurut. RT tanpa sasaran tidak dikarang. */
export function daftarRt(): string[] {
    const rt = new Set<string>();

    for (const anak of data.anak) {
        if (anak.rt !== null) {
            rt.add(anak.rt);
        }
    }

    return [...rt].sort((a, b) => Number(a) - Number(b));
}

/**
 * Daftar anak pada satu periode beserta pengukuran terakhirnya.
 *
 * Dibatasi periode terpilih, bukan seluruh 123 anak lintas enam bulan: bagian 9
 * menyebut jumlahnya 101 dan berubah menjadi 39 saat difilter RT 1, dan itu
 * angka periode Juni.
 */
export function daftarAnak(periodeId: string): BarisDaftarAnak[] {
    return pengukuranPeriode(periodeId)
        .map((ukur) => {
            const anak = cariAnak(ukur.anakId);

            if (anak === null) {
                return null;
            }

            const gizi = ukur.penilaian.BB_TB?.kategori ?? null;
            const terparah = indeksTerparah(ukur);

            return {
                anakId: anak.id,
                nama: anak.nama,
                nik: anak.nik,
                nikLengkap: anak.nikLengkap,
                jk: anak.jk,
                umurBulan: ukur.umurBulan,
                rt: anak.rt,
                namaOrtu: anak.namaOrtu,
                tanggalUkurTerakhir: ukur.tanggalUkur,
                kategoriGizi: gizi,
                perluPerhatian: terparah !== null,
                // Anak yang tidak hadir tidak punya angka: null, bukan nol
                // (DR-04). Editor barisnya menampilkan blok "belum ada
                // pengukuran" alih-alih dua kotak berisi 0,0.
                bbKg: ukur.statusKehadiran === 'hadir' ? ukur.bbKg : null,
                tinggiCm:
                    ukur.statusKehadiran === 'hadir' ? ukur.tinggiCm : null,
            };
        })
        .filter((b): b is BarisDaftarAnak => b !== null)
        .sort((a, b) => (a.nama ?? '').localeCompare(b.nama ?? ''));
}

/**
 * Tabel LMS WHO 2006 lengkap, 906 baris untuk enam indeks.
 *
 * Diambil langsung dari berkas yang juga dipakai `StandarLmsSeeder`, bukan
 * disalin ke posyandu.json: satu sumber, dan demo tidak perlu dibangun ulang
 * ketika tabelnya diperbarui. `garisSdBbU` tetap terpisah — itu hanya BB/U
 * untuk menggambar pita kurva KMS.
 */
export const standarLms = lms.baris as BarisLms[];

export type DetailAnak = {
    anak: Anak;
    /** Seluruh pengukuran lintas periode, terbaru di atas. */
    pengukuran: Pengukuran[];
    garisSd: GarisSd[];
};

export function detailAnak(anakId: number): DetailAnak | null {
    const anak = cariAnak(anakId);

    if (anak === null) {
        return null;
    }

    return {
        anak,
        pengukuran: data.pengukuran
            .filter((p) => p.anakId === anakId)
            .sort((a, b) => b.periodeId.localeCompare(a.periodeId)),
        garisSd: data.garisSdBbU,
    };
}

// ---------------------------------------------------------------------------
// Selektor Laporan — bagian 6.6
// ---------------------------------------------------------------------------

export type BarisRekapRt = {
    rt: string;
    s: number;
    d: number;
    n: number;
    t: number;
    o: number;
    b: number;
    /** Di bawah garis merah KMS, yaitu BB/U < −3 SD. */
    bgm: number;
};

export type RekapLaporan = {
    baris: BarisRekapRt[];
    total: BarisRekapRt;
};

function hitungNtob(baris: Pengukuran[], huruf: string): number {
    return baris.filter((p) => (p.ntob ?? '').toUpperCase() === huruf).length;
}

function rekapDari(rt: string, baris: Pengukuran[]): BarisRekapRt {
    return {
        rt,
        s: baris.length,
        d: baris.filter((p) => p.statusKehadiran === 'hadir').length,
        n: hitungNtob(baris, 'N'),
        t: hitungNtob(baris, 'T'),
        o: hitungNtob(baris, 'O'),
        b: hitungNtob(baris, 'B'),
        bgm: baris.filter((p) => (p.penilaian.BB_U?.z ?? 0) < -3).length,
    };
}

/**
 * Rekap SKDN per RT untuk satu atau beberapa periode.
 *
 * Tab Tahunan menjumlahkan S, D, N, T, O, B, dan BGM lintas periode; D/S-nya
 * dihitung ulang dari total, bukan dirata-rata dari persentase bulanan.
 * RT tanpa sasaran tidak ditampilkan.
 */
export function rekapPerRt(periodeIds: string[]): RekapLaporan {
    const baris = periodeIds.flatMap((id) => pengukuranPeriode(id));
    const perRt = new Map<string, Pengukuran[]>();

    for (const ukur of baris) {
        const rt = cariAnak(ukur.anakId)?.rt;

        if (rt === null || rt === undefined) {
            continue;
        }

        perRt.set(rt, [...(perRt.get(rt) ?? []), ukur]);
    }

    const hasil = [...perRt.entries()]
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([rt, isi]) => rekapDari(rt, isi));

    return {
        baris: hasil,
        total: hasil.reduce(
            (jumlah, r) => ({
                rt: 'Total',
                s: jumlah.s + r.s,
                d: jumlah.d + r.d,
                n: jumlah.n + r.n,
                t: jumlah.t + r.t,
                o: jumlah.o + r.o,
                b: jumlah.b + r.b,
                bgm: jumlah.bgm + r.bgm,
            }),
            { rt: 'Total', s: 0, d: 0, n: 0, t: 0, o: 0, b: 0, bgm: 0 },
        ),
    };
}

/** Urutan kolom indeks pada berkas CSV, mengikuti rekap z-score Ibu Sri. */
const INDEKS_CSV: Indeks[] = [
    'BB_U',
    'TB_U',
    'BB_TB',
    'IMT_U',
    'LILA_U',
    'LIKA_U',
];

/**
 * Berkas CSV rinci: satu baris per anak, enam pasang kolom z-score dan status.
 *
 * Sengaja berbeda dari tabel di layar, yang bersifat agregat SKDN per RT.
 * Pemisah kolomnya titik koma karena desimalnya memakai koma — kombinasi yang
 * dibaca benar oleh Excel berbahasa Indonesia, yang dipakai pemilik program.
 */
export function csvLaporan(periodeIds: string[]): string {
    const judul = [
        'No',
        'NIK',
        'Nama Anak',
        'JK',
        'Tanggal Lahir',
        'RT',
        'RW',
        'Periode',
        'Tanggal Ukur',
        'Umur (bulan)',
        'BB (kg)',
        'TB (cm)',
        'LILA (cm)',
        'LIKA (cm)',
        'NTOB',
        ...INDEKS_CSV.flatMap((i) => [
            i.replace('_', '/'),
            `Status ${i.replace('_', '/')}`,
        ]),
        'Versi Standar',
    ];

    // Koma sebagai pemisah desimal, dan sel kosong bila tidak dapat dihitung —
    // tidak pernah nol (bagian 6.6).
    const desimal = (nilai: number | null, digit: number) =>
        nilai === null ? '' : nilai.toFixed(digit).replace('.', ',');

    const baris = periodeIds.flatMap((id) =>
        pengukuranPeriode(id).map((ukur, urutan) => {
            const anak = cariAnak(ukur.anakId);

            return [
                String(urutan + 1),
                anak?.nik ?? '',
                anak?.nama ?? '',
                anak?.jk ?? '',
                anak?.tglLahir ?? '',
                anak?.rt ?? '',
                anak?.rw ?? '',
                id,
                ukur.tanggalUkur ?? '',
                ukur.umurBulan === null ? '' : String(ukur.umurBulan),
                desimal(ukur.bbKg, 2),
                desimal(ukur.tinggiCm, 1),
                desimal(ukur.lilaCm, 1),
                desimal(ukur.likaCm, 1),
                ukur.ntob ?? '',
                ...INDEKS_CSV.flatMap((indeks) => {
                    const nilai = ukur.penilaian[indeks];

                    return [
                        desimal(nilai?.z ?? null, 2),
                        nilai?.kategori ?? '',
                    ];
                }),
                data.meta.versiStandar,
            ];
        }),
    );

    const sel = (nilai: string) =>
        /[";\n]/.test(nilai) ? `"${nilai.replace(/"/g, '""')}"` : nilai;

    // BOM UTF-8 supaya Excel membaca huruf beraksen dengan benar.
    return (
        '\uFEFF' +
        [judul, ...baris].map((r) => r.map(sel).join(';')).join('\r\n') +
        '\r\n'
    );
}

// ---------------------------------------------------------------------------
// Selektor Pengaturan dan Periode — bagian 6.7 dan 6.8
// ---------------------------------------------------------------------------

/**
 * Nilai bawaan ambang pengukuran.
 *
 * Statis, dan tidak ada yang tersimpan: mengubahnya hanya berlaku selama sesi
 * (bagian 6.7 dan 11). Di produk nanti nilainya datang dari tabel
 * `pengaturan_ambang` yang belum ada di data model — bagian 10 langkah 6.
 */
export const PENGATURAN_BAWAAN = {
    beratMin: 1.0,
    beratMax: 30.0,
    tinggiMin: 40.0,
    tinggiMax: 130.0,
    lilaMin: 8.0,
    lilaMax: 25.0,
    likaMin: 30.0,
    likaMax: 60.0,
    naikMax: 2.0,
    turunMax: 1.5,
    tinggiBerkurangMax: 0.5,
    umurMaxBulan: 60,
    ambangWaspada: -1.0,
    ambangRujukan: -1.96,
};

export const STANDARISASI_BAWAAN = {
    standar: 'who_permenkes_2020' as const,
    koreksiPosisiOtomatis: true,
};

export const PENGATURAN_TERAKHIR_DIUBAH = {
    tanggal: '2026-06-13',
    oleh: 'Bidan Posyandu Tulip',
};

export type BarisPeriode = {
    id: string;
    label: string;
    tanggalKegiatan: string | null;
    sasaran: number;
    ditimbang: number;
};

export function daftarPeriode(): BarisPeriode[] {
    return data.periode.map((p) => {
        const baris = pengukuranPeriode(p.id);

        return {
            id: p.id,
            label: p.label,
            tanggalKegiatan: p.tanggalKegiatan,
            sasaran: baris.length,
            ditimbang: baris.filter((u) => u.statusKehadiran === 'hadir')
                .length,
        };
    });
}
