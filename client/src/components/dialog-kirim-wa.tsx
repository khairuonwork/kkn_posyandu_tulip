/**
 * Pratinjau pesan sebelum WhatsApp dibuka.
 *
 * Pesan tentang gizi seorang anak tidak dikirim diam-diam: petugas membaca dan
 * dapat mengubah isinya di sini, lalu menekan Kirim sekali lagi di dalam
 * WhatsApp. Portal tidak pernah tahu apakah pesan itu benar-benar terkirim,
 * sehingga tidak ada catatan "sudah dikirim" (docs/prd/feedback/F03).
 *
 * Bila `VITE_WA_NOMOR_UJI` terisi, seluruh pesan diarahkan ke nomor itu dan
 * dialog menandainya. Nomor orang tua yang sebenarnya tidak tersentuh selama
 * pengujian.
 *
 * Tautan Lembar Hasil dibuat saat dialog dibuka dan langsung masuk ke pesan.
 * Bila tidak bisa dibuat (demo, atau server belum siap), pesan tetap dapat
 * dikirim tanpa baris tautan, dan dialog menyebutkannya.
 */

import { Info, MessageCircle, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import Dialog, { KakiDialog } from '@/components/dialog';
import { nomorTampil, tautanWa } from '@/lib/pesan-wa';

type Tahap = 'menyiapkan' | 'siap' | 'tanpa-tautan';

export default function DialogKirimWa({
    nama,
    susun,
    buatTautan,
    nomor,
    modeUji,
    onTutup,
}: {
    nama: string;
    /** Menyusun teks pesan; `tautan` null bila tidak ada. */
    susun: (tautan: string | null) => string;
    /** Membuat tautan Lembar Hasil; tidak diberikan di demo. */
    buatTautan?: () => Promise<string | null>;
    /** Nomor baku `62…` yang akan dituju. */
    nomor: string;
    modeUji: boolean;
    onTutup: () => void;
}) {
    const [tahap, setTahap] = useState<Tahap>(
        buatTautan === undefined ? 'siap' : 'menyiapkan',
    );
    const [pesan, setPesan] = useState(() =>
        buatTautan === undefined ? susun(null) : '',
    );

    useEffect(() => {
        if (buatTautan === undefined) {
            return;
        }

        let aktif = true;

        void buatTautan().then((tautan) => {
            if (aktif) {
                setPesan(susun(tautan));
                setTahap(tautan === null ? 'tanpa-tautan' : 'siap');
            }
        });

        return () => {
            aktif = false;
        };
        // Tautan dibuat sekali per pembukaan dialog.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const menyiapkan = tahap === 'menyiapkan';

    return (
        <Dialog
            judul={`Kirim hasil ${nama} ke WhatsApp`}
            keterangan="Periksa dan ubah isi pesan bila perlu. WhatsApp akan terbuka dengan pesan ini; Ibu/Bapak tetap menekan Kirim di dalamnya."
            lebar="w-[680px]"
            onTutup={onTutup}
        >
            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-7 py-4.5">
                {modeUji ? (
                    <p
                        role="status"
                        className="flex items-start gap-2.5 rounded-lg bg-tone-amber-bg px-4 py-3 text-sm font-semibold text-tone-amber"
                    >
                        <TriangleAlert
                            className="mt-0.5 size-5 shrink-0"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Mode uji. Pesan ini dikirim ke {nomorTampil(nomor)},
                        bukan ke nomor orang tua.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Tujuan:{' '}
                        <span className="font-bold text-foreground">
                            {nomorTampil(nomor)}
                        </span>{' '}
                        (nomor WhatsApp orang tua)
                    </p>
                )}

                {tahap === 'tanpa-tautan' && (
                    <p
                        role="status"
                        className="flex items-start gap-2.5 text-sm text-muted-foreground"
                    >
                        <Info
                            className="mt-0.5 size-4 shrink-0"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Tautan hasil lengkap belum dapat dibuat, sehingga pesan
                        tidak memuat tautan. Pesan tetap dapat dikirim.
                    </p>
                )}

                <div>
                    <label
                        htmlFor="isi-pesan-wa"
                        className="block text-sm font-semibold text-muted-foreground"
                    >
                        Isi pesan
                    </label>
                    <textarea
                        id="isi-pesan-wa"
                        value={menyiapkan ? 'Menyiapkan tautan hasil…' : pesan}
                        disabled={menyiapkan}
                        onChange={(e) => setPesan(e.target.value)}
                        rows={15}
                        className="mt-1.5 w-full resize-y rounded-lg border-2 border-border bg-surface px-3.5 py-3 text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:text-muted-foreground"
                    />
                </div>
            </div>

            <KakiDialog>
                <button
                    type="button"
                    onClick={onTutup}
                    className="tombol-kedua px-5.5"
                >
                    Batal
                </button>
                <button
                    type="button"
                    disabled={menyiapkan || pesan.trim() === ''}
                    onClick={() => {
                        window.open(
                            tautanWa(nomor, pesan),
                            '_blank',
                            'noopener,noreferrer',
                        );
                        onTutup();
                    }}
                    className="tombol-utama px-5.5 disabled:opacity-50"
                >
                    <MessageCircle
                        className="size-5"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    Buka WhatsApp
                </button>
            </KakiDialog>
        </Dialog>
    );
}
