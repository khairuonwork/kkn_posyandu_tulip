import ExcelJS from 'exceljs';

export type SumberF1 = { nama: string; jk: string; rt: string; gng: 'G' | 'NG' | null; desil: number | null; asi: boolean | null };
export function kategoriEkonomi(desil: number | null, gng: unknown): 'G' | 'NG' | null {
    if (desil !== null && Number.isInteger(desil) && desil >= 1 && desil <= 10) return desil <= 4 ? 'G' : 'NG';
    return gng === 'G' || gng === 'NG' ? gng : null;
}
export const namaF1 = (s: string) => s.normalize('NFKC').toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
export const rtF1 = (s: string) => String(Number(s));

/** Membaca RAW DATA FOR F1_ALL yang diminta Bu Sri, tidak mengubah berkas. */
export async function bacaSumberF1(path: string): Promise<SumberF1[]> {
    const w = new ExcelJS.Workbook();
    await w.xlsx.readFile(path);
    const s = w.getWorksheet('RAW DATA FOR F1_ALL');
    if (!s) throw new RangeError('Sheet RAW DATA FOR F1_ALL tidak ditemukan.');
    const hasil: SumberF1[] = [];
    const keys = new Set<string>();
    let selesai = false;
    s.eachRow((row, r) => {
        // Template menyimpan salinan tabel di bawah judul kedua. Hanya tabel
        // pertama yang menjadi sumber; jangan menghitung ulang salinannya.
        if (r > 6 && row.getCell(1).text.startsWith('DATA BALITA HASIL')) selesai = true;
        if (selesai || r < 6 || !['L', 'P'].includes(row.getCell(4).text.trim().toUpperCase())) return;
        const nama = row.getCell(2).text.trim(), jk = row.getCell(4).text.trim().toUpperCase(), rt = row.getCell(8).text.trim();
        if (!nama || !/^\d+$/.test(rt)) return;
        const mampu = row.getCell(6).text.trim().toUpperCase(), tidak = row.getCell(7).text.trim().toUpperCase();
        if (mampu === 'NG' && tidak === 'G') throw new RangeError(`Kategori ganda pada baris ${r}.`);
        const key = `${namaF1(nama)}|${jk}|${rtF1(rt)}`;
        if (keys.has(key)) throw new RangeError(`Anak berulang pada baris ${r}; periksa sumber sebelum impor.`);
        keys.add(key);
        const asi = row.getCell(14).text.trim().toUpperCase();
        hasil.push({nama, jk, rt, gng: tidak === 'G' ? 'G' : mampu === 'NG' ? 'NG' : null, desil: null,
            asi: ['Y','YA'].includes(asi) ? true : ['T','TIDAK'].includes(asi) ? false : null});
    });
    if (!hasil.length) throw new RangeError('Tidak ada baris sumber F1 yang dapat dibaca.');
    return hasil;
}
