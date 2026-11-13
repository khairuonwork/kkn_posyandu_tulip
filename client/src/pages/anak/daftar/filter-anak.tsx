import {
    Baby,
    ChevronDown,
    ClipboardCheck,
    Search,
    TriangleAlert,
} from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { labelRt } from './tipe';

export function FilterAnak({
    tabAktif,
    setTabAktif,
    jumlahHariIni,
    jumlahAktif,
    anakDalamLingkupCount,
    lingkup,
    kataCari,
    setCariHariIni,
    setCariSemua,
    rtTerkunci,
    rtAktif,
    setRt,
    wilayahRt,
    hanyaPerhatian,
    setHanyaPerhatian,
    hanyaRisiko,
    setHanyaRisiko,
}: {
    tabAktif: 'hari-ini' | 'semua';
    setTabAktif: (tab: 'hari-ini' | 'semua') => void;
    jumlahHariIni: number;
    jumlahAktif: number;
    anakDalamLingkupCount: number;
    lingkup: string;
    kataCari: string;
    setCariHariIni: Dispatch<SetStateAction<string>>;
    setCariSemua: Dispatch<SetStateAction<string>>;
    rtTerkunci: string | null;
    rtAktif: string;
    setRt: Dispatch<SetStateAction<string>>;
    wilayahRt: string[];
    hanyaPerhatian: boolean;
    setHanyaPerhatian: Dispatch<SetStateAction<boolean>>;
    hanyaRisiko: boolean;
    setHanyaRisiko: Dispatch<SetStateAction<boolean>>;
}) {
    return (
        <>
            <div
                role="tablist"
                aria-label="Daftar balita"
                className="flex shrink-0 gap-1 border-b border-border bg-surface px-4.5 pt-2.5"
            >
                {(
                    [
                        ['hari-ini', 'Hasil hari ini', jumlahHariIni],
                        [
                            'semua',
                            'Semua balita',
                            lingkup === 'aktif'
                                ? jumlahAktif
                                : anakDalamLingkupCount,
                        ],
                    ] as const
                ).map(([id, label, jumlah]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        id={`tab-anak-${id}`}
                        aria-controls={`panel-anak-${id}`}
                        aria-selected={tabAktif === id}
                        tabIndex={tabAktif === id ? 0 : -1}
                        onClick={() => setTabAktif(id)}
                        className={`-mb-px flex min-h-12 items-center gap-2 border-b-2 px-3.5 text-sm font-bold transition-colors sm:px-5 max-lg:min-h-[44px] pointer-coarse:min-h-[44px] ${tabAktif === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-surface-subtle hover:text-foreground'}`}
                    >
                        {id === 'hari-ini' ? (
                            <ClipboardCheck
                                className="size-4.5"
                                aria-hidden="true"
                            />
                        ) : (
                            <Baby className="size-4.5" aria-hidden="true" />
                        )}
                        {label}
                        <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-foreground tabular-nums">
                            {jumlah}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex shrink-0 flex-wrap items-end gap-x-4.5 gap-y-3.5 border-b border-border px-4.5 pt-3.5 pb-4">
                <div className="min-w-60 flex-1">
                    <label
                        htmlFor="cari-anak"
                        className="block text-sm font-semibold text-muted-foreground"
                    >
                        {tabAktif === 'hari-ini'
                            ? 'Cari anak yang diukur hari ini'
                            : 'Cari nama balita atau nama ibu'}
                    </label>
                    <div className="isian mt-1.5 flex w-full items-stretch gap-2.5 bg-card px-3.5">
                        <Search
                            className="size-5 shrink-0 self-center text-muted-foreground"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        <input
                            id="cari-anak"
                            type="search"
                            value={kataCari}
                            placeholder={
                                tabAktif === 'hari-ini'
                                    ? 'Cari hasil ukur hari ini…'
                                    : 'Cari di semua data balita…'
                            }
                            onChange={(e) =>
                                tabAktif === 'hari-ini'
                                    ? setCariHariIni(e.target.value)
                                    : setCariSemua(e.target.value)
                            }
                            className="min-w-0 flex-1 self-stretch bg-transparent text-base outline-none"
                        />
                    </div>
                </div>

                {rtTerkunci !== null ? (
                    <p className="flex min-h-14 items-center rounded-lg bg-surface-alt px-3.5 text-base">
                        {labelRt(rtTerkunci)}, wilayah binaan Anda
                    </p>
                ) : (
                    <div className="w-44">
                        <label
                            htmlFor="filter-rt"
                            className="block text-sm font-semibold text-muted-foreground"
                        >
                            RT
                        </label>
                        <div className="relative mt-1.5">
                            <select
                                id="filter-rt"
                                value={rtAktif}
                                onChange={(e) => setRt(e.target.value)}
                                className="isian w-full cursor-pointer appearance-none bg-card pr-11"
                            >
                                <option value="">Semua RT</option>
                                {wilayahRt.map((w) => (
                                    <option key={w} value={w}>
                                        {labelRt(w)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                        </div>
                    </div>
                )}

                <div
                    role="group"
                    aria-label="Tampilkan hanya"
                    className="flex flex-wrap gap-3.5"
                >
                    <button
                        type="button"
                        aria-pressed={hanyaPerhatian}
                        onClick={() => setHanyaPerhatian((b) => !b)}
                        className={
                            hanyaPerhatian
                                ? 'tombol-utama min-h-14'
                                : 'tombol-kedua min-h-14 bg-surface'
                        }
                    >
                        <TriangleAlert
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Perhatian pada hasil terakhir
                    </button>
                    <button
                        type="button"
                        aria-pressed={hanyaRisiko}
                        onClick={() => setHanyaRisiko((b) => !b)}
                        className={
                            hanyaRisiko
                                ? 'tombol-utama min-h-14'
                                : 'tombol-kedua min-h-14 bg-surface'
                        }
                    >
                        <Baby
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        BBLR atau tanpa Buku KIA
                    </button>
                </div>
            </div>
        </>
    );
}
