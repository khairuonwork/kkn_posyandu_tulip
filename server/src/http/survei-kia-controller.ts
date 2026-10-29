import { Router } from 'express';
import type { Pool } from 'pg';
import { wajibBoleh } from './middleware.ts';
import { GalatAnak } from '../services/anak-service.ts';
import { GalatSurveiKia } from '../services/survei-kia-domain.ts';
import { catatPendampinganKia,pendampinganKia } from '../services/survei-kia-service.ts';

export function ruteSurveiKia(pool:Pool):Router {
    const rute=Router();
    for(const method of ['get','post'] as const) rute[method]('/anak/:id/pendampingan-kia',
        wajibBoleh(method==='get'?'lihat-anak':'catat-survei-kia'),async(req,res,next)=>{
            const id=Number(req.params.id);
            if(!Number.isSafeInteger(id)||id<=0) {res.status(404).json({galat:'Anak tidak ditemukan.'});return;}
            try {
                res.set('Cache-Control','no-store');
                res.json(method==='get'?await pendampinganKia(pool,req.pengguna!,id):await catatPendampinganKia(pool,req.pengguna!,id,req.body));
            }catch(e) {
                if(e instanceof GalatAnak || e instanceof GalatSurveiKia) {res.status(e.status).json({galat:e.message});return;}
                next(e);
            }
        });
    return rute;
}
