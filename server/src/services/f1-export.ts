import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
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

function raw(w:ExcelJS.Workbook,name:string,g:KelompokF1,periode:string,rows:AnakF1[],origin?:{name:string;indices:number[]}) {
    const s=w.addWorksheet(name,{properties:{tabColor:{argb:origin?'FFCCFF33':'FF66FFFF'}},views:[{state:'frozen',ySplit:5,xSplit:2}]});
    s.mergeCells('A1:H1');s.mergeCells('A2:H2');s.mergeCells('A3:H3');
    text(s,'A1','DATA BALITA HASIL BULAN PENIMBANGAN BALITA (BPB)');
    text(s,'A2',`${namaPeriode(periode)} · POSYANDU ${g.nama} · RW ${g.rw}`);
    text(s,'A3',`KELURAHAN ${g.kelurahan}`);
    const headers=['NO','NAMA BALITA','UMUR (bln)','L/P','NTOB','MAMPU','TDK MAMPU','RT',
        'DITIMBANG','KMS','2T+','STATUS BB/U','BB (kg)','ASI EXCL?'];
    headers.forEach((v,i)=>text(s,col(i+1)+'5',v));
    const metadata=['ID ANAK','DESIL','SUMBER G/NG','PERIODE G/NG','TANGGAL ACUAN UMUR','TIDAK HADIR SAAT SESI'];
    metadata.forEach((v,i)=>text(s,col(29+i)+'5',v));
    for(const [i,a] of rows.entries()) {
        const r=6+i;
        const values:ExcelJS.CellValue[]=[i+1,a.nama,a.umur,a.jk,a.ntob,a.gng==='NG'?'NG':null,a.gng==='G'?'G':null,a.rt,
            a.diukur?1:0,1,a.duaT===null?null:a.duaT?1:0,a.kategori,a.bb,a.asi===null?null:a.asi?'Y':'T'];
        values.forEach((v,j)=>{
            const cell=s.getCell(r,j+1);
            cell.value=origin?{formula:`IF(${q(origin.name)}!${col(j+1)}${origin.indices[i]+6}="","",${q(origin.name)}!${col(j+1)}${origin.indices[i]+6})`,result:v as string|number??''}:v;
            cell.border={top:border,bottom:border,left:border,right:border};
            cell.alignment={vertical:'middle',horizontal:j===1?'left':'center'};
        });
        [a.anakId,a.desil,a.sumberEkonomi,a.periodeEkonomi,a.tanggal,a.tidakHadir?'Ya':null].forEach((v,j)=>text(s,col(29+j)+r,v));
        for(const c of ['D','E'])s.getCell(c+r).fill=fill(a.jk==='L'?'FF66FFFF':'FFFFCCFF');
        if(!origin) {
            for(const c of ['E','F','G','N'])editable(s.getCell(c+r));
            s.getCell('E'+r).dataValidation={type:'list',allowBlank:true,formulae:['"N,T,O,B"']};
            s.getCell('F'+r).dataValidation={type:'list',allowBlank:true,formulae:['"NG"']};
            s.getCell('G'+r).dataValidation={type:'list',allowBlank:true,formulae:['"G"']};
            s.getCell('N'+r).dataValidation={type:'list',allowBlank:true,formulae:['"Y,T"']};
        }
    }
    const end=Math.max(6,rows.length+5);
    // N/T/O/B, G/NG, jenis kelamin dan umur dihitung dari tabel di kiri.
    let sr=4;
    for(const jk of ['L','P']) {
        text(s,'P'+sr,jk==='L'?'LAKI-LAKI':'PEREMPUAN');
        for(const [i,k] of ['N','T','O','B','TOTAL'].entries()) {s.mergeCells(sr,17+i*2,sr,18+i*2);text(s,col(17+i*2)+sr,k);}
        text(s,'P'+(sr+1),'UMUR');
        for(let c=17;c<=26;c++)text(s,col(c)+(sr+1),c%2?'NG':'G');
        const ages=[...new Set(rows.filter(a=>a.jk===jk&&a.umur!==null).map(a=>a.umur!))].sort((a,b)=>a-b);
        for(const [i,age] of ages.entries()) {
            const r=sr+2+i;text(s,'P'+r,age);
            for(let c=17;c<=24;c++) {
                const code=['N','T','O','B'][Math.floor((c-17)/2)],eco=c%2?'NG':'G',ec=eco==='NG'?'F':'G';
                const count=rows.filter(a=>a.jk===jk&&a.umur===age&&a.diukur&&a.ntob===code&&a.gng===eco).length;
                form(s,col(c)+r,`COUNTIFS($C$6:$C$${end},$P${r},$D$6:$D$${end},"${jk}",$E$6:$E$${end},"${code}",$${ec}$6:$${ec}$${end},"${eco}",$I$6:$I$${end},1)`,count);
            }
            form(s,'Y'+r,`SUM(Q${r},S${r},U${r},W${r})`,rows.filter(a=>a.jk===jk&&a.umur===age&&a.diukur&&a.gng==='NG'&&a.ntob).length);
            form(s,'Z'+r,`SUM(R${r},T${r},V${r},X${r})`,rows.filter(a=>a.jk===jk&&a.umur===age&&a.diukur&&a.gng==='G'&&a.ntob).length);
        }
        const totalRow=sr+2+ages.length;text(s,'P'+totalRow,'TOTAL');
        for(let c=17;c<=26;c++){
            const sum=ages.reduce((n,_,i)=>n+Number(s.getCell(sr+2+i,c).result??0),0);
            form(s,col(c)+totalRow,ages.length?`SUM(${col(c)}${sr+2}:${col(c)}${totalRow-1})`:'0',sum);
        }
        for(let r=sr;r<=totalRow;r++)for(let c=16;c<=26;c++){
            const x=s.getCell(r,c);x.border={top:border,bottom:border,left:border,right:border};x.alignment={horizontal:'center',vertical:'middle'};x.numFmt=fmt;
            if(r===sr||c>=25)x.fill=fill(jk==='L'?'FF66FFFF':'FFFFCCFF');
            if(r===sr+1)x.fill=fill('FFFFFF00');
            if(r===totalRow){x.fill=fill('FF000000');x.font={name:'Arial',size:10,color:{argb:'FFFFFFFF'},bold:true};}
        }
        sr=totalRow+3;
    }
    s.getColumn(1).width=6;s.getColumn(2).width=40;
    for(let c=3;c<=14;c++)s.getColumn(c).width=c===12?26:c===3?12:10;
    s.getColumn(15).width=3;s.getColumn(16).width=13;
    for(let c=17;c<=26;c++)s.getColumn(c).width=7;
    for(let c=29;c<=34;c++){s.getColumn(c).width=24;s.getColumn(c).hidden=true;}
    for(let c=9;c<=13;c++)s.getColumn(c).hidden=true;
    s.getRow(5).height=34;
    for(let c=1;c<=14;c++){s.getCell(5,c).font={name:'Arial',bold:true,size:10};s.getCell(5,c).alignment={wrapText:true,vertical:'middle',horizontal:'center'};}
    s.autoFilter=`A5:N${end}`;
    s.pageSetup={orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:5',printArea:`A1:Z${Math.max(end,sr)}`};
    return s;
}

async function utama(w:ExcelJS.Workbook,name:string,g:KelompokF1,periode:string,rawName:string) {
    const template=new ExcelJS.Workbook();
    await template.xlsx.readFile(fileURLToPath(new URL('./templates/f1.xlsx',import.meta.url)));
    const source=template.worksheets[0];const s=w.addWorksheet(name);
    s.model={...source.model,id:s.id,name};
    s.properties.tabColor={argb:'FFCC0000'};
    text(s,'A1',`(F1 / F2 / GIZI / ${periode.slice(0,4)})`);
    text(s,'E3',': '+g.kelurahan);text(s,'E4',': '+namaPeriode(periode));text(s,'E5',g.tanggal?': '+g.tanggal:null);
    text(s,'E7',`: ${g.nama} / ${g.rw}`);
    for(const cell of ['E5','E8','E9','E10','E11','F47','G47','F48','G48','D60','D61','D62','D63','D64'])editable(s.getCell(cell));
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
            if(r0===31){text(s,c+r,null);editable(s.getCell(c+r));continue;}
            if(r0===27){
                const cells=[19,21,23,25].map(n=>c+(n+sex));
                form(s,c+r,`IF(COUNT(${cells.join(',')})=4,SUM(${cells.join(',')}),"Lengkapi")`,eligible.some(a=>a.gng===null||(a.diukur&&a.ntob===null))?'Lengkapi':classified.filter(a=>a.diukur).length);
                continue;
            }
            // Blank category must never disappear into a reassuring zero. Excel
            // recomputes this guard when staff complete the yellow source cells.
            let guard=`COUNTIFS(${base},${ref('F')},"",${ref('G')},"")+COUNTIFS(${base},${ref('F')},"NG",${ref('G')},"G")`;
            if([19,21,23,25].includes(r0))guard+=`+COUNTIFS(${base},${ref('I')},1,${ref('E')},"")`;
            if(r0===33)guard+=`+COUNTIFS(${base},${ref('I')},1,${ref('K')},"")`;
            if([35,37].includes(r0))guard+=`+COUNTIFS(${base},${ref('I')},1,${ref('L')},"")`;
            form(s,c+r,`IF(${guard}>0,"Lengkapi",COUNTIFS(${base},${ref(ec)},"${eco}"${suffix}))`,missing?'Lengkapi':count);
        }
        for(const [c,cs] of [['Q',['G','I','K','M','O']],['R',['H','J','L','N','P']]] as const){
            const cells=cs.map(c=>c+r);const vals=cells.map(c=>s.getCell(c).result);
            form(s,c+r,`IF(COUNT(${cells.join(',')})=5,SUM(${cells.join(',')}),"Lengkapi")`,vals.every(v=>typeof v==='number')?vals.reduce((a,b)=>Number(a)+Number(b),0) as number:'Lengkapi');
        }
    }
    for(const r of rows) {
        const vals=[s.getCell('Q'+r).result,s.getCell('R'+r).result,s.getCell('Q'+(r+1)).result,s.getCell('R'+(r+1)).result];
        form(s,'S'+r,`IF(COUNT(Q${r}:R${r+1})=4,SUM(Q${r}:R${r+1}),"Lengkapi")`,vals.every(v=>typeof v==='number')?vals.reduce((a,b)=>Number(a)+Number(b),0) as number:'Lengkapi');
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
            form(s,c+(57+i),`IF(COUNTIFS(${base},${ref('N')},"")>0,"Lengkapi",COUNTIFS(${base},${ref('N')},"Y"))`,children.some(a=>a.asi===null)?'Lengkapi':children.filter(a=>a.asi).length);
        }
    }
    for(const r of [52,53,57,58]){
        const vals=Array.from({length:7},(_,i)=>s.getCell(r,6+i).result);
        form(s,'M'+r,`IF(COUNT(F${r}:L${r})=7,SUM(F${r}:L${r}),"Lengkapi")`,vals.every(v=>typeof v==='number')?vals.reduce((a,b)=>Number(a)+Number(b),0) as number:'Lengkapi');
    }
    text(s,'O6',`SASARAN ${g.anak.length} ANAK`);
    text(s,'O7',`USIA ≥60 BLN: ${g.anak.filter(a=>a.umur!==null&&a.umur>=60).length}`);
    text(s,'O8',`UMUR BELUM LENGKAP: ${g.anak.filter(a=>a.umur===null).length}`);
    // Notes stay in the print area; missing source inputs are visible before submission.
    const notes=[
        'Kuning = isian petugas. Lengkapi = sumber belum cukup; bukan nol.',
        'G = desil 1–4; NG = desil 5–10. Tanpa desil, pakai kategori G/NG sumber terakhir.',
        'S/K mengikuti sasaran terdaftar dengan KMS elektronik. Kelompok utama mengikuti template: usia 0–59 bulan.',
        'D = N+T+O+B. Tidak ditimbang = K−D; penanda tidak hadir saat sesi tetap disimpan pada detail sumber.',
        'BGM diisi petugas dari KMS. Kategori BB/U mengikuti hasil penilaian tersimpan; ambang internal −1,96 tidak dipakai untuk klasifikasi.',
        'ASI hanya mengikuti sumber bulan laporan. Lengkapi ASI, NTOB, dan G/NG pada RAW DATA FOR F1_ALL bila kosong.',
    ];
    notes.forEach((n,i)=>{s.mergeCells(67+i,1,67+i,19);text(s,'A'+(67+i),n);s.getRow(67+i).height=28;s.getCell('A'+(67+i)).alignment={wrapText:true,vertical:'middle'};});
    s.getColumn(19).width=13;
    for(let r=15;r<=38;r++)for(let c=7;c<=19;c++){s.getCell(r,c).numFmt=fmt;s.getCell(r,c).alignment={horizontal:'center',vertical:'middle',wrapText:true};}
    s.addConditionalFormatting({ref:'G15:S38',rules:[{type:'containsText',operator:'containsText',text:'Lengkapi',priority:1,style:{fill:fill('FFFFF2CC'),font:{color:{argb:'FF9C0006'}}}}]});
    s.pageSetup={orientation:'portrait',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:2,printArea:'A1:S72',printTitlesRow:'13:14'};
    return s;
}

export async function workbookF1(data:DataF1) {
    if(!data.kelompok.length)throw new RangeError('Belum ada sasaran pada periode ini.');
    const w=new ExcelJS.Workbook();w.creator='SIMPATIK Posyandu';w.calcProperties.fullCalcOnLoad=true;
    for(const g of data.kelompok){
        const suffix=data.kelompok.length>1?` P${g.id}`:'';
        const rawName='RAW DATA FOR F1_ALL'+suffix;
        await utama(w,`F1_${data.periode}${suffix}`,g,data.periode,rawName);
        raw(w,rawName,g,data.periode,g.anak);
        for(const rt of [...new Set(g.anak.map(a=>a.rt))].sort()){
            const indices=g.anak.map((a,i)=>a.rt===rt?i:-1).filter(i=>i>=0);
            raw(w,`RAW DATA F1 RT${rt}${suffix}`,g,data.periode,indices.map(i=>g.anak[i]),{name:rawName,indices});
        }
    }
    return w;
}
