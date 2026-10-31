import { FlaskConical, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import Halaman from '@/components/halaman';
import { Link } from '@/lib/nav';

type Sumber = { id: number; periode: string; posyandu: string; jumlah: number };
type Data = {
    aktif: null | {
        id: string;
        periode_id: number;
        jumlah_sasaran: number;
        mulai_pada: string;
    };
    sumber: Sumber[];
};
async function api(url: string, body?: unknown) {
    const res = await fetch('/api/v1/pelatihan' + url, {
        credentials: 'same-origin',
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.galat ?? 'Sesi pelatihan tidak dapat diproses.');
    }

    return data;
}

export function PenandaPelatihan({
    superAdmin = false,
}: {
    superAdmin?: boolean;
}) {
    const [aktif, setAktif] = useState(false);
    useEffect(() => {
        let alive = true;
        const muat = () => {
            void api('/status')
                .then((d) => {
                    if (alive) {
                        setAktif(d.aktif);
                    }
                })
                .catch(() => {});
        };
        muat();
        const timer = setInterval(muat, 10000);

        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, []);

    if (!aktif) {
        return null;
    }

    return (
        <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-tone-amber-bg px-5 py-3 text-sm font-semibold"
        >
            <span>
                MODE PELATIHAN · Web dan tablet menggunakan data simulasi.
            </span>
            {superAdmin && (
                <Link href="/pelatihan" className="text-primary underline">
                    Kelola sesi pelatihan
                </Link>
            )}
        </div>
    );
}

export default function Pelatihan() {
    const [data, setData] = useState<Data | null>(null);
    const [pilihan, setPilihan] = useState('');
    const [galat, setGalat] = useState('');
    const [sibuk, setSibuk] = useState(false);
    const muat = async () => {
        try {
            const d = (await api('')) as Data;
            setData(d);
            setGalat('');
            setPilihan(
                (p) =>
                    p ||
                    String(
                        d.sumber.find((s) => s.periode === '2026-10')?.id ??
                            d.sumber[0]?.id ??
                            '',
                    ),
            );
        } catch (e) {
            setGalat(
                e instanceof Error ? e.message : 'Data tidak dapat dimuat.',
            );
        }
    };
    useEffect(() => {
        let alive = true;
        void api('')
            .then((d: Data) => {
                if (!alive) {
                    return;
                }

                setData(d);
                setPilihan(
                    String(
                        d.sumber.find((s) => s.periode === '2026-10')?.id ??
                            d.sumber[0]?.id ??
                            '',
                    ),
                );
            })
            .catch((e: unknown) => {
                if (alive) {
                    setGalat(
                        e instanceof Error
                            ? e.message
                            : 'Data tidak dapat dimuat.',
                    );
                }
            });

        return () => {
            alive = false;
        };
    }, []);
    const tindakan = async (akhiri: boolean) => {
        const pesan = akhiri
            ? 'Akhiri pelatihan dan hapus seluruh data simulasi di server? Semua tablet harus selesai dan tersinkron. Bersihkan data lokal latihan sebelum masuk mode riil.'
            : 'Mulai pelatihan untuk seluruh web dan tablet pada server ini? Pastikan seluruh pekerjaan riil sudah tersinkron. Peserta harus masuk kembali dan sinkronkan sasaran latihan.';

        if (!window.confirm(pesan)) {
            return;
        }

        setSibuk(true);
        setGalat('');

        try {
            await api(
                akhiri ? '/akhiri' : '/mulai',
                akhiri
                    ? { id: data!.aktif!.id, konfirmasi: true }
                    : { periodeId: Number(pilihan), konfirmasi: true },
            );
            window.location.hash = '/pelatihan';
            window.location.reload();
        } catch (e) {
            setGalat(e instanceof Error ? e.message : 'Tindakan gagal.');
            setSibuk(false);
        }
    };

    return (
        <Halaman
            judul="Sesi Pelatihan"
            subjudul="Simulasi alur layanan menggunakan salinan sasaran. Khusus superadmin."
            ikon={FlaskConical}
        >
            <section className="kartu mx-auto w-full max-w-4xl p-5 sm:p-7">
                <h2 className="text-xl font-extrabold">
                    {data?.aktif
                        ? 'Sesi pelatihan sedang berjalan'
                        : 'Siapkan ruang latihan'}
                </h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
                    Latih alur antrean, pengukuran, pemeriksaan KMS, dan laporan
                    bersama peserta. Jumlah dan kelompok usia mengikuti sasaran
                    sumber; identitas anak dan orang tua disamarkan. Hasil
                    pengukuran dimulai kosong.
                </p>
                {galat && (
                    <p
                        role="alert"
                        className="mt-4 rounded-lg bg-tone-amber-bg p-4"
                    >
                        {galat}
                    </p>
                )}
                {!data && !galat && (
                    <p role="status" className="mt-5">
                        Memuat sesi…
                    </p>
                )}
                {data && (
                    <>
                        {data.aktif ? (
                            <div className="mt-6 rounded-xl border border-border bg-accent p-5">
                                <strong>
                                    {data.aktif.jumlah_sasaran} sasaran latihan
                                </strong>
                                <p className="mt-2">
                                    Web dan Android pada server ini sedang
                                    memakai sandbox yang sama.
                                </p>
                                <Link
                                    href="/sasaran"
                                    className="mt-3 inline-flex font-bold text-primary underline"
                                >
                                    Buka sasaran latihan
                                </Link>
                            </div>
                        ) : (
                            <div className="mt-6">
                                <label
                                    htmlFor="sumber-pelatihan"
                                    className="mb-2 block font-bold"
                                >
                                    Salin sasaran dari periode
                                </label>
                                <select
                                    id="sumber-pelatihan"
                                    value={pilihan}
                                    onChange={(e) => setPilihan(e.target.value)}
                                    disabled={sibuk}
                                    className="min-h-12 w-full rounded-lg border border-border bg-background px-3"
                                >
                                    {data.sumber.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.periode} · {s.posyandu} ·{' '}
                                            {s.jumlah} anak
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <ol className="mt-6 list-decimal space-y-3 pl-5 leading-relaxed">
                            <li>
                                Sinkronkan pekerjaan riil semua tablet sebelum
                                mulai.
                            </li>
                            <li>
                                Setelah sesi dimulai, peserta masuk kembali dan
                                sinkronkan Android. Pilih{' '}
                                <strong>ANAK LATIHAN</strong> dan gunakan kartu
                                QR latihan.
                            </li>
                            <li>
                                Untuk pendaftaran anak baru, gunakan NIK contoh{' '}
                                <strong>0099000000000001</strong>.
                            </li>
                            <li>
                                Sebelum mengakhiri, sinkronkan semua tablet.
                                Setelahnya bersihkan data lokal latihan di
                                Android, lalu masuk kembali ke mode riil.
                            </li>
                        </ol>
                        <p className="mt-5 text-sm text-muted-foreground">
                            Sesi berlaku untuk seluruh server. Pengakhiran
                            menghapus sasaran, antrean, hasil ukur, survei, dan
                            laporan latihan di server. Kiriman latihan yang
                            tertahan ditolak pada mode riil. Pembersihan lokal
                            tablet masih manual pada APK saat ini.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <button
                                type="button"
                                className="tombol-utama"
                                disabled={sibuk || (!data.aktif && !pilihan)}
                                onClick={() => {
                                    void tindakan(!!data.aktif);
                                }}
                            >
                                {sibuk
                                    ? 'Memproses…'
                                    : data.aktif
                                      ? 'Akhiri dan hapus data latihan'
                                      : 'Mulai sesi pelatihan'}
                            </button>
                            <button
                                type="button"
                                className="tombol-kedua"
                                disabled={sibuk}
                                onClick={() => {
                                    void muat();
                                }}
                            >
                                <RefreshCw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Perbarui
                            </button>
                        </div>
                    </>
                )}
            </section>
        </Halaman>
    );
}
