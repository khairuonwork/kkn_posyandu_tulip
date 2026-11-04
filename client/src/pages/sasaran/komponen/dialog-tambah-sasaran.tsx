import { RefreshCw, Search, UserRoundPlus, X } from 'lucide-react';
import type { CalonSasaran } from '@/lib/sasaran';

export function DialogTambahSasaran({
    tambahTerbuka,
    setTambahTerbuka,
    cariCalon,
    setCariCalon,
    cariAnakMaster,
    memuatCalon,
    calon,
    tambahAnak,
    anakDitambahkan,
    sudahCariCalon,
}: {
    tambahTerbuka: boolean;
    setTambahTerbuka: (terbuka: boolean) => void;
    cariCalon: string;
    setCariCalon: (cari: string) => void;
    cariAnakMaster: () => void | Promise<void>;
    memuatCalon: boolean;
    calon: CalonSasaran[];
    tambahAnak: (item: CalonSasaran) => void | Promise<void>;
    anakDitambahkan: number | null;
    sudahCariCalon: boolean;
}) {
    if (!tambahTerbuka) {
        return null;
    }

    return (
        <div className="border-b border-border bg-surface-subtle/60 p-4 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-bold">
                        Tambahkan anak dari Data Balita
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Pilih profil yang sudah ada di database. Profil master
                        dan riwayatnya tidak diubah.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setTambahTerbuka(false)}
                    className="tombol-kedua min-h-9 px-3"
                    aria-label="Tutup pencarian anak"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            </div>
            <form
                className="mt-4 flex max-w-3xl flex-wrap gap-2"
                onSubmit={(event) => {
                    event.preventDefault();
                    void cariAnakMaster();
                }}
            >
                <label className="flex min-h-11 min-w-[220px] flex-1 items-center gap-3 rounded-lg border border-border-strong bg-surface px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
                    <Search
                        className="size-5 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <span className="sr-only">Cari anak di Data Balita</span>
                    <input
                        value={cariCalon}
                        disabled={memuatCalon}
                        onChange={(event) => setCariCalon(event.target.value)}
                        placeholder="Nama, NIK, atau nama orang tua"
                        className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
                    />
                </label>
                <button
                    type="submit"
                    disabled={memuatCalon || cariCalon.trim().length < 2}
                    className="tombol-kedua"
                >
                    {memuatCalon ? (
                        <RefreshCw
                            className="size-4 animate-spin"
                            aria-hidden="true"
                        />
                    ) : (
                        <Search className="size-4" aria-hidden="true" />
                    )}
                    Cari anak
                </button>
            </form>
            {calon.length > 0 && (
                <ul className="sasaran-hasil-masuk mt-3 max-w-3xl divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                    {calon.map((item) => (
                        <li
                            key={item.anakId}
                            className="flex flex-wrap items-center justify-between gap-3 p-3"
                        >
                            <div>
                                <p className="font-bold">{item.nama}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {item.nik ?? 'NIK belum tercatat'} · RT{' '}
                                    {item.rt} ·{' '}
                                    {item.namaOrtu ??
                                        'Orang tua belum tercatat'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => void tambahAnak(item)}
                                disabled={anakDitambahkan !== null}
                                className="tombol-utama min-h-9 px-3"
                            >
                                {anakDitambahkan === item.anakId ? (
                                    <RefreshCw
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <UserRoundPlus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                )}
                                Tambahkan
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {!memuatCalon && sudahCariCalon && calon.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                    Tidak ada anak aktif yang cocok, atau semua hasil sudah
                    masuk sasaran periode ini.
                </p>
            )}
        </div>
    );
}
