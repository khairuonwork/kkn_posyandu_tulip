import type { BarisSasaranExcel } from './sasaran-excel.ts';

export type IdentitasHistoris = { id: number; nik: string | null; nama: string; tglLahir: string; jk: string; rt: string };
const baku = (v: string) => v.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
const rt = (v: string) => v.replace(/^0+/, '');

/** Pencocokan ketat: konflik tidak boleh membuat anak atau hasil ukur baru. */
export function cocokkanHistoris(baris: BarisSasaranExcel[], anak: IdentitasHistoris[], periode: string) {
    const siap: { sumber: BarisSasaranExcel; anak: IdentitasHistoris }[] = [];
    const ditahan: { baris: number; alasan: string }[] = [];
    const tidakDiukur: number[] = [];
    const terpakai = new Set<number>();
    for (const sumber of baris) {
        const ukur = sumber.pengukuran;
        if (sumber.statusAwal === 'pindah' || !ukur || ukur.bbKg === null) { tidakDiukur.push(sumber.barisAsal); continue; }
        const date = new Date(`${ukur.tanggalUkur}T00:00:00Z`);
        if (!ukur.tanggalUkur.startsWith(periode + '-') || Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== ukur.tanggalUkur ||
            ukur.bbKg <= 0 || ukur.bbKg > 100 || ukur.tinggiCm === null || ukur.tinggiCm < 30 || ukur.tinggiCm > 150 ||
            (ukur.lilaCm !== null && (ukur.lilaCm <= 0 || ukur.lilaCm > 50)) ||
            (ukur.likaCm !== null && (ukur.likaCm <= 0 || ukur.likaCm > 80))) {
            ditahan.push({ baris: sumber.barisAsal, alasan: 'Tanggal atau nilai ukur tidak valid untuk periode ini.' }); continue;
        }
        const nikCocok = sumber.nik ? anak.filter(a => a.nik === sumber.nik) : [];
        const kandidat = nikCocok.length ? nikCocok : anak.filter(a => baku(a.nama) === baku(sumber.nama) && rt(a.rt) === rt(sumber.rt));
        const cocok = kandidat.filter(a => baku(a.nama) === baku(sumber.nama) && a.tglLahir === sumber.tglLahir && a.jk === sumber.jk && rt(a.rt) === rt(sumber.rt)
            && ukur.tanggalUkur >= a.tglLahir);
        if (sumber.identitasDuplikat || kandidat.length !== 1 || cocok.length !== 1 || terpakai.has(cocok[0]?.id)) {
            ditahan.push({ baris: sumber.barisAsal, alasan: 'Identitas belum cocok unik (NIK/nama, tanggal lahir, jenis kelamin, RT) atau duplikat.' }); continue;
        }
        terpakai.add(cocok[0].id);
        siap.push({ sumber, anak: cocok[0] });
    }
    // Bila satu anak muncul dua kali, tahan kedua baris, bukan memilih baris pertama.
    const duplikat = new Set(ditahan.filter(r => r.alasan.includes('Identitas')).flatMap(r => {
        const s = baris.find(b => b.barisAsal === r.baris)!;
        return anak.filter(a => (s.nik && a.nik === s.nik) || (baku(a.nama) === baku(s.nama) && rt(a.rt) === rt(s.rt))).map(a => a.id);
    }));
    return { siap: siap.filter(p => !duplikat.has(p.anak.id)), ditahan: [...ditahan, ...siap.filter(p => duplikat.has(p.anak.id)).map(p => ({baris:p.sumber.barisAsal,alasan:'Identitas duplikat pada sumber.'}))], tidakDiukur };
}
