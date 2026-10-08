/**
 * Aplikasi sungguhan.
 *
 * Perbedaannya dari demo hanya di berkas ini: masuk lewat `POST /api/masuk`,
 * peran datang dari akun di basis data, daftar akun di Pengaturan dibaca dan
 * disimpan lewat `/api/pengguna`, dan tidak ada pemilih peran. Cangkang,
 * router, kelima layar, dan seluruh komponennya sama persis — sehingga apa
 * yang dipresentasikan tidak bisa berbeda dari apa yang dipakai.
 */

import { useEffect, useState } from 'react';

import { bacaRute, boleh, Cangkang, KartuAkun } from '@/app-shell';
import { PENGATURAN_BAWAAN, STANDARISASI_BAWAAN } from '@/data/contoh/store';
import { Layar } from '@/layar';
import {
    simpanProfilAnak,
    useAnakServer,
    useDetailAnakServer,
} from '@/lib/anak';
import { useBerandaServer } from '@/lib/beranda';
import { navigate, useAlamat } from '@/lib/nav';
import { usePenggunaServer } from '@/lib/pengguna';
import { useSesi } from '@/lib/sesi';
import type { AnakBaru, PatchAnak } from '@/pages/anak/index';
import Login from '@/pages/auth/login';
import LembarHasil from '@/pages/hasil/lembar';
import type { TabPeriode } from '@/pages/laporan/index';
import type {
    Ambang,
    StandarisasiAntropometri,
} from '@/pages/pengaturan/index';
import type { Peran } from '@/types/posyandu';

const NAMA_PERAN: Record<Peran, string> = {
    kader: 'Kader',
    bidan: 'Bidan',
    admin: 'Admin',
};

export default function App() {
    const alamat = useAlamat();
    const hasil = /^\/hasil\/([\w.-]{10,400})$/.exec(alamat);

    // Tautan hasil untuk orang tua: dibuka tanpa masuk, jadi sebelum sesi
    // diperiksa dan tanpa cangkang portal.
    if (hasil !== null) {
        return <LembarHasil token={hasil[1]} />;
    }

    return <AplikasiPetugas />;
}

function AplikasiPetugas() {
    const sesi = useSesi();

    if (sesi.status === 'memeriksa') {
        return <Memeriksa />;
    }

    if (sesi.status === 'keluar') {
        return <Login onMasuk={sesi.masuk} />;
    }

    return (
        <Portal
            nama={sesi.pengguna.nama}
            peran={sesi.pengguna.peran}
            rt={sesi.pengguna.rt}
            // Alamat baru diganti setelah server menjawab. Menggantinya lebih
            // dulu membuat permintaan keluar berlomba dengan perpindahan
            // halaman — dan permintaan yang batal berarti sesinya tetap hidup
            // di basis data meski penggunanya merasa sudah keluar.
            onKeluar={() => {
                void sesi.keluar().then(() => navigate('/'));
            }}
            // Sesi yang dicabut server berakhir di tempat: alamatnya tetap,
            // sehingga setelah masuk kembali pengguna berada di layar yang sama.
            onSesiBerakhir={sesi.keluar}
        />
    );
}

/**
 * Layar antara saat cookie sedang diperiksa.
 *
 * Sengaja hampir kosong: ia hanya muncul sepersekian detik, dan apa pun yang
 * lebih ramai akan terbaca sebagai kedipan.
 */
function Memeriksa() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <p className="text-base text-muted-foreground">Memeriksa sesi…</p>
        </div>
    );
}

function Portal({
    nama,
    peran,
    rt,
    onKeluar,
    onSesiBerakhir,
}: {
    nama: string;
    peran: Peran;
    rt: string | null;
    onKeluar: () => void;
    onSesiBerakhir: () => void;
}) {
    const [periodePilihan, setPeriodePilihan] = useState('');
    const [tabLaporan, setTabLaporan] = useState<TabPeriode>('bulanan');
    /*
        ponytail: keempat state di bawah hanya hidup di memori, sama seperti
        di demo — belum ada endpoint yang menerimanya. Saat endpoint data
        datang, keempatnya berganti menjadi panggilan API seperti akun.
    */
    const [koreksi, setKoreksi] = useState<Record<number, PatchAnak>>({});
    const [tambahan, setTambahan] = useState<AnakBaru[]>([]);
    const [ambang, setAmbang] = useState<Ambang>(PENGATURAN_BAWAAN);
    const [standarisasi, setStandarisasi] =
        useState<StandarisasiAntropometri>(STANDARISASI_BAWAAN);

    const alamat = useAlamat();
    const rute = bacaRute(alamat);
    const berandaServer = useBerandaServer(
        periodePilihan,
        rute.nama === 'beranda',
        onSesiBerakhir,
    );
    const periodeId = berandaServer.periodeAktif;
    const akun = usePenggunaServer(
        peran === 'admin' && rute.nama === 'pengaturan',
        onSesiBerakhir,
    );
    const anakServer = useAnakServer(onSesiBerakhir);
    const detailServer = useDetailAnakServer(
        rute.nama === 'detail' || rute.nama === 'riwayat' ? rute.id : null,
        onSesiBerakhir,
    );

    // Alamat yang tidak boleh dibuka peran ini dikembalikan ke Beranda. Ini
    // kenyamanan; penolakan yang mengikat ada di server.
    useEffect(() => {
        if (!boleh(rute, peran)) {
            navigate('/beranda');
        }
    }, [peran, rute]);

    return (
        <Cangkang
            peran={peran}
            periodeId={periodeId}
            periode={berandaServer.periode}
            onPindahPeriode={setPeriodePilihan}
            kakiSidebar={
                <KartuAkun
                    nama={nama}
                    peran={NAMA_PERAN[peran]}
                    onKeluar={onKeluar}
                />
            }
        >
            <Layar
                rute={rute}
                peran={peran}
                rtPengguna={rt}
                periodeId={periodeId}
                onPindahPeriode={setPeriodePilihan}
                tabLaporan={tabLaporan}
                onGantiTabLaporan={setTabLaporan}
                koreksi={koreksi}
                tambahan={tambahan}
                onCobaKirim={() => undefined}
                onSimpanAnak={async (anakId, patch) => {
                    await simpanProfilAnak(anakId, patch, onSesiBerakhir);
                    setKoreksi((k) => ({
                        ...k,
                        // Dialog Ubah data dan editor baris mengisi kolom
                        // yang berbeda; keduanya ditumpuk, bukan saling ganti.
                        [anakId]: { ...k[anakId], ...patch },
                    }));
                    anakServer.muatUlang();
                }}
                onTambahAnak={(baru) => setTambahan((t) => [...t, baru])}
                ambang={ambang}
                onSimpanAmbang={setAmbang}
                standarisasi={standarisasi}
                onSimpanStandarisasi={setStandarisasi}
                pengguna={akun.daftar}
                onSimpanPengguna={akun.simpan}
                modeDataLive
                statusAnakServer={anakServer.status}
                pesanGalatAnakServer={anakServer.pesanGalat}
                onMuatUlangAnakServer={anakServer.muatUlang}
                anakServer={anakServer.baris}
                kartuServer={anakServer.kartu}
                detailServer={detailServer}
                periodeServer={berandaServer.periode}
                berandaServer={berandaServer}
            />
        </Cangkang>
    );
}
