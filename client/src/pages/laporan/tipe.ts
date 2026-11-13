import type { useLaporanServer } from '@/lib/laporan';
import type { Periode } from '@/types/posyandu';

export type BarisRekapRt = {
    rt: string;
    s: number;
    d: number;
    n: number;
    t: number;
    o: number;
    b: number;
    bgm: number;
};

export type TabPeriode = 'bulanan' | 'tahunan';

export type PropsLaporan = {
    periode: Periode;
    tab: TabPeriode;
    onGantiTab: (tab: TabPeriode) => void;
    rekapPerRt: BarisRekapRt[];
    total: BarisRekapRt;
    wilayahRt: string[];
    rw: string;
    kelurahan: string;
    periodeTerisi: Periode | null;
    onPindahPeriode?: (id: string) => void;
    laporanLive?: ReturnType<typeof useLaporanServer>;
    bolehUnduh?: boolean;
    demo?: boolean;
};
export type TabRekap = 'zscore' | '2t';
export type KategoriT = 'semua' | '2t' | '1t';
