import assert from 'node:assert/strict';
import { test } from 'node:test';
import { workbookF1 } from '../src/services/f1-export.ts';
import type { AnakF1 } from '../src/services/f1-service.ts';

const anak=(id:number,rt:string,code:string):AnakF1=>({anakId:id,nama:'Anak uji '+id,jk:'L',rt,umur:24,ntob:code,
    gng:'NG',desil:6,asi:null,diukur:true,duaT:false,kategori:'Berat badan normal',bb:12,tanggal:'2026-09-12',
    sumberEkonomi:'Fixture',periodeEkonomi:'2026-09',tidakHadir:false});
const build=(rows:AnakF1[])=>workbookF1({periode:'2026-09',kelompok:[{id:1,nama:'Tulip',rw:'18',kelurahan:'Citeureup',tanggal:'2026-09-12',anak:rows}]});

test('F1 keeps official print bounds, merged headings, month/date and original column dimensions',async()=>{
    const w=await build([anak(1,'01','N')]);const s=w.worksheets[0];
    assert.equal(s.name,'F1_SEPTEMBER 2026');
    assert.equal(s.pageSetup.printArea,'A1:S64');
    assert.equal(s.pageSetup.scale,85);
    assert.equal(s.getColumn('S').width,6.1796875);
    assert.equal(s.getColumn('C').width,20.81640625);
    assert.equal(s.getCell('E5').value,': 12/9/2026');
    assert.equal(s.getCell('E7').value,': TULIP / 018');
    assert.equal(s.getCell('G13').value,'0-5 Bulan');
    assert.equal(s.getCell('O13').value,'36-59 Bulan');
    assert.equal(s.getCell('S13').value,'GRAND TOTAL');
    assert.ok(s.model.merges.includes('S15:S16'));
    assert.equal(s.getCell('E9').value,null,'do not copy example cadre count');
    assert.equal(s.getCell('A67').value,null,'no appended notes inside official print area');
});
test('right-hand raw summary keeps N/T/B layout; O still contributes to total and the main F1',async()=>{
    const w=await build([anak(1,'01','N'),anak(2,'01','O')]);const s=w.getWorksheet('RAW DATA FOR F1_ALL')!;
    assert.equal(s.getCell('Q4').value,'N');assert.equal(s.getCell('S4').value,'T');
    assert.equal(s.getCell('U4').value,'B');assert.equal(s.getCell('W4').value,'TOTAL');
    assert.equal(s.getCell('Q6').result,1);assert.equal(s.getCell('W6').result,2);
    assert.equal(w.worksheets[0].getCell('N23').result,1);
    assert.equal(w.worksheets[0].getCell('N27').result,2);
    assert.ok(String(s.getCell('W6').formula).includes('COUNTIFS'));
    assert.equal(s.getCell('E6').fill.type,'pattern');
    assert.equal((s.getCell('E6').fill as {fgColor?:{argb?:string}}).fgColor?.argb,'FF66FFFF');
    assert.equal((s.getCell('F6').fill as {fgColor?:{argb?:string}}).fgColor?.argb,'FFD9EAD3');
});
test('RT 3 to 7 share a sheet with linked records; RT 1 and 2 keep original names',async()=>{
    const w=await build([anak(1,'01','N'),anak(2,'02','T'),anak(3,'03','B'),anak(4,'07','N')]);
    assert.deepEqual(w.worksheets.map(s=>s.name),['F1_SEPTEMBER 2026','RAW DATA FOR F1_ALL','RAW DATA FOR F1 RT1','RAW DATA FOR F1 RT2','RAW DATA FOR F1 RT3-RT7']);
    const combined=w.worksheets[4];const names:string[]=[];
    combined.eachRow(row=>{if(row.getCell(2).type===6)names.push(String(row.getCell(2).result));});
    assert.deepEqual(names,['Anak uji 3','Anak uji 4']);
    assert.equal(w.worksheets[2].getColumn('O').width,12.54296875);
    assert.equal(w.worksheets[2].getCell('P4').value,'N');
});
