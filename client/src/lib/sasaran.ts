export type SheetSasaran = {
    sheet: string;
    periode: string;
    labelPeriode: string;
    barisHeader: number;
    jumlahBaris: number;
    jumlahSiap: number;
    jumlahPerluVerifikasi: number;
};

export type SasaranAktif = {
    periode: null | {
        id: number;
        periode: string;
        label: string;
        tanggalKegiatan: string | null;
        sesiDitutupPada: string | null;
    };
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

export async function ambilSasaran(): Promise<SasaranAktif> {
    const res = await fetch('/api/v1/sasaran', { credentials: 'same-origin' });

    if (!res.ok) {
        throw await galatDari(res);
    }

    return (await res.json()) as SasaranAktif;
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
