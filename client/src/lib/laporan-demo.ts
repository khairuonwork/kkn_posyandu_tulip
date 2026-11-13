import { laporanDemo } from '@/data/contoh/store';

export async function unduhLaporanDemo(periode: string, format: 'zscore' | 'f1', rt: string | null) {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const data = laporanDemo(periode);
    const baris = data.bulanan.filter((item) => rt === null || item.rt === rt);
    const petunjuk = workbook.addWorksheet('Petunjuk');
    petunjuk.addRow(['SIMULASI DEMO', `Data contoh periode ${periode}; bukan laporan resmi.`]);
    petunjuk.getColumn(2).width = 75;

    if (format === 'f1') {
        const sheet = workbook.addWorksheet('RAW DATA FOR F1_ALL');
        sheet.addRow(['SIMULASI DEMO - DATA BALITA HASIL BULAN PENIMBANGAN', periode]);
        sheet.addRow(['NO', 'NAMA BALITA', 'UMUR (bln)', 'L/P', 'NTOB', 'MAMPU', 'TDK MAMPU', 'RT', 'DITIMBANG', 'KMS', '2T+', 'STATUS BB/U', 'BB (kg)', 'ASI EXCL?']);
        baris.forEach((r, i) => sheet.addRow([i + 1, r.nama, r.umurHari === null ? null : Math.floor(r.umurHari / 30), r.jk, r.ntobRaw, null, null, r.rt, 1, null, r.duaT ? 1 : 0, r.penilaian['PERMENKES-2-2020']?.BB_U?.kategori ?? null, r.bbKg, null]));
        sheet.getColumn(2).width = 28;
        petunjuk.addRow(['F1', 'Data mentah contoh saja; kolom tanpa sumber dikosongkan. Bukan formulir F1 resmi lengkap.']);
    } else {
        const buatSheet = (nama: string, rows: typeof baris) => {
            const sheet = workbook.addWorksheet(nama);
            sheet.addRow(['SIMULASI DEMO', periode]);
            sheet.addRow(['Nama', 'RT', 'Jenis kelamin', 'Umur', 'Tanggal ukur', 'BB (kg)', 'TB/PB (cm)', 'LILA', 'LIKA', 'N/T', 'Z BB/U', 'Z TB/U', 'Z BB/TB', 'Z IMT/U', 'Z LILA/U', 'Z LIKA/U']);
            rows.forEach((r) => sheet.addRow([r.nama, r.rt, r.jk, r.umurLengkap, r.tanggalUkur, r.bbKg, r.tinggiCm, r.lilaCm, r.likaCm, r.ntobRaw, ...['BB_U', 'TB_U', 'BB_TB', 'IMT_U', 'LILA_U', 'LIKA_U'].map((k) => r.penilaian['PERMENKES-2-2020']?.[k]?.z ?? null)]));
            sheet.getColumn(1).width = 28;
            sheet.views = [{ state: 'frozen', ySplit: 2 }];
        };
        buatSheet('Rekap Z Score', baris);
        buatSheet('Historis 2T+', data.riwayat2T.filter((item) => rt === null || item.rt === rt));
    }
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `demo-${format}-${periode}.xlsx`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
