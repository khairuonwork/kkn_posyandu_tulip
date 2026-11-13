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
import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import ilustrasiPosyandu from '@/assets/login-posyandu-illustration-v1.png';
import { Head } from '@/lib/nav';
import './login.css';

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
    const sedangMengirim = useRef(false);
    const namaRef = useRef<HTMLInputElement>(null);
    const sandiRef = useRef<HTMLInputElement>(null);

    const kosong = username.trim() === '' || sandi === '';
    const galatKosong = galat === PESAN_KOSONG;
    const merahNama = galatKosong && username.trim() === '';
    const merahSandi = galatKosong && sandi === '';

    const kirim = (peristiwa: FormEvent) => {
        peristiwa.preventDefault();

        if (sedangMengirim.current) {
            return;
        }

        if (kosong) {
            setGalat(PESAN_KOSONG);
            (username.trim() === '' ? namaRef : sandiRef).current?.focus();

            return;
        }

        sedangMengirim.current = true;
        setMemuat(true);
        setGalat(null);

        onMasuk(username, sandi)
            .then((pesan) => {
                // Saat berhasil, komponen ini dilepas oleh pemanggilnya —
                // jadi hanya kegagalan yang perlu mengembalikan keadaan.
                if (pesan !== null) {
                    sedangMengirim.current = false;
                    setGalat(pesan);
                    setMemuat(false);
                }
            })
            .catch(() => {
                sedangMengirim.current = false;
                setGalat(
                    'Tidak dapat terhubung ke server. Periksa koneksi internet.',
                );
                setMemuat(false);
            });
    };

    return (
        <div className="login-halaman">
            {/* Judul tab ikut kembali saat Keluar ditekan; tanpa ini ia
                tertinggal pada layar yang barusan ditutup. */}
            <Head title="Masuk" />
            <main className="login-panel">
                <div className="login-form-panel">
                    <div className="login-form-content">
                        <Merek />

                        <h1 className="login-heading">Selamat datang</h1>

                        <p className="login-description">
                            Masuk untuk mencatat dan memantau tumbuh kembang
                            balita.
                        </p>

                        <form
                            onSubmit={kirim}
                            className="login-form"
                            aria-busy={memuat}
                        >
                            {(galat !== null || (sesiBerakhir && !memuat)) && (
                                <div className="login-notices">
                                    {sesiBerakhir &&
                                        galat === null &&
                                        !memuat && (
                                            <div
                                                role="status"
                                                className="pesan-masuk flex w-full items-start gap-2.5 rounded-lg border border-tone-blue bg-tone-blue-bg p-4 text-base font-semibold text-tone-blue"
                                            >
                                                <Info
                                                    className="mt-0.5 size-5 shrink-0"
                                                    strokeWidth={2.5}
                                                    aria-hidden="true"
                                                />
                                                Sesi telah berakhir. Silakan
                                                masuk kembali.
                                            </div>
                                        )}
                                    {galat !== null && (
                                        <div
                                            role="alert"
                                            className="pesan-masuk w-full rounded-2xl border border-tone-red/30 bg-tone-red-bg p-4.5 text-foreground shadow-sm"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-tone-red/15 text-tone-red">
                                                    <TriangleAlert
                                                        className="size-5"
                                                        strokeWidth={2.5}
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-extrabold text-tone-red">
                                                        {galatKosong
                                                            ? 'Lengkapi Data Masuk'
                                                            : 'Gagal Masuk ke Aplikasi'}
                                                    </p>
                                                    <p className="mt-0.5 text-sm leading-relaxed font-medium text-foreground">
                                                        {galat}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="login-fields">
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
                                        ref={namaRef}
                                        id="username"
                                        type="text"
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        value={username}
                                        placeholder="Contoh: kader_tulip"
                                        disabled={memuat}
                                        aria-invalid={merahNama || undefined}
                                        aria-describedby={
                                            merahNama
                                                ? 'galat-username'
                                                : undefined
                                        }
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        className={`isian mt-2 w-full bg-card text-base placeholder:text-base placeholder:text-muted-foreground/75 disabled:opacity-60 ${
                                            merahNama
                                                ? 'border-tone-red ring-2 ring-tone-red/10 focus:ring-tone-red'
                                                : ''
                                        }`}
                                    />
                                    <div className="login-field-feedback">
                                        {merahNama && (
                                            <p
                                                id="galat-username"
                                                className="flex items-center gap-1.5 text-xs font-bold text-tone-red"
                                            >
                                                <TriangleAlert
                                                    className="size-3.5 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Nama pengguna belum diisi
                                                </span>
                                            </p>
                                        )}
                                    </div>
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
                                            ref={sandiRef}
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
                                            aria-invalid={
                                                merahSandi || undefined
                                            }
                                            aria-describedby={
                                                merahSandi
                                                    ? 'galat-sandi'
                                                    : undefined
                                            }
                                            onChange={(e) =>
                                                setSandi(e.target.value)
                                            }
                                            className={`isian w-full bg-card pr-18 text-base placeholder:text-base placeholder:text-muted-foreground/75 disabled:opacity-60 ${
                                                merahSandi
                                                    ? 'border-tone-red ring-2 ring-tone-red/10 focus:ring-tone-red'
                                                    : ''
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            disabled={memuat}
                                            onClick={() =>
                                                setSandiTerbaca(!sandiTerbaca)
                                            }
                                            aria-pressed={sandiTerbaca}
                                            aria-label={
                                                sandiTerbaca
                                                    ? 'Sembunyikan kata sandi'
                                                    : 'Tampilkan kata sandi'
                                            }
                                            className="login-password-toggle"
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
                                        </button>
                                    </div>
                                    <div className="login-field-feedback">
                                        {merahSandi && (
                                            <p
                                                id="galat-sandi"
                                                className="flex items-center gap-1.5 text-xs font-bold text-tone-red"
                                            >
                                                <TriangleAlert
                                                    className="size-3.5 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    Kata sandi belum diisi
                                                </span>
                                            </p>
                                        )}
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
                                className="tombol-utama login-submit disabled:bg-border disabled:text-muted-foreground disabled:shadow-none"
                            >
                                <span className="relative inline-grid place-items-center">
                                    <span
                                        className={`col-start-1 row-start-1 transition-opacity duration-200 motion-reduce:transition-none ${memuat ? 'opacity-0' : 'opacity-100'}`}
                                        aria-hidden={memuat}
                                    >
                                        Masuk
                                    </span>
                                    <span
                                        className={`col-start-1 row-start-1 inline-flex items-center gap-2 transition-opacity duration-200 motion-reduce:transition-none ${memuat ? 'opacity-100' : 'invisible opacity-0'}`}
                                        aria-hidden={!memuat}
                                    >
                                        <Loader2
                                            className="size-5 motion-safe:animate-spin"
                                            aria-hidden="true"
                                        />
                                        Masuk…
                                    </span>
                                </span>
                            </button>

                            <p className="login-help">
                                Lupa nama pengguna atau kata sandi? Hubungi{' '}
                                <span className="font-semibold text-foreground">
                                    Bidan atau Admin Posyandu
                                </span>
                                .
                            </p>
                        </form>

                        {catatan !== undefined && (
                            <p className="login-note">{catatan}</p>
                        )}
                    </div>
                </div>

                <div
                    className="login-visual"
                    style={{
                        backgroundImage: `url(${ilustrasiPosyandu})`,
                    }}
                >
                    <div className="login-visual-copy">
                        <p className="login-visual-heading">
                            Satu balita, satu riwayat.
                        </p>

                        <p className="login-visual-description">
                            Satu tempat untuk mencatat hasil ukur, memantau
                            riwayat, dan menyiapkan tindak lanjut.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

/** Identitas produk yang sama pada form desktop dan ponsel. */
function Merek() {
    return (
        <div className="login-brand">
            <span aria-hidden="true" className="login-brand-mark">
                <ShieldCheck className="size-6.5" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
                <p className="login-brand-name">SIMPATIK Posyandu</p>
                <p className="login-brand-description">
                    Sistem Informasi Posyandu
                </p>
            </div>
        </div>
    );
}
