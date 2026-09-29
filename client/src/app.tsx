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
import {
    PENGATURAN_BAWAAN,
    periodeTerbaru,
    STANDARISASI_BAWAAN,
} from '@/data/contoh/store';
import { Layar } from '@/layar';
import { navigate, useAlamat } from '@/lib/nav';
import { usePenggunaServer } from '@/lib/pengguna';
import { useSesi } from '@/lib/sesi';
import type { AnakBaru, PatchAnak } from '@/pages/anak/index';
import Login from '@/pages/auth/login';
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
    onKeluar,
    onSesiBerakhir,
}: {
    nama: string;
    peran: Peran;
    onKeluar: () => void;
    onSesiBerakhir: () => void;
}) {
    const [periodeId, setPeriodeId] = useState(periodeTerbaru);
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
    const akun = usePenggunaServer(
        peran === 'admin' && rute.nama === 'pengaturan',
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
            onPindahPeriode={setPeriodeId}
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
                periodeId={periodeId}
                onPindahPeriode={setPeriodeId}
                tabLaporan={tabLaporan}
                onGantiTabLaporan={setTabLaporan}
                koreksi={koreksi}
                tambahan={tambahan}
                onCobaKirim={() => undefined}
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
                pengguna={akun.daftar}
                onSimpanPengguna={akun.simpan}
            />
        </Cangkang>
    );
}
