export type JawabanKia = Record<string, 'ya' | 'tidak' | null>;
export type PertanyaanKia = { id: string; teks: string; nomorSumber: number[] };
export type KelompokKia = {
    id: string;
    label: string;
    jenis: 'perkembangan' | 'perawatan';
    halaman: string;
    halamanPdf: number;
    pertanyaan: PertanyaanKia[];
    stimulasi: string[];
    catatanSumber?: string;
};
export type CatatanKia = {
    id: number;
    tanggal: string;
    versiBuku: string;
    kelompokId: string;
    kelompokLabel: string;
    pertanyaan: PertanyaanKia[];
    jawaban: JawabanKia;
    catatan: string;
    tindakLanjut: string;
    dibahas: boolean;
    petugas: string;
    revisi: number;
    halaman: string;
};
export type PendampinganKia = {
    tanggal: string;
    umur: { label: string; bulan: number; hariTotal: number } | null;
    kelompok: KelompokKia | null;
    sumber: { judul: string; versi: string; url: string };
    makan: { halaman: string; halamanPdf: number; isi: string[] } | null;
    layanan: string;
    bahaya: { halaman: string; pesan: string };
    terkini: CatatanKia | null;
    riwayat: CatatanKia[];
};
export type IsianKia = {
    tanggal: string;
    versiBuku: string;
    kelompokId: string;
    revisi: number;
    jawaban: JawabanKia;
    catatan: string;
    tindakLanjut: string;
    dibahas: boolean;
};
export async function ambilPendampinganKia(
    anakId: number,
    signal: AbortSignal,
) {
    return permintaanKia(anakId, { signal });
}
export async function simpanPendampinganKia(anakId: number, isian: IsianKia) {
    return permintaanKia(anakId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isian),
    });
}
async function permintaanKia(
    anakId: number,
    options: RequestInit,
): Promise<PendampinganKia> {
    const response = await fetch(`/api/v1/anak/${anakId}/pendampingan-kia`, {
        ...options,
        credentials: 'same-origin',
        cache: 'no-store',
    });

    if (response.status === 401) {
        throw new Error(
            'Sesi masuk sudah berakhir. Masuk kembali sebelum membuka atau menyimpan survei.',
        );
    }

    const body = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            body?.galat ??
                'Panduan belum dapat dimuat. Periksa sambungan server lalu coba lagi.',
        );
    }

    return body as PendampinganKia;
}
export function hitungJawabanKia(
    pertanyaan: PertanyaanKia[],
    jawaban: JawabanKia,
) {
    const ya = pertanyaan.filter((q) => jawaban[q.id] === 'ya').length;
    const tidak = pertanyaan.filter((q) => jawaban[q.id] === 'tidak').length;

    return {
        ya,
        tidak,
        belum: pertanyaan.length - ya - tidak,
        total: pertanyaan.length,
    };
}
