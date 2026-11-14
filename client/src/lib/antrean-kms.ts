export type PrioritasKms = {
    skor: number;
    jumlahT: number;
    /** Label singkat, mis. "2T" atau "Gizi kurang". */
    alasan: string[];
};

export type AntreanKms = {
    id: string;
    anakId: number;
    nomor: number;
    urutan?: number;
    nama: string;
    namaOrtu: string | null;
    rt: string | null;
    status:
        'waiting' | 'called' | 'serving' | 'kms_review' | 'done' | 'cancelled';
    checkedInAt: string;
    updatedAt?: string;
    /** Catatan meja pendaftaran (saat check-in antrean). */
    catatan?: string | null;
    /** Jawaban pendaftaran (APK); null = tidak ditanyakan karena usia. */
    masihMenyusui?: boolean | null;
    asiEksklusif?: boolean | null;
    /** Jawaban pendaftaran: ibu ber-KB; null = tidak ditanyakan. */
    ikutKb?: boolean | null;
    jenisKb?: string | null;
    /** Catatan/pengamatan khusus dari meja pencatatan (APK). */
    catatanKhusus?: string | null;
    /** Catatan/pengamatan khusus KMS, mis. 2T, 3T, atau anak sakit. */
    catatanKms?: string | null;
    /** Akun KMS yang memanggil/memeriksa; tetap terisi setelah selesai. */
    kmsPetugasId?: number | null;
    kmsPetugasNama?: string | null;
    kmsDipanggilPada?: string | null;
    /** true bila akun yang sedang masuk adalah pemeriksanya. */
    kmsMilikSaya?: boolean;
    prioritasKms?: PrioritasKms | null;
};

export function tanggalHariIniJakarta(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const date = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
    );

    return `${date.year}-${date.month}-${date.day}`;
}

async function kirim<T>(
    url: string,
    body: unknown,
    onSesiBerakhir: () => void,
    pesanGagal: string,
): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (res.status === 401) {
        onSesiBerakhir();

        throw new Error('Sesi telah berakhir. Silakan masuk kembali.');
    }

    const isi = (await res.json().catch(() => ({}))) as T & {
        galat?: string;
    };

    if (!res.ok) {
        throw new Error(isi.galat ?? `${pesanGagal} (HTTP ${res.status}).`);
    }

    return isi;
}

export async function ambilAntreanHariIni(
    periodeId: string,
    signal: AbortSignal,
    onSesiBerakhir: () => void,
): Promise<AntreanKms[]> {
    const params = new URLSearchParams({
        periodeId,
        tanggal: tanggalHariIniJakarta(),
    });
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
    const res = await fetch(
        `/api/v1/antrean/riwayat-catatan/${encodeURIComponent(String(anakId))}`,
        { credentials: 'same-origin', cache: 'no-store', signal },
    );

    if (res.status === 401) {
        onSesiBerakhir();

        throw new Error('Sesi telah berakhir. Silakan masuk kembali.');
    }

    const body = (await res.json().catch(() => ({}))) as {
        items?: CatatanBulanan[];
        galat?: string;
    };

    if (!res.ok) {
        throw new Error(
            body.galat ?? `Riwayat catatan gagal dimuat (HTTP ${res.status}).`,
        );
    }

    return body.items ?? [];
}

/** Memanggil anak berprioritas tertinggi; null bila antrean KMS kosong. */
export async function panggilKmsBerikutnya(
    periodeId: string,
    onSesiBerakhir: () => void,
): Promise<AntreanKms | null> {
    const hasil = await kirim<{ item: AntreanKms | null }>(
        '/api/v1/antrean/panggil-kms-berikutnya',
        { periodeId, tanggal: tanggalHariIniJakarta() },
        onSesiBerakhir,
        'Panggilan gagal',
    );

    return hasil.item;
}

export async function panggilKms(
    id: string,
    onSesiBerakhir: () => void,
): Promise<AntreanKms> {
    return (
        await kirim<{ item: AntreanKms }>(
            `/api/v1/antrean/${encodeURIComponent(id)}/panggil-kms`,
            {},
            onSesiBerakhir,
            'Panggilan gagal',
        )
    ).item;
}

export async function lepasKms(
    id: string,
    onSesiBerakhir: () => void,
): Promise<void> {
    await kirim(
        `/api/v1/antrean/${encodeURIComponent(id)}/lepas-kms`,
        {},
        onSesiBerakhir,
        'Gagal mengembalikan ke antrean',
    );
}

export async function konfirmasiSelesaiKms(
    id: string,
    onSesiBerakhir: () => void,
    catatanKms?: string,
): Promise<void> {
    const catatan = catatanKms?.trim();
    await kirim(
        `/api/v1/antrean/${encodeURIComponent(id)}/konfirmasi-kms`,
        catatan ? { catatanKms: catatan } : {},
        onSesiBerakhir,
        'Konfirmasi gagal',
    );
}

/** Urutan tampil: prioritas tertinggi dahulu, lalu urutan datang. */
export function urutkanAntreanKms(items: AntreanKms[]): AntreanKms[] {
    return [...items].sort(
        (a, b) =>
            (b.prioritasKms?.skor ?? 0) - (a.prioritasKms?.skor ?? 0) ||
            (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '') ||
            (a.urutan ?? a.nomor) - (b.urutan ?? b.nomor),
    );
}
