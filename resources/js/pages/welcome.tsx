/**
 * Halaman sambutan di alamat `/`.
 *
 * Sebelumnya 390 baris halaman pemasaran bawaan starter kit: logo Laravel,
 * tautan ke laravel.com dan Laravel Cloud, dan hex tertanam (`#FDFDFC`,
 * `#19140035`) yang mengabaikan seluruh token bagian 2. Tidak ada satu pun
 * artboard Portal yang memuatnya, dan produk ini memang tidak punya halaman
 * pemasaran — yang dibutuhkan hanya satu pintu masuk.
 *
 * Ditulis ulang, bukan dihapus: rute `home` tetap hidup.
 */

import { Head, Link, usePage } from '@inertiajs/react';
import { HeartPulse } from 'lucide-react';
import { dashboard, login } from '@/routes';

export default function Welcome() {
    const { auth, currentTeam } = usePage().props;
    const sudahMasuk = auth.user !== null && auth.user !== undefined;
    const tujuan =
        sudahMasuk && currentTeam ? dashboard(currentTeam.slug) : login();

    return (
        <>
            <Head title="Portal Posyandu Tulip" />

            <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-10">
                <main className="kartu w-full max-w-[440px] px-6 py-8 sm:px-8">
                    <div className="flex items-center gap-3">
                        <HeartPulse
                            className="size-7 shrink-0 text-primary"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        {/* Nama produk: keputusan P1 pada bagian 13.3. */}
                        <span className="text-lg font-extrabold">
                            Portal Posyandu Tulip
                        </span>
                    </div>

                    <h1 className="mt-6 text-3xl leading-tight font-extrabold tracking-[-0.02em]">
                        Satu anak, satu riwayat.
                    </h1>

                    <p className="mt-3 text-base text-pretty text-muted-foreground">
                        Catatan pertumbuhan balita Posyandu Tulip. Status gizi
                        dihitung dengan standar antropometri WHO 2006, mengikuti
                        ambang Permenkes No. 2 Tahun 2020.
                    </p>

                    <Link href={tujuan} className="tombol-utama mt-7 w-full">
                        {sudahMasuk ? 'Buka Beranda' : 'Masuk'}
                    </Link>

                    {/* Tidak ada tautan daftar. Akun kader dan bidan dibuatkan
                        admin Posyandu, bukan didaftarkan sendiri. */}
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                        Akun dibuatkan admin Posyandu.
                    </p>
                </main>
            </div>
        </>
    );
}
