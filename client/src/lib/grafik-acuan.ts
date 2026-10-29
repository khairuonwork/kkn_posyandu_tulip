/** Garis acuan KIA; Kurva KMS memakai paletnya sendiri. */
export function warnaGarisSd(z: number): string {
    if (Math.abs(z) === 3) {
        return '#16211C';
    }

    if (Math.abs(z) === 2) {
        return '#C52F39';
    }

    if (Math.abs(z) === 1) {
        return '#A65B13';
    }

    return '#167044';
}

/** Umur bulan genap bisa meloncat walaupun kegiatan berada di bulan berurutan. */
export function periodeGrafikBersambung(
    sebelum: string,
    sesudah: string,
): boolean {
    const format = /^\d{4}-(0[1-9]|1[0-2])$/;

    if (!format.test(sebelum) || !format.test(sesudah)) {
return false;
}

    const bulan = (p: string) =>
        Number(p.slice(0, 4)) * 12 + Number(p.slice(5));
    const jarak = bulan(sesudah) - bulan(sebelum);

    return jarak >= 0 && jarak <= 1;
}
