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

const TIDAK_MENJAWAB =
    'Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.';

/**
 * Meminta JSON dari API sasaran. Pesan dari server (mis. isi Excel yang
 * ditolak) diteruskan apa adanya; gangguan jaringan, kode HTTP tanpa pesan,
 * atau jawaban yang bukan JSON menjadi satu kalimat yang bisa dipahami
 * petugas, bukan "Unexpected token '<'".
 */
async function minta<T>(url: string, init?: RequestInit): Promise<T> {
    let res: Response;

    try {
        res = await fetch(url, { credentials: 'same-origin', ...init });
    } catch {
        throw new Error(TIDAK_MENJAWAB);
    }

    if (!res.ok) {
        const isi = (await res.json().catch(() => null)) as {
            galat?: string;
        } | null;

        throw new Error(isi?.galat ?? TIDAK_MENJAWAB);
    }

    try {
        return (await res.json()) as T;
    } catch {
        throw new Error(TIDAK_MENJAWAB);
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
    return minta<SasaranAktif>('/api/v1/sasaran');
}

export async function periksaFileSasaran(
    file: File,
): Promise<{ namaFile: string; sheets: SheetSasaran[]; isiBase64: string }> {
    if (file.size > 3 * 1024 * 1024) {
        throw new Error('Ukuran file melebihi batas 3 MB.');
    }

    const isiBase64 = await base64(file);
    const isi = await minta<{ namaFile: string; sheets: SheetSasaran[] }>(
        '/api/v1/sasaran/pratinjau',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                namaFile: file.name,
                dataBase64: isiBase64,
            }),
        },
    );

    return { ...isi, isiBase64 };
}

export async function gantiSasaran(
    namaFile: string,
    isiBase64: string,
    sheet: string,
): Promise<HasilImpor> {
    const isi = await minta<{ hasil: HasilImpor }>('/api/v1/sasaran/impor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaFile, dataBase64: isiBase64, sheet }),
    });

    return isi.hasil;
}
