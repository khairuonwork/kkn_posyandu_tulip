import type { StatusSasaran } from '@/lib/sasaran';

export type Tahap = 'kosong' | 'memeriksa' | 'siap' | 'mengimpor' | 'selesai';

export const LABEL_STATUS: Record<StatusSasaran, string> = {
    menunggu: 'Belum dilayani',
    selesai: 'Selesai',
    tidak_hadir: 'Tidak hadir',
    pindah: 'Pindah',
    batal: 'Dibatalkan',
};

export const WARNA_STATUS: Record<StatusSasaran, string> = {
    menunggu: 'bg-tone-amber-bg text-tone-amber',
    selesai: 'bg-tone-green-bg text-tone-green',
    tidak_hadir: 'bg-surface-subtle text-muted-foreground',
    pindah: 'bg-tone-red-bg text-tone-red',
    batal: 'bg-surface-subtle text-muted-foreground',
};

export function formatPeriode(kode: string | undefined): string {
    if (kode === undefined) {
        return 'Belum dipilih';
    }

    const [tahun, bulan] = kode.split('-').map(Number);

    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(tahun, bulan - 1, 1));
}

export function periodeJakartaSekarang(): string {
    const bagian = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(new Date());
    const nilai = Object.fromEntries(
        bagian.map((item) => [item.type, item.value]),
    );

    return `${nilai.year}-${nilai.month}`;
}
