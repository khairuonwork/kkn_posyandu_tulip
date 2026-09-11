/**
 * Aturan tampilan angka — docs/10-prd-demo-frontend.md bagian 8.2 dan
 * docs/05-uiux-spec.md bagian 9.
 *
 * Produk ini pada dasarnya tabel angka, dan aturan di sinilah yang menentukan
 * apakah ia terlihat profesional atau amatir. Karena itu seluruhnya tinggal di
 * satu berkas, bukan diulang di tiap halaman.
 */

/** Nilai kosong selalu begini, tidak pernah `0` (P2, DR-04). */
export const KOSONG = '—';

/** U+2212, bukan tanda hubung: sejajar dengan angka pada huruf tabular. */
const MINUS = '−';

const BULAN_PANJANG = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];

const BULAN_RINGKAS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
];

/** Koma sebagai pemisah desimal, dan tanda minus yang benar. */
export function angka(nilai: number | null, desimal = 0): string {
    if (nilai === null || Number.isNaN(nilai)) {
        return KOSONG;
    }

    return Math.abs(nilai)
        .toFixed(desimal)
        .replace('.', ',')
        .replace(/^/, nilai < 0 ? MINUS : '');
}

/** Dua desimal, selalu bertanda: `−2,15` · `+0,60`. */
export function zScore(nilai: number | null): string {
    if (nilai === null) {
        return KOSONG;
    }

    return (nilai < 0 ? '' : '+') + angka(nilai, 2);
}

/** Satuan selalu ditulis: `9,2 kg` · `78,1 cm`. */
export function satuan(
    nilai: number | null,
    unit: string,
    desimal = 1,
): string {
    if (nilai === null) {
        return KOSONG;
    }

    return `${angka(nilai, desimal)} ${unit}`;
}

/** Persentase selalu dengan penyebutnya: `43% (18 dari 42)`. */
export function persen(pembilang: number, penyebut: number): string {
    if (penyebut === 0) {
        return KOSONG;
    }

    const nilai = Math.round((pembilang / penyebut) * 100);

    return `${nilai}% (${pembilang} dari ${penyebut})`;
}

export function persenSaja(pembilang: number, penyebut: number): number {
    return penyebut === 0 ? 0 : Math.round((pembilang / penyebut) * 100);
}

/**
 * Pembilang dan penyebut saja: `97 dari 101`.
 *
 * Pasangan `persenSaja` untuk kartu yang sudah mencetak persennya sebagai angka
 * besar. Tanpa ini setiap kartu memakai `persen()` dan mencetak persentasenya
 * dua kali - `96%` lalu `96% (97 dari 101)` tepat di bawahnya.
 */
export function pecahan(pembilang: number, penyebut: number): string {
    if (penyebut === 0) {
        return KOSONG;
    }

    return `${pembilang} dari ${penyebut}`;
}

/** NIK berspasi tiap empat digit: `3204 0162 0125 0002`. */
export function nik(nilai: string | null): string {
    if (nilai === null || nilai === '') {
        return KOSONG;
    }

    return nilai.replace(/(.{4})(?=.)/g, '$1 ');
}

/** `14 Agu 2026` — bentuk untuk tabel. */
export function tanggalRingkas(iso: string | null): string {
    const t = urai(iso);

    if (t === null) {
        return KOSONG;
    }

    return `${t.tanggal} ${BULAN_RINGKAS[t.bulan]} ${t.tahun}`;
}

/** `14 Agustus 2026` — bentuk untuk teks mengalir. */
export function tanggalPanjang(iso: string | null): string {
    const t = urai(iso);

    if (t === null) {
        return KOSONG;
    }

    return `${t.tanggal} ${BULAN_PANJANG[t.bulan]} ${t.tahun}`;
}

/** `13 Juni` — dipakai pada caveat periode di Beranda. */
export function tanggalTanpaTahun(iso: string | null): string {
    const t = urai(iso);

    if (t === null) {
        return KOSONG;
    }

    return `${t.tanggal} ${BULAN_PANJANG[t.bulan]}`;
}

export function umurRingkas(bulan: number | null): string {
    if (bulan === null) {
        return KOSONG;
    }

    return `${bulan} bulan`;
}

/** Bentuk panjang, dipakai di Detail anak: `1 tahun 6 bulan`. */
export function umurPanjang(bulan: number | null): string {
    if (bulan === null) {
        return KOSONG;
    }

    if (bulan < 12) {
        return `${bulan} bulan`;
    }

    const tahun = Math.floor(bulan / 12);
    const sisa = bulan % 12;

    return sisa === 0 ? `${tahun} tahun` : `${tahun} tahun ${sisa} bulan`;
}

/** Dua anak memang tanpa nama di arsip; ditampilkan, tidak disembunyikan. */
export function namaTampil(nama: string | null): string {
    return nama === null || nama === '' ? '(nama belum tercatat)' : nama;
}

export function inisial(nama: string | null): string {
    if (nama === null || nama === '') {
        return '?';
    }

    return nama
        .split(/\s+/)
        .slice(0, 2)
        .map((kata) => kata[0])
        .join('')
        .toUpperCase();
}

/**
 * Umur dalam bulan penuh pada suatu tanggal.
 *
 * Detail anak dulu memakai `pengukuran.umurBulan` - umur anak saat terakhir
 * ditimbang - lalu mencetaknya di sebelah tanggal lahir seolah umur sekarang.
 * Untuk anak yang sudah dua bulan tidak hadir, angkanya salah, dan umur itu
 * juga yang memilih label PB/U atau TB/U serta kalimat cara ukur. Umur harus
 * dihitung terhadap tanggal periode yang sedang dilihat.
 */
export function umurBulanPada(
    tglLahir: string | null,
    tanggal: string | null,
): number | null {
    const lahir = urai(tglLahir);
    const kini = urai(tanggal);

    if (lahir === null || kini === null) {
        return null;
    }

    const bulan = (kini.tahun - lahir.tahun) * 12 + (kini.bulan - lahir.bulan);

    // Bulan belum genap bila tanggalnya belum lewat.
    return Math.max(0, kini.tanggal < lahir.tanggal ? bulan - 1 : bulan);
}

type Bagian = { tanggal: number; bulan: number; tahun: number };

/**
 * Diurai sebagai teks, bukan lewat `new Date`.
 *
 * `new Date('2026-06-13')` dibaca sebagai UTC lalu digeser ke zona waktu
 * setempat, sehingga tanggalnya bisa mundur sehari. Untuk tanggal kegiatan
 * Posyandu, pergeseran itu langsung terlihat salah oleh Bidan.
 */
function urai(iso: string | null): Bagian | null {
    if (iso === null) {
        return null;
    }

    const cocok = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

    if (cocok === null) {
        return null;
    }

    return {
        tahun: Number(cocok[1]),
        bulan: Number(cocok[2]) - 1,
        tanggal: Number(cocok[3]),
    };
}

/**
 * Label indeks mengikuti umur anak.
 *
 * Di bawah 24 bulan anak diukur telentang, jadi panjang badan; di atasnya
 * berdiri, jadi tinggi badan. Ini aturan Permenkes, bukan pilihan aplikasi
 * (docs/10-prd-demo-frontend.md bagian 6.5 dan 9).
 */
export function labelIndeks(indeks: string, umurBulan: number | null): string {
    const berdiri = umurBulan !== null && umurBulan >= 24;

    switch (indeks) {
        case 'BB_U':
            return 'BB/U';

        case 'TB_U':
            return berdiri ? 'TB/U' : 'PB/U';

        case 'BB_TB':
            return berdiri ? 'BB/TB' : 'BB/PB';

        case 'IMT_U':
            return 'IMT/U';

        case 'LILA_U':
            return 'LILA/U';

        default:
            return 'LIKA/U';
    }
}
