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

import { ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';

import { bacaRute, boleh, Cangkang, KartuAkun } from '@/app-shell';
import {
    daftarRt,
    PENGATURAN_BAWAAN,
    PENGGUNA_CONTOH,
    periodeTerbaru,
    STANDARISASI_BAWAAN,
} from '@/data/contoh/store';
import { Layar } from '@/layar';
import { navigate, useAlamat } from '@/lib/nav';
import type { AnakBaru, PatchAnak } from '@/pages/anak/index';
import Login from '@/pages/auth/login';
import type { TabPeriode } from '@/pages/laporan/index';
import type {
    Ambang,
    StandarisasiAntropometri,
} from '@/pages/pengaturan/index';
import type { Pengguna, Peran } from '@/types/posyandu';

/**
 * Hasil penimbangan yang masih tertahan di perangkat kader.
 *
 * Aplikasi Tablet-lah yang mengantre pengukuran saat sinyal hilang (ADR-0003);
 * Portal hanya melaporkannya. Di demo angkanya tetap, supaya keadaan ini
 * terlihat tanpa harus mematikan jaringan.
 */
const ANTREAN_CONTOH = { jumlah: 3, sejak: '13 Juni, pukul 09.12' };

const NAMA_PERAN: Record<Peran, string> = {
    kader: 'Kader',
    bidan: 'Bidan',
    admin: 'Admin',
    kms: 'Petugas KMS',
};

const KETERANGAN_PERAN: Record<Peran, string> = {
    kader: 'Mencatat penimbangan di RT binaannya',
    bidan: 'Melihat semua RT, mengoreksi data',
    admin: 'Mengubah batas dan mengelola pengguna',
    kms: 'Membaca analisis dan menyelesaikan tahap penjelasan KMS',
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
                awal={{ username: 'bidan', sandi: 'rahasia' }}
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
    const [standarisasi, setStandarisasi] =
        useState<StandarisasiAntropometri>(STANDARISASI_BAWAAN);
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

    return (
        <Cangkang
            peran={peran}
            periodeId={periodeId}
            onPindahPeriode={setPeriodeId}
            kakiSidebar={
                <PemilihPeran
                    peran={peran}
                    onGanti={onGantiPeran}
                    onKeluar={onKeluar}
                />
            }
        >
            <Layar
                rute={rute}
                peran={peran}
                onSesiBerakhir={() => undefined}
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
                    setKoreksi((k) => ({
                        ...k,
                        // Dialog Ubah data dan editor baris mengisi kolom
                        // yang berbeda; keduanya ditumpuk, bukan saling ganti.
                        [anakId]: { ...k[anakId], ...patch },
                    }))
                }
                onTambahAnak={(baru) => setTambahan((t) => [...t, baru])}
                ambang={ambang}
                onSimpanAmbang={setAmbang}
                standarisasi={standarisasi}
                onSimpanStandarisasi={setStandarisasi}
                pengguna={{ status: 'siap', pengguna, wilayahRt: daftarRt() }}
                /* Demo tidak punya server: aturan akun cukup diperiksa dialog,
                   dan kata sandinya tidak disimpan ke mana pun. */
                // eslint-disable-next-line @typescript-eslint/no-unused-vars -- sengaja dibuang
                onSimpanPengguna={async (id, { kataSandi, ...isi }) => {
                    setPengguna((d) =>
                        id === null
                            ? [
                                  ...d,
                                  {
                                      ...isi,
                                      id:
                                          Math.max(0, ...d.map((p) => p.id)) +
                                          1,
                                  },
                              ]
                            : d.map((p) =>
                                  p.id === id ? { ...p, ...isi } : p,
                              ),
                    );

                    return null;
                }}
            />
        </Cangkang>
    );
}

/** Kartu radio peran di layar Masuk, lengkap dengan keterangan tiap peran. */
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
 * Perkakas demo di kaki sidebar: mengganti peran tanpa keluar-masuk.
 *
 * Bentuknya kaki sidebar aplikasi sungguhan — "Masuk sebagai" dan tombol
 * Keluar — dengan nama peran yang bisa dipilih. Dirender di sidebar dan di
 * laci menu sekaligus, jadi labelnya membungkus <select> alih-alih memakai `id`.
 */
function PemilihPeran({
    peran,
    onGanti,
    onKeluar,
}: {
    peran: Peran;
    onGanti: (peran: Peran) => void;
    onKeluar: () => void;
}) {
    // Nama akun contoh untuk peran ini, supaya kartu akun demo sama dengan
    // aplikasi sungguhan.
    const nama =
        PENGGUNA_CONTOH.find((p) => p.peran === peran && p.aktif)?.nama ??
        NAMA_PERAN[peran];

    return (
        <div>
            <KartuAkun
                nama={nama}
                onKeluar={onKeluar}
                peran={
                    /* Di demo, peran di bawah nama sekaligus pemilih peran. */
                    <span className="relative inline-flex items-center">
                        <select
                            aria-label="Ganti peran demo"
                            value={peran}
                            onChange={(e) => onGanti(e.target.value as Peran)}
                            className="h-6.5 cursor-pointer appearance-none bg-transparent pr-5 text-sm text-[#2f6b4d]"
                        >
                            {URUTAN_PERAN.map((p) => (
                                <option key={p} value={p}>
                                    {NAMA_PERAN[p]}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            className="pointer-events-none absolute right-0 size-4 text-[#2f6b4d]"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                    </span>
                }
            />

            <p className="mt-1.5 text-xs text-muted-foreground">
                Perkakas demo. Di aplikasi sungguhan, peran mengikuti akun.
            </p>
        </div>
    );
}
