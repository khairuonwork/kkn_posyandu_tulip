import { AlertTriangle, Filter, Search, X } from 'lucide-react';
import Pilih from '@/components/pilih';
import type { BarisLaporanLive, LaporanLive } from '@/lib/laporan';
import TabLaporan from './tab-laporan';
import type { KategoriT, TabRekap } from './tipe';
export default function FilterLaporan({
    tab,
    data,
    totalT,
    jumlahDuaT,
    jumlahSatuT,
    standar,
    setStandar,
    indeks,
    setIndeks,
    daftarIndeks,
    kategoriT,
    setKategoriT,
    cari,
    setCari,
    rtDipilih,
    setRtDipilih,
    daftarT,
    daftarRtTersedia,
    daftarTersaring,
}: {
    tab: TabRekap;
    data: LaporanLive | null;
    totalT: number;
    jumlahDuaT: number;
    jumlahSatuT: number;
    standar: string;
    setStandar: (value: string) => void;
    indeks: string;
    setIndeks: (value: string) => void;
    daftarIndeks: string[][];
    kategoriT: KategoriT;
    setKategoriT: (value: KategoriT) => void;
    cari: string;
    setCari: (value: string) => void;
    rtDipilih: string;
    setRtDipilih: (value: string) => void;
    daftarT: BarisLaporanLive[];
    daftarRtTersedia: string[];
    daftarTersaring: BarisLaporanLive[];
}) {
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface-subtle/60 px-5 py-4 sm:px-6">
                <TabLaporan aktif={tab} totalT={totalT} />

                {tab === 'zscore' ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <span>Standar:</span>
                            <Pilih
                                id="laporan-standar"
                                value={standar}
                                onChange={setStandar}
                                className="isian min-h-9 min-w-[140px] rounded-lg border-border-strong text-xs font-semibold"
                            >
                                {(data?.standar ?? [standar]).map((value) => (
                                    <option key={value} value={value}>
                                        {value === 'PERMENKES-2-2020'
                                            ? 'Permenkes 2/2020'
                                            : value === 'WHO-2006'
                                              ? 'WHO 2006'
                                              : value}
                                    </option>
                                ))}
                            </Pilih>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <span>Indeks Antropometri:</span>
                            <Pilih
                                id="laporan-indeks"
                                value={indeks}
                                onChange={setIndeks}
                                className="isian min-h-9 max-w-[300px] rounded-lg border-border-strong text-xs font-bold text-primary"
                            >
                                {daftarIndeks.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </Pilih>
                        </label>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 text-xs font-bold text-muted-foreground">
                            Saring Status:
                        </span>
                        <button
                            type="button"
                            onClick={() => setKategoriT('semua')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                kategoriT === 'semua'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'border border-border bg-surface text-muted-foreground hover:bg-surface-subtle'
                            }`}
                        >
                            Semua ({totalT})
                        </button>
                        <button
                            type="button"
                            onClick={() => setKategoriT('2t')}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                kategoriT === '2t'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100'
                            }`}
                        >
                            <AlertTriangle
                                className="size-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Kritis 2T+ ({jumlahDuaT})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setKategoriT('1t')}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                kategoriT === '1t'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            }`}
                        >
                            <AlertTriangle
                                className="size-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            <span>Waspada 1T ({jumlahSatuT})</span>
                        </button>
                    </div>
                )}
            </div>
            <div className="border-b border-border bg-surface-subtle/30 px-5 py-3.5 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex max-w-sm min-w-[260px] flex-1 items-center gap-2.5 rounded-xl border border-border-strong bg-surface px-3 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-ring">
                        <Search
                            className="size-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <input
                            value={cari}
                            onChange={(e) => setCari(e.target.value)}
                            placeholder={
                                tab === 'zscore'
                                    ? 'Cari nama balita, NIK, atau nama ibu...'
                                    : 'Cari balita 1T/2T, NIK, atau nama ibu...'
                            }
                            className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground"
                        />
                        {cari !== '' && (
                            <button
                                type="button"
                                onClick={() => setCari('')}
                                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                                aria-label="Hapus pencarian"
                            >
                                <X
                                    className="size-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 flex items-center gap-1 text-xs font-bold text-muted-foreground">
                            <Filter className="size-3" aria-hidden="true" />
                            RT:
                        </span>
                        <button
                            type="button"
                            onClick={() => setRtDipilih('semua')}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                rtDipilih === 'semua'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'border border-border bg-surface text-muted-foreground hover:bg-surface-subtle'
                            }`}
                        >
                            Semua RT (
                            {tab === 'zscore'
                                ? (data?.bulanan.length ?? 0)
                                : daftarT.length}
                            )
                        </button>
                        {daftarRtTersedia.map((rt) => {
                            const hitungRt = (
                                tab === 'zscore'
                                    ? (data?.bulanan ?? [])
                                    : daftarT
                            ).filter((i) => i.rt === rt).length;

                            return (
                                <button
                                    key={rt}
                                    type="button"
                                    onClick={() => setRtDipilih(rt)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                        rtDipilih === rt
                                            ? 'bg-primary text-white shadow-xs'
                                            : 'border border-border bg-surface text-muted-foreground hover:bg-surface-subtle'
                                    }`}
                                >
                                    RT {rt} ({hitungRt})
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Counter Info */}
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <p>
                        Menampilkan{' '}
                        <strong className="text-foreground">
                            {daftarTersaring.length}
                        </strong>{' '}
                        balita
                        {rtDipilih !== 'semua' && ` · Saringan RT ${rtDipilih}`}
                        {cari !== '' && ` · Kata kunci: "${cari}"`}
                        {tab === 'zscore' &&
                            ` · Indeks: ${daftarIndeks.find((d) => d[0] === indeks)?.[1] ?? indeks}`}
                        {tab === '2t' &&
                            kategoriT !== 'semua' &&
                            ` · Kategori: ${kategoriT === '2t' ? 'Kritis 2T+' : 'Waspada 1T'}`}
                    </p>
                </div>
            </div>
        </>
    );
}
