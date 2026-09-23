/**
 * Aplikasi sungguhan.
 *
 * Perbedaannya dari demo hanya di berkas ini: masuk lewat `POST /api/masuk`,
 * peran datang dari akun di basis data, dan tidak ada pemilih peran. Cangkang,
 * router, kelima layar, dan seluruh komponennya sama persis — sehingga apa
 * yang dipresentasikan tidak bisa berbeda dari apa yang dipakai.
 */

import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';

import { bacaRute, boleh, Cangkang } from '@/app-shell';
import {
    PENGATURAN_BAWAAN,
    periodeTerbaru,
    PENGGUNA_CONTOH,
} from '@/data/contoh/store';
import { Layar } from '@/layar';
import { navigate, useAlamat } from '@/lib/nav';
import { useSesi } from '@/lib/sesi';
import type { AnakBaru, PatchAnak } from '@/pages/anak/index';
import Login from '@/pages/auth/login';
import type { TabPeriode } from '@/pages/laporan/index';
import type { Ambang } from '@/pages/pengaturan/index';
import type { Pengguna, Peran } from '@/types/posyandu';

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
            peran={sesi.pengguna.peran}
            // Alamat baru diganti setelah server menjawab. Menggantinya lebih
            // dulu membuat permintaan keluar berlomba dengan perpindahan
            // halaman — dan permintaan yang batal berarti sesinya tetap hidup
            // di basis data meski penggunanya merasa sudah keluar.
            onKeluar={() => {
                void sesi.keluar().then(() => navigate('/'));
            }}
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

function Portal({ peran, onKeluar }: { peran: Peran; onKeluar: () => void }) {
    const [periodeId, setPeriodeId] = useState(periodeTerbaru);
    const [tabLaporan, setTabLaporan] = useState<TabPeriode>('bulanan');
    /*
        ponytail: keempat state di bawah hanya hidup di memori, sama seperti
        di demo — belum ada endpoint yang menerimanya. Saat endpoint data
        datang, keempatnya berganti menjadi panggilan API di `@/layar`.
    */
    const [koreksi, setKoreksi] = useState<Record<number, PatchAnak>>({});
    const [tambahan, setTambahan] = useState<AnakBaru[]>([]);
    const [ambang, setAmbang] = useState<Ambang>(PENGATURAN_BAWAAN);
    const [pengguna, setPengguna] = useState<Pengguna[]>(PENGGUNA_CONTOH);

    const alamat = useAlamat();
    const rute = bacaRute(alamat);

    // Alamat yang tidak boleh dibuka peran ini dikembalikan ke Beranda. Ini
    // kenyamanan; penolakan yang mengikat ada di server.
    useEffect(() => {
        if (!boleh(rute, peran)) {
            navigate('/beranda');
        }
    }, [peran, rute]);

    const identitas = (
        <div className="px-4 py-3 lg:px-5 lg:py-4">
            <p className="text-sm text-muted-foreground">Masuk sebagai</p>
            <p className="mt-0.5 text-base font-bold">{NAMA_PERAN[peran]}</p>
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

    return (
        <Cangkang
            peran={peran}
            periodeId={periodeId}
            onPindahPeriode={setPeriodeId}
            kakiSidebar={identitas}
            kakiHalaman={identitas}
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
