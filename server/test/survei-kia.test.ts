import assert from 'node:assert/strict';
import { test } from 'node:test';
import { KELOMPOK_KIA, SUMBER_KIA, panduanMakanKia } from '../src/edukasi/kia-2024.ts';
import { GalatSurveiKia, hariIniJakarta, kelompokUntukUmur, ringkasJawaban, umurKia, validasiSurveiKia } from '../src/services/survei-kia-domain.ts';

const date = '2026-10-18';
test('catalogue KIA: 11 groups, 105 developmental observations and 4 care prompts', () => {
    assert.equal(KELOMPOK_KIA.length, 11);
    assert.equal(KELOMPOK_KIA.filter(k => k.jenis === 'perkembangan').reduce((n,k) => n+k.pertanyaan.length,0),105);
    assert.equal(KELOMPOK_KIA[0].pertanyaan.length,4);
    const ids=KELOMPOK_KIA.flatMap(k=>k.pertanyaan.map(q=>q.id));
    assert.equal(ids.length,new Set(ids).size);
    assert.deepEqual(KELOMPOK_KIA.find(k=>k.id==='6-9b')!.pertanyaan.at(-1)!.nomorSumber,[10,11]);
    assert.deepEqual(KELOMPOK_KIA.find(k=>k.id==='9-12b')!.pertanyaan.at(-1)!.nomorSumber,[13]);
});
test('age is calendar years/months/days; date-only and month ends are stable',()=>{
    assert.deepEqual(umurKia('2024-06-08',date),{bulan:28,hariTotal:862,label:'2 tahun 4 bulan 10 hari'});
    assert.equal(umurKia('2025-01-31','2025-02-28')?.label,'0 tahun 1 bulan 0 hari');
    assert.equal(umurKia('2024-02-29','2025-02-28')?.bulan,12);
    assert.equal(umurKia('2026-02-30',date),null);
    assert.equal(umurKia('2026-10-19',date),null);
    assert.equal(hariIniJakarta(new Date('2026-10-17T17:01:00Z')),date);
});
test('age boundaries select a single appropriate group, never nearest outside range',()=>{
    const cases=[['2026-09-20','lahir-28h'],['2026-09-19','29h-3b'],['2026-07-19','29h-3b'],['2026-07-18','3-6b'],['2026-04-18','6-9b'],['2026-01-18','9-12b'],['2025-10-18','12-18b'],['2025-04-18','18-24b'],['2024-10-18','2-3t'],['2023-10-18','3-4t'],['2022-10-18','4-5t'],['2021-10-18','5-6t']];
    for(const [dob,id] of cases) assert.equal(kelompokUntukUmur(umurKia(dob,date))?.id,id,dob);
    assert.equal(kelompokUntukUmur(umurKia('2020-10-18',date)),null);
    assert.equal(kelompokUntukUmur(null),null);
});
const group=KELOMPOK_KIA.find(k=>k.id==='2-3t')!;
const allYes=Object.fromEntries(group.pertanyaan.map(q=>[q.id,'ya']));
function input(extra:Record<string,unknown>={}) { return {tanggal:date,versiBuku:SUMBER_KIA.versi,kelompokId:group.id,revisi:0,jawaban:allYes,catatan:'',tindakLanjut:'',dibahas:false,...extra}; }
test('unknown answers remain incomplete; No directs to Puskesmas; all Yes is not diagnosis',()=>{
    assert.equal(ringkasJawaban(group,{}).belum,9);
    assert.match(ringkasJawaban(group,{[group.pertanyaan[0].id]:'tidak'}).arahan,/Puskesmas/);
    assert.match(ringkasJawaban(group,allYes as Record<string,'ya'>).arahan,/bukan diagnosis/);
    assert.doesNotMatch(ringkasJawaban(KELOMPOK_KIA[0],{[KELOMPOK_KIA[0].pertanyaan[0].id]:'tidak'}).arahan,/pemeriksaan perkembangan/);
});
test('drafts allowed, completed discussions require all answers and follow-up for No',()=>{
    assert.equal(validasiSurveiKia(input({jawaban:{},catatan:'Perlu ditanyakan saat kunjungan.'}),group,date).dibahas,false);
    assert.equal(validasiSurveiKia(input({dibahas:true}),group,date).dibahas,true);
    assert.throws(()=>validasiSurveiKia(input({jawaban:{},dibahas:true}),group,date),/Lengkapi/);
    const no={...allYes,[group.pertanyaan[0].id]:'tidak'};
    assert.throws(()=>validasiSurveiKia(input({jawaban:no,dibahas:true}),group,date),/tindak lanjut/);
    assert.equal(validasiSurveiKia(input({jawaban:no,dibahas:true,tindakLanjut:'Konsultasi ke Puskesmas.'}),group,date).dibahas,true);
});
test('reject stale dates/groups/book versions, malformed fields and unknown question IDs',()=>{
    for(const extra of [{tanggal:'2026-10-17'},{kelompokId:'3-4t'},{versiBuku:'old'}]) assert.throws(()=>validasiSurveiKia(input(extra),group,date),(e:unknown)=>e instanceof GalatSurveiKia && e.status===409);
    for(const extra of [{revisi:-1},{revisi:0.5},{jawaban:{alien:'ya'}},{jawaban:{[group.pertanyaan[0].id]:'normal'}},{catatan:'x'.repeat(2001)},{dibahas:'ya'},{jawaban:{}}]) assert.throws(()=>validasiSurveiKia(input(extra),group,date),GalatSurveiKia);
});
test('feeding advice changes at 6, 9, 12 and 24 months',()=>{
    assert.match(panduanMakanKia(5).isi.join(' '),/ASI saja/);
    assert.match(panduanMakanKia(6).isi.join(' '),/2–3 kali/);
    assert.match(panduanMakanKia(9).isi.join(' '),/3–4 kali/);
    assert.match(panduanMakanKia(12).isi.join(' '),/makanan keluarga/);
    assert.match(panduanMakanKia(24).isi.join(' '),/3 kali/);
});
