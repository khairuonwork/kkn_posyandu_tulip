import { Pencil, Save } from 'lucide-react';

/** Kaki panel: berapa yang belum disimpan, lalu Batalkan dan Simpan. */
export function BilahSimpan({
    perubahan,
    bisaSimpan,
    tanpaTempat,
    onSimpan,
    onBatal,
}: {
    perubahan: string[];
    bisaSimpan: boolean;
    tanpaTempat: boolean;
    onSimpan: () => void;
    onBatal: () => void;
}) {
    const ada = perubahan.length > 0;

    return (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4.5 gap-y-3 border-t border-border px-7 py-3.5">
            <div
                role="status"
                className="flex min-w-0 flex-1 basis-64 items-center gap-3.5"
            >
                {ada ? (
                    <>
                        <span
                            aria-hidden="true"
                            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-tone-blue-bg text-tone-blue"
                        >
                            <Pencil className="size-5" strokeWidth={2.25} />
                        </span>
                        <span className="flex min-w-0 flex-col leading-snug">
                            <span className="text-base font-extrabold text-tone-blue">
                                {perubahan.length} perubahan belum disimpan
                            </span>
                            <span className="text-sm text-muted-foreground">
                                {perubahan.length === 1
                                    ? perubahan[0]
                                    : `${perubahan[0].slice(0, -1)}, dan ${perubahan.length - 1} perubahan lainnya.`}{' '}
                                Berlaku mulai penimbangan berikutnya.
                            </span>
                        </span>
                    </>
                ) : (
                    <span className="text-sm text-muted-foreground">
                        {tanpaTempat
                            ? 'Belum ada tempat menyimpannya: tabel pengaturan belum ada di basis data.'
                            : 'Belum ada perubahan.'}
                    </span>
                )}
            </div>
            <div className="flex shrink-0 gap-2.5">
                {ada && (
                    <button
                        type="button"
                        onClick={onBatal}
                        className="tombol-kedua"
                    >
                        Batalkan perubahan
                    </button>
                )}
                <button
                    type="button"
                    disabled={!bisaSimpan}
                    onClick={onSimpan}
                    className="tombol-utama disabled:cursor-not-allowed disabled:bg-border disabled:text-muted-foreground disabled:shadow-none"
                >
                    <Save
                        className="size-5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Simpan pengaturan
                </button>
            </div>
        </div>
    );
}
