const AWALAN_KARTU = 'SPT';
const AWALAN_PAYLOAD = 'SIMPATIK:SASARAN:1';

export type IdentitasKartu = {
    id: number | string;
    nik?: string | null;
};

/** Kode pendek yang dicetak dan dapat diketik jika kamera tidak tersedia. */
export function kodeKartuSasaran(sasaran: IdentitasKartu): string {
    return `${AWALAN_KARTU}-${String(sasaran.id).padStart(8, '0')}`;
}

/** Payload QR berversi agar aplikasi lama dapat menolak format yang tidak dikenal. */
export function payloadKartuSasaran(sasaran: IdentitasKartu): string {
    const nik = sasaran.nik?.replace(/\D/g, '') ?? '';

    return `${AWALAN_PAYLOAD}:${sasaran.id}:${nik}`;
}

/** Mengubah hasil scan atau kode manual menjadi ID sasaran. */
export function bacaIdKartuSasaran(teks: string): string | null {
    const bersih = teks.trim();
    const payload = /^SIMPATIK:SASARAN:1:([^:]+)(?::\d*)?$/i.exec(bersih);

    if (payload !== null) {
        return payload[1];
    }

    const kode = /^SPT-(\d+)$/i.exec(bersih.replace(/\s/g, ''));

    if (kode !== null) {
        return String(Number(kode[1]));
    }

    return null;
}
