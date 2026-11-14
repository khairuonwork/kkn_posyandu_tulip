import {
    AlertTriangle,
    CircleHelp,
    Download,
    FileText,
    Info,
    RefreshCw,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import DialogGagal from '@/components/dialog-gagal';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';
import type { useLaporanServer } from '@/lib/laporan';
import { Link } from '@/lib/nav';
import type { Periode } from '@/types/posyandu';
import BantuanLaporan from './bantuan-laporan';
import FilterLaporan from './filter-laporan';
import RingkasanLaporan from './ringkasan-laporan';
import TabelLaporan from './tabel-laporan';
export default function LaporanDataLive({
    periode,
    laporan,
    bolehUnduh,
    wilayahRt = [],
    alamat,
    demo,
}: {
    periode: Periode;
    laporan: ReturnType<typeof useLaporanServer>;
    bolehUnduh: boolean;
    wilayahRt?: string[];
    alamat: string;
    demo: boolean;
}) {
    const [bantuanTerbuka, setBantuanTerbuka] = useState(false);
    const tombolBantuan = useRef<HTMLButtonElement>(null);
    const tab =
        new URLSearchParams(alamat.split('?')[1]).get('tab') === '2t'
            ? '2t'
            : 'zscore';
    const [kategoriT, setKategoriT] = useState<'semua' | '2t' | '1t'>('semua');
    const [indeks, setIndeks] = useState('BB_U');
    const [standar, setStandar] = useState('PERMENKES-2-2020');
    const [rtDipilih, setRtDipilih] = useState<string>('semua');
    const [cari, setCari] = useState('');
    const [galatUnduh, setGalatUnduh] = useState<string | null>(null);
    const [mengunduh, setMengunduh] = useState<'zscore' | 'f1' | null>(null);
    const unduhanAktif = useRef(false);
    const unduh = async (format: 'zscore' | 'f1') => {
        if (unduhanAktif.current) {
            return;
        }

        unduhanAktif.current = true;
        setMengunduh(format);
        setGalatUnduh(null);

        try {
            await laporan.unduh(format);
        } catch (e) {
            setGalatUnduh(e instanceof Error ? e.message : 'Unduhan gagal.');
        } finally {
            unduhanAktif.current = false;
            setMengunduh(null);
        }
    };

    const data = laporan.data;

    const daftarIndeks = [
        ['BB_U', 'BB/U — Berat per Umur'],
        ['TB_U', 'TB/U — Panjang/Tinggi per Umur (Stunting)'],
        ['BB_TB', 'BB/TB — Berat per Tinggi (Gizi/Wasting)'],
        ['IMT_U', 'IMT/U — Indeks Massa Tubuh per Umur'],
        ['LILA_U', 'LILA/U — Lingkar Lengan Atas per Umur'],
        ['LIKA_U', 'LIKA/U — Lingkar Kepala per Umur'],
    ];

    const daftarT = useMemo(() => {
        const riwayat = data?.riwayat2T ?? [];
        const anakRiwayat = new Set(riwayat.map((r) => r.anakId));
        const anakSatuT = (data?.bulanan ?? [])
            .filter(
                (r) =>
                    !anakRiwayat.has(r.anakId) &&
                    (r.nt === 'T' ||
                        (r.jumlahTBerturut && r.jumlahTBerturut >= 1)),
            )
            .map((r) => ({
                ...r,
                status2T:
                    r.status2T ??
                    (r.jumlahTBerturut ? `${r.jumlahTBerturut}T` : '1T'),
                jumlahTBerturut: r.jumlahTBerturut ?? 1,
                sumberRiwayat: r.sumberRiwayat ?? 'pengukuran',
            }));

        return [...riwayat, ...anakSatuT];
    }, [data?.riwayat2T, data?.bulanan]);

    const jumlahDuaT = data?.ringkasan.denganDuaT ?? 0;
    const jumlahSatuT = useMemo(() => {
        const anakRiwayat = new Set(
            (data?.riwayat2T ?? []).map((r) => r.anakId),
        );

        return (data?.bulanan ?? []).filter(
            (r) =>
                !anakRiwayat.has(r.anakId) &&
                (r.nt === 'T' || (r.jumlahTBerturut && r.jumlahTBerturut >= 1)),
        ).length;
    }, [data?.riwayat2T, data?.bulanan]);
    const totalT = jumlahDuaT + jumlahSatuT;

    const daftarRtTersedia = useMemo(() => {
        if (wilayahRt.length > 0) {
            return wilayahRt;
        }

        const setRt = new Set<string>();

        for (const item of data?.bulanan ?? []) {
            if (item.rt) {
                setRt.add(item.rt);
            }
        }

        return Array.from(setRt).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );
    }, [data?.bulanan, wilayahRt]);

    const daftarTersaring = useMemo(() => {
        let list = tab === 'zscore' ? (data?.bulanan ?? []) : daftarT;

        if (tab === '2t' && kategoriT !== 'semua') {
            if (kategoriT === '2t') {
                list = list.filter(
                    (r) =>
                        (r.jumlahTBerturut ?? 0) >= 2 ||
                        r.duaT ||
                        (r.status2T && r.status2T !== '1T'),
                );
            } else if (kategoriT === '1t') {
                list = list.filter(
                    (r) =>
                        !(
                            (r.jumlahTBerturut ?? 0) >= 2 ||
                            r.duaT ||
                            (r.status2T && r.status2T !== '1T')
                        ),
                );
            }
        }

        if (rtDipilih !== 'semua') {
            list = list.filter((item) => (item.rt ?? '') === rtDipilih);
        }

        if (cari.trim() !== '') {
            const q = cari.trim().toLocaleLowerCase('id-ID');
            list = list.filter(
                (item) =>
                    item.nama.toLocaleLowerCase('id-ID').includes(q) ||
                    (item.nik ?? '').includes(q) ||
                    (item.namaOrtu ?? '')
                        .toLocaleLowerCase('id-ID')
                        .includes(q),
            );
        }

        return list;
    }, [tab, data?.bulanan, daftarT, rtDipilih, cari, kategoriT]);

    if (laporan.status !== 'siap') {
        return (
            <Halaman
                ikon={FileText}
                judul="Laporan"
                sop="admin"
                subjudul={periode.label}
                penuh="lg"
            >
                {laporan.status === 'galat' && (
                    <Link
                        className="tombol-kedua mb-4"
                        href="/laporan?tab=tumbuh-kembang"
                    >
                        Tumbuh Kembang
                    </Link>
                )}
                <div
                    key={`${periode.id}-${laporan.status}`}
                    className="laporan-ganti"
                >
                    <StateHalaman
                        jenis={laporan.status === 'memuat' ? 'memuat' : 'galat'}
                        judul={
                            laporan.status === 'memuat'
                                ? 'Memuat laporan…'
                                : 'Laporan belum dapat dimuat'
                        }
                        pesan={
                            laporan.status === 'galat'
                                ? 'Periksa koneksi, lalu coba lagi.'
                                : undefined
                        }
                    >
                        {laporan.status === 'galat' && (
                            <button
                                type="button"
                                className="tombol-utama"
                                onClick={laporan.muatUlang}
                            >
                                Coba lagi
                            </button>
                        )}
                    </StateHalaman>
                </div>
            </Halaman>
        );
    }

    return (
        <Halaman
            ikon={FileText}
            judul={
                tab === 'zscore'
                    ? 'Laporan & Rekapitulasi Gizi Posyandu'
                    : 'Laporan Pemantauan Balita Tidak Naik (1T & 2T+)'
            }
            subjudul={
                tab === 'zscore'
                    ? 'Rekapitulasi lengkap status gizi balita berdasarkan 6 indeks antropometri standar Permenkes No. 2/2020 dan pemantauan balita tidak naik (1T & 2T+).'
                    : 'Deteksi dini balita tidak naik berat badan (1T) dan kritis tidak naik berturut-turut (2T+) untuk intervensi PMT Pemulihan serta rujukan Puskesmas.'
            }
            aksi={
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="tombol-kedua"
                        ref={tombolBantuan}
                        aria-expanded={bantuanTerbuka}
                        aria-controls="bantuan-detail"
                        onClick={() => setBantuanTerbuka((v) => !v)}
                    >
                        <CircleHelp className="size-4" aria-hidden="true" />
                        Bantuan
                    </button>
                    <button
                        type="button"
                        className="tombol-kedua text-xs font-bold"
                        onClick={laporan.muatUlang}
                    >
                        <RefreshCw className="size-3.5" aria-hidden="true" />{' '}
                        Perbarui Data
                    </button>
                    {bolehUnduh && (
                        <button
                            type="button"
                            className="tombol-kedua laporan-unduh text-xs font-bold"
                            disabled={mengunduh !== null}
                            aria-busy={mengunduh === 'zscore'}
                            onClick={() => void unduh('zscore')}
                        >
                            <Download className="size-3.5" aria-hidden="true" />{' '}
                            <span className="laporan-unduh-label">
                                <span aria-hidden={mengunduh === 'zscore'}>
                                    Excel Z-score &amp; 2T
                                </span>
                                {mengunduh === 'zscore' && (
                                    <span
                                        className="laporan-unduh-proses"
                                        role="status"
                                    >
                                        Menyiapkan…
                                    </span>
                                )}
                            </span>
                        </button>
                    )}
                    {bolehUnduh && (
                        <button
                            type="button"
                            className="tombol-utama laporan-unduh text-xs font-extrabold shadow-sm"
                            disabled={mengunduh !== null}
                            aria-busy={mengunduh === 'f1'}
                            onClick={() => void unduh('f1')}
                        >
                            <Download className="size-3.5" aria-hidden="true" />{' '}
                            <span className="laporan-unduh-label">
                                <span aria-hidden={mengunduh === 'f1'}>
                                    Unduh F1 Excel
                                </span>
                                {mengunduh === 'f1' && (
                                    <span
                                        className="laporan-unduh-proses"
                                        role="status"
                                    >
                                        Menyiapkan F1…
                                    </span>
                                )}
                            </span>
                        </button>
                    )}
                </div>
            }
        >
            {demo && <p role="status" className="mb-4">Data dan unduhan adalah simulasi demo.</p>}
            <div
                className={
                    bantuanTerbuka
                        ? 'detail-area laporan-area bantuan-terbuka'
                        : 'detail-area laporan-area'
                }
            >
                <div className="detail-utama w-full space-y-6">
                    {/* Banner Edukasi Panduan Ibu Kader (Disesuaikan per Tab) */}

                    {/* Strip 3 Kartu Ringkasan Metrik (Disesuaikan per Tab) */}
                    <RingkasanLaporan
                        tab={tab}
                        data={data}
                        periode={periode}
                        totalT={totalT}
                        jumlahDuaT={jumlahDuaT}
                        jumlahSatuT={jumlahSatuT}
                    />

                    {/* Kontainer Utama Tabel Laporan */}
                    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                        {/* Bilah Tab Utama & Selektor Kontrol */}
                        <FilterLaporan
                            tab={tab}
                            data={data}
                            totalT={totalT}
                            jumlahDuaT={jumlahDuaT}
                            jumlahSatuT={jumlahSatuT}
                            standar={standar}
                            setStandar={setStandar}
                            indeks={indeks}
                            setIndeks={setIndeks}
                            daftarIndeks={daftarIndeks}
                            kategoriT={kategoriT}
                            setKategoriT={setKategoriT}
                            cari={cari}
                            setCari={setCari}
                            rtDipilih={rtDipilih}
                            setRtDipilih={setRtDipilih}
                            daftarT={daftarT}
                            daftarRtTersedia={daftarRtTersedia}
                            daftarTersaring={daftarTersaring}
                        />

                        {tab === '2t' && (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b border-rose-200 bg-rose-50/80 px-5 py-3 text-xs text-rose-950">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle
                                        className="size-4 shrink-0 text-rose-600"
                                        aria-hidden="true"
                                    />
                                    <span className="font-extrabold text-rose-900">
                                        Perhatian Klinis:
                                    </span>
                                    <span>
                                        {data?.keterangan2T ??
                                            'Daftar balita dengan pemantauan kenaikan berat badan tidak naik (1T) dan berturut-turut (2T+) yang memerlukan konfirmasi rujukan dan pendampingan gizi kader.'}
                                    </span>
                                </div>
                                <span className="rounded-full border border-rose-300 bg-rose-200/80 px-2 py-0.5 text-[11px] font-extrabold text-rose-900">
                                    Target KBM Buku KIA 2024
                                </span>
                            </div>
                        )}

                        {/* Tabel Data Z-Score & 1T/2T */}
                        <TabelLaporan
                            tab={tab}
                            periode={periode}
                            rtDipilih={rtDipilih}
                            indeks={indeks}
                            standar={standar}
                            kategoriT={kategoriT}
                            daftarTersaring={daftarTersaring}
                            cari={cari}
                            setCari={setCari}
                            setRtDipilih={setRtDipilih}
                        />

                        {galatUnduh && (
                            <DialogGagal
                                animasiDialog
                                judul="Laporan belum dapat diunduh"
                                pesan={galatUnduh}
                                onTutup={() => setGalatUnduh(null)}
                            />
                        )}

                        <div className="border-t border-border bg-surface-subtle/50 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
                            {tab === 'zscore' ? (
                                <p className="flex items-start gap-1.5">
                                    <Info
                                        className="mt-0.5 size-4 shrink-0 text-primary"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        <strong>Keterangan Klinis:</strong>{' '}
                                        Z-score dihitung berdasarkan baku
                                        Permenkes RI No. 2/2020. Ambang normal:
                                        -2 SD sampai +1 SD (BB/U) atau +2 SD
                                        (TB/U). KBM dan status N/T mengacu pada
                                        pedoman Buku KIA Kemenkes RI.
                                    </span>
                                </p>
                            ) : (
                                <p className="flex items-start gap-1.5">
                                    <Info
                                        className="mt-0.5 size-4 shrink-0 text-amber-600"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        <strong>
                                            Pedoman Klinis Pemantauan 1T & 2T+
                                            (Buku KIA Kemenkes RI):
                                        </strong>{' '}
                                        KBM (Kenaikan Berat Minimal) merupakan
                                        acuan minimal kenaikan gram berat badan
                                        balita sesuai kelompok umur. Balita
                                        dengan status T wajib dievaluasi pola
                                        makan & asupan gizi. Balita 2T+ (dua
                                        kali berturut-turut tidak naik) wajib
                                        dirujuk ke Puskesmas/Fasilitas Kesehatan
                                        untuk pemeriksaan komprehensif.
                                    </span>
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Bilah Navigasi Langkah Antar Layar */}
                    <></>
                </div>
                <BantuanLaporan
                    tab={tab}
                    bantuanTerbuka={bantuanTerbuka}
                    periode={periode}
                    onTutup={() => {
                        setBantuanTerbuka(false);
                        tombolBantuan.current?.focus();
                    }}
                />
            </div>
        </Halaman>
    );
}
