import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react';
import type { RingkasanResetHariIni } from '@/lib/sasaran';

export function DialogResetSasaran({
    pratinjauReset,
    setPratinjauReset,
    menjalankanReset,
    konfirmasiReset,
    setKonfirmasiReset,
    jalankanResetHariIni,
}: {
    pratinjauReset: RingkasanResetHariIni | null;
    setPratinjauReset: (pratinjau: RingkasanResetHariIni | null) => void;
    menjalankanReset: boolean;
    konfirmasiReset: string;
    setKonfirmasiReset: (konfirmasi: string) => void;
    jalankanResetHariIni: () => void | Promise<void>;
}) {
    if (pratinjauReset === null) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/55 p-4"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !menjalankanReset
                ) {
                    setPratinjauReset(null);
                }
            }}
        >
            <section
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="judul-reset-harian"
                className="my-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
                <div className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-tone-red-bg text-tone-red">
                        <AlertTriangle className="size-6" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2
                            id="judul-reset-harian"
                            className="text-xl font-extrabold"
                        >
                            Reset data sesi hari ini?
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Aksi admin ini akan menghapus{' '}
                            <strong className="text-foreground">
                                {pratinjauReset.jumlahPengukuran} catatan
                                pengukuran
                            </strong>{' '}
                            bertanggal {pratinjauReset.tanggal} dari periode
                            sasaran aktif beserta penilaian gizinya, lalu
                            menghapus{' '}
                            <strong className="text-foreground">
                                {pratinjauReset.jumlahAntrean} antrean hari ini
                            </strong>{' '}
                            agar anak dapat check-in lagi dengan nomor antrean
                            mulai dari 1. Sasaran tanpa catatan ukur periode
                            lain akan kembali ke “Belum dilayani”.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Tutup"
                        onClick={() => setPratinjauReset(null)}
                        disabled={menjalankanReset}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-surface-subtle"
                    >
                        <X className="size-5" aria-hidden="true" />
                    </button>
                </div>
                {pratinjauReset.jumlahPengukuran +
                    pratinjauReset.jumlahAntrean >
                0 ? (
                    <>
                        {pratinjauReset.namaAnak.length > 0 && (
                            <div className="mt-4 max-h-32 overflow-y-auto rounded-lg bg-surface-subtle p-3 text-sm">
                                {pratinjauReset.namaAnak.join(' · ')}
                            </div>
                        )}
                        <p className="mt-4 text-sm font-semibold">
                            Data master balita dan pengukuran tanggal lain
                            tidak dihapus. Pastikan semua tablet sudah
                            tersinkron; data lokal yang masih menunggu
                            sinkronisasi dapat mengirim ulang hasil ukur.
                            Setelah reset, muat ulang antrean pada semua
                            tablet sebelum check-in kembali.
                        </p>
                        <label
                            className="mt-4 block text-sm font-semibold"
                            htmlFor="konfirmasi-reset-harian"
                        >
                            Ketik{' '}
                            <code className="rounded bg-surface-subtle px-1.5 py-0.5">
                                RESET HARI INI
                            </code>{' '}
                            untuk mengaktifkan reset.
                        </label>
                        <input
                            id="konfirmasi-reset-harian"
                            value={konfirmasiReset}
                            onChange={(event) =>
                                setKonfirmasiReset(event.target.value)
                            }
                            autoComplete="off"
                            className="mt-2 min-h-11 w-full rounded-lg border border-border-strong bg-surface px-3"
                        />
                    </>
                ) : (
                    <p className="mt-4 rounded-lg bg-tone-green-bg p-4 text-sm font-semibold text-tone-green">
                        Tidak ada hasil ukur maupun antrean hari ini di periode
                        sasaran aktif.
                    </p>
                )}
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setPratinjauReset(null)}
                        disabled={menjalankanReset}
                        className="tombol-kedua"
                    >
                        Batal
                    </button>
                    {pratinjauReset.jumlahPengukuran +
                        pratinjauReset.jumlahAntrean >
                        0 && (
                        <button
                            type="button"
                            onClick={() => void jalankanResetHariIni()}
                            disabled={
                                menjalankanReset ||
                                konfirmasiReset !== 'RESET HARI INI'
                            }
                            className="tombol-utama bg-tone-red text-white hover:bg-tone-red/90 disabled:opacity-50"
                        >
                            {menjalankanReset ? (
                                <RefreshCw
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Trash2
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            )}
                            {menjalankanReset
                                ? 'Mereset data…'
                                : 'Reset data hari ini'}
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
}
