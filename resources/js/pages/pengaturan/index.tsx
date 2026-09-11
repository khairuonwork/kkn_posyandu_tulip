/**
 * Pengaturan — docs/10-prd-demo-frontend.md bagian 6.7, tampilan Prototipe v2.
 *
 * Menunjukkan sisi tata kelola: ambang ditetapkan bersama, perubahannya
 * tercatat, dan kader tidak pernah diblokir oleh sistem.
 */

import { Check, Info, Lock, Settings } from 'lucide-react';
import { useState } from 'react';
import BarisDefinisi from '@/components/baris-definisi';
import Halaman from '@/components/halaman';
import { angka, tanggalPanjang } from '@/lib/format';

export type Ambang = {
    beratMin: number;
    beratMax: number;
    tinggiMin: number;
    tinggiMax: number;
    lilaMin: number;
    lilaMax: number;
    likaMin: number;
    likaMax: number;
    naikMax: number;
    turunMax: number;
    tinggiBerkurangMax: number;
    umurMaxBulan: number;
};

type Props = {
    ambang: Ambang;
    standarVersi: string;
    barisStandar: number;
    terakhirDiubah: { tanggal: string; oleh: string };
    /** Tanpa ini tombol simpan dirender nonaktif beserta alasannya. */
    onSimpan?: (nilai: Ambang) => void;
};

const IZIN_PERAN = [
    { peran: 'Bidan', izin: 'Boleh mengubah', boleh: true },
    { peran: 'Admin', izin: 'Boleh mengubah', boleh: true },
    { peran: 'Kader', izin: 'Menu ini tidak tampil', boleh: false },
];

/**
 * Empat ambang z-score PMK No. 2 Tahun 2020, apa adanya.
 *
 * Ditulis sebagai rujukan yang bisa dibaca bidan, bukan sebagai kontrol: tidak
 * satu pun dapat diubah dari aplikasi. Warnanya mengikuti nada keparahan bagian
 * 2.3, dan tiap chip memuat teks — laporan Posyandu dicetak hitam-putih.
 */
const AMBANG_Z = [
    { teks: 'di bawah −3 SD', kelas: 'bg-tone-red-bg text-tone-red' },
    { teks: '−3 SD sampai −2 SD', kelas: 'bg-tone-amber-bg text-tone-amber' },
    { teks: '−2 SD sampai +1 SD', kelas: 'bg-tone-green-bg text-tone-green' },
    { teks: 'di atas +1 SD', kelas: 'bg-tone-blue-bg text-tone-blue' },
];

export default function Pengaturan({
    ambang,
    standarVersi,
    barisStandar,
    terakhirDiubah,
    onSimpan,
}: Props) {
    // Nilai dapat diubah selama sesi; tidak ada yang tersimpan (bagian 11).
    const [nilai, setNilai] = useState(ambang);
    const ubah = (kunci: keyof Ambang, isi: string) =>
        setNilai({ ...nilai, [kunci]: Number(isi.replace(',', '.')) });
    // Dua belas angka bisa diubah dan tombol simpannya dulu berada di kaki
    // gulir panjang, tanpa satu tanda pun bahwa ada yang belum tersimpan.
    const belumTersimpan = (Object.keys(ambang) as (keyof Ambang)[]).some(
        (k) => nilai[k] !== ambang[k],
    );

    return (
        <Halaman
            ikon={Settings}
            judul="Pengaturan"
            subjudul={`Batas pengukuran dan ambang peringatan. Terakhir diubah ${tanggalPanjang(terakhirDiubah.tanggal)} oleh ${terakhirDiubah.oleh}. Data contoh.`}
        >
            <div className="flex max-w-[100ch] flex-col gap-7">
                <div className="flex items-start gap-3 rounded-xl border border-tone-blue bg-tone-blue-bg p-5 text-base text-tone-blue">
                    <Info
                        className="mt-0.5 size-5 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden="true"
                    />
                    <p className="text-pretty">
                        Batas ini hanya memicu pertanyaan konfirmasi. Kader
                        tidak pernah diblokir. Perubahan berlaku untuk
                        pengukuran baru, data lama tidak dihitung ulang.
                    </p>
                </div>

                <section className="kartu overflow-hidden">
                    <div className="strip-kepala">
                        <h2 className="text-xl font-extrabold">
                            Rentang wajar pengukuran
                        </h2>
                        <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                            Angka di luar rentang ini memunculkan peringatan
                            sebelum disimpan.
                        </p>
                    </div>

                    {/* Dua kolom, bukan empat. Tiap blok di sini memuat DUA kotak
                        isian; pada grid empat kolom keduanya menyusut ke 65 px -
                        lebih sempit daripada kotak `2,0` di bagian berikutnya yang
                        mendapat 224 px. Kotak terlebar justru memuat nilai terpendek.
                        Lebar sekarang mengikuti isinya. */}
                    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                        <Rentang
                            label="Berat badan"
                            satuan="kg"
                            min={nilai.beratMin}
                            max={nilai.beratMax}
                            onMin={(v) => ubah('beratMin', v)}
                            onMax={(v) => ubah('beratMax', v)}
                        />
                        <Rentang
                            label="Panjang atau tinggi"
                            satuan="cm"
                            min={nilai.tinggiMin}
                            max={nilai.tinggiMax}
                            onMin={(v) => ubah('tinggiMin', v)}
                            onMax={(v) => ubah('tinggiMax', v)}
                        />
                        <Rentang
                            label="LILA"
                            satuan="cm"
                            min={nilai.lilaMin}
                            max={nilai.lilaMax}
                            onMin={(v) => ubah('lilaMin', v)}
                            onMax={(v) => ubah('lilaMax', v)}
                        />
                        <Rentang
                            label="LIKA"
                            satuan="cm"
                            min={nilai.likaMin}
                            max={nilai.likaMax}
                            onMin={(v) => ubah('likaMin', v)}
                            onMax={(v) => ubah('likaMax', v)}
                        />
                    </div>
                </section>

                <section className="kartu overflow-hidden">
                    <div className="strip-kepala">
                        <h2 className="text-xl font-extrabold">
                            Ambang selisih antar bulan
                        </h2>
                        <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                            Selisih yang melebihi batas memunculkan pertanyaan,
                            Yakin dengan angka ini?
                        </p>
                    </div>

                    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
                        <Isian
                            id="naik-max"
                            label="Berat naik maksimal"
                            satuan="kg"
                            nilai={nilai.naikMax}
                            onGanti={(v) => ubah('naikMax', v)}
                        />
                        <Isian
                            id="turun-max"
                            label="Berat turun maksimal"
                            satuan="kg"
                            nilai={nilai.turunMax}
                            onGanti={(v) => ubah('turunMax', v)}
                        />
                        <Isian
                            id="tinggi-berkurang"
                            label="Tinggi berkurang"
                            satuan="cm"
                            nilai={nilai.tinggiBerkurangMax}
                            onGanti={(v) => ubah('tinggiBerkurangMax', v)}
                        />
                        <Isian
                            id="umur-max"
                            label="Umur maksimal balita"
                            satuan="bulan"
                            desimal={0}
                            nilai={nilai.umurMaxBulan}
                            onGanti={(v) => ubah('umurMaxBulan', v)}
                        />
                    </div>
                </section>

                <section className="kartu overflow-hidden">
                    <div className="strip-kepala flex items-start gap-3">
                        <Lock
                            className="mt-1 size-5 shrink-0 text-muted-foreground"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        <div>
                            <h2 className="text-xl font-extrabold">
                                Ambang z-score, terkunci
                            </h2>
                            <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                                Ditetapkan Permenkes No. 2 Tahun 2020, tidak
                                bisa diubah dari aplikasi.
                            </p>
                        </div>
                    </div>

                    <div className="p-5 sm:p-6">
                        <ul className="flex flex-wrap gap-2.5">
                            {AMBANG_Z.map((a) => (
                                <li
                                    key={a.teks}
                                    className={`rounded-md px-3 py-1.5 text-sm font-bold ${a.kelas}`}
                                >
                                    {a.teks}
                                </li>
                            ))}
                        </ul>

                        <dl className="mt-5 grid max-w-xl gap-x-10 gap-y-2 border-t border-border pt-5 sm:grid-cols-2">
                            <BarisDefinisi label="Tabel standar">
                                {standarVersi}
                            </BarisDefinisi>
                            <BarisDefinisi label="Jumlah baris">
                                {barisStandar}
                            </BarisDefinisi>
                        </dl>
                    </div>
                </section>

                <section className="kartu overflow-hidden">
                    <div className="strip-kepala">
                        <h2 className="text-xl font-extrabold">
                            Siapa boleh mengubah batas
                        </h2>
                    </div>

                    <div className="p-5 sm:p-6">
                        <ul className="flex flex-col divide-y divide-border">
                            {IZIN_PERAN.map((i) => (
                                <li
                                    key={i.peran}
                                    className="flex items-center gap-3 py-2.5 text-base first:pt-0 last:pb-0"
                                >
                                    {/* Ikon berpasangan dengan teks izinnya,
                                        tidak pernah sendirian. */}
                                    {i.boleh ? (
                                        <Check
                                            className="size-5 shrink-0 text-tone-green"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Lock
                                            className="size-5 shrink-0 text-muted-foreground"
                                            strokeWidth={2.5}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <span className="w-24 font-semibold">
                                        {i.peran}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {i.izin}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <p className="mt-4 text-sm text-muted-foreground">
                            Setiap perubahan dicatat dengan nama dan waktu.
                        </p>
                    </div>
                </section>
            </div>

            {/* Bilah simpan menempel di kaki layar dan menyebutkan berapa
                yang belum tersimpan. */}
            <div className="sticky bottom-0 -mx-4 mt-7 flex flex-wrap items-center gap-3 border-t border-border bg-background px-4 py-4 sm:-mx-7 sm:px-7">
                <button
                    type="button"
                    disabled={onSimpan === undefined || !belumTersimpan}
                    onClick={() => onSimpan?.(nilai)}
                    className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                    Simpan pengaturan
                </button>
                <button
                    type="button"
                    disabled={!belumTersimpan}
                    onClick={() => setNilai(ambang)}
                    className="tombol-kedua disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Kembalikan ke bawaan
                </button>
                <p
                    aria-live="polite"
                    className="text-base text-pretty text-muted-foreground"
                >
                    {onSimpan === undefined
                        ? 'Belum ada tempat menyimpannya: tabel pengaturan_ambang belum ada di basis data.'
                        : belumTersimpan
                          ? 'Ada perubahan yang belum disimpan.'
                          : 'Semua perubahan tersimpan.'}
                </p>
            </div>
        </Halaman>
    );
}

function Rentang({
    label,
    satuan,
    min,
    max,
    onMin,
    onMax,
}: {
    label: string;
    satuan: string;
    min: number;
    max: number;
    onMin: (v: string) => void;
    onMax: (v: string) => void;
}) {
    const id = label.toLowerCase().replace(/\s+/g, '-');

    return (
        <div>
            <p className="text-base font-semibold">{label}</p>
            <div className="mt-2 flex items-end gap-3">
                <Isian
                    id={`${id}-min`}
                    label="Minimal"
                    satuan={satuan}
                    nilai={min}
                    onGanti={onMin}
                />
                <Isian
                    id={`${id}-max`}
                    label="Maksimal"
                    satuan={satuan}
                    nilai={max}
                    onGanti={onMax}
                />
            </div>
        </div>
    );
}

function Isian({
    id,
    label,
    satuan,
    nilai,
    desimal = 1,
    onGanti,
}: {
    id: string;
    label: string;
    satuan: string;
    nilai: number;
    desimal?: number;
    onGanti: (v: string) => void;
}) {
    return (
        <div className="min-w-0 flex-1">
            {/* Semua label di atas kotaknya, tidak pernah di dalamnya. */}
            <label
                htmlFor={id}
                className="block text-sm font-semibold text-muted-foreground"
            >
                {label}
            </label>
            {/* Satuan berada di segmen dalam kotak, bukan tombol terpisah. */}
            <div className="isian mt-1.5 flex items-stretch overflow-hidden p-0">
                <input
                    id={id}
                    inputMode="decimal"
                    value={angka(nilai, desimal)}
                    onChange={(e) => onGanti(e.target.value)}
                    className="w-full min-w-0 bg-transparent px-3.5 text-right text-lg font-bold outline-none"
                />
                <span className="flex shrink-0 items-center border-l-2 border-border bg-surface-subtle px-3 text-sm text-muted-foreground">
                    {satuan}
                </span>
            </div>
        </div>
    );
}
