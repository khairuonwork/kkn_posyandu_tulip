// Hanya konfigurasi fitur. Tidak memulai sesi dan tidak mengubah data riil.
import { readFile,writeFile,rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
const file=resolve(homedir(),'.config/simpatik/server.env');
const awal=await readFile(file,'utf8');
const baris='PELATIHAN_AKTIF=1';
const baru=/^PELATIHAN_AKTIF=.*$/m.test(awal)?awal.replace(/^PELATIHAN_AKTIF=.*$/m,baris):awal.trimEnd()+'\n'+baris+'\n';
if(baru!==awal){
    const tmp=file+'.pelatihan.tmp';
    await writeFile(tmp,baru,{mode:0o600,flag:'wx'});
    await rename(tmp,file);
}
console.log('Fitur pelatihan diaktifkan pada konfigurasi API. Restart API untuk memuat konfigurasi.');
