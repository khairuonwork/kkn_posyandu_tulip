import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool, PoolClient } from 'pg';
import { ubahProfil } from '../src/services/anak-service.ts';
import { ubahProfilAnak, ambil } from '../src/repositories/anak-repository.ts';

const user={id:1,peran:'bidan' as const,rt:null,aktif:true,posyanduIds:[1]};
const profil={nama:'ANAK UJI',nik:null,namaOrtu:'IBU UJI',noWa:null,rt:'01',jk:'L' as const,tglLahir:'2025-01-01',anakKe:1,bbLahirKg:3,bukuKia:true};

test('Desil 1–4 G dan 5–10 NG tersimpan pada sumber F1 periode terpilih; ASI tidak ditimpa',async()=>{
    for(const [desil,gng] of [[1,'G'],[4,'G'],[5,'NG'],[10,'NG'],[null,null]] as const){
        const calls:{sql:string;values:unknown[]}[]=[];
        const db={query:async(sql:string,values:unknown[])=>{
            calls.push({sql,values});
            if(sql.includes('a.orang_tua_id AS'))return{rows:[{orangTuaId:2,rt:'01',posyanduId:1}]};
            if(sql.includes('SELECT id FROM wilayah_rt'))return{rows:[{id:1}]};
            return{rows:[]};
        }} as unknown as PoolClient;
        assert.equal(await ubahProfilAnak(db,user,11,{...profil,desil,periodeId:'2026-10'}),'berhasil');
        const saved=calls.find(c=>c.sql.includes('INSERT INTO sumber_f1'))!;
        assert.deepEqual(saved.values,[11,'2026-10',desil,gng,null]);
        assert.doesNotMatch(saved.sql,/asi_eksklusif/);
    }
});
test('input Desil tidak sah atau tanpa periode tidak menyentuh database',async()=>{
    const pool={connect:()=>{throw new Error('tidak boleh menyentuh DB');}} as unknown as Pool;
    for(const desil of [-1,0,11,1.5,'4',NaN]) await assert.rejects(ubahProfil(pool,user,11,{...profil,desil,periodeId:'2026-10'}),/Desil/);
    await assert.rejects(ubahProfil(pool,user,11,{...profil,desil:4}),/periode/);
    await assert.rejects(ubahProfil(pool,user,11,{...profil,desilKelompok:'6-10'}),/periode/);
});

test('kelompok Desil dan Jenis KB tersimpan tanpa menimpa boolean KB lama', async () => {
    const calls: { sql: string; values: unknown[] }[] = [];
    const db = { query: async (sql: string, values: unknown[]) => {
        calls.push({ sql, values });
        if (sql.includes('a.orang_tua_id AS')) return { rows: [{ orangTuaId: 2, rt: '01', posyanduId: 1 }] };
        if (sql.includes('SELECT id FROM wilayah_rt')) return { rows: [{ id: 1 }] };
        return { rows: [] };
    } } as unknown as PoolClient;
    await ubahProfilAnak(db, user, 11, { ...profil, jenisKb: 'Vasektomi', desil: null, desilKelompok: '6-10', periodeId: '2026-10' });
    assert.deepEqual(calls.find(c => c.sql.includes('INSERT INTO sumber_f1'))!.values, [11, '2026-10', null, 'NG', '6-10']);
    const ortu = calls.find(c => c.sql.includes('UPDATE orang_tua'))!;
    assert.deepEqual(ortu.values, [2, 'IBU UJI', null, null, false, 'Vasektomi', true]);
    calls.length = 0;
    await ubahProfilAnak(db, user, 11, { ...profil, jenisKb: null, desil: 5, desilKelompok: null, periodeId: '2026-10' });
    assert.deepEqual(calls.find(c => c.sql.includes('INSERT INTO sumber_f1'))!.values, [11, '2026-10', 5, 'NG', null]);
    assert.equal(calls.find(c => c.sql.includes('UPDATE orang_tua'))!.values[5], null);
});
test('profil historis membatasi sumber Desil sampai periode yang dilihat',async()=>{
    const pool={query:async(sql:string,values:unknown[])=>{
        assert.match(sql,/sf\.periode<=\$5/);
        assert.deepEqual(values,[11,null,false,[1],'2026-09']);
        return{rows:[]};
    }} as unknown as Pool;
    await ambil(pool,user,11,'2026-09');
});
