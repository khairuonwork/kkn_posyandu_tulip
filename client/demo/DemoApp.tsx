/**
 * Demo statis — aplikasi yang sama, tanpa backend.
 *
 * Sejak aplikasi punya entrinya sendiri, berkas ini tinggal memuat tiga hal
 * yang memang khusus demo: masuk tanpa verifikasi, pemilih peran, dan antrean
 * kirim contoh. Cangkang, router, kelima layar, dan seluruh komponennya
 * diimpor dari `@/` — yang dipresentasikan karena itu tidak dapat berbeda dari
 * yang dipakai.
 *
 * Dipertahankan supaya Portal dapat diperagakan ke Bidan atau dosen tanpa
 * menyalakan Docker, basis data, dan server.
 */

import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

import { bacaRute, boleh, Cangkang } from '@/app-shell';
import {
    PENGATURAN_BAWAAN,
    PENGGUNA_CONTOH,
    periodeTerbaru,
} from '@/data/contoh/store';
import { Layar } from '@/layar';
import { navigate, useAlamat } from '@/lib/nav';
import type { AnakBaru, PatchAnak } from '@/pages/anak/index';
import Login from '@/pages/auth/login';
import type { TabPeriode } from '@/pages/laporan/index';
import type { Ambang } from '@/pages/pengaturan/index';
import type { Pengguna, Peran } from '@/types/posyandu';

/**
 * Hasil penimbangan yang masih tertahan di perangkat kader.
 *
 * Aplikasi Tablet-lah yang mengantre pengukuran saat sinyal hilang (ADR-0003);
 * Portal hanya melaporkannya. Di demo angkanya tetap, supaya keadaan ini
 * terlihat tanpa harus mematikan jaringan.
 */
const ANTREAN_CONTOH = { jumlah: 3, sejak: '13 Juni, 09.12' };

const NAMA_PERAN: Record<Peran, string> = {
    kader: 'Kader',
    bidan: 'Bidan',
    admin: 'Admin',
};

const KETERANGAN_PERAN: Record<Peran, string> = {
    kader: 'Melihat data balita di RT binaannya',
    bidan: 'Melihat semua RT, mengoreksi data',
    admin: 'Mengubah batas dan mengelola pengguna',
};

const URUTAN_PERAN: Peran[] = ['kader', 'bidan', 'admin'];

/** Perpindahan seketika terasa seperti tautan, bukan seperti masuk aplikasi. */
const JEDA_MASUK_MS = 400;

export default function DemoApp() {
    const [peran, setPeran] = useState<Peran | null>(null);
    // Bawaan Bidan: peran dengan kemampuan terbanyak, sehingga demo dimulai
    // dari tampilan paling lengkap.
    const [peranDipilih, setPeranDipilih] = useState<Peran>('bidan');

    if (peran === null) {
        return (
            <Login
                awal={{ email: 'bidan@posyandutulip.id', sandi: 'rahasia' }}
                catatan="Mode demo — data contoh, tidak tersimpan."
                pemilihPeran={
                    <KartuPeran
                        nama="peran"
                        peran={peranDipilih}
                        onGanti={setPeranDipilih}
                    />
                }
                onMasuk={async () => {
                    // Kredensial tidak pernah ditolak; perannya yang dipilih.
                    await new Promise((lanjut) =>
                        setTimeout(lanjut, JEDA_MASUK_MS),
                    );
                    setPeran(peranDipilih);
                    navigate('/beranda');

                    return null;
                }}
            />
        );
    }

    return (
        <PortalDemo
            peran={peran}
            onGantiPeran={setPeran}
            onKeluar={() => {
                setPeran(null);
                navigate('/');
            }}
        />
    );
}

function PortalDemo({
    peran,
    onGantiPeran,
    onKeluar,
}: {
    peran: Peran;
    onGantiPeran: (peran: Peran) => void;
    onKeluar: () => void;
}) {
    const [periodeId, setPeriodeId] = useState(periodeTerbaru);
    const [tabLaporan, setTabLaporan] = useState<TabPeriode>('bulanan');
    const [koreksi, setKoreksi] = useState<Record<number, PatchAnak>>({});
    const [tambahan, setTambahan] = useState<AnakBaru[]>([]);
    const [antrean, setAntrean] = useState<typeof ANTREAN_CONTOH | undefined>(
        ANTREAN_CONTOH,
    );
    const [ambang, setAmbang] = useState<Ambang>(PENGATURAN_BAWAAN);
    const [pengguna, setPengguna] = useState<Pengguna[]>(PENGGUNA_CONTOH);

    const alamat = useAlamat();
    const rute = bacaRute(alamat);

    // Mengganti peran ke yang lebih terbatas bisa meninggalkan pemirsa di layar
    // yang tidak lagi boleh dibuka; alamatnya dikembalikan ke Beranda.
    useEffect(() => {
        if (!boleh(rute, peran)) {
            navigate('/beranda');
        }
    }, [peran, rute]);

    const pemilih = (ruang: string) => (
        <PemilihPeran
            nama={`peran-${ruang}`}
            peran={peran}
            onGanti={onGantiPeran}
            onKeluar={onKeluar}
        />
    );

    return (
        <Cangkang
            peran={peran}
            periodeId={periodeId}
            onPindahPeriode={setPeriodeId}
            kakiSidebar={pemilih('sisi')}
            kakiHalaman={pemilih('kaki')}
        >
            <Layar
                rute={rute}
                peran={peran}
                periodeId={periodeId}
                onPindahPeriode={setPeriodeId}
                tabLaporan={tabLaporan}
                onGantiTabLaporan={setTabLaporan}
                koreksi={koreksi}
                tambahan={tambahan}
                /* Antrean hanya berlaku untuk periode terbaru. Tanpa syarat
                   ini, membuka Mei 2026 tetap berbunyi "3 hasil belum
                   terkirim, tersimpan sejak 13 Juni" — mengaku menahan data
                   untuk bulan yang arsipnya sudah ditutup. */
                antrean={periodeId === periodeTerbaru ? antrean : undefined}
                onCobaKirim={() => setAntrean(undefined)}
                onSimpanAnak={(anakId, patch) =>
                    setKoreksi((k) => ({ ...k, [anakId]: patch }))
                }
                onTambahAnak={(baru) => setTambahan((t) => [...t, baru])}
                ambang={ambang}
                onSimpanAmbang={setAmbang}
                pengguna={pengguna}
                onSimpanPengguna={setPengguna}
            />
        </Cangkang>
    );
}

/**
 * Kartu radio peran, dipakai layar Masuk maupun sidebar.
 *
 * `nama` dibedakan tiap tempat: pemilih ini dirender dua kali sekaligus di
 * sidebar dan di kaki halaman, dan dua grup radio bernama sama akan saling
 * membatalkan pilihan.
 */
function KartuPeran({
    nama,
    peran,
    onGanti,
}: {
    nama: string;
    peran: Peran;
    onGanti: (peran: Peran) => void;
}) {
    return (
        <div className="flex flex-col gap-2">
            {URUTAN_PERAN.map((p) => (
                <label
                    key={p}
                    htmlFor={`${nama}-${p}`}
                    className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 ${
                        peran === p
                            ? 'border-primary bg-tone-green-bg'
                            : 'border-border'
                    }`}
                >
                    <input
                        id={`${nama}-${p}`}
                        type="radio"
                        name={nama}
                        value={p}
                        checked={peran === p}
                        onChange={() => onGanti(p)}
                        className="size-5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0">
                        <span
                            className={`block text-base font-bold ${
                                peran === p ? 'text-primary' : ''
                            }`}
                        >
                            {NAMA_PERAN[p]}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                            {KETERANGAN_PERAN[p]}
                        </span>
                    </span>
                </label>
            ))}
        </div>
    );
}

/**
 * Perkakas demo di cangkang: mengganti peran tanpa keluar-masuk.
 *
 * Menetap di sidebar pada desktop dan di kaki halaman pada ponsel, bukan
 * tersembunyi di menu profil: saat demo, pemirsa harus melihat sendiri peran
 * yang sedang aktif.
 */
function PemilihPeran({
    nama,
    peran,
    onGanti,
    onKeluar,
}: {
    nama: string;
    peran: Peran;
    onGanti: (peran: Peran) => void;
    onKeluar: () => void;
}) {
    return (
        <div className="border-t border-border px-4 py-3 lg:border-t-0 lg:px-5 lg:py-4">
            <p className="text-sm font-semibold text-muted-foreground">
                Masuk sebagai
            </p>

            <div className="mt-2">
                <KartuPeran nama={nama} peran={peran} onGanti={onGanti} />
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
                Perkakas demo — di aplikasi sungguhan peran datang dari akun.
            </p>

            <button
                type="button"
                onClick={onKeluar}
                className="tombol-kedua mt-3 w-full"
            >
                <LogOut className="size-5" strokeWidth={2.5} />
                Keluar
            </button>
        </div>
    );
}
