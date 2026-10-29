import assert from 'node:assert/strict';
import test from 'node:test';
import { cocokkanHistoris } from '../src/services/pengukuran-historis.ts';
import type { BarisSasaranExcel } from '../src/services/sasaran-excel.ts';

const anak = [{id:1,nik:'3277000000000001',nama:'ANAK UJI',tglLahir:'2025-01-01',jk:'L',rt:'01'}];
function sumber(patch: Partial<BarisSasaranExcel> = {}): BarisSasaranExcel {
    return {barisAsal:8,nik:null,eppgbm:null,nama:' anak   uji ',tglLahir:'2025-01-01',jk:'L',namaOrtu:'IBU',nikOrtu:null,rt:'1',anakKe:1,
        bbLahirKg:3,bbLahirMentah:null,pbLahirCm:50,bukuKia:true,imd:false,statusAwal:'menunggu',masalah:[],identitasDuplikat:false,
        pengukuran:{tanggalUkur:'2026-07-12',bbKg:10,tinggiCm:78,lilaCm:15,likaCm:45,ntob:'N'},...patch};
}
test('tanpa NIK dapat dicocokkan unik dengan nama, tanggal lahir, jenis kelamin, RT', () => {
    const result=cocokkanHistoris([sumber()],anak,'2026-07');
    assert.equal(result.siap[0].anak.id,1);
    assert.equal(result.ditahan.length,0);
});
test('identitas, tanggal, dan duplikat yang ambigu ditahan tanpa membuat anak baru', () => {
    assert.equal(cocokkanHistoris([sumber({tglLahir:'2025-02-01'})],anak,'2026-07').siap.length,0);
    assert.equal(cocokkanHistoris([sumber()],anak,'2026-08').siap.length,0);
    const duplicate=cocokkanHistoris([sumber(),sumber({barisAsal:9})],anak,'2026-07');
    assert.equal(duplicate.siap.length,0);
    assert.equal(duplicate.ditahan.length,2);
    assert.equal(cocokkanHistoris([sumber()], [...anak,{...anak[0],id:2}], '2026-07').siap.length,0);
});
test('baris pindah dan tanpa BB tidak diubah menjadi hadir', () => {
    const result=cocokkanHistoris([sumber({statusAwal:'pindah'}),sumber({barisAsal:9,pengukuran:{...sumber().pengukuran!,bbKg:null}})],anak,'2026-07');
    assert.equal(result.siap.length,0);
    assert.equal(result.tidakDiukur.length,2);
});
