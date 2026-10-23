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

import { ExternalLink, Info, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import Dialog, { KakiDialog } from '@/components/dialog';
import IkonWhatsApp from '@/components/ikon-whatsapp';
import { nomorBaku, nomorTampil, tautanWa } from '@/lib/pesan-wa';

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
    /** Nomor baku `62…` yang akan dituju, atau null bila belum tersimpan di profil. */
    nomor: string | null;
    modeUji: boolean;
    onTutup: () => void;
}) {
    const [tahap, setTahap] = useState<Tahap>(
        buatTautan === undefined ? 'siap' : 'menyiapkan',
    );
    const [tautanHasil, setTautanHasil] = useState<string | null>(null);
    const [isianNomor, setIsianNomor] = useState(() =>
        nomor ? nomorTampil(nomor) : '',
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
                setTautanHasil(tautan);
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
    const nomorTujuan =
        modeUji && nomor !== null ? nomor : nomorBaku(isianNomor);

    return (
        <Dialog
            judul={`Kirim hasil & rekomendasi ${nama} ke WhatsApp`}
            keterangan="Periksa nomor tujuan dan ringkasan pesan. Setelah WhatsApp terbuka, tekan Kirim di sana."
            lebar="w-[700px]"
            onTutup={onTutup}
        >
            <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-7 py-4.5">
                {modeUji && nomor !== null ? (
                    <p
                        role="status"
                        className="flex items-start gap-2.5 rounded-lg bg-tone-amber-bg px-4 py-3 text-base font-semibold text-tone-amber"
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
                    <div>
                        <label
                            htmlFor="nomor-tujuan-wa"
                            className="block text-base font-semibold text-muted-foreground"
                        >
                            Nomor WhatsApp orang tua
                        </label>
                        <input
                            id="nomor-tujuan-wa"
                            type="tel"
                            inputMode="tel"
                            value={isianNomor}
                            onChange={(e) =>
                                setIsianNomor(
                                    e.target.value.replace(/[^\d +-]/g, ''),
                                )
                            }
                            placeholder="Contoh: 0812-3456-7890"
                            className="isian mt-1.5 w-full text-base"
                        />
                        {isianNomor.trim() === '' ? (
                            <p className="mt-1 text-sm text-tone-amber">
                                Nomor WhatsApp belum tercatat di profil anak.
                                Ketik nomor WhatsApp orang tua di atas untuk
                                mengirim pesan.
                            </p>
                        ) : nomorTujuan === null ? (
                            <p className="mt-1 text-sm text-tone-red">
                                Format nomor seluler belum lengkap (gunakan
                                awalan 08… atau +62 8…).
                            </p>
                        ) : (
                            <p className="mt-1 text-sm text-muted-foreground">
                                Siap dikirim ke{' '}
                                <span className="font-bold text-foreground">
                                    {nomorTampil(nomorTujuan)}
                                </span>
                                .
                            </p>
                        )}
                    </div>
                )}

                {tautanHasil !== null && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-subtle px-4 py-3">
                        <div className="text-sm">
                            <p className="font-bold text-foreground">
                                Tautan pratinjau ringkasan & PDF siap dikirim
                            </p>
                            <p className="text-muted-foreground">
                                Berisi kurva KMS, tabel status gizi, hasil
                                diskusi tumbuh kembang, dan rekomendasi Buku
                                KIA.
                            </p>
                        </div>
                        <a
                            href={tautanHasil}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tombol-kedua shrink-0 px-3.5 py-2 text-sm font-bold"
                        >
                            <ExternalLink
                                className="size-4"
                                aria-hidden="true"
                            />
                            Lihat Pratinjau PDF
                        </a>
                    </div>
                )}

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
                        Tautan hasil lengkap belum dapat dibuat, jadi pesan
                        dikirim tanpa tautan.
                    </p>
                )}

                <div>
                    <label
                        htmlFor="isi-pesan-wa"
                        className="block text-base font-semibold text-muted-foreground"
                    >
                        Isi pesan (dapat disesuaikan sebelum dikirim)
                    </label>
                    <textarea
                        id="isi-pesan-wa"
                        value={menyiapkan ? 'Menyiapkan tautan hasil…' : pesan}
                        disabled={menyiapkan}
                        onChange={(e) => setPesan(e.target.value)}
                        rows={15}
                        className="mt-1.5 w-full resize-y rounded-lg border-2 border-border-strong bg-surface px-3.5 py-3 text-base leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:text-muted-foreground lg:pendek:h-[272px]"
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
                    disabled={
                        menyiapkan ||
                        pesan.trim() === '' ||
                        nomorTujuan === null
                    }
                    onClick={() => {
                        if (nomorTujuan === null) {
                            return;
                        }

                        window.open(
                            tautanWa(nomorTujuan, pesan),
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
