/**
 * Layar Masuk — docs/10-prd-demo-frontend.md bagian 6.1.
 *
 * Kredensial tidak diverifikasi; peran dipilih, tidak diperiksa (bagian 11).
 * Karena itu layar ini perancah demo dan tinggal di demo/, bukan di
 * resources/js/pages/auth/login.tsx yang sudah dipakai Fortify. Lihat D-05 di
 * docs/11-catatan-tahap-demo.md.
 */

import { Eye, EyeOff, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Peran } from '@/types/posyandu';
import ilustrasiPosyandu from './assets/login-posyandu-illustration-v1.png';
import { Head } from './nav';

const PERAN: { nilai: Peran; nama: string; keterangan: string }[] = [
    {
        nilai: 'kader',
        nama: 'Kader',
        keterangan: 'Melihat data anak di RT binaannya',
    },
    {
        nilai: 'bidan',
        nama: 'Bidan',
        keterangan: 'Melihat semua RT, mengoreksi data',
    },
    {
        nilai: 'admin',
        nama: 'Admin',
        keterangan: 'Mengelola akun, periode, dan ambang',
    },
];

/** Perpindahan seketika terasa seperti tautan, bukan seperti masuk aplikasi. */
const JEDA_MASUK_MS = 400;

type Props = { onMasuk: (peran: Peran) => void };

export default function Login({ onMasuk }: Props) {
    const [email, setEmail] = useState('bidan@posyandutulip.id');
    const [sandi, setSandi] = useState('rahasia');
    const [sandiTerbaca, setSandiTerbaca] = useState(false);
    // Bawaan Bidan: peran dengan kemampuan terbanyak, sehingga demo dimulai
    // dari tampilan paling lengkap.
    const [peran, setPeran] = useState<Peran>('bidan');
    const [memuat, setMemuat] = useState(false);

    // Demo tidak pernah menolak kredensial. State ini ada supaya blok galat
    // terpasang lengkap dan tidak perlu dirancang ulang saat Fortify masuk.
    const [galat] = useState<string | null>(null);

    const kosong = email.trim() === '' || sandi === '';

    const kirim = (peristiwa: FormEvent) => {
        peristiwa.preventDefault();

        if (kosong || memuat) {
            return;
        }

        setMemuat(true);
        window.setTimeout(() => onMasuk(peran), JEDA_MASUK_MS);
    };

    return (
        <div className="relative isolate flex min-h-screen overflow-hidden">
            {/* Judul tab ikut kembali saat Keluar ditekan; tanpa ini ia
                tertinggal pada layar yang barusan ditutup. */}
            <Head title="Masuk" />
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
            >
                <span className="absolute -top-8 -left-24 h-px w-80 rotate-[31deg] bg-primary/18" />
                <span className="absolute top-7 -left-28 h-px w-80 rotate-[31deg] bg-primary/12" />
                <span className="absolute top-22 -left-20 h-px w-72 rotate-[31deg] bg-primary/8" />
                <span className="absolute -right-24 -bottom-8 h-px w-80 rotate-[31deg] bg-primary/18" />
                <span className="absolute -right-28 bottom-7 h-px w-80 rotate-[31deg] bg-primary/12" />
                <span className="absolute -right-20 bottom-22 h-px w-72 rotate-[31deg] bg-primary/8" />
            </div>
            <main className="flex w-full">
                {/* Irama tegaknya rapat dengan sengaja. Pada skala v2 isian
                menjadi 52 px dan judul 36 px, sehingga blok bagian 6.1 apa
                adanya mendorong tombol Masuk ke bawah lipatan laptop 1440x900.
                Jarak antar bagian dirapatkan sampai tombolnya kembali terlihat
                tanpa menggulir; tidak ada kalimat yang dibuang, dan kartu peran
                tetap setinggi isinya.

                Panel kiri putih, bukan `bg-background`. Sejak dasar halaman
                menjadi #EDEFEA, `bg-background` membuat kedua panel berwarna
                abu dan pembagian dua panelnya lenyap. Bagian 6.1 menetapkan
                kiri #FFFFFF, kanan #F6F7F5. */}
                <div className="flex w-full flex-col items-center justify-center bg-transparent px-6 py-12 sm:px-12 xl:w-[54%] xl:px-20">
                    {/* Blok maks 400 px sesuai bagian 6.1. Sebelumnya 560 px, yang
                    menarik baris isian jadi selebar tabel. */}
                    <div className="w-full max-w-[480px]">
                        <Merek />

                        <h1 className="mt-10 text-4xl font-extrabold tracking-[-0.03em] lg:text-5xl">
                            Selamat datang
                        </h1>

                        <p className="mt-3 max-w-[44ch] text-lg leading-relaxed text-muted-foreground">
                            Masuk untuk melanjutkan pencatatan dan pemantauan
                            tumbuh kembang balita.
                        </p>

                        <form onSubmit={kirim} className="mt-9">
                            {galat !== null && (
                                <div
                                    role="alert"
                                    className="mb-4 flex items-start gap-2.5 rounded-lg border border-tone-red bg-tone-red-bg p-4 text-sm font-semibold text-tone-red"
                                >
                                    <TriangleAlert
                                        className="mt-0.5 size-4 shrink-0"
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    {galat}
                                </div>
                            )}

                            <div className="space-y-6">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-base font-semibold text-muted-foreground"
                                    >
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        placeholder="nama@posyandu.id"
                                        disabled={memuat}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        className={`isian mt-2 w-full text-lg placeholder:text-lg disabled:opacity-60 ${
                                            galat === null
                                                ? ''
                                                : 'border-tone-red'
                                        }`}
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="sandi"
                                        className="block text-base font-semibold text-muted-foreground"
                                    >
                                        Kata sandi
                                    </label>
                                    <div className="relative mt-1.5">
                                        <input
                                            id="sandi"
                                            type={
                                                sandiTerbaca
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            value={sandi}
                                            placeholder="Masukkan kata sandi"
                                            disabled={memuat}
                                            onChange={(e) =>
                                                setSandi(e.target.value)
                                            }
                                            className={`isian w-full pr-13 text-lg placeholder:text-lg disabled:opacity-60 ${
                                                galat === null
                                                    ? ''
                                                    : 'border-tone-red'
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
                                            className="absolute top-1/2 right-0 flex size-13 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground"
                                        >
                                            {sandiTerbaca ? (
                                                <EyeOff
                                                    className="size-5"
                                                    strokeWidth={2.5}
                                                />
                                            ) : (
                                                <Eye
                                                    className="size-5"
                                                    strokeWidth={2.5}
                                                />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <fieldset className="mt-7" disabled={memuat}>
                                <legend className="sr-only">
                                    Masuk sebagai
                                </legend>
                                {/* Bertumpuk vertikal, bukan segmented control.
                                Bagian 6.1 menolaknya secara khusus: di sidebar
                                pemilih peran adalah pengalih cepat, di sini ia
                                pilihan pertama yang butuh keterangan per peran
                                - dan keterangan itu tidak muat dalam segmen. */}
                                <div className="flex flex-col gap-3">
                                    {PERAN.map((p) => (
                                        <label
                                            key={p.nilai}
                                            htmlFor={`masuk-peran-${p.nilai}`}
                                            className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-xl border-2 px-5 py-4 ${
                                                peran === p.nilai
                                                    ? 'border-primary bg-tone-green-bg'
                                                    : 'border-border'
                                            }`}
                                        >
                                            <input
                                                id={`masuk-peran-${p.nilai}`}
                                                type="radio"
                                                name="peran"
                                                value={p.nilai}
                                                checked={peran === p.nilai}
                                                onChange={() =>
                                                    setPeran(p.nilai)
                                                }
                                                className="size-5 shrink-0 accent-primary"
                                            />
                                            <span className="min-w-0">
                                                <span
                                                    className={`block text-lg font-bold ${
                                                        peran === p.nilai
                                                            ? 'text-primary'
                                                            : ''
                                                    }`}
                                                >
                                                    {p.nama}
                                                </span>
                                                <span className="block text-base text-muted-foreground">
                                                    {p.keterangan}
                                                </span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>

                            <button
                                type="submit"
                                disabled={kosong || memuat}
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
                        </form>

                        <p className="mt-5 text-center text-base font-medium text-muted-foreground">
                            Mode demo — data contoh, tidak tersimpan.
                        </p>
                    </div>
                </div>

                {/*
                Panel kanan hijau pekat, bukan abu. Ia yang memegang merek
                sekarang, jadi warnanya harus menyatakan produk — bukan sekadar
                membagi layar jadi dua.

                `aria-hidden` dibuang bersama warnanya: dulu panel ini hiasan,
                sekarang ia memuat nama produk dan tiga angka nyata dari arsip.
                Menyembunyikannya dari pembaca layar berarti menyembunyikan
                satu-satunya tempat nama produk berada di desktop.

                Teks sekunder memakai putih 80% di atas hijau — 4,7:1, lolos AA
                — bukan abu. Abu di atas permukaan berwarna selalu terbaca
                seperti teks mati, bukan seperti teks pendukung.
            */}
                <div
                    className="relative hidden overflow-hidden bg-[#0b5334] text-primary-foreground xl:my-6 xl:mr-6 xl:flex xl:w-[46%] xl:flex-col xl:rounded-[2rem]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(7, 80, 52, 0.36), rgba(7, 80, 52, 0.68)), url(${ilustrasiPosyandu})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                    }}
                >
                    <div className="relative z-10 flex flex-1 flex-col justify-end p-8 pb-12 xl:p-12 xl:pb-16">
                        <p className="max-w-[18ch] text-3xl leading-tight font-extrabold text-balance">
                            Pencatatan balita yang lebih dekat dengan pelayanan.
                        </p>

                        <p className="mt-5 max-w-[40ch] text-base leading-relaxed text-white/80">
                            Satu tempat untuk mencatat hasil ukur, memantau
                            riwayat, dan menyiapkan tindak lanjut keluarga.
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
        <div>
            <div className="flex items-center gap-3">
                <ShieldCheck
                    className={`size-7 shrink-0 ${terang ? '' : 'text-primary'}`}
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
                <span className="text-lg font-extrabold">
                    SIMPATIK Posyandu
                </span>
            </div>

            <p
                className={`mt-2 text-sm font-medium ${
                    terang ? 'text-white/80' : 'text-muted-foreground'
                }`}
            >
                Sistem Informasi Posyandu
            </p>
        </div>
    );
}
