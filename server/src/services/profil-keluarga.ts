export function validasiProfilKeluarga(
    data: Record<string, unknown>,
    namaOrtu: string,
) {
    if (data.desilKelompok !== undefined && data.desilKelompok !== null && data.desilKelompok !== '6-10')
        throw new Error('Kelompok Desil harus 6-10.');
    if (data.desilKelompok === '6-10' && data.desil != null)
        throw new Error('Kelompok Desil tidak boleh disertai angka desil.');
    if (data.jenisKb !== undefined && data.jenisKb !== null && typeof data.jenisKb !== 'string')
        throw new Error('Jenis KB harus berupa teks.');
    const jenisKb = typeof data.jenisKb === 'string'
        ? data.jenisKb.trim().replace(/\s+/g, ' ') || null
        : data.jenisKb as null | undefined;
    if (jenisKb && jenisKb.length > 100) throw new Error('Jenis KB maksimal 100 karakter.');
    if (jenisKb && namaOrtu === '') throw new Error('Isi nama orang tua untuk menyimpan Jenis KB.');
    return {
        jenisKb,
        desilKelompok: data.desilKelompok as '6-10' | null | undefined,
    };
}
