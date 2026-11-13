import { Settings2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Dialog from '@/components/dialog';
import { ambilPanggilan } from '@/lib/antrean-kms';
import type { PanggilanKms } from '@/lib/antrean-kms';
import { Link } from '@/lib/nav';
import {
    bagianPanggilan,
    idSuara,
    pilihSuara,
    teksPanggilan,
} from '@/lib/suara-kms';

type Pemutar = (nomor: number, meja: number, tes: boolean, nama?: string | null) => Promise<void>;
const KUNCI_SUARA = 'simpatik-suara-kms';

export default function RuangTungguKms({
    onSesiBerakhir,
    demo = false,
}: {
    onSesiBerakhir: () => void;
    demo?: boolean;
}) {
    const [terakhir, setTerakhir] = useState<PanggilanKms | null>(null);
    const [status, setStatus] = useState<'memuat' | 'siap' | 'galat'>(demo ? 'siap' : 'memuat');
    const [aktif, setAktif] = useState(false);
    const [diinginkan, setDiinginkan] = useState(true);
    const [memulai, setMemulai] = useState(false);
    const [pengaturanTerbuka, setPengaturanTerbuka] = useState(false);
    const [galatSuara, setGalatSuara] = useState('');
    const [pakaiRekaman, setPakaiRekaman] = useState(false);
    const [rekaman, setRekaman] = useState<File[]>([]);
    const [daftarSuara, setDaftarSuara] = useState<SpeechSynthesisVoice[]>([]);
    const [suaraTersimpan, setSuaraTersimpan] = useState<string | null>(() => {
        try {
            return localStorage.getItem(KUNCI_SUARA);
        } catch {
            return null;
        }
    });
    const { tersedia, pilihan, tidakTersedia } = pilihSuara(daftarSuara, suaraTersimpan);
    const pemutar = useRef<Pemutar | null>(null);
    const putaran = useRef(Promise.resolve());
    const media = useRef<HTMLAudioElement | null>(null);
    const hentikan = useRef<(() => void) | null>(null);
    const tampil = useRef(true);
    const sudahMencobaOtomatis = useRef(false);
    const aktifkanRef = useRef<() => void>(() => undefined);

    useEffect(() => {
        const sintesis = window.speechSynthesis;

        if (!sintesis) {
return;
}

        const muatSuara = () => setDaftarSuara(sintesis.getVoices());
        muatSuara();
        sintesis.addEventListener('voiceschanged', muatSuara);

        return () => sintesis.removeEventListener('voiceschanged', muatSuara);
    }, []);

    const ucapkan = useCallback((nomor: number, meja: number, tes = false, nama?: string | null) => {
        const pemutarSaatIni = pemutar.current;

        if (!pemutarSaatIni) {
            return;
        }

        const putar = () =>
            tampil.current && pemutar.current === pemutarSaatIni
                ? pemutarSaatIni(nomor, meja, tes, nama)
                : undefined;
        putaran.current = putaran.current
            .then(putar)
            .catch((error: unknown) => {
                if (!tampil.current || pemutar.current !== pemutarSaatIni) {
                    return;
                }

                pemutar.current = null;
                setAktif(false);
                setMemulai(false);
                setGalatSuara(
                    error instanceof Error
                        ? error.message
                        : 'Suara gagal. Aktifkan kembali lalu panggil ulang.',
                );
            });
    }, []);

    useEffect(() => {
        tampil.current = true;

        if (demo) {
            let sebelumnya = localStorage.getItem('simulasi-kms-panggilan');
            const periksa = () => {
                const terbaru = localStorage.getItem('simulasi-kms-panggilan');

                if (!terbaru || terbaru === sebelumnya) {
return;
}

                sebelumnya = terbaru;

                try {
                    const panggilan = JSON.parse(terbaru) as PanggilanKms;
                    setTerakhir(panggilan);
                    ucapkan(panggilan.nomor, panggilan.meja, false, panggilan.nama);
                } catch {
                    setStatus('galat');
                }
            };
            const timer = window.setInterval(periksa, 300);

            return () => {
                tampil.current = false;
                window.clearInterval(timer);
                pemutar.current = null;
                hentikan.current?.();
            };
        }

        const controller = new AbortController();
        let timer = 0;
        let setelah: string | null = null;
        let lingkup: string | null | undefined;

        const muat = async () => {
            try {
                const data = await ambilPanggilan(
                    lingkup ?? null,
                    setelah,
                    controller.signal,
                    onSesiBerakhir,
                );

                if (controller.signal.aborted) {
                    return;
                }

                setStatus('siap');

                if (lingkup !== data.lingkup) {
                    lingkup = data.lingkup;
                    const terbaru = data.panggilan[0] ?? null;
                    setelah = terbaru?.id ?? (data.lingkup ? '0' : null);
                    setTerakhir(terbaru);
                } else {
                    for (const panggilan of data.panggilan) {
                        setelah = panggilan.id;
                        setTerakhir(panggilan);
                        ucapkan(panggilan.nomor, panggilan.meja, false, panggilan.nama);
                    }
                }
            } catch {
                if (!controller.signal.aborted) {
                    setStatus('galat');
                }
            } finally {
                if (!controller.signal.aborted) {
                    timer = window.setTimeout(() => void muat(), 1200);
                }
            }
        };
        void muat();

        return () => {
            tampil.current = false;
            controller.abort();
            window.clearTimeout(timer);
            pemutar.current = null;
            hentikan.current?.();
        };
    }, [demo, onSesiBerakhir, ucapkan]);

    function matikan() {
        pemutar.current = null;
        hentikan.current?.();
        setDiinginkan(false);
        setAktif(false);
        setMemulai(false);
        setGalatSuara('');
    }

    function aktifkan() {
        setDiinginkan(true);
        setGalatSuara('');

        if (pakaiRekaman) {
            if (rekaman.length === 0) {
                setGalatSuara('Pilih berkas rekaman di Pengaturan suara sebelum mengaktifkan suara.');
                setPengaturanTerbuka(true);

                return;
            }

            const audio = media.current ?? new Audio();
            media.current = audio;
            const berkas = new Map(
                rekaman.map((file) => [
                    file.name.replace(/\.[^.]+$/, '').toLowerCase(),
                    file,
                ]),
            );
            const putar: Pemutar = async (nomor, meja, tes) => {
                for (const nama of tes
                    ? ['tes-suara']
                    : bagianPanggilan(nomor, meja)) {
                    if (!tampil.current || pemutar.current !== putar) {
                        return;
                    }

                    const file = berkas.get(nama);

                    if (!file) {
                        throw new Error(`Rekaman “${nama}” belum dipilih.`);
                    }

                    const url = URL.createObjectURL(file);

                    try {
                        await new Promise<void>((resolve, reject) => {
                            audio.src = url;
                            audio.onended = () => resolve();
                            audio.onplaying = () => {
                                if (pemutar.current === putar) {
                                    setMemulai(false);
                                    setAktif(true);
                                }
                            };
                            audio.onerror = () =>
                                reject(
                                    new Error(
                                        'Rekaman gagal diputar. Periksa berkas lalu tes lagi.',
                                    ),
                                );
                            hentikan.current = () => {
                                audio.pause();
                                resolve();
                            };
                            void audio.play().catch(reject);
                        });
                    } finally {
                        hentikan.current = null;
                        URL.revokeObjectURL(url);
                    }
                }
            };
            pemutar.current = putar;
        } else {
            const sintesis = window.speechSynthesis;
            const suara = pilihan;

            if (!sintesis || !suara) {
                setGalatSuara(
                    'Suara bahasa Indonesia belum tersedia. Pasang suara Indonesia di perangkat atau pilih rekaman lokal.',
                );

                return;
            }

            pemutar.current = (nomor, meja, tes, nama) =>
                new Promise<void>((resolve, reject) => {
                    const ucapan = new SpeechSynthesisUtterance(
                        tes
                            ? 'Tes suara panggilan KMS.'
                            : teksPanggilan(nomor, meja, nama),
                    );
                    ucapan.voice = suara;
                    ucapan.lang = suara.lang;
                    ucapan.onstart = () => {
                        if (pemutar.current) {
                            setMemulai(false);
                            setAktif(true);
                        }
                    };
                    const timer = window.setTimeout(() => {
                        selesai();
                        sintesis.cancel();
                        reject(
                            new Error(
                                        'Suara tidak merespons. Periksa koneksi jika menggunakan suara daring, lalu aktifkan kembali dan panggil ulang.',
                            ),
                        );
                    }, 15_000);
                    function selesai() {
                        window.clearTimeout(timer);
                        hentikan.current = null;
                    }
                    ucapan.onend = () => {
                        selesai();
                        resolve();
                    };
                    ucapan.onerror = () => {
                        selesai();
                        reject(
                            new Error(
                                        'Suara gagal diputar. Periksa koneksi jika menggunakan suara daring, lalu aktifkan kembali dan panggil ulang.',
                            ),
                        );
                    };
                    hentikan.current = () => {
                        selesai();
                        sintesis.cancel();
                        resolve();
                    };
                    sintesis.speak(ucapan);
                });
        }

        setMemulai(true);
        ucapkan(0, 0, true);
    }

    useEffect(() => {
        aktifkanRef.current = aktifkan;
    });

    useEffect(() => {
        if (!sudahMencobaOtomatis.current && pilihan && diinginkan) {
            sudahMencobaOtomatis.current = true;
            aktifkanRef.current();
        }
    }, [pilihan, diinginkan]);

    return (
        <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 p-4 text-foreground sm:p-8">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-extrabold">Antrean KMS</h1>
                {demo && <p>Mode simulasi developer</p>}
                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
                        <input type="checkbox" role="switch" className="peer sr-only" checked={diinginkan}
                            onChange={(event) => event.target.checked ? aktifkan() : matikan()} />
                        <span aria-hidden="true" className="relative h-7 w-12 rounded-full bg-border-strong transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                        Suara panggilan
                    </label>
                    <button type="button" className="tombol-kedua min-h-11 gap-2" onClick={() => setPengaturanTerbuka(true)}>
                        <Settings2 aria-hidden="true" className="size-5" /> Pengaturan suara
                    </button>
                    <Link href="/kms" className="tombol-kedua min-h-11">Kembali ke dashboard</Link>
                </div>
            </header>
            <div className="flex flex-wrap items-center gap-3 text-sm" role="status">
                <span>{!diinginkan ? 'Suara dimatikan' : aktif ? 'Suara aktif' : memulai ? 'Mengaktifkan suara…' : 'Ketuk untuk mengaktifkan suara'}</span>
                {diinginkan && !aktif && !memulai && <button type="button" className="tombol-kedua min-h-11" onClick={aktifkan}>Aktifkan suara</button>}
                {galatSuara && <span className="text-tone-red">{galatSuara}</span>}
            </div>
            <section
                aria-label="Panggilan terbaru"
                aria-live="polite"
                className="grid min-h-64 place-content-center gap-2 rounded-2xl border border-border bg-card p-6 text-center"
            >
                {terakhir ? (
                    <>
                        <p className="text-sm font-semibold text-muted-foreground">
                            Panggilan terakhir
                        </p>
                        <p className="text-5xl font-black break-all text-primary tabular-nums sm:text-8xl">
                            A{String(terakhir.nomor).padStart(2, '0')}
                        </p>
                        <p className="text-2xl font-bold sm:text-4xl">
                            Meja KMS {terakhir.meja}
                        </p>
                    </>
                ) : (
                    <div>
                        <p className="text-lg font-bold">
                            {status === 'memuat'
                                ? 'Memuat panggilan…'
                                : status === 'galat'
                                  ? 'Panggilan belum dapat dimuat.'
                                  : demo ? 'Menunggu panggilan baru' : 'Belum ada panggilan hari ini'}
                        </p>
                        {demo && status === 'siap' && <p className="mt-2 text-sm text-muted-foreground">
                            Biarkan layar ini terbuka, lalu panggil peserta dari tab Pemeriksaan KMS pada browser yang sama.
                        </p>}
                    </div>
                )}
            </section>
            {status === 'galat' && (
                <p role="status">
                    Sambungan terputus. Layar akan mencoba tersambung kembali.
                </p>
            )}
            {pengaturanTerbuka && <Dialog judul="Pengaturan suara" keterangan="Atur suara untuk perangkat ruang tunggu ini." lebar="w-[640px]" ikon={Settings2} onTutup={() => setPengaturanTerbuka(false)}>
            <section aria-label="Pengaturan suara" className="grid gap-3 p-6">
                {!pakaiRekaman && (
                    <div className="grid gap-2">
                        <label htmlFor="pilihan-suara-kms" className="text-sm font-semibold">
                            Suara panggilan
                        </label>
                        <select
                            id="pilihan-suara-kms"
                            className="isian min-h-11 w-full max-w-xl"
                            disabled={aktif || memulai || tersedia.length === 0}
                            value={pilihan ? idSuara(pilihan) : ''}
                            onChange={(event) => {
                                const id = event.target.value;
                                setSuaraTersimpan(id);
                                setGalatSuara('');

                                try {
                                    localStorage.setItem(KUNCI_SUARA, id);
                                } catch {
                                    setGalatSuara('Pilihan suara tidak dapat disimpan di browser. Pilihan tetap berlaku selama halaman ini terbuka.');
                                }
                            }}
                        >
                            {!pilihan && <option value="">Pilih suara bahasa Indonesia</option>}
                            {tersedia.map((suara) => (
                                <option key={idSuara(suara)} value={idSuara(suara)}>
                                    {suara.name} ({suara.localService ? 'Lokal' : 'Daring'})
                                </option>
                            ))}
                        </select>
                        {(aktif || memulai) && <p className="text-sm text-muted-foreground">Matikan suara untuk mengganti pilihan.</p>}
                        {tidakTersedia && (
                            <p role="status" className="text-sm text-muted-foreground">
                                Suara yang disimpan tidak tersedia. {pilihan ? 'Suara lokal dipilih sementara.' : 'Pilih suara lain atau gunakan rekaman lokal.'}
                            </p>
                        )}
                        {tersedia.length === 0 && (
                            <p role="status" className="text-sm text-muted-foreground">
                                Suara bahasa Indonesia belum tersedia. Pasang suara Indonesia di perangkat atau gunakan rekaman lokal.
                            </p>
                        )}
                    </div>
                )}
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={pakaiRekaman}
                        disabled={aktif || memulai}
                        onChange={(e) => setPakaiRekaman(e.target.checked)}
                    />
                    Gunakan rekaman lokal
                </label>
                {pakaiRekaman && (
                    <div className="grid gap-2 text-sm">
                        <label htmlFor="rekaman-kms">
                            Berkas rekaman panggilan
                        </label>
                        <input
                            id="rekaman-kms"
                            type="file"
                            multiple
                            accept="audio/*"
                            disabled={aktif || memulai}
                            onChange={(e) =>
                                setRekaman(Array.from(e.target.files ?? []))
                            }
                        />
                        <p className="text-muted-foreground">
                            Pilih berkas audio bernama tes-suara, nomor-antrean,
                            silakan-menuju-meja-kms, dan kata bilangan seperti
                            satu, dua, belas, dan puluh.
                        </p>
                        <p className="text-muted-foreground">Rekaman lokal hanya membacakan nomor dan meja. Nama balita dibacakan oleh suara browser.</p>
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="tombol-utama min-h-11"
                        onClick={
                            aktif || memulai ? matikan : aktifkan
                        }
                        disabled={
                            !aktif && !memulai && pakaiRekaman && rekaman.length === 0
                        }
                    >
                        {aktif || memulai ? 'Matikan suara' : 'Aktifkan suara'}
                    </button>
                    <button
                        type="button"
                        className="tombol-kedua min-h-11"
                        disabled={!aktif}
                        onClick={() => ucapkan(0, 0, true)}
                    >
                        Tes suara
                    </button>
                </div>
                {galatSuara && (
                    <p role="alert" className="text-sm text-tone-red">
                        {galatSuara}
                    </p>
                )}
            </section>
            </Dialog>}
        </main>
    );
}
