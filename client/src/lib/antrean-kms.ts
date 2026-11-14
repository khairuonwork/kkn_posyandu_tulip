export type AntreanKms = {
    id: string;
    anakId: number;
    nomor: number;
    nama: string;
    namaOrtu: string | null;
    rt: string | null;
    status:
        'waiting' | 'called' | 'serving' | 'kms_review' | 'done' | 'cancelled';
    checkedInAt: string;
    urutan?: number;
    prioritasKms?: { skor: number; jumlahT: number; alasan: string[] } | null;
    catatan?: string | null;
    catatanKhusus?: string | null;
    catatanKms?: string | null;
    masihMenyusui?: boolean | null;
    asiEksklusif?: boolean | null;
    /** Jawaban pendaftaran: ibu ber-KB; null = tidak ditanyakan. */
    ikutKb?: boolean | null;
    jenisKb?: string | null;
    kmsPetugasId?: number | null;
    kmsPetugasNama?: string | null;
    mejaKms?: number | null;
    tibaKms?: boolean;
    sudahDiukur?: boolean;
};

export type AksiPanggilan = 'panggil' | 'ulang' | 'tiba' | 'kembalikan';
export type PanggilanKms = { id: string; nomor: number; meja: number; nama?: string | null };

async function mintaKms<T>(
    path: string,
    onSesiBerakhir: () => void,
    opsi: RequestInit,
): Promise<T> {
    const res = await fetch(`/api/v1/${path}`, { cache: 'no-store', ...opsi });

    if (res.status === 401) {
        onSesiBerakhir();

        throw new Error('Sesi telah berakhir. Silakan masuk kembali.');
    }

    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { galat?: string };

        throw new Error(
            body.galat ?? 'Antrean tidak dapat diakses. Coba lagi.',
        );
    }

    return (await res.json()) as T;
}

export function ambilAntreanHariIni(
    signal: AbortSignal,
    onSesiBerakhir: () => void,
) {
    return mintaKms<{ items: AntreanKms[]; mejaKms: number | null }>(
        'antrean-kms',
        onSesiBerakhir,
        { signal },
    );
}

export function ambilPanggilan(
    lingkup: string | null,
    setelah: string | null,
    signal: AbortSignal,
    onSesiBerakhir: () => void,
) {
    const query = new URLSearchParams();

    if (lingkup !== null) {
        query.set('lingkup', lingkup);
    }

    if (setelah !== null) {
        query.set('setelah', setelah);
    }

    return mintaKms<{ panggilan: PanggilanKms[]; lingkup: string | null }>(
        `panggilan-kms?${query}`,
        onSesiBerakhir,
        { signal },
    );
}

export function ubahPanggilanKms(
    id: string,
    aksi: AksiPanggilan,
    meja: number,
    onSesiBerakhir: () => void,
) {
    return mintaKms(
        `antrean-kms/${encodeURIComponent(id)}/panggilan`,
        onSesiBerakhir,
        {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ aksi, meja }),
        },
    );
}

export function konfirmasiSelesaiKms(id: string, onSesiBerakhir: () => void, catatanKms?: string) {
    return mintaKms(
        `antrean/${encodeURIComponent(id)}/konfirmasi-kms`,
        onSesiBerakhir,
        {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(catatanKms?.trim() ? { catatanKms: catatanKms.trim() } : {}),
        },
    );
}

/** Catatan satu bulan, dikelompokkan menurut tahap asalnya. */
export type CatatanBulanan = {
    periode: string;
    tanggal: string | null;
    pendaftaran: {
        catatan: string | null;
        masihMenyusui: boolean | null;
        asiEksklusif: boolean | null;
        ikutKb: boolean | null;
        jenisKb: string | null;
    };
    pengukuran: { catatanKhusus: string | null; catatan: string | null };
    kms: { catatan: string | null; petugasNama: string | null };
};

export async function ambilRiwayatCatatan(
    anakId: number,
    signal: AbortSignal,
    onSesiBerakhir: () => void,
): Promise<CatatanBulanan[]> {
    const hasil = await mintaKms<{ items?: CatatanBulanan[] }>(
        `antrean/riwayat-catatan/${encodeURIComponent(String(anakId))}`,
        onSesiBerakhir,
        { signal },
    );

    return hasil.items ?? [];
}
