import {
    BadgeCheck,
    ChartLine,
    CircleCheck,
    CircleHelp,
    Clock,
    ClipboardList,
    ExternalLink,
    Megaphone,
    RefreshCw,
    Undo2,
    UserCheck,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import BantuanDetail from '@/components/bantuan-detail';
import DialogGagal from '@/components/dialog-gagal';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';
import type { AksiPanggilan, AntreanKms } from '@/lib/antrean-kms';
import {
    ambilAntreanHariIni,
    konfirmasiSelesaiKms,
    ubahPanggilanKms,
} from '@/lib/antrean-kms';
import { Link } from '@/lib/nav';

type Props = {
    onSesiBerakhir: () => void;
    demo?: boolean;
};

const tanggalHariIni = () =>
    new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(new Date());

export const CONTOH_ANTREAN_KMS: AntreanKms[] = [
    {
        id: 'q-demo-1',
        anakId: 2,
        nomor: 1,
        nama: 'Bima Arya Pratama',
        namaOrtu: 'Dewi Lestari',
        rt: '02',
        status: 'kms_review',
        checkedInAt: '2026-10-11T08:30:00Z',
        prioritasKms: { skor: 1200, jumlahT: 2, alasan: ['2T'] },
    },
    {
        id: 'q-demo-2',
        anakId: 3,
        nomor: 2,
        nama: 'Citra Kirana Putri',
        namaOrtu: 'Rina Marlina',
        rt: '01',
        status: 'kms_review',
        checkedInAt: '2026-10-11T08:42:00Z',
        prioritasKms: { skor: 500, jumlahT: 0, alasan: ['Gizi buruk'] },
    },
    {
        id: 'q-demo-3',
        anakId: 1,
        nomor: 3,
        nama: 'Aisyah Putri Rahmawati',
        namaOrtu: 'Siti Aminah',
        rt: '01',
        status: 'done',
        checkedInAt: '2026-10-11T08:15:00Z',
    },
];

export default function PemeriksaanKms({
    onSesiBerakhir,
    demo = false,
}: Props) {
    const [bantuanTerbuka, setBantuanTerbuka] = useState(false);
    const [pencarian, setPencarian] = useState('');
    const tombolBantuan = useRef<HTMLButtonElement>(null);
    const [items, setItems] = useState<AntreanKms[]>(() => {
        if (!demo) {
return [];
}

        try {
            const saved = localStorage.getItem('simulasi-kms-items');

            return saved ? JSON.parse(saved) as AntreanKms[] : CONTOH_ANTREAN_KMS.map((item) => ({
                ...item, sudahDiukur: true,
            }));
        } catch {
            return CONTOH_ANTREAN_KMS.map((item) => ({ ...item, sudahDiukur: true }));
        }
    });
    const [status, setStatus] = useState<'memuat' | 'siap' | 'galat'>(
        demo ? 'siap' : 'memuat',
    );
    const [galat, setGalat] = useState<string | null>(null);
    const [mejaKms, setMejaKms] = useState<number | null>(demo ? 1 : null);
    const [sedangKonfirmasi, setSedangKonfirmasi] = useState<string | null>(
        null,
    );
    const [pesan, setPesan] = useState<string | null>(null);
    const [catatanKms, setCatatanKms] = useState<Record<string, string>>({});
    const [versi, setVersi] = useState(0);
    const permintaan = useRef(0);
    const konfirmasiAktif = useRef(false);

    useEffect(() => {
        if (demo) {
localStorage.setItem('simulasi-kms-items', JSON.stringify(items));
}
    }, [demo, items]);

    const muatUlang = useCallback(() => {
        if (demo) {
            return;
        }

        setVersi((v) => v + 1);
    }, [demo]);

    useEffect(() => {
        if (demo) {
            return;
        }

        const controller = new AbortController();
        let hidup = true;
        let memuat = false;
        const ambil = () => {
            if (memuat || konfirmasiAktif.current) {
                return;
            }

            memuat = true;
            const urutan = ++permintaan.current;
            void ambilAntreanHariIni(controller.signal, onSesiBerakhir)
                .then((data) => {
                    if (
                        !hidup ||
                        urutan !== permintaan.current ||
                        konfirmasiAktif.current
                    ) {
                        return;
                    }

                    setItems(data.items);
                    setMejaKms(data.mejaKms);
                    setStatus('siap');
                })
                .catch((error: unknown) => {
                    if (
                        !hidup ||
                        urutan !== permintaan.current ||
                        (error as Error).name === 'AbortError'
                    ) {
                        return;
                    }

                    setStatus('galat');
                })
                .finally(() => {
                    memuat = false;
                });
        };
        ambil();
        const timer = window.setInterval(ambil, 3_000);

        return () => {
            hidup = false;
            controller.abort();
            window.clearInterval(timer);
        };
    }, [versi, onSesiBerakhir, demo]);

    const terbuka = items.filter(
        (item) => item.status !== 'done' && item.status !== 'cancelled',
    );
    const aktif = terbuka.filter((item) => item.mejaKms != null);
    const menunggu = terbuka.filter((item) => item.mejaKms == null).sort((a, b) =>
        (b.prioritasKms?.skor ?? 0) - (a.prioritasKms?.skor ?? 0) ||
        (a.urutan ?? a.nomor) - (b.urutan ?? b.nomor),
    );
    const mejaSibuk = aktif.some((item) => item.mejaKms === mejaKms);
    const selesai = items.filter((item) => item.status === 'done');
    const kataCari = pencarian.trim().toLocaleLowerCase('id-ID');
    const hasilAntrean = kataCari
        ? menunggu.filter((item) => item.nama.toLocaleLowerCase('id-ID').includes(kataCari) || `a${String(item.nomor).padStart(2, '0')}`.includes(kataCari) || String(item.nomor).includes(kataCari))
        : menunggu;

    const konfirmasi = async (item: AntreanKms) => {
        if (konfirmasiAktif.current) {
            return;
        }

        konfirmasiAktif.current = true;
        ++permintaan.current;
        setSedangKonfirmasi(item.id);
        setPesan(null);
        setGalat(null);

        if (demo) {
            setItems((lama) =>
                lama.map((it) =>
                    it.id === item.id ? { ...it, status: 'done' as const, catatanKms: catatanKms[item.id]?.trim() || it.catatanKms } : it,
                ),
            );
            setPesan(`A${String(item.nomor).padStart(2, '0')} selesai diperiksa.`);
            setSedangKonfirmasi(null);
            konfirmasiAktif.current = false;

            return;
        }

        try {
            await konfirmasiSelesaiKms(item.id, onSesiBerakhir, catatanKms[item.id]);
            setItems((lama) =>
                lama.map((it) =>
                    it.id === item.id ? { ...it, status: 'done' } : it,
                ),
            );
            setPesan(`Pemeriksaan ${item.nama} telah dikonfirmasi selesai.`);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Konfirmasi belum tersimpan. Coba lagi.',
            );
        } finally {
            konfirmasiAktif.current = false;
            setSedangKonfirmasi(null);
            muatUlang();
        }
    };

    const panggilan = async (item: AntreanKms, aksi: AksiPanggilan) => {
        if (konfirmasiAktif.current || mejaKms === null) {
            return;
        }

        konfirmasiAktif.current = true;
        ++permintaan.current;
        setSedangKonfirmasi(item.id);
        setPesan(null);
        setGalat(null);

        try {
            if (demo) {
                if (aksi === 'panggil' || aksi === 'ulang') {
                    const terakhir = localStorage.getItem('simulasi-kms-panggilan');
                    const id = terakhir ? Number((JSON.parse(terakhir) as { id: string }).id) + 1 : 1;
                    localStorage.setItem('simulasi-kms-panggilan', JSON.stringify({
                        id: String(id), nomor: item.nomor, meja: mejaKms, nama: item.nama,
                    }));
                }
            } else {
                await ubahPanggilanKms(item.id, aksi, mejaKms, onSesiBerakhir);
            }

            setItems((lama) =>
                lama.map((it) =>
                    it.id !== item.id
                        ? it
                        : {
                              ...it,
                              mejaKms: aksi === 'kembalikan' ? null : mejaKms,
                              tibaKms: aksi === 'tiba',
                          },
                ),
            );
            const hasil = {
                panggil: `A${String(item.nomor).padStart(2, '0')} dipanggil ke Meja KMS ${mejaKms}.`,
                ulang: demo ? `A${String(item.nomor).padStart(2, '0')} dipanggil ulang ke Meja KMS ${mejaKms}.` : 'Panggilan ulang dikirim.',
                tiba: demo ? `A${String(item.nomor).padStart(2, '0')} sudah tiba di Meja KMS ${mejaKms}.` : 'Kehadiran di meja dicatat.',
                kembalikan: demo ? `A${String(item.nomor).padStart(2, '0')} kembali ke antrean.` : 'Peserta kembali ke antrean.',
            };
            setPesan(hasil[aksi]);
        } catch (error) {
            setGalat(
                error instanceof Error
                    ? error.message
                    : 'Panggilan belum tersimpan. Coba lagi.',
            );
        } finally {
            konfirmasiAktif.current = false;
            setSedangKonfirmasi(null);
            muatUlang();
        }
    };

    return (
        <Halaman
            judul="Pemeriksaan KMS"
            subjudul={tanggalHariIni()}
            ikon={demo ? ClipboardList : BadgeCheck}
            penuh="lg"
            aksi={
                <>
                        <Link href="/kms/ruang-tunggu" className="tombol-kedua"
                            target={demo ? '_blank' : undefined} rel={demo ? 'noopener' : undefined}>
                            Buka layar ruang tunggu
                        </Link>
                    {demo && (
                        <button type="button" className="tombol-kedua" onClick={() => {
                            const checkedInAt = new Date().toISOString();
                            setItems((lama) => {
                                const nomorAwal = Math.max(0, ...lama.map((item) => item.nomor));
                                const tambahan: AntreanKms[] = Array.from({ length: 20 }, (_, index) => ({
                                    id: `simulasi-massal-${nomorAwal + index + 1}`,
                                    anakId: 0,
                                    nomor: nomorAwal + index + 1,
                                    nama: `Peserta simulasi ${nomorAwal + index + 1}`,
                                    namaOrtu: null,
                                    rt: null,
                                    status: 'waiting',
                                    checkedInAt,
                                    sudahDiukur: index % 2 === 0,
                                }));

                                return [...lama, ...tambahan];
                            });
                            setPesan('20 peserta simulasi ditambahkan.');
                        }}>Tambah 20 peserta uji</button>
                    )}
                    {demo && (
                        <button type="button" className="tombol-kedua" onClick={() => {
                            localStorage.removeItem('simulasi-kms-items');
                            localStorage.removeItem('simulasi-kms-panggilan');
                            setItems(CONTOH_ANTREAN_KMS.map((item) => ({ ...item, sudahDiukur: true })));
                            setPesan('Data simulasi dikembalikan ke kondisi awal.');
                        }}>Reset simulasi</button>
                    )}
                    <button
                        type="button"
                        ref={tombolBantuan}
                        aria-expanded={bantuanTerbuka}
                        aria-controls="bantuan-detail"
                        className="tombol-kedua"
                        onClick={() => setBantuanTerbuka(!bantuanTerbuka)}
                    >
                        <CircleHelp className="size-4" aria-hidden="true" />
                        Bantuan
                    </button>
                    <button
                        type="button"
                        onClick={muatUlang}
                        className="tombol-kedua inline-flex items-center gap-2"
                        aria-label="Muat ulang antrean KMS"
                    >
                        <RefreshCw
                            className={`size-4 ${status === 'memuat' ? 'motion-safe:animate-spin' : ''}`}
                            aria-hidden="true"
                        />
                        <span>Muat ulang antrean</span>
                    </button>
                </>
            }
        >
            <div
                className={
                    bantuanTerbuka
                        ? 'detail-area kms-area bantuan-terbuka'
                        : 'detail-area kms-area'
                }
            >
                <div className="detail-utama kms-demo-layout">
                    {/* Ringkasan antrean hari ini */}
                    {(
                        <section aria-label="Ringkasan antrean hari ini" className="kms-demo-ringkasan kartu grid grid-cols-2 divide-x divide-border py-4 sm:grid-cols-3">
                            <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-2 px-5 pb-4 sm:col-span-1 sm:block sm:px-7 sm:pb-0">
                                <div>
                                    <h2 className="text-sm font-semibold text-muted-foreground">Meja saya</h2>
                                    <p className="mt-1 text-xl font-bold">{mejaKms === null ? 'Belum ditetapkan' : `Meja KMS ${mejaKms}`}</p>
                                </div>
                                {demo && <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                    Meja simulasi
                                    <select className="isian" value={mejaKms ?? 1}
                                        onChange={(event) => setMejaKms(Number(event.target.value))}>
                                        {[1, 2, 3, 4, 5].map((nomor) => (
                                            <option key={nomor} value={nomor}>Meja {nomor}</option>
                                        ))}
                                    </select>
                                </label>}
                            </div>
                            {[
                                { label: 'Menunggu', nilai: menunggu.length, keterangan: 'Belum dipanggil', ikon: Clock },
                                { label: 'Selesai', nilai: selesai.length, keterangan: 'Sudah dikonfirmasi', ikon: CircleCheck },
                            ].map(({ label, nilai, keterangan, ikon: Ikon }) => (
                                <div key={label} className="flex min-w-0 items-start gap-3 px-5 sm:px-7">
                                    <span aria-hidden="true" className="mt-0.5 hidden size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary sm:flex">
                                        <Ikon className="size-4.5" strokeWidth={2} />
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="text-sm leading-snug font-semibold text-muted-foreground">{label}</h2>
                                        <p className="mt-3 flex flex-col gap-2">
                                            <span className="text-4xl leading-none font-bold tracking-tight tabular-nums">{nilai}</span>
                                            <span className="text-sm text-muted-foreground">{keterangan}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Notifikasi Status Aksi */}
                    {pesan && (
                        <div
                            role="status"
                            className="kms-demo-pesan pesan-masuk flex items-center gap-3 rounded-xl border border-tone-green/20 bg-tone-green-bg px-4.5 py-3 text-sm font-semibold text-tone-green shadow-2xs"
                        >
                            <CircleCheck className="size-5 shrink-0" />
                            <span className="flex-1">{pesan}</span>
                            {demo && <button type="button" className="min-h-11 min-w-11 rounded-lg px-2 underline underline-offset-2" onClick={() => setPesan(null)}>Tutup</button>}
                        </div>
                    )}
                    {galat && status === 'siap' && (
                        <DialogGagal
                            pesan={galat}
                            onTutup={() => setGalat(null)}
                            animasiDialog
                        />
                    )}
                    {status === 'siap' && (
                        <section
                            aria-labelledby="judul-meja-kms"
                            className="kms-demo-meja flex flex-col gap-3"
                        >
                            <h2
                                id="judul-meja-kms"
                                className="text-lg font-bold"
                            >
                                Peserta di meja saya
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {mejaKms == null
                                    ? 'Hubungi admin untuk mendapat meja sebelum memanggil.'
                                    : mejaSibuk
                                      ? 'Selesaikan atau kembalikan peserta aktif sebelum memanggil lagi.'
                                      : demo
                                        ? 'Pilih peserta dari antrean untuk dipanggil.'
                                        : 'Pilih peserta yang ingin dipanggil ke meja ini.'}
                            </p>
                            {!mejaSibuk && (
                                <div className="kms-demo-meja-kosong rounded-xl border border-border bg-card px-5 py-5">
                                    <h3 className="font-bold">Belum ada peserta di meja ini</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">Peserta yang dipanggil akan tampil di sini.</p>
                                </div>
                            )}
                            {aktif.filter((item) => item.mejaKms === mejaKms).map((item) => (
                                <article
                                    key={demo ? `${item.id}-${item.tibaKms}` : item.id}
                                    className={demo
                                        ? 'kms-demo-perubahan grid min-w-0 gap-3 rounded-xl border-2 border-primary bg-card p-4 sm:p-5'
                                        : 'grid min-w-0 gap-3 rounded-xl border border-border bg-card p-4'}
                                >
                                    <div>
                                        <h3 className="font-bold break-words">
                                            A
                                            {String(item.nomor).padStart(
                                                2,
                                                '0',
                                            )}{' '}
                                            · {item.nama}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Meja KMS {item.mejaKms} ·{' '}
                                            {item.tibaKms
                                                ? 'Sudah tiba'
                                                : 'Sudah dipanggil'}
                                            {!item.sudahDiukur &&
                                                ' · Belum diukur'}
                                            {demo && item.sudahDiukur && ' · Sudah diukur'}
                                        </p>
                                        {item.kmsPetugasNama && <p className="text-sm text-muted-foreground">Petugas: {item.kmsPetugasNama}</p>}
                                        {item.catatan && <p className="text-sm">Catatan pendaftaran: {item.catatan}</p>}
                                        {item.catatanKhusus && <p className="text-sm">Catatan pengukuran: {item.catatanKhusus}</p>}
                                        {item.masihMenyusui != null && <p className="text-sm">Masih menyusui: {item.masihMenyusui ? 'Ya' : 'Tidak'}</p>}
                                        {item.asiEksklusif != null && <p className="text-sm">ASI eksklusif: {item.asiEksklusif ? 'Ya' : 'Tidak'}</p>}
                                    </div>
                                    {item.mejaKms === mejaKms && item.tibaKms && <label className="grid gap-1 text-sm font-semibold">
                                        Catatan KMS
                                        <textarea className="isian min-h-20 w-full" maxLength={500} value={catatanKms[item.id] ?? ''} onChange={(event) => setCatatanKms((lama) => ({ ...lama, [item.id]: event.target.value }))} />
                                    </label>}
                                    {item.mejaKms === mejaKms && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {item.anakId > 0 && <Link
                                                href={`/balita/${item.anakId}?asal=kms`}
                                                className="tombol-kedua min-h-11"
                                            >
                                                <ChartLine className="size-[16px] shrink-0" aria-hidden="true" />
                                                Lihat analisis dan kurva
                                            </Link>}
                                            {!item.tibaKms && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="tombol-kedua min-h-11"
                                                        disabled={
                                                            sedangKonfirmasi !==
                                                            null
                                                        }
                                                        onClick={() =>
                                                            void panggilan(
                                                                item,
                                                                'ulang',
                                                            )
                                                        }
                                                    >
                                                        <Megaphone className="size-[16px] shrink-0" aria-hidden="true" />
                                                        Panggil ulang
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="tombol-utama min-h-11"
                                                        disabled={
                                                            sedangKonfirmasi !==
                                                            null
                                                        }
                                                        onClick={() =>
                                                            void panggilan(
                                                                item,
                                                                'tiba',
                                                            )
                                                        }
                                                    >
                                                        <UserCheck className="size-[16px] shrink-0" aria-hidden="true" />
                                                        Tandai tiba
                                                    </button>
                                                </>
                                            )}
                                            {item.tibaKms && (
                                                <button
                                                    type="button"
                                                    className="tombol-utama min-h-11 disabled:cursor-not-allowed disabled:opacity-50"
                                                    disabled={
                                                        !item.sudahDiukur ||
                                                        sedangKonfirmasi !==
                                                            null
                                                    }
                                                    onClick={() =>
                                                        void konfirmasi(item)
                                                    }
                                                >
                                                    Konfirmasi selesai
                                                </button>
                                            )}
                                            {item.tibaKms && !item.sudahDiukur && (
                                                <p className="text-sm text-muted-foreground">
                                                    Konfirmasi tersedia setelah data pengukuran lengkap.
                                                </p>
                                            )}
                                            {demo && !item.sudahDiukur && (
                                                <button
                                                    type="button"
                                                    className="tombol-kedua min-h-11"
                                                    onClick={() => {
                                                        setItems((lama) => lama.map((peserta) =>
                                                            peserta.id === item.id
                                                                ? { ...peserta, sudahDiukur: true }
                                                                : peserta,
                                                        ));
                                                        setPesan('Pengukuran simulasi dicatat.');
                                                    }}
                                                >
                                                    Simulasikan pengukuran
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="tombol-kedua min-h-11"
                                                disabled={
                                                    sedangKonfirmasi !== null
                                                }
                                                onClick={() =>
                                                    void panggilan(
                                                        item,
                                                        'kembalikan',
                                                    )
                                                }
                                            >
                                                <Undo2 className="size-[16px] shrink-0" aria-hidden="true" />
                                                Kembalikan ke antrean
                                            </button>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </section>
                    )}

                    {/* Antrean Anak Menunggu Penjelasan */}
                    <section
                        aria-labelledby="judul-antrean-menunggu"
                        className="kms-demo-antrean flex min-w-0 flex-col gap-3"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h2
                                    id="judul-antrean-menunggu"
                                    className="text-base font-black text-foreground sm:text-lg"
                                >
                                    Antrean pemeriksaan
                                </h2>
                            </div>
                        </div>

                        {(
                            <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="cari-antrean-kms">
                                Cari peserta
                                <input id="cari-antrean-kms" className="isian w-full" type="search"
                                    placeholder="Nama atau nomor antrean" value={pencarian}
                                    onChange={(event) => setPencarian(event.target.value)} />
                            </label>
                        )}
                        {mejaSibuk && <p className="text-sm text-muted-foreground">Selesaikan atau kembalikan peserta di meja Anda untuk memanggil peserta lain.</p>}
                        {status === 'siap' && menunggu.length > 0 && <div className="flex flex-wrap items-center gap-3">
                            <button type="button" className="tombol-kedua min-h-11" disabled={mejaKms === null || mejaSibuk || sedangKonfirmasi !== null} onClick={() => void panggilan(menunggu[0], 'panggil')}>Panggil peserta berikutnya</button>
                            <p className="text-sm text-muted-foreground">Urutan mengikuti prioritas 1T/2T dan status gizi.</p>
                        </div>}
                        {status === 'siap' && menunggu.length > 0 && hasilAntrean.length === 0 && (
                            <p role="status" className="rounded-xl border border-border bg-card p-4 text-sm">Tidak ada peserta yang cocok dengan pencarian.</p>
                        )}

                        {status === 'memuat' && (
                            <StateHalaman
                                jenis="memuat"
                                judul="Memuat antrean pemeriksaan…"
                            />
                        )}

                        {status === 'galat' && (
                            <StateHalaman
                                jenis="galat"
                                judul="Antrean belum dapat dimuat"
                                pesan="Periksa koneksi, lalu coba lagi."
                            >
                                <button
                                    type="button"
                                    className="tombol-kedua min-h-11"
                                    onClick={muatUlang}
                                >
                                    Coba muat ulang
                                </button>
                            </StateHalaman>
                        )}

                        {status === 'siap' && menunggu.length === 0 && (
                            <div className={demo ? 'rounded-xl border border-border bg-card px-5 py-6' : 'state-halaman'} role="status">
                                <h3 className="text-lg font-bold">
                                    {demo ? 'Belum ada peserta yang menunggu' : 'Belum ada balita dalam antrean'}
                                </h3>
                                <p className="mt-2 max-w-prose text-sm text-muted-foreground">
                                    {demo
                                        ? 'Peserta akan muncul setelah petugas melakukan check-in.'
                                        : 'Peserta akan muncul setelah pendaftaran.'}
                                </p>
                            </div>
                        )}

                        {status === 'siap' && hasilAntrean.length > 0 && (
                            <div className="kms-demo-daftar grid gap-3.5"
                                tabIndex={0} role="region"
                                aria-label="Daftar antrean pemeriksaan, dapat digulir">
                                {hasilAntrean.map((item) => (
                                    <article
                                        key={item.id}
                                        className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4.5 shadow-xs sm:p-5"
                                    >
                                        <div className="flex min-w-0 items-start gap-4">
                                            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-base font-black text-white shadow-xs">
                                                A
                                                {String(item.nomor).padStart(
                                                    2,
                                                    '0',
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-base font-black break-words text-foreground">
                                                        {item.nama}
                                                    </h3>
                                                    {!!item.prioritasKms?.alasan.length && <span className="rounded-full bg-tone-amber-bg px-2 py-1 text-xs font-bold text-tone-amber">{item.prioritasKms.alasan.join(', ')}</span>}
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-tone-amber/20 bg-tone-amber-bg px-2.5 py-0.5 text-xs font-bold text-tone-amber">
                                                        <Clock className="size-3" />
                                                        {item.sudahDiukur
                                                            ? 'Sudah diukur'
                                                            : 'Belum diukur'}
                                                    </span>
                                                </div>
                                                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                                                    <span className="font-semibold text-foreground">
                                                        {item.rt
                                                            ? `RT ${item.rt}`
                                                            : 'RT belum tercatat'}
                                                    </span>
                                                    <span>·</span>
                                                    <span>
                                                        Orang tua:{' '}
                                                        {item.namaOrtu ??
                                                            'Belum tercatat'}
                                                    </span>
                                                    <span>·</span>
                                                    <span className="text-[11px] text-muted-foreground/80">
                                                        Check-in:{' '}
                                                        {new Date(
                                                            item.checkedInAt,
                                                        ).toLocaleTimeString(
                                                            'id-ID',
                                                            {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            },
                                                        )}{' '}
                                                        WIB
                                                    </span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                                            {item.anakId > 0 && <Link
                                                href={`/balita/${item.anakId}?asal=kms`}
                                                className="tombol-kedua inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold sm:text-sm"
                                            >
                                                <ExternalLink
                                                    className="size-4 text-primary"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Lihat analisis & kurva
                                                </span>
                                            </Link>}
                                                <button
                                                    type="button"
                                                    className="tombol-utama min-h-11 disabled:cursor-not-allowed disabled:opacity-50 max-lg:min-h-[44px] pointer-coarse:min-h-[44px]"
                                                    disabled={
                                                        mejaKms == null ||
                                                        mejaSibuk ||
                                                        sedangKonfirmasi !==
                                                            null
                                                    }
                                                    onClick={() =>
                                                        void panggilan(
                                                            item,
                                                            'panggil',
                                                        )
                                                    }
                                                >
                                                    {sedangKonfirmasi ===
                                                    item.id
                                                        ? 'Menyimpan…'
                                                        : 'Panggil'}
                                                </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    {(
                        <section aria-labelledby="judul-meja-lain" className="kms-demo-lain flex min-w-0 flex-col gap-2">
                            <div className="kms-demo-panel-judul">
                                <h2 id="judul-meja-lain" className="text-lg font-bold">
                                    Sedang ditangani meja lain
                                </h2>
                            </div>
                            <ul className="kms-demo-pratinjau divide-y divide-border rounded-xl border border-border bg-card" tabIndex={0} aria-label="Daftar peserta di meja lain">
                                {!aktif.some((item) => item.mejaKms !== mejaKms) && <li className="p-4 text-sm text-muted-foreground">Tidak ada peserta di meja lain.</li>}
                                {aktif.filter((item) => item.mejaKms !== mejaKms).map((item) => (
                                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                                        <span className="font-semibold">
                                            A{String(item.nomor).padStart(2, '0')} · {item.nama}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                            Meja {item.mejaKms} · {item.tibaKms ? 'Sudah tiba' : 'Sudah dipanggil'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {status === 'siap' && (
                        <section aria-labelledby="judul-selesai-demo" className="kms-demo-selesai flex min-w-0 flex-col gap-2">
                            <div className="kms-demo-panel-judul flex flex-wrap items-center justify-between gap-2">
                                <h2 id="judul-selesai-demo" className="text-lg font-bold">Pemeriksaan selesai ({selesai.length})</h2>
                                <Link href="/kms/selesai" className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-2">Lihat semua</Link>
                            </div>
                            <ul className="kms-demo-pratinjau divide-y divide-border rounded-xl border border-border bg-card" tabIndex={0} aria-label="Pratinjau peserta selesai">
                                {selesai.length === 0 && <li className="p-4 text-sm text-muted-foreground">Belum ada pemeriksaan selesai.</li>}
                                {selesai.slice(0, 3).map((item) => (
                                    <li key={item.id} className="px-4 py-3 text-sm">
                                        <span className="font-bold">A{String(item.nomor).padStart(2, '0')} · {item.nama}</span>
                                    </li>
                                ))}
                            </ul>
                            {selesai.length > 3 && <p className="text-sm text-muted-foreground">Menampilkan 3 dari {selesai.length} peserta.</p>}
                        </section>
                    )}
                </div>
                <BantuanDetail
                    bagian="kms"
                    sop="kms"
                    terbuka={bantuanTerbuka}
                    onTutup={() => {
                        setBantuanTerbuka(false);
                        tombolBantuan.current?.focus();
                    }}
                >
                    <section aria-labelledby="judul-panduan-kms">
                        <h3 id="judul-panduan-kms" className="text-base font-bold">
                            Panduan petugas KMS
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            Meja 4 bertugas menjelaskan arah garis pertumbuhan anak pada
                            grafik KMS buku KIA, memberikan konseling pemenuhan gizi
                            seimbang serta PMT lokal, dan mencatat rujukan jika balita
                            terindikasi tidak naik bobot badannya (1T / 2T+).
                        </p>
                        <ol className="mt-4 divide-y divide-border border-y border-border">
                            <li className="py-3">
                                <h4 className="text-sm font-bold">1. Baca grafik dan status gizi</h4>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    Buka profil balita untuk meninjau arah garis kurva KMS
                                    (N: Naik / T: Tidak Naik) serta indeks Z-score BB/U,
                                    TB/U, dan BB/TB terkini.
                                </p>
                            </li>
                            <li className="py-3">
                                <h4 className="text-sm font-bold">2. Konseling dan edukasi orang tua</h4>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    Jelaskan tren berat badan secara ramah, anjurkan variasi
                                    protein hewani / ASI eksklusif, serta diskusikan langkah
                                    pemulihan jika 1T atau 2T+.
                                </p>
                            </li>
                            <li className="py-3">
                                <h4 className="text-sm font-bold">3. Konfirmasi selesai antrean</h4>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                    Setelah penjelasan dan buku KIA terisi tuntas, tekan tombol{' '}
                                    <strong>Konfirmasi Selesai</strong> agar slot antrean
                                    berpindah ke anak berikutnya.
                                </p>
                            </li>
                        </ol>
                    </section>
                </BantuanDetail>
            </div>
        </Halaman>
    );
}
