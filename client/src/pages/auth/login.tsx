/**
 * Layar Masuk — docs/rujukan/layar-demo.md bagian 6.1.
 *
 * Dipakai bersama aplikasi sungguhan dan demo. Yang membedakan keduanya hanya
 * `onMasuk`: aplikasi memanggil `POST /api/masuk` dan peran datang dari akun,
 * demo menerima apa saja dan perannya dipilih lewat `pemilihPeran`.
 *
 * Layar ini tidak tahu mana yang sedang berjalan, dan memang tidak perlu tahu.
 */

import { Eye, EyeOff, HeartPulse, Loader2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { data } from '@/data/contoh/store';
import { Head } from '@/lib/nav';

type Props = {
    /** Mengembalikan pesan galat, atau null bila berhasil. */
    onMasuk: (email: string, kataSandi: string) => Promise<string | null>;
    /** Kartu pemilih peran — hanya demo yang mengisinya. */
    pemilihPeran?: ReactNode;
    /** Keterangan di bawah tombol, mis. penanda mode demo. */
    catatan?: ReactNode;
    awal?: { email: string; sandi: string };
};

export default function Login({ onMasuk, pemilihPeran, catatan, awal }: Props) {
    const [email, setEmail] = useState(awal?.email ?? '');
    const [sandi, setSandi] = useState(awal?.sandi ?? '');
    const [sandiTerbaca, setSandiTerbaca] = useState(false);
    const [memuat, setMemuat] = useState(false);
    const [galat, setGalat] = useState<string | null>(null);

    const kosong = email.trim() === '' || sandi === '';

    const kirim = (peristiwa: FormEvent) => {
        peristiwa.preventDefault();

        if (kosong || memuat) {
            return;
        }

        setMemuat(true);
        setGalat(null);

        onMasuk(email, sandi)
            .then((pesan) => {
                // Saat berhasil, komponen ini dilepas oleh pemanggilnya —
                // jadi hanya kegagalan yang perlu mengembalikan keadaan.
                if (pesan !== null) {
                    setGalat(pesan);
                    setMemuat(false);
                }
            })
            .catch(() => {
                setGalat('Tidak dapat menghubungi server. Periksa sambungan.');
                setMemuat(false);
            });
    };

    return (
        <div className="flex min-h-screen">
            {/* Judul tab ikut kembali saat Keluar ditekan; tanpa ini ia
                tertinggal pada layar yang barusan ditutup. */}
            <Head title="Masuk" />
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
            <div className="flex w-full items-center justify-start bg-card px-6 py-5 sm:px-10 lg:w-[60%] xl:w-[52%] xl:min-w-[560px] xl:px-16">
                {/* Blok maks 400 px sesuai bagian 6.1. Sebelumnya 560 px, yang
                    menarik baris isian jadi selebar tabel. */}
                <div className="w-full max-w-[400px]">
                    {/* Mereknya pindah ke panel hijau, tapi panel itu hilang di
                        bawah 1024 px — dan layar Masuk tanpa nama produk sama
                        sekali adalah harga yang terlalu mahal. Di ponsel ia
                        tetap di sini; di desktop hanya ada satu, di kanan. */}
                    <div className="lg:hidden">
                        <Merek />
                    </div>

                    <h1 className="mt-5 text-3xl font-extrabold tracking-[-0.02em] lg:mt-0">
                        Masuk
                    </h1>

                    <p className="mt-2 max-w-[44ch] text-base text-muted-foreground">
                        Catatan pertumbuhan balita Posyandu Tulip.
                    </p>

                    <form onSubmit={kirim} className="mt-5">
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

                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-semibold text-muted-foreground"
                                >
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    disabled={memuat}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`isian mt-1.5 w-full disabled:opacity-60 ${
                                        galat === null ? '' : 'border-tone-red'
                                    }`}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="sandi"
                                    className="block text-sm font-semibold text-muted-foreground"
                                >
                                    Kata sandi
                                </label>
                                <div className="relative mt-1.5">
                                    <input
                                        id="sandi"
                                        type={
                                            sandiTerbaca ? 'text' : 'password'
                                        }
                                        value={sandi}
                                        disabled={memuat}
                                        onChange={(e) =>
                                            setSandi(e.target.value)
                                        }
                                        className={`isian w-full pr-13 disabled:opacity-60 ${
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

                        {pemilihPeran !== undefined && (
                            <fieldset className="mt-4" disabled={memuat}>
                                <legend className="sr-only">
                                    Masuk sebagai
                                </legend>
                                {pemilihPeran}
                            </fieldset>
                        )}

                        <button
                            type="submit"
                            disabled={kosong || memuat}
                            className="tombol-utama mt-4 w-full disabled:bg-border disabled:text-muted-foreground disabled:shadow-none"
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

                    {catatan !== undefined && (
                        <p className="mt-3 text-center text-sm font-medium text-muted-foreground">
                            {catatan}
                        </p>
                    )}
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
            <div className="hidden flex-col bg-primary px-10 py-10 text-primary-foreground lg:flex lg:w-[40%] xl:w-[48%] xl:px-16">
                <Merek terang />

                <div className="flex flex-1 flex-col justify-center py-10">
                    {/* Kalimat ini inti produknya: riwayat tiap balita berhenti
                        terpecah per buku dan per kader. Versi lama menutupnya
                        dengan "Bukan dua belas berkas Excel" - sindiran ke cara
                        kerja pembacanya sendiri, di layar internal, memakai
                        angka yang tidak dibuktikan apa pun di halaman ini.
                        Ketiga angka di bawah membuktikan cakupannya. */}
                    <p className="max-w-[16ch] text-3xl leading-tight font-extrabold text-balance">
                        Satu balita, satu riwayat penimbangan.
                    </p>

                    <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/25 pt-8">
                        <div>
                            <dt className="text-2xl font-extrabold">
                                {data.anak.length}
                            </dt>
                            <dd className="mt-1 text-base text-white/80">
                                balita dalam arsip
                            </dd>
                        </div>
                        <div>
                            <dt className="text-2xl font-extrabold">
                                {data.periode.length}
                            </dt>
                            <dd className="mt-1 text-base text-white/80">
                                bulan kegiatan
                            </dd>
                        </div>
                        <div>
                            <dt className="text-2xl font-extrabold">
                                RW {data.meta.rw}
                            </dt>
                            <dd className="mt-1 text-base text-white/80">
                                Kelurahan {data.meta.kelurahan}
                            </dd>
                        </div>
                    </dl>
                </div>

                <p className="text-base text-white/80">
                    Data Januari–Juni 2026, dianonimkan untuk demo.
                </p>
            </div>
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
                <HeartPulse
                    className={`size-7 shrink-0 ${terang ? '' : 'text-primary'}`}
                    strokeWidth={2.5}
                    aria-hidden="true"
                />
                {/* Nama produk: keputusan P1 pada bagian 13.3.
                    `Catatan Posyandu` dan `SIMPATIK Posyandu` pada artboard
                    tidak dipakai. */}
                <span className="text-lg font-extrabold">
                    Portal Posyandu Tulip
                </span>
            </div>

            <p
                className={`mt-2 text-sm font-medium ${
                    terang ? 'text-white/80' : 'text-muted-foreground'
                }`}
            >
                RW 18 Kelurahan Citeureup
            </p>
        </div>
    );
}
