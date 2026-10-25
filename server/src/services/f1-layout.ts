import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';

type Layout = {
    columns: Partial<ExcelJS.Column>[];
    rows: {height?:number;hidden?:boolean}[];
    merges:string[];
    pageSetup:Partial<ExcelJS.PageSetup>;
    views:ExcelJS.WorksheetView[];
    properties:Partial<ExcelJS.WorksheetProperties>;
    cells:Record<string,{styleId:number;label?:ExcelJS.CellValue}>;
};
// Only presentation metadata and printed form labels, never child records.
const reference=JSON.parse(readFileSync(new URL('./templates/f1-layout.json',import.meta.url),'utf8')) as
    {styles:Partial<ExcelJS.Style>[];sheets:Record<string,Layout>};
export function layoutF1(name:string) {return reference.sheets[name];}
export function gayaF1(name:string,address:string):Partial<ExcelJS.Style> {
    const cell=layoutF1(name).cells[address];
    return cell?structuredClone(reference.styles[cell.styleId]):{};
}
export function formatF1(s:ExcelJS.Worksheet,name:string,full=false) {
    const l=layoutF1(name);
    l.columns.forEach((c,i)=>{Object.assign(s.getColumn(i+1),structuredClone(c));});
    s.properties={...s.properties,...structuredClone(l.properties)};
    s.views=structuredClone(l.views);
    if(!full)return;
    l.rows.forEach((r,i)=>{Object.assign(s.getRow(i+1),r);});
    for(const m of l.merges)s.mergeCells(m);
    for(const [address,c] of Object.entries(l.cells)){
        s.getCell(address).style=gayaF1(name,address);
        if(c.label!==undefined)s.getCell(address).value=c.label;
    }
    s.pageSetup=structuredClone(l.pageSetup);
}
