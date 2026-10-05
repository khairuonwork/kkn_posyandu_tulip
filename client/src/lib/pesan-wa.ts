/**
 * Pesan hasil penimbangan untuk orang tua, dikirim lewat tautan `wa.me`.
 *
 * Murni: tidak membaca lingkungan dan tidak membuka apa pun, sehingga bisa
 * diuji langsung oleh Node. Nomor uji (`VITE_WA_NOMOR_UJI`) dibaca di
 * komponen dialog, bukan di sini.
 *
 * Isi pesan memang masuk ke URL dan sampai ke WhatsApp — itu cara `wa.me`
 * bekerja (docs/prd/feedback/F03-kirim-whatsapp.md bagian 6). Karena itu tidak
 * ada NIK, alamat, atau nama lengkap di dalamnya.
 */

import type { Pengukuran } from '../types/posyandu';
import {
    labelIndeks,
    satuan,
    tanggalPanjang,
    umurPanjang,
    zScore,
} from './format.ts';
import { penilaianLayak } from './penilaian-utama.ts';

export type Kesimpulan = 'sesuai' | 'dipantau' | 'diperiksa';

/**
 * `Nayla Putri Ramadhani` -> `Nayla`. Arsip menulis nama dengan huruf kapital
 * semua; di pesan untuk orang tua itu terbaca seperti berteriak, jadi
 * `ADITAMA` menjadi `Aditama`.
 */
export const namaDepan = (nama: string) => {
    const depan = nama.trim().split(/\s+/)[0] ?? nama;

    return depan === depan.toUpperCase()
        ? depan.charAt(0) + depan.slice(1).toLowerCase()
        : depan;
};

/**
 * Kesimpulan untuk orang tua awam: kalimat pendek yang menyebut nama balita,
 * bukan istilah KMS. Tidak ada "sehat/tidak sehat" — aplikasi menilai
 * pertumbuhan dan gizi, bukan kesehatan secara medis. Anjurannya juga tampil
 * di kartu "Arahan untuk keluarga", supaya petugas tidak membaca satu anjuran
 * di layar dan mengirim anjuran lain.
 */
export function kalimatKesimpulan(
    kesimpulan: Kesimpulan,
    nama: string,
): { judul: string; anjuran: string } {
    const n = namaDepan(nama);

    switch (kesimpulan) {
        case 'sesuai':
            return {
                judul: `Pertumbuhan ${n} baik.`,
                anjuran:
                    'Pertahankan makan beragam sesuai usianya, dan jangan lupa ditimbang lagi bulan depan.',
            };

        case 'dipantau':
            return {
                judul: `Pertumbuhan ${n} perlu diperhatikan.`,
                anjuran:
                    'Mohon perhatikan asupan makannya dan jangan lewatkan penimbangan bulan depan. Kader atau bidan siap membantu bila ada yang ingin ditanyakan.',
            };

        case 'diperiksa':
            return {
                judul: `Sebaiknya ${n} diperiksa ke puskesmas.`,
                anjuran: `Mohon bawa ${n} ke puskesmas atau dokter dalam waktu dekat untuk diperiksa lebih lanjut. Bidan Posyandu siap membantu.`,
            };
    }
}

/**
 * Nomor WhatsApp baku `62…` tanpa `+`, `0`, spasi, atau tanda hubung.
 * Null bila bukan nomor seluler Indonesia yang masuk akal.
 */
export function nomorBaku(mentah: string | null | undefined): string | null {
    const digit = (mentah ?? '').replace(/\D/g, '');
    const baku = digit.startsWith('62')
        ? digit
        : digit.startsWith('0')
          ? `62${digit.slice(1)}`
          : digit.startsWith('8')
            ? `62${digit}`
            : '';

    return /^628\d{8,11}$/.test(baku) ? baku : null;
}

/** `+62 831-8444-7563` — bentuk yang dibaca manusia, bukan yang dikirim. */
export function nomorTampil(baku: string): string {
    const sisa = baku.slice(2);

    return `+62 ${sisa.slice(0, 3)}-${sisa.slice(3, 7)}-${sisa.slice(7)}`;
}

export function tautanWa(nomor: string, pesan: string): string {
    return `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;
}

type Bahan = {
    nama: string;
    umurBulan: number | null;
    terbaru: Pengukuran;
    /** Pengukuran tepat dua bulan sebelumnya, bila ada. */
    duaBulanLalu: Pengukuran | undefined;
    kesimpulan: Kesimpulan;
    /** Tautan Lembar Hasil; baris "Rincian lengkap" hilang bila null. */
    tautan?: string | null;
    lembaga: string;
};

function baris(
    nama: string,
    ukur: string | null,
    kode: string,
    penilaian: ReturnType<typeof penilaianLayak>,
): string | null {
    if (ukur === null) {
        return null;
    }

    const rincian = [
        `${kode} ${zScore(penilaian?.z ?? null)} SD`,
        penilaian?.kategori ?? null,
    ];

    return `• ${[nama, ukur].filter((s) => s !== '').join(' ')}${
        penilaian === undefined
            ? ''
            : ` (${rincian.filter((r) => r !== null).join(', ')})`
    }`;
}

/**
 * Baris yang nilainya tidak ada dihilangkan seluruhnya, tidak dicetak `—`:
 * tanda pisah punya arti di tabel, di pesan untuk orang tua ia membingungkan.
 */
export function susunPesan(b: Bahan): string {
    const { terbaru: t } = b;
    const nama = namaDepan(b.nama);
    const kalimat = kalimatKesimpulan(b.kesimpulan, b.nama);
    const berdiri = b.umurBulan !== null && b.umurBulan >= 24;
    const selisih =
        t.bbKg !== null && b.duaBulanLalu?.bbKg != null
            ? t.bbKg - b.duaBulanLalu.bbKg
            : null;

    const ukur = [
        baris(
            'Berat badan',
            t.bbKg === null ? null : satuan(t.bbKg, 'kg'),
            'BB/U',
            penilaianLayak(t.penilaian.BB_U),
        ),
        baris(
            berdiri ? 'Tinggi badan' : 'Panjang badan',
            t.tinggiCm === null ? null : satuan(t.tinggiCm, 'cm'),
            labelIndeks('TB_U', b.umurBulan),
            penilaianLayak(t.penilaian.TB_U),
        ),
        baris(
            'Status gizi',
            penilaianLayak(t.penilaian.BB_TB) === undefined ? null : '',
            labelIndeks('BB_TB', b.umurBulan),
            penilaianLayak(t.penilaian.BB_TB),
        ),
        baris(
            'Lingkar lengan atas',
            t.lilaCm === null ? null : satuan(t.lilaCm, 'cm'),
            'LILA/U',
            penilaianLayak(t.penilaian.LILA_U),
        ),
        baris(
            'Lingkar kepala',
            t.likaCm === null ? null : satuan(t.likaCm, 'cm'),
            'LIKA/U',
            penilaianLayak(t.penilaian.LIKA_U),
        ),
        selisih === null
            ? null
            : `• Berat badan ${
                  Math.abs(selisih) < 0.05
                      ? 'tetap'
                      : `${selisih > 0 ? 'naik' : 'turun'} ${satuan(Math.abs(selisih), 'kg')}`
              } dibanding 2 bulan lalu`,
    ].filter((l) => l !== null);

    return [
        `Yth. Ibu/Bapak dari ${nama},`,
        `Hasil penimbangan ${tanggalPanjang(t.tanggalUkur)} (umur ${umurPanjang(b.umurBulan)}):`,
        ...ukur,
        '',
        `*${kalimat.judul}*`,
        kalimat.anjuran,
        ...(b.tautan ? ['', `Rincian lengkap dan grafik: ${b.tautan}`] : []),
        '',
        b.lembaga,
    ].join('\n');
}
