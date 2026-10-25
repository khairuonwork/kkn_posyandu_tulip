import ExcelJS from 'exceljs';
import { formatF1, gayaF1, layoutF1 } from './f1-layout.ts';
import { namaPeriode } from './laporan-excel-layout.ts';
import type { AnakF1, DataF1, KelompokF1 } from './f1-service.ts';

const fill=(argb:string):ExcelJS.Fill=>({type:'pattern',pattern:'solid',fgColor:{argb},bgColor:{argb}});
const border:ExcelJS.Border={style:'thin',color:{argb:'FF666666'}};
const form=(s:ExcelJS.Worksheet,cell:string,formula:string,result:number|string)=>{s.getCell(cell).value={formula,result};};
const col=(n:number)=>{let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const text=(s:ExcelJS.Worksheet,cell:string,value:ExcelJS.CellValue)=>{s.getCell(cell).value=value;};
const q=(s:string)=>`'${s.replaceAll("'","''")}'`;
const fmt='#,##0;[Red](#,##0);"-"';
const editable=(c:ExcelJS.Cell)=>{c.fill=fill('FFFFF2CC');c.font={name:'Arial',size:10,color:{argb:'FF000000'}};};

function raw(w:ExcelJS.Workbook,name:string,g:KelompokF1,periode:string,rows:AnakF1[],origin?:{name:string;indices:number[]},combined=false) {
    const reference=!origin?'RAW DATA FOR F1_ALL':combined?'RAW DATA FOR F1 RT3-RT7':/RT1(?: |$)/.test(name)?'RAW DATA FOR F1 RT1':'RAW DATA FOR F1 RT2';
    const s=w.addWorksheet(name);formatF1(s,reference);
    const right=reference==='RAW DATA FOR F1 RT1'?15:16;
    const lookup=new Map(rows.map((a,i)=>[a.anakId,origin?.indices[i]]));
    const blocks=combined&&rows.length?[...new Set(rows.map(a=>a.rt))].sort().map(rt=>rows.filter(a=>a.rt===rt)):[rows];
    let base=6;
    for(const block of blocks) {
        const title=base-5,header=base-1;
        for(let r=title;r<=header;r++)s.getRow(r).height=layoutF1(reference).rows[r-title]?.height ?? 15;
        for(let i=0;i<3;i++)s.mergeCells(title+i,1,title+i,4);
        text(s,'A'+title,'DATA BALITA HASIL BULAN PENIMBANGAN BALITA (BPB)');
        const [year,month]=periode.split('-');
        text(s,'A'+(title+1),'BULAN '+namaPeriode(periode).replace(' '+year,'')+' TAHUN '+year+' DI POSYANDU " '+g.nama.toUpperCase()+' " RW '+g.rw);
        text(s,'A'+(title+2),'KELURAHAN '+g.kelurahan.toUpperCase()+' PUSKESMAS '+g.kelurahan.toUpperCase());
        for(let i=0;i<3;i++)s.getCell(title+i,1).style=gayaF1(reference,'A'+(i+1));
        text(s,col(right)+(title+1),origin?'RT'+Number(block[0]?.rt??0):'ALL');
        const headers=['NO','NAMA BALITA','UMUR  (bln)','"L/P"','NTOB','MAMPU','TDK MAMPU','RT','DITIMBANG','KMS','2T+','STATUS BB/U','BB (kg)','ASI EXCL?.'];
        headers.forEach((v,i)=>{text(s,col(i+1)+header,v);s.getCell(header,i+1).style=gayaF1(reference,col(i+1)+'5');});
        block.forEach((a,i)=>{
            const r=base+i;s.getRow(r).height=layoutF1(reference).rows[5]?.height ?? 15;
            const values:ExcelJS.CellValue[]=[i+1,a.nama,a.umur,a.jk,a.ntob,a.gng==='NG'?'NG':null,a.gng==='G'?'G':null,a.rt,a.diukur?1:0,1,a.duaT===null?null:a.duaT?1:0,a.kategori,a.bb,a.asi===null?null:a.asi?'Y':'T'];
            values.forEach((v,j)=>{
                const c=s.getCell(r,j+1);c.style=gayaF1(reference,col(j+1)+(a.jk==='P'?({'RAW DATA FOR F1_ALL':50,'RAW DATA FOR F1 RT1':25,'RAW DATA FOR F1 RT2':15,'RAW DATA FOR F1 RT3-RT7':9}[reference]):6));
                const from=(lookup.get(a.anakId)??0)+6;
                c.value=origin?{formula:'IF('+q(origin.name)+'!'+col(j+1)+from+'="","",'+q(origin.name)+'!'+col(j+1)+from+')',result:(v??'') as string|number}:v;
            });
            // NG uses the green source style; the other economic column stays white.
            s.getCell('F'+r).style=gayaF1(reference,a.gng==='NG'?'F7':'F6');
            s.getCell('G'+r).style=gayaF1(reference,'G6');
            if(!origin)for(const [c,list] of [['E','N,T,O,B'],['F','NG'],['G','G'],['N','Y,T']])s.getCell(c+r).dataValidation={type:'list',allowBlank:true,formulae:['"'+list+'"']};
            [a.anakId,a.desil,a.sumberEkonomi,a.periodeEkonomi,a.tanggal,a.tidakHadir?'Ya':null].forEach((v,j)=>text(s,col(29+j)+r,v));
        });
        const end=Math.max(base,base+block.length-1);
        let sr=base-2;
        for(const jk of ['L','P']) {
            text(s,col(right)+sr,jk==='L'?'LAKI-LAKI':'PEREMPUAN');
            for(const [i,k] of ['N','T','B','TOTAL'].entries()){
                s.mergeCells(sr,right+1+i*2,sr,right+2+i*2);text(s,col(right+1+i*2)+sr,k);
            }
            text(s,col(right)+(sr+1),'UMUR');
            for(let c=right+1;c<=right+8;c++)text(s,col(c)+(sr+1),(c-right)%2?'NG':'G');
            const ages=[...new Set(block.filter(a=>a.jk===jk&&a.umur!==null).map(a=>a.umur!))].sort((a,b)=>a-b);
            for(const [i,age] of ages.entries()) {
                const r=sr+2+i;text(s,col(right)+r,age);
                for(let offset=1;offset<=8;offset++) {
                    const c=right+offset,eco=offset%2?'NG':'G',ec=eco==='NG'?'F':'G',code=['N','T','B'][Math.floor((offset-1)/2)];
                    const total=offset>6;
                    const count=block.filter(a=>a.jk===jk&&a.umur===age&&a.diukur&&a.gng===eco&&(total||a.ntob===code)).length;
                    form(s,col(c)+r,'COUNTIFS($C$'+base+':$C$'+end+',$'+col(right)+r+',$D$'+base+':$D$'+end+',"'+jk+'",$'+ec+'$'+base+':$'+ec+'$'+end+',"'+eco+'",$I$'+base+':$I$'+end+',1'+(total?'':',$E$'+base+':$E$'+end+',"'+code+'"')+')',count);
                }
            }
            const totalRow=sr+2+ages.length;
            for(let c=right+1;c<=right+8;c++)form(s,col(c)+totalRow,ages.length?'SUM('+col(c)+(sr+2)+':'+col(c)+(totalRow-1)+')':'0',ages.reduce((n,_,i)=>n+Number(s.getCell(sr+2+i,c).result??0),0));
            for(let r=sr;r<=totalRow;r++)for(let c=right;c<=right+8;c++){
                const refCol=col(16+c-right);
                const refRow=r===totalRow?38:jk==='P'?(r===sr?50:r===sr+1?51:52):(r===sr?4:r===sr+1?5:6);
                s.getCell(r,c).style=gayaF1('RAW DATA FOR F1_ALL',refCol+refRow);
            }
            sr=Math.max(totalRow+3,base+block.filter(a=>a.jk==='L').length);
        }
        base=Math.max(end+7,sr+5);
    }
    for(let c=9;c<=13;c++)s.getColumn(c).hidden=true;
    for(let c=29;c<=34;c++)s.getColumn(c).hidden=true;
    // The reference's raw print area only covers its heading. Extend vertically
    // to include the generated data, while preserving widths and column order.
    s.pageSetup={...structuredClone(layoutF1(reference).pageSetup),printArea:'A1:'+col(right+8)+(base-5)};
    return s;
}

async function utama(w:ExcelJS.Workbook,name:string,g:KelompokF1,periode:string,rawName:string) {
    const s=w.addWorksheet(name);
    formatF1(s,'F1_SEPTEMBER 2026',true);
    text(s,'A1',`(FI / FII / GIZI / ${periode.slice(0,4)})`);
    text(s,'E3',': '+g.kelurahan.toUpperCase());text(s,'E4',': '+namaPeriode(periode).replace(/ \d{4}$/,''));text(s,'E5',g.tanggal?': '+g.tanggal.split('-').reverse().map(Number).join('/'):null);
    text(s,'E7',`: ${g.nama.toUpperCase()} / ${g.rw.padStart(3,'0')}`);
    for(const cell of ['E8','E9','E10','E11','F47','G47','F48','G48','D60','D61','D62','D63','D64'])text(s,cell,null);
    const end=Math.max(6,g.anak.length+5),ref=(c:string)=>`${q(rawName)}!$${c}$6:$${c}$${end}`;
    const rows=[15,17,19,21,23,25,27,29,31,33,35,37];
    const groups=[[0,5],[6,11],[12,23],[24,35],[36,59]];
    for(const r0 of rows)for(let sex=0;sex<2;sex++) {
        const r=r0+sex,jk=sex?'P':'L';
        for(let i=0;i<10;i++) {
            const c=col(7+i),[min,max]=groups[Math.floor(i/2)],eco=i%2?'NG':'G',ec=i%2?'F':'G';
            const eligible=g.anak.filter(a=>a.jk===jk&&a.umur!==null&&a.umur>=min&&a.umur<=max);
            const base=`${ref('D')},"${jk}",${ref('C')},">=${min}",${ref('C')},"<=${max}"`;
            const classified=eligible.filter(a=>a.gng===eco);
            let suffix='',predicate=(a:AnakF1)=>true,unknown=(a:AnakF1)=>a.gng===null;
            if([19,21,23,25].includes(r0)) {
                const code=({19:'N',21:'T',23:'O',25:'B'} as Record<number,string>)[r0];
                suffix=`,${ref('I')},1,${ref('E')},"${code}"`;predicate=a=>a.diukur&&a.ntob===code;
                unknown=a=>a.gng===null||(a.diukur&&a.ntob===null);
            }
            if(r0===29){suffix=`,${ref('I')},0`;predicate=a=>!a.diukur;}
            if(r0===33){suffix=`,${ref('K')},1`;predicate=a=>a.duaT===true;unknown=a=>a.gng===null||(a.diukur&&a.duaT===null);}
            if([35,37].includes(r0)){
                const kat=r0===35?'Berat badan sangat kurang':'Berat badan kurang';
                suffix=`,${ref('L')},"${kat}"`;predicate=a=>a.kategori===kat;unknown=a=>a.gng===null||(a.diukur&&a.kategori===null);
            }
            const missing=eligible.some(unknown);
            const count=classified.filter(predicate).length;
            if(r0===31){text(s,c+r,null);continue;}
            if(r0===27){
                const cells=[19,21,23,25].map(n=>c+(n+sex));
                form(s,c+r,`IF(COUNT(${cells.join(',')})=4,SUM(${cells.join(',')}),"?")`,eligible.some(a=>a.gng===null||(a.diukur&&a.ntob===null))?'?':classified.filter(a=>a.diukur).length);
                continue;
            }
            // Blank category must never disappear into a reassuring zero. Excel
            // recomputes this guard when staff complete the yellow source cells.
            let guard=`COUNTIFS(${base},${ref('F')},"",${ref('G')},"")+COUNTIFS(${base},${ref('F')},"NG",${ref('G')},"G")`;
            if([19,21,23,25].includes(r0))guard+=`+COUNTIFS(${base},${ref('I')},1,${ref('E')},"")`;
            if(r0===33)guard+=`+COUNTIFS(${base},${ref('I')},1,${ref('K')},"")`;
            if([35,37].includes(r0))guard+=`+COUNTIFS(${base},${ref('I')},1,${ref('L')},"")`;
            form(s,c+r,`IF(${guard}>0,"?",COUNTIFS(${base},${ref(ec)},"${eco}"${suffix}))`,missing?'?':count);
        }
        for(const [c,cs] of [['Q',['G','I','K','M','O']],['R',['H','J','L','N','P']]] as const){
            const cells=cs.map(c=>c+r);const vals=cells.map(c=>s.getCell(c).result);
            form(s,c+r,`IF(COUNT(${cells.join(',')})=5,SUM(${cells.join(',')}),"?")`,vals.every(v=>typeof v==='number')?vals.reduce((a,b)=>Number(a)+Number(b),0) as number:'?');
        }
    }
    for(const r of rows) {
        const vals=[s.getCell('Q'+r).result,s.getCell('R'+r).result,s.getCell('Q'+(r+1)).result,s.getCell('R'+(r+1)).result];
        form(s,'S'+r,`IF(COUNT(Q${r}:R${r+1})=4,SUM(Q${r}:R${r+1}),"?")`,vals.every(v=>typeof v==='number')?vals.reduce((a,b)=>Number(a)+Number(b),0) as number:'?');
    }
    for(const [i,jk] of ['L','P'].entries())for(const r of [41,44]){
        const count=g.anak.filter(a=>a.diukur&&a.umur===36&&a.jk===jk&&(r===41||(a.bb!==null&&a.bb>=11.5))).length;
        form(s,col(6+i)+r,`COUNTIFS(${ref('C')},36,${ref('D')},"${jk}",${ref('I')},1${r===44?`,${ref('M')},">=11.5"`:''})`,count);
    }
    for(let age=0;age<=6;age++){
        const c=col(6+age);text(s,c+'51',age);text(s,c+'56',age);
        for(const [i,jk] of ['L','P'].entries()){
            const children=g.anak.filter(a=>a.umur===age&&a.jk===jk);
            const base=`${ref('C')},${age},${ref('D')},"${jk}"`;
            form(s,c+(52+i),`COUNTIFS(${base})`,children.length);
            form(s,c+(57+i),`IF(COUNTIFS(${base},${ref('N')},"")>0,"?",COUNTIFS(${base},${ref('N')},"Y"))`,children.some(a=>a.asi===null)?'?':children.filter(a=>a.asi).length);
        }
    }
    for(const r of [52,53,57,58]){
        const vals=Array.from({length:7},(_,i)=>s.getCell(r,6+i).result);
        form(s,'M'+r,`IF(COUNT(F${r}:L${r})=7,SUM(F${r}:L${r}),"?")`,vals.every(v=>typeof v==='number')?vals.reduce((a,b)=>Number(a)+Number(b),0) as number:'?');
    }
    text(s,'O6','SASARAN '+namaPeriode(periode).replace(/ \d{4}$/,'')+' = '+g.anak.length);
    text(s,'O7',null);text(s,'O8','BARU='+g.anak.filter(a=>a.ntob==='B').length);
    // Keep the official printed form at A1:S64. Explanations sit outside it.
    const notes=[
        'Isian kosong di bagian umum, BGM, vitamin A, ibu hamil/nifas dan IMD diisi petugas.',
        '? berarti sumber belum cukup, bukan nol. Perbaiki G/NG, NTOB atau ASI pada RAW DATA FOR F1_ALL.',
        'G = desil 1–4; NG = desil 5–10. Tanpa desil, kategori mengikuti sumber terakhir.',
        'Kelompok umur F1 mengikuti contoh: 0–59 bulan. Detail tetap mencakup semua sasaran.',
        'Kolom O tetap dihitung pada F1 utama. TOTAL ringkasan kanan mencakup semua yang ditimbang, termasuk O.',
        'K memakai KMS elektronik sasaran terdaftar. Penanda tidak hadir saat sesi tetap tersimpan pada detail.',
    ];
    notes.forEach((n,i)=>{text(s,'U'+(67+i),n);});
    return s;
}

export async function workbookF1(data:DataF1) {
    if(!data.kelompok.length)throw new RangeError('Belum ada sasaran pada periode ini.');
    const w=new ExcelJS.Workbook();w.creator='SIMPATIK Posyandu';w.calcProperties.fullCalcOnLoad=true;
    for(const g of data.kelompok){
        const suffix=data.kelompok.length>1?` P${g.id}`:'';
        const rawName='RAW DATA FOR F1_ALL'+suffix;
        await utama(w,'F1_'+namaPeriode(data.periode)+suffix,g,data.periode,rawName);
        raw(w,rawName,g,data.periode,g.anak);
        for(const rt of ['1','2']) {
            const indices=g.anak.map((a,i)=>Number(a.rt)===Number(rt)?i:-1).filter(i=>i>=0);
            raw(w,'RAW DATA FOR F1 RT'+rt+suffix,g,data.periode,indices.map(i=>g.anak[i]),{name:rawName,indices});
        }
        const indices=g.anak.map((a,i)=>Number(a.rt)>=3&&Number(a.rt)<=7?i:-1).filter(i=>i>=0);
        raw(w,'RAW DATA FOR F1 RT3-RT7'+suffix,g,data.periode,indices.map(i=>g.anak[i]),{name:rawName,indices},true);
        for(const rt of [...new Set(g.anak.filter(a=>Number(a.rt)>7).map(a=>a.rt))]){
            const indices=g.anak.map((a,i)=>a.rt===rt?i:-1).filter(i=>i>=0);
            raw(w,'RAW DATA FOR F1 RT'+rt+suffix,g,data.periode,indices.map(i=>g.anak[i]),{name:rawName,indices});
        }
    }
    return w;
}
