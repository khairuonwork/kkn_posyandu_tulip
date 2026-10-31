/** Smoke baca-saja endpoint live. Token uji sementara dicabut pada finally. */
import assert from 'node:assert/strict';
import { dapatkanPool,tutupPool } from '../src/db/pool.ts';
import { buatSesi } from '../src/auth/sesi.ts';
const base=process.argv[2];
if(!base||!base.startsWith('https://'))throw Error('Sertakan URL HTTPS server');
const pool=dapatkanPool();
const hasil:unknown[]=[];
try{
    for(const superAdmin of [true,false]){
        const u=(await pool.query('SELECT id FROM public.pengguna WHERE aktif AND super_admin=$1 ORDER BY id LIMIT 1',[superAdmin])).rows[0];
        assert(u,'Akun untuk pengujian izin harus tersedia');
        const s=buatSesi();
        await pool.query(`INSERT INTO public.sesi(ringkasan,pengguna_id,kedaluwarsa,pelatihan_id)
            VALUES($1,$2,now()+interval '2 minutes',NULL)`,[s.ringkasan,u.id]);
        try{
            const headers={Authorization:'Bearer '+s.token};
            const res=await fetch(base+'/api/v1/pelatihan',{headers,signal:AbortSignal.timeout(15000)});
            assert.equal(res.status,superAdmin?200:403);
            if(superAdmin){
                const data=await res.json() as {aktif:unknown;sumber:{periode:string;jumlah:number}[]};
                assert.equal(data.aktif,null,'Pengujian tidak boleh memulai sesi nyata');
                assert(data.sumber.some(p=>p.periode==='2026-10'&&p.jumlah===92));
                const oper=await fetch(base+'/api/v1/sasaran?periode=2026-10',{headers,signal:AbortSignal.timeout(15000)});
                assert.equal(oper.status,200,'Mode riil harus tetap dapat dibaca');
                const terlambat=await fetch(base+'/api/v1/pengukuran',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id_anak:1000001000001,nik:'0099000001000001'}),signal:AbortSignal.timeout(15000)});
                assert.equal(terlambat.status,409,'Antrean latihan harus ditolak sebelum menyentuh data riil');
                hasil.push({superAdmin,status:res.status,sasaranOktober:92,modeRiil:oper.status,kirimanLatihanDitolak:terlambat.status});
            }else hasil.push({superAdmin,status:res.status});
        }finally{await pool.query('DELETE FROM public.sesi WHERE ringkasan=$1',[s.ringkasan]);}
    }
    console.log(JSON.stringify({smoke:'lulus',hasil}));
}finally{await tutupPool();}
