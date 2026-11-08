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
    /** Jawaban pendaftaran (APK); null = tidak ditanyakan karena usia. */
    masihMenyusui?: boolean | null;
    asiEksklusif?: boolean | null;
    /** Catatan/pengamatan khusus dari meja pencatatan (APK). */
    catatanKhusus?: string | null;
    /** Catatan/pengamatan khusus KMS, mis. 2T, 3T, atau anak sakit. */
    catatanKms?: string | null;
};

export async function ambilAntreanHariIni(
    periodeId: string,
    signal: AbortSignal,
    onSesiBerakhir: () => void,
): Promise<AntreanKms[]> {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const date = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
    );
    const tanggal = `${date.year}-${date.month}-${date.day}`;
    const params = new URLSearchParams({ periodeId, tanggal });
    const res = await fetch(`/api/v1/antrean?${params}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
    });

    if (res.status === 401) {
        onSesiBerakhir();

        throw new Error('Sesi telah berakhir. Silakan masuk kembali.');
    }

    const body = (await res.json().catch(() => ({}))) as {
        items?: AntreanKms[];
        galat?: string;
    };

    if (!res.ok) {
        throw new Error(
            body.galat ?? `Antrean gagal dimuat (HTTP ${res.status}).`,
        );
    }

    return body.items ?? [];
}

export async function konfirmasiSelesaiKms(
    id: string,
    onSesiBerakhir: () => void,
    catatanKms?: string,
): Promise<void> {
    const catatan = catatanKms?.trim();
    const res = await fetch(
        `/api/v1/antrean/${encodeURIComponent(id)}/konfirmasi-kms`,
        {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(catatan ? { catatanKms: catatan } : {}),
        },
    );

    if (res.status === 401) {
        onSesiBerakhir();

        throw new Error('Sesi telah berakhir. Silakan masuk kembali.');
    }

    if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { galat?: string };

        throw new Error(body.galat ?? `Konfirmasi gagal (HTTP ${res.status}).`);
    }
}
