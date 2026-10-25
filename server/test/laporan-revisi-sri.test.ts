import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { workbookLaporan } from '../src/services/laporan-export.ts';
import { kategoriDari } from '../src/antropometri/kategori.ts';
import { deskripsiSdLila, kodeNtb } from '../src/services/laporan-tampilan.ts';
import { gabungRiwayat2T } from '../src/services/laporan-riwayat-2t.ts';
import type { BarisArsip2T } from '../src/repositories/riwayat-2t-repository.ts';
import type { BarisBertanda } from '../src/services/laporan-perhitungan.ts';

function anak(tanggalUkur = '2026-09-10'): BarisBertanda {
    return {
        anakId: 1, nama: 'ANAK UJI', nik: null, namaOrtu: null, tglLahir: '2026-03-10',
        jk: 'P', rt: '01', periodeId: '2026-09', tanggalUkur, umurHari: 184,
        umurLengkap: '0Thn6Bln0Hari', bbKg: 7, tinggiCm: 65, lilaCm: 14, likaCm: 42,
        ntobRaw: null, nt: null, jenisUkur: 'PB', statusKehadiran: 'hadir',
        kenaikanGram: null, kbmGram: null, duaT: false, jumlahTBerturut: 0,
        penilaian: Object.fromEntries(['PERMENKES-2-2020','WHO-2006'].map(s => [s, {
            BB_U: {z: -1.99, kategori: kategoriDari('BB_U', -1.99)},
            TB_U: {z: -2.1, kategori: 'Pendek'},
            BB_TB: {z: 1.5, kategori: 'Berisiko gizi lebih'},
            IMT_U: {z: 2.5, kategori: 'Gizi lebih'},
            LILA_U: {z: 0, kategori: null},
            LIKA_U: {z: -2.2, kategori: 'Mikrosefali'},
        }])),
    };
}

async function ekspor(row: BarisBertanda) {
    const data = {periode:'2026-09',standar:[],bulanan:[row],riwayat2T:[{...row,duaT:true,jumlahTBerturut:2}]};
    const book = await workbookLaporan(data);
    const reopened = new ExcelJS.Workbook();
    await reopened.xlsx.load(await book.xlsx.writeBuffer());
    return reopened;
}

test('N/T/B mempertahankan B yang ditandai sumber; pembanding hilang bukan otomatis baru', async () => {
    assert.equal(kodeNtb({nt:null,ntobRaw:' B '}), 'B');
    assert.equal(kodeNtb({nt:null,ntobRaw:'T'}), 'T');
    assert.equal(kodeNtb({nt:null,ntobRaw:null}), null);
    assert.equal(kodeNtb({nt:null,ntobRaw:'TDK'}), null);
    assert.equal(kodeNtb({nt:'N',ntobRaw:'T'}), 'N');
    const book = await ekspor({...anak(),ntobRaw:'B'});
    assert.equal(book.getWorksheet('Rekap Z Score')!.getCell('J5').value, 'N/T/B');
    assert.equal(book.getWorksheet('Rekap Z Score')!.getCell('J7').value, 'B');
    assert.equal(book.getWorksheet('Historis 2T+')!.getCell('L5').value, 'N/T/B');
    assert.equal(book.getWorksheet('Historis 2T+')!.getCell('L7').value, 'B');
});

test('deskripsi LILA menyertakan nol dan kedua batas tanpa mengarang diagnosis', () => {
    assert.equal(deskripsiSdLila(-2.01), 'Di bawah −2 SD');
    for (const z of [-2,0,2]) assert.equal(deskripsiSdLila(z), '−2 s.d. +2 SD');
    assert.equal(deskripsiSdLila(2.01), 'Di atas +2 SD');
    assert.equal(deskripsiSdLila(null), null);
    assert.equal(deskripsiSdLila(Number.NaN), null);
    assert.equal(kategoriDari('LILA_U',0), null);
});

test('ekspor LILA tampil pada enam bulan tepat dan menjelaskan data yang tidak bisa dinilai', async () => {
    const cukup = await ekspor(anak());
    for (const col of ['AB','AD']) assert.equal(cukup.getWorksheet('Rekap Z Score')!.getCell(col+'7').value, '−2 s.d. +2 SD');
    for (const row of [anak('2026-09-09'), {...anak(),lilaCm:null}]) {
        const book = await ekspor(row);
        for (const col of ['AA','AC']) assert.equal(book.getWorksheet('Rekap Z Score')!.getCell(col+'7').value, null);
        for (const col of ['AB','AD']) assert.equal(book.getWorksheet('Rekap Z Score')!.getCell(col+'7').value, row.lilaCm === null ? 'Belum diukur' : 'Di luar usia acuan');
    }
});

test('aturan warna tersimpan untuk seluruh indeks dan historis; −1,96 hanya peringatan internal', async () => {
    const row = anak();
    const sebelum = JSON.stringify(row.penilaian);
    const book = await ekspor(row);
    assert.equal(JSON.stringify(row.penilaian), sebelum);
    assert.equal(book.getWorksheet('Rekap Z Score')!.getCell('K7').value, -1.99);
    assert.equal(book.getWorksheet('Rekap Z Score')!.getCell('L7').value, 'BB Normal');
    assert.equal(book.getWorksheet('Petunjuk')!.getCell('B3').value, -1.96);
    assert.deepEqual(book.definedNames.getRanges('AmbangPeringatanInternal').ranges, ['Petunjuk!$B$3']);
    for (const name of ['Rekap Z Score','Historis 2T+']) {
        // ExcelJS membaca kembali properti OOXML ini, tetapi tipenya belum
        // memasukkan properti yang tersedia saat runtime.
        const rules = (book.getWorksheet(name)! as unknown as {
            conditionalFormattings: {rules: {formulae?: string[]; style?: {font?: {color?: {argb?: string}}}}[]}[];
        }).conditionalFormattings;
        assert.equal(rules.length, 24);
        const warning = rules.filter(x => x.rules.some(r => r.formulae?.[0]?.includes('AmbangPeringatanInternal')));
        assert.equal(warning.length, 12);
        for (const rule of warning) assert.match(rule.rules[0].formulae![0]!, /^AND\(ISNUMBER\(/);
        const status = rules.find(x => x.rules[0].formulae?.[0]?.includes('Di bawah −2 SD'))!;
        assert.ok(status.rules[0].formulae![0]!.includes('Mikrosefali'));
        assert.equal(status.rules[0].style!.font!.color!.argb, 'FFFFFFFF');
        assert.equal(status.rules[1].style!.font!.color!.argb, 'FF9C0006');
    }
});

test('historis memakai pembanding arsip lain sebelum awal tampilan, bukan T otomatis', () => {
    const base = anak();
    const arsip: BarisArsip2T[] = ['2026-07','2026-08','2026-09'].map((p,i) => ({
        ...base,periodeId:p,periodeLaporan:i === 0 ? '2026-07' : '2026-09',
        umurBulan:4+i,jumlahT:2,bbKg:i === 0 ? 6 : 7,sumberFile:'contoh.xlsx',
    }));
    const rows = gabungRiwayat2T([],arsip,'2026-09').rows;
    assert.equal(rows.length,2);
    assert.equal(rows[0].periodeId,'2026-08');
    assert.equal(rows[0].kenaikanGram,1000);
    assert.equal(rows[0].nt,'N');
    assert.equal(rows[0].catatanNt,undefined);
    const tanpa = gabungRiwayat2T([],arsip.slice(1),'2026-09').rows[0];
    assert.equal(tanpa.nt,'T');
    assert.equal(tanpa.kenaikanGram,null);
    assert.match(tanpa.catatanNt!, /arsip 2T/);
});

test('umur arsip lengkap bila pengukuran cocok, dan tidak dibuat-buat bila berbeda', () => {
    const live = anak();
    const source: BarisArsip2T = {...live,periodeLaporan:'2026-09',umurBulan:6,jumlahT:2,sumberFile:'contoh.xlsx'};
    const cocok = gabungRiwayat2T([live],[source],'2026-09').rows[0];
    assert.equal(cocok.umurLengkap,'0Thn6Bln0Hari');
    assert.equal(cocok.tanggalUkur,live.tanggalUkur);
    const beda = gabungRiwayat2T([{...live,bbKg:8}],[source],'2026-09').rows[0];
    assert.match(beda.umurLengkap, /hari tidak tercatat/);
    assert.equal(beda.tanggalUkur,null);
    assert.equal(beda.umurHari,null);
    assert.equal(beda.bbKg,7);
});

 test('warna latar terserialisasi untuk Excel desktop, dan umur lengkap tidak menjadi total hari', async () => {
    const b = await ekspor(anak());
    for (const [name, cell] of [['Rekap Z Score','E7'],['Historis 2T+','G7']]) {
        const sh = b.getWorksheet(name)!;
        assert.equal(sh.getCell(cell).value, '0 Thn 6 Bln 0 Hari');
        const cf = (sh as any).conditionalFormattings;
        for (const item of cf) for (const rule of item.rules) {
            assert.equal(rule.style.fill.bgColor.argb, rule.style.fill.fgColor.argb);
        }
    }
 });

 test('semua segmen status terisi dari skor asli meskipun label arsip kosong atau kedaluwarsa', async () => {
    const row = anak();
    const indices = ['BB_U','TB_U','BB_TB','IMT_U','LILA_U','LIKA_U'];
    const scores = [-2.5,-3.1,0,3.1,2.1,2.1];
    for (const standard of ['PERMENKES-2-2020','WHO-2006']) indices.forEach((id,i) => {
        row.penilaian[standard][id] = {z:scores[i],kategori:standard === 'WHO-2006' ? null : 'Normal'};
    });
    const before = JSON.stringify(row.penilaian);
    const book = await ekspor(row);
    assert.equal(JSON.stringify(row.penilaian),before);
    const labels = ['BB Kurang','Sangat pendek','B-Gizi Baik','Obesitas','Di atas +2 SD','Makrosefali'];
    for (const [name,offset] of [['Rekap Z Score',0],['Historis 2T+',2]] as const) {
        for(let i=0;i<6;i++) for(let j=0;j<2;j++) {
            assert.equal(book.getWorksheet(name)!.getCell(7,12+offset+i*4+j*2).value,labels[i]);
        }
    }
});

test('skor tidak tersedia tidak menghasilkan status normal palsu', async () => {
    const row = anak();
    row.penilaian = {};
    const book = await ekspor(row);
    for (const [name,offset] of [['Rekap Z Score',0],['Historis 2T+',2]] as const) {
        for(let i=0;i<12;i++) assert.equal(book.getWorksheet(name)!.getCell(7,12+offset+i*2).value,'Belum dapat dinilai');
    }
});
