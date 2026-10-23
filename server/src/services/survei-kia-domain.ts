import { KELOMPOK_KIA, SUMBER_KIA, type KelompokKia } from '../edukasi/kia-2024.ts';

export type JawabanKia = Record<string, 'ya' | 'tidak' | null>;
export class GalatSurveiKia extends Error {
    readonly status: number;
    constructor(status: number, pesan: string) { super(pesan); this.status=status; }
}
export function hariIniJakarta(now = new Date()): string {
    const bagian = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(now);
    const n = (type: Intl.DateTimeFormatPartTypes) => bagian.find(p=>p.type===type)!.value;
    return `${n('year')}-${n('month')}-${n('day')}`;
}
function tanggalValid(value: string): number | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const n = Date.parse(value+'T00:00:00Z');
    return Number.isFinite(n) && new Date(n).toISOString().slice(0,10)===value ? n : null;
}
export function umurKia(tglLahir: string, tanggal: string) {
    const lahir=tanggalValid(tglLahir), kini=tanggalValid(tanggal);
    if(lahir===null || kini===null || lahir>kini) return null;
    const [y,m,d]=tglLahir.split('-').map(Number);
    const date=new Date(kini);
    let bulan=(date.getUTCFullYear()-y)*12+date.getUTCMonth()-(m-1);
    const tambah=(count:number)=>{
        const akhir=new Date(Date.UTC(y,m-1+count+1,0)).getUTCDate();
        return Date.UTC(y,m-1+count,Math.min(d,akhir));
    };
    if(tambah(bulan)>kini) bulan--;
    const hari=Math.round((kini-tambah(bulan))/86_400_000);
    return { bulan, hariTotal:Math.round((kini-lahir)/86_400_000), label:`${Math.floor(bulan/12)} tahun ${bulan%12} bulan ${hari} hari` };
}
export function kelompokUntukUmur(umur: ReturnType<typeof umurKia>): KelompokKia | null {
    if(!umur || umur.bulan>=72) return null;
    if(umur.hariTotal<=28) return KELOMPOK_KIA[0];
    return KELOMPOK_KIA.find(k=>k.jenis==='perkembangan' && umur.bulan>=k.mulaiBulan && umur.bulan<k.sebelumBulan) ?? null;
}
export function ringkasJawaban(kelompok: KelompokKia, jawaban: JawabanKia) {
    const values=kelompok.pertanyaan.map(q=>jawaban[q.id]??null);
    const ya=values.filter(v=>v==='ya').length;
    const tidak=values.filter(v=>v==='tidak').length;
    const belum=values.length-ya-tidak;
    const arahan=tidak>0
        ? kelompok.jenis==='perkembangan'
            ? 'Ada penanda yang dijawab Tidak. Sesuai Buku KIA, segera bawa anak ke Puskesmas untuk pemeriksaan perkembangan. Bahas pertanyaan yang belum dapat dilakukan bersama tenaga kesehatan.'
            : 'Ada perawatan yang perlu dibahas. Cocokkan dengan catatan Buku KIA dan minta bantuan tenaga kesehatan.'
        : belum>0
            ? 'Masih ada jawaban yang belum diamati atau ditanyakan. Lengkapi diskusi sebelum menyimpulkan hasilnya.'
            : 'Semua jawaban tercatat Ya. Lanjutkan pemantauan dan stimulasi sesuai usia; catatan ini bukan diagnosis perkembangan.';
    return { total:values.length, ya, tidak, belum, arahan };
}
export type IsianSurveiKia = {
    tanggal: string; kelompokId: string; versiBuku: string; revisi: number;
    jawaban: JawabanKia; catatan: string; tindakLanjut: string; dibahas: boolean;
};
export function validasiSurveiKia(input: unknown, kelompok: KelompokKia | null, tanggal: string): IsianSurveiKia {
    if(!kelompok) throw new GalatSurveiKia(400,'Belum ada checklist yang sesuai dengan usia anak pada Buku KIA ini.');
    if(!input || typeof input!=='object' || Array.isArray(input)) throw new GalatSurveiKia(400,'Isian survei tidak valid.');
    const b=input as Record<string,unknown>;
    if(b.tanggal!==tanggal || b.kelompokId!==kelompok.id || b.versiBuku!==SUMBER_KIA.versi) {
        throw new GalatSurveiKia(409,'Tanggal atau kelompok usia telah berubah. Muat ulang panduan sebelum menyimpan.');
    }
    if(!Number.isSafeInteger(b.revisi) || (b.revisi as number)<0) throw new GalatSurveiKia(400,'Versi catatan tidak valid. Muat ulang panduan.');
    if(!b.jawaban || typeof b.jawaban!=='object' || Array.isArray(b.jawaban)) throw new GalatSurveiKia(400,'Jawaban survei harus diisi sesuai butir panduan.');
    const source=b.jawaban as Record<string,unknown>;
    const allowed=new Set(kelompok.pertanyaan.map(q=>q.id));
    if(Object.keys(source).some(key=>!allowed.has(key))) throw new GalatSurveiKia(400,'Ada pertanyaan yang tidak sesuai kelompok usia. Muat ulang panduan.');
    const jawaban:JawabanKia={};
    for(const q of kelompok.pertanyaan) {
        const answer=source[q.id]??null;
        if(answer!==null && answer!=='ya' && answer!=='tidak') throw new GalatSurveiKia(400,'Pilih Ya, Tidak, atau Belum diamati untuk setiap butir.');
        jawaban[q.id]=answer;
    }
    for(const name of ['catatan','tindakLanjut']) if(typeof b[name]!=='string' || (b[name] as string).length>2000) throw new GalatSurveiKia(400,'Catatan dan tindak lanjut masing-masing maksimal 2.000 karakter.');
    if(typeof b.dibahas!=='boolean') throw new GalatSurveiKia(400,'Konfirmasi diskusi tidak valid.');
    const summary=ringkasJawaban(kelompok,jawaban);
    if(b.dibahas && summary.belum>0) throw new GalatSurveiKia(400,'Lengkapi semua jawaban sebelum menandai diskusi selesai.');
    if(b.dibahas && summary.tidak>0 && !(b.tindakLanjut as string).trim()) throw new GalatSurveiKia(400,'Tuliskan tindak lanjut yang disepakati untuk jawaban Tidak.');
    if(summary.ya+summary.tidak===0 && !(b.catatan as string).trim()) throw new GalatSurveiKia(400,'Catat sedikitnya satu jawaban atau catatan orang tua sebelum menyimpan.');
    return {tanggal,kelompokId:kelompok.id,versiBuku:SUMBER_KIA.versi,revisi:b.revisi as number,jawaban,
        catatan:(b.catatan as string).trim(),tindakLanjut:(b.tindakLanjut as string).trim(),dibahas:b.dibahas};
}
