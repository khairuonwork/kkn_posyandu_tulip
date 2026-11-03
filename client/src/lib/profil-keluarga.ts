type DesilProfil = { desil?: number | null; desilKelompok?: '6-10' | null };

export const PILIHAN_DESIL = ['', '1', '2', '3', '4', '5', '6-10'] as const;

export function pilihanDesil(data: DesilProfil): string {
    if (
        data.desilKelompok === '6-10' ||
        (data.desil != null && data.desil >= 6)
    ) {
        return '6-10';
    }

    return data.desil == null ? '' : String(data.desil);
}

export function labelDesil(pilihan: string): string {
    if (pilihan === '') {
        return 'Belum tercatat';
    }

    return `Desil ${pilihan} · ${Number(pilihan) <= 4 ? 'G (Gakin)' : 'NG (Non Gakin)'}`;
}

export function perubahanDesil(pilihan: string) {
    return {
        desil: pilihan === '' || pilihan === '6-10' ? null : Number(pilihan),
        desilKelompok: pilihan === '6-10' ? ('6-10' as const) : null,
    };
}
