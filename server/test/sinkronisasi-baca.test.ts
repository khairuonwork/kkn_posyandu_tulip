import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Pool } from 'pg';
import { sinkronisasi } from '../src/services/anak-service.ts';
import { muatTabelStandar } from '../src/repositories/standar-lms-repository.ts';
import type { PenggunaAktif } from '../src/auth/peran.ts';

const akun: PenggunaAktif = {id:1,peran:'bidan',rt:null,aktif:true,posyanduIds:[1],superAdmin:false};

test('pembacaan bersamaan berbagi pekerjaan hanya dalam cakupan yang sama, lalu membaca ulang', async () => {
    let buka!: () => void;
    let jumlah = 0;
    const tunggu = new Promise<void>(resolve => { buka = resolve; });
    const pool = {query: async () => { jumlah++; await tunggu; return {rows:[]}; }} as unknown as Pool;
    const a = sinkronisasi(pool,akun);
    const b = sinkronisasi(pool,{...akun,id:2});
    const lain = sinkronisasi(pool,{...akun,posyanduIds:[2]});
    const admin = sinkronisasi(pool,{...akun,superAdmin:true});
    assert.equal(a,b);
    assert.notEqual(a,lain);
    assert.notEqual(a,admin);
    assert.equal(jumlah,3);
    buka();
    await Promise.all([a,b,lain,admin]);
    await sinkronisasi(pool,akun);
    assert.equal(jumlah,4);
});

test('kegagalan baca tidak disimpan dan pool database yang berbeda tidak berbagi hasil', async () => {
    let gagal=true;
    const pool = {query: async () => { if(gagal) throw new Error('putus'); return {rows:[]}; }} as unknown as Pool;
    await assert.rejects(sinkronisasi(pool,akun),/putus/);
    gagal=false;
    await sinkronisasi(pool,akun);
    const lain = {query: async () => { throw new Error('pool lain'); }} as unknown as Pool;
    await assert.rejects(sinkronisasi(lain,akun),/pool lain/);
});

test('pemuatan standar serentak tidak memenuhi pool dan bisa dicoba lagi setelah gagal', async () => {
    let jumlah=0;
    let gagal=true;
    const pool = {query: async () => {
        jumlah++;
        if(gagal) throw new Error('belum terhubung');
        return {rows:[{indeks:'BB_U',jk:'L',kunci:0,l:1,m:3,s:0.1}]};
    }} as unknown as Pool;
    const awal=await Promise.allSettled(Array.from({length:5},()=>muatTabelStandar(pool)));
    assert.ok(awal.every(r=>r.status==='rejected'));
    assert.equal(jumlah,1);
    gagal=false;
    const hasil=await Promise.all(Array.from({length:5},()=>muatTabelStandar(pool)));
    assert.equal(jumlah,2);
    assert.ok(hasil.every(t=>t===hasil[0]));
    const lain = {query: async () => ({rows:[]})} as unknown as Pool;
    await assert.rejects(muatTabelStandar(lain),/kosong/);
});
