import { IsiGulir, IsianAngka } from '../komponen/isian-angka';
import { RENTANG } from '../tipe';
import type { Ambang } from '../tipe';

export function BagianBatas({
    teks,
    ambang,
    salahRentang,
    ubahTeks,
}: {
    teks: Record<keyof Ambang, string>;
    ambang: Ambang;
    salahRentang: { label: string; min: keyof Ambang; max: keyof Ambang }[];
    ubahTeks: (k: keyof Ambang, v: string) => void;
}) {
    return (
        <IsiGulir>
            <div className="grid gap-y-5 px-7 pt-3.5 pb-4.5 min-[80rem]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <div className="min-w-0 min-[80rem]:border-r min-[80rem]:border-border min-[80rem]:pr-7">
                    <h3 className="mb-2 text-base font-extrabold">
                        Rentang wajar
                    </h3>
                    <table className="w-full table-fixed">
                        <colgroup>
                            <col className="w-[34%]" />
                            <col />
                            <col />
                        </colgroup>
                        <thead>
                            <tr className="border-b-2 border-border-strong text-left text-sm text-muted-foreground">
                                <th
                                    scope="col"
                                    className="pr-2 pb-1.5 font-semibold"
                                >
                                    Ukuran
                                </th>
                                <th
                                    scope="col"
                                    className="px-1.5 pb-1.5 font-semibold"
                                >
                                    Minimal
                                </th>
                                <th
                                    scope="col"
                                    className="pb-1.5 pl-1.5 font-semibold"
                                >
                                    Maksimal
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {RENTANG.map((r) => {
                                const salah = salahRentang.includes(r);

                                return [
                                    <tr
                                        key={r.label}
                                        className={
                                            salah ? '' : 'border-b border-rule'
                                        }
                                    >
                                        <th
                                            scope="row"
                                            className="py-0.5 pr-2 text-left font-bold"
                                        >
                                            {r.label}
                                        </th>
                                        <td className="px-1.5 py-0.5">
                                            <IsianAngka
                                                kunci={r.min}
                                                teks={teks}
                                                ambang={ambang}
                                                salah={salah}
                                                onGanti={ubahTeks}
                                            />
                                        </td>
                                        <td className="py-0.5 pl-1.5">
                                            <IsianAngka
                                                kunci={r.max}
                                                teks={teks}
                                                ambang={ambang}
                                                salah={salah}
                                                onGanti={ubahTeks}
                                            />
                                        </td>
                                    </tr>,
                                    salah && (
                                        <tr
                                            key={`${r.label}-salah`}
                                            className="border-b border-rule"
                                        >
                                            <td
                                                colSpan={3}
                                                className="pb-2 text-right text-sm font-semibold text-tone-red"
                                            >
                                                Batas maksimal harus lebih besar
                                                dari minimal.
                                            </td>
                                        </tr>
                                    ),
                                ];
                            })}
                            <tr>
                                <th
                                    scope="row"
                                    className="py-0.5 pr-2 text-left font-bold"
                                >
                                    Umur balita
                                </th>
                                <td className="px-1.5 py-0.5">
                                    <div
                                        aria-label="Umur minimal 0 bulan, tetap"
                                        className="flex h-14 text-muted-foreground"
                                    >
                                        <span className="flex flex-1 items-center justify-end px-2.5 font-bold">
                                            0
                                        </span>
                                        <span className="flex w-14 shrink-0 items-center justify-center text-sm">
                                            bulan
                                        </span>
                                    </div>
                                </td>
                                <td className="py-0.5 pl-1.5">
                                    <IsianAngka
                                        kunci="umurMaxBulan"
                                        teks={teks}
                                        ambang={ambang}
                                        onGanti={ubahTeks}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="min-w-0 min-[80rem]:pl-7">
                    <h3 className="text-base font-extrabold">
                        Selisih antar bulan
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Dibanding hasil ukur bulan lalu.
                    </p>
                    <div className="mt-3 flex flex-col gap-3.5">
                        {(
                            [
                                'naikMax',
                                'turunMax',
                                'tinggiBerkurangMax',
                            ] as const
                        ).map((k) => (
                            <IsianAngka
                                key={k}
                                kunci={k}
                                teks={teks}
                                ambang={ambang}
                                onGanti={ubahTeks}
                                berlabel
                            />
                        ))}
                    </div>
                </div>
            </div>
        </IsiGulir>
    );
}
