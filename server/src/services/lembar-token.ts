/**
 * Token tautan Lembar Hasil: payload kecil bertanda tangan HMAC-SHA256.
 *
 * Tanpa tabel di basis data. Orang tua membuka tautan tanpa masuk, jadi
 * tanda tangan itulah satu-satunya kunci: ia tidak dapat dibuat atau diubah
 * tanpa `LEMBAR_RAHASIA`, dan masa berlakunya ikut tertanda tangan.
 *
 * Konsekuensinya, yang sengaja diterima: tautan tidak dapat dicabut satu per
 * satu (mengganti rahasia mencabut semuanya), dan isinya dibaca langsung dari
 * basis data saat dibuka, bukan salinan saat tautan dibuat.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type IsiLembar = {
    anakId: number;
    /** `YYYY-MM`, periode yang hasilnya dikirim. */
    periodeId: string;
    /** Detik sejak epoch. */
    kedaluwarsa: number;
};

/** 20 hari: batas yang ditetapkan pemilik program untuk Lembar Hasil dan PDF-nya. */
export const HARI_LEMBAR = 20;
export const UMUR_LEMBAR_DETIK = HARI_LEMBAR * 24 * 60 * 60;

const tandaTangan = (badan: string, rahasia: string) =>
    createHmac("sha256", rahasia).update(badan).digest("base64url");

export function buatToken(isi: IsiLembar, rahasia: string): string {
    const badan = Buffer.from(JSON.stringify(isi)).toString("base64url");

    return `${badan}.${tandaTangan(badan, rahasia)}`;
}

/** Null bila bukan token kita atau sudah diubah; `'kedaluwarsa'` bila lewat masa. */
export function bacaToken(
    token: string,
    rahasia: string,
    sekarangDetik: number = Math.floor(Date.now() / 1000),
): IsiLembar | "kedaluwarsa" | null {
    const [badan, tanda, sisa] = token.split(".");

    if (badan === undefined || tanda === undefined || sisa !== undefined) {
        return null;
    }

    const harapan = Buffer.from(tandaTangan(badan, rahasia));
    const diterima = Buffer.from(tanda);

    if (
        harapan.length !== diterima.length ||
        !timingSafeEqual(harapan, diterima)
    ) {
        return null;
    }

    try {
        const isi = JSON.parse(
            Buffer.from(badan, "base64url").toString("utf8"),
        ) as Partial<IsiLembar>;

        if (
            !Number.isSafeInteger(isi.anakId) ||
            typeof isi.periodeId !== "string" ||
            !/^\d{4}-\d{2}$/.test(isi.periodeId) ||
            !Number.isSafeInteger(isi.kedaluwarsa)
        ) {
            return null;
        }

        return isi.kedaluwarsa! < sekarangDetik
            ? "kedaluwarsa"
            : (isi as IsiLembar);
    } catch {
        return null;
    }
}
