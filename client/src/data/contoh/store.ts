/**
 * Sumber data demo dan selektor di atasnya.
 *
 * Seluruh isinya berasal dari demo/data/posyandu.json yang dihasilkan
 * demo/data/extract-demo-data.py. Tidak ada yang tersimpan: muat ulang
 * mengembalikan semuanya seperti semula.
 *
 * Berkas ini perancah demo. Saat backend siap, controller yang memasok props
 * yang sama dan berkas ini dibuang (docs/rujukan/layar-demo.md bagian 10).
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
    Pengguna,
    Pengukuran,
    Periode,
} from '@/types/posyandu';
// Tabel standar dibaca langsung dari sumber kebenaran milik server, bukan
// disalin ke sini: dua salinan 906 baris parameter WHO adalah dua angka gizi
// yang bisa berbeda diam-diam. Impor lintas batas ini hanya berlaku untuk demo
// statis, yang memang harus jalan tanpa backend; SPA sungguhan mengambil garis
// SD dari API, bukan membundelnya.
import lms from '../../../../server/db/data/who-lms.json';
import mentah from './posyandu.json';

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
 * dari 101 menjadi 39 di depan client saat peran diganti.
 */
export const RT_KADER = '1';

export function cariPeriode(id: string): Periode | null {
    return data.periode.find((p) => p.id === id) ?? null;
}

export function cariAnak(id: number): Anak | null {
    return data.anak.find((a) => a.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Selektor Beranda — docs/rujukan/layar-demo.md bagian 6.3
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

/**
 * Batasi baris ke satu RT. `null` berarti seluruh RW.
 *
 * Kartu Masuk menjanjikan kader "Melihat data balita di RT binaannya" dan
 * sidebar mengulanginya, tapi dulu hanya Data Anak yang benar-benar disaring:
 * Beranda tetap menampilkan Sasaran 101 se-RW dan menandai anak di RT 2, 3, 5,
 * dan 6, sementara Laporan membuka ketujuh RT. Janji akses data yang ditulis
 * di layar tidak boleh dibantah oleh layar sebelahnya.
 */
function saringRt(baris: Pengukuran[], rt: string | null): Pengukuran[] {
    if (rt === null) {
        return baris;
    }

    return baris.filter((p) => cariAnak(p.anakId)?.rt === rt);
}

function ditimbang(baris: Pengukuran[]): number {
    return baris.filter((p) => p.statusKehadiran === 'hadir').length;
}

export function ringkasan(
    periodeId: string,
    rt: string | null = null,
): Ringkasan {
    const baris = saringRt(pengukuranPeriode(periodeId), rt);

    return {
        // Satu anak pada arsip Juni sudah berumur 60 bulan dan tetap terdaftar
        // sebagai sasaran. S mengikuti arsip, sehingga angkanya tetap 101
        // seperti bagian 5.5 — lihat catatan T3 di docs/riwayat/catatan-tahap-demo.md.
        sasaran: baris.length,
        ditimbang: ditimbang(baris),
        naik: hitungNtob(baris, 'N'),
        tanggalUkur: cariPeriode(periodeId)?.tanggalKegiatan ?? null,
    };
}

export function statusGizi(
    periodeId: string,
    rt: string | null = null,
): StatusGizi {
    const baris = saringRt(pengukuranPeriode(periodeId), rt);
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

export function cakupanEnamBulan(rt: string | null = null): CakupanPeriode[] {
    return data.periode.map((p) => {
        const baris = saringRt(pengukuranPeriode(p.id), rt);

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
 * (docs/rujukan/ui-ux.md bagian 5.2, OI-01).
 */
export function perluPerhatian(
    periodeId: string,
    rt: string | null = null,
): BarisPerhatian[] {
    const sebelumnya = periodeSebelum(periodeId);
    const baris: (BarisPerhatian & { peringkat: number; z: number })[] = [];

    for (const ukur of saringRt(pengukuranPeriode(periodeId), rt)) {
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
        return `${sekarang}, baru pertama kali ditimbang`;
    }

    const lalu = data.pengukuran.find(
        (p) => p.anakId === ukur.anakId && p.periodeId === periodeSebelumnya,
    )?.penilaian[indeks];

    if (lalu === undefined) {
        return `${sekarang}, tidak ada angka bulan lalu`;
    }

    // Arah ANAKNYA, bukan arah z-score. `naik` dan `turun` sudah punya satu
    // arti pasti di posyandu - N = naik = berat bertambah = kabar baik - dan
    // baris ini duduk 40 px di bawah KPI `Naik (N)` di Beranda. Memakai kata
    // yang sama untuk "z bergerak ke atas" membuat anak obesitas yang memburuk
    // terbaca membaik, dan anak pendek yang membaik terbaca memburuk.
    //
    // Jarak dari nol yang menentukan, bukan tandanya: |z| membesar berarti
    // makin jauh dari normal, untuk sisi kurang maupun sisi lebih.
    const jauhKini = Math.abs(nilai.z);
    const jauhLalu = Math.abs(lalu.z);

    if (jauhKini === jauhLalu) {
        return `${sekarang}, sama seperti bulan lalu`;
    }

    const arah = jauhKini > jauhLalu ? 'memburuk' : 'membaik';

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
 * Dibatasi periode terpilih, bukan seluruh 123 anak lintas enam bulan. Angka
 * yang dipakai demo — 101 anak, menjadi 39 saat difilter RT 1 — adalah angka
 * periode Juni.
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
                // Kolom `Status gizi` hanya menampilkan BB/TB, sedangkan
                // penanda perhatian dihitung dari SEMUA indeks. Tanpa dua
                // kolom ini, saringan "Hanya yang perlu perhatian" memulangkan
                // sepuluh anak yang tujuh di antaranya dilabeli "Gizi baik" -
                // dan tidak ada satu pun petunjuk kenapa mereka ditandai.
                // Dua penanda yang sudah ada di arsip sejak impor dan tidak
                // pernah muncul di layar mana pun.
                risikoLahir: risikoLahir(anak),
                indeksPemicu: terparah,
                kategoriPemicu:
                    terparah === null
                        ? null
                        : (ukur.penilaian[terparah]?.kategori ?? null),
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

/**
 * Cacah huruf N, T, O, atau B — hanya dari anak yang benar-benar ditimbang.
 *
 * Syarat `hadir` bukan kehati-hatian berlebih. Arsip Januari 2026 memuat satu
 * baris ber-`ntob: 'T'` dengan `statusKehadiran: 'tidak_hadir'`, dan tanpa
 * saringan ini RT 02 melaporkan D=17 sementara N+T+B=18: lebih banyak hasil
 * penimbangan daripada anak yang ditimbang, di lembar yang ditandatangani bidan
 * dan dikirim ke puskesmas. N, T, O, dan B menggambarkan hasil penimbangan,
 * jadi baris tanpa penimbangan tidak punya hak atas satu pun dari keempatnya.
 */
function hitungNtob(baris: Pengukuran[], huruf: string): number {
    return baris.filter(
        (p) =>
            p.statusKehadiran === 'hadir' &&
            (p.ntob ?? '').toUpperCase() === huruf,
    ).length;
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
export function rekapPerRt(
    periodeIds: string[],
    rt: string | null = null,
): RekapLaporan {
    const baris = saringRt(
        periodeIds.flatMap((id) => pengukuranPeriode(id)),
        rt,
    );
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

/** Urutan kolom indeks pada berkas CSV, mengikuti rekap z-score pemilik program. */
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
};

/** Batas berat lahir rendah, Kemenkes dan WHO: di bawah 2,5 kg. */
export const BBLR_KG = 2.5;

/**
 * Apakah anak ini membawa risiko sejak lahir.
 *
 * Dua penanda yang sudah ada di arsip sejak impor dan tidak pernah sekali pun
 * muncul di layar: berat lahir rendah, dan tidak punya Buku KIA. Keduanya
 * menaikkan kewaspadaan pada anak yang hari ini berstatus gizi baik.
 *
 * `bbLahirMeragukan` dikecualikan: satu baris di arsip menyimpan angka yang
 * satuannya diragukan, dan angka yang diragukan tidak boleh memicu penanda
 * klinis. Berat lahir yang kosong juga bukan BBLR — kosong berarti tidak
 * tercatat, bukan rendah (DR-04).
 */
export function risikoLahir(anak: Anak): string | null {
    const bblr =
        anak.bbLahirKg !== null &&
        !anak.bbLahirMeragukan &&
        anak.bbLahirKg < BBLR_KG;

    if (bblr && !anak.bukuKia) {
        return 'Lahir BBLR, tanpa Buku KIA';
    }

    if (bblr) {
        return 'Lahir BBLR';
    }

    if (!anak.bukuKia) {
        return 'Tanpa Buku KIA';
    }

    return null;
}

export type TitikTren = {
    periodeId: string;
    label: string;
    ditimbang: number;
    /** TB/U/PB/U: Pendek dan Sangat pendek. */
    pendek: number;
    /** BB/TB: Gizi kurang dan Gizi buruk. */
    giziKurang: number;
    /** BB/TB: Gizi lebih dan Obesitas. */
    giziLebih: number;
};

/**
 * Tren status gizi enam bulan.
 *
 * Sebelum ini hanya D/S yang punya tren; seluruh angka status gizi di Portal
 * adalah potret satu bulan, sehingga tidak ada satu layar pun yang bisa
 * menjawab "membaik atau memburuk". Penyebutnya D, bukan S: anak yang tidak
 * hadir tidak punya status gizi, dan memasukkannya akan mengencerkan angka
 * tiap kali kehadiran turun.
 */
export function trenStatusGizi(rt: string | null = null): TitikTren[] {
    return data.periode.map((p) => {
        const baris = saringRt(pengukuranPeriode(p.id), rt).filter(
            (u) => u.statusKehadiran === 'hadir',
        );
        const punya = (indeks: Indeks, kategori: string[]) =>
            baris.filter((u) =>
                kategori.includes(u.penilaian[indeks]?.kategori ?? ''),
            ).length;

        return {
            periodeId: p.id,
            label: p.label,
            ditimbang: baris.length,
            pendek: punya('TB_U', ['Pendek', 'Sangat pendek']),
            giziKurang: punya('BB_TB', ['Gizi kurang', 'Gizi buruk']),
            giziLebih: punya('BB_TB', ['Gizi lebih', 'Obesitas']),
        };
    });
}

export type BarisTrenRt = {
    rt: string;
    /** Satu nilai D/S per periode, urut sesuai `data.periode`. */
    ds: (number | null)[];
    /** Rerata D/S enam bulan, dihitung dari total D dibagi total S. */
    rerata: number | null;
};

/**
 * D/S tiap RT sepanjang enam bulan.
 *
 * Rekap per RT yang ada hanya memotret satu bulan, sehingga RT yang tertinggal
 * terus-menerus tidak bisa dibedakan dari RT yang kebetulan jeblok sekali.
 * `null` berarti RT itu tidak punya sasaran pada bulan tersebut — bukan nol
 * persen.
 */
export function trenDsPerRt(rt: string | null = null): BarisTrenRt[] {
    const wilayah = rt === null ? daftarRt() : [rt];

    return wilayah.map((w) => {
        let totalS = 0;
        let totalD = 0;

        const ds = data.periode.map((p) => {
            const baris = saringRt(pengukuranPeriode(p.id), w);

            if (baris.length === 0) {
                return null;
            }

            const d = baris.filter((u) => u.statusKehadiran === 'hadir').length;

            totalS += baris.length;
            totalD += d;

            return Math.round((d / baris.length) * 100);
        });

        return {
            rt: w,
            ds,
            rerata: totalS === 0 ? null : Math.round((totalD / totalS) * 100),
        };
    });
}

/**
 * Akun contoh untuk kartu Kelola pengguna.
 *
 * Tujuh kader untuk tujuh RT, satu bidan, satu admin, dan satu kader yang sudah
 * nonaktif — yang terakhir ada supaya keadaan "nonaktif" punya wujud di layar
 * sejak awal, tanpa pemirsa demo harus mematikan akun lebih dulu.
 *
 * Namanya sengaja bukan nama orang, melainkan label peran dan RT. Versi awal
 * memakai nama Sunda yang terdengar wajar, dan beberapa di antaranya bertabrakan
 * dengan nama ibu di arsip — "Neneng Juanda" terbaca sekaligus sebagai kader
 * RT 07 dan sebagai ibu Athaya Permana di Data Balita. Label peran tidak bisa
 * disangka orang sungguhan, dan pemirsa demo langsung tahu siapa yang sedang
 * dibicarakan tiap baris.
 *
 * `bidan@posyandutulip.id` sengaja sama dengan isian bawaan layar Masuk, dan
 * `Bidan Posyandu Tulip` sama dengan nama pada baris "Terakhir diubah" di
 * Pengaturan: keduanya menunjuk akun yang benar-benar ada di daftar ini.
 */
export const PENGGUNA_CONTOH: Pengguna[] = [
    {
        id: 1,
        nama: 'Bidan Posyandu Tulip',
        email: 'bidan@posyandutulip.id',
        peran: 'bidan',
        rt: null,
        aktif: true,
    },
    {
        id: 2,
        nama: 'Admin Sistem',
        email: 'admin@posyandutulip.id',
        peran: 'admin',
        rt: null,
        aktif: true,
    },
    {
        id: 3,
        nama: 'Kader RT 01',
        email: 'kader01@posyandutulip.id',
        peran: 'kader',
        rt: '1',
        aktif: true,
    },
    {
        id: 4,
        nama: 'Kader RT 02',
        email: 'kader02@posyandutulip.id',
        peran: 'kader',
        rt: '2',
        aktif: true,
    },
    {
        id: 5,
        nama: 'Kader RT 03',
        email: 'kader03@posyandutulip.id',
        peran: 'kader',
        rt: '3',
        aktif: true,
    },
    {
        id: 6,
        nama: 'Kader RT 04',
        email: 'kader04@posyandutulip.id',
        peran: 'kader',
        rt: '4',
        aktif: true,
    },
    {
        id: 7,
        nama: 'Kader RT 05',
        email: 'kader05@posyandutulip.id',
        peran: 'kader',
        rt: '5',
        aktif: true,
    },
    {
        id: 8,
        nama: 'Kader RT 06',
        email: 'kader06@posyandutulip.id',
        peran: 'kader',
        rt: '6',
        aktif: true,
    },
    {
        id: 9,
        nama: 'Kader RT 07',
        email: 'kader07@posyandutulip.id',
        peran: 'kader',
        rt: '7',
        aktif: true,
    },
    {
        id: 10,
        nama: 'Kader RT 02 Lama',
        email: 'kader02.lama@posyandutulip.id',
        peran: 'kader',
        rt: '2',
        aktif: false,
    },
];

export const PENGATURAN_TERAKHIR_DIUBAH = {
    tanggal: '2026-06-13',
    oleh: 'Bidan Posyandu Tulip',
};
