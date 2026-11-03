import { KELOMPOK_KIA } from "../edukasi/kia-2024.ts";

export const KELOMPOK_PERKEMBANGAN = KELOMPOK_KIA.filter(
    (k) => k.jenis === "perkembangan",
).map((k) => k.id);

const keterangan = new Map(
    KELOMPOK_KIA.filter((k) => k.jenis === "perkembangan").flatMap((k) =>
        k.pertanyaan.map(
            (q) =>
                [
                    q.teks,
                    `Belum ${q.teks.replace(/^(Bayi|Anak) /, "").replace(/\?$/, "")}`,
                ] as const,
        ),
    ),
);

export function keteranganKemampuan(teks: string): string {
    return keterangan.get(teks) ?? `Jawaban: Tidak. Pertanyaan: ${teks}`;
}
