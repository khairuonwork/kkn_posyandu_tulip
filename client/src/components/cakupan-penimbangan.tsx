import { useState } from 'react';
import { pecahan, persenSaja } from '@/lib/format';
import type { CakupanPeriode } from '@/pages/dashboard';

export type KehadiranHariH = {
    periodeId: string;
    periodeDbId: number;
    wilayahRtId: number;
    rt: string;
    posyandu: string;
    tanggalHariH: string | null;
    hadirHariH: number | null;
    sumber: 'manual' | 'antrean' | null;
    sasaran: number;
};
export type IsianHariH = Pick<
    KehadiranHariH,
    'periodeDbId' | 'wilayahRtId' | 'tanggalHariH' | 'hadirHariH'
>;

export default function CakupanPenimbangan({
    rows,
    periodeId,
}: {
    rows: CakupanPeriode[];
    periodeId: string;
}) {
    const puncak = Math.max(
        100,
        ...rows.flatMap((r) => [
            persenSaja(r.ditimbang, r.sasaran),
            r.hadirHariH == null ? 0 : persenSaja(r.hadirHariH, r.sasaran),
        ]),
    );

    return (
        <>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <li className="flex items-center gap-2">
                    <span
                        className="size-3 rounded-sm bg-input"
                        aria-hidden="true"
                    />
                    D/S termasuk sweeping
                </li>
                <li className="flex items-center gap-2">
                    <span
                        className="size-3 rounded-sm bg-primary"
                        aria-hidden="true"
                    />
                    Real D/S · hadir hari H
                </li>
            </ul>
            <div
                className="mt-5 overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label="Perbandingan cakupan termasuk sweeping dan hadir hari H"
            >
                <div className="grid min-w-[430px] grid-cols-6 gap-3">
                    {rows.map((row) => (
                        <div key={row.periodeId}>
                            <div className="flex h-60 items-end justify-center gap-1.5 border-b border-border pt-8">
                                {[
                                    {
                                        label: 'Termasuk sweeping',
                                        jumlah: row.ditimbang,
                                        warna: 'bg-input',
                                        teks: 'text-muted-foreground',
                                    },
                                    {
                                        label: 'Hadir hari H',
                                        jumlah: row.hadirHariH,
                                        warna: 'bg-primary',
                                        teks: 'text-primary',
                                    },
                                ].map((seri) => {
                                    const nilai =
                                        seri.jumlah == null || row.sasaran === 0
                                            ? null
                                            : persenSaja(
                                                  seri.jumlah,
                                                  row.sasaran,
                                              );
                                    const label =
                                        nilai === null
                                            ? `${row.label}, ${seri.label}: data belum tersedia`
                                            : `${row.label}, ${seri.label}: ${nilai}%, ${pecahan(seri.jumlah!, row.sasaran)}`;

                                    return (
                                        <div
                                            key={seri.label}
                                            className="flex h-full min-w-0 flex-1 items-end"
                                            title={label}
                                        >
                                            <div
                                                aria-label={label}
                                                role="img"
                                                className={`relative w-full rounded-t-md ${nilai === null ? '' : seri.warna}`}
                                                style={{
                                                    height:
                                                        nilai === null
                                                            ? '2px'
                                                            : `${Math.max(1, (nilai / puncak) * 100)}%`,
                                                }}
                                            >
                                                <span
                                                    className={`absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-bold whitespace-nowrap tabular-nums ${seri.teks}`}
                                                >
                                                    {nilai === null
                                                        ? '—'
                                                        : `${nilai}%`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p
                                className={`mt-2 text-center text-sm ${row.periodeId === periodeId ? 'font-extrabold' : 'text-muted-foreground'}`}
                            >
                                {row.label.slice(0, 3)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground sm:hidden">
                Geser grafik untuk melihat seluruh bulan.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
                Real D/S memakai daftar hadir Posyandu pada hari H atau rekap
                per RT yang sudah dikonfirmasi. Tanda — berarti data belum
                tersedia atau belum lengkap.
            </p>
        </>
    );
}

export function FormKehadiranHariH({
    rows,
    onSimpan,
    onTutup,
}: {
    rows: KehadiranHariH[];
    onSimpan: (items: IsianHariH[]) => Promise<void>;
    onTutup: () => void;
}) {
    const [isi, setIsi] = useState(() =>
        rows.map((r) => ({
            ...r,
            jumlah:
                r.sumber === 'manual' && r.hadirHariH !== null
                    ? String(r.hadirHariH)
                    : '',
            tanggal: r.tanggalHariH ?? '',
        })),
    );
    const [galat, setGalat] = useState('');
    const [sibuk, setSibuk] = useState(false);
    const kelompok = [...new Set(isi.map((r) => r.periodeDbId))];

    return (
        <form
            className="mt-5 space-y-4 border-t border-border pt-4"
            onSubmit={async (e) => {
                e.preventDefault();
                setGalat('');
                setSibuk(true);

                try {
                    const items = isi
                        .filter(
                            (r, i) =>
                                r.jumlah !==
                                    (rows[i].sumber === 'manual' &&
                                    rows[i].hadirHariH !== null
                                        ? String(rows[i].hadirHariH)
                                        : '') ||
                                (r.jumlah !== '' &&
                                    r.tanggal !== rows[i].tanggalHariH),
                        )
                        .map((r) => ({
                            periodeDbId: r.periodeDbId,
                            wilayahRtId: r.wilayahRtId,
                            tanggalHariH: r.tanggal,
                            hadirHariH:
                                r.jumlah === '' ? null : Number(r.jumlah),
                        }));
                    await onSimpan(items);
                    onTutup();
                } catch (error) {
                    setGalat(
                        error instanceof Error
                            ? error.message
                            : 'Kehadiran belum tersimpan.',
                    );
                } finally {
                    setSibuk(false);
                }
            }}
        >
            <p className="text-sm text-muted-foreground">
                Isi jumlah yang datang secara fisik pada hari H, tanpa sweeping.
                Isi 0 bila tidak ada yang hadir; kosongkan untuk memakai daftar
                hadir otomatis jika tersedia.
            </p>
            {kelompok.map((id) => {
                const group = isi.filter((r) => r.periodeDbId === id);

                return (
                    <fieldset key={id} disabled={sibuk} className="space-y-3">
                        <legend className="font-bold">
                            {group[0].posyandu}
                        </legend>
                        <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                            Tanggal hari H
                            <input
                                type="date"
                                className="isian"
                                value={group[0].tanggal}
                                onChange={(e) =>
                                    setIsi((old) =>
                                        old.map((r) =>
                                            r.periodeDbId === id
                                                ? {
                                                      ...r,
                                                      tanggal: e.target.value,
                                                  }
                                                : r,
                                        ),
                                    )
                                }
                            />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {group.map((row) => (
                                <label
                                    key={row.wilayahRtId}
                                    className="text-sm font-semibold"
                                >
                                    RT {row.rt} · {row.sasaran} sasaran
                                    <input
                                        type="number"
                                        min={0}
                                        max={100000}
                                        step={1}
                                        inputMode="numeric"
                                        className="isian mt-1 w-full"
                                        placeholder="Belum tercatat"
                                        value={row.jumlah}
                                        onChange={(e) =>
                                            setIsi((old) =>
                                                old.map((r) =>
                                                    r.periodeDbId === id &&
                                                    r.wilayahRtId ===
                                                        row.wilayahRtId
                                                        ? {
                                                              ...r,
                                                              jumlah: e.target
                                                                  .value,
                                                          }
                                                        : r,
                                                ),
                                            )
                                        }
                                    />
                                    {row.sumber === 'antrean' && (
                                        <span className="mt-1 block text-xs text-muted-foreground">
                                            Daftar hadir: {row.hadirHariH} anak
                                        </span>
                                    )}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                );
            })}
            {galat && (
                <p role="alert" className="text-sm font-semibold text-tone-red">
                    {galat}
                </p>
            )}
            <div className="flex flex-wrap gap-3">
                <button
                    type="submit"
                    className="tombol-utama"
                    disabled={sibuk || !rows.length}
                >
                    {sibuk ? 'Menyimpan…' : 'Simpan kehadiran hari H'}
                </button>
                <button
                    type="button"
                    className="tombol-kedua"
                    disabled={sibuk}
                    onClick={onTutup}
                >
                    Batal
                </button>
            </div>
        </form>
    );
}
