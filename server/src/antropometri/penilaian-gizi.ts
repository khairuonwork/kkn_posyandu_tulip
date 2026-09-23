/**
 * Menghitung penilaian gizi untuk satu pengukuran.
 *
 * Port dari `app/Support/Antropometri/PenilaianGiziService.php`, bagian
 * `hitung()` saja. `simpan()` tidak ikut: ia menulis ke basis data, dan itu
 * tugas repository — bukan tugas mesin hitung.
 *
 * Masukannya objek biasa, bukan model. Dengan begitu seluruh aturan yang paling
 * rawan — umur, koreksi posisi ukur, batas umur LILA — dapat diuji tanpa satu
 * baris pun basis data.
 *
 * @see docs/rujukan/antropometri.md
 */

import type { Indeks, JenisKelamin, JenisUkur } from './indeks.ts';
import { jenisUkurSeharusnya, SEMUA_INDEKS, SIFAT } from './indeks.ts';
import { kategoriDari } from './kategori.ts';
import type { TabelStandar } from './tabel-standar.ts';
import { hitungZ } from './z-score.ts';

/** Selisih sistematis antara panjang badan telentang dan tinggi badan berdiri. */
const KOREKSI_POSISI_CM = 0.7;

export type PengukuranMasukan = {
    /** ISO `YYYY-MM-DD`. */
    tglLahir: string;
    jk: JenisKelamin;
    /** ISO `YYYY-MM-DD`. */
    tanggalUkur: string;
    bbKg: number | null;
    /** Nilai ukur asli, sebelum konversi PB/TB. */
    tinggiCm: number | null;
    jenisUkur: JenisUkur | null;
    lilaCm: number | null;
    likaCm: number | null;
};

export type HasilPenilaian = {
    indeks: Indeks;
    zScore: number;
    kategori: string | null;
    tidakWajar: boolean;
    catatanPerhitungan: Record<string, string> | null;
};

/**
 * Umur dalam bulan penuh pada tanggal tertentu.
 *
 * Selisih kalender, bukan hasil bagi jumlah hari: anak yang lahir 20 Januari
 * dan diukur 13 Juni berumur 4 bulan penuh, bukan 5.
 *
 * Dihitung dari komponen tanggal ISO, bukan lewat objek Date, supaya zona waktu
 * mesin tidak pernah ikut menentukan umur — dan umur menentukan seluruh z-score.
 *
 * @see docs/rujukan/antropometri.md bagian 3.1
 */
export function umurBulanPada(tglLahir: string, tanggal: string): number {
    const [tl, bl, hl] = pecahTanggal(tglLahir);
    const [tt, bt, ht] = pecahTanggal(tanggal);

    let bulan = (tt - tl) * 12 + (bt - bl);

    if (ht < hl) {
        bulan--;
    }

    return bulan;
}

function pecahTanggal(iso: string): [number, number, number] {
    const cocok = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);

    if (cocok === null) {
        throw new TypeError(`Tanggal harus berformat YYYY-MM-DD, diterima: ${iso}`);
    }

    return [Number(cocok[1]), Number(cocok[2]), Number(cocok[3])];
}

/**
 * Pembulatan setengah menjauhi nol, seperti `round()` PHP.
 *
 * `Math.round` membulatkan setengah ke arah plus tak hingga, sehingga −2,2225
 * menjadi −2,222 di JavaScript tetapi −2,223 di PHP. Pada kolom z-score
 * selisih satu angka di belakang koma itu cukup untuk membuat dua sistem
 * melaporkan angka berbeda untuk anak yang sama.
 */
export function bulatkan(nilai: number, desimal: number): number {
    const faktor = 10 ** desimal;
    const skala = Math.abs(nilai) * faktor;

    // Koreksi galat representasi biner: 1.005 * 100 menghasilkan 100.49999…
    // sehingga pembulatan meleset satu satuan terakhir.
    const dibulatkan = Math.round(Number(skala.toPrecision(15)));

    return (nilai < 0 ? -dibulatkan : dibulatkan) / faktor;
}

/**
 * Indeks yang tidak dapat dihitung tidak menghasilkan baris sama sekali —
 * ketiadaan baris berarti "tidak dapat dihitung", bukan nol.
 */
export function hitungPenilaian(
    tabel: TabelStandar,
    pengukuran: PengukuranMasukan,
): HasilPenilaian[] {
    const umur = umurBulanPada(pengukuran.tglLahir, pengukuran.tanggalUkur);

    if (umur < 0) {
        return [];
    }

    const bb = pengukuran.bbKg;
    const [tinggi, catatanUkur] = tinggiUntukTabel(pengukuran, umur);

    const masukan: Record<Indeks, [number | null, number | null]> = {
        BB_U: [umur, bb],
        TB_U: [umur, tinggi],
        BB_TB: [tinggi, bb],
        IMT_U: [umur, imt(bb, tinggi)],
        LILA_U: [umur, pengukuran.lilaCm],
        LIKA_U: [umur, pengukuran.likaCm],
    };

    const hasil: HasilPenilaian[] = [];

    for (const indeks of SEMUA_INDEKS) {
        const [kunci, nilai] = masukan[indeks];

        if (kunci === null || nilai === null || umur < SIFAT[indeks].umurMinimum) {
            continue;
        }

        const z = hitungZ(tabel, indeks, pengukuran.jk, kunci, nilai);

        if (z === null) {
            continue;
        }

        const [bawah, atas] = SIFAT[indeks].batasWajar;

        // Catatan posisi ukur hanya relevan bagi indeks yang memakai tinggi badan.
        const catatan =
            indeks === 'TB_U' || indeks === 'BB_TB' || indeks === 'IMT_U'
                ? catatanUkur
                : {};

        hasil.push({
            indeks,
            zScore: bulatkan(z, 3),
            kategori: kategoriDari(indeks, z),
            tidakWajar: z < bawah || z > atas,
            catatanPerhitungan: Object.keys(catatan).length === 0 ? null : catatan,
        });
    }

    return hasil;
}

/**
 * Tinggi badan yang dipakai untuk mencari tabel, setelah konversi PB/TB.
 *
 * Nilai yang disimpan dan ditampilkan tetap nilai ukur asli; konversi hanya
 * berlaku untuk perhitungan.
 */
function tinggiUntukTabel(
    pengukuran: PengukuranMasukan,
    umur: number,
): [number | null, Record<string, string>] {
    const tinggi = pengukuran.tinggiCm;

    if (tinggi === null) {
        return [null, {}];
    }

    const catatan: Record<string, string> = {};
    let jenis = pengukuran.jenisUkur;

    if (jenis === null) {
        jenis = jenisUkurSeharusnya(umur);
        catatan.jenis_ukur = 'diasumsikan dari umur';
    }

    if (jenis === jenisUkurSeharusnya(umur)) {
        return [tinggi, catatan];
    }

    // Diukur dengan posisi yang tidak lazim untuk umurnya: koreksi 0,7 cm.
    const terkoreksi = umur < 24 ? tinggi + KOREKSI_POSISI_CM : tinggi - KOREKSI_POSISI_CM;
    const selisih = terkoreksi - tinggi;
    const tanda = selisih >= 0 ? '+' : '-';

    catatan.konversi_tinggi = `diukur ${jenis} pada umur ${umur} bulan, dikoreksi ${tanda}${Math.abs(selisih).toFixed(1)} cm`;

    return [terkoreksi, catatan];
}

function imt(bb: number | null, tinggi: number | null): number | null {
    if (bb === null || tinggi === null || tinggi <= 0) {
        return null;
    }

    return bb / (tinggi / 100) ** 2;
}
