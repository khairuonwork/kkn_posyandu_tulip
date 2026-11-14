import { CircleHelp } from 'lucide-react';
import { useEffect, useState } from 'react';
import Halaman from '@/components/halaman';
import StateHalaman from '@/components/state-halaman';
import type { Peran } from '@/types/posyandu';
import { TautanSop } from '@/components/tautan-sop';

type DokumenSop = { id: string; judul: string; android: boolean };

export default function Bantuan({ onSesiBerakhir, demoPeran }: { onSesiBerakhir: () => void; demoPeran?: Peran }) {
    const [dokumen, setDokumen] = useState<DokumenSop[] | null>(null);
    const [galat, setGalat] = useState(false);
    const [percobaan, setPercobaan] = useState(0);

    useEffect(() => {
        if (demoPeran !== undefined) {
            const semua = [
                { id: 'kader-pendaftaran', judul: 'SOP Kader Pendaftaran', android: true },
                { id: 'kader-pencatatan', judul: 'SOP Kader Pencatatan', android: true },
                { id: 'kms', judul: 'SOP KMS', android: false },
                { id: 'admin', judul: 'SOP Admin Posyandu', android: false },
            ];
            setDokumen(semua.filter(({ id }) => demoPeran === 'admin' || (demoPeran === 'kms' ? id === 'kms' : id.startsWith('kader-'))));
            return;
        }
        const controller = new AbortController();
        void fetch('/api/sop', { signal: controller.signal })
            .then(async (res) => {
                if (res.status === 401) {
                    onSesiBerakhir();
                    return;
                }
                if (!res.ok) {
                    throw new Error('Daftar SOP belum dapat dimuat');
                }
                const daftar: DokumenSop[] = await res.json();
                setDokumen(daftar);
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setGalat(true);
                }
            });
        return () => controller.abort();
    }, [onSesiBerakhir, percobaan, demoPeran]);

    return (
        <Halaman ikon={CircleHelp} judul="Bantuan">
            {galat ? (
                <StateHalaman jenis="galat" judul="Daftar SOP belum dapat dimuat">
                    <button
                        className="tombol-kedua"
                        type="button"
                        onClick={() => {
                            setGalat(false);
                            setPercobaan((nilai) => nilai + 1);
                        }}
                    >
                        Coba lagi
                    </button>
                </StateHalaman>
            ) : dokumen === null ? (
                <StateHalaman jenis="memuat" judul="Memuat daftar SOP…" />
            ) : (
                <section className="max-w-3xl" aria-labelledby="judul-sop">
                    <h2 id="judul-sop" className="mb-3 text-lg font-bold">SOP Posyandu</h2>
                    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                        {dokumen.map(({ id, judul, android }) => (
                            <li key={id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                <div>
                                    <h3 className="font-semibold">{judul}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {android ? 'Panduan aplikasi Android · PDF' : 'PDF'}
                                    </p>
                                </div>
                                <TautanSop id={id} judul={judul} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </Halaman>
    );
}
