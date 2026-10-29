/**
 * Layar Masuk — docs/riwayat/layar-demo.md bagian 6.1.
 *
 * Dipakai bersama aplikasi sungguhan dan demo. Yang membedakan keduanya hanya
 * `onMasuk`: aplikasi memanggil `POST /api/masuk` dan peran datang dari akun,
 * demo menerima apa saja dan perannya dipilih lewat `pemilihPeran`.
 *
 * Layar ini tidak tahu mana yang sedang berjalan, dan memang tidak perlu tahu.
 */

import {
    Eye,
    EyeOff,
    Info,
    Loader2,
    ShieldCheck,
    TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import ilustrasiPosyandu from '@/assets/login-posyandu-illustration-v1.png';
import { Head } from '@/lib/nav';

type Props = {
    /** Mengembalikan pesan galat, atau null bila berhasil. */
    onMasuk: (username: string, kataSandi: string) => Promise<string | null>;
    /** Kartu pemilih peran — hanya demo yang mengisinya. */
    pemilihPeran?: ReactNode;
    /** Keterangan di bawah tombol, mis. penanda mode demo. */
    catatan?: ReactNode;
    awal?: { username: string; sandi: string };
    /** Sesi habis di tengah pemakaian; layar Masuk menjelaskannya. */
    sesiBerakhir?: boolean;
};

const PESAN_KOSONG = 'Nama pengguna dan kata sandi wajib diisi.';

export default function Login({
    onMasuk,
    pemilihPeran,
    catatan,
    awal,
    sesiBerakhir = false,
}: Props) {
    const [username, setUsername] = useState(awal?.username ?? '');
    const [sandi, setSandi] = useState(awal?.sandi ?? '');
    const [sandiTerbaca, setSandiTerbaca] = useState(false);
    const [memuat, setMemuat] = useState(false);
    const [galat, setGalat] = useState<string | null>(null);

    const kosong = username.trim() === '' || sandi === '';
    // Galat "belum diisi" hanya menandai kotak yang memang kosong; galat lain
    // (mis. sandi salah) menandai keduanya.
    const galatKosong = galat === PESAN_KOSONG;
    const merahNama =
        galat !== null && (!galatKosong || username.trim() === '');
    const merahSandi = galat !== null && (!galatKosong || sandi === '');

    const kirim = (peristiwa: FormEvent) => {
        peristiwa.preventDefault();

        if (memuat) {
            return;
        }

        if (kosong) {
            setGalat(PESAN_KOSONG);

            return;
        }

        setMemuat(true);
        setGalat(null);

        onMasuk(username, sandi)
            .then((pesan) => {
                // Saat berhasil, komponen ini dilepas oleh pemanggilnya —
                // jadi hanya kegagalan yang perlu mengembalikan keadaan.
                if (pesan !== null) {
                    setGalat(pesan);
                    setMemuat(false);
                }
            })
            .catch(() => {
                setGalat(
                    'Tidak dapat terhubung ke server. Periksa koneksi internet.',
                );
                setMemuat(false);
            });
    };

    return (
        <div className="relative isolate flex min-h-screen overflow-hidden bg-background">
            {/* Judul tab ikut kembali saat Keluar ditekan; tanpa ini ia
                tertinggal pada layar yang barusan ditutup. */}
            <Head title="Masuk" />
            <main className="flex w-full">
                <div className="flex w-full flex-col items-center justify-center px-6 py-8 sm:px-12 lg:w-[54%] xl:px-20">
                    <div className="kartu w-full max-w-[480px] p-7 sm:p-10">
                        <Merek />

                        <h1 className="mt-7 text-4xl font-extrabold tracking-[-0.03em] text-foreground">
                            Selamat datang
                        </h1>

                        <p className="mt-2 max-w-[44ch] text-base leading-relaxed text-muted-foreground">
                            Masuk untuk mencatat dan memantau tumbuh kembang
                            balita.
                        </p>

                        <form onSubmit={kirim} className="mt-7">
                            {sesiBerakhir && galat === null && (
                                <div
                                    role="status"
                                    className="mb-6 flex items-start gap-2.5 rounded-lg border border-tone-blue bg-tone-blue-bg p-4 text-base font-semibold text-tone-blue"
                                >
                                    <Info
                                        className="mt-0.5 size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Sesi telah berakhir. Silakan masuk kembali.
                                </div>
                            )}
                            {galat !== null && (
                                <div
                                    role="alert"
                                    className="mb-6 flex items-start gap-2.5 rounded-lg border border-tone-red bg-tone-red-bg p-4 text-base font-semibold text-tone-red"
                                >
                                    <TriangleAlert
                                        className="mt-0.5 size-5 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    {galat}
                                </div>
                            )}

                            <div className="space-y-5">
                                <div>
                                    <label
                                        htmlFor="username"
                                        className="block text-base font-bold text-foreground"
                                    >
                                        Nama pengguna
                                    </label>
                                    {/* Tanpa huruf besar otomatis dan koreksi ejaan:
                                        papan ketik tablet mengubah "kader01"
                                        menjadi "Kader01" atau kata lain. */}
                                    <input
                                        id="username"
                                        type="text"
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        value={username}
                                        placeholder="Contoh: kader_tulip"
                                        disabled={memuat}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        className={`isian mt-2 w-full bg-card text-base placeholder:text-base placeholder:text-muted-foreground/75 disabled:opacity-60 ${
                                            merahNama ? 'border-tone-red' : ''
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="sandi"
                                        className="block text-base font-bold text-foreground"
                                    >
                                        Kata sandi
                                    </label>
                                    <div className="relative mt-2">
                                        <input
                                            id="sandi"
                                            type={
                                                sandiTerbaca
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            autoComplete="current-password"
                                            value={sandi}
                                            placeholder="Masukkan kata sandi"
                                            disabled={memuat}
                                            onChange={(e) =>
                                                setSandi(e.target.value)
                                            }
                                            className={`isian w-full bg-card pr-26 text-base placeholder:text-base placeholder:text-muted-foreground/75 disabled:opacity-60 ${
                                                merahSandi
                                                    ? 'border-tone-red'
                                                    : ''
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSandiTerbaca(!sandiTerbaca)
                                            }
                                            aria-label={
                                                sandiTerbaca
                                                    ? 'Sembunyikan kata sandi'
                                                    : 'Tampilkan kata sandi'
                                            }
                                            className="absolute top-1/2 right-2 flex h-10 -translate-y-1/2 items-center gap-1.5 rounded-md border border-border bg-surface-subtle px-3 text-sm font-bold text-foreground hover:bg-accent hover:text-primary"
                                        >
                                            {sandiTerbaca ? (
                                                <EyeOff
                                                    className="size-4.5 shrink-0"
                                                    strokeWidth={2.5}
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <Eye
                                                    className="size-4.5 shrink-0"
                                                    strokeWidth={2.5}
                                                    aria-hidden="true"
                                                />
                                            )}
                                            <span aria-hidden="true">
                                                {sandiTerbaca
                                                    ? 'Tutup'
                                                    : 'Lihat'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {pemilihPeran !== undefined && (
                                <fieldset className="mt-6" disabled={memuat}>
                                    <legend className="mb-2 text-base font-bold text-foreground">
                                        Masuk sebagai
                                    </legend>
                                    {pemilihPeran}
                                </fieldset>
                            )}

                            <button
                                type="submit"
                                disabled={memuat}
                                className="tombol-utama mt-7 w-full text-lg disabled:bg-border disabled:text-muted-foreground disabled:shadow-none"
                            >
                                {memuat && (
                                    <Loader2
                                        className="size-5 animate-spin"
                                        aria-hidden="true"
                                    />
                                )}
                                {memuat ? 'Masuk…' : 'Masuk'}
                            </button>

                            <p className="mt-4 text-center text-sm text-muted-foreground">
                                Lupa nama pengguna atau kata sandi? Hubungi{' '}
                                <span className="font-semibold text-foreground">
                                    Bidan atau Admin Posyandu
                                </span>
                                .
                            </p>
                        </form>

                        {catatan !== undefined && (
                            <p className="mt-4 text-center text-base font-medium text-muted-foreground">
                                {catatan}
                            </p>
                        )}
                    </div>
                </div>

                <div
                    className="relative hidden overflow-hidden bg-[#0b5334] text-primary-foreground lg:my-6 lg:mr-6 lg:flex lg:w-[46%] lg:flex-col lg:rounded-[2rem]"
                    style={{
                        backgroundImage: `linear-gradient(to top, rgba(7, 62, 39, 0.94) 0%, rgba(7, 62, 39, 0.56) 34%, rgba(7, 62, 39, 0.04) 68%, transparent 100%), url(${ilustrasiPosyandu})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                    }}
                >
                    <div className="relative z-10 flex flex-1 flex-col justify-end p-8 pb-12 xl:p-12 xl:pb-16">
                        <p className="max-w-[18ch] text-3xl leading-tight font-extrabold text-balance">
                            Satu balita, satu riwayat.
                        </p>

                        <p className="mt-3 max-w-[40ch] text-base leading-relaxed text-white/90">
                            Satu tempat untuk mencatat hasil ukur, memantau
                            riwayat, dan menyiapkan tindak lanjut.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

/**
 * Merek produk: lambang, nama, dan wilayahnya.
 *
 * Satu bentuk untuk dua tempat — panel hijau di desktop, puncak formulir di
 * ponsel — supaya namanya tidak pernah berbeda di antara keduanya.
 */
function Merek({ terang = false }: { terang?: boolean }) {
    return (
        <div className="flex items-center gap-3.5">
            <span
                aria-hidden="true"
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl border ${
                    terang
                        ? 'border-white/20 bg-white/15 text-white'
                        : 'border-primary/20 bg-accent text-primary'
                }`}
            >
                <ShieldCheck className="size-6.5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
                <p className="text-lg leading-tight font-extrabold">
                    SIMPATIK Posyandu
                </p>
                <p
                    className={`mt-0.5 text-sm font-medium ${
                        terang ? 'text-white/80' : 'text-muted-foreground'
                    }`}
                >
                    Sistem Informasi Posyandu
                </p>
            </div>
        </div>
    );
}
