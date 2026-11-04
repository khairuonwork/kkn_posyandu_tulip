import { useMemo, useState } from 'react';
import StatusGiziBadge from '@/components/status-gizi-badge';
import { angka, KOSONG, labelIndeks, zScore } from '@/lib/format';
import { kategoriDariZ } from '@/lib/kategori';
import { hitungZ } from '@/lib/z-score';
import type { susunTabel } from '@/lib/z-score';
import type { Indeks, Periode } from '@/types/posyandu';
import { keAngka, labelRt } from './tipe';
import type { BarisAnak, PatchAnak } from './tipe';

/** Satu kotak isian berlabel. Bentuk yang sama dipakai editor dan form tambah. */
export function Isian({
    label,
    nilai,
    onGanti,
    tipe = 'text',
    petunjuk,
}: {
    label: string;
    nilai: string;
    onGanti: (v: string) => void;
    tipe?: string;
    petunjuk?: string;
}) {
    const id = `isian-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <label htmlFor={id} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-muted-foreground">
                {label}
            </span>
            <input
                id={id}
                type={tipe}
                value={nilai}
                placeholder={petunjuk}
                onChange={(e) => onGanti(e.target.value)}
                className="isian w-full"
            />
        </label>
    );
}

/** Isian bersatuan: angka rata kanan, satuannya melekat di tepi kotak. */
export function IsianUkur({
    label,
    satuan,
    nilai,
    onGanti,
}: {
    label: string;
    satuan: string;
    nilai: string;
    onGanti: (v: string) => void;
}) {
    const id = `ukur-${satuan}`;

    return (
        <label htmlFor={id} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-muted-foreground">
                {label}
            </span>
            <span className="isian flex items-stretch overflow-hidden p-0">
                <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    value={nilai}
                    onChange={(e) => onGanti(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3.5 text-right text-lg font-bold outline-none"
                />
                <span className="flex items-center border-l-2 border-border bg-surface-subtle px-3 text-sm text-muted-foreground">
                    {satuan}
                </span>
            </span>
        </label>
    );
}

/**
 * Editor satu baris.
 */
export function EditorBaris({
    baris,
    periode,
    wilayahRt,
    tabelLms,
    onTutup,
    onSimpan,
    menutup,
}: {
    baris: BarisAnak;
    periode: Periode;
    wilayahRt: string[];
    tabelLms: ReturnType<typeof susunTabel> | null;
    onTutup: () => void;
    onSimpan: (patch: PatchAnak) => void;
    menutup: boolean;
}) {
    const [galat, setGalat] = useState(false);
    const [nama, setNama] = useState(baris.nama ?? '');
    const [nik, setNik] = useState(baris.nik ?? '');
    const [namaOrtu, setNamaOrtu] = useState(baris.namaOrtu ?? '');
    const [rt, setRt] = useState(baris.rt ?? '');
    const [bb, setBb] = useState(
        baris.bbKg === null ? '' : angka(baris.bbKg, 1),
    );
    const [tinggi, setTinggi] = useState(
        baris.tinggiCm === null ? '' : angka(baris.tinggiCm, 1),
    );

    const adaUkuran = baris.bbKg !== null || baris.tinggiCm !== null;
    const bbAngka = keAngka(bb);
    const tinggiAngka = keAngka(tinggi);
    const umur = baris.umurBulan;
    const jk = baris.jk;

    // Ketiga indeks inti, dihitung dari isi kotak saat ini.
    const kartuZ = useMemo(() => {
        if (tabelLms === null || jk === null || umur === null) {
            return null;
        }

        const permintaan: [Indeks, number | null, number | null][] = [
            ['BB_TB', tinggiAngka, bbAngka],
            ['BB_U', umur, bbAngka],
            ['TB_U', umur, tinggiAngka],
        ];

        return permintaan.map(([indeks, kunci, nilai]) => {
            const z =
                kunci === null || nilai === null
                    ? null
                    : hitungZ(tabelLms, indeks, jk, kunci, nilai);

            return {
                indeks,
                label: labelIndeks(indeks, umur),
                z,
                kategori: z === null ? null : kategoriDariZ(indeks, z),
            };
        });
    }, [tabelLms, jk, umur, bbAngka, tinggiAngka]);

    return (
        <div
            inert={menutup}
            className={`border-t-2 border-border px-5 py-6 sm:px-6 ${menutup ? 'panel-balita-keluar' : 'panel-balita-masuk'}`}
        >
            <div className="kartu flex flex-col gap-6 p-5 sm:p-6">
                <section className="flex flex-col gap-3.5">
                    <h3 className="text-base font-bold">Identitas</h3>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <Isian
                            label="Nama balita"
                            nilai={nama}
                            onGanti={setNama}
                        />
                        <Isian label="NIK" nilai={nik} onGanti={setNik} />
                        <Isian
                            label="Ibu"
                            nilai={namaOrtu}
                            onGanti={setNamaOrtu}
                        />
                        <label
                            htmlFor="ubah-rt"
                            className="flex flex-col gap-1.5"
                        >
                            <span className="text-sm font-semibold text-muted-foreground">
                                RT
                            </span>
                            <select
                                id="ubah-rt"
                                value={rt}
                                onChange={(e) => setRt(e.target.value)}
                                className="isian w-full"
                            >
                                {wilayahRt.map((w) => (
                                    <option key={w} value={w}>
                                        {labelRt(w)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </section>

                {adaUkuran ? (
                    <section className="flex flex-col gap-3.5 border-t border-border pt-6">
                        <h3 className="text-base font-bold">
                            Pengukuran {periode.label}
                        </h3>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <IsianUkur
                                label="Berat badan"
                                satuan="kg"
                                nilai={bb}
                                onGanti={setBb}
                            />
                            <IsianUkur
                                label={
                                    umur !== null && umur >= 24
                                        ? 'Tinggi badan'
                                        : 'Panjang badan'
                                }
                                satuan="cm"
                                nilai={tinggi}
                                onGanti={setTinggi}
                            />
                        </div>

                        {kartuZ !== null && (
                            <div className="mt-1 rounded-xl border border-border bg-surface p-4 sm:p-5">
                                <h4 className="text-sm font-bold text-muted-foreground">
                                    Hasil hitung WHO 2006
                                </h4>

                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    {kartuZ.map((k) => (
                                        <div
                                            key={k.indeks}
                                            className="rounded-lg border border-border bg-card px-4 py-3"
                                        >
                                            <p className="flex items-baseline gap-1.5">
                                                <span className="text-xl font-extrabold">
                                                    {k.z === null
                                                        ? KOSONG
                                                        : zScore(k.z)}
                                                </span>
                                                {k.z !== null && (
                                                    <span className="text-sm text-muted-foreground">
                                                        SD
                                                    </span>
                                                )}
                                            </p>
                                            <p className="mt-0.5 text-sm text-muted-foreground">
                                                {k.label}
                                            </p>
                                            {k.kategori !== null && (
                                                <p className="mt-1.5">
                                                    <StatusGiziBadge
                                                        kategori={k.kategori}
                                                    />
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-3 text-sm text-pretty text-muted-foreground">
                                    Angka pratinjau. Saat disimpan, server
                                    menghitung ulang dan nilainya itu yang
                                    tercatat. Indeks mengikuti umur anak: BB/PB
                                    di bawah 24 bulan, BB/TB untuk 24 bulan ke
                                    atas.
                                </p>
                            </div>
                        )}
                    </section>
                ) : (
                    <div className="rounded-xl border border-tone-amber bg-tone-amber-bg px-5 py-4">
                        <p className="text-base font-bold text-tone-amber">
                            Belum ada pengukuran {periode.label}
                        </p>
                        <p className="mt-0.5 text-base text-pretty">
                            Identitas tetap bisa diubah. Berat dan tinggi baru
                            bisa dicatat lewat penimbangan.
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
                    <button
                        type="button"
                        onClick={() => {
                            try {
                                onSimpan({
                                    nama: nama.trim(),
                                    nik: nik.trim(),
                                    namaOrtu: namaOrtu.trim(),
                                    rt,
                                    bbKg: bbAngka,
                                    tinggiCm: tinggiAngka,
                                });
                            } catch {
                                setGalat(true);
                            }
                        }}
                        className="tombol-utama"
                    >
                        Simpan perubahan
                    </button>
                    {galat && (
                        <p role="alert" className="pesan-balita">
                            Gagal menyimpan perubahan. Coba lagi.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={onTutup}
                        className="tombol-kedua"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}
