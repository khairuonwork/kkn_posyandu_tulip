export function umurUntukLaporan(
    umurLengkap: string,
    hanyaTahunBulan = false,
): string {
    const lengkap = /^(\d+)Thn(\d+)Bln(?:(\d+)Hari)?$/.exec(umurLengkap ?? '');

    if (lengkap !== null) {
        if (hanyaTahunBulan) {
            return `${Number(lengkap[1])} thn ${Number(lengkap[2])} bln`;
        }

        return `${Number(lengkap[1])} thn ${Number(lengkap[2])} bln${lengkap[3] ? ` ${Number(lengkap[3])} hari` : ''}`;
    }

    const bulanHari = /^(\d+) bulan(?: (\d+) hari)?$/.exec(umurLengkap ?? '');

    if (bulanHari !== null) {
        const bulan = Number(bulanHari[1]);

        if (hanyaTahunBulan) {
            return `${Math.floor(bulan / 12)} thn ${bulan % 12} bln`;
        }

        return `${Math.floor(bulan / 12)} thn ${bulan % 12} bln${bulanHari[2] ? ` ${Number(bulanHari[2])} hari` : ''}`;
    }

    const umurArsip = /^(\d+)Thn(\d+)Bln/.exec(umurLengkap ?? '');

    if (umurArsip) {
        return `${umurArsip[1]} thn ${umurArsip[2]} bln`;
    }

    return umurLengkap || '—';
}
