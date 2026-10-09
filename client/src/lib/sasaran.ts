export type SheetSasaran = {
    sheet: string;
    periode: string;
    labelPeriode: string;
    barisHeader: number;
    jumlahBaris: number;
    jumlahSiap: number;
    jumlahPerluVerifikasi: number;
    jumlahDitahan: number;
    barisVerifikasi: Array<{
        barisAsal: number;
        nama: string;
        masalah: string[];
        ditahan: boolean;
    }>;
};

export type PeriodeSasaran = {
    id: number;
    periode: string;
    label: string;
    tanggalKegiatan: string | null;
    sesiDitutupPada: string | null;
};

export type SasaranAktif = {
    periode: PeriodeSasaran | null;
    ringkasan: {
        total: number;
        menunggu: number;
        selesai: number;
        tidakHadir: number;
        pindah: number;
    };
    items: Array<{
        id: number;
        status: 'menunggu' | 'selesai' | 'tidak_hadir' | 'pindah' | 'batal';
        catatan: string | null;
        anakId: number;
        nik: string | null;
        nama: string;
        tglLahir: string;
        jk: 'L' | 'P';
        namaOrtu: string | null;
        rt: string | null;
        kodeKartu: string;
    }>;
};

export type HasilImpor = {
    importBatchId: number;
    periodeId: number;
    periode: string;
    labelPeriode: string;
    jumlahSasaran: number;
    anakBaru: number;
    anakDiperbarui: number;
    perluVerifikasi: number;
};

export type StatusSasaran = SasaranAktif['items'][number]['status'];
export type CalonSasaran = {
    anakId: number;
    nama: string;
    nik: string | null;
    tglLahir: string;
    jk: 'L' | 'P';
    namaOrtu: string | null;
    rt: string;
};

export type RingkasanResetHariIni = {
    periodeId: number;
    tanggal: string;
    jumlahPengukuran: number;
    jumlahAnak: number;
    jumlahAntrean: number;
    namaAnak: string[];
};

async function galatDari(res: Response): Promise<Error> {
    try {
        const isi = (await res.json()) as { galat?: string };

        return new Error(isi.galat ?? `Permintaan gagal (HTTP ${res.status}).`);
    } catch {
        return new Error(`Permintaan gagal (HTTP ${res.status}).`);
    }
}

function base64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const pembaca = new FileReader();
        pembaca.onerror = () =>
            reject(new Error('File tidak dapat dibaca dari perangkat ini.'));
        pembaca.onload = () => {
            if (typeof pembaca.result !== 'string') {
                reject(new Error('Isi file Excel tidak dikenali.'));

                return;
            }

            resolve(pembaca.result.split(',').pop() ?? '');
        };
        pembaca.readAsDataURL(file);
    });
}

export async function ambilSasaran(periode?: string): Promise<SasaranAktif> {
    const query = periode ? `?periode=${encodeURIComponent(periode)}` : '';
    const res = await fetch(`/api/v1/sasaran${query}`, {
        credentials: 'same-origin',
    });

    if (!res.ok) {
        throw await galatDari(res);
    }

    return (await res.json()) as SasaranAktif;
}

export async function ambilPeriodeSasaran(): Promise<PeriodeSasaran[]> {
    const res = await fetch('/api/v1/sasaran/periode', {
        credentials: 'same-origin',
    });

    if (!res.ok) {
        throw await galatDari(res);
    }

    return (await res.json()) as PeriodeSasaran[];
}

export async function pratinjauResetHariIni(
    periodeId: number,
): Promise<RingkasanResetHariIni> {
    const res = await fetch(
        `/api/v1/sasaran/reset-hari-ini?periodeId=${encodeURIComponent(periodeId)}`,
        { credentials: 'same-origin' },
    );
    if (!res.ok) throw await galatDari(res);
    return (await res.json()) as RingkasanResetHariIni;
}

export async function resetPengukuranHariIni(
    periodeId: number,
    jumlahDikonfirmasi: number,
    jumlahAntreanDikonfirmasi: number,
): Promise<RingkasanResetHariIni> {
    const res = await fetch('/api/v1/sasaran/reset-hari-ini', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodeId, jumlahDikonfirmasi, jumlahAntreanDikonfirmasi, konfirmasi: true }),
    });
    if (!res.ok) throw await galatDari(res);
    return ((await res.json()) as { hasil: RingkasanResetHariIni }).hasil;
}

export async function periksaFileSasaran(
    file: File,
): Promise<{ namaFile: string; sheets: SheetSasaran[]; isiBase64: string }> {
    if (file.size > 3 * 1024 * 1024) {
        throw new Error('Ukuran file melebihi batas 3 MB.');
    }

    const isiBase64 = await base64(file);
    const res = await fetch('/api/v1/sasaran/pratinjau', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaFile: file.name, dataBase64: isiBase64 }),
    });

    if (!res.ok) {
        throw await galatDari(res);
    }

    const isi = (await res.json()) as {
        namaFile: string;
        sheets: SheetSasaran[];
    };

    return { ...isi, isiBase64 };
}

export async function gantiSasaran(
    namaFile: string,
    isiBase64: string,
    sheet: string,
): Promise<HasilImpor> {
    const res = await fetch('/api/v1/sasaran/impor', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaFile, dataBase64: isiBase64, sheet }),
    });

    if (!res.ok) {
        throw await galatDari(res);
    }

    return ((await res.json()) as { hasil: HasilImpor }).hasil;
}

export async function cariCalonSasaran(
    periodeId: number,
    cari: string,
): Promise<CalonSasaran[]> {
    const query = new URLSearchParams({
        periodeId: String(periodeId),
        cari,
    });
    const res = await fetch(`/api/v1/sasaran/calon-anak?${query}`, {
        credentials: 'same-origin',
    });

    if (!res.ok) {
throw await galatDari(res);
}

    return (await res.json()) as CalonSasaran[];
}

export async function tambahAnakKeSasaran(
    periodeId: number,
    anakId: number,
): Promise<{ sasaranId: number; sudahDiukur: boolean }> {
    const res = await fetch('/api/v1/sasaran/manual', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodeId, anakId }),
    });

    if (!res.ok) {
throw await galatDari(res);
}

    return (
        (await res.json()) as {
            hasil: { sasaranId: number; sudahDiukur: boolean };
        }
    ).hasil;
}

export async function perbaruiSasaran(
    sasaranId: number,
    status: StatusSasaran,
    catatan: string,
): Promise<void> {
    const res = await fetch(`/api/v1/sasaran/${sasaranId}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, catatan }),
    });

    if (!res.ok) {
throw await galatDari(res);
}
}
