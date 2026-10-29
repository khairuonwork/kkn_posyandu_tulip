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
        assert.deepEqual(saved.values,[11,'2026-10',desil,gng]);
        assert.doesNotMatch(saved.sql,/asi_eksklusif/);
    }
});
test('input Desil tidak sah atau tanpa periode tidak menyentuh database',async()=>{
    const pool={connect:()=>{throw new Error('tidak boleh menyentuh DB');}} as unknown as Pool;
    for(const desil of [-1,0,11,1.5,'4',NaN]) await assert.rejects(ubahProfil(pool,user,11,{...profil,desil,periodeId:'2026-10'}),/Desil/);
    await assert.rejects(ubahProfil(pool,user,11,{...profil,desil:4}),/periode/);
});
test('profil historis membatasi sumber Desil sampai periode yang dilihat',async()=>{
    const pool={query:async(sql:string,values:unknown[])=>{
        assert.match(sql,/sf\.periode<=\$5/);
        assert.deepEqual(values,[11,null,false,[1],'2026-09']);
        return{rows:[]};
    }} as unknown as Pool;
    await ambil(pool,user,11,'2026-09');
});
