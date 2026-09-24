/**
 * Pengaturan — docs/10-prd-demo-frontend.md bagian 6.7, tampilan Prototipe v2.
 *
 * Menunjukkan sisi tata kelola: ambang ditetapkan bersama, perubahannya
 * tercatat, dan kader tidak pernah diblokir oleh sistem.
 */

import {
    Check,
    CheckCircle2,
    Info,
    KeyRound,
    Lock,
    Settings,
} from 'lucide-react';
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
    ambangWaspada: number;
    ambangRujukan: number;
};

export type StandarisasiAntropometri = {
    standar: 'who_permenkes_2020' | 'who_2007' | 'cdc_2000';
    koreksiPosisiOtomatis: boolean;
};

type Props = {
    ambang: Ambang;
    standarVersi: string;
    barisStandar: number;
    terakhirDiubah: { tanggal: string; oleh: string };
    standarisasi: StandarisasiAntropometri;
    /** Tanpa ini tombol simpan dirender nonaktif beserta alasannya. */
    onSimpan?: (nilai: Ambang) => void;
    onSimpanStandarisasi?: (nilai: StandarisasiAntropometri) => void;
};

const IZIN_PERAN = [
    { peran: 'Bidan', izin: 'Boleh mengubah', boleh: true },
    { peran: 'Admin', izin: 'Boleh mengubah', boleh: true },
    { peran: 'Kader', izin: 'Menu ini tidak tampil', boleh: false },
];

const MENU_AKSES = [
    {
        peran: 'Kader',
        keterangan: 'Wilayah binaan dan layanan hari Posyandu.',
        menu: ['Pendaftaran & Ukur', 'Data Anak RT binaan'],
    },
    {
        peran: 'Bidan',
        keterangan: 'Memeriksa seluruh data dan menindaklanjuti hasil.',
        menu: ['Pendaftaran & Ukur', 'Data Anak', 'Laporan'],
    },
    {
        peran: 'Admin',
        keterangan: 'Mengelola data sumber dan konfigurasi portal.',
        menu: ['Sasaran & Impor', 'Laporan', 'Pengaturan', 'Periode'],
    },
] as const;

const STANDAR_ANTROPOMETRI: {
    nilai: StandarisasiAntropometri['standar'];
    judul: string;
    cakupan: string;
    keterangan: string;
}[] = [
    {
        nilai: 'who_permenkes_2020',
        judul: 'Permenkes RI No. 2/2020 + WHO LMS 2006',
        cakupan: 'Standar operasional balita 0–60 bulan',
        keterangan:
            'Dipakai untuk hitung LMS, KMS, penapisan stunting, wasting, dan underweight pada Portal SIMPATIK.',
    },
    {
        nilai: 'who_2007',
        judul: 'WHO Reference 2007',
        cakupan: 'Pembanding usia 5–19 tahun',
        keterangan:
            'Tidak digunakan untuk penilaian balita. Tabel LMS-nya harus tersedia di server sebelum dipakai untuk perhitungan.',
    },
    {
        nilai: 'cdc_2000',
        judul: 'CDC Growth Charts 2000',
        cakupan: 'Pembanding klinis',
        keterangan:
            'Bukan standar nasional Posyandu. Pilihan ini hanya untuk studi pembanding setelah tabel acuan disahkan.',
    },
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
    standarisasi,
    onSimpan,
    onSimpanStandarisasi,
}: Props) {
    // Nilai dapat diubah selama sesi; tidak ada yang tersimpan (bagian 11).
    const [nilai, setNilai] = useState(ambang);
    const [rumus, setRumus] = useState(standarisasi);
    const [aksesMenu, setAksesMenu] = useState(
        Object.fromEntries(
            MENU_AKSES.flatMap((akses) =>
                akses.menu.map((menu) => [`${akses.peran}-${menu}`, true]),
            ),
        ),
    );
    const ubah = (kunci: keyof Ambang, isi: string) =>
        setNilai({ ...nilai, [kunci]: Number(isi.replace(',', '.')) });
    // Dua belas angka bisa diubah dan tombol simpannya dulu berada di kaki
    // gulir panjang, tanpa satu tanda pun bahwa ada yang belum tersimpan.
    const belumTersimpan =
        (Object.keys(ambang) as (keyof Ambang)[]).some(
            (k) => nilai[k] !== ambang[k],
        ) ||
        rumus.standar !== standarisasi.standar ||
        rumus.koreksiPosisiOtomatis !== standarisasi.koreksiPosisiOtomatis;

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
                            Standarisasi perhitungan antropometri
                        </h2>
                        <p className="mt-0.5 max-w-[88ch] text-sm text-pretty text-muted-foreground">
                            Metode LMS menghitung z-score; ambang Permenkes
                            membaca hasilnya untuk layanan Posyandu. Keduanya
                            disimpan sebagai satu pengaturan yang dapat diaudit.
                        </p>
                    </div>

                    <div className="divide-y divide-border">
                        {STANDAR_ANTROPOMETRI.map((standar) => {
                            const dipilih = rumus.standar === standar.nilai;

                            return (
                                <label
                                    key={standar.nilai}
                                    className={`flex cursor-pointer gap-3 px-5 py-5 sm:px-6 ${
                                        dipilih
                                            ? 'bg-tone-green-bg'
                                            : 'hover:bg-surface-subtle'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="standar-antropometri"
                                        value={standar.nilai}
                                        checked={dipilih}
                                        onChange={() =>
                                            setRumus({
                                                ...rumus,
                                                standar: standar.nilai,
                                            })
                                        }
                                        className="mt-1 size-4 accent-primary"
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold">
                                                {standar.judul}
                                            </span>
                                            {dipilih && (
                                                <CheckCircle2
                                                    className="size-5 text-tone-green"
                                                    strokeWidth={2.5}
                                                    aria-label="Standar terpilih"
                                                />
                                            )}
                                        </span>
                                        <span className="mt-1 block text-sm font-semibold text-muted-foreground">
                                            {standar.cakupan}
                                        </span>
                                        <span className="mt-1 block max-w-[84ch] text-sm text-muted-foreground">
                                            {standar.keterangan}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>

                    <div className="border-t border-border px-5 py-5 sm:px-6">
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                checked={rumus.koreksiPosisiOtomatis}
                                onChange={(event) =>
                                    setRumus({
                                        ...rumus,
                                        koreksiPosisiOtomatis:
                                            event.target.checked,
                                    })
                                }
                                className="mt-0.5 size-4 accent-primary"
                            />
                            <span>
                                <span className="font-bold">
                                    Koreksi posisi ukur otomatis ±0,7 cm
                                </span>
                                <span className="mt-1 block max-w-[82ch] text-sm text-muted-foreground">
                                    Protokol WHO: anak &lt;24 bulan yang diukur
                                    berdiri dikurangi 0,7 cm; anak ≥24 bulan
                                    yang diukur telentang ditambah 0,7 cm.
                                </span>
                            </span>
                        </label>
                    </div>
                </section>

                <section className="kartu overflow-hidden">
                    <div className="strip-kepala">
                        <h2 className="text-xl font-extrabold">
                            Ambang pemantauan dan rujukan
                        </h2>
                        <p className="mt-0.5 max-w-[88ch] text-sm text-pretty text-muted-foreground">
                            Ambang ini menyalakan edukasi KMS dan arahan tindak
                            lanjut; kategori status gizi resmi tetap mengikuti
                            Permenkes.
                        </p>
                    </div>
                    <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
                        <Isian
                            id="ambang-waspada"
                            label="Zona waspada"
                            satuan="SD"
                            nilai={nilai.ambangWaspada}
                            desimal={2}
                            onGanti={(v) => ubah('ambangWaspada', v)}
                        />
                        <Isian
                            id="ambang-rujukan"
                            label="Anjuran hubungi faskes"
                            satuan="SD"
                            nilai={nilai.ambangRujukan}
                            desimal={2}
                            onGanti={(v) => ubah('ambangRujukan', v)}
                        />
                    </div>
                    <p className="border-t border-border px-5 py-4 text-sm text-muted-foreground sm:px-6">
                        Nilai awal mengikuti diskusi kader: zona waspada −1,00
                        SD dan arahan faskes pada z-score ≤ −1,96 SD. Keduanya
                        harus disahkan Puskesmas sebelum dipakai pada data
                        produksi.
                    </p>
                </section>

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
                    <div className="strip-kepala flex items-start gap-3">
                        <KeyRound
                            className="mt-0.5 size-5 shrink-0 text-primary"
                            strokeWidth={2.5}
                            aria-hidden="true"
                        />
                        <div>
                            <h2 className="text-xl font-extrabold">
                                Akses menu per peran
                            </h2>
                            <p className="mt-0.5 max-w-[80ch] text-sm text-pretty text-muted-foreground">
                                Tetapkan menu yang terlihat oleh setiap peran.
                                Pembatasan wilayah dan izin ubah tetap diperiksa
                                kembali oleh server.
                            </p>
                        </div>
                    </div>

                    <div className="divide-y divide-border">
                        {MENU_AKSES.map((akses) => (
                            <section
                                key={akses.peran}
                                className="px-5 py-5 sm:px-6"
                            >
                                <h3 className="font-bold">{akses.peran}</h3>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {akses.keterangan}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
                                    {akses.menu.map((menu) => {
                                        const kunci = `${akses.peran}-${menu}`;

                                        return (
                                            <label
                                                key={kunci}
                                                className="flex min-h-11 items-center gap-2.5 text-sm font-semibold"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={aksesMenu[kunci]}
                                                    onChange={(event) =>
                                                        setAksesMenu(
                                                            (nilaiSaatIni) => ({
                                                                ...nilaiSaatIni,
                                                                [kunci]:
                                                                    event.target
                                                                        .checked,
                                                            }),
                                                        )
                                                    }
                                                    className="size-4 accent-primary"
                                                />
                                                {menu}
                                            </label>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
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
                                Kategori z-score Permenkes, terkunci
                            </h2>
                            <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                                Batas kategori klinis ditetapkan Permenkes No. 2
                                Tahun 2020 dan tidak bisa diubah dari aplikasi.
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
                    onClick={() => {
                        onSimpan?.(nilai);
                        onSimpanStandarisasi?.(rumus);
                    }}
                    className="tombol-utama disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                    Simpan pengaturan
                </button>
                <button
                    type="button"
                    disabled={!belumTersimpan}
                    onClick={() => {
                        setNilai(ambang);
                        setRumus(standarisasi);
                    }}
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
