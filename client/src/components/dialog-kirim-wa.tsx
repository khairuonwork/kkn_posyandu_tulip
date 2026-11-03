/**
 * Pratinjau pesan sebelum WhatsApp dibuka.
 *
 * Pesan tentang gizi seorang anak tidak dikirim diam-diam: petugas membaca dan
 * dapat mengubah isinya di sini, lalu menekan Kirim sekali lagi di dalam
 * WhatsApp. Portal tidak pernah tahu apakah pesan itu benar-benar terkirim,
 * sehingga tidak ada catatan "sudah dikirim" (docs/prd/feedback/F03).
 *
 * Tautan Lembar Hasil dibuat saat dialog dibuka dan langsung masuk ke pesan.
 * Bila tidak bisa dibuat (demo, atau server belum siap), pesan tetap dapat
 * dikirim tanpa baris tautan, dan dialog menyebutkannya.
 */

import { ExternalLink, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import Dialog, { KakiDialog } from '@/components/dialog';
import IkonWhatsApp from '@/components/ikon-whatsapp';
import { nomorTampil, tautanWa } from '@/lib/pesan-wa';

type Tahap = 'menyiapkan' | 'siap' | 'tanpa-tautan';

export default function DialogKirimWa({
    nama,
    susun,
    buatTautan,
    nomor,
    modeUji = false,
    onTutup,
}: {
    nama: string;
    /** Menyusun teks pesan; `tautan` null bila tidak ada. */
    susun: (tautan: string | null) => string;
    /** Membuat tautan Lembar Hasil; tidak diberikan di demo. */
    buatTautan?: () => Promise<string | null>;
    /** Nomor baku `62…` yang sudah divalidasi dari profil orang tua. */
    nomor: string;
    modeUji?: boolean;
    onTutup: () => void;
}) {
    const [tahap, setTahap] = useState<Tahap>(
        buatTautan === undefined ? 'siap' : 'menyiapkan',
    );
    const [tautanHasil, setTautanHasil] = useState<string | null>(null);
    const [pesan, setPesan] = useState(() =>
        buatTautan === undefined ? susun(null) : '',
    );
    const [pesanAwal, setPesanAwal] = useState(pesan);

    useEffect(() => {
        if (buatTautan === undefined) {
            return;
        }

        let aktif = true;

        void buatTautan()
            .catch(() => null)
            .then((tautan) => {
                if (aktif) {
                    const awal = susun(tautan);
                    setTautanHasil(tautan);
                    setPesan(awal);
                    setPesanAwal(awal);
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
            judul="Pratinjau pesan WhatsApp"
            keterangan={`${nama}. Periksa nomor dan isi pesan. Setelah WhatsApp terbuka, tekan Kirim di sana.`}
            lebar="w-[720px]"
            ikon={IkonWhatsApp as any}
            onTutup={onTutup}
            berubah={pesan !== pesanAwal}
        >
            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-7 py-4.5">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">
                        {modeUji ? 'Nomor WhatsApp uji' : 'Nomor WhatsApp orang tua'}
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums">
                        {nomorTampil(nomor)}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {modeUji ? 'Pesan akan dikirim ke nomor uji.' : 'Nomor tujuan mengikuti profil anak. Ubah melalui Ubah data balita jika perlu diperbarui.'}
                    </p>
                </div>

                {tahap === 'tanpa-tautan' && (
                    <p
                        role="status"
                        className="flex items-start gap-2.5 text-base text-muted-foreground"
                    >
                        <Info
                            className="mt-0.5 size-4 shrink-0"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Tautan hasil belum tersedia. Pesan tetap dapat dibuka di
                        WhatsApp tanpa tautan.
                    </p>
                )}

                <div>
                    <label
                        htmlFor="isi-pesan-wa"
                        className="block text-base font-semibold text-muted-foreground"
                    >
                        Isi pesan
                    </label>
                    <textarea
                        id="isi-pesan-wa"
                        value={menyiapkan ? 'Menyiapkan tautan hasil…' : pesan}
                        disabled={menyiapkan}
                        onChange={(e) => setPesan(e.target.value)}
                        rows={10}
                        className="mt-1.5 max-h-[45dvh] min-h-40 w-full resize-y rounded-lg border-2 border-border-strong bg-surface px-3.5 py-3 text-base leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:text-muted-foreground"
                    />
                    <p className="mt-1 text-sm text-muted-foreground">
                        Pesan dapat disesuaikan sebelum membuka WhatsApp.
                    </p>
                </div>
                {tautanHasil !== null && (
                    <a
                        href={tautanHasil}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tombol-kedua self-start text-sm"
                    >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Pratinjau ringkasan dan PDF
                    </a>
                )}
            </div>

            <KakiDialog>
                <button
                    type="button"
                    data-tutup-dialog
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
                    <IkonWhatsApp className="size-5" />
                    Buka WhatsApp
                </button>
            </KakiDialog>
        </Dialog>
    );
}
