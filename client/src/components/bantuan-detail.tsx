import { BookOpen, Lightbulb, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
export default function BantuanDetail({
    bagian,
    children,
    terbuka,
    onTutup,
}: {
    bagian: string;
    children?: ReactNode;
    terbuka: boolean;
    onTutup: () => void;
}) {
    const panel = useRef<HTMLElement>(null);
    useEffect(() => {
        const main = panel.current?.closest('main');
        const header = main?.querySelector<HTMLElement>(':scope > header');

        if (!main || !header) {
            return;
        }

        const sesuaikan = () =>
            main.style.setProperty(
                '--detail-header-height',
                header.getBoundingClientRect().height + 'px',
            );
        const observer = new ResizeObserver(sesuaikan);
        observer.observe(header);
        sesuaikan();

        return () => {
            observer.disconnect();
            main.style.removeProperty('--detail-header-height');
        };
    }, []);
    const judul: Record<string, string> = {
        'laporan-zscore': 'Rekap Z-score bulanan',
        'laporan-2t': 'Riwayat 1T dan 2T+',
        kartu: 'Kartu identitas balita',
        sasaran: 'Sasaran dan impor bulanan',
        kms: 'Pemeriksaan KMS',
        pengaturan: 'Pengaturan',
        profil: 'Profil anak',
        status: 'Status gizi',
        kurva: 'Kurva KMS',
        grafik: 'Grafik pertumbuhan',
        riwayat: 'Riwayat ukur',
    };

    return (
        <aside
            id="bantuan-detail"
            ref={panel}
            hidden={!terbuka}
            className="bantuan-detail kartu"
            aria-label={'Bantuan ' + judul[bagian]}
        >
            <header className="flex items-start justify-between gap-2 border-b border-border p-4">
                <div>
                    <h2 className="text-base font-bold">Bantuan</h2>
                    <p className="text-sm text-muted-foreground">
                        {judul[bagian]}
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Tutup bantuan"
                    className="flex size-13 shrink-0 items-center justify-center rounded-lg hover:bg-accent"
                    onClick={onTutup}
                >
                    <X className="size-5" aria-hidden="true" />
                </button>
            </header>
            <div className="bantuan-detail-isi p-4">
                {children}
                {bagian === 'kartu' && (
                    <>
                        <p>
                            Centang balita pada daftar untuk memilih kartu yang
                            akan dicetak. Gunakan pencarian dan filter RT untuk
                            menemukan balita.
                        </p>
                        <p className="mt-3">
                            Pilih semua menambahkan balita yang sesuai filter.
                            Kosongkan menghapus seluruh pilihan, termasuk yang
                            tidak terlihat karena filter.
                        </p>
                        <p className="mt-3">
                            Jika beberapa kartu dipilih, gunakan pilihan kartu
                            di pratinjau untuk memeriksa satu per satu. Satu
                            lembar A4 memuat 8 kartu.
                        </p>
                        <p className="mt-3">
                            Periksa pilihan dan jumlah lembar, lalu tekan Cetak
                            kartu.
                        </p>
                    </>
                )}
                {bagian === 'riwayat' && (
                    <>
                        <div className="mx-5 mt-4 rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-sky-950 sm:mx-6">
                            <div className="flex items-start gap-2.5">
                                <Lightbulb
                                    className="size-5 shrink-0 text-amber-500"
                                    aria-hidden="true"
                                />
                                <div className="text-xs leading-relaxed sm:text-sm">
                                    <span className="font-bold">
                                        Panduan Ibu Kader:
                                    </span>{' '}
                                    Klik tanggal kunjungan untuk memilih dan
                                    menyorot titik di tab Kurva KMS. Periksa
                                    kolom <strong>Pertumbuhan</strong> untuk
                                    memantau apakah berat badan balita{' '}
                                    <strong>Naik (N)</strong> atau{' '}
                                    <strong>Tidak Naik (T)</strong> sesuai
                                    standar KBM Buku KIA.
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-border bg-surface-subtle/70 p-4 sm:p-5">
                            <div className="mb-2.5 flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-foreground uppercase">
                                    <BookOpen
                                        className="size-4 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        Arti Status Pertumbuhan (N / T / O / B)
                                        Buku KIA Kemenkes RI
                                    </span>
                                </span>
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                    Standar Pemantauan Posyandu
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-2.5 text-emerald-950">
                                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                                        N
                                    </span>
                                    <div className="text-xs leading-tight">
                                        <span className="font-bold">
                                            Naik (N):
                                        </span>{' '}
                                        Kenaikan berat badan sama dengan atau di
                                        atas target KBM.
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-amber-950">
                                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                                        T
                                    </span>
                                    <div className="text-xs leading-tight">
                                        <span className="font-bold">
                                            Tidak Naik (T):
                                        </span>{' '}
                                        Berat badan tetap, turun, atau
                                        kenaikannya kurang dari KBM.
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/80 p-2.5 text-sky-950">
                                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                                        B
                                    </span>
                                    <div className="text-xs leading-tight">
                                        <span className="font-bold">
                                            Baru (B):
                                        </span>{' '}
                                        Balita baru pertama kali ditimbang di
                                        Posyandu ini.
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-100/80 p-2.5 text-slate-900">
                                    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-bold text-white">
                                        O
                                    </span>
                                    <div className="text-xs leading-tight">
                                        <span className="font-bold">
                                            Tidak Hadir (O):
                                        </span>{' '}
                                        Bulan lalu tidak hadir sehingga garis
                                        pemantauan terputus.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-sm">
                            BB/U: berat badan menurut umur. BB/PB atau BB/TB:
                            berat menurut panjang atau tinggi badan. PB/U atau
                            TB/U: panjang atau tinggi badan menurut umur.
                        </p>
                    </>
                )}
                {bagian === 'grafik' && (
                    <>
                        <div className="mx-5 mt-4 rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-sky-950 sm:mx-6">
                            <div className="flex items-start gap-2.5">
                                <Lightbulb
                                    className="size-5 shrink-0 text-amber-500"
                                    aria-hidden="true"
                                />
                                <div className="text-xs leading-relaxed sm:text-sm">
                                    <span className="font-bold">
                                        Panduan Ibu Kader:
                                    </span>{' '}
                                    Pilih salah satu dari 6 indikator
                                    pertumbuhan di bawah. Setiap tombol
                                    menampilkan status gizi terkini balita.
                                    Ketuk titik mana saja pada kurva untuk
                                    melihat rincian tanggal ukur, nilai,
                                    z-score, dan perbandingan dengan bulan
                                    sebelumnya.
                                </div>
                            </div>
                        </div>
                    </>
                )}
                {bagian === 'profil' && (
                    <p>
                        Periksa identitas dan kelengkapan data anak. Gunakan
                        Ubah data balita untuk memperbarui informasi. Pilih tab
                        lain atau navigasi di bawah untuk melanjutkan.
                    </p>
                )}
                {bagian === 'status' && (
                    <p>
                        Lihat tanggal pengukuran, hasil tiap indeks, dan arahan
                        tindak lanjut. Usia saat pengukuran berbeda dari usia
                        hari ini pada diskusi tumbuh kembang. Gunakan bagian
                        diskusi saat membahas hasil bersama keluarga.
                    </p>
                )}
                {bagian === 'kurva' && (
                    <p>
                        Pilih rentang umur, lalu pilih titik pengukuran untuk
                        melihat rinciannya. Gunakan legenda pita warna di bawah
                        grafik. Buka Grafik Pertumbuhan untuk melihat indeks
                        lain, atau Riwayat Ukur untuk membaca tabel lengkap.
                    </p>
                )}
            </div>
        </aside>
    );
}
