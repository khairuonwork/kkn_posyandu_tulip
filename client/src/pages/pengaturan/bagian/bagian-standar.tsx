import { Lock } from 'lucide-react';
import { IsiGulir } from '../komponen/isian-angka';
import { AMBANG_Z, STANDAR } from '../tipe';
import type { StandarisasiAntropometri } from '../tipe';

export function BagianStandar({
    rumus,
    setRumus,
    standarVersi,
    barisStandar,
}: {
    rumus: StandarisasiAntropometri;
    setRumus: (r: StandarisasiAntropometri) => void;
    standarVersi: string;
    barisStandar: number;
}) {
    return (
        <IsiGulir>
            <div className="grid gap-y-5 px-7 pt-3.5 pb-4.5 min-[80rem]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="flex min-w-0 flex-col gap-3.5 min-[80rem]:border-r min-[80rem]:border-border min-[80rem]:pr-7">
                    <fieldset className="flex flex-col gap-3">
                        <legend className="mb-2 text-base font-extrabold">
                            Standar yang dipakai
                        </legend>
                        {STANDAR.map((s) => {
                            const dipilih = rumus.standar === s.nilai;

                            return (
                                <label
                                    key={s.nilai}
                                    className={`flex cursor-pointer gap-3.5 rounded-lg border-2 px-4.5 py-3.5 ${
                                        dipilih
                                            ? 'border-primary bg-accent'
                                            : 'border-border bg-card hover:bg-surface'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="standar-antropometri"
                                        checked={dipilih}
                                        onChange={() =>
                                            setRumus({
                                                ...rumus,
                                                standar: s.nilai,
                                            })
                                        }
                                        className="mt-0.5 size-5 shrink-0 accent-primary"
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-base font-bold">
                                            {s.judul}
                                        </span>
                                        <span
                                            className={`block text-sm font-semibold ${dipilih ? 'text-primary' : ''}`}
                                        >
                                            {s.cakupan}
                                        </span>
                                        <span className="mt-0.5 block text-sm text-muted-foreground">
                                            {s.keterangan}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}
                    </fieldset>
                    <label className="flex cursor-pointer gap-3.5 rounded-lg border-2 border-border bg-surface px-4.5 py-3.5">
                        <input
                            type="checkbox"
                            checked={rumus.koreksiPosisiOtomatis}
                            onChange={(e) =>
                                setRumus({
                                    ...rumus,
                                    koreksiPosisiOtomatis: e.target.checked,
                                })
                            }
                            className="mt-0.5 size-5 shrink-0 accent-primary"
                        />
                        <span>
                            <span className="block text-base font-bold">
                                Koreksi posisi ukur otomatis ±0,7 cm
                            </span>
                            <span className="mt-0.5 block text-sm text-muted-foreground">
                                Aturan WHO: balita di bawah 24 bulan yang diukur
                                berdiri ditambah 0,7 cm; balita 24 bulan ke atas
                                yang diukur telentang dikurangi 0,7 cm.
                            </span>
                        </span>
                    </label>
                </div>

                <div className="min-w-0 min-[80rem]:pl-7">
                    <h3 className="flex items-center gap-2 text-base font-extrabold">
                        <Lock
                            className="size-5"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        Kategori z-score, terkunci
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        Ditetapkan Permenkes No. 2 Tahun 2020, tidak bisa diubah
                        dari aplikasi.
                    </p>
                    <ul className="mt-2.5 flex flex-col gap-1.5">
                        {AMBANG_Z.map((a) => (
                            <li
                                key={a.teks}
                                className={`rounded-lg px-3.5 py-2 text-base font-bold ${a.kelas}`}
                            >
                                {a.teks}
                            </li>
                        ))}
                    </ul>
                    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-7 gap-y-1.5 border-t border-border pt-4 text-sm">
                        <dt className="text-muted-foreground">Tabel standar</dt>
                        <dd className="text-base font-bold">{standarVersi}</dd>
                        <dt className="text-muted-foreground">Jumlah baris</dt>
                        <dd className="text-base font-bold">{barisStandar}</dd>
                    </dl>
                </div>
            </div>
        </IsiGulir>
    );
}
